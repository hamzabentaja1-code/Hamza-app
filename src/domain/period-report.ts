import {agendaDateKey} from './agenda';
export type DatedAmount={date:string;amount:number};
export type PeriodTotals={salesGross:number;salesReturns:number;netSales:number;purchasesGross:number;supplierReturns:number;netPurchases:number;expenses:number;operatingIndicator:number};
export type PeriodReport={fromDate:string;toDate:string;previousFromDate:string;previousToDate:string;current:PeriodTotals;previous:PeriodTotals;unparsedDates:number};
function summarize(rows:{sales:DatedAmount[];salesReturns:DatedAmount[];purchases:DatedAmount[];supplierReturns:DatedAmount[];expenses:DatedAmount[]}):PeriodTotals{
 const sum=(items:DatedAmount[])=>items.reduce((total,item)=>total+(Number.isFinite(item.amount)?item.amount:0),0);
 const salesGross=sum(rows.sales),salesReturns=sum(rows.salesReturns),purchasesGross=sum(rows.purchases),supplierReturns=sum(rows.supplierReturns),expenses=sum(rows.expenses);
 const netSales=salesGross-salesReturns,netPurchases=purchasesGross-supplierReturns;
 return {salesGross,salesReturns,netSales,purchasesGross,supplierReturns,netPurchases,expenses,operatingIndicator:netSales-netPurchases-expenses};
}
export function buildPeriodReport(input:{sales:DatedAmount[];salesReturns:DatedAmount[];purchases:DatedAmount[];supplierReturns:DatedAmount[];expenses:DatedAmount[];fromDate:string;toDate:string}):PeriodReport{
 const from=agendaDateKey(input.fromDate),to=agendaDateKey(input.toDate);
 if(!from||!to||from>to)throw new Error('فترة التقرير غير صالحة');
 const fromMs=Date.parse(from+'T00:00:00.000Z'),toMs=Date.parse(to+'T00:00:00.000Z');
 const days=Math.floor((toMs-fromMs)/86400000)+1;
 const previousTo=new Date(fromMs-86400000).toISOString().slice(0,10);
 const previousFrom=new Date(fromMs-days*86400000).toISOString().slice(0,10);
 const allRows=[...input.sales,...input.salesReturns,...input.purchases,...input.supplierReturns,...input.expenses];
 const unparsedDates=allRows.filter(row=>!agendaDateKey(row.date)).length;
 const filter=(rows:DatedAmount[],start:string,end:string)=>rows.filter(row=>{
  const key=agendaDateKey(row.date);return !!key&&key>=start&&key<=end;
 });
 const current=summarize({sales:filter(input.sales,from,to),salesReturns:filter(input.salesReturns,from,to),purchases:filter(input.purchases,from,to),supplierReturns:filter(input.supplierReturns,from,to),expenses:filter(input.expenses,from,to)});
 const previous=summarize({sales:filter(input.sales,previousFrom,previousTo),salesReturns:filter(input.salesReturns,previousFrom,previousTo),purchases:filter(input.purchases,previousFrom,previousTo),supplierReturns:filter(input.supplierReturns,previousFrom,previousTo),expenses:filter(input.expenses,previousFrom,previousTo)});
 return {fromDate:from,toDate:to,previousFromDate:previousFrom,previousToDate:previousTo,current,previous,unparsedDates};
}
