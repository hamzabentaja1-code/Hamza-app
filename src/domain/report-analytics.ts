import {agendaDateKey} from './agenda';

export type SupplierPurchaseAmount = {date:string; supplierName:string; amount:number};
export type SupplierReturnAmount = {date:string; supplierName:string; amount:number};
export type SupplierComparisonRow = {supplierName:string; grossPurchases:number; returns:number; netPurchases:number; purchaseCount:number};
export type MonthlyTrendRow = {month:string; sales:number; salesReturns:number; purchases:number; supplierReturns:number; expenses:number};

function range(fromDate:string,toDate:string):{from:string;to:string}{
 const from=agendaDateKey(fromDate),to=agendaDateKey(toDate);
 if(!from||!to||from>to)throw new Error('فترة التقرير غير صالحة');
 return {from,to};
}
function inRange(date:string,from:string,to:string):boolean{
 const key=agendaDateKey(date);
 return !!key&&key>=from&&key<=to;
}
function validAmount(value:number):number{
 if(!Number.isFinite(value)||value<0)throw new Error('قيمة التقرير غير صالحة');
 return value;
}

export function buildSupplierPurchaseComparison(
 purchases:SupplierPurchaseAmount[],
 returns:SupplierReturnAmount[],
 fromDate:string,
 toDate:string,
):SupplierComparisonRow[]{
 const {from,to}=range(fromDate,toDate);
 const totals=new Map<string,{gross:number;returned:number;count:number}>();
 for(const purchase of purchases){
  if(!purchase.supplierName.trim())throw new Error('اسم المورد غير صالح');
  if(!inRange(purchase.date,from,to))continue;
  const row=totals.get(purchase.supplierName)||{gross:0,returned:0,count:0};
  row.gross+=validAmount(purchase.amount);row.count+=1;totals.set(purchase.supplierName,row);
 }
 for(const item of returns){
  if(!item.supplierName.trim())throw new Error('اسم المورد غير صالح');
  if(!inRange(item.date,from,to))continue;
  const row=totals.get(item.supplierName)||{gross:0,returned:0,count:0};
  row.returned+=validAmount(item.amount);totals.set(item.supplierName,row);
 }
 return [...totals.entries()].map(([supplierName,row])=>({
  supplierName,grossPurchases:row.gross,returns:row.returned,
  netPurchases:row.gross-row.returned,purchaseCount:row.count,
 })).sort((a,b)=>b.netPurchases-a.netPurchases||a.supplierName.localeCompare(b.supplierName));
}

export function buildMonthlyTrend(input:{
 sales:{date:string;amount:number}[];
 salesReturns:{date:string;amount:number}[];
 purchases:{date:string;amount:number}[];
 supplierReturns:{date:string;amount:number}[];
 expenses:{date:string;amount:number}[];
 fromDate:string;
 toDate:string;
}):MonthlyTrendRow[]{
 const {from,to}=range(input.fromDate,input.toDate);
 const months=new Map<string,MonthlyTrendRow>();
 const ensure=(month:string)=>{
  let row=months.get(month);
  if(!row){row={month,sales:0,salesReturns:0,purchases:0,supplierReturns:0,expenses:0};months.set(month,row);}
  return row;
 };
 const add=(rows:{date:string;amount:number}[],key:'sales'|'salesReturns'|'purchases'|'supplierReturns'|'expenses')=>{
  for(const item of rows){
   const date=agendaDateKey(item.date);
   if(!date||date<from||date>to)continue;
   ensure(date.slice(0,7))[key]+=validAmount(item.amount);
  }
 };
 add(input.sales,'sales');add(input.salesReturns,'salesReturns');add(input.purchases,'purchases');add(input.supplierReturns,'supplierReturns');add(input.expenses,'expenses');
 const cursor=new Date(from+'T00:00:00.000Z');
 cursor.setUTCDate(1);
 const end=new Date(to+'T00:00:00.000Z');
 end.setUTCDate(1);
 while(cursor<=end){
  const month=cursor.toISOString().slice(0,7);ensure(month);
  cursor.setUTCMonth(cursor.getUTCMonth()+1);
 }
 return [...months.values()].sort((a,b)=>a.month.localeCompare(b.month));
}
