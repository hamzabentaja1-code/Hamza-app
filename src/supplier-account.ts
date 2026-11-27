import type {HistoricalSupplierReturn} from './domain/historical-supplier-returns';
export type SupplierAccountPurchase={id:number;supplierName:string;total:number;paidAmount:number;historicalSupplierReturns?:readonly HistoricalSupplierReturn[]};
export type SupplierAccountPayment={id:number;purchaseId?:number;supplierName:string;amount:number;date:string;method:'نقداً'|'تحويل'|'شيك'|'إشعار دائن';reference?:string;bankAccountId?:string;openingBalanceAppliedCentimes?:number};
export type SupplierAccountBalance={supplierName:string;purchaseCount:number;total:number;paid:number;openingBalanceCentimes:number;openingBalancePaidCentimes:number;outstanding:number;historicalReturnsCentimes?:number;availableCreditCentimes?:number};

/** Legacy purchase records never tracked settlement; count them as settled until the user records new terms. */
export function normalizePurchasePaidAmount(total:number,paidAmount?:number):number {
  if(!Number.isFinite(total)||total<0)return 0;
  if(paidAmount===undefined||!Number.isFinite(paidAmount)||paidAmount<0)return total;
  return Math.min(total,Math.round(paidAmount*100)/100);
}

export function purchaseOutstanding(purchase:SupplierAccountPurchase,payments:readonly SupplierAccountPayment[]):number {
  const laterPaid=payments.filter(payment=>payment.purchaseId===purchase.id).reduce((sum,payment)=>sum+(payment.method==='إشعار دائن'?0:payment.amount),0);
  const credits=payments.filter(payment=>payment.purchaseId===purchase.id&&payment.method==='إشعار دائن').reduce((sum,payment)=>sum+payment.amount,0);
  return Math.max(0,Math.round((purchase.total-purchase.paidAmount-laterPaid-credits)*100)/100);
}

export function recordSupplierPayment(input:{purchase:SupplierAccountPurchase;payments:readonly SupplierAccountPayment[];amount:number;id:number;date:string;method:'نقداً'|'تحويل'|'شيك';reference?:string;bankAccountId?:string;maximumCentimes?:number}):SupplierAccountPayment {
  if(!Number.isSafeInteger(input.id)||input.id<=0||input.payments.some(payment=>payment.id===input.id))throw new Error('معرف الأداء غير صالح أو مستعمل.');
  if(!Number.isSafeInteger(input.purchase.id)||!Number.isFinite(input.purchase.total)||input.purchase.total<0)throw new Error('مرجع الشراء غير صالح.');
  if(!Number.isFinite(input.amount)||input.amount<=0)throw new Error('مبلغ الأداء خاصو يكون أكبر من صفر.');
  if(!input.date.trim())throw new Error('تاريخ الأداء إجباري.');
  if(!input.purchase.supplierName.trim())throw new Error('اسم المورد إجباري.');
  if(input.method==='شيك'&&!input.reference?.trim())throw new Error('مرجع الشيك إجباري.');
  if(input.method==='تحويل'&&!input.bankAccountId?.trim())throw new Error('اختار الحساب البنكي للتحويل.');
  const outstanding=purchaseOutstanding(input.purchase,input.payments);
  if(input.amount>outstanding+1e-9||(input.maximumCentimes!==undefined&&Math.round(input.amount*100)>input.maximumCentimes))throw new Error('مبلغ الأداء أكبر من الدين المتبقي.');
  return {id:input.id,purchaseId:input.purchase.id,supplierName:input.purchase.supplierName,amount:Math.round(input.amount*100)/100,date:input.date,method:input.method,reference:input.reference?.trim()||undefined,bankAccountId:input.method==='تحويل'?input.bankAccountId?.trim():undefined};
}

/** Apply a supplier credit note to one purchase without creating a cash or bank movement. */
export function recordSupplierCredit(input:{purchase:SupplierAccountPurchase;payments:readonly SupplierAccountPayment[];amount:number;id:number;date:string;reference:string;maximumCentimes?:number}):SupplierAccountPayment {
  if(!Number.isSafeInteger(input.id)||input.id<=0||input.payments.some(payment=>payment.id===input.id))throw new Error('معرف الأداء غير صالح أو مستعمل.');
  if(!Number.isSafeInteger(input.purchase.id)||!Number.isFinite(input.purchase.total)||input.purchase.total<0)throw new Error('مرجع الشراء غير صالح.');
  if(!input.purchase.supplierName.trim())throw new Error('اسم المورد إجباري.');
  const amountCentimes=Math.round(input.amount*100);
  if(!Number.isFinite(input.amount)||input.amount<=0||!Number.isSafeInteger(amountCentimes))throw new Error('مبلغ الإشعار الدائن خاصو يكون أكبر من صفر.');
  if(!input.date.trim()||!input.reference.trim())throw new Error('مرجع الإشعار وتاريخه إجباريان.');
  const dueCentimes=Math.round(purchaseOutstanding(input.purchase,input.payments)*100);
  if(amountCentimes>dueCentimes||(input.maximumCentimes!==undefined&&amountCentimes>input.maximumCentimes))throw new Error('مبلغ الإشعار أكبر من الدين المتبقي.');
  return {id:input.id,purchaseId:input.purchase.id,supplierName:input.purchase.supplierName,amount:amountCentimes/100,date:input.date,method:'إشعار دائن',reference:input.reference.trim()};
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
  return supplierAccountLedger(purchases,payments,openingBalances).balances;
}

