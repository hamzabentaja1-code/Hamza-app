import type {CsvCell} from './csv-export';

export const BUSINESS_LEDGER_HEADERS:CsvCell[]=[
  'Type','ID','Date','Description','Party','Quantity','Unit cost DH','Unit price DH','Amount DH','Status / reference',
];

type LedgerInput={
  products:readonly {id:number;name:string;qty:number;costPrice?:number;price:number;reference?:string}[];
  sales:readonly {id:number;date:string;productName:string;customerName:string;qty:number;unitCost?:number;unitPrice:number;total:number;paymentMethod?:string}[];
  returns:readonly {id:number;date:string;number:string;saleId:number;productName:string;customerName:string;qty:number;total:number;restocked:boolean;invoiceAllocations?:{documentId:number;allocatedCentimes:number}[];unappliedCentimes?:number}[];
  purchases:readonly {id:number;date:string;productName:string;supplierName:string;qty:number;unitCost:number;total:number;paidAmount?:number}[];
  expenses:readonly {id:number;date:string;title:string;amount:number}[];
  payments:readonly {id:number;date:string;customerName:string;amount:number;method:string;documentId?:number;allocations?:{documentId:number;amountCentimes:number}[]}[];
  supplierPayments:readonly {id:number;purchaseId:number;date:string;supplierName:string;amount:number;method:string;reference?:string}[];
  receivables:readonly {customerName:string;outstandingCentimes:number;invoiceCount:number;customerCreditCentimes?:number}[];
};

/** One Excel-friendly ledger for the app's current product and financial records. */
export function buildBusinessLedgerRows(input:LedgerInput):CsvCell[][] {
  const rows:CsvCell[][]=[];
  for(const product of input.products) rows.push(['Stock',product.id,'',product.name,'',product.qty,product.costPrice??'',product.price,product.qty*product.price,product.reference??'']);
  for(const sale of input.sales) rows.push(['Sale',sale.id,sale.date,sale.productName,sale.customerName,sale.qty,sale.unitCost??'',sale.unitPrice,sale.total,sale.paymentMethod??'']);
  for(const item of input.returns){
    const allocated=item.invoiceAllocations?.reduce((sum,allocation)=>sum+allocation.allocatedCentimes,0)??0;
    rows.push(['Credit note',item.id,item.date,item.productName,item.customerName,-item.qty,'','',-item.total,`${item.number}; sale ${item.saleId}; allocated ${(allocated/100).toFixed(2)} DH; customer credit ${((item.unappliedCentimes??0)/100).toFixed(2)} DH; ${item.restocked?'restocked':'not restocked'}`]);
  }
  for(const purchase of input.purchases){
    rows.push(['Purchase',purchase.id,purchase.date,purchase.productName,purchase.supplierName,purchase.qty,purchase.unitCost,purchase.unitCost,purchase.total,`initial paid ${purchase.paidAmount??0} DH`]);
    if((purchase.paidAmount??0)>0)rows.push(['Supplier payment',`initial-${purchase.id}`,purchase.date,'Initial supplier payment',purchase.supplierName,'','','',-purchase.paidAmount!,`purchase ${purchase.id}; initial payment`]);
  }
  for(const expense of input.expenses) rows.push(['Expense',expense.id,expense.date,expense.title,'','','','',-expense.amount,'']);
  for(const payment of input.payments){
    const allocations=payment.allocations?.map(item=>`invoice ${item.documentId}: ${(item.amountCentimes/100).toFixed(2)} DH`).join(', ');
    rows.push(['Payment',payment.id,payment.date,'Customer payment',payment.customerName,'','','',payment.amount,`${payment.method}${allocations?`; ${allocations}`:payment.documentId?`; invoice ${payment.documentId}`:''}`]);
  }
  for(const payment of input.supplierPayments) rows.push(['Supplier payment',payment.id,payment.date,'Supplier payment',payment.supplierName,'','','',-payment.amount,`purchase ${payment.purchaseId}; ${payment.method}${payment.reference?`; ${payment.reference}`:''}`]);
  for(const balance of input.receivables) rows.push(['Receivable','', '',`Open invoices (${balance.invoiceCount})`,balance.customerName,'','','',balance.outstandingCentimes/100,'']);
  for(const balance of input.receivables) if((balance.customerCreditCentimes??0)>0)rows.push(['Customer credit','', '', 'Unapplied credit note balance',balance.customerName,'','','',-(balance.customerCreditCentimes??0)/100,'Available for refund or future application']);
  return rows;
}
