export type ProjectStatus='مخطط'|'جارٍ'|'مكتمل'|'متوقف';
export type ProjectTaskPriority='عادي'|'مهم'|'عاجل';
export type ProjectTaskAttachment={id:string;name:string;uri:string;mimeType?:string;size:number};
export type ProjectTask={id:number;title:string;done:boolean;dueDate?:string;priority?:ProjectTaskPriority;assignee?:string;attachments?:ProjectTaskAttachment[]};
export type ProjectTimeEntry={id:number;technician:string;technicianId?:number;date:string;hours:number;hourlyRate:number;note?:string};
export type ProjectRecord={
  id:number;
  name:string;
  customerName:string;
  budget:number;
  targetDate?:string;
  status:ProjectStatus;
  tasks:ProjectTask[];
  timeEntries:ProjectTimeEntry[];
};
export type ProjectExpense={id:number;projectId?:number;amount:number};
export const MAX_TASK_ATTACHMENT_BYTES=5*1024*1024;
export const MAX_TASK_ATTACHMENTS=10;

function isValidIsoDate(value:string):boolean {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed=new Date(value+'T00:00:00.000Z');
  return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
}

export function createProject(input:{name:string;customerName?:string;budget:number;targetDate?:string},id:number):ProjectRecord {
  const name=input.name.trim();
  const budget=Number(input.budget);
  if(!name) throw new Error('دخل اسم المشروع.');
  if(!Number.isFinite(budget)||budget<0) throw new Error('دخل ميزانية صحيحة.');
  const targetDate=input.targetDate?.trim();
  if(targetDate&&!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) throw new Error('دخل تاريخاً صحيحاً بصيغة YYYY-MM-DD.');
  if(targetDate){
    const parsed=new Date(targetDate+'T00:00:00.000Z');
    if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==targetDate) throw new Error('دخل تاريخاً صحيحاً بصيغة YYYY-MM-DD.');
  }
  return {id,name,customerName:input.customerName?.trim()||'',budget,targetDate,status:'مخطط',tasks:[],timeEntries:[]};
}

export function updateProjectDetails(project:ProjectRecord,input:{name:string;customerName?:string;budget:number;targetDate?:string}):ProjectRecord{
  const normalized=createProject(input,project.id);
  return {...project,name:normalized.name,customerName:normalized.customerName,budget:normalized.budget,targetDate:normalized.targetDate};
}

export function assertProjectCanBeDeleted(project:ProjectRecord,expenses:readonly ProjectExpense[]):void{
  if(project.tasks.length||project.timeEntries.length||expenses.some(expense=>expense.projectId===project.id))
    throw new Error('المشروع فيه مهام أو ساعات أو مصاريف مرتبطة؛ ما يمكنش حذفه.');
}

export function addProjectTimeEntry(project:ProjectRecord,input:{technician:string;technicianId?:number;date:string;hours:number;hourlyRate:number;note?:string},id:number):ProjectRecord{
  const technician=input.technician.trim(),date=input.date.trim(),hours=Number(input.hours),hourlyRate=Number(input.hourlyRate);
  if(!technician)throw new Error('دخل اسم التقني.');
  if(!isValidIsoDate(date))throw new Error('دخل تاريخاً صحيحاً بصيغة YYYY-MM-DD.');
  if(!Number.isFinite(hours)||hours<=0||hours>24)throw new Error('دخل عدد ساعات صحيحاً بين 0 و24.');
  if(!Number.isFinite(hourlyRate)||hourlyRate<0)throw new Error('دخل أجرة الساعة صحيحة أو صفر.');
  if(!Number.isSafeInteger(id)||id<0||project.timeEntries.some(entry=>entry.id===id))throw new Error('معرف سجل الوقت غير صالح أو مستعمل.');
  return {...project,timeEntries:[...project.timeEntries,{id,technician,...(Number.isSafeInteger(input.technicianId)&&Number(input.technicianId)>0?{technicianId:input.technicianId}:{}),date,hours,hourlyRate,...(input.note?.trim()?{note:input.note.trim()}:{})}]};
}

