export type InvoiceStockLine = {productId:number;qty:number};
export type InvoiceStockDeduction = {productId:number;quantity:number};

/** Builds one stock issue per invoice product, skipping quotes already issued on a delivery note. */
export function planInvoiceStockDeduction(lines:readonly InvoiceStockLine[],alreadyDelivered:boolean):InvoiceStockDeduction[] {
  if(alreadyDelivered)return [];
  const quantities=new Map<number,number>();
  for(const line of lines){
    if(!Number.isSafeInteger(line.productId)||line.productId<=0)continue;
    if(!Number.isFinite(line.qty)||line.qty<=0)throw new Error('الكمية خاصها تكون أكبر من صفر.');
    quantities.set(line.productId,(quantities.get(line.productId)||0)+line.qty);
  }
  return Array.from(quantities,([productId,quantity])=>({productId,quantity}));
}
