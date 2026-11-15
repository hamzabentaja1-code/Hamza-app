export type ActivityReportRow=[string,string,string,string,number|string,number];
type SaleRow={date:string;customerName:string;productName:string;qty:number;total:number};
type PurchaseRow={date:string;supplierName:string;productName:string;qty:number;total:number};
type ExpenseRow={date:string;title:string;amount:number};
type CustomerPaymentRow={date:string;customerName:string;amount:number;method:string;note?:string};
type SupplierPaymentRow={date:string;supplierName:string;amount:number;method:string;reference?:string};
type ReturnRow={date:string;customerName:string;productName:string;qty:number;total:number};

/** Combines activity movements already filtered by date into one export-friendly table. */
export function buildActivityReportRows(input:{
  sales:readonly SaleRow[];returns:readonly ReturnRow[];purchases:readonly PurchaseRow[];expenses:readonly ExpenseRow[];
  customerPayments:readonly CustomerPaymentRow[];supplierPayments:readonly SupplierPaymentRow[];
}):ActivityReportRow[]{
  return [
    ...input.sales.map(item=>[item.date,'Vente',item.customerName,item.productName,item.qty,item.total] as ActivityReportRow),
    ...input.returns.map(item=>[item.date,'Avoir',item.customerName,item.productName,item.qty,-item.total] as ActivityReportRow),
    ...input.purchases.map(item=>[item.date,'Achat',item.supplierName,item.productName,item.qty,item.total] as ActivityReportRow),
    ...input.expenses.map(item=>[item.date,'Dépense','',item.title,'',item.amount] as ActivityReportRow),
    ...input.customerPayments.map(item=>[item.date,'Encaissement client',item.customerName,[item.method,item.note||''].filter(Boolean).join(' • '),'',item.amount] as ActivityReportRow),
    ...input.supplierPayments.map(item=>[item.date,item.method==='إشعار دائن'?'Avoir fournisseur':'Règlement fournisseur',item.supplierName,[item.method,item.reference||''].filter(Boolean).join(' • '),'',item.method==='إشعار دائن'?item.amount:-item.amount] as ActivityReportRow),
  ];
}
