export type TaskRecurrenceFrequency='weekly'|'monthly'|'yearly';
export type RecurringWorkTask<T extends {id:number;dueDate:string;status:string;recurrence?:TaskRecurrenceFrequency;recurrenceEndDate?:string}> = T;
function parseDate(value:string):Date{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('تاريخ المهمة خاصو يكون YYYY-MM-DD');
 const date=new Date(value+'T00:00:00.000Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw new Error('تاريخ المهمة غير صالح');
 return date;
}
export function nextTaskOccurrence(value:string,frequency:TaskRecurrenceFrequency):string{
 const date=parseDate(value),day=date.getUTCDate();
 if(frequency==='weekly'){date.setUTCDate(day+7);return date.toISOString().slice(0,10);}
 if(frequency==='monthly'){
  const month=date.getUTCMonth()+1,year=date.getUTCFullYear(),targetYear=year+Math.floor(month/12),targetMonth=month%12;
  const last=new Date(Date.UTC(targetYear,targetMonth+1,0)).getUTCDate();
  return new Date(Date.UTC(targetYear,targetMonth,Math.min(day,last))).toISOString().slice(0,10);
 }
 if(frequency==='yearly'){
  const year=date.getUTCFullYear()+1,month=date.getUTCMonth(),last=new Date(Date.UTC(year,month+1,0)).getUTCDate();
  return new Date(Date.UTC(year,month,Math.min(day,last))).toISOString().slice(0,10);
 }
 throw new Error('دورية المهمة غير صالحة');
}
export function completeRecurringWorkTask<T extends {id:number;dueDate:string;status:string;recurrence?:TaskRecurrenceFrequency;recurrenceEndDate?:string;title:string}>(
 tasks:T[],taskId:number,nextId:number,
):{tasks:T[];generated:T|null}{
 if(!Number.isSafeInteger(nextId)||nextId<=0)throw new Error('معرف المهمة الجديدة غير صالح');
 const task=tasks.find(item=>item.id===taskId);
 if(!task)throw new Error('المهمة غير موجودة');
 if(task.status==='done')return {tasks,generated:null};
 const completed={...task,status:'done'} as T;
 if(!task.recurrence)return {tasks:tasks.map(item=>item.id===taskId?completed:item),generated:null};
 const dueDate=nextTaskOccurrence(task.dueDate,task.recurrence);
 if(task.recurrenceEndDate){
  const end=parseDate(task.recurrenceEndDate);
  if(dueDate>end.toISOString().slice(0,10))return {tasks:tasks.map(item=>item.id===taskId?completed:item),generated:null};
 }
 if(tasks.some(item=>item.id!==task.id&&item.title===task.title&&item.dueDate===dueDate&&item.recurrence===task.recurrence))
  return {tasks:tasks.map(item=>item.id===taskId?completed:item),generated:null};
 const generated={...task,id:nextId,dueDate,status:'todo'} as T;
 return {tasks:[generated,...tasks.map(item=>item.id===taskId?completed:item)],generated};
}
