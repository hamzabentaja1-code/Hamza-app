export type DatedRecord = {date:string};

function iso(value:string):string|undefined{
  const trimmed=value.trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(trimmed)){
    const [year,month,day]=trimmed.split('-').map(Number);
    const date=new Date(Date.UTC(year,month-1,day));
    if(date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day)return trimmed;
    return undefined;
  }
  const match=trimmed.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if(!match)return undefined;
  const [,dayText,monthText,yearText]=match;
  const year=Number(yearText),month=Number(monthText),day=Number(dayText);
  const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day
    ? `${yearText}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    : undefined;
}

export function validateDateRange(from:string,to:string):string[]{
  const errors:string[]=[];
  const start=from.trim()?iso(from):undefined;
  const end=to.trim()?iso(to):undefined;
  if(from.trim()&&!start)errors.push('تاريخ البداية غير صالح');
  if(to.trim()&&!end)errors.push('تاريخ النهاية غير صالح');
  if(start&&end&&start>end)errors.push('تاريخ البداية خاصو يكون قبل تاريخ النهاية');
  return errors;
}

export function filterByDateRange<T extends DatedRecord>(records:T[],from:string,to:string):T[]{
  const errors=validateDateRange(from,to);
  if(errors.length)throw new Error(errors[0]);
  const start=from.trim()?iso(from)!:undefined;
  const end=to.trim()?iso(to)!:undefined;
  return records.filter(record=>{
    const date=iso(record.date);
    if(!date)return false;
    return (!start||date>=start)&&(!end||date<=end);
  });
}