export function removeProjectTimeEntry(project:ProjectRecord,entryId:number):ProjectRecord{
  if(!project.timeEntries.some(entry=>entry.id===entryId))throw new Error('سجل الوقت غير موجود.');
  return {...project,timeEntries:project.timeEntries.filter(entry=>entry.id!==entryId)};
}

export function addProjectTask(project:ProjectRecord,title:string,id:number,options:{dueDate?:string;priority?:ProjectTaskPriority;assignee?:string}={}):ProjectRecord {
  const trimmed=title.trim();
  if(!trimmed) throw new Error('دخل اسم المهمة.');
  const dueDate=options.dueDate?.trim();
  if(dueDate){
    if(!isValidIsoDate(dueDate)) throw new Error('دخل تاريخاً صحيحاً بصيغة YYYY-MM-DD.');
  }
  const priority=options.priority??'عادي';
  if(!['عادي','مهم','عاجل'].includes(priority)) throw new Error('اختار أولوية صحيحة للمهمة.');
  const assignee=options.assignee?.trim();
  return {...project,tasks:[...project.tasks,{id,title:trimmed,done:false,...(dueDate?{dueDate}:{}),priority,...(assignee?{assignee}:{})}]};
}

export function updateProjectTask(project:ProjectRecord,taskId:number,input:{title:string;dueDate?:string;priority:ProjectTaskPriority;assignee?:string}):ProjectRecord{
  const current=project.tasks.find(task=>task.id===taskId);
  if(!current)throw new Error('المهمة غير موجودة.');
  const title=input.title.trim(),dueDate=input.dueDate?.trim();
  if(!title)throw new Error('دخل اسم المهمة.');
  if(dueDate&&!isValidIsoDate(dueDate))throw new Error('دخل تاريخاً صحيحاً بصيغة YYYY-MM-DD.');
  if(!['عادي','مهم','عاجل'].includes(input.priority))throw new Error('اختار أولوية صحيحة للمهمة.');
  const assignee=input.assignee?.trim();
  const updated={...current,title,...(dueDate?{dueDate}:{dueDate:undefined}),priority:input.priority,...(assignee?{assignee}:{assignee:undefined})};
  return {...project,tasks:project.tasks.map(task=>task.id===taskId?updated:task)};
}

export function setProjectTaskDone(project:ProjectRecord,taskId:number,done:boolean):ProjectRecord {
  if(!project.tasks.some(task=>task.id===taskId)) throw new Error('المهمة غير موجودة.');
  return {...project,tasks:project.tasks.map(task=>task.id===taskId?{...task,done}:task)};
}

export function removeProjectTask(project:ProjectRecord,taskId:number):ProjectRecord{
  if(!project.tasks.some(task=>task.id===taskId))throw new Error('المهمة غير موجودة.');
  return {...project,tasks:project.tasks.filter(task=>task.id!==taskId)};
}

export function addProjectTaskAttachment(project:ProjectRecord,taskId:number,attachment:ProjectTaskAttachment):ProjectRecord{
  const task=project.tasks.find(item=>item.id===taskId);
  if(!task)throw new Error('المهمة غير موجودة.');
  const id=attachment.id.trim(),name=attachment.name.trim(),uri=attachment.uri.trim();
  if(!id||id.length>120||!name||name.length>180||!uri.startsWith('file://')||!Number.isSafeInteger(attachment.size)||attachment.size<=0||attachment.size>MAX_TASK_ATTACHMENT_BYTES)
    throw new Error('المرفق غير صالح أو حجمه أكبر من 5 ميغابايت.');
  const attachments=task.attachments||[];
  if(attachments.length>=MAX_TASK_ATTACHMENTS)throw new Error('وصلتي للحد الأقصى ديال 10 مرفقات للمهمة.');
  if(attachments.some(item=>item.id===id||item.uri===uri))throw new Error('هاد المرفق مسجل من قبل.');
  const normalized:ProjectTaskAttachment={id,name,uri,size:attachment.size,...(attachment.mimeType?.trim()?{mimeType:attachment.mimeType.trim().slice(0,120)}:{})};
  return {...project,tasks:project.tasks.map(item=>item.id===taskId?{...item,attachments:[...attachments,normalized]}:item)};
}

