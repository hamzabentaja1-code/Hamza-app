export type InvoiceBalanceRecord = {
  type:string;
  customerName:string;
  total:number;
  paidCentimes?:number;
  creditedCentimes?:number;
};
export type CustomerCreditRecord={customerName:string;unappliedCentimes:number};
export type CustomerOpeningBalance={customerName:string;amountCentimes:number};
export type CustomerOpeningPayment={customerName:string;amountCentimes:number};
export type CustomerBalance = {
  customerName:string; invoiceCount:number; totalCentimes:number;
  paidCentimes:number; creditedCentimes:number; openingBalanceCentimes:number; openingBalancePaidCentimes:number;
  outstandingCentimes:number; customerCreditCentimes:number;
};
export function allocatePaymentAcrossCustomerDebt(paymentCentimes:number,invoiceDueCentimes:number,openingDueCentimes:number):{invoicePaymentCentimes:number;openingBalanceAppliedCentimes:number;unappliedCentimes:number}{
  if(!Number.isSafeInteger(paymentCentimes)||paymentCentimes<=0||!Number.isSafeInteger(invoiceDueCentimes)||invoiceDueCentimes<0||!Number.isSafeInteger(openingDueCentimes)||openingDueCentimes<0)throw new Error('Customer payment allocation is invalid');
  if((invoiceDueCentimes>0||openingDueCentimes>0)&&paymentCentimes>invoiceDueCentimes+openingDueCentimes)throw new Error('مبلغ الأداء أكبر من الدين المفتوح.');
  const invoicePaymentCentimes=Math.min(paymentCentimes,invoiceDueCentimes);
  const remainder=paymentCentimes-invoicePaymentCentimes;
  const openingBalanceAppliedCentimes=Math.min(remainder,openingDueCentimes);
  return {invoicePaymentCentimes,openingBalanceAppliedCentimes,unappliedCentimes:remainder-openingBalanceAppliedCentimes};
}
/** Computes invoice receivables after payments and credited returns, plus unapplied customer credits. */
export function calculateCustomerBalances(documents:InvoiceBalanceRecord[],credits:CustomerCreditRecord[]=[],openingBalances:CustomerOpeningBalance[]=[],openingPayments:CustomerOpeningPayment[]=[]):CustomerBalance[] {
  const balances=new Map<string,CustomerBalance>();
  for(const document of documents) {
    if(document.type!=='invoice'||!document.customerName.trim()) continue;
    const totalCentimes=Math.round(document.total*100);
    const paidCentimes=document.paidCentimes??0;
    const creditedCentimes=document.creditedCentimes??0;
    if(!Number.isSafeInteger(totalCentimes)||totalCentimes<0||
       !Number.isSafeInteger(paidCentimes)||paidCentimes<0||!Number.isSafeInteger(creditedCentimes)||creditedCentimes<0||paidCentimes+creditedCentimes>totalCentimes)
      throw new Error('Invoice balance is invalid for '+document.customerName);
    const current=balances.get(document.customerName)??{
      customerName:document.customerName,invoiceCount:0,totalCentimes:0,paidCentimes:0,creditedCentimes:0,openingBalanceCentimes:0,openingBalancePaidCentimes:0,outstandingCentimes:0,customerCreditCentimes:0,
    };
    current.invoiceCount++; current.totalCentimes+=totalCentimes;
    current.paidCentimes+=paidCentimes;current.creditedCentimes+=creditedCentimes;current.outstandingCentimes+=totalCentimes-paidCentimes-creditedCentimes;
    if(!Number.isSafeInteger(current.totalCentimes)||!Number.isSafeInteger(current.paidCentimes)||!Number.isSafeInteger(current.creditedCentimes)||!Number.isSafeInteger(current.outstandingCentimes))
      throw new Error('Customer balance is too large');
    balances.set(document.customerName,current);
  }
  for(const credit of credits){
    if(!credit.customerName.trim()||!Number.isSafeInteger(credit.unappliedCentimes)||credit.unappliedCentimes<0)throw new Error('Customer credit is invalid');
    if(credit.unappliedCentimes===0)continue;
    const current=balances.get(credit.customerName)??{customerName:credit.customerName,invoiceCount:0,totalCentimes:0,paidCentimes:0,creditedCentimes:0,openingBalanceCentimes:0,openingBalancePaidCentimes:0,outstandingCentimes:0,customerCreditCentimes:0};
    current.customerCreditCentimes+=credit.unappliedCentimes;
    if(!Number.isSafeInteger(current.customerCreditCentimes))throw new Error('Customer credit is too large');
    balances.set(credit.customerName,current);
  }
  for(const opening of openingBalances){
    if(!opening.customerName.trim()||!Number.isSafeInteger(opening.amountCentimes)||opening.amountCentimes<0)throw new Error('Customer opening balance is invalid');
    const current=balances.get(opening.customerName)??{customerName:opening.customerName,invoiceCount:0,totalCentimes:0,paidCentimes:0,creditedCentimes:0,openingBalanceCentimes:0,openingBalancePaidCentimes:0,outstandingCentimes:0,customerCreditCentimes:0};
    current.openingBalanceCentimes+=opening.amountCentimes;
    if(!Number.isSafeInteger(current.openingBalanceCentimes))throw new Error('Customer opening balance is too large');
    balances.set(opening.customerName,current);
  }
  for(const payment of openingPayments){
    if(!payment.customerName.trim()||!Number.isSafeInteger(payment.amountCentimes)||payment.amountCentimes<0)throw new Error('Customer opening payment is invalid');
    const current=balances.get(payment.customerName)??{customerName:payment.customerName,invoiceCount:0,totalCentimes:0,paidCentimes:0,creditedCentimes:0,openingBalanceCentimes:0,openingBalancePaidCentimes:0,outstandingCentimes:0,customerCreditCentimes:0};
    current.openingBalancePaidCentimes+=payment.amountCentimes;
    if(!Number.isSafeInteger(current.openingBalancePaidCentimes))throw new Error('Customer opening payments are too large');
    balances.set(payment.customerName,current);
  }
  for(const current of balances.values()){
    if(current.openingBalancePaidCentimes>current.openingBalanceCentimes)throw new Error('Customer opening balance payments exceed the balance');
    current.outstandingCentimes+=current.openingBalanceCentimes-current.openingBalancePaidCentimes;
    if(!Number.isSafeInteger(current.outstandingCentimes))throw new Error('Customer balance is too large');
  }
  return Array.from(balances.values()).sort((a,b)=>b.outstandingCentimes-a.outstandingCentimes);
}
