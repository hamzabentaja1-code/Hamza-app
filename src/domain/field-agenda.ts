import type {ProjectRecord} from '../projects';
import {isValidIsoDate} from './document-conversion';

export type VisitStatus='requested'|'scheduled'|'completed'|'cancelled';
export type VisitKind='installation'|'service';
export type VisitInput={title:string;customer:string;address:string;kind:VisitKind;date?:string;time?:string;technicianId?:number;projectId?:number;note?:string};
export type FieldVisit=VisitInput&{id:number;status:VisitStatus};
export const visitStatusLabels:Record<VisitStatus,string>={requested:'طلب جديد',scheduled:'موعد مبرمج',completed:'تم التدخل',cancelled:'تم الإلغاء'};
export const visitKindLabels:Record<VisitKind,string>={installation:'طلب تركيب',service:'طلب تدخل'};
const visitStatuses=['requested','scheduled','completed','cancelled'];
function optionalId(value:unknown):number|undefined {
  return typeof value==='number'&&Number.isSafeInteger(value)&&value>0?value:undefined;
}
function cleanInput(input:VisitInput):VisitInput {
  const title=input.title.trim(),customer=input.customer.trim(),address=input.address.trim();
  const date=input.date?.trim()||undefined,time=input.time?.trim()||undefined;
  if(!title||!customer||!address||title.length>120||customer.length>120||address.length>240) throw new Error('دخل عنوان الطلب والزبون ومكان التدخل.');
  if(input.kind!=='installation'&&input.kind!=='service')throw new Error('اختار نوع التدخل.');
  if(date&&!isValidIsoDate(date))throw new Error('دخل تاريخاً صحيحاً بصيغة YYYY-MM-DD.');
  if(time&&(!date||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)))throw new Error('دخل تاريخ ووقت صحيح بصيغة HH:MM.');
  return {title,customer,address,kind:input.kind,date,time,technicianId:optionalId(input.technicianId),projectId:optionalId(input.projectId),note:input.note?.trim().slice(0,500)||undefined};
}
export function createFieldVisit(input:VisitInput,id:number):FieldVisit {
  if(!optionalId(id))throw new Error('رقم طلب التدخل غير صالح.');
  return {...cleanInput(input),id,status:'requested'};
}
export function updateFieldVisit(visit:FieldVisit,input:VisitInput):FieldVisit {
  if(visit.status==='completed'||visit.status==='cancelled')throw new Error('هاد الطلب تسد وما يمكنش تبدلو.');
  const next={...cleanInput(input),id:visit.id,status:visit.status};
  if(next.status==='scheduled')assertScheduled(next);
  return next;
}
function assertScheduled(visit:FieldVisit) {
  if(!visit.date||!visit.time||!visit.technicianId)throw new Error('باش تبرمج الموعد خاص التاريخ والساعة والتقني.');
}
export function changeVisitStatus(visit:FieldVisit,status:VisitStatus):FieldVisit {
  const allowed:Record<VisitStatus,VisitStatus[]>={requested:['scheduled','cancelled'],scheduled:['requested','completed','cancelled'],completed:[],cancelled:[]};
  if(!allowed[visit.status].includes(status))throw new Error('هاد التغيير ديال الحالة ما ممكنش.');
  if(status==='scheduled')assertScheduled(visit);
  return {...visit,status};
}
export function assertVisitSlot(visit:FieldVisit, visits:readonly FieldVisit[]):void {
  if(visit.status==='scheduled'&&visits.some(v=>v.id!==visit.id&&v.status==='scheduled'&&v.technicianId===visit.technicianId&&v.date===visit.date&&v.time===visit.time))
    throw new Error('التقني عندو موعد آخر فنفس النهار والساعة.');
}
export function normalizeFieldVisits(value:unknown):FieldVisit[] {
  if(!Array.isArray(value))return [];
  const ids=new Set<number>(),rows:FieldVisit[]=[];
  for(const raw of value){
    if(!raw||typeof raw!=='object')continue;
    const v=raw as FieldVisit;
    if(!optionalId(v.id)||ids.has(v.id)||!visitStatuses.includes(v.status))continue;
    try {
      const item={...createFieldVisit(v,v.id),status:v.status};
      if(item.status==='scheduled'||item.status==='completed')assertScheduled(item);
      ids.add(item.id);rows.push(item);
    } catch {/* Do not hydrate invalid imports. */}
  }
  return rows;
}
export type AgendaRow={key:string;date:string;time?:string;title:string;detail:string;kind:'task'|'delivery'|'visit';closed:boolean;visitId?:number};
export function buildFieldAgenda(projects:readonly ProjectRecord[],visits:readonly FieldVisit[],includeClosed=false):AgendaRow[] {
  const rows:AgendaRow[]=[];
  for(const project of projects){
    if(project.targetDate&&isValidIsoDate(project.targetDate))rows.push({key:'p:'+project.id,date:project.targetDate,title:project.name,detail:project.customerName,kind:'delivery',closed:project.status==='مكتمل'||project.status==='متوقف'});
    for(const task of project.tasks) if(task.dueDate&&isValidIsoDate(task.dueDate))
      rows.push({key:'t:'+project.id+':'+task.id,date:task.dueDate,title:task.title,detail:[project.name,task.assignee].filter(Boolean).join(' · '),kind:'task',closed:task.done||project.status==='مكتمل'||project.status==='متوقف'});
  }
  for(const visit of visits)if(visit.date&&visit.status!=='requested')
    rows.push({key:'v:'+visit.id,date:visit.date,time:visit.time,title:visit.title,detail:[visit.customer,visit.address].join(' · '),kind:'visit',closed:visit.status==='completed'||visit.status==='cancelled',visitId:visit.id});
  return rows.filter(row=>includeClosed||!row.closed).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99:99').localeCompare(b.time||'99:99')||a.key.localeCompare(b.key));
}