export function removeProjectTaskAttachment(project:ProjectRecord,taskId:number,attachmentId:string):ProjectRecord{
  const task=project.tasks.find(item=>item.id===taskId);
  if(!task)throw new Error('المهمة غير موجودة.');
  if(!(task.attachments||[]).some(item=>item.id===attachmentId))throw new Error('المرفق غير موجود.');
  return {...project,tasks:project.tasks.map(item=>item.id===taskId?{...item,attachments:(item.attachments||[]).filter(attachment=>attachment.id!==attachmentId)}:item)};
}

function normalizeTaskAttachments(value:unknown):ProjectTaskAttachment[]{
  if(!Array.isArray(value))return [];
  const ids=new Set<string>(),uris=new Set<string>(),result:ProjectTaskAttachment[]=[];
  for(const candidate of value){
    if(typeof candidate!=='object'||candidate===null)continue;
    const item=candidate as Partial<ProjectTaskAttachment>,id=typeof item.id==='string'?item.id.trim():'',name=typeof item.name==='string'?item.name.trim():'',uri=typeof item.uri==='string'?item.uri.trim():'',size=item.size;
    if(!id||id.length>120||!name||name.length>180||!uri.startsWith('file://')||typeof size!=='number'||!Number.isSafeInteger(size)||size<=0||size>MAX_TASK_ATTACHMENT_BYTES||ids.has(id)||uris.has(uri))continue;
    ids.add(id);uris.add(uri);result.push({id,name,uri,size,...(typeof item.mimeType==='string'&&item.mimeType.trim()?{mimeType:item.mimeType.trim().slice(0,120)}:{})});
    if(result.length>=MAX_TASK_ATTACHMENTS)break;
  }
  return result;
}

export function projectFinancials(project:ProjectRecord,expenses:ProjectExpense[]) {
  const expenseCost=expenses.filter(expense=>expense.projectId===project.id&&Number.isFinite(expense.amount)&&expense.amount>0)
    .reduce((sum,expense)=>sum+expense.amount,0);
  const laborCost=project.timeEntries.reduce((sum,entry)=>sum+Math.round(entry.hours*entry.hourlyRate*100)/100,0);
  const spent=expenseCost+laborCost;
  return {spent,expenseCost,laborCost,remaining:project.budget-spent,overBudget:spent>project.budget};
}

export function normalizeProjects(value:unknown):ProjectRecord[] {
  if(!Array.isArray(value)) return [];
  return value.filter((item):item is ProjectRecord=>{
    if(typeof item!=='object'||item===null) return false;
    const p=item as Partial<ProjectRecord>;
    return Number.isFinite(p.id)&&typeof p.name==='string'&&typeof p.customerName==='string'&&
      Number.isFinite(p.budget)&&['مخطط','جارٍ','مكتمل','متوقف'].includes(p.status||'')&&Array.isArray(p.tasks);
  }).map(project=>({...project,tasks:project.tasks.filter(task=>
    Number.isFinite(task.id)&&typeof task.title==='string'&&typeof task.done==='boolean'&&
    (!task.dueDate||(typeof task.dueDate==='string'&&isValidIsoDate(task.dueDate)))&&
    (!task.priority||['عادي','مهم','عاجل'].includes(task.priority))&&(!task.assignee||typeof task.assignee==='string')).map(task=>({...task,priority:task.priority??'عادي',assignee:task.assignee?.trim()||undefined,...(Array.isArray(task.attachments)?{attachments:normalizeTaskAttachments(task.attachments)}:{})})),timeEntries:Array.isArray(project.timeEntries)?project.timeEntries.filter((entry):entry is ProjectTimeEntry=>
      Number.isSafeInteger(entry.id)&&entry.id>=0&&typeof entry.technician==='string'&&!!entry.technician.trim()&&(entry.technicianId===undefined||Number.isSafeInteger(entry.technicianId)&&entry.technicianId>0)&&typeof entry.date==='string'&&isValidIsoDate(entry.date)&&Number.isFinite(entry.hours)&&entry.hours>0&&entry.hours<=24&&Number.isFinite(entry.hourlyRate)&&entry.hourlyRate>=0&&(!entry.note||typeof entry.note==='string')).map(entry=>({...entry,technician:entry.technician.trim(),note:entry.note?.trim()||undefined})):[]}));
}
