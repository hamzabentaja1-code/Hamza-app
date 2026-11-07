export type PricedQuoteLine={productId:number;productName:string;qty:number;unitPrice:number;total:number;trackStock?:boolean;variantId?:string};
export type QuoteForPricing={total:number;documentDiscount?:number;lines?:PricedQuoteLine[]};
export type ProductPriceRule={id:number;invoicePrice?:number};

/** Apply configured invoice prices while preserving line discounts and the quote's document discount. */
export function applyInvoicePriceRules<T extends QuoteForPricing>(quote:T,products:ProductPriceRule[]):T{
 if(!quote.lines?.length)return quote;
 const lines=quote.lines.map(line=>{
  if(!Number.isFinite(line.qty)||line.qty<=0||!Number.isFinite(line.unitPrice)||line.unitPrice<0||!Number.isFinite(line.total)||line.total<0)
   throw new Error('سطر العرض يحتوي على كمية أو ثمن غير صالح');
  const product=products.find(item=>item.id===line.productId);
  const unitPrice=line.variantId?line.unitPrice:(product?.invoicePrice===undefined?line.unitPrice:product.invoicePrice);
  if(!Number.isFinite(unitPrice)||unitPrice<0)throw new Error('ثمن الفاتورة غير صالح للمنتج '+line.productName);
  const grossOld=Math.round(line.qty*line.unitPrice*100);
  const oldTotal=Math.round(line.total*100);
  const lineDiscount=Math.max(0,grossOld-oldTotal);
  const grossNew=Math.round(line.qty*unitPrice*100);
  const totalCentimes=Math.max(0,grossNew-Math.min(lineDiscount,grossNew));
  return {...line,unitPrice,total:totalCentimes/100};
 });
 const subtotalCentimes=lines.reduce((sum,line)=>sum+Math.round(line.total*100),0);
 const originalSubtotal=quote.lines.reduce((sum,line)=>sum+Math.round(line.total*100),0);
 const requestedDiscount=quote.documentDiscount===undefined?Math.max(0,originalSubtotal-Math.round(quote.total*100)):Math.max(0,Math.round(quote.documentDiscount*100));
 const documentDiscountCentimes=Math.min(requestedDiscount,subtotalCentimes);
 return {...quote,lines,total:(subtotalCentimes-documentDiscountCentimes)/100,documentDiscount:documentDiscountCentimes/100};
}
