export type SupplierInvoicePaymentMethod = 'cash'|'bank'|'cheque';
export type SupplierInvoicePayment = {
  id: string;
  invoiceId: string;
  supplierId: string;
  amountCentimes: number;
  date: string;
  method: SupplierInvoicePaymentMethod;
  reference?: string;
};
export type SupplierInvoicePaymentSummary = {
  invoiceId: string;
  totalCentimes: number;
  paidCentimes: number;
  outstandingCentimes: number;
  status: 'unpaid'|'partial'|'paid';
};
const validDate=(value:string)=>!!value.trim()&&Number.isFinite(Date.parse(value));

export function summarizeSupplierInvoicePayments(
  invoice: {id:string;supplierId:string;totalCentimes:number},
  payments: SupplierInvoicePayment[],
): SupplierInvoicePaymentSummary {
  if(!invoice.id.trim()||!invoice.supplierId.trim()||!Number.isSafeInteger(invoice.totalCentimes)||invoice.totalCentimes<0)
    throw new Error('فاتورة المورد غير صالحة');
  if(!Array.isArray(payments))throw new Error('سجل أداءات فاتورة المورد غير صالح');
  const ids=new Set<string>();let paidCentimes=0;
  for(const payment of payments){
    if(!payment.id.trim()||ids.has(payment.id)||payment.invoiceId!==invoice.id||payment.supplierId!==invoice.supplierId||
      !Number.isSafeInteger(payment.amountCentimes)||payment.amountCentimes<=0||!validDate(payment.date)||
      !['cash','bank','cheque'].includes(payment.method)||
      (payment.method==='cheque'&&!payment.reference?.trim())||
      (payment.reference!==undefined&&typeof payment.reference!=='string'))
      throw new Error('بيانات أداء فاتورة المورد غير صالحة أو مكررة');
    ids.add(payment.id);paidCentimes+=payment.amountCentimes;
    if(!Number.isSafeInteger(paidCentimes))throw new Error('مجموع أداءات فاتورة المورد تجاوز الحد المالي');
  }
  if(paidCentimes>invoice.totalCentimes)throw new Error('مجموع الأداءات تجاوز مبلغ فاتورة المورد');
  const outstandingCentimes=invoice.totalCentimes-paidCentimes;
  return {invoiceId:invoice.id,totalCentimes:invoice.totalCentimes,paidCentimes,outstandingCentimes,
    status:outstandingCentimes===0?'paid':paidCentimes===0?'unpaid':'partial'};
}

export function addSupplierInvoicePayment(
  invoice:{id:string;supplierId:string;totalCentimes:number},
  payments:SupplierInvoicePayment[],
  payment:SupplierInvoicePayment,
):{payments:SupplierInvoicePayment[];summary:SupplierInvoicePaymentSummary}{
  const current=summarizeSupplierInvoicePayments(invoice,payments);
  if(payments.some(item=>item.id===payment.id))throw new Error('معرف أداء فاتورة المورد مسجل من قبل');
  const next=[...payments,{...payment}];
  return {payments:next,summary:summarizeSupplierInvoicePayments(invoice,next)};
}

export function reverseSupplierInvoicePayment(
  invoice:{id:string;supplierId:string;totalCentimes:number},
  payments:SupplierInvoicePayment[],
  paymentId:string,
):{payments:SupplierInvoicePayment[];summary:SupplierInvoicePaymentSummary}{
  summarizeSupplierInvoicePayments(invoice,payments);
  if(!paymentId.trim()||!payments.some(item=>item.id===paymentId))throw new Error('أداء فاتورة المورد غير موجود');
  const next=payments.filter(item=>item.id!==paymentId);
  return {payments:next,summary:summarizeSupplierInvoicePayments(invoice,next)};
}
