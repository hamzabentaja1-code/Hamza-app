function parseDate(value:string):Date|null {
  const input=value.trim();
  let year:number,month:number,day:number;
  const iso=input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const local=input.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if(iso){year=Number(iso[1]);month=Number(iso[2]);day=Number(iso[3]);}
  else if(local){day=Number(local[1]);month=Number(local[2]);year=Number(local[3]);}
  else return null;
  const result=new Date(Date.UTC(year,month-1,day));
  if(result.getUTCFullYear()!==year||result.getUTCMonth()!==month-1||result.getUTCDate()!==day)return null;
  return result;
}

export function calculateDueDate(issueDate:string,paymentDelayDays?:number):string|null {
  if(paymentDelayDays===undefined)return null;
  if(!Number.isInteger(paymentDelayDays)||paymentDelayDays<0||paymentDelayDays>3650)throw new Error('أجل الأداء غير صالح');
  const issue=parseDate(issueDate);
  if(!issue)return null;
  issue.setUTCDate(issue.getUTCDate()+paymentDelayDays);
  return issue.toISOString().slice(0,10);
}

export function isPastDue(dueDate:string,today:string):boolean {
  const due=parseDate(dueDate),current=parseDate(today);
  if(!due||!current)throw new Error('تاريخ الاستحقاق غير صالح');
  return due.getTime()<current.getTime();
}
