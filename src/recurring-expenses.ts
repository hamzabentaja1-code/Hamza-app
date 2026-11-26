export type ExpenseFrequency='أسبوعي'|'شهري';
export type RecurringExpenseRule={id:number;title:string;category:string;amount:number;frequency:ExpenseFrequency;nextDueDate:string;anchorDay:number;active:boolean};
export type RecurringExpenseInput={title:string;category:string;amount:number;frequency:ExpenseFrequency;nextDueDate:string};
export type RecurringOccurrence={recurringRuleId:number;recurringOccurrenceDate:string};
export function isValidRecurringDate(value:string):boolean{if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T00:00:00.000Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;}
export function createRecurringExpense(input:RecurringExpenseInput,id:number,existing:readonly RecurringExpenseRule[]=[]):RecurringExpenseRule{
  const title=input.title.trim(),category=input.category.trim(),amount=Number(input.amount),amountCentimes=Math.round(amount*100);
  if(!Number.isSafeInteger(id)||id<=0||existing.some(item=>item.id===id))throw new Error('معرف المصروف الدوري غير صالح أو مستعمل.');
  if(!title||!category)throw new Error('دخل وصف المصروف وتصنيفه.');
  if(title.length>100||category.length>60)throw new Error('وصف أو تصنيف المصروف طويل بزاف.');
  if(!Number.isFinite(amount)||amount<=0||!Number.isSafeInteger(amountCentimes)||amountCentimes<=0)throw new Error('دخل مبلغ مصروف دوري صحيحاً أكبر من صفر.');
  if(!['أسبوعي','شهري'].includes(input.frequency))throw new Error('تكرار المصروف غير صالح.');
  if(!isValidRecurringDate(input.nextDueDate))throw new Error('دخل تاريخاً صحيحاً بصيغة YYYY-MM-DD.');
  return {id,title,category,amount:amountCentimes/100,frequency:input.frequency,nextDueDate:input.nextDueDate,anchorDay:Number(input.nextDueDate.slice(8,10)),active:true};
}
export function updateRecurringExpense(rules:readonly RecurringExpenseRule[],id:number,input:RecurringExpenseInput):RecurringExpenseRule[]{
  const current=rules.find(item=>item.id===id);if(!current)throw new Error('المصروف الدوري غير موجود.');
  const updated=createRecurringExpense(input,id,rules.filter(item=>item.id!==id));
  return rules.map(item=>item.id===id?{...updated,active:current.active,anchorDay:current.anchorDay}:item);
}
export function advanceRecurringExpense(rule:RecurringExpenseRule):RecurringExpenseRule{
  if(!isValidRecurringDate(rule.nextDueDate))throw new Error('تاريخ المصروف الدوري غير صالح.');
  const current=new Date(rule.nextDueDate+'T00:00:00.000Z');
  if(rule.frequency==='أسبوعي')current.setUTCDate(current.getUTCDate()+7);
  else {const year=current.getUTCFullYear(),month=current.getUTCMonth()+1,lastDay=new Date(Date.UTC(year,month+1,0)).getUTCDate();current.setUTCFullYear(year,month,Math.min(rule.anchorDay,lastDay));}
  return {...rule,nextDueDate:current.toISOString().slice(0,10)};
}
export function normalizeRecurringExpenses(value:unknown):RecurringExpenseRule[]{
  if(!Array.isArray(value))return[];const result:RecurringExpenseRule[]=[];
  for(const raw of value){if(typeof raw!=='object'||raw===null)continue;const item=raw as Partial<RecurringExpenseRule>;if(item.frequency!=='أسبوعي'&&item.frequency!=='شهري')continue;try{const clean=createRecurringExpense({title:typeof item.title==='string'?item.title:'',category:typeof item.category==='string'?item.category:'',amount:Number(item.amount),frequency:item.frequency,nextDueDate:typeof item.nextDueDate==='string'?item.nextDueDate:''},Number(item.id),result);result.push({...clean,anchorDay:Number.isSafeInteger(item.anchorDay)&&Number(item.anchorDay)>=1&&Number(item.anchorDay)<=31?Number(item.anchorDay):clean.anchorDay,active:item.active!==false});}catch{}}
  return result;
}
export function recordRecurringOccurrence(rule:RecurringExpenseRule,occurrences:readonly RecurringOccurrence[]):RecurringOccurrence{
  if(occurrences.some(item=>item.recurringRuleId===rule.id&&item.recurringOccurrenceDate===rule.nextDueDate))throw new Error('تم تسجيل هاد المصروف الدوري من قبل.');
  return {recurringRuleId:rule.id,recurringOccurrenceDate:rule.nextDueDate};
}
