import {allocateSupplierPayment} from './supplier-payments';
export type SupplierPurchaseForAllocation={id:number;supplierName:string;total:number;paidCentimes?:number;returnedCentimes?:number};
export type SupplierPurchaseAllocation={purchaseId:number;amountCentimes:number};
export function allocateSupplierPaymentAcrossPurchases<T extends SupplierPurchaseForAllocation>(
 purchases:T[],supplierName:string,paymentCentimes:number,
):{purchases:T[];allocations:SupplierPurchaseAllocation[];allocatedCentimes:number}{
 const name=supplierName.trim();
 if(!name)throw new Error('اسم المورد غير صالح');
 if(!Number.isSafeInteger(paymentCentimes)||paymentCentimes<=0)throw new Error('مبلغ الأداء خاصو يكون موجب وبالسنتيم');
 const open=purchases.filter(p=>p.supplierName===name).map(p=>{
  const total=Math.round(p.total*100),paid=p.paidCentimes??0,returned=p.returnedCentimes??0;
  if(!Number.isSafeInteger(total)||total<0||!Number.isSafeInteger(paid)||paid<0||paid>total||!Number.isSafeInteger(returned)||returned<0||returned>total)
   throw new Error('رصيد شراء المورد غير صالح');
  return {purchase:p,remaining:Math.max(0,total-paid-returned)};
 }).filter(x=>x.remaining>0).sort((a,b)=>a.purchase.id-b.purchase.id);
 const available=open.reduce((sum,x)=>sum+x.remaining,0);
 if(available<=0)throw new Error('لا توجد مشتريات مستحقة لهذا المورد');
 if(paymentCentimes>available)throw new Error('مبلغ الأداء أكبر من مجموع ديون المورد');
 let remaining=paymentCentimes;
 const allocations:SupplierPurchaseAllocation[]=[];
 const updated=new Map<number,T>();
 for(const row of open){
  if(!remaining)break;
  const amount=Math.min(remaining,row.remaining);
  const result=allocateSupplierPayment(row.purchase,amount);
  updated.set(row.purchase.id,{...row.purchase,paidCentimes:result.paidCentimes});
  allocations.push({purchaseId:row.purchase.id,amountCentimes:amount});
  remaining-=amount;
 }
 if(remaining!==0)throw new Error('تعذر توزيع مبلغ الأداء بالكامل');
 return {purchases:purchases.map(p=>updated.get(p.id)||p),allocations,allocatedCentimes:paymentCentimes};
}
