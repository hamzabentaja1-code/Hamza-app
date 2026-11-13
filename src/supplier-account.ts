export type SupplierAccountPurchase={id:number;supplierName:string;total:number;paidAmount:number};
export type SupplierAccountPayment={id:number;purchaseId?:number;supplierName:string;amount:number;date:string;method:'نقداً'|'تحويل'|'شيك';reference?:string;bankAccountId?:string;openingBalanceAppliedCentimes?:number};
export type SupplierAccountBalance={supplierName:string;purchaseCount:number;total:number;paid:number;openingBalanceCentimes:number;openingBalancePaidCentimes:number;outstanding:number};

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

export function recordSupplierOpeningPayment(input:{supplierName:string;remainingCentimes:number;amount:number;id:number;date:string;method:'نقداً'|'تحويل'|'شيك';reference?:string;bankAccountId?:string}):SupplierAccountPayment {
  const amountCentimes=Math.round(input.amount*100);
  if(!Number.isSafeInteger(input.id)||input.id<=0)throw new Error('معرف الأداء غير صالح أو مستعمل.');
  if(!input.supplierName.trim())throw new Error('اسم المورد إجباري.');
  if(!Number.isSafeInteger(input.remainingCentimes)||input.remainingCentimes<0)throw new Error('الرصيد الافتتاحي للمورد غير صالح.');
  if(!Number.isFinite(input.amount)||input.amount<=0||!Number.isSafeInteger(amountCentimes))throw new Error('مبلغ الأداء خاصو يكون أكبر من صفر.');
  if(amountCentimes>input.remainingCentimes)throw new Error('مبلغ الأداء أكبر من الدين المتبقي.');
  if(!input.date.trim())throw new Error('تاريخ الأداء إجباري.');
  if(input.method==='شيك'&&!input.reference?.trim())throw new Error('مرجع الشيك إجباري.');
  if(input.method==='تحويل'&&!input.bankAccountId?.trim())throw new Error('اختار الحساب البنكي للتحويل.');
  return {id:input.id,supplierName:input.supplierName.trim(),amount:amountCentimes/100,date:input.date,method:input.method,reference:input.reference?.trim()||undefined,bankAccountId:input.method==='تحويل'?input.bankAccountId?.trim():undefined,openingBalanceAppliedCentimes:amountCentimes};
}

export function supplierAccountBalances(purchases:readonly SupplierAccountPurchase[],payments:readonly SupplierAccountPayment[],openingBalances:readonly {supplierName:string;amountCentimes:number}[]=[]):SupplierAccountBalance[] {
  const totals=new Map<string,SupplierAccountBalance>();
  for(const purchase of purchases){
    const row=totals.get(purchase.supplierName)||{supplierName:purchase.supplierName,purchaseCount:0,total:0,paid:0,openingBalanceCentimes:0,openingBalancePaidCentimes:0,outstanding:0};
    const laterPaid=payments.filter(payment=>payment.purchaseId===purchase.id).reduce((sum,payment)=>sum+payment.amount,0);
    row.purchaseCount+=1;row.total+=purchase.total;row.paid+=purchase.paidAmount+laterPaid;row.outstanding+=purchaseOutstanding(purchase,payments);totals.set(purchase.supplierName,row);
  }
  const openingBySupplier=new Map<string,number>();
  for(const opening of openingBalances){
    if(!opening.supplierName.trim()||!Number.isSafeInteger(opening.amountCentimes)||opening.amountCentimes<0)continue;
    openingBySupplier.set(opening.supplierName,(openingBySupplier.get(opening.supplierName)||0)+opening.amountCentimes);
  }
  for(const [supplierName,amountCentimes] of openingBySupplier){
    const row=totals.get(supplierName)||{supplierName,purchaseCount:0,total:0,paid:0,openingBalanceCentimes:0,openingBalancePaidCentimes:0,outstanding:0};
    const paid=payments.filter(payment=>payment.supplierName===supplierName&&payment.openingBalanceAppliedCentimes!==undefined).reduce((sum,payment)=>sum+(payment.openingBalanceAppliedCentimes||0),0);
    row.openingBalanceCentimes=amountCentimes;row.openingBalancePaidCentimes=paid;row.outstanding+=Math.max(0,amountCentimes-paid)/100;totals.set(supplierName,row);
  }
  return [...totals.values()].sort((a,b)=>b.outstanding-a.outstanding||a.supplierName.localeCompare(b.supplierName));
}

export function normalizeSupplierPayments(value:unknown):SupplierAccountPayment[] {
  if(!Array.isArray(value))return [];
  return value.filter((item):item is SupplierAccountPayment=>{
    if(typeof item!=='object'||item===null)return false;
    const payment=item as Partial<SupplierAccountPayment>;
    return Number.isSafeInteger(payment.id)&&(payment.purchaseId===undefined||Number.isSafeInteger(payment.purchaseId))&&typeof payment.supplierName==='string'&&
      Number.isFinite(payment.amount)&&Number(payment.amount)>0&&typeof payment.date==='string'&&
      ['نقداً','تحويل','شيك'].includes(String(payment.method))&&
      (payment.openingBalanceAppliedCentimes===undefined||Number.isSafeInteger(payment.openingBalanceAppliedCentimes)&&payment.openingBalanceAppliedCentimes>0)&&
      (payment.purchaseId!==undefined||payment.openingBalanceAppliedCentimes!==undefined)&&
      (payment.reference===undefined||typeof payment.reference==='string');
  });
}
