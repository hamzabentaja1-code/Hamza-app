export type InvoiceBalanceRecord = {
  type:string;
  customerName:string;
  total:number;
  paidCentimes?:number;
};
export type CustomerOpeningBalanceRecord = { customerName: string; openingBalanceCentimes?: number };
export type CustomerBalance = {
  customerName:string; invoiceCount:number; totalCentimes:number;
  paidCentimes:number; openingBalanceCentimes:number; outstandingCentimes:number;
};
/** Computes customer receivables from invoices only, using integer MAD centimes. */
export function calculateCustomerBalances(
  documents:InvoiceBalanceRecord[],
  openingBalances:CustomerOpeningBalanceRecord[] = [],
):CustomerBalance[] {
  const balances=new Map<string,CustomerBalance>();
  for (const customer of openingBalances) {
    const name = customer.customerName.trim();
    const opening = customer.openingBalanceCentimes ?? 0;
    if (!name || !Number.isSafeInteger(opening) || opening < 0) {
      throw new Error('Customer opening balance is invalid');
    }
    const current = balances.get(name) ?? {
      customerName:name,invoiceCount:0,totalCentimes:0,paidCentimes:0,
      openingBalanceCentimes:0,outstandingCentimes:0,
    };
    current.openingBalanceCentimes += opening;
    current.outstandingCentimes += opening;
    if (!Number.isSafeInteger(current.openingBalanceCentimes) || !Number.isSafeInteger(current.outstandingCentimes)) {
      throw new Error('Customer opening balance is too large');
    }
    balances.set(name,current);
  }
  for(const document of documents) {
    if(document.type!=='invoice'||!document.customerName.trim()) continue;
    const totalCentimes=Math.round(document.total*100);
    const paidCentimes=document.paidCentimes??0;
    if(!Number.isSafeInteger(totalCentimes)||totalCentimes<0||
       !Number.isSafeInteger(paidCentimes)||paidCentimes<0||paidCentimes>totalCentimes)
      throw new Error('Invoice balance is invalid for '+document.customerName);
    const current=balances.get(document.customerName)??{
      customerName:document.customerName,invoiceCount:0,totalCentimes:0,paidCentimes:0,openingBalanceCentimes:0,outstandingCentimes:0,
    };
    current.invoiceCount++; current.totalCentimes+=totalCentimes;
    current.paidCentimes+=paidCentimes; current.outstandingCentimes+=totalCentimes-paidCentimes;
    if(!Number.isSafeInteger(current.totalCentimes)||!Number.isSafeInteger(current.paidCentimes)||!Number.isSafeInteger(current.outstandingCentimes))
      throw new Error('Customer balance is too large');
    balances.set(document.customerName,current);
  }
  return Array.from(balances.values()).sort((a,b)=>b.outstandingCentimes-a.outstandingCentimes);
}
