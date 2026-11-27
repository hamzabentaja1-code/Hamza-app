import type {StockMovement} from '../inventory';
import {parseReportDate} from '../report-filters';
import type {SalesReturnRecord} from './sales-returns';

type Row=Record<string,unknown>;
const text=(value:unknown):value is string=>typeof value==='string'&&!!value.trim();
const id=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
const amount=(value:unknown):number=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&Number.isSafeInteger(Math.round(value*100))?Math.round(value*100):NaN;
const date=(value:unknown):boolean=>text(value)&&!!(parseReportDate(value)||(/^\d{4}-\d{2}-\d{2}T/.test(value)&&Number.isFinite(Date.parse(value))&&parseReportDate(value.slice(0,10))));
const invalid=():never=>{throw new Error('سجل مرتجعات الزبناء القديم غير صالح. البيانات الأصلية ما تبدلاتش.');};
type Invoice={id:number;position:number;date:string;total:number;paid:number;credited:number};

/** Materialize the old visible pooled credit at cutover, not a replay of transactions. */
export function migrateHistoricalCustomerReturns(
  source:Row[],sales:Row[],documents:Row[],stock:StockMovement[],normalizeWarehouse:(value:unknown)=>string,
):{salesReturns:SalesReturnRecord[];documents:Row[]}{
  if(!source.length)return {salesReturns:[],documents};
  const salesById=new Map<unknown,Row>();
  for(const sale of sales){if(salesById.has(sale.id))return invalid();salesById.set(sale.id,sale);}
  const movements=new Map(stock.map(entry=>[entry.id,entry]));
  const seen=new Set<number>(),numbers=new Set<string>(),remainingBySale=new Map<number,number>();
  const affected=new Set<string>();
  const records=source.map((item):SalesReturnRecord=>{
    const sale=salesById.get(item.saleId);
    if(!sale||!id(item.id)||seen.has(item.id)||!id(item.saleId)||!id(item.qty)||!id(sale.qty)||
       !Number.isSafeInteger(amount(sale.total))||!Number.isSafeInteger(amount(item.total))||
       !text(item.customerName)||item.customerName!==sale.customerName||!text(item.productName)||item.productName!==sale.productName||
       (item.productId!==undefined&&!id(item.productId))||(item.productId!==undefined&&sale.productId!==undefined&&item.productId!==sale.productId)||
       item.variantId!==undefined||sale.variantId!==undefined||item.sourceKey!==undefined||item.documentId!==undefined||
       item.invoiceAllocations!==undefined||item.refunds!==undefined||item.unappliedCentimes!==undefined||
       typeof item.reason!=='string'||typeof item.restocked!=='boolean'||!date(item.date)||!text(item.date))return invalid();
    const remaining=remainingBySale.get(item.saleId)??sale.qty;
    if(item.qty>remaining||item.total!==Number((Number(sale.total)/sale.qty*item.qty).toFixed(2)))return invalid();
    remainingBySale.set(item.saleId,remaining-item.qty);
    const warehouseId=normalizeWarehouse(item.warehouseId??sale.warehouseId);
    if(warehouseId!==normalizeWarehouse(sale.warehouseId))return invalid();
    const move=movements.get('legacy-return-in-'+item.id);
    if(movements.has('legacy-return-out-'+item.id))return invalid();
    const productId=id(item.productId)?item.productId:id(sale.productId)?sale.productId:undefined;
    if(item.restocked){
      if(!productId||!move||move.kind!=='return_in'||move.productId!==String(productId)||move.quantity!==item.qty||
        move.warehouseId!==warehouseId||move.reference!==String(item.saleId))return invalid();
    }else if(move)return invalid();
    if(item.number!==undefined&&!text(item.number))return invalid();
    const number=item.number as string|undefined??'AV-HIST-'+item.id;
    if(numbers.has(number.toLocaleLowerCase()))return invalid();
    numbers.add(number.toLocaleLowerCase());seen.add(item.id);affected.add(item.customerName.trim());
    return {...item,id:item.id,saleId:item.saleId,qty:item.qty,number,productName:item.productName,customerName:item.customerName.trim(),
      productId,warehouseId,total:item.total,reason:item.reason,restocked:item.restocked,date:item.date,
      historicalAllocation:true,invoiceAllocations:[],unappliedCentimes:amount(item.total)} as SalesReturnRecord;
  });

  const invoices=new Map<string,Invoice[]>(),invoiceIds=new Set<number>();
  for(let position=0;position<documents.length;position++){
    const doc=documents[position];
    if(doc.type!=='invoice'||!text(doc.customerName)||!affected.has(doc.customerName))continue;
    const total=amount(doc.total),paid=doc.paidCentimes??0;
    if(!id(doc.id)||invoiceIds.has(doc.id)||!Number.isSafeInteger(total)||typeof paid!=='number'||!Number.isSafeInteger(paid)||paid<0||paid>total||
       (doc.creditedCentimes!==undefined&&doc.creditedCentimes!==0)||(doc.date!==undefined&&typeof doc.date!=='string'))return invalid();
    invoiceIds.add(doc.id);
    const list=invoices.get(doc.customerName)??[];
    list.push({id:doc.id,position,date:typeof doc.date==='string'?doc.date:'',total,paid,credited:0});
    invoices.set(doc.customerName,list);
  }
  for(const list of invoices.values())list.sort((a,b)=>a.date.localeCompare(b.date)||a.position-b.position);
  const updated=documents.slice(),cursors=new Map<string,number>();
  // No note-to-invoice allocation existed. Allocate deterministically by legacy note ID,
  // preserving the old invoice order and distributing only the already recognized pool.
  for(const note of [...records].sort((a,b)=>a.id-b.id)){
    const list=invoices.get(note.customerName)??[];
    let index=cursors.get(note.customerName)??0,available=note.unappliedCentimes!;
    while(available>0&&index<list.length){
      const invoice=list[index],due=invoice.total-invoice.paid-invoice.credited;
      const applied=Math.min(due,available);
      if(applied>0){
        invoice.credited+=applied;available-=applied;
        const status=invoice.total===invoice.paid+invoice.credited?'paid':'partially_paid';
        updated[invoice.position]={...updated[invoice.position],creditedCentimes:invoice.credited,status};
        note.invoiceAllocations!.push({documentId:invoice.id,creditedCentimes:invoice.credited,allocatedCentimes:applied,status});
      }
      if(invoice.total===invoice.paid+invoice.credited)index++;
    }
    cursors.set(note.customerName,index);note.unappliedCentimes=available;
  }
  return {salesReturns:records,documents:updated};
}
