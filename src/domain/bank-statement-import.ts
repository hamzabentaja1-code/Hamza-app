import {appendBankMovement,BankMovement} from './banking';
export type ParsedStatementRow={date:string;description:string;amountCentimes:number};
export type BankStatementImportResult={movements:BankMovement[];imported:number;matched:number;skipped:number};

function parseCsvLine(line:string,delimiter:string):string[]{
 const values:string[]=[];let value='',quoted=false;
 for(let i=0;i<line.length;i++){
  const char=line[i];
  if(char==='"'&&quoted&&line[i+1]==='"'){value+='"';i++;continue;}
  if(char==='"'){quoted=!quoted;continue;}
  if(char===delimiter&&!quoted){values.push(value.trim());value='';continue;}
  value+=char;
 }
 if(quoted)throw new Error('سطر CSV يحتوي على علامة اقتباس غير مكتملة');
 values.push(value.trim());return values;
}
function normalizeDate(value:string):string{
 const raw=value.trim();
 const iso=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(iso){const date=new Date(Date.UTC(Number(iso[1]),Number(iso[2])-1,Number(iso[3])));if(date.toISOString().slice(0,10)!==raw)throw new Error('تاريخ كشف البنك غير صالح: '+raw);return date.toISOString();}
 const local=raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
 if(local){const day=Number(local[1]),month=Number(local[2]),year=Number(local[3]);const date=new Date(Date.UTC(year,month-1,day));if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)throw new Error('تاريخ كشف البنك غير صالح: '+raw);return date.toISOString();}
 throw new Error('استعمل تاريخ YYYY-MM-DD أو DD/MM/YYYY في كشف البنك');
}
export function parseBankStatementCsv(text:string):ParsedStatementRow[]{
 const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(!lines.length)throw new Error('كشف البنك فارغ');
 const delimiter=lines[0].includes(';')?';':lines[0].includes('\t')?'\t':',';
 const rows=lines.map(line=>parseCsvLine(line,delimiter));
 const header=rows[0].map(x=>x.toLowerCase());
 const dateIndex=header.findIndex(x=>['date','التاريخ','date opération'].includes(x));
 const descriptionIndex=header.findIndex(x=>['description','libellé','libelle','الوصف','البيان'].includes(x));
 const amountIndex=header.findIndex(x=>['amount','montant','المبلغ','net amount'].includes(x));
 const hasHeader=dateIndex>=0&&descriptionIndex>=0&&amountIndex>=0;
 const indexes=hasHeader?{date:dateIndex,description:descriptionIndex,amount:amountIndex}:{date:0,description:1,amount:2};
 const data=hasHeader?rows.slice(1):rows;
 if(!data.length)throw new Error('كشف البنك لا يحتوي على حركات');
 return data.map((row,index)=>{
  const date=normalizeDate(row[indexes.date]||'');
  const description=(row[indexes.description]||'').trim();
  const rawAmount=(row[indexes.amount]||'').replace(/\s/g,'');
  const comma=rawAmount.lastIndexOf(','),dot=rawAmount.lastIndexOf('.');
  const normalizedAmount=comma>=0&&dot>=0?(comma>dot?rawAmount.replace(/\./g,'').replace(',','.'):rawAmount.replace(/,/g,'')):rawAmount.replace(',','.');
  const amount=Number(normalizedAmount);
  if(!description||!Number.isFinite(amount)||amount===0)throw new Error('راجع وصف ومبلغ الحركة رقم '+(index+1));
  const amountCentimes=Math.round(Math.abs(amount)*100);
  if(!Number.isSafeInteger(amountCentimes)||amountCentimes<=0)throw new Error('مبلغ الحركة غير صالح في السطر '+(index+1));
  return {date,description,amountCentimes:amount<0?-amountCentimes:amountCentimes};
 });
}
function normalizeDescription(value:string):string{return value.trim().toLocaleLowerCase().replace(/\s+/g,' ');}
export function importBankStatement(
 existing:BankMovement[],
 accountId:string,
 text:string,
):BankStatementImportResult{
 if(!accountId.trim())throw new Error('الحساب البنكي مطلوب');
 const rows=parseBankStatementCsv(text);
 let movements=existing.slice();let imported=0,matched=0,skipped=0;
 const seen=new Map<string,number>();
 const existingCounts=new Map<string,number>();
 const movementKey=(movement:{accountId:string;date:string;kind:string;amountCentimes:number;description:string})=>[
  movement.accountId,movement.date.slice(0,10),movement.kind,movement.amountCentimes,normalizeDescription(movement.description),
 ].join('|');
 for(const movement of existing){const key=movementKey(movement);existingCounts.set(key,(existingCounts.get(key)||0)+1);}
 for(const row of rows){
  const kind=row.amountCentimes>0?'deposit':'withdrawal';
  const amountCentimes=Math.abs(row.amountCentimes);
  const key=movementKey({accountId,date:row.date,kind,amountCentimes,description:row.description});
  const availableMatches=existingCounts.get(key)||0;
  if(availableMatches>0){existingCounts.set(key,availableMatches-1);matched++;continue;}
  const occurrence=(seen.get(key)||0)+1;seen.set(key,occurrence);
  const id='statement-'+encodeURIComponent(key)+'-'+occurrence;
  if(movements.some(m=>m.id===id)){skipped++;continue;}
  const movement:BankMovement={id,accountId,kind,amountCentimes,date:row.date,description:row.description,sourceId:'bank-statement-import'};
  movements=appendBankMovement(movements,movement);imported++;
 }
 return {movements,imported,matched,skipped};
}
