export type InvoiceForPayment = {
  type:'invoice'|'delivery';
  total:number;
  paidCentimes?:number;
  creditedCentimes?:number;
  status:string;
};
export type PaymentResult = {
  invoice:InvoiceForPayment & {paidCentimes:number; status:'partially_paid'|'paid'};
  remainingCentimes:number;
};

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
  const creditedCentimes=invoice.creditedCentimes||0;
  const remainingCentimes=totalCentimes-paidCentimes-creditedCentimes;
  if(!Number.isSafeInteger(totalCentimes)||totalCentimes<0||!Number.isSafeInteger(paidCentimes)||paidCentimes<0||!Number.isSafeInteger(creditedCentimes)||creditedCentimes<0) {
    throw new Error('Invoice balance is invalid');
  }
  if(paymentCentimes>remainingCentimes) throw new Error('Payment exceeds the remaining invoice balance');
  const nextPaid=paidCentimes+paymentCentimes;
  const remaining=totalCentimes-nextPaid-creditedCentimes;
  return {
    invoice:{...invoice,paidCentimes:nextPaid,status:remaining===0?'paid':'partially_paid'},
    remainingCentimes:remaining,
  };
}
