import {parseReportDate} from '../report-filters';

type Row=Record<string,unknown>;
export type HistoricalBankEntry={id:string;kind:string;date:string;amountCentimes:number;description:string;sourceId?:string;transferId?:string};
export type HistoricalBankReconciliation={id:string;date:string;bookBalanceCentimes:number;statementBalanceCentimes:number;differenceCentimes:number;note?:string};
export type HistoricalBankJournal={entries:HistoricalBankEntry[];reconciliations:HistoricalBankReconciliation[];coveredSupplierIds:number[]};
export const HISTORICAL_BANK_INVALID='سجل البنك القديم غير صالح. البيانات الأصلية ما تبدلاتش.';
const invalid=():never=>{throw new Error(HISTORICAL_BANK_INVALID);};
const row=(v:unknown):v is Row=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0;
const integer=(v:unknown):v is number=>Number.isSafeInteger(v);
export const bankCalendarDate=(v:string)=>parseReportDate(v)??(/^\d{4}-\d{2}-\d{2}T/.test(v)&&Number.isFinite(Date.parse(v))?parseReportDate(v.slice(0,10)):undefined);
const incoming=new Set(['opening','deposit','pos_card','pos_transfer','customer_payment','bank_transfer_in','cash_transfer_in','adjustment_in']);
const outgoing=new Set(['withdrawal','supplier_payment','bank_transfer_out','cash_transfer_out','adjustment_out']);
export const historicalBankAmount=(entry:HistoricalBankEntry)=>incoming.has(entry.kind)?entry.amountCentimes:-entry.amountCentimes;

export function validateHistoricalBankJournal(value:unknown,accountId:string):HistoricalBankJournal{
  if(!row(value)||!Array.isArray(value.entries)||!Array.isArray(value.reconciliations)||!Array.isArray(value.coveredSupplierIds))return invalid();
  const entries:HistoricalBankEntry[]=[],reconciliations:HistoricalBankReconciliation[]=[],coveredSupplierIds:number[]=[];
  const ids=new Set<string>(),reconciliationIds=new Set<string>(),covered=new Set<number>();
  let running=0;
  for(const entry of value.entries){
    if(!row(entry)||!text(entry.id)||ids.has(entry.id)||entry.accountId!==accountId||!text(entry.kind)||
       !(incoming.has(entry.kind)||outgoing.has(entry.kind))||!text(entry.date)||!bankCalendarDate(entry.date)||
       !text(entry.description)||!integer(entry.amountCentimes)||entry.amountCentimes<=0||
       (entry.transferId!==undefined&&!text(entry.transferId))||(entry.sourceId!==undefined&&!text(entry.sourceId)))return invalid();
    const item=entry as HistoricalBankEntry;
    ids.add(item.id);
    running+=historicalBankAmount(item);
    if(!integer(running)||running<0)return invalid();
    entries.push(item);
  }
  const byId=new Map(entries.map(entry=>[entry.id,entry]));
  for(const entry of value.reconciliations){
    if(!row(entry)||!text(entry.id)||reconciliationIds.has(entry.id)||entry.accountId!==accountId||
       !text(entry.date)||!bankCalendarDate(entry.date)||!integer(entry.bookBalanceCentimes)||entry.bookBalanceCentimes<0||
       !integer(entry.statementBalanceCentimes)||entry.statementBalanceCentimes<0||
       entry.differenceCentimes!==entry.statementBalanceCentimes-entry.bookBalanceCentimes||
       (entry.note!==undefined&&typeof entry.note!=='string'))return invalid();
    // A nonzero historical difference was itself posted once as a signed adjustment.
    const movement=byId.get('reconcile-'+entry.id);
    if(entry.differenceCentimes!==0&&(!movement||movement.sourceId!==entry.id||
       movement.kind!==(Number(entry.differenceCentimes)>0?'adjustment_in':'adjustment_out')||
       movement.date!==entry.date||historicalBankAmount(movement)!==entry.differenceCentimes))return invalid();
    reconciliationIds.add(entry.id);
    reconciliations.push(entry as HistoricalBankReconciliation);
  }
  for(const id of value.coveredSupplierIds){
    if(!integer(id)||id<=0||covered.has(id))return invalid();
    covered.add(id);coveredSupplierIds.push(id);
  }
  return {entries,reconciliations,coveredSupplierIds};
}

export function verifyHistoricalBankTransfers(bank:readonly Row[],cash:readonly Row[]){
  const cashById=new Map(cash.map(item=>[item.id,item]));
  const paired=new Map<string,Row[]>();
  const usedCash=new Set<Row>();
  for(const entry of bank){
    const transfer=entry.transferId;
    if(entry.kind==='cash_transfer_in'||entry.kind==='cash_transfer_out'){
      if(!text(transfer)||entry.id!==transfer+'-bank'||entry.sourceId!==transfer)return invalid();
      const counter=cashById.get(transfer+'-cash');
      if(!counter||usedCash.has(counter)||counter.reference!==transfer||counter.amountCentimes!==entry.amountCentimes||
         counter.date!==entry.date||counter.kind!==(entry.kind==='cash_transfer_in'?'cash_out':'cash_in'))return invalid();
      usedCash.add(counter);
    }else if(entry.kind==='bank_transfer_in'||entry.kind==='bank_transfer_out'){
      if(!text(transfer)||entry.sourceId!==transfer)return invalid();
      const pair=paired.get(transfer)??[];pair.push(entry);paired.set(transfer,pair);
    }else if(transfer!==undefined)return invalid();
  }
  // Old IDs for cash/bank transfers start with this stable prefix.
  for(const item of cash)if(typeof item.id==='string'&&/^cash-bank-.*-cash$/.test(item.id)&&!usedCash.has(item))return invalid();
  for(const [id,pair] of paired){
    const out=pair.find(item=>item.kind==='bank_transfer_out'),into=pair.find(item=>item.kind==='bank_transfer_in');
    if(pair.length!==2||!out||!into||out.id!==id+'-out'||into.id!==id+'-in'||out.accountId===into.accountId||
       out.date!==into.date||out.amountCentimes!==into.amountCentimes)return invalid();
  }
}
