export type ActivityReportRow=[string,string,string,string,number|string,number];
type SaleRow={date:string;customerName:string;productName:string;qty:number;total:number};
type PurchaseRow={date:string;supplierName:string;productName:string;qty:number;total:number};
type ExpenseRow={date:string;title:string;amount:number;category?:string};
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
    ...input.expenses.map(item=>[item.date,'Dépense','',[item.category||'',item.title].filter(Boolean).join(' • '),'',item.amount] as ActivityReportRow),
    ...input.customerPayments.map(item=>[item.date,'Encaissement client',item.customerName,[item.method,item.note||''].filter(Boolean).join(' • '),'',item.amount] as ActivityReportRow),
    ...input.supplierPayments.map(item=>[item.date,item.method==='إشعار دائن'?'Avoir fournisseur':'Règlement fournisseur',item.supplierName,[item.method,item.reference||''].filter(Boolean).join(' • '),'',item.method==='إشعار دائن'?item.amount:-item.amount] as ActivityReportRow),
  ];
}

type PostedSale = SaleRow & {id:number;documentId?:number;unitPrice:number;unitCost?:number;paymentMethod?:string};
type ReportInvoice = {
  id:number; type:string; date:string; customerName:string; number:string; total:number;
  lines:ReadonlyArray<{productName:string;qty:number;unitPrice:number;total:number}>;
};

/** Include standalone and quote invoices without double-counting POS sales.
 * Legacy invoices don't have a saved cost snapshot; never substitute today's cost.
 */
export function includeInvoicedSales(sales:readonly PostedSale[],documents:readonly ReportInvoice[]):Array<PostedSale & {reference?:string}>{
  const recordedIds=new Set(sales.flatMap(sale=>sale.documentId!==undefined?[sale.documentId]:[]));
  return [...sales,...documents.flatMap(invoice=>{
    if(invoice.type!=='invoice'||recordedIds.has(invoice.id))return [];
    const total=Math.round(invoice.total*100);
    if(!Number.isSafeInteger(total)||total<0)return [];
    const lines=invoice.lines.length?invoice.lines:[{productName:invoice.number,qty:1,unitPrice:invoice.total,total:invoice.total}];
    const weights=lines.map(line=>Number.isFinite(line.total)?Math.max(0,line.total):0);
    const sum=weights.reduce((n,value)=>n+value,0);
    let cumulative=0, allocated=0;
    return lines.map((line,index)=>{
      cumulative+=weights[index];
      const next=index===lines.length-1?total:sum>0?Math.min(total,Math.round(total*cumulative/sum)):0;
      const amount=next-allocated;
      allocated=next;
      return {id:invoice.id,documentId:invoice.id,reference:invoice.number,date:invoice.date,customerName:invoice.customerName,productName:line.productName,qty:line.qty,unitPrice:line.unitPrice,total:amount/100};
    });
  })];
}
