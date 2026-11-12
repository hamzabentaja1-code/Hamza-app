export type BankAccount={id:string;name:string;openingBalanceCentimes:number;openingDate:string};
export type BankTransfer={id:string;bankAccountId:string;date:string;direction:'cash_to_bank'|'bank_to_cash';amountCentimes:number;description:string};
export type LinkedBankPayment={id:number|string;bankAccountId?:string;method:string;amount:number;date:string;customerName?:string;supplierName?:string;reference?:string};
export type BankStatementLine={id:string;bankAccountId:string;date:string;description:string;amountCentimes:number;reportedBalanceCentimes?:number};
export type BankLedgerEntry={id:string;bankAccountId:string;date:string;amountCentimes:number};
export type BankStatementMatch={lineId:string;status:'matched'|'unmatched'|'ambiguous';ledgerEntryId?:string};
export type BankReconciliationRecord={id:string;bankAccountId:string;createdAt:string;fromDate:string;toDate:string;reportedBalanceCentimes:number;expectedBalanceCentimes:number;differenceCentimes:number;matched:number;confirmed:number;unmatched:number;ambiguous:number};

export function normalizeBankReconciliationHistory(value:unknown,accounts:readonly BankAccount[]):BankReconciliationRecord[]{
  if(!Array.isArray(value))return [];
  const accountIds=new Set(accounts.map(account=>account.id)),ids=new Set<string>();
  return value.flatMap(item=>{if(typeof item!=='object'||item===null)return [];const record=item as Partial<BankReconciliationRecord>;if(typeof record.id!=='string'||!record.id||ids.has(record.id)||typeof record.bankAccountId!=='string'||!accountIds.has(record.bankAccountId)||typeof record.createdAt!=='string'||typeof record.fromDate!=='string'||typeof record.toDate!=='string'||![record.reportedBalanceCentimes,record.expectedBalanceCentimes,record.differenceCentimes,record.matched,record.confirmed,record.unmatched,record.ambiguous].every(Number.isSafeInteger)||![record.matched,record.confirmed,record.unmatched,record.ambiguous].every(value=>Number(value)>=0)||Number(record.confirmed)>Number(record.matched))return [];ids.add(record.id);return [record as BankReconciliationRecord];});
}

export function normalizeBankStatementLines(value:unknown,accounts:readonly BankAccount[]):BankStatementLine[]{
  if(!Array.isArray(value))return [];
  const accountIds=new Set(accounts.map(item=>item.id)),ids=new Set<string>();
  return value.flatMap(item=>{
    if(typeof item!=='object'||item===null)return [];
    const line=item as Partial<BankStatementLine>;
    if(typeof line.id!=='string'||!line.id.trim()||ids.has(line.id)||typeof line.bankAccountId!=='string'||!accountIds.has(line.bankAccountId)||typeof line.date!=='string'||!normalizeBankDate(line.date)||typeof line.description!=='string'||!Number.isSafeInteger(line.amountCentimes)||Number(line.amountCentimes)===0||(line.reportedBalanceCentimes!==undefined&&!Number.isSafeInteger(line.reportedBalanceCentimes)))return [];
    ids.add(line.id);
    return [{id:line.id,bankAccountId:line.bankAccountId,date:normalizeBankDate(line.date)!,description:line.description.trim(),amountCentimes:Number(line.amountCentimes),...(line.reportedBalanceCentimes!==undefined?{reportedBalanceCentimes:Number(line.reportedBalanceCentimes)}:{})}];
  });
}

function splitCsvRow(line:string,delimiter:string):string[]{
  const cells:string[]=[];let cell='',quoted=false;
  for(let i=0;i<line.length;i++){
    const char=line[i];
    if(char==='"'&&quoted&&line[i+1]==='"'){cell+='"';i++;continue;}
    if(char==='"'){quoted=!quoted;continue;}
    if(char===delimiter&&!quoted){cells.push(cell.trim());cell='';continue;}
    cell+=char;
  }
  cells.push(cell.trim());return cells;
}

function normalizeBankDate(value:string):string|undefined{
  const raw=value.trim();let match=raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if(match){const [,year,month,day]=match;return validDateParts(Number(year),Number(month),Number(day))?`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`:undefined;}
  match=raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if(match){const [,day,month,year]=match;return validDateParts(Number(year),Number(month),Number(day))?`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`:undefined;}
  return undefined;
}

function validDateParts(year:number,month:number,day:number):boolean{
  const date=new Date(Date.UTC(year,month-1,day));return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
}

