export type SupplierAccountPurchase={id:number;supplierName:string;total:number;paidAmount:number};
export type SupplierAccountPayment={id:number;purchaseId:number;supplierName:string;amount:number;date:string;method:'نقداً'|'تحويل'|'شيك';reference?:string;bankAccountId?:string};
export type SupplierAccountBalance={supplierName:string;purchaseCount:number;total:number;paid:number;outstanding:number};

/** Legacy purchase records never tracked settlement; count them as settled until the user records new terms. */
export function normalizePurchasePaidAmount(total:number,paidAmount?:number):number {
  if(!Number.isFinite(total)||total<0)return 0;
  if(paidAmount===undefined||!Number.isFinite(paidAmount)||paidAmount<0)return total;
  return Math.min(total,Math.round(paidAmount*100)/100);
}

export function purchaseOutstanding(purchase:SupplierAccountPurchase,payments:readonly SupplierAccountPayment[]):number {
  const laterPaid=payments.filter(payment=>payment.purchaseId===purchase.id).reduce((sum,payment)=>sum+payment.amount,0);
  return Math.max(0,Math.round((purchase.total-purchase.paidAmount-laterPaid)*100)/100);
}

export function recordSupplierPayment(input:{purchase:SupplierAccountPurchase;payments:readonly SupplierAccountPayment[];amount:number;id:number;date:string;method:'نقداً'|'تحويل'|'شيك';reference?:string;bankAccountId?:string}):SupplierAccountPayment {
  if(!Number.isSafeInteger(input.id)||input.id<=0||input.payments.some(payment=>payment.id===input.id))throw new Error('معرف الأداء غير صالح أو مستعمل.');
  if(!Number.isSafeInteger(input.purchase.id)||!Number.isFinite(input.purchase.total)||input.purchase.total<0)throw new Error('مرجع الشراء غير صالح.');
  if(!Number.isFinite(input.amount)||input.amount<=0)throw new Error('مبلغ الأداء خاصو يكون أكبر من صفر.');
  if(!input.date.trim())throw new Error('تاريخ الأداء إجباري.');
  if(!input.purchase.supplierName.trim())throw new Error('اسم المورد إجباري.');
  if(input.method==='شيك'&&!input.reference?.trim())throw new Error('مرجع الشيك إجباري.');
  if(input.method==='تحويل'&&!input.bankAccountId?.trim())throw new Error('اختار الحساب البنكي للتحويل.');
  const outstanding=purchaseOutstanding(input.purchase,input.payments);
  if(input.amount>outstanding+1e-9)throw new Error('مبلغ الأداء أكبر من الدين المتبقي.');
  return {id:input.id,purchaseId:input.purchase.id,supplierName:input.purchase.supplierName,amount:Math.round(input.amount*100)/100,date:input.date,method:input.method,reference:input.reference?.trim()||undefined,bankAccountId:input.method==='تحويل'?input.bankAccountId?.trim():undefined};
}

export function supplierAccountBalances(purchases:readonly SupplierAccountPurchase[],payments:readonly SupplierAccountPayment[]):SupplierAccountBalance[] {
  const totals=new Map<string,SupplierAccountBalance>();
  for(const purchase of purchases){
    const row=totals.get(purchase.supplierName)||{supplierName:purchase.supplierName,purchaseCount:0,total:0,paid:0,outstanding:0};
    const laterPaid=payments.filter(payment=>payment.purchaseId===purchase.id).reduce((sum,payment)=>sum+payment.amount,0);
    row.purchaseCount+=1;row.total+=purchase.total;row.paid+=purchase.paidAmount+laterPaid;row.outstanding+=purchaseOutstanding(purchase,payments);totals.set(purchase.supplierName,row);
  }
  return [...totals.values()].sort((a,b)=>b.outstanding-a.outstanding||a.supplierName.localeCompare(b.supplierName));
}

export function normalizeSupplierPayments(value:unknown):SupplierAccountPayment[] {
  if(!Array.isArray(value))return [];
  return value.filter((item):item is SupplierAccountPayment=>{
    if(typeof item!=='object'||item===null)return false;
    const payment=item as Partial<SupplierAccountPayment>;
    return Number.isSafeInteger(payment.id)&&Number.isSafeInteger(payment.purchaseId)&&typeof payment.supplierName==='string'&&
      Number.isFinite(payment.amount)&&Number(payment.amount)>0&&typeof payment.date==='string'&&
      ['نقداً','تحويل','شيك'].includes(String(payment.method))&&
      (payment.reference===undefined||typeof payment.reference==='string');
  });
}
