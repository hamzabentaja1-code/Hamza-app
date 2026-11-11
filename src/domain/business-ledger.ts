import type {CsvCell} from './csv-export';

export const BUSINESS_LEDGER_HEADERS:CsvCell[]=[
  'Type','ID','Date','Description','Party','Quantity','Unit cost DH','Unit price DH','Amount DH','Status / reference',
];

type LedgerInput={
  products:readonly {id:number;name:string;qty:number;costPrice?:number;price:number;reference?:string}[];
  sales:readonly {id:number;date:string;productName:string;customerName:string;qty:number;unitCost?:number;unitPrice:number;total:number;paymentMethod?:string}[];
  returns:readonly {id:number;date:string;number:string;saleId:number;productName:string;customerName:string;qty:number;total:number;restocked:boolean}[];
  purchases:readonly {id:number;date:string;productName:string;supplierName:string;qty:number;unitCost:number;total:number}[];
  expenses:readonly {id:number;date:string;title:string;amount:number}[];
  payments:readonly {id:number;date:string;customerName:string;amount:number;method:string;documentId?:number}[];
  receivables:readonly {customerName:string;outstandingCentimes:number;invoiceCount:number}[];
};

/** One Excel-friendly ledger for the app's current product and financial records. */
export function buildBusinessLedgerRows(input:LedgerInput):CsvCell[][] {
  const rows:CsvCell[][]=[];
  for(const product of input.products) rows.push(['Stock',product.id,'',product.name,'',product.qty,product.costPrice??'',product.price,product.qty*product.price,product.reference??'']);
  for(const sale of input.sales) rows.push(['Sale',sale.id,sale.date,sale.productName,sale.customerName,sale.qty,sale.unitCost??'',sale.unitPrice,sale.total,sale.paymentMethod??'']);
  for(const item of input.returns) rows.push(['Credit note',item.id,item.date,item.productName,item.customerName,-item.qty,'','',-item.total,`${item.number}; sale ${item.saleId}; ${item.restocked?'restocked':'not restocked'}`]);
  for(const purchase of input.purchases) rows.push(['Purchase',purchase.id,purchase.date,purchase.productName,purchase.supplierName,purchase.qty,purchase.unitCost,purchase.unitCost,purchase.total,'']);
  for(const expense of input.expenses) rows.push(['Expense',expense.id,expense.date,expense.title,'','','','',-expense.amount,'']);
  for(const payment of input.payments) rows.push(['Payment',payment.id,payment.date,'Customer payment',payment.customerName,'','','',payment.amount,`${payment.method}${payment.documentId?`; invoice ${payment.documentId}`:''}`]);
  for(const balance of input.receivables) rows.push(['Receivable','', '',`Open invoices (${balance.invoiceCount})`,balance.customerName,'','','',balance.outstandingCentimes/100,'']);
  return rows;
}
