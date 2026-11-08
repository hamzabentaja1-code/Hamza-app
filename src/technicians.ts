export type Technician={id:string;name:string;phone?:string;specialty:string;hourlyRateCentimes:number;active:boolean};

export function validateTechnician(technician:Technician,existing:Technician[]=[]):string[]{
  const errors:string[]=[];
  if(!technician.id.trim()||existing.some(item=>item.id===technician.id))errors.push('معرف الفني ناقص أو مستعمل');
  if(!technician.name.trim())errors.push('اسم الفني إجباري');
  if(existing.some(item=>item.id!==technician.id&&item.name.trim().toLowerCase()===technician.name.trim().toLowerCase()))errors.push('اسم الفني مسجل من قبل');
  if(!technician.specialty.trim())errors.push('تخصص الفني إجباري');
  if(!Number.isSafeInteger(technician.hourlyRateCentimes)||technician.hourlyRateCentimes<0)errors.push('الأجرة بالساعة غير صالحة');
  if(typeof technician.active!=='boolean')errors.push('حالة الفني غير صالحة');
  return errors;
}
