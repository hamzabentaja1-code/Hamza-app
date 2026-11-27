export type ManualCashEntry={id:number;date:string;direction:'in'|'out';amountCentimes:number;description:string};
export type HistoricalCashEntry={id:string;date:string;kind:'opening'|'cash_in'|'cash_out';amountCentimes:number;description:string;reference?:string};
export type HistoricalCashJournal={entries:HistoricalCashEntry[];coveredRows:string[]};
export type CashAccount={openingBalanceCentimes:number;openingDate:string;manualEntries:ManualCashEntry[];historicalJournal?:HistoricalCashJournal};
export type CashRegisterRow={id:string;date:string;direction:'in'|'out';amountCentimes:number;description:string;source:'opening'|'manual'|'payment'|'supplier'|'purchase'|'expense'|'refund'|'bank_transfer'|'payroll'|'legacy'};
export const EMPTY_CASH_ACCOUNT:CashAccount={openingBalanceCentimes:0,openingDate:'',manualEntries:[]};

export const cashMethod=(method:string|undefined)=>method==='نقداً'||method==='Espèces'||method==='cash';
const cents=(amount:number|undefined)=>Number.isFinite(amount)&&Number(amount)>=0?Math.round(Number(amount)*100):0;

export const HISTORICAL_CASH_INVALID='سجل الصندوق القديم غير صالح. البيانات الأصلية ما تبدلاتش.';

export function validateHistoricalCashJournal(value:unknown):HistoricalCashJournal{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(HISTORICAL_CASH_INVALID);
  const raw=value as Partial<HistoricalCashJournal>;
  if(!Array.isArray(raw.entries)||!Array.isArray(raw.coveredRows))throw new Error(HISTORICAL_CASH_INVALID);
  const ids=new Set<string>();
  let running=0;
  for(const entry of raw.entries){
    if(!entry||typeof entry!=='object'||typeof entry.id!=='string'||!entry.id.trim()||ids.has(entry.id)||
       !['opening','cash_in','cash_out'].includes(entry.kind)||!Number.isSafeInteger(entry.amountCentimes)||entry.amountCentimes<=0||
       typeof entry.date!=='string'||!Number.isFinite(Date.parse(entry.date))||typeof entry.description!=='string'||!entry.description.trim()||
       (entry.reference!==undefined&&typeof entry.reference!=='string'))throw new Error(HISTORICAL_CASH_INVALID);
    ids.add(entry.id);
    running+=entry.kind==='cash_out'?-entry.amountCentimes:entry.amountCentimes;
    if(!Number.isSafeInteger(running)||running<0)throw new Error(HISTORICAL_CASH_INVALID);
  }
  const covered=new Set<string>();
  for(const id of raw.coveredRows){
    if(typeof id!=='string'||!/^(payment|supplier|purchase|expense)-[1-9]\d*$/.test(id)||covered.has(id))
      throw new Error(HISTORICAL_CASH_INVALID);
    covered.add(id);
  }
  return {entries:raw.entries,coveredRows:raw.coveredRows};
}

export function normalizeCashAccount(value:unknown):CashAccount {
  if(typeof value!=='object'||value===null||Array.isArray(value))return {...EMPTY_CASH_ACCOUNT,manualEntries:[]};
  const raw=value as Partial<CashAccount>;
  const manualEntries=Array.isArray(raw.manualEntries)?raw.manualEntries.filter((entry):entry is ManualCashEntry=>typeof entry==='object'&&entry!==null&&Number.isSafeInteger(entry.id)&&entry.id>0&&(entry.direction==='in'||entry.direction==='out')&&Number.isSafeInteger(entry.amountCentimes)&&entry.amountCentimes>0&&typeof entry.date==='string'&&typeof entry.description==='string'&&!!entry.description.trim()):[];
  const ids=new Set<number>();
  const uniqueEntries=manualEntries.filter(entry=>!ids.has(entry.id)&&!!ids.add(entry.id));
  return {
    openingBalanceCentimes:Number.isSafeInteger(raw.openingBalanceCentimes)&&Number(raw.openingBalanceCentimes)>=0?Number(raw.openingBalanceCentimes):0,
    openingDate:typeof raw.openingDate==='string'?raw.openingDate:'',
    manualEntries:uniqueEntries,
    ...(raw.historicalJournal===undefined?{}:{historicalJournal:validateHistoricalCashJournal(raw.historicalJournal)}),
  };
}

export function setCashOpeningBalance(account:CashAccount,amount:number,date:string):CashAccount {
  const amountCentimes=Math.round(amount*100);
  if(!Number.isFinite(amount)||amount<0||!Number.isSafeInteger(amountCentimes))throw new Error('دخل رصيد افتتاحي صحيح.');
  if(!date.trim())throw new Error('تاريخ الرصيد الافتتاحي مطلوب.');
  if(account.openingDate||account.openingBalanceCentimes>0||account.historicalJournal)throw new Error('الرصيد الافتتاحي متسجل؛ استعمل حركة داخل أو خارج للتصحيح.');
  return {...account,openingBalanceCentimes:amountCentimes,openingDate:date};
}

