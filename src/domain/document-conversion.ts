export type ConversionLine = {
  productId:number;
  productName:string;
  qty:number;
  unitPrice:number;
  total:number;
  quoteLineIndex?:number;
};
export type QuoteForConversion = {
  id:number;
  productName:string;
  customerName:string;
  qty:number;
  unitPrice:number;
  total:number;
  lines?:ConversionLine[];
};
export type StockProduct = {id:number; qty:number};
export type DocumentKind = 'invoice'|'delivery'|'proforma'|'customer_order';
export type ConvertedDocument = {
  id:number;
  number:string;
  type:DocumentKind;
  customerName:string;
  total:number;
  date:string;
  status:string;
  sourceQuoteId:number;
  lines:ConversionLine[];
};
export type ExistingDocument = {sourceQuoteId:number; type:DocumentKind; total?:number; lines?:ConversionLine[]};
export type DeliveryRequestLine={productId:number;qty:number;lineIndex?:number};
export type RemainingDeliveryLine=ConversionLine&{lineIndex:number;remainingQty:number};
export type ConversionResult = {document:ConvertedDocument;updatedProducts:StockProduct[]};

export function remainingDeliveryLines(lines:ConversionLine[],documents:ExistingDocument[]):RemainingDeliveryLine[]{
  const deliveredByIndex=new Map<number,number>();
  const legacyDeliveredByProduct=new Map<number,number>();
  for(const document of documents){
    if(document.type!=='delivery')continue;
    for(const line of document.lines||[]){
      if(Number.isInteger(line.quoteLineIndex))deliveredByIndex.set(line.quoteLineIndex!, (deliveredByIndex.get(line.quoteLineIndex!)||0)+line.qty);
      else legacyDeliveredByProduct.set(line.productId,(legacyDeliveredByProduct.get(line.productId)||0)+line.qty);
    }
  }
  return lines.map((line,lineIndex)=>{
    const indexed=Math.min(line.qty,deliveredByIndex.get(lineIndex)||0);
    const legacy=Math.min(line.qty-indexed,legacyDeliveredByProduct.get(line.productId)||0);
    legacyDeliveredByProduct.set(line.productId,Math.max(0,(legacyDeliveredByProduct.get(line.productId)||0)-legacy));
    return {...line,lineIndex,remainingQty:Math.max(0,line.qty-indexed-legacy)};
  });
}

