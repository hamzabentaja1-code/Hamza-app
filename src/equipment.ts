export type EquipmentStatus='available'|'maintenance'|'retired';
export type EquipmentItem={id:string;name:string;category:string;serial?:string;status:EquipmentStatus};
export function validateEquipment(item:EquipmentItem,existing:EquipmentItem[]=[]):string[]{
 const errors:string[]=[];
 if(!item.id.trim()||existing.some(current=>current.id===item.id))errors.push('معرف المعدة ناقص أو مستعمل');
 if(!item.name.trim())errors.push('اسم المعدة إجباري');
 if(!item.category.trim())errors.push('صنف المعدة إجباري');
 if(item.serial?.trim()&&existing.some(current=>current.id!==item.id&&current.serial?.trim().toLowerCase()===item.serial?.trim().toLowerCase()))errors.push('الرقم التسلسلي مسجل من قبل');
 if(!['available','maintenance','retired'].includes(item.status))errors.push('حالة المعدة غير صالحة');
 return errors;
}
