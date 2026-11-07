export type PeriodReportLayoutKey='summary'|'comparison'|'monthlyTrend'|'supplierComparison';
export type PeriodReportLayout=Record<PeriodReportLayoutKey,boolean>;
export const DEFAULT_PERIOD_REPORT_LAYOUT:PeriodReportLayout={summary:true,comparison:true,monthlyTrend:true,supplierComparison:true};
export function normalizePeriodReportLayout(value:unknown):PeriodReportLayout{
 if(!value||typeof value!=='object'||Array.isArray(value))return {...DEFAULT_PERIOD_REPORT_LAYOUT};
 const source=value as Record<string,unknown>;
 return {
  summary:typeof source.summary==='boolean'?source.summary:true,
  comparison:typeof source.comparison==='boolean'?source.comparison:true,
  monthlyTrend:typeof source.monthlyTrend==='boolean'?source.monthlyTrend:true,
  supplierComparison:typeof source.supplierComparison==='boolean'?source.supplierComparison:true,
 };
}
export function togglePeriodReportLayout(layout:PeriodReportLayout,key:PeriodReportLayoutKey):PeriodReportLayout{
 if(layout[key]&&Object.values(layout).filter(Boolean).length===1)return layout;
 if(key==='comparison'&&!layout.summary)return layout;
 return {...layout,[key]:!layout[key]};
}
