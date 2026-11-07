export type RecurrenceFrequency='weekly'|'monthly'|'yearly';
export type RecurringExpenseRule={id:string;title:string;amount:number;category?:string;frequency:RecurrenceFrequency;nextDueDate:string;active:boolean;projectId?:number};
export type GeneratedExpense={id:number;title:string;amount:number;date:string;category?:string;projectId?:number;sourceRuleId?:string;dueDate?:string};

function parseDate(value:string):Date{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('تاريخ المصروف المتكرر خاصو يكون YYYY-MM-DD');
 const date=new Date(value+'T00:00:00.000Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw new Error('تاريخ المصروف المتكرر غير صالح');
 return date;
}
export function nextRecurringDate(value:string,frequency:RecurrenceFrequency):string{
 const date=parseDate(value);const day=date.getUTCDate();
 if(frequency==='weekly')date.setUTCDate(day+7);
 else if(frequency==='monthly'){
  const month=date.getUTCMonth()+1;const year=date.getUTCFullYear();
  const targetYear=year+Math.floor(month/12);const targetMonth=month%12;
  const lastDay=new Date(Date.UTC(targetYear,targetMonth+1,0)).getUTCDate();
  return new Date(Date.UTC(targetYear,targetMonth,Math.min(day,lastDay))).toISOString().slice(0,10);
 }else{
  const year=date.getUTCFullYear()+1;const month=date.getUTCMonth();
  const lastDay=new Date(Date.UTC(year,month+1,0)).getUTCDate();
  return new Date(Date.UTC(year,month,Math.min(day,lastDay))).toISOString().slice(0,10);
 }
 return date.toISOString().slice(0,10);
}
export function validateRecurringExpenseRule(rule:RecurringExpenseRule):string[]{
 const errors:string[]=[];
 if(!rule.id.trim()||!rule.title.trim())errors.push('معرف ووصف المصروف المتكرر مطلوبان');
 if(!Number.isFinite(rule.amount)||rule.amount<=0)errors.push('مبلغ المصروف المتكرر خاصو يكون موجب');
 if(!['weekly','monthly','yearly'].includes(rule.frequency))errors.push('دورية المصروف غير صالحة');
 try{parseDate(rule.nextDueDate);}catch(error){errors.push(error instanceof Error?error.message:'تاريخ غير صالح');}
 if(rule.projectId!==undefined&&(!Number.isSafeInteger(rule.projectId)||rule.projectId<=0))errors.push('المشروع المرتبط بالمصروف غير صالح');
 return errors;
}
export function generateDueRecurringExpenses(
 rules:RecurringExpenseRule[],expenses:GeneratedExpense[],today:string,firstId:number,
):{rules:RecurringExpenseRule[];expenses:GeneratedExpense[];generated:GeneratedExpense[]}{
 parseDate(today);
 const known=new Set(expenses.filter(x=>x.sourceRuleId).map(x=>x.sourceRuleId+'|'+x.dueDate));
 const generated:GeneratedExpense[]=[];let id=firstId;
 const nextRules=rules.map(rule=>{
  const errors=validateRecurringExpenseRule(rule);if(errors.length)throw new Error(errors.join('؛ '));
  if(!rule.active)return rule;
  let due=rule.nextDueDate;let iterations=0;
  while(due<=today){
   if(++iterations>240)throw new Error('تاريخ المصروف المتكرر بعيد بزاف، راجع الدورية');
   const key=rule.id+'|'+due;
   if(!known.has(key)){
    generated.push({id:id++,title:rule.title,amount:rule.amount,date:due,category:rule.category,projectId:rule.projectId,sourceRuleId:rule.id,dueDate:due});
    known.add(key);
   }
   due=nextRecurringDate(due,rule.frequency);
  }
  return {...rule,nextDueDate:due};
 });
 return {rules:nextRules,expenses:[...expenses,...generated],generated};
}
