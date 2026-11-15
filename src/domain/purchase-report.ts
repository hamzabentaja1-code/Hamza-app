export type PurchaseReportPurchase={supplierName:string;quantity?:number;qty?:number;total:number;paidAmount?:number};
export type PurchaseReportPayment={supplierName:string;amount:number;method:string};
export type SupplierPurchaseSummary={
  supplierName:string;
  purchaseCount:number;
  quantityMilliUnits:number;
  purchaseTotalCentimes:number;
  paidAtPurchaseCentimes:number;
  cashSettledCentimes:number;
  creditNoteCentimes:number;
};

/** Compare supplier purchase volume and period settlements; credit notes stay separate from cash/bank payments. */
export function summarizePurchasesBySupplier(purchases:readonly PurchaseReportPurchase[],payments:readonly PurchaseReportPayment[]):SupplierPurchaseSummary[]{
  const grouped=new Map<string,SupplierPurchaseSummary>();
  const get=(name:string)=>{
    const supplierName=name.trim();
    if(!supplierName)return undefined;
    const key=supplierName.normalize('NFKC').toLocaleLowerCase();
    let row=grouped.get(key);
    if(!row){row={supplierName,purchaseCount:0,quantityMilliUnits:0,purchaseTotalCentimes:0,paidAtPurchaseCentimes:0,cashSettledCentimes:0,creditNoteCentimes:0};grouped.set(key,row);}
    return row;
  };
  for(const purchase of purchases){
    const quantity=purchase.quantity??purchase.qty;
    if(!Number.isFinite(purchase.total)||purchase.total<0||typeof quantity!=='number'||!Number.isFinite(quantity)||quantity<=0)continue;
    const row=get(purchase.supplierName);if(!row)continue;
    const total=Math.round(purchase.total*100);
    const paid=purchase.paidAmount===undefined?total:Number.isFinite(purchase.paidAmount)?Math.max(0,Math.min(total,Math.round(purchase.paidAmount*100))):0;
    row.purchaseCount++;
    row.quantityMilliUnits+=Math.round(quantity*1000);
    row.purchaseTotalCentimes+=total;
    row.paidAtPurchaseCentimes+=paid;
  }
  for(const payment of payments){
    if(!Number.isFinite(payment.amount)||payment.amount<=0)continue;
    const row=get(payment.supplierName);if(!row)continue;
    const amount=Math.round(payment.amount*100);
    if(payment.method==='إشعار دائن')row.creditNoteCentimes+=amount;
    else row.cashSettledCentimes+=amount;
  }
  return [...grouped.values()].sort((a,b)=>b.purchaseTotalCentimes-a.purchaseTotalCentimes||a.supplierName.localeCompare(b.supplierName));
}
