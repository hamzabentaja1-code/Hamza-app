export type TaskPriority='low'|'normal'|'high';
export type TaskStatus='open'|'in_progress'|'done';
export type AgendaTask={id:string;title:string;projectId?:string;customerId?:string;assignee?:string;priority:TaskPriority;status:TaskStatus;dueDate?:string;durationMinutes?:number;notes?:string;createdAt:string};

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
