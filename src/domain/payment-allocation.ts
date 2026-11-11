export type InvoiceForPayment = {
  type:'invoice'|'delivery';
  total:number;
  paidCentimes?:number;
  status:string;
};
export type PaymentResult = {
  invoice:InvoiceForPayment & {paidCentimes:number; status:'partially_paid'|'paid'};
  remainingCentimes:number;
};
export type InvoiceForAllocation={id:number;total:number;paidCentimes?:number;status:string};
export type InvoiceAllocation={invoiceId:number;paidCentimes:number;allocatedCentimes:number;status:'partially_paid'|'paid'};

/** Allocates a payment to one invoice using integer centimes. */
export function applyPaymentToInvoice(
  invoice:InvoiceForPayment,
  paymentCentimes:number,
):PaymentResult {
  if(invoice.type!=='invoice') throw new Error('Payments can only be allocated to invoices');
  if(!Number.isSafeInteger(paymentCentimes)||paymentCentimes<=0) {
    throw new Error('Payment amount must be a positive integer number of centimes');
  }
  const totalCentimes=Math.round(invoice.total*100);
  const paidCentimes=invoice.paidCentimes||0;
  const remainingCentimes=totalCentimes-paidCentimes;
  if(!Number.isSafeInteger(totalCentimes)||totalCentimes<0||paidCentimes<0||paidCentimes>totalCentimes) {
    throw new Error('Invoice balance is invalid');
  }
  if(paymentCentimes>remainingCentimes) throw new Error('Payment exceeds the remaining invoice balance');
  const nextPaid=paidCentimes+paymentCentimes;
  const remaining=totalCentimes-nextPaid;
  return {
    invoice:{...invoice,paidCentimes:nextPaid,status:remaining===0?'paid':'partially_paid'},
    remainingCentimes:remaining,
  };
}

/** Allocates a customer payment to the oldest open invoices first (ascending invoice ID). */
export function allocatePaymentAcrossInvoices(invoices:readonly InvoiceForAllocation[],paymentCentimes:number):InvoiceAllocation[] {
  if(!Number.isSafeInteger(paymentCentimes)||paymentCentimes<=0)throw new Error('Payment amount must be a positive integer number of centimes');
  const ids=new Set<number>();
  const ordered=[...invoices].sort((a,b)=>a.id-b.id);
  const balances=ordered.map(invoice=>{
    if(!Number.isSafeInteger(invoice.id)||ids.has(invoice.id))throw new Error('Invoice ID is invalid or duplicated');
    ids.add(invoice.id);
    const total=Math.round(invoice.total*100),paid=invoice.paidCentimes??0;
    if(!Number.isSafeInteger(total)||total<0||!Number.isSafeInteger(paid)||paid<0||paid>total)throw new Error('Invoice balance is invalid');
    return {invoice,total,paid,remaining:total-paid};
  }).filter(item=>item.remaining>0);
  const aggregateDue=balances.reduce((sum,item)=>sum+item.remaining,0);
  if(paymentCentimes>aggregateDue)throw new Error('Payment exceeds the customer\'s outstanding balance');
  let left=paymentCentimes;
  return balances.flatMap(item=>{
    if(left<=0)return [];
    const allocated=Math.min(left,item.remaining);left-=allocated;
    const paidCentimes=item.paid+allocated;
    return [{invoiceId:item.invoice.id,paidCentimes,allocatedCentimes:allocated,status:paidCentimes===item.total?'paid' as const:'partially_paid' as const}];
  });
}
