import {migrateHistoricalCustomerReturns} from './historical-customer-returns';
import {normalizeBankAccounts} from './bank-accounts';
import {validateHistoricalBankJournal,verifyHistoricalBankTransfers} from './historical-bank';
import {cashMethod,EMPTY_CASH_ACCOUNT,validateHistoricalCashJournal} from './cash-register';
import {DEFAULT_WAREHOUSE,type StockMovement,type StockMovementKind} from '../inventory';
import {parseReportDate} from '../report-filters';

type Row=Record<string,unknown>;
export const HISTORICAL_REVIEW='هاد النسخة القديمة فيها سجلات ما قدرناش نطابقوها بأمان. البيانات الأصلية ما تبدلاتش.';
const need=(condition:unknown)=>{if(!condition)throw new Error(HISTORICAL_REVIEW);};
const oldDefault='warehouse-default';
const warehouseId=(value:unknown)=>typeof value==='string'&&value.trim()&&value!==oldDefault?value:DEFAULT_WAREHOUSE.id;
const number=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
const nonnegative=(value:unknown):value is number=>number(value)&&value>=0;
const integer=(value:unknown):value is number=>number(value)&&Number.isSafeInteger(value);
const positiveId=(value:unknown):value is number=>integer(value)&&value>0;
const text=(value:unknown):value is string=>typeof value==='string'&&!!value.trim();
const isRow=(value:unknown):value is Row=>!!value&&typeof value==='object'&&!Array.isArray(value);
const rows=(data:Row,key:string):Row[]=>{
  const raw=data[key];
  if(raw===undefined)return [];
  if(!Array.isArray(raw)||!raw.every(isRow))throw new Error(HISTORICAL_REVIEW);
  return raw;
};
const money=(value:unknown)=>nonnegative(value)&&Number.isSafeInteger(Math.round(value*100))?Math.round(value*100):NaN;
const safeDate=(value:unknown)=>text(value)?parseReportDate(value)||parseReportDate(value.slice(0,10)):undefined;
const oldKind:Readonly<Record<string,StockMovementKind>>={
  opening:'opening',purchase:'purchase',sale:'sale',delivery:'sale',return_in:'return_in',return_out:'return_out',
  adjustment:'adjustment',stock_count:'adjustment',transfer_in:'transfer_in',transfer_out:'transfer_out',
};
const unsafe=['cheques','chequeEvents','supplierReturns',
  'productVariants','variantStockMovements','purchaseOrders','customerOrders','workTasks','workOrders','workTimeEntries','equipment','parkedPosCarts','projects'];

