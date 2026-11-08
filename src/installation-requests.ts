export type InstallationType='cctv'|'intercom'|'electrical'|'network'|'maintenance'|'other';
export type InstallationRequestStatus='new'|'scheduled'|'in_progress'|'completed'|'cancelled';
export type InstallationRequest={id:string;customerId:number;projectId?:number;technicianIds?:string[];equipmentIds?:string[];type:InstallationType;siteAddress:string;requestedDate:string;status:InstallationRequestStatus;notes?:string;createdAt:string};

function validDate(value:string):boolean{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [year,month,day]=value.split('-').map(Number);const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
}

export function validateInstallationRequest(request:InstallationRequest,existing:InstallationRequest[]=[],customerIds:number[]=[],projectIds:number[]=[],technicianIds:string[]=[],equipmentIds:string[]=[]):string[]{
  const errors:string[]=[];
  if(!request.id.trim()||existing.some(item=>item.id===request.id))errors.push('معرف طلب التركيب ناقص أو مستعمل');
  if(!Number.isSafeInteger(request.customerId)||request.customerId<=0||(customerIds.length>0&&!customerIds.includes(request.customerId)))errors.push('اختار زبون مسجل');
  if(request.projectId!==undefined&&(!Number.isSafeInteger(request.projectId)||request.projectId<=0||(projectIds.length>0&&!projectIds.includes(request.projectId))))errors.push('المشروع المرتبط بطلب التركيب غير صالح');
  if((request.technicianIds||[]).some(id=>!technicianIds.includes(id)))errors.push('الفني المرتبط بطلب التركيب غير صالح');
  if((request.equipmentIds||[]).some(id=>!equipmentIds.includes(id)))errors.push('المعدة المرتبطة بطلب التركيب غير صالحة');
  if(['scheduled','in_progress'].includes(request.status)){const equipmentSet=new Set(request.equipmentIds||[]);const conflict=existing.some(item=>item.id!==request.id&&item.requestedDate===request.requestedDate&&['scheduled','in_progress'].includes(item.status)&&(item.equipmentIds||[]).some(id=>equipmentSet.has(id)));if(conflict)errors.push('المعدة محجوزة لطلب آخر في نفس التاريخ');}
  if(!['cctv','intercom','electrical','network','maintenance','other'].includes(request.type))errors.push('نوع طلب التركيب غير صالح');
  if(!request.siteAddress.trim())errors.push('عنوان موقع التركيب إجباري');
  if(!validDate(request.requestedDate))errors.push('تاريخ طلب التركيب غير صالح');
  if(!['new','scheduled','in_progress','completed','cancelled'].includes(request.status))errors.push('حالة طلب التركيب غير صالحة');
  if(!request.createdAt||Number.isNaN(Date.parse(request.createdAt)))errors.push('تاريخ إنشاء طلب التركيب غير صالح');
  return errors;
}

const transitions:Record<InstallationRequestStatus,InstallationRequestStatus[]>={new:['scheduled','cancelled'],scheduled:['in_progress','cancelled'],in_progress:['completed','cancelled'],completed:[],cancelled:[]};
export function changeInstallationRequestStatus(request:InstallationRequest,next:InstallationRequestStatus):InstallationRequest{
  if(!transitions[request.status]?.includes(next))throw new Error('تغيير حالة طلب التركيب غير مسموح');
  return {...request,status:next};
}