/** Creates a quote-derived document. Deliveries may be posted in several partial notes. */
export function convertQuote(
  quote:QuoteForConversion,
  type:DocumentKind,
  documents:ExistingDocument[],
  products:StockProduct[],
  id:number,
  date:string,
  requestedDeliveryLines?:DeliveryRequestLine[],
):ConversionResult {
  if(type!=='delivery'&&documents.some(d=>d.sourceQuoteId===quote.id&&d.type===type)) {
    throw new Error('This quote has already been converted to this document type');
  }
  const sourceLines=quote.lines?.length?quote.lines:[];
  let updatedProducts=products;
  let documentLines=sourceLines.length?sourceLines:[{
    productId:0,productName:quote.productName,qty:quote.qty,
    unitPrice:quote.unitPrice,total:quote.total,
  }];
  let documentTotal=quote.total;
  if(type==='delivery') {
    if(!sourceLines.length||sourceLines.some(line=>!line.productId)) {
      throw new Error('A new quote with linked products is required for a delivery note');
    }
    const priorDeliveries=documents.filter(document=>document.sourceQuoteId===quote.id&&document.type==='delivery');
    const remaining=remainingDeliveryLines(sourceLines,priorDeliveries);
    if(!remaining.some(line=>line.remainingQty>0))throw new Error('All quote quantities have already been delivered');
    if(requestedDeliveryLines?.length===0)throw new Error('Choose at least one quantity to deliver');
    const requests=requestedDeliveryLines??remaining.filter(line=>line.remainingQty>0).map(line=>({productId:line.productId,qty:line.remainingQty,lineIndex:line.lineIndex}));
    if(requests.some(line=>!Number.isFinite(line.qty)||line.qty<=0))throw new Error('Delivery quantities must be greater than zero');
    const hasLineIndexes=requests.some(line=>line.lineIndex!==undefined);
    if(hasLineIndexes&&requests.some(line=>line.lineIndex===undefined))throw new Error('Delivery line selection is invalid');
    const selected:ConversionLine[]=[];
    if(hasLineIndexes){
      const requestedByIndex=new Map<number,number>();
      for(const request of requests){
        const index=request.lineIndex!;
        const line=remaining.find(item=>item.lineIndex===index);
        if(!line||line.productId!==request.productId)throw new Error('Delivery line does not match the quote');
        requestedByIndex.set(index,(requestedByIndex.get(index)||0)+request.qty);
      }
      for(const [index,quantity] of requestedByIndex){
        const line=remaining.find(item=>item.lineIndex===index)!;
        if(quantity>line.remainingQty)throw new Error('Delivery quantity exceeds the remaining quote quantity for line '+index);
        selected.push({...line,quoteLineIndex:index,qty:quantity,total:line.unitPrice*quantity});
      }
    }else{
      const requestedByProduct=new Map<number,number>();
      for(const line of requests)requestedByProduct.set(line.productId,(requestedByProduct.get(line.productId)||0)+line.qty);
      const remainingByProduct=new Map<number,number>();
      for(const line of remaining)remainingByProduct.set(line.productId,(remainingByProduct.get(line.productId)||0)+line.remainingQty);
      for(const [productId,quantity] of requestedByProduct){
        if(!remainingByProduct.has(productId)||quantity>remainingByProduct.get(productId)!)throw new Error('Delivery quantity exceeds the remaining quote quantity for product '+productId);
      }
      const left=new Map(requestedByProduct);
      for(const line of remaining){
        const quantity=Math.min(line.remainingQty,left.get(line.productId)||0);
        if(quantity<=0)continue;
        selected.push({...line,quoteLineIndex:line.lineIndex,qty:quantity,total:line.unitPrice*quantity});
        left.set(line.productId,(left.get(line.productId)||0)-quantity);
      }
    }
    const required=new Map<number,number>();
    selected.forEach(line=>required.set(line.productId,(required.get(line.productId)||0)+line.qty));
    const pending=Array.from(required.entries()).find(([productId,quantity])=>{
      const product=products.find(item=>item.id===productId);
      return !product||product.qty<quantity;
    });
    if(pending)throw new Error('Insufficient stock for product '+pending[0]);
    const priorValue=priorDeliveries.reduce((sum,item)=>sum+Math.round((item.total||0)*100),0);
    const quoteValue=Math.round(quote.total*100);
    const remainingValue=Math.max(0,quoteValue-priorValue);
    const remainingGross=remaining.reduce((sum,line)=>sum+line.unitPrice*line.remainingQty,0);
    const selectedGross=selected.reduce((sum,line)=>sum+line.unitPrice*line.qty,0);
    const selectedByIndex=new Map<number,number>();
    selected.forEach(line=>selectedByIndex.set(line.quoteLineIndex!, (selectedByIndex.get(line.quoteLineIndex!)||0)+line.qty));
    const deliversAll=remaining.every(line=>line.remainingQty<=0||(selectedByIndex.get(line.lineIndex)||0)>=line.remainingQty);
    documentTotal=deliversAll||remainingGross<=0?remainingValue/100:Math.round(remainingValue*selectedGross/remainingGross)/100;
    let allocated=0;
    documentLines=selected.map((line,index)=>{
      const amount=index===selected.length-1?Math.round(documentTotal*100)-allocated:Math.round(documentTotal*100*(line.unitPrice*line.qty/Math.max(selectedGross,0.000001)));
      allocated+=amount;
      return {...line,total:amount/100};
    });
    updatedProducts=products.map(product=>{
      const amount=required.get(product.id)||0;
      return amount?{...product,qty:product.qty-amount}:product;
    });
  }
  const document:ConvertedDocument={
    id,
    number:(type==='invoice'?'FAC-':type==='delivery'?'BL-':type==='proforma'?'PRO-':'CMD-')+id,
    type,
    customerName:quote.customerName,
    total:documentTotal,
    date,
    status:type==='proforma'?'أولية':type==='customer_order'?'مؤكد':'صادرة',
    sourceQuoteId:quote.id,
    lines:documentLines,
  };
  return {document,updatedProducts};
}