export function recordManualCashEntry(account:CashAccount,input:{id:number;date:string;direction:'in'|'out';amount:number;description:string},currentBalanceCentimes:number):CashAccount {
  const amountCentimes=Math.round(input.amount*100);
  if(!Number.isFinite(input.amount)||input.amount<=0||!Number.isSafeInteger(amountCentimes)||amountCentimes<=0)throw new Error('مبلغ الحركة خاصو يكون أكبر من صفر.');
  if(!Number.isSafeInteger(input.id)||input.id<=0||account.manualEntries.some(entry=>entry.id===input.id))throw new Error('معرف الحركة غير صالح أو مستعمل.');
  if(!input.date.trim()||!input.description.trim())throw new Error('دخل تاريخ ووصف الحركة.');
  if(input.direction==='out'&&amountCentimes>currentBalanceCentimes)throw new Error('المبلغ خارج الرصيد المتوفر فالصندوق.');
  return {...account,manualEntries:[{id:input.id,date:input.date,direction:input.direction,amountCentimes,description:input.description.trim()},...account.manualEntries]};
}

export type CashSources={
  payments:readonly {id:number;amount:number;method:string;date:string;customerName:string;note?:string}[];
  supplierPayments:readonly {id:number;amount:number;method:string;date:string;supplierName:string;reference?:string}[];
  purchases:readonly {id:number;paidAmount?:number;paymentMethod?:string;date:string;productName:string;supplierName:string}[];
  expenses:readonly {id:number;amount:number;paymentMethod?:string;date:string;title:string}[];
  refunds:readonly {id:number;amountCentimes:number;method:'cash';date:string;number:string;customerName:string}[];
  bankTransfers?:readonly {id:string;bankAccountId:string;date:string;direction:'cash_to_bank'|'bank_to_cash';amountCentimes:number;description:string}[];
  payrollSettlements?:readonly {id:number;technicianName:string;amountCentimes:number;method:string;date:string}[];
};
export function calculateCashBalance(account:CashAccount,sources:CashSources):number {
  return collectCashRows(account,sources).reduce((sum,row)=>sum+(row.direction==='in'?row.amountCentimes:-row.amountCentimes),0);
}
function collectCashRows(account:CashAccount,sources:CashSources):CashRegisterRow[]{
  const rows:CashRegisterRow[]=[];
  if(account.openingBalanceCentimes>0)rows.push({id:'opening',date:account.openingDate,direction:'in',amountCentimes:account.openingBalanceCentimes,description:'الرصيد الافتتاحي',source:'opening'});
  for(const item of account.manualEntries)rows.push({id:'manual-'+item.id,date:item.date,direction:item.direction,amountCentimes:item.amountCentimes,description:item.description,source:'manual'});
  for(const item of sources.payments)if(cashMethod(item.method))rows.push({id:'payment-'+item.id,date:item.date,direction:'in',amountCentimes:cents(item.amount),description:`قبض من ${item.customerName}${item.note?' • '+item.note:''}`,source:'payment'});
  for(const item of sources.supplierPayments)if(cashMethod(item.method))rows.push({id:'supplier-'+item.id,date:item.date,direction:'out',amountCentimes:cents(item.amount),description:`أداء للمورد ${item.supplierName}${item.reference?' • '+item.reference:''}`,source:'supplier'});
  for(const item of sources.purchases)if(cashMethod(item.paymentMethod)&&cents(item.paidAmount)>0)rows.push({id:'purchase-'+item.id,date:item.date,direction:'out',amountCentimes:cents(item.paidAmount),description:`شراء ${item.productName} • ${item.supplierName}`,source:'purchase'});
  for(const item of sources.expenses)if(cashMethod(item.paymentMethod))rows.push({id:'expense-'+item.id,date:item.date,direction:'out',amountCentimes:cents(item.amount),description:item.title,source:'expense'});
  for(const item of sources.refunds)if(Number.isSafeInteger(item.amountCentimes)&&item.amountCentimes>0)rows.push({id:'refund-'+item.id,date:item.date,direction:'out',amountCentimes:item.amountCentimes,description:`رد للزبون ${item.customerName} • ${item.number}`,source:'refund'});
  for(const item of sources.payrollSettlements??[])if(cashMethod(item.method))rows.push({id:'payroll-'+item.id,date:item.date,direction:'out',amountCentimes:item.amountCentimes,description:`أجرة التقني ${item.technicianName}`,source:'payroll'});
  for(const item of sources.bankTransfers??[])rows.push({id:'bank-transfer-'+item.id,date:item.date,direction:item.direction==='cash_to_bank'?'out':'in',amountCentimes:item.amountCentimes,description:`${item.direction==='cash_to_bank'?'إيداع بنكي':'سحب من البنك'} • ${item.description}`,source:'bank_transfer'});
  const history=account.historicalJournal;
  if(!history)return rows;
  const covers=new Set(history.coveredRows);
  return [
    ...history.entries.map((entry):CashRegisterRow=>({id:'legacy-cash-'+entry.id,date:entry.date,direction:entry.kind==='cash_out'?'out':'in',
      amountCentimes:entry.amountCentimes,description:entry.reference?`${entry.description} • ${entry.reference}`:entry.description,
      source:entry.kind==='opening'?'opening':'legacy'})),
    ...rows.filter(row=>!covers.has(row.id)),
  ];
}

export function buildCashRegisterRows(account:CashAccount,sources:CashSources):CashRegisterRow[]{
  const dateValue=(value:string)=>{const m=value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?new Date(Number(m[3]),Number(m[2])-1,Number(m[1])).getTime():Date.parse(value)||0;};
  return collectCashRows(account,sources).sort((a,b)=>dateValue(b.date)-dateValue(a.date)||b.id.localeCompare(a.id));
}
