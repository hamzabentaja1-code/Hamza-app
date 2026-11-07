export type ConversionLine = {
  productId:number;
  productName:string;
  qty:number;
  unitPrice:number;
  total:number;
  trackStock?:boolean;
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
  lines:ConversionLine[];
};
export type ExistingDocument = {sourceQuoteId:number; type:DocumentKind};
export type ConversionResult = {
  document:ConvertedDocument;
  updatedProducts:StockProduct[];
  stockDeducted:boolean;
};

/** Creates a quote-derived document and returns the stock snapshot.
 * The first invoice or delivery note posts stock; its paired document never deducts twice.
 */
export function convertQuote(
  quote:QuoteForConversion,
  type:DocumentKind,
  documents:ExistingDocument[],
  products:StockProduct[],
  id:number,
  date:string,
  documentNumber?:string,
):ConversionResult {
  if(documents.some(d=>d.sourceQuoteId===quote.id&&d.type===type)) {
    throw new Error('This quote has already been converted to this document type');
  }
  const lines=quote.lines?.length?quote.lines:[];
  let updatedProducts=products;
  const stockAlreadyDeducted=documents.some(d=>d.sourceQuoteId===quote.id&&(d.type==='invoice'||d.type==='delivery'));
  const trackedLines=lines.filter(line=>line.trackStock!==false);
  const shouldDeductStock=!stockAlreadyDeducted&&trackedLines.length>0;
  if(type==='delivery'&&!lines.length)throw new Error('A new quote with linked products is required for a delivery note');
  if(shouldDeductStock) {
    if(trackedLines.some(line=>!line.productId)) {
      throw new Error('A new quote with linked products is required for a delivery note');
    }
    const required=new Map<number,number>();
    trackedLines.forEach(line=>required.set(line.productId,(required.get(line.productId)||0)+line.qty));
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
    number:documentNumber||((type==='invoice'?'FAC-':type==='delivery'?'BL-':'PRO-')+id),
    type,
    customerName:quote.customerName,
    total:quote.total,
    date,
    status:'صادرة',
    sourceQuoteId:quote.id,
    lines:documentLines,
  };
  return {document,updatedProducts,stockDeducted:shouldDeductStock};
}
