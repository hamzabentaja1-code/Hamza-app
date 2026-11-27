import type {StockMovement} from '../inventory';
import {parseReportDate} from '../report-filters';
type Row=Record<string,unknown>;
const positiveInt=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0;
const text=(v:unknown):v is string=>typeof v==='string'&&!!v.trim();
const invalid=():never=>{throw new Error('سجل مرتجعات الموردين القديم غير صالح. البيانات الأصلية ما تبدلاتش.');};

export type HistoricalSupplierReturn={id:number;purchaseId:number;supplierName:string;productName:string;qty:number;unitCost:number;amountCentimes:number;date:string;reason:string};

export function linkHistoricalSupplierReturns(
  returns:readonly Row[],purchases:readonly Row[],products:readonly Row[],stock:readonly StockMovement[],warehouse:(value:unknown)=>string,
):Map<number,HistoricalSupplierReturn[]>{
  const purchasesById=new Map(purchases.map(item=>[item.id,item]));
  const stockById=new Map(stock.map(item=>[item.id,item]));
  const result=new Map<number,HistoricalSupplierReturn[]>();
  const quantities=new Map<number,number>(),amounts=new Map<number,number>(),ids=new Set<number>();
  for(const row of returns){
    const purchase=purchasesById.get(row.purchaseId);
    if(!purchase||!positiveInt(row.id)||ids.has(row.id)||!positiveInt(row.purchaseId)||!positiveInt(row.qty)||!positiveInt(purchase.qty)||
       !text(row.supplierName)||row.supplierName!==purchase.supplierName||!text(row.productName)||row.productName!==purchase.productName||
       typeof row.unitCost!=='number'||!Number.isFinite(row.unitCost)||row.unitCost<0||row.unitCost!==purchase.unitCost||
       typeof row.amountCentimes!=='number'||!Number.isSafeInteger(row.amountCentimes)||row.amountCentimes!==Math.round(row.qty*row.unitCost*100)||
       !text(row.date)||!Number.isFinite(Date.parse(row.date))||typeof row.reason!=='string'||purchase.variantId!==undefined) return invalid();
    const date=parseReportDate(row.date.slice(0,10));
    const movement=stockById.get('legacy-supplier-return-'+row.id);
    const fallback=purchase.productId===undefined?products.filter(item=>item.name===purchase.productName):[];
    const product=positiveInt(purchase.productId)?purchase.productId:fallback.length===1?fallback[0].id:undefined;
    if(!date||!positiveInt(product)||!movement||movement.kind!=='return_out'||movement.productId!==String(product)||
       movement.quantity!==row.qty||movement.reference!==String(row.purchaseId)||movement.warehouseId!==warehouse(purchase.warehouseId)||
       movement.createdAt.slice(0,10)!==date||stockById.has('legacy-supplier-return-reversal-'+row.id))return invalid();
    const quantity=(quantities.get(row.purchaseId)??0)+row.qty,amount=(amounts.get(row.purchaseId)??0)+row.amountCentimes;
    if(quantity>purchase.qty||!Number.isSafeInteger(amount))return invalid();
    quantities.set(row.purchaseId,quantity);amounts.set(row.purchaseId,amount);ids.add(row.id);
    const group=result.get(row.purchaseId)??[];group.push(row as HistoricalSupplierReturn);result.set(row.purchaseId,group);
  }
  for(const purchase of purchases)if((purchase.returnedCentimes??0)!==(amounts.get(Number(purchase.id))??0))return invalid();
  return result;
}

/** The archived source is immutable even if someone later renames the current supplier. */
export function checkHistoricalSupplierReturnCopies(source:readonly Row[],purchases:readonly Row[]):void{
  const byId=new Map(source.map(item=>[item.id,item]));
  const fields=['id','purchaseId','supplierName','productName','qty','unitCost','amountCentimes','date','reason'];
  if(byId.size!==source.length)return invalid();
  for(const purchase of purchases){
    const linked=purchase.historicalSupplierReturns;
    if(linked===undefined){if((purchase.returnedCentimes??0)!==0)return invalid();continue;}
    if(!Array.isArray(linked)||!linked.length)return invalid();
    let cents=0;
    for(const item of linked){
      if(!item||typeof item!=='object'||item.purchaseId!==purchase.id||!positiveInt(item.id))return invalid();
      const original=byId.get(item.id);
      if(!original||fields.some(key=>original[key]!==item[key])||!Number.isSafeInteger(item.amountCentimes)||item.amountCentimes<0)return invalid();
      cents+=item.amountCentimes;
      byId.delete(item.id);
    }
    if(!Number.isSafeInteger(cents)||cents!==(purchase.returnedCentimes??0))return invalid();
  }
  if(byId.size)return invalid();
}