function parseStatementMoney(value:string):number|undefined{
  let raw=value.trim().replace(/[\s\u00a0]/g,'').replace(/(?:MAD|DH|د\.م\.?)/gi,'');
  if(!raw)return undefined;
  let negative=false;if(/^\(.*\)$/.test(raw)){negative=true;raw=raw.slice(1,-1);}if(raw.startsWith('-')){negative=true;raw=raw.slice(1);}if(raw.startsWith('+'))raw=raw.slice(1);
  const comma=raw.lastIndexOf(','),dot=raw.lastIndexOf('.');
  if(comma>=0&&dot>=0){const decimal=Math.max(comma,dot);raw=raw.slice(0,decimal).replace(/[.,]/g,'')+'.'+raw.slice(decimal+1);}
  else if(comma>=0){const digits=raw.length-comma-1;raw=digits===2?raw.replace(/\./g,'').replace(',','.'):raw.replace(/,/g,'');}
  else if(dot>=0&&raw.length-dot-1!==2){raw=raw.replace(/\./g,'');}
  if(!/^\d+(?:\.\d{1,2})?$/.test(raw))return undefined;
  const valueNumber=Number(raw),centimes=Math.round(valueNumber*100);if(!Number.isSafeInteger(centimes))return undefined;return negative?-centimes:centimes;
}

function bankHeader(value:string):string{
  return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\s_\-]/g,'');
}

export function parseBankStatementCsv(text:string,bankAccountId:string,existing:readonly BankStatementLine[]=[]):{lines:BankStatementLine[];rejected:number;errors:string[]}{
  const source=text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(row=>row.trim());
  if(source.length<2)return {lines:[],rejected:0,errors:['كشف البنك خاصو يحتوي على العناوين وسطر واحد على الأقل.']};
  const first=source[0];let commas=0,semicolons=0,quoted=false;
  for(let i=0;i<first.length;i++){if(first[i]==='"')quoted=!quoted;else if(!quoted&&first[i]===',')commas++;else if(!quoted&&first[i]===';')semicolons++;}
  const delimiter=semicolons>commas?';':',';
  let headerIndex=-1,headers:string[]=[];
  for(let i=0;i<Math.min(source.length,8);i++){
    const cells=splitCsvRow(source[i],delimiter).map(bankHeader);
    const hasDate=cells.some(value=>['date','التاريخ','التاريخ'].includes(value)||value.includes('date'));
    const hasAmount=cells.some(value=>['amount','montant','المبلغ','مبلغ'].includes(value));
    const hasDebit=cells.some(value=>value==='مدين'||value.startsWith('debit'));
    const hasCredit=cells.some(value=>value==='دائن'||value.startsWith('credit'));
    if(hasDate&&(hasAmount||(hasDebit&&hasCredit))){headerIndex=i;headers=cells;break;}
  }
  if(headerIndex<0)return {lines:[],rejected:0,errors:['ما لقيناش عناوين التاريخ والمبلغ أو المدين والدائن.']};
  const dateIndex=headers.findIndex(value=>value.includes('date')||value==='التاريخ');
  const descIndex=headers.findIndex(value=>['description','libelle','label','details','البيان','الوصف','التفاصيل'].includes(value));
  const amountIndex=headers.findIndex(value=>['amount','montant','المبلغ','مبلغ'].includes(value));
  const debitIndex=headers.findIndex(value=>value==='مدين'||value.startsWith('debit'));
  const creditIndex=headers.findIndex(value=>value==='دائن'||value.startsWith('credit'));
  const balanceIndex=headers.findIndex(value=>value.startsWith('balance')||value.startsWith('solde')||value==='الرصيد'||value==='رصيد');
  const existingKeys=new Set(existing.map(line=>`${line.bankAccountId}|${normalizeBankDate(line.date)}|${line.description.toLocaleLowerCase()}|${line.amountCentimes}`));
  const ids=new Set(existing.map(line=>line.id)),lines:BankStatementLine[]=[],errors:string[]=[];let rejected=0;
  for(let rowIndex=headerIndex+1;rowIndex<source.length;rowIndex++){
    const cells=splitCsvRow(source[rowIndex],delimiter),date=normalizeBankDate(cells[dateIndex]||'');
    const description=descIndex>=0?(cells[descIndex]||'').trim():'';
    let amount:number|undefined;
    if(amountIndex>=0)amount=parseStatementMoney(cells[amountIndex]||'');
    else {const debit=parseStatementMoney(cells[debitIndex]||'')??0,credit=parseStatementMoney(cells[creditIndex]||'')??0;if(debit>=0&&credit>=0&&!(debit>0&&credit>0))amount=credit-debit;}
    const balance=balanceIndex>=0?parseStatementMoney(cells[balanceIndex]||''):undefined;
    if(!date||amount===undefined||amount===0){rejected++;if(errors.length<5)errors.push(`السطر ${rowIndex+1}: تاريخ أو مبلغ غير صالح.`);continue;}
    const key=`${bankAccountId}|${date}|${description.toLocaleLowerCase()}|${amount}`;
    if(existingKeys.has(key)){rejected++;if(errors.length<5)errors.push(`السطر ${rowIndex+1}: حركة مكررة ومستوردة من قبل.`);continue;}
    let id=`statement-${bankAccountId}-${date}-${rowIndex}-${amount}`;while(ids.has(id))id+='_';ids.add(id);existingKeys.add(key);
    lines.push({id,bankAccountId,date,description,amountCentimes:amount,...(balance!==undefined?{reportedBalanceCentimes:balance}:{})});
  }
  return {lines,rejected,errors};
}