export function supplierAccountLedger(purchases:readonly SupplierAccountPurchase[],payments:readonly SupplierAccountPayment[],openingBalances:readonly {supplierName:string;amountCentimes:number}[]=[]){
  const totals=new Map<string,SupplierAccountBalance>();
  const dueByPurchase=new Map<number,number>();
  const openingDueBySupplier=new Map<string,number>();
  const purchasesBySupplier=new Map<string,SupplierAccountPurchase[]>();
  for(const purchase of purchases){
    const row=totals.get(purchase.supplierName)||{supplierName:purchase.supplierName,purchaseCount:0,total:0,paid:0,openingBalanceCentimes:0,openingBalancePaidCentimes:0,outstanding:0};
    const laterPaid=payments.filter(payment=>payment.purchaseId===purchase.id&&payment.method!=='إشعار دائن').reduce((sum,payment)=>sum+payment.amount,0);
    row.purchaseCount+=1;row.total+=purchase.total;row.paid+=purchase.paidAmount+laterPaid;const due=Math.round(purchaseOutstanding(purchase,payments)*100);
    dueByPurchase.set(purchase.id,due);
    const list=purchasesBySupplier.get(purchase.supplierName)??[];
    list.push(purchase);purchasesBySupplier.set(purchase.supplierName,list);
    totals.set(purchase.supplierName,row);
  }
  const openingBySupplier=new Map<string,number>();
  for(const opening of openingBalances){
    if(!opening.supplierName.trim()||!Number.isSafeInteger(opening.amountCentimes)||opening.amountCentimes<0)continue;
    openingBySupplier.set(opening.supplierName,(openingBySupplier.get(opening.supplierName)||0)+opening.amountCentimes);
  }
  for(const [supplierName,amountCentimes] of openingBySupplier){
    const row=totals.get(supplierName)||{supplierName,purchaseCount:0,total:0,paid:0,openingBalanceCentimes:0,openingBalancePaidCentimes:0,outstanding:0};
    const paid=payments.filter(payment=>payment.supplierName===supplierName&&payment.openingBalanceAppliedCentimes!==undefined).reduce((sum,payment)=>sum+(payment.openingBalanceAppliedCentimes||0),0);
    row.openingBalanceCentimes=amountCentimes;row.openingBalancePaidCentimes=paid;openingDueBySupplier.set(supplierName,Math.max(0,amountCentimes-paid));totals.set(supplierName,row);
  }
  for(const [name,row] of totals){
    const purchases=(purchasesBySupplier.get(name)??[]).sort((a,b)=>a.id-b.id);
    let pool=0,returned=0;
    for(const purchase of purchases){
      const own=(purchase.historicalSupplierReturns??[]).reduce((sum,item)=>sum+item.amountCentimes,0);
      if(!Number.isSafeInteger(own)||own<0)throw new Error('رصيد مرتجعات المورد غير صالح.');
      returned+=own;
      const due=dueByPurchase.get(purchase.id)??0;
      const applied=Math.min(own,due);
      dueByPurchase.set(purchase.id,due-applied);pool+=own-applied;
    }
    if(!Number.isSafeInteger(returned))throw new Error('رصيد مرتجعات المورد غير صالح.');
    let dueBeforeOpening=0;
    for(const purchase of purchases){
      const due=dueByPurchase.get(purchase.id)??0;
      const applied=Math.min(pool,due);
      dueByPurchase.set(purchase.id,due-applied);pool-=applied;dueBeforeOpening+=due-applied;
    }
    const opening=openingDueBySupplier.get(name)??0;
    const openingApplied=Math.min(opening,pool);
    openingDueBySupplier.set(name,opening-openingApplied);pool-=openingApplied;
    row.outstanding=(dueBeforeOpening+opening-openingApplied)/100;
    if(returned>0){row.historicalReturnsCentimes=returned;row.availableCreditCentimes=pool;}
  }
  return {balances:[...totals.values()].sort((a,b)=>b.outstanding-a.outstanding||a.supplierName.localeCompare(b.supplierName)),dueByPurchase,openingDueBySupplier};
}

export function normalizeSupplierPayments(value:unknown):SupplierAccountPayment[] {
  if(!Array.isArray(value))return [];
  return value.filter((item):item is SupplierAccountPayment=>{
    if(typeof item!=='object'||item===null)return false;
    const payment=item as Partial<SupplierAccountPayment>;
    return Number.isSafeInteger(payment.id)&&(payment.purchaseId===undefined||Number.isSafeInteger(payment.purchaseId))&&typeof payment.supplierName==='string'&&
      Number.isFinite(payment.amount)&&Number(payment.amount)>0&&typeof payment.date==='string'&&
      ['نقداً','تحويل','شيك','إشعار دائن'].includes(String(payment.method))&&
      (payment.openingBalanceAppliedCentimes===undefined||Number.isSafeInteger(payment.openingBalanceAppliedCentimes)&&payment.openingBalanceAppliedCentimes>0)&&
      (payment.purchaseId!==undefined||payment.openingBalanceAppliedCentimes!==undefined)&&
      (payment.reference===undefined||typeof payment.reference==='string');
  });
}
