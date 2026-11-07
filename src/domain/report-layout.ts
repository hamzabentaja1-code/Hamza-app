export type PeriodReportLayoutKey='summary'|'comparison'|'monthlyTrend'|'supplierComparison';
export type PeriodReportLayout=Record<PeriodReportLayoutKey,boolean>;
export const DEFAULT_PERIOD_REPORT_LAYOUT:PeriodReportLayout={summary:true,comparison:true,monthlyTrend:true,supplierComparison:true};
export function normalizePeriodReportLayout(value:unknown):PeriodReportLayout{
 if(!value||typeof value!=='object'||Array.isArray(value))return {...DEFAULT_PERIOD_REPORT_LAYOUT};
 const source=value as Record<string,unknown>;
 const summary=typeof source.summary==='boolean'?source.summary:true;
 return {
  summary,
  comparison:summary&&(typeof source.comparison==='boolean'?source.comparison:true),
  monthlyTrend:typeof source.monthlyTrend==='boolean'?source.monthlyTrend:true,
  supplierComparison:typeof source.supplierComparison==='boolean'?source.supplierComparison:true,
 };
}
export function togglePeriodReportLayout(layout:PeriodReportLayout,key:PeriodReportLayoutKey):PeriodReportLayout{
 if(key==='summary'&&layout.summary&&!layout.monthlyTrend&&!layout.supplierComparison)return layout;
 if(key!=='summary'&&layout[key]&&Object.values(layout).filter(Boolean).length===1)return layout;
 if(key==='comparison'&&!layout.summary)return layout;
 if(key==='summary')return {...layout,summary:!layout.summary,comparison:!layout.summary};
 return {...layout,[key]:!layout[key]};
}
