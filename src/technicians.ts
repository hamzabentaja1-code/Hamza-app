export type Technician={id:number;name:string;phone?:string;specialty?:string;hourlyRate:number};

export function createTechnician(input:{name:string;phone?:string;specialty?:string;hourlyRate:number},id:number,existing:readonly Technician[]=[]):Technician{
  const name=input.name.trim(),phone=input.phone?.trim(),specialty=input.specialty?.trim(),hourlyRate=Number(input.hourlyRate);
  if(!Number.isSafeInteger(id)||id<=0||existing.some(item=>item.id===id))throw new Error('معرف التقني غير صالح أو مستعمل.');
  if(!name)throw new Error('دخل اسم التقني.');
  if(existing.some(item=>item.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new Error('اسم التقني مسجل من قبل.');
  if(!Number.isFinite(hourlyRate)||hourlyRate<0||!Number.isSafeInteger(Math.round(hourlyRate*100)))throw new Error('دخل أجرة الساعة صحيحة أو صفر.');
  if(phone&&phone.length>40)throw new Error('رقم هاتف التقني طويل بزاف.');
  if(specialty&&specialty.length>100)throw new Error('تخصص التقني طويل بزاف.');
  return {id,name,hourlyRate:Math.round(hourlyRate*100)/100,...(phone?{phone}:{}),...(specialty?{specialty}:{})};
}

export function updateTechnician(technicians:readonly Technician[],id:number,input:{name:string;phone?:string;specialty?:string;hourlyRate:number}):Technician[]{
  const current=technicians.find(item=>item.id===id);
  if(!current)throw new Error('التقني غير موجود.');
  const updated=createTechnician(input,id,technicians.filter(item=>item.id!==id));
  return technicians.map(item=>item.id===id?updated:item);
}

export function normalizeTechnicians(value:unknown):Technician[]{
  if(!Array.isArray(value))return [];
  const result:Technician[]=[];
  for(const raw of value){
    if(typeof raw!=='object'||raw===null)continue;
    const item=raw as Partial<Technician>;
    try{result.push(createTechnician({name:typeof item.name==='string'?item.name:'',phone:typeof item.phone==='string'?item.phone:undefined,specialty:typeof item.specialty==='string'?item.specialty:undefined,hourlyRate:Number(item.hourlyRate)},Number(item.id),result));}catch{}
  }
  return result;
}
