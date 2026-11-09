export type WorkOrderCategory='installation'|'maintenance'|'repair'|'inspection';
export const WORK_ORDER_CATEGORIES:WorkOrderCategory[]=['installation','maintenance','repair','inspection'];
export type Technician={id:string;name:string;phone?:string;specialty?:string;hourlyRate:number;active:boolean;permissions?:WorkOrderCategory[]};
export type Equipment={id:string;name:string;category?:string;reference?:string;serialNumber?:string;status:'available'|'assigned'|'maintenance';notes?:string};
export type WorkOrderStatus='requested'|'scheduled'|'in_progress'|'completed'|'cancelled';
export type WorkOrderPriority='low'|'normal'|'high'|'urgent';
export type WorkOrder={id:string;number:string;title:string;customerName:string;projectId?:number;description:string;category?:WorkOrderCategory;status:WorkOrderStatus;priority:WorkOrderPriority;scheduledAt?:string;technicianId?:string;equipmentIds:string[];createdAt:string;notes?:string;settlement?:WorkOrderSettlement;evidence?:WorkOrderEvidence[]};
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
 if(order.technicianId&&order.technicianId!==technician.id)throw new Error('التقني غير مخول لهذا أمر العمل');
 if(order.category&&!technicianCanPerform(technician,order.category))throw new Error('التقني غير مخول لهذا النوع من الأعمال');
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


export type WorkOrderSettlementStatus='unquoted'|'unpaid'|'partial'|'settled';
export type WorkOrderSettlementPayment={id:string;amountCentimes:number;date:string;method:'cash'|'transfer'|'card'|'cheque';note?:string};
export type WorkOrderSettlement={quotedAmountCentimes:number;payments:WorkOrderSettlementPayment[];paidCentimes:number;balanceCentimes:number;status:WorkOrderSettlementStatus};

/** Validates and summarizes a work order's customer settlement without floating-point money arithmetic. */
export function summarizeWorkOrderSettlement(quotedAmountCentimes:number,payments:WorkOrderSettlementPayment[]):WorkOrderSettlement{
 if(!Number.isSafeInteger(quotedAmountCentimes)||quotedAmountCentimes<0)throw new Error('مبلغ أمر العمل غير صالح');
 if(!Array.isArray(payments))throw new Error('سجل الأداءات غير صالح');
 const ids=new Set<string>();
 let paidCentimes=0;
 for(const payment of payments){
  if(!payment.id.trim()||ids.has(payment.id)||!Number.isSafeInteger(payment.amountCentimes)||payment.amountCentimes<=0||
   !validDate(payment.date)||!['cash','transfer','card','cheque'].includes(payment.method)||
   (payment.note!==undefined&&typeof payment.note!=='string'))throw new Error('بيانات أداء أمر العمل غير صالحة');
  ids.add(payment.id);paidCentimes+=payment.amountCentimes;
  if(!Number.isSafeInteger(paidCentimes))throw new Error('مجموع الأداءات تجاوز الحد المسموح');
 }
 if(paidCentimes>quotedAmountCentimes)throw new Error('مجموع الأداءات تجاوز المبلغ المتفق عليه');
 const balanceCentimes=quotedAmountCentimes-paidCentimes;
 const status=quotedAmountCentimes===0?'unquoted':paidCentimes===0?'unpaid':balanceCentimes===0?'settled':'partial';
 return {quotedAmountCentimes,payments:payments.map(payment=>({...payment})),paidCentimes,balanceCentimes,status};
}

/** Adds one partial/full payment; duplicate IDs, overpayments and invalid dates are rejected atomically. */
export function addWorkOrderSettlementPayment(
 current:WorkOrderSettlement,
 payment:WorkOrderSettlementPayment,
):WorkOrderSettlement{
 const validated=summarizeWorkOrderSettlement(current.quotedAmountCentimes,current.payments);
 return summarizeWorkOrderSettlement(validated.quotedAmountCentimes,[...validated.payments,payment]);
}

export type WorkOrderEvidence = {id:string;dataUri:string;createdAt:string;caption?:string};
export const MAX_WORK_ORDER_EVIDENCE = 4;
const MAX_WORK_ORDER_EVIDENCE_URI_LENGTH = 1_500_000;
const evidenceImagePattern = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

function validateEvidenceFile(file:unknown):file is WorkOrderEvidence {
 if(!file||typeof file!=='object'||Array.isArray(file))return false;
 const item=file as Record<string,unknown>;
 return typeof item.id==='string'&&item.id.trim().length>0&&item.id.length<=120&&
  typeof item.dataUri==='string'&&item.dataUri.length<=MAX_WORK_ORDER_EVIDENCE_URI_LENGTH&&
  evidenceImagePattern.test(item.dataUri)&&
  typeof item.createdAt==='string'&&validDate(item.createdAt)&&
  (item.caption===undefined||(typeof item.caption==='string'&&item.caption.length<=160));
}

/** Older work orders may not have any photo evidence. */
export function normalizeWorkOrderEvidence(value:unknown):WorkOrderEvidence[] {
 if(!Array.isArray(value))return [];
 const results:WorkOrderEvidence[]=[];
 const ids=new Set<string>();
 for(const item of value){
  if(!validateEvidenceFile(item)||ids.has(item.id))continue;
  ids.add(item.id);
  results.push({...item});
  if(results.length===MAX_WORK_ORDER_EVIDENCE)break;
 }
 return results;
}

export function addWorkOrderEvidence(order:WorkOrder,file:WorkOrderEvidence):WorkOrder {
 if(!validateEvidenceFile(file))throw new Error('صورة العمل غير صالحة أو أكبر من الحد المسموح');
 const previous=normalizeWorkOrderEvidence(order.evidence);
 if(previous.length>=MAX_WORK_ORDER_EVIDENCE)throw new Error('الحد الأقصى أربع صور لكل أمر عمل');
 if(previous.some(item=>item.id===file.id))throw new Error('صورة العمل مسجلة من قبل');
 return {...order,evidence:[...previous,{...file}]};
}

export function removeWorkOrderEvidence(order:WorkOrder,evidenceId:string):WorkOrder {
 const previous=normalizeWorkOrderEvidence(order.evidence);
 if(!previous.some(item=>item.id===evidenceId))throw new Error('صورة العمل غير موجودة');
 return {...order,evidence:previous.filter(item=>item.id!==evidenceId)};
}