export function matchBankStatementLines(lines:readonly BankStatementLine[],entries:readonly BankLedgerEntry[]):BankStatementMatch[]{
  const used=new Set<string>();
  return lines.map(line=>{
    const date=normalizeBankDate(line.date);
    const candidates=entries.filter(entry=>entry.bankAccountId===line.bankAccountId&&normalizeBankDate(entry.date)===date&&entry.amountCentimes===line.amountCentimes&&!used.has(entry.id));
    if(candidates.length===1){used.add(candidates[0].id);return {lineId:line.id,status:'matched',ledgerEntryId:candidates[0].id};}
    return {lineId:line.id,status:candidates.length?'ambiguous':'unmatched'};
  });
}

export function reconcileBankStatement(account:BankAccount,lines:readonly BankStatementLine[],entries:readonly BankLedgerEntry[],matches:readonly BankStatementMatch[]){
  const accountLines=lines.filter(line=>line.bankAccountId===account.id).sort((a,b)=>a.date.localeCompare(b.date));
  const closingLine=[...accountLines].reverse().find(line=>line.reportedBalanceCentimes!==undefined);
  const endDate=closingLine?.date||accountLines[accountLines.length-1]?.date;
  const expectedBalanceCentimes=account.openingBalanceCentimes+entries.filter(entry=>entry.bankAccountId===account.id&&(!endDate||entry.date<=endDate)).reduce((sum,entry)=>sum+entry.amountCentimes,0);
  const counts=matches.filter(match=>accountLines.some(line=>line.id===match.lineId)).reduce((result,match)=>{result[match.status]++;return result;},{matched:0,unmatched:0,ambiguous:0});
  return {lineCount:accountLines.length,matched:counts.matched,unmatched:counts.unmatched,ambiguous:counts.ambiguous,reportedBalanceCentimes:closingLine?.reportedBalanceCentimes,expectedBalanceCentimes,differenceCentimes:closingLine?.reportedBalanceCentimes===undefined?undefined:closingLine.reportedBalanceCentimes-expectedBalanceCentimes};
}

export function normalizeBankAccounts(value:unknown):BankAccount[]{
  if(!Array.isArray(value))return [];
  const ids=new Set<string>(),names=new Set<string>();
  return value.flatMap(item=>{
    if(typeof item!=='object'||item===null)return [];
    const account=item as Partial<BankAccount>;
    const id=typeof account.id==='string'?account.id.trim():'';
    const name=typeof account.name==='string'?account.name.trim():'';
    if(!id||!name||ids.has(id)||names.has(name.toLocaleLowerCase())||!Number.isSafeInteger(account.openingBalanceCentimes)||Number(account.openingBalanceCentimes)<0||typeof account.openingDate!=='string')return [];
    ids.add(id);names.add(name.toLocaleLowerCase());
    return [{id,name,openingBalanceCentimes:Number(account.openingBalanceCentimes),openingDate:account.openingDate}];
  });
}

export function normalizeBankTransfers(value:unknown,accounts:readonly BankAccount[]):BankTransfer[]{
  if(!Array.isArray(value))return [];
  const accountIds=new Set(accounts.map(account=>account.id)),ids=new Set<string>();
  return value.flatMap(item=>{
    if(typeof item!=='object'||item===null)return [];
    const transfer=item as Partial<BankTransfer>;
    const id=typeof transfer.id==='string'?transfer.id.trim():'';
    const description=typeof transfer.description==='string'?transfer.description.trim():'';
    if(!id||ids.has(id)||typeof transfer.bankAccountId!=='string'||!accountIds.has(transfer.bankAccountId)||typeof transfer.date!=='string'||!transfer.date.trim()||(transfer.direction!=='cash_to_bank'&&transfer.direction!=='bank_to_cash')||!Number.isSafeInteger(transfer.amountCentimes)||Number(transfer.amountCentimes)<=0||!description)return [];
    ids.add(id);
    return [{id,bankAccountId:transfer.bankAccountId,date:transfer.date,direction:transfer.direction,amountCentimes:Number(transfer.amountCentimes),description}];
  });
}

