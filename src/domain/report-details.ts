import {escapePdfHtml} from '../pdf-document';
import {matchesReportSearch,parseReportDate} from '../report-filters';
import {signedQuantity,type StockMovement} from '../inventory';
import type {CashRegisterRow} from './cash-register';
import type {AppLanguage} from '../i18n';
import type {CsvCell} from './csv-export';

export type DetailReport = {
  title:string;
  context:string;
  headers:string[];
  rows:CsvCell[][];
  summary:readonly [label:string,value:CsvCell][];
};
export function orderDatedReport<T extends {date:string}>(items:readonly T[]):T[]{
  return items.map(item=>({item,date:parseReportDate(item.date)||''}))
    .sort((a,b)=>b.date.localeCompare(a.date)).map(row=>row.item);
}
export function moneyReportTotal(amounts:readonly number[]):number{
  return amounts.reduce((total,value)=>total+Math.round(value*100),0)/100;
}
export function selectOpenBalances<T>(items:readonly T[],query:string,name:(item:T)=>string,outstanding:(item:T)=>number):T[]{
  return items.filter(item=>outstanding(item)>0&&matchesReportSearch(query,name(item)));
}
export function buildCashDetail(rows:readonly CashRegisterRow[],direction:'all'|'in'|'out'){
  return orderDatedReport(rows.filter(row=>direction==='all'||row.direction===direction))
    .map(row=>({...row,signedCentimes:row.direction==='in'?row.amountCentimes:-row.amountCentimes}));
}
export function buildStockDetail<T extends StockMovement & {date:string}>(moves:readonly T[],warehouseId:string){
  return orderDatedReport(moves.filter(move=>!warehouseId||move.warehouseId===warehouseId))
    .map(move=>({...move,signedQuantity:signedQuantity(move)}));
}

/** Printable details share the data table used for CSV/XLSX; user text is never interpreted as HTML. */
export function buildDetailReportHtml(language:AppLanguage,company:string,report:DetailReport,emptyLabel:string):string{
  const cell=(value:CsvCell)=>escapePdfHtml(value==null?'':String(value));
  const dir=language==='AR'?'rtl':'ltr';
  const empty=report.rows.length?'':`<p>${cell(emptyLabel)}</p>`;
  const summary=report.summary.map(([label,value])=>`<li><strong>${cell(label)}:</strong> <bdi>${cell(value)}</bdi></li>`).join('');
  const headers=report.headers.map(value=>`<th dir="auto">${cell(value)}</th>`).join('');
  const rows=report.rows.map(row=>`<tr>${row.map(value=>`<td dir="${typeof value==='number'?'ltr':'auto'}">${cell(value)}</td>`).join('')}</tr>`).join('');
  return `<!doctype html><html lang="${language==='AR'?'ar':'fr'}" dir="${dir}"><head><meta charset="utf-8"><style>
    @page{margin:12mm}body{color:#222;font:12px Arial,sans-serif}h1,h2{color:#795714}
    table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tr{break-inside:avoid}
    td,th{padding:5px;border:1px solid #c9c3b8;vertical-align:top;overflow-wrap:anywhere}th{background:#f1ebdf}
  </style></head><body><h1>${cell(company.trim()||'HamZa')}</h1><h2>${cell(report.title)}</h2><p dir="auto">${cell(report.context)}</p><ul>${summary}</ul><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>${empty}</body></html>`;
}
