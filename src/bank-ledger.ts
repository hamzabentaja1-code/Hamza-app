export type BankDirection='in'|'out';
export type BankSourceType='customer_payment'|'supplier_payment';
export type BankEntry={id:string;date:string;description:string;amountCentimes:number;direction:BankDirection;reference?:string;matchedSourceType?:BankSourceType;matchedSourceId?:string};
export type BankSource={id:string;type:BankSourceType;date:string;amountCentimes:number;direction:BankDirection;reference?:string;label:string};

const validDate=(value:string)=>{
  return dateKey(value)!=='';
};
const dateKey=(value:string)=>{
  if(/^\d{4}-\d{2}-\d{2}$/.test(value)){const date=new Date(`${value}T00:00:00.000Z`);return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value?value:'';}
  const local=value.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/);
  if(!local)return '';
  const iso=`${local[3]}-${local[2].padStart(2,'0')}-${local[1].padStart(2,'0')}`;
  return validIso(iso)?iso:'';
};
const validIso=(value:string)=>{const date=new Date(`${value}T00:00:00.000Z`);return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;};

export function validateBankEntry(entry:BankEntry,existing:BankEntry[]=[]):string[]{
  const errors:string[]=[];
  if(!entry.id.trim()||existing.some(item=>item.id===entry.id))errors.push('معرف الحركة البنكية ناقص أو مستعمل');
  if(!validDate(entry.date))errors.push('تاريخ الحركة البنكية غير صالح');
  if(!entry.description.trim())errors.push('وصف الحركة البنكية إجباري');
  if(!Number.isSafeInteger(entry.amountCentimes)||entry.amountCentimes<=0)errors.push('مبلغ الحركة البنكية خاصو يكون أكبر من صفر');
  if(!['in','out'].includes(entry.direction))errors.push('اتجاه الحركة البنكية غير صالح');
  return errors;
}

export function bankBalance(entries:BankEntry[]):number{
  return entries.reduce((sum,item)=>sum+(item.direction==='in'?item.amountCentimes:-item.amountCentimes),0);
}

export function parseBankStatement(text:string,idPrefix='bank-import'):BankEntry[]{
  const rows=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const result:BankEntry[]=[];
  for(let index=0;index<rows.length;index++){
    const columns=rows[index].split(/[;\t]/).map(value=>value.trim());
    if(index===0&&/^(date|التاريخ)$/i.test(columns[0]))continue;
    const [date,description,amountText,reference]=columns;
    const amount=Number((amountText||'').replace(/\s/g,'').replace(',','.'));
    if(columns.length<3||!validDate(date)||!description||!Number.isFinite(amount)||amount===0)throw new Error('تنسيق سطر كشف البنك غير صالح؛ استعمل التاريخ؛ الوصف؛ المبلغ؛ المرجع');
    result.push({id:`${idPrefix}-${index+1}`,date,description,amountCentimes:Math.round(Math.abs(amount)*100),direction:amount>0?'in':'out',...(reference?{reference}:{})});
  }
  if(!result.length)throw new Error('ما لقيناش حركات صالحة للاستيراد');
  return result;
}

export function bankMatchCandidates(entry:BankEntry,sources:BankSource[],entries:BankEntry[]):BankSource[]{
  if(entry.matchedSourceId)return [];
  return sources.filter(source=>{
    if(source.direction!==entry.direction||source.amountCentimes!==entry.amountCentimes)return false;
    if(entries.some(item=>item.matchedSourceType===source.type&&item.matchedSourceId===source.id))return false;
    const sourceKey=dateKey(source.date),entryKey=dateKey(entry.date);
    const sourceDay=sourceKey?Date.parse(`${sourceKey}T00:00:00Z`):NaN,entryDay=entryKey?Date.parse(`${entryKey}T00:00:00Z`):NaN;
    if(!Number.isFinite(sourceDay)||!Number.isFinite(entryDay)||Math.abs(sourceDay-entryDay)>7*86400000)return false;
    return !(entry.reference&&source.reference&&entry.reference.toLowerCase()!==source.reference.toLowerCase());
  }).sort((a,b)=>Number(Boolean(b.reference))-Number(Boolean(a.reference))||a.label.localeCompare(b.label));
}

export function reconcileBankEntry(entry:BankEntry,source:BankSource,entries:BankEntry[],sources:BankSource[]):BankEntry{
  if(entry.matchedSourceId)throw new Error('الحركة البنكية مسواة من قبل');
  if(!bankMatchCandidates(entry,sources,entries).some(item=>item.id===source.id&&item.type===source.type))throw new Error('ما يمكنش مطابقة هاد الحركة مع الأداء');
  return {...entry,matchedSourceId:source.id,matchedSourceType:source.type};
}
