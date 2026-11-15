export type DocumentProductPrice={price:number;quotePrice?:number;invoicePrice?:number};
export type DocumentPriceType='quote'|'invoice';

/** Falls back to the catalog price for older products without a document-specific price. */
export function resolveDocumentProductPrice(product:DocumentProductPrice,type:DocumentPriceType):number {
  const candidate=type==='quote'?product.quotePrice:product.invoicePrice;
  return typeof candidate==='number'&&Number.isFinite(candidate)&&candidate>=0?candidate:product.price;
}

export function parseOptionalProductPrice(value:string):number|undefined {
  if(!value.trim())return undefined;
  const price=Number(value.replace(',','.'));
  if(!Number.isFinite(price)||price<0)throw new Error('ثمن خاص بالوثيقة غير صالح.');
  return price;
}
