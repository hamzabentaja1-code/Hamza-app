export type InvoiceBalanceRecord = {
  type:string;
  customerName:string;
  total:number;
  paidCentimes?:number;
  date?:string;
};
export type CustomerOpeningBalanceRecord = { customerName: string; openingBalanceCentimes?: number };
export type CustomerCreditNoteRecord = {id?:number;customerName:string;total:number;date?:string};
export type CustomerBalance = {
  customerName:string; invoiceCount:number; totalCentimes:number;
  paidCentimes:number; openingBalanceCentimes:number; outstandingCentimes:number; creditBalanceCentimes?:number;
};
/** Computes customer receivables from invoices only, using integer MAD centimes. */
export function calculateCustomerBalances(
  documents:InvoiceBalanceRecord[],
  openingBalances:CustomerOpeningBalanceRecord[] = [],
  creditNotes:CustomerCreditNoteRecord[] = [],
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
  // Apply customer credit notes to that customer's oldest unpaid invoices first.
  // Any unused credit remains visible as a customer credit balance; it never
  // becomes a cash refund or a negative receivable.
  const creditsByCustomer=new Map<string,number>();
  for(const note of creditNotes){
    const name=note.customerName.trim();
    const amount=Math.round(note.total*100);
    if(!name||!Number.isSafeInteger(amount)||amount<0)throw new Error('Customer credit note is invalid');
    creditsByCustomer.set(name,(creditsByCustomer.get(name)||0)+amount);
    if(!Number.isSafeInteger(creditsByCustomer.get(name)))throw new Error('Customer credit balance is too large');
  }
  const invoicesByCustomer=new Map<string,InvoiceBalanceRecord[]>();
  for(const document of documents){
    if(document.type!=='invoice'||!document.customerName.trim())continue;
    const list=invoicesByCustomer.get(document.customerName)||[];
    list.push(document);invoicesByCustomer.set(document.customerName,list);
  }
  for(const [name,availableCredit] of creditsByCustomer){
    let remainingCredit=availableCredit;
    const invoices=(invoicesByCustomer.get(name)||[]).slice().sort((a,b)=>{
      const dateA=a.date||'';
      const dateB=b.date||'';
      return dateA.localeCompare(dateB);
    });
    for(const invoice of invoices){
      if(remainingCredit<=0)break;
      const total=Math.round(invoice.total*100);
      const paid=invoice.paidCentimes??0;
      const open=Math.max(0,total-paid);
      const applied=Math.min(open,remainingCredit);
      remainingCredit-=applied;
      const balance=balances.get(name);
      if(balance)balance.outstandingCentimes-=applied;
    }
    const balance=balances.get(name);
    if(balance&&remainingCredit>0)balance.creditBalanceCentimes=remainingCredit;
  }
  return Array.from(balances.values()).sort((a,b)=>b.outstandingCentimes-a.outstandingCentimes);
}
