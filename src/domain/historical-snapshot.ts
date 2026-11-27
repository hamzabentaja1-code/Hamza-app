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
const unsafe=['cashMovements','bankMovements','bankReconciliations','cheques','chequeEvents','supplierReturns','salesReturns',
  'productVariants','variantStockMovements','purchaseOrders','customerOrders','workTasks','workOrders','workTimeEntries','equipment','parkedPosCarts','projects'];

/** Translate only demonstrated historical shapes. With material unreconciled records, leave original data untouched. */
export function adaptHistoricalSnapshot(data:Row):Row{
  if(data.hamzaHistoricalMapping===1){need(Array.isArray(data.stockMovements));return data;}
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

  const usesCashOrBank=(row:Row)=>['نقداً','تحويل','بطاقة','cash','card','transfer','Espèces'].includes(String(row.method??row.paymentMethod))||text(row.bankAccountId);
  need(!rows(data,'payments').some(usesCashOrBank)&&!rows(data,'expenses').some(usesCashOrBank));
  const matches=new Map<number,Row>();
  const purchases=rows(data,'purchases');
  for(const buy of purchases){
    if(!positiveId(buy.id)||matches.has(buy.id)||!text(buy.supplierName)||!integer(money(buy.total))||
       (buy.returnedCentimes!==undefined&&buy.returnedCentimes!==0))throw new Error(HISTORICAL_REVIEW);
    matches.set(buy.id,buy);
  }
  const paymentIds=new Set<number>();
  const linkedPaid=new Map<number,number>();
  const supplierPayments=rows(data,'supplierPayments').map(payment=>{
    const buy=positiveId(payment.purchaseId)?matches.get(payment.purchaseId):undefined;
    if(!buy||!positiveId(payment.id)||paymentIds.has(payment.id)||!positiveId(payment.amountCentimes)||payment.amount!==undefined||
       !text(payment.date)||buy.supplierName!==payment.supplierName||payment.method!=='شيك'||text(payment.bankAccountId))throw new Error(HISTORICAL_REVIEW);
    // Old cash and transfers additionally changed the standalone cash/bank ledgers; do not re-count without reconciling.
    paymentIds.add(payment.id);
    linkedPaid.set(buy.id as number,(linkedPaid.get(buy.id as number)??0)+payment.amountCentimes);
    return {...payment,amount:payment.amountCentimes/100,reference:payment.reference??payment.note};
  });
  const migratedBuys=purchases.map(buy=>{
    const paid=buy.paidCentimes??0,total=money(buy.total),linked=linkedPaid.get(buy.id as number)??0;
    if(!integer(paid)||!integer(linked)||paid<linked||paid>total||buy.paidAmount!==undefined)throw new Error(HISTORICAL_REVIEW);
    return {...buy,warehouseId:warehouseId(buy.warehouseId),productId:positiveId(buy.productId)?String(buy.productId):buy.productId,paidAmount:(paid-linked)/100};
  });
  const contacts=(key:string)=>rows(data,key).map(item=>({...item,ifNumber:item.ifNumber??item.taxId,paymentDelayDays:item.paymentDelayDays??item.paymentTermsDays}));
  const sales=rows(data,'sales').map(item=>({...item,warehouseId:warehouseId(item.warehouseId),unitCost:item.unitCost??item.costPrice}));
  need(!rows(data,'bankAccounts').some(item=>item.openingBalanceCentimes!==undefined&&item.openingBalanceCentimes!==0));
  const bankAccounts=rows(data,'bankAccounts').map(item=>({...item,openingBalanceCentimes:0,openingDate:''}));
  return {...data,hamzaHistoricalMapping:1,products,warehouses:[...places.values()],stockMovements:stock,
    activeWarehouseId:warehouseId(data.activeWarehouseId),customers:contacts('customers'),suppliers:contacts('suppliers'),
    sales,purchases:migratedBuys,supplierPayments,bankAccounts};
}