/** Translate only demonstrated historical shapes. With material unreconciled records, leave original data untouched. */
export function adaptHistoricalSnapshot(data:Row):Row{
  // These old invoices were independent of purchases and have no equivalent modern screen.
  // Guard even a previously converted snapshot that still carries the hidden original rows.
  need(rows(data,'supplierInvoices').length===0&&rows(data,'supplierInvoicePayments').length===0);
  if(data.hamzaHistoricalMapping===1){
    need(Array.isArray(data.stockMovements));
    if(isRow(data.cashAccount)&&data.cashAccount.historicalJournal!==undefined)validateHistoricalCashJournal(data.cashAccount.historicalJournal);
    normalizeBankAccounts(data.bankAccounts);
    return data;
  }
  if(!Array.isArray(data.inventoryMovements)&&!Array.isArray(data.cashMovements)&&
      !Array.isArray(data.bankMovements)&&!Array.isArray(data.supplierReturns)&&
      !rows(data,'purchases').some(row=>row.paidCentimes!==undefined&&row.paidAmount===undefined))return data;
  if(Array.isArray(data.stockMovements))throw new Error(HISTORICAL_REVIEW);
  for(const key of unsafe)need(rows(data,key).length===0);

  const places=new Map<string,Row>([[DEFAULT_WAREHOUSE.id,{...DEFAULT_WAREHOUSE}]]);
  const seenWarehouse=new Set<string>();
  for(const item of rows(data,'warehouses')){
    need(text(item.id)&&text(item.name));
    const id=warehouseId(item.id);
    need(!seenWarehouse.has(id));seenWarehouse.add(id);
    places.set(id,{...item,id,active:item.active!==false});
  }
  const stock:StockMovement[]=[];
  const totals=new Map<number,number>();
  const warehouseTotals=new Map<string,number>();
  const moveIds=new Set<string>();
  for(const item of rows(data,'inventoryMovements')){
    const date=safeDate(item.date),id=item.id,product=item.productId,raw=item.quantityDelta;
    const kind=text(item.kind)&&Object.prototype.hasOwnProperty.call(oldKind,item.kind)?oldKind[item.kind]:undefined;
    const wh=warehouseId(item.warehouseId);
    if(!text(id)||moveIds.has(id)||!positiveId(product)||!integer(raw)||raw===0||!date||!kind||!places.has(wh)||
       (item.unitCost!==undefined&&!nonnegative(item.unitCost)))throw new Error(HISTORICAL_REVIEW);
    const negative=kind==='sale'||kind==='return_out'||kind==='transfer_out';
    if(kind!=='adjustment'&&(raw<0)!==negative)throw new Error(HISTORICAL_REVIEW);
    moveIds.add(id);
    stock.push({id:'legacy-'+id,productId:String(product),warehouseId:wh,kind,quantity:kind==='adjustment'?raw:Math.abs(raw),
      createdAt:typeof item.date==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(item.date)&&Number.isFinite(Date.parse(item.date))?item.date:date,unitCost:item.unitCost as number|undefined,reference:text(item.sourceId)?item.sourceId:undefined,
      transferId:text(item.transferId)?item.transferId:undefined,note:text(item.note)?item.note:undefined});
    totals.set(product,(totals.get(product)??0)+raw);
    const key=wh+'|'+product;
    warehouseTotals.set(key,(warehouseTotals.get(key)??0)+raw);
  }
  for(const value of warehouseTotals.values())need(integer(value)&&value>=0);

  const productIds=new Set<number>();
  const products=rows(data,'products').map(item=>{
    if(!positiveId(item.id)||productIds.has(item.id)||!text(item.name)||!nonnegative(item.price)||!integer(item.qty)||item.qty<0||item.kind==='service')
      throw new Error(HISTORICAL_REVIEW);
    productIds.add(item.id);
    // The previous app initialized older products without a ledger in its main warehouse.
    if(!totals.has(item.id)&&item.qty>0)stock.push({id:'legacy-unrecorded-opening:'+item.id,productId:String(item.id),warehouseId:DEFAULT_WAREHOUSE.id,
      kind:'opening',quantity:item.qty,createdAt:'',unitCost:nonnegative(item.costPrice)?item.costPrice:undefined});
    if(totals.has(item.id))need(integer(totals.get(item.id))&&totals.get(item.id)===item.qty);
    const legacyPhotos=Array.isArray(item.photos)?item.photos.filter((p):p is string=>text(p)):[];
    return {...item,...(!Array.isArray(item.photoGallery)&&legacyPhotos.length?{photoGallery:[...new Set(legacyPhotos)].slice(0,4)}:{})};
  });
  if(stock.some(item=>!productIds.has(Number(item.productId))))throw new Error(HISTORICAL_REVIEW);

  const rawBankMoves=rows(data,'bankMovements');
  const rawBankReconciliations=rows(data,'bankReconciliations');
  const rawBankAccounts=rows(data,'bankAccounts');
  const bankIds=new Set<unknown>(rawBankAccounts.map(item=>item.id));
  const bankMovesById=new Map<unknown,Row>(rawBankMoves.map(item=>[item.id,item]));
  need(bankIds.size===rawBankAccounts.length&&bankMovesById.size===rawBankMoves.length);
  need(rawBankMoves.every(item=>bankIds.has(item.accountId))&&rawBankReconciliations.every(item=>bankIds.has(item.accountId)));
  need(rows(data,'bankTransfers').length===0&&rows(data,'bankStatementLines').length===0&&rows(data,'bankReconciliationHistory').length===0);
  verifyHistoricalBankTransfers(rawBankMoves,rows(data,'cashMovements'));
  const bankLinked=(row:Row)=>['تحويل','بطاقة','card','transfer'].includes(String(row.method??row.paymentMethod))||text(row.bankAccountId);
  need(!rows(data,'expenses').some(bankLinked));
  const bankPayments=rows(data,'payments').filter(bankLinked);
  // Old customer transfer allocations did not store an account ID, and an unapplied
  // portion could remain only in the journal. Keep the commercial rows unlinked.
  need(bankPayments.every(item=>item.method==='تحويل'&&item.bankAccountId===undefined)&&
    (!bankPayments.length||rawBankMoves.some(item=>item.kind==='customer_payment')));
  const matches=new Map<number,Row>();
  const purchases=rows(data,'purchases');
  for(const buy of purchases){
    if(!positiveId(buy.id)||matches.has(buy.id)||!text(buy.supplierName)||!integer(money(buy.total))||
       (buy.returnedCentimes!==undefined&&buy.returnedCentimes!==0))throw new Error(HISTORICAL_REVIEW);
    matches.set(buy.id,buy);
  }
  const paymentIds=new Set<number>();
  const linkedPaid=new Map<number,number>();
  const supplierBankGroups=new Map<string,{accountId:string;amount:number;ids:number[]}>();
  const supplierPayments=rows(data,'supplierPayments').map(payment=>{
    const buy=positiveId(payment.purchaseId)?matches.get(payment.purchaseId):undefined;
    if(!buy||!positiveId(payment.id)||paymentIds.has(payment.id)||!positiveId(payment.amountCentimes)||payment.amount!==undefined||
       !text(payment.date)||buy.supplierName!==payment.supplierName||!['شيك','نقداً','تحويل'].includes(String(payment.method)))throw new Error(HISTORICAL_REVIEW);
    if(payment.method==='تحويل'){
      if(!text(payment.bankAccountId)||!bankIds.has(payment.bankAccountId))throw new Error(HISTORICAL_REVIEW);
      const key=payment.transactionId===undefined?'supplier-payment-bank-'+payment.id:
        text(payment.transactionId)&&/^supplier-bulk-[1-9]\d*$/.test(payment.transactionId)?'supplier-bulk-bank-'+payment.transactionId:'';
      if(!key)throw new Error(HISTORICAL_REVIEW);
      const group=supplierBankGroups.get(key)??{accountId:payment.bankAccountId,amount:0,ids:[]};
      need(group.accountId===payment.bankAccountId);
      group.amount+=payment.amountCentimes;group.ids.push(payment.id);
      supplierBankGroups.set(key,group);
    }else need(!bankLinked(payment));
    // Old cash settlement is translated for supplier liability but its cash effect stays in the archived cash journal.
    paymentIds.add(payment.id);
    linkedPaid.set(buy.id as number,(linkedPaid.get(buy.id as number)??0)+payment.amountCentimes);
    return {...payment,amount:payment.amountCentimes/100,reference:payment.reference??payment.note};
  });
  const migratedBuys=purchases.map(buy=>{
    const paid=buy.paidCentimes??0,total=money(buy.total),linked=linkedPaid.get(buy.id as number)??0;
    if(!integer(paid)||!integer(linked)||paid<linked||paid>total||buy.paidAmount!==undefined||bankLinked(buy))throw new Error(HISTORICAL_REVIEW);
    return {...buy,warehouseId:warehouseId(buy.warehouseId),productId:positiveId(buy.productId)?String(buy.productId):buy.productId,paidAmount:(paid-linked)/100};
  });
  const contacts=(key:string)=>rows(data,key).map(item=>({...item,ifNumber:item.ifNumber??item.taxId,paymentDelayDays:item.paymentDelayDays??item.paymentTermsDays}));
  const sales=rows(data,'sales').map(item=>({...item,warehouseId:warehouseId(item.warehouseId),unitCost:item.unitCost??item.costPrice}));
  const coveredSupplierIds=new Map<string,number[]>();
  for(const [key,group] of supplierBankGroups){
    const linked=bankMovesById.get(key);
    need(linked?.kind==='supplier_payment'&&linked.accountId===group.accountId&&integer(group.amount)&&linked.amountCentimes===group.amount);
    const covered=coveredSupplierIds.get(group.accountId)??[];
    for(const id of group.ids)covered.push(id);
    coveredSupplierIds.set(group.accountId,covered);
  }
  need(rawBankMoves.every(item=>item.kind!=='supplier_payment'||supplierBankGroups.has(String(item.id))));
  const bankAccounts=rawBankAccounts.map(item=>{
    if(!text(item.id)||item.id!==item.id.trim()||!text(item.name)||item.currency!=='MAD'||item.openingBalanceCentimes!==undefined||
       (item.bankName!==undefined&&typeof item.bankName!=='string')||
       (item.accountNumberMasked!==undefined&&typeof item.accountNumberMasked!=='string')||
       (item.isDefault!==undefined&&typeof item.isDefault!=='boolean'))throw new Error(HISTORICAL_REVIEW);
    return {...item,openingBalanceCentimes:0,openingDate:'',historicalJournal:validateHistoricalBankJournal({
      entries:rawBankMoves.filter(entry=>entry.accountId===item.id),
      reconciliations:rawBankReconciliations.filter(entry=>entry.accountId===item.id),
      coveredSupplierIds:coveredSupplierIds.get(item.id)??[],
    },item.id)};
  });
  need(normalizeBankAccounts(bankAccounts).length===bankAccounts.length);
  // The Nov 10 app computed cash from its dedicated journal, not from the commercial records.
  // Preserve that exact history and suppress only the modern derived rows already present at conversion.
  // New actions generate new IDs and continue to affect cash normally.
  const coveredRows:string[]=[];
  for(const [prefix,entries] of [['payment',rows(data,'payments')],['supplier',supplierPayments],['purchase',migratedBuys],['expense',rows(data,'expenses')]] as [string,Row[]][]){
    for(const item of entries){
      const method=item.method??item.paymentMethod;
      if(typeof method==='string'&&cashMethod(method)){
        need(positiveId(item.id));
        coveredRows.push(prefix+'-'+item.id);
      }
    }
  }
  const entries=rows(data,'cashMovements');
  need(!coveredRows.length||Array.isArray(data.cashMovements));
  need(data.cashAccount===undefined);
  const cashAccount=entries.length||coveredRows.length?
    {...EMPTY_CASH_ACCOUNT,historicalJournal:validateHistoricalCashJournal({entries,coveredRows})}:EMPTY_CASH_ACCOUNT;
  const customerReturns=migrateHistoricalCustomerReturns(rows(data,'salesReturns'),sales,rows(data,'documents'),stock,warehouseId);
  return {...data,hamzaHistoricalMapping:1,...customerReturns,products,warehouses:[...places.values()],stockMovements:stock,
    activeWarehouseId:warehouseId(data.activeWarehouseId),customers:contacts('customers'),suppliers:contacts('suppliers'),
    sales,purchases:migratedBuys,supplierPayments,bankAccounts,cashAccount};
}