export function createBankAccount(input:{id:string;name:string;openingBalance:number;openingDate:string},accounts:readonly BankAccount[]):BankAccount{
  const id=input.id.trim(),name=input.name.trim(),amount=Math.round(input.openingBalance*100);
  if(!id||accounts.some(account=>account.id===id))throw new Error('معرف الحساب البنكي غير صالح أو مستعمل.');
  if(!name||accounts.some(account=>account.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new Error('اسم الحساب البنكي مطلوب وما خاصوش يكون مكرر.');
  if(!Number.isFinite(input.openingBalance)||input.openingBalance<0||!Number.isSafeInteger(amount))throw new Error('الرصيد الافتتاحي البنكي غير صالح.');
  if(!input.openingDate.trim())throw new Error('تاريخ الرصيد البنكي مطلوب.');
  return {id,name,openingBalanceCentimes:amount,openingDate:input.openingDate};
}

export function renameBankAccount(accounts:readonly BankAccount[],accountId:string,nameValue:string):BankAccount[]{
  const name=nameValue.trim(),account=accounts.find(item=>item.id===accountId);
  if(!account)throw new Error('اختار حساب بنكي موجود.');
  if(!name||accounts.some(item=>item.id!==accountId&&item.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new Error('اسم الحساب البنكي مطلوب وما خاصوش يكون مكرر.');
  return accounts.map(item=>item.id===accountId?{...item,name}:item);
}

export function deleteBankAccount(accounts:readonly BankAccount[],transfers:readonly BankTransfer[],accountId:string,linkedPayments:readonly LinkedBankPayment[]=[]):BankAccount[]{
  if(!accounts.some(item=>item.id===accountId))throw new Error('اختار حساب بنكي موجود.');
  if(transfers.some(item=>item.bankAccountId===accountId)||linkedPayments.some(item=>item.bankAccountId===accountId))throw new Error('ما يمكنش تحذف حساب مرتبط بحركات مالية محفوظة.');
  return accounts.filter(item=>item.id!==accountId);
}

const bankMethod=(method:string)=>method==='تحويل'||method==='بطاقة'||method==='transfer'||method==='card';
export function calculateBankBalance(account:BankAccount,transfers:readonly BankTransfer[],customerPayments:readonly LinkedBankPayment[]=[],supplierPayments:readonly LinkedBankPayment[]=[],otherOutflows:readonly LinkedBankPayment[]=[]):number{
  const customerIn=customerPayments.filter(item=>item.bankAccountId===account.id&&bankMethod(item.method)).reduce((sum,item)=>sum+(Number.isFinite(item.amount)&&item.amount>0?Math.round(item.amount*100):0),0);
  const supplierOut=supplierPayments.filter(item=>item.bankAccountId===account.id&&item.method==='تحويل').reduce((sum,item)=>sum+(Number.isFinite(item.amount)&&item.amount>0?Math.round(item.amount*100):0),0);
  const otherOut=otherOutflows.filter(item=>item.bankAccountId===account.id&&bankMethod(item.method)).reduce((sum,item)=>sum+(Number.isFinite(item.amount)&&item.amount>0?Math.round(item.amount*100):0),0);
  return account.openingBalanceCentimes+customerIn-supplierOut-otherOut+transfers.filter(item=>item.bankAccountId===account.id).reduce((sum,item)=>sum+(item.direction==='cash_to_bank'?item.amountCentimes:-item.amountCentimes),0);
}

export function recordBankTransfer(input:{id:string;bankAccountId:string;date:string;direction:BankTransfer['direction'];amount:number;description:string},accounts:readonly BankAccount[],transfers:readonly BankTransfer[],cashBalanceCentimes:number,customerPayments:readonly LinkedBankPayment[]=[],supplierPayments:readonly LinkedBankPayment[]=[],otherOutflows:readonly LinkedBankPayment[]=[]):BankTransfer{
  const account=accounts.find(item=>item.id===input.bankAccountId);
  if(!account)throw new Error('اختار حساب بنكي موجود.');
  if(!input.id.trim()||transfers.some(item=>item.id===input.id))throw new Error('معرف التحويل غير صالح أو مستعمل.');
  if(!input.date.trim()||!input.description.trim())throw new Error('دخل تاريخ ووصف التحويل.');
  const amountCentimes=Math.round(input.amount*100);
  if(!Number.isFinite(input.amount)||input.amount<=0||!Number.isSafeInteger(amountCentimes)||amountCentimes<=0)throw new Error('مبلغ التحويل خاصو يكون أكبر من صفر.');
  if(input.direction==='cash_to_bank'&&amountCentimes>cashBalanceCentimes)throw new Error('المبلغ أكبر من رصيد الصندوق المتوفر.');
  if(input.direction==='bank_to_cash'&&amountCentimes>calculateBankBalance(account,transfers,customerPayments,supplierPayments,otherOutflows))throw new Error('المبلغ أكبر من رصيد الحساب البنكي المتوفر.');
  return {id:input.id.trim(),bankAccountId:account.id,date:input.date,direction:input.direction,amountCentimes,description:input.description.trim()};
}
