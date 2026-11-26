import type {StockMovement} from '../inventory';
import type {SaleForReturn} from './sales-returns';

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

type PostedSale = SaleRow & SaleForReturn & {unitPrice:number;paymentMethod?:string};
type ReportInvoice = {
  id:number; type:string; date:string; customerName:string; number:string; total:number;
  sourceQuoteId?:number;
  lines:ReadonlyArray<{productId?:number;productName:string;qty:number;unitPrice:number;total:number}>;
};

function resolveInvoiceIssue(issues:readonly StockMovement[],quantity:number) {
  const warehouseId=issues[0]?.warehouseId;
  if(!warehouseId||issues.some(move=>move.warehouseId!==warehouseId||!Number.isFinite(move.quantity)||move.quantity<=0))return {};
  if(Math.abs(issues.reduce((sum,move)=>sum+move.quantity,0)-quantity)>1e-8)return {};
  if(issues.some(move=>!Number.isFinite(move.unitCost)||move.unitCost!<0))return {warehouseId};
  return {warehouseId,unitCost:issues.reduce((sum,move)=>sum+move.quantity*move.unitCost!,0)/quantity};
}

/** Derive invoice lines from their saved values; do not duplicate POS sales or invent stock costs. */
export function includeInvoicedSales(
  sales:readonly PostedSale[],documents:readonly ReportInvoice[],movements:readonly StockMovement[]=[],
):PostedSale[]{
  const invoiceIdCounts=new Map<number,number>();
  for(const document of documents)if(document.type==='invoice')invoiceIdCounts.set(document.id,(invoiceIdCounts.get(document.id)??0)+1);
  const recordedIds=new Set(sales.flatMap(sale=>sale.documentId!==undefined?[sale.documentId]:[]));
  const deliveries=new Map<number,ReportInvoice[]>();
  for(const document of documents)if(document.type==='delivery'&&document.sourceQuoteId!==undefined){
    const group=deliveries.get(document.sourceQuoteId)??[];
    group.push(document);deliveries.set(document.sourceQuoteId,group);
  }
  const issuesByDocument=new Map<string, StockMovement[]>();
  for(const movement of movements){
    if(movement.kind!=='sale')continue;
    const match=/^(invoice|delivery)-(\d+)-\d+$/.exec(movement.id);
    if(!match)continue;
    const key=match[1]+':'+match[2], group=issuesByDocument.get(key)??[];
    group.push(movement);issuesByDocument.set(key,group);
  }
  return [...sales,...documents.flatMap(invoice=>{
    if(invoice.type!=='invoice'||recordedIds.has(invoice.id)||!Number.isSafeInteger(invoice.id)||invoice.id<=0)return [];
    const total=Math.round(invoice.total*100);
    if(!Number.isSafeInteger(total)||total<0)return [];
    const hasLines=invoice.lines.length>0;
    const lines=hasLines?invoice.lines:[{productName:invoice.number,qty:1,unitPrice:invoice.total,total:invoice.total}];
    const weights=lines.map(line=>Number.isFinite(line.total)?Math.max(0,line.total):0);
    const sum=weights.reduce((n,value)=>n+value,0);
    const counts=new Map<number,number>();
    const matchingDeliveries=invoice.sourceQuoteId!==undefined?deliveries.get(invoice.sourceQuoteId)??[]:[];
    const invoiceIssues=issuesByDocument.get('invoice:'+invoice.id)??[];
    const deliveryIssues=matchingDeliveries.flatMap(doc=>issuesByDocument.get('delivery:'+doc.id)??[]);
    // If both documents appear to issue stock, if the delivery is ambiguous, or if value is unknown,
    // allow credit but never guess physical provenance or valuation.
    const issues=matchingDeliveries.length>1||invoiceIssues.length&&deliveryIssues.length
      ?[]:invoiceIssues.length?invoiceIssues:deliveryIssues;
    for(const line of lines)if(line.productId&&line.productId>0)counts.set(line.productId,(counts.get(line.productId)??0)+line.qty);
    const provenance=new Map(Array.from(counts,([productId,quantity])=>[
      productId,resolveInvoiceIssue(issues.filter(move=>move.productId===String(productId)),quantity),
    ]));
    let cumulative=0, allocated=0;
    return lines.map((line,index)=>{
      cumulative+=weights[index];
      const next=index===lines.length-1?total:sum>0?Math.min(total,Math.round(total*cumulative/sum)):0;
      const amount=next-allocated;
      allocated=next;
      const productId=line.productId&&line.productId>0?line.productId:undefined;
      const source=productId?provenance.get(productId):undefined;
      return {
        id:invoice.id,documentId:invoice.id,sourceKey:'invoice:'+invoice.id+':'+index,reference:invoice.number,
        date:invoice.date,customerName:invoice.customerName,productName:line.productName,productId,
        qty:line.qty,unitPrice:line.unitPrice,total:amount/100,...source,canRestock:source?.unitCost!==undefined,
        canReturn:hasLines&&invoiceIdCounts.get(invoice.id)===1&&Number.isFinite(line.qty)&&line.qty>0&&!!line.productName.trim()&&!!invoice.customerName.trim(),
      };
    });
  })];
}
