import {applyPaymentToInvoice} from './payment-allocation';

export type InvoiceForMultiAllocation = {
 id:number;
 type:'invoice'|'delivery';
 customerName:string;
 total:number;
 paidCentimes?:number;
 status:string;
};
export type InvoicePaymentAllocation = {documentId:number;amountCentimes:number};
export type MultiInvoicePaymentResult<T extends InvoiceForMultiAllocation> = {
 documents:T[];
 allocations:InvoicePaymentAllocation[];
 allocatedCentimes:number;
};

/** Allocate one customer receipt to all that customer's open invoices, oldest first. */
export function allocatePaymentAcrossInvoices<T extends InvoiceForMultiAllocation>(
 documents:T[],
 customerName:string,
 paymentCentimes:number,
):MultiInvoicePaymentResult<T>{
 const name=customerName.trim();
 if(!name)throw new Error('اسم الزبون غير صالح');
 if(!Number.isSafeInteger(paymentCentimes)||paymentCentimes<=0)throw new Error('مبلغ الأداء خاصو يكون موجباً بالسنتيم');
 const invoices=documents.filter(d=>d.type==='invoice'&&d.customerName===name)
  .map(document=>{
   const total=Math.round(document.total*100);
   const paid=document.paidCentimes??0;
   if(!Number.isSafeInteger(total)||total<0||!Number.isSafeInteger(paid)||paid<0||paid>total)
    throw new Error('رصيد إحدى الفواتير غير صالح');
   return {document,total,paid,remaining:total-paid};
  }).filter(row=>row.remaining>0).sort((a,b)=>a.document.id-b.document.id);
 const available=invoices.reduce((sum,row)=>sum+row.remaining,0);
 if(available<=0)throw new Error('لا توجد فواتير مستحقة لهذا الزبون');
 if(paymentCentimes>available)throw new Error('مبلغ الأداء أكبر من مجموع الفواتير المستحقة');
 let remaining=paymentCentimes;
 const allocations:InvoicePaymentAllocation[]=[];
 const updates=new Map<number,T>();
 for(const row of invoices){
  if(remaining===0)break;
  const amount=Math.min(row.remaining,remaining);
  const result=applyPaymentToInvoice({
   type:'invoice',total:row.document.total,paidCentimes:row.paid,status:row.document.status,
  },amount);
  updates.set(row.document.id,{...row.document,...result.invoice} as T);
  allocations.push({documentId:row.document.id,amountCentimes:amount});
  remaining-=amount;
 }
 if(remaining!==0)throw new Error('تعذر توزيع مبلغ الأداء بالكامل');
 return {
  documents:documents.map(document=>updates.get(document.id)||document),
  allocations,
  allocatedCentimes:paymentCentimes,
 };
}
