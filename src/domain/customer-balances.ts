export type InvoiceBalanceRecord = {
  type:string;
  customerName:string;
  total:number;
  paidCentimes?:number;
  creditedCentimes?:number;
};
export type CustomerCreditRecord={customerName:string;unappliedCentimes:number};
export type CustomerBalance = {
  customerName:string; invoiceCount:number; totalCentimes:number;
  paidCentimes:number; creditedCentimes:number; outstandingCentimes:number; customerCreditCentimes:number;
};
/** Computes invoice receivables after payments and credited returns, plus unapplied customer credits. */
export function calculateCustomerBalances(documents:InvoiceBalanceRecord[],credits:CustomerCreditRecord[]=[]):CustomerBalance[] {
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
      customerName:document.customerName,invoiceCount:0,totalCentimes:0,paidCentimes:0,creditedCentimes:0,outstandingCentimes:0,customerCreditCentimes:0,
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
    const current=balances.get(credit.customerName)??{customerName:credit.customerName,invoiceCount:0,totalCentimes:0,paidCentimes:0,creditedCentimes:0,outstandingCentimes:0,customerCreditCentimes:0};
    current.customerCreditCentimes+=credit.unappliedCentimes;
    if(!Number.isSafeInteger(current.customerCreditCentimes))throw new Error('Customer credit is too large');
    balances.set(credit.customerName,current);
  }
  return Array.from(balances.values()).sort((a,b)=>b.outstandingCentimes-a.outstandingCentimes);
}
