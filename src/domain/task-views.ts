import type {TaskListPriority,TaskListStatus,WorkTaskFilters} from './task-filters';

export type SavedWorkTaskView={id:string;name:string;filters:WorkTaskFilters};
export const MAX_SAVED_WORK_TASK_VIEWS=12;
const statuses:TaskListStatus[]=['all','open','done','overdue'];
const priorities:TaskListPriority[]=['all','low','medium','high'];

function normalizeView(value:unknown):SavedWorkTaskView|null {
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const item=value as Record<string,unknown>;
 if(typeof item.id!=='string'||!item.id.trim()||item.id.length>80||
    typeof item.name!=='string'||!item.name.trim()||item.name.trim().length>60||
    !item.filters||typeof item.filters!=='object'||Array.isArray(item.filters))return null;
 const filters=item.filters as Record<string,unknown>;
 const projectId=filters.projectId;
 if(typeof filters.query!=='string'||filters.query.length>120||
    !statuses.includes(filters.status as TaskListStatus)||
    !priorities.includes(filters.priority as TaskListPriority)||
    !(projectId==='all'||projectId==='unassigned'||(typeof projectId==='number'&&Number.isSafeInteger(projectId)&&projectId>0)))return null;
 return {
  id:item.id,
  name:item.name.trim(),
  filters:{
   query:filters.query.trim(),
   status:filters.status as TaskListStatus,
   priority:filters.priority as TaskListPriority,
   projectId:projectId as WorkTaskFilters['projectId'],
  },
 };
}

/** Drops malformed and duplicate saved views while keeping the first valid copy. */
export function normalizeSavedWorkTaskViews(value:unknown):SavedWorkTaskView[] {
 if(!Array.isArray(value))return [];
 const result:SavedWorkTaskView[]=[];
 const ids=new Set<string>(),names=new Set<string>();
 for(const candidate of value){
  const view=normalizeView(candidate);
  if(!view)continue;
  const key=view.name.toLocaleLowerCase();
  if(ids.has(view.id)||names.has(key))continue;
  ids.add(view.id);names.add(key);result.push(view);
  if(result.length===MAX_SAVED_WORK_TASK_VIEWS)break;
 }
 return result;
}

export function saveWorkTaskView(current:unknown,view:SavedWorkTaskView):SavedWorkTaskView[] {
 const views=normalizeSavedWorkTaskViews(current);
 const candidate=normalizeView(view);
 if(!candidate)throw new Error('معلومات العرض المحفوظ غير صالحة');
 const sameId=views.find(item=>item.id===candidate.id);
 if(views.some(item=>item.id!==candidate.id&&item.name.toLocaleLowerCase()===candidate.name.toLocaleLowerCase()))
  throw new Error('يوجد عرض محفوظ بهذا الاسم');
 if(!sameId&&views.length>=MAX_SAVED_WORK_TASK_VIEWS)
  throw new Error('وصلت للحد الأقصى ديال العروض المحفوظة');
 return [...views.filter(item=>item.id!==candidate.id),candidate].slice(0,MAX_SAVED_WORK_TASK_VIEWS);
}

export function removeSavedWorkTaskView(current:unknown,id:string):SavedWorkTaskView[] {
 const views=normalizeSavedWorkTaskViews(current);
 return views.filter(view=>view.id!==id);
}
