export type ProjectStatus='مخطط'|'جارٍ'|'مكتمل'|'متوقف';
export type ProjectTaskPriority='عادي'|'مهم'|'عاجل';
export type ProjectTask={id:number;title:string;done:boolean;dueDate?:string;priority?:ProjectTaskPriority};
export type ProjectRecord={
  id:number;
  name:string;
  customerName:string;
  budget:number;
  targetDate?:string;
  status:ProjectStatus;
  tasks:ProjectTask[];
};
export type ProjectExpense={id:number;projectId?:number;amount:number};

function isValidIsoDate(value:string):boolean {
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
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
  return {id,name,customerName:input.customerName?.trim()||'',budget,targetDate,status:'مخطط',tasks:[]};
}

export function addProjectTask(project:ProjectRecord,title:string,id:number,options:{dueDate?:string;priority?:ProjectTaskPriority}={}):ProjectRecord {
  const trimmed=title.trim();
  if(!trimmed) throw new Error('دخل اسم المهمة.');
  const dueDate=options.dueDate?.trim();
  if(dueDate){
    if(!isValidIsoDate(dueDate)) throw new Error('دخل تاريخاً صحيحاً بصيغة YYYY-MM-DD.');
  }
  const priority=options.priority??'عادي';
  if(!['عادي','مهم','عاجل'].includes(priority)) throw new Error('اختار أولوية صحيحة للمهمة.');
  return {...project,tasks:[...project.tasks,{id,title:trimmed,done:false,...(dueDate?{dueDate}:{}),priority}]};
}

export function setProjectTaskDone(project:ProjectRecord,taskId:number,done:boolean):ProjectRecord {
  if(!project.tasks.some(task=>task.id===taskId)) throw new Error('المهمة غير موجودة.');
  return {...project,tasks:project.tasks.map(task=>task.id===taskId?{...task,done}:task)};
}

export function projectFinancials(project:ProjectRecord,expenses:ProjectExpense[]) {
  const spent=expenses.filter(expense=>expense.projectId===project.id&&Number.isFinite(expense.amount)&&expense.amount>0)
    .reduce((sum,expense)=>sum+expense.amount,0);
  return {spent,remaining:project.budget-spent,overBudget:spent>project.budget};
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
    (!task.priority||['عادي','مهم','عاجل'].includes(task.priority))).map(task=>({...task,priority:task.priority??'عادي'}))}));
}
