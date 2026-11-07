export type WorkOrderCategory='installation'|'maintenance'|'repair'|'inspection';
export const WORK_ORDER_CATEGORIES:WorkOrderCategory[]=['installation','maintenance','repair','inspection'];
export type Technician={id:string;name:string;phone?:string;specialty?:string;hourlyRate:number;active:boolean;permissions?:WorkOrderCategory[]};
export type Equipment={id:string;name:string;category?:string;reference?:string;serialNumber?:string;status:'available'|'assigned'|'maintenance';notes?:string};
export type WorkOrderStatus='requested'|'scheduled'|'in_progress'|'completed'|'cancelled';
export type WorkOrderPriority='low'|'normal'|'high'|'urgent';
export type WorkOrder={id:string;number:string;title:string;customerName:string;projectId?:number;description:string;category?:WorkOrderCategory;status:WorkOrderStatus;priority:WorkOrderPriority;scheduledAt?:string;technicianId?:string;equipmentIds:string[];createdAt:string;notes?:string};
export type WorkTimeEntry={id:string;workOrderId:string;technicianId:string;date:string;hours:number;hourlyRate:number;costCentimes:number;notes?:string};

const validDate=(value:string)=>!!value.trim()&&Number.isFinite(Date.parse(value));
export function technicianCanPerform(technician:Technician,category:WorkOrderCategory):boolean{
 return !technician.permissions||technician.permissions.includes(category);
}

export function createWorkOrder(order:WorkOrder,technicians:Technician[],equipment:Equipment[]):WorkOrder{
 if(!order.id.trim()||!order.number.trim()||!order.title.trim()||!order.customerName.trim())throw new Error('رقم أمر العمل والعنوان والزبون مطلوبون');
 if(!validDate(order.createdAt)||(order.scheduledAt&&!validDate(order.scheduledAt)))throw new Error('تاريخ أمر العمل غير صالح');
 if(order.technicianId&&!technicians.some(t=>t.id===order.technicianId&&t.active))throw new Error('التقني المختار غير موجود أو غير نشط');
 if(order.technicianId&&order.category){const assigned=technicians.find(t=>t.id===order.technicianId);if(assigned&&!technicianCanPerform(assigned,order.category))throw new Error('التقني غير مخول لهذا النوع من الأعمال');}
 if(new Set(order.equipmentIds).size!==order.equipmentIds.length)throw new Error('المعدات مكررة في أمر العمل');
 for(const id of order.equipmentIds){const item=equipment.find(e=>e.id===id);if(!item||item.status!=='available')throw new Error('المعدة غير موجودة أو غير متاحة');}
 return {...order,equipmentIds:[...order.equipmentIds]};
}
const allowed:Record<WorkOrderStatus,WorkOrderStatus[]>={requested:['scheduled','cancelled'],scheduled:['in_progress','cancelled'],in_progress:['completed','cancelled'],completed:[],cancelled:[]};
export function transitionWorkOrderStatus(order:WorkOrder,next:WorkOrderStatus):WorkOrder{
 if(!allowed[order.status].includes(next))throw new Error('انتقال حالة أمر العمل غير مسموح');
 return {...order,status:next};
}
export function createWorkTimeEntry(entry:Omit<WorkTimeEntry,'costCentimes'>,order:WorkOrder,technician:Technician):WorkTimeEntry{
 if(!entry.id.trim()||!validDate(entry.date)||!Number.isFinite(entry.hours)||entry.hours<=0||entry.hours>24)throw new Error('تاريخ وساعات العمل غير صالحة');
 if(order.id!==entry.workOrderId||!['in_progress','completed'].includes(order.status))throw new Error('أمر العمل غير مفتوح لتسجيل الساعات');
 if(technician.id!==entry.technicianId||!technician.active)throw new Error('التقني غير صالح أو غير نشط');
 if(!Number.isFinite(entry.hourlyRate)||entry.hourlyRate<0)throw new Error('سعر ساعة العمل غير صالح');
 return {...entry,costCentimes:Math.round(entry.hours*entry.hourlyRate*100)};
}
export function workOrderTimeCost(entries:WorkTimeEntry[],workOrderId:string):number{
 return entries.filter(e=>e.workOrderId===workOrderId).reduce((sum,e)=>sum+e.costCentimes,0);
}
export function workOrderHours(entries:WorkTimeEntry[],workOrderId:string):number{
 return entries.filter(e=>e.workOrderId===workOrderId).reduce((sum,e)=>sum+e.hours,0);
}
export function technicianTimeCost(entries:WorkTimeEntry[],technicianId:string):number{
 return entries.filter(e=>e.technicianId===technicianId).reduce((sum,e)=>sum+e.costCentimes,0);
}
