export type EquipmentStatus='متاح'|'مستعمل'|'صيانة';
export type TechnicianEquipment={id:number;name:string;category:string;serialNumber?:string;technicianId?:number;status:EquipmentStatus;note?:string};
export type EquipmentInput={name:string;category:string;serialNumber?:string;technicianId?:number;status:EquipmentStatus;note?:string};
const statuses:EquipmentStatus[]=['متاح','مستعمل','صيانة'];

export function createEquipment(input:EquipmentInput,id:number,existing:readonly TechnicianEquipment[]=[],technicianIds:readonly number[]=[]):TechnicianEquipment{
  const name=input.name.trim(),category=input.category.trim(),serialNumber=input.serialNumber?.trim(),note=input.note?.trim();
  if(!Number.isSafeInteger(id)||id<=0||existing.some(item=>item.id===id))throw new Error('معرف المعدة غير صالح أو مستعمل.');
  if(!name)throw new Error('دخل اسم المعدة.');
  if(!category)throw new Error('دخل تصنيف المعدة.');
  if(name.length>100||category.length>60||serialNumber&&serialNumber.length>80||note&&note.length>250)throw new Error('معلومات المعدة طويلة بزاف.');
  if(serialNumber&&existing.some(item=>item.serialNumber?.toLocaleLowerCase()===serialNumber.toLocaleLowerCase()))throw new Error('الرقم التسلسلي مسجل من قبل.');
  if(input.technicianId!==undefined&&(!Number.isSafeInteger(input.technicianId)||!technicianIds.includes(input.technicianId)))throw new Error('التقني المسؤول على المعدة غير موجود.');
  if(!statuses.includes(input.status))throw new Error('حالة المعدة غير صالحة.');
  return {id,name,category,...(serialNumber?{serialNumber}:{}),...(input.technicianId!==undefined?{technicianId:input.technicianId}:{}),status:input.status,...(note?{note}:{})};
}

export function updateEquipment(records:readonly TechnicianEquipment[],id:number,input:EquipmentInput,technicianIds:readonly number[]=[]):TechnicianEquipment[]{
  if(!records.some(item=>item.id===id))throw new Error('المعدة غير موجودة.');
  const updated=createEquipment(input,id,records.filter(item=>item.id!==id),technicianIds);
  return records.map(item=>item.id===id?updated:item);
}

export function normalizeEquipment(value:unknown,technicianIds:readonly number[]=[]):TechnicianEquipment[]{
  if(!Array.isArray(value))return [];
  const result:TechnicianEquipment[]=[];
  for(const raw of value){
    if(typeof raw!=='object'||raw===null)continue;
    const item=raw as Partial<TechnicianEquipment>;
    try{result.push(createEquipment({name:typeof item.name==='string'?item.name:'',category:typeof item.category==='string'?item.category:'',serialNumber:typeof item.serialNumber==='string'?item.serialNumber:undefined,technicianId:typeof item.technicianId==='number'?item.technicianId:undefined,status:statuses.includes(item.status as EquipmentStatus)?item.status as EquipmentStatus:'متاح',note:typeof item.note==='string'?item.note:undefined},Number(item.id),result,technicianIds));}catch{}
  }
  return result;
}
