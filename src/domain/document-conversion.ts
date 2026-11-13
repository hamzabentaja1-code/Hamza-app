export type ConversionLine = {
  productId:number;
  productName:string;
  qty:number;
  unitPrice:number;
  total:number;
};
export type QuoteForConversion = {
  id:number;
  productName:string;
  customerName:string;
  qty:number;
  unitPrice:number;
  total:number;
  validUntil?:string;
  notes?:string;
  lines?:ConversionLine[];
};
export type StockProduct = {id:number; qty:number};
export type DocumentKind = 'invoice'|'delivery'|'proforma';
export type ConvertedDocument = {
  id:number;
  number:string;
  type:DocumentKind;
  customerName:string;
  total:number;
  date:string;
  status:string;
  sourceQuoteId:number;
  validUntil?:string;
  notes?:string;
  paymentDelayDays?:number;
  lines:ConversionLine[];
};
export type ExistingDocument = {sourceQuoteId:number; type:DocumentKind};
export type ConversionResult = {
  document:ConvertedDocument;
  updatedProducts:StockProduct[];
};

export function isValidIsoDate(value:string):boolean {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date=new Date(value+'T00:00:00.000Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}

/** Creates a quote-derived document and returns the stock snapshot.
 * Delivery notes post stock once; invoices and pro forma documents never change stock.
 */
export function convertQuote(
  quote:QuoteForConversion,
  type:DocumentKind,
  documents:ExistingDocument[],
  products:StockProduct[],
  id:number,
  date:string,
):ConversionResult {
  if(documents.some(d=>d.sourceQuoteId===quote.id&&d.type===type)) {
    throw new Error('This quote has already been converted to this document type');
  }
  const lines=quote.lines?.length?quote.lines:[];
  let updatedProducts=products;
  if(type==='delivery') {
    if(!lines.length||lines.some(line=>!line.productId)) {
      throw new Error('A new quote with linked products is required for a delivery note');
    }
    const required=new Map<number,number>();
    lines.forEach(line=>required.set(line.productId,(required.get(line.productId)||0)+line.qty));
    const missing=Array.from(required.entries()).find(([productId,amount])=>{
      const product=products.find(p=>p.id===productId);
      return !product||product.qty<amount;
    });
    if(missing) throw new Error('Insufficient stock for product '+missing[0]);
    updatedProducts=products.map(product=>{
      const amount=required.get(product.id)||0;
      return amount?{...product,qty:product.qty-amount}:product;
    });
  }
  const documentLines=lines.length?lines:[{
    productId:0,productName:quote.productName,qty:quote.qty,
    unitPrice:quote.unitPrice,total:quote.total,
  }];
  const document:ConvertedDocument={
    id,
    number:(type==='invoice'?'FAC-':type==='delivery'?'BL-':'PRO-')+id,
    type,
    customerName:quote.customerName,
    total:quote.total,
    date,
    status:'صادرة',
    sourceQuoteId:quote.id,
    ...(type==='proforma'&&quote.validUntil?{validUntil:quote.validUntil}:{}),
    ...(quote.notes?.trim()?{notes:quote.notes.trim()}:{}),
    lines:documentLines,
  };
  return {document,updatedProducts};
}
