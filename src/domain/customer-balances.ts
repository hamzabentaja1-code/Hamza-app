export type InvoiceBalanceRecord = {
  type:string;
  customerName:string;
  total:number;
  paidCentimes?:number;
  creditedCentimes?:number;
};
export type CustomerBalance = {
  customerName:string; invoiceCount:number; totalCentimes:number;
  paidCentimes:number; outstandingCentimes:number;
  creditedCentimes:number; customerCreditCentimes:number;
};
export type CustomerAccountProfile = { name:string; openingBalanceCentimes?:number };
export type UnallocatedCustomerPayment = { customerName:string; amount:number; documentId?:number };
/** Computes customer receivables from invoices only, using integer MAD centimes. */
export function calculateCustomerBalances(
  documents:InvoiceBalanceRecord[],
  customers:CustomerAccountProfile[] = [],
  payments:UnallocatedCustomerPayment[] = [],
):CustomerBalance[] {
  const balances=new Map<string,CustomerBalance>();
  for(const document of documents) {
    if(document.type!=='invoice'||!document.customerName.trim()) continue;
    const totalCentimes=Math.round(document.total*100);
    const paidCentimes=document.paidCentimes??0;
    const creditedCentimes=document.creditedCentimes??0;
    if(!Number.isSafeInteger(totalCentimes)||totalCentimes<0||
       !Number.isSafeInteger(paidCentimes)||paidCentimes<0||
       !Number.isSafeInteger(creditedCentimes)||creditedCentimes<0)
      throw new Error('Invoice balance is invalid for '+document.customerName);
    const current=balances.get(document.customerName)??{
      customerName:document.customerName,invoiceCount:0,totalCentimes:0,paidCentimes:0,creditedCentimes:0,outstandingCentimes:0,customerCreditCentimes:0,
    };
    current.invoiceCount++; current.totalCentimes+=totalCentimes;
    current.paidCentimes+=paidCentimes;current.creditedCentimes+=creditedCentimes;
    current.outstandingCentimes+=Math.max(0,totalCentimes-paidCentimes-creditedCentimes);
    current.customerCreditCentimes+=Math.max(0,paidCentimes+creditedCentimes-totalCentimes);
    if(!Number.isSafeInteger(current.totalCentimes)||!Number.isSafeInteger(current.paidCentimes)||!Number.isSafeInteger(current.creditedCentimes)||!Number.isSafeInteger(current.outstandingCentimes)||!Number.isSafeInteger(current.customerCreditCentimes))
      throw new Error('Customer balance is too large');
    balances.set(document.customerName,current);
  }
  for(const customer of customers) {
    const opening=customer.openingBalanceCentimes??0;
    if(!Number.isSafeInteger(opening)||opening<0) throw new Error('Opening balance is invalid for '+customer.name);
    const unapplied=payments.filter(payment=>payment.customerName===customer.name&&!payment.documentId)
      .reduce((sum,payment)=>{
        const amount=Math.round(payment.amount*100);
        if(!Number.isSafeInteger(amount)||amount<0) throw new Error('Unallocated payment is invalid for '+customer.name);
        return sum+amount;
      },0);
    const current=balances.get(customer.name)??{
      customerName:customer.name,invoiceCount:0,totalCentimes:0,paidCentimes:0,creditedCentimes:0,outstandingCentimes:0,customerCreditCentimes:0,
    };
    current.totalCentimes+=opening;
    current.paidCentimes+=Math.min(opening,unapplied);
    current.outstandingCentimes+=Math.max(0,opening-unapplied);
    current.customerCreditCentimes+=Math.max(0,unapplied-opening);
    if(!Number.isSafeInteger(current.totalCentimes)||!Number.isSafeInteger(current.paidCentimes)||!Number.isSafeInteger(current.outstandingCentimes)||!Number.isSafeInteger(current.customerCreditCentimes))
      throw new Error('Customer balance is too large');
    balances.set(customer.name,current);
  }
  return Array.from(balances.values()).sort((a,b)=>b.outstandingCentimes-a.outstandingCentimes);
}
