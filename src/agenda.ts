export type TaskPriority='low'|'normal'|'high';
export type TaskStatus='open'|'in_progress'|'done';
export type AgendaTask={id:string;title:string;projectId?:string;customerId?:string;assignee?:string;priority:TaskPriority;status:TaskStatus;dueDate?:string;durationMinutes?:number;notes?:string;createdAt:string};
export type WorkLog={id:string;taskId:string;projectId?:string;technician:string;date:string;durationMinutes:number;hourlyRateCentimes:number;notes?:string};
export type WorkLogSettlement={id:string;technician:string;date:string;amountCentimes:number;method:'cash'|'bank'|'cheque';reference?:string;notes?:string};

function validDate(value:string):boolean{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const parsed=new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
}

export function validateTask(task:AgendaTask,existing:AgendaTask[]=[]):string[]{
  const errors:string[]=[];
  if(!task.id.trim()||existing.some(item=>item.id===task.id))errors.push('معرف المهمة ناقص أو مستعمل');
  if(!task.title.trim())errors.push('عنوان المهمة إجباري');
  if(!['low','normal','high'].includes(task.priority))errors.push('أولوية المهمة غير صالحة');
  if(!['open','in_progress','done'].includes(task.status))errors.push('حالة المهمة غير صالحة');
  if(task.dueDate&&!validDate(task.dueDate))errors.push('تاريخ استحقاق المهمة غير صالح');
  if(task.durationMinutes!==undefined&&(!Number.isSafeInteger(task.durationMinutes)||task.durationMinutes<=0))errors.push('مدة المهمة خاصها تكون بالدقائق وأكبر من صفر');
  return errors;
}

export function changeTaskStatus(task:AgendaTask,next:TaskStatus):AgendaTask{
  if(!['open','in_progress','done'].includes(next))throw new Error('حالة المهمة غير صالحة');
  return {...task,status:next};
}

export function sortTasks(tasks:AgendaTask[]):AgendaTask[]{
  const rank:Record<TaskPriority,number>={high:0,normal:1,low:2};
  return tasks.slice().sort((a,b)=>Number(a.status==='done')-Number(b.status==='done')||rank[a.priority]-rank[b.priority]||(a.dueDate||'9999-12-31').localeCompare(b.dueDate||'9999-12-31'));
}

export function validateWorkLog(log:WorkLog,tasks:AgendaTask[],existing:WorkLog[]=[]):string[]{
  const errors:string[]=[];
  const task=tasks.find(item=>item.id===log.taskId);
  if(!log.id.trim()||existing.some(item=>item.id===log.id))errors.push('معرف سجل الوقت ناقص أو مستعمل');
  if(!task)errors.push('اختار مهمة مسجلة');
  if(task?.projectId&&log.projectId!==task.projectId)errors.push('المشروع ما مطابقش للمهمة');
  if(!log.technician.trim())errors.push('اسم الفني إجباري');
  if(!validDate(log.date))errors.push('تاريخ سجل الوقت غير صالح');
  if(!Number.isSafeInteger(log.durationMinutes)||log.durationMinutes<=0)errors.push('مدة العمل خاصها تكون بالدقائق وأكبر من صفر');
  if(!Number.isSafeInteger(log.hourlyRateCentimes)||log.hourlyRateCentimes<0)errors.push('الأجرة بالساعة غير صالحة');
  return errors;
}

export function workLogCostCentimes(log:Pick<WorkLog,'durationMinutes'|'hourlyRateCentimes'>):number{
  if(!Number.isSafeInteger(log.durationMinutes)||log.durationMinutes<=0||!Number.isSafeInteger(log.hourlyRateCentimes)||log.hourlyRateCentimes<0)throw new Error('مدة العمل أو الأجرة غير صالحة');
  return Math.round(log.durationMinutes*log.hourlyRateCentimes/60);
}

export function workLogEarnedCentimes(logs:WorkLog[],technician:string):number{
  return logs.filter(log=>log.technician.trim().toLowerCase()===technician.trim().toLowerCase()).reduce((sum,log)=>sum+workLogCostCentimes(log),0);
}

export function workLogPaidCentimes(settlements:WorkLogSettlement[],technician:string):number{
  return settlements.filter(item=>item.technician.trim().toLowerCase()===technician.trim().toLowerCase()).reduce((sum,item)=>sum+item.amountCentimes,0);
}

export function workLogOutstandingCentimes(logs:WorkLog[],settlements:WorkLogSettlement[],technician:string):number{
  return Math.max(0,workLogEarnedCentimes(logs,technician)-workLogPaidCentimes(settlements,technician));
}

export function validateWorkLogSettlement(settlement:WorkLogSettlement,logs:WorkLog[],existing:WorkLogSettlement[]=[]):string[]{
  const errors:string[]=[];
  if(!settlement.id.trim()||existing.some(item=>item.id===settlement.id))errors.push('معرف تسوية الأجرة ناقص أو مستعمل');
  if(!settlement.technician.trim()||workLogEarnedCentimes(logs,settlement.technician)<=0)errors.push('ما كايناش أجرة مستحقة لهاد الفني');
  if(!validDate(settlement.date))errors.push('تاريخ تسوية الأجرة غير صالح');
  if(!Number.isSafeInteger(settlement.amountCentimes)||settlement.amountCentimes<=0)errors.push('مبلغ التسوية خاصو يكون أكبر من صفر');
  if(Number.isSafeInteger(settlement.amountCentimes)&&settlement.amountCentimes>workLogOutstandingCentimes(logs,existing,settlement.technician))errors.push('مبلغ التسوية أكبر من الأجرة الباقية');
  if(!['cash','bank','cheque'].includes(settlement.method))errors.push('طريقة تسوية الأجرة غير صالحة');
  if(settlement.method==='cheque'&&!settlement.reference?.trim())errors.push('مرجع الشيك إجباري');
  return errors;
}
