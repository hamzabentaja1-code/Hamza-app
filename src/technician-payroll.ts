import {ProjectRecord,ProjectTimeEntry} from './projects';
import {Technician} from './technicians';

export type PayrollMethod='نقداً'|'بطاقة'|'تحويل';
export type PayrollSettlement={id:number;technicianId:number;technicianName:string;date:string;amountCentimes:number;method:PayrollMethod;bankAccountId?:string;note?:string};
export type TechnicianPayrollRow={technicianId:number;technicianName:string;earnedCentimes:number;paidCentimes:number;dueCentimes:number};
const validDate=(value:string)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const parsed=new Date(value+'T00:00:00.000Z');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;};

export function calculateTechnicianPayroll(projects:readonly ProjectRecord[],technicians:readonly Technician[],settlements:readonly PayrollSettlement[]):TechnicianPayrollRow[]{
  return technicians.map(technician=>{
    const entries=projects.flatMap(project=>project.timeEntries).filter(entry=>entry.technicianId===technician.id||entry.technicianId===undefined&&entry.technician.trim().toLocaleLowerCase()===technician.name.trim().toLocaleLowerCase());
    const earnedCentimes=entries.reduce((sum,entry)=>sum+Math.round(entry.hours*entry.hourlyRate*100),0);
    const paidCentimes=settlements.filter(item=>item.technicianId===technician.id).reduce((sum,item)=>sum+item.amountCentimes,0);
    return {technicianId:technician.id,technicianName:technician.name,earnedCentimes,paidCentimes,dueCentimes:Math.max(0,earnedCentimes-paidCentimes)};
  });
}

export function createPayrollSettlement(input:{technician:Technician;amount:number;method:PayrollMethod;date:string;bankAccountId?:string;note?:string;id:number;dueCentimes:number},existing:readonly PayrollSettlement[]=[]):PayrollSettlement{
  const amountCentimes=Math.round(input.amount*100),date=input.date.trim(),note=input.note?.trim();
  if(!Number.isSafeInteger(input.id)||input.id<=0||existing.some(item=>item.id===input.id))throw new Error('معرف تسوية الأجر غير صالح أو مستعمل.');
  if(!Number.isSafeInteger(input.dueCentimes)||input.dueCentimes<0)throw new Error('حساب الأجرة غير موجود.');
  if(!Number.isFinite(input.amount)||input.amount<=0||!Number.isSafeInteger(amountCentimes)||amountCentimes<=0)throw new Error('دخل مبلغ أداء صحيحاً أكبر من صفر.');
  if(amountCentimes>input.dueCentimes)throw new Error('مبلغ الأداء أكبر من أجرة التقني المستحقة.');
  if(!validDate(date))throw new Error('دخل تاريخاً صحيحاً بصيغة YYYY-MM-DD.');
  if(!['نقداً','بطاقة','تحويل'].includes(input.method))throw new Error('طريقة أداء الأجرة غير صالحة.');
  const bankAccountId=input.bankAccountId?.trim();
  if(input.method!=='نقداً'&&!bankAccountId)throw new Error('اختار الحساب البنكي لأداء الأجرة.');
  if(note&&note.length>200)throw new Error('ملاحظة التسوية طويلة بزاف.');
  return {id:input.id,technicianId:input.technician.id,technicianName:input.technician.name,date,amountCentimes,method:input.method,...(input.method!=='نقداً'&&bankAccountId?{bankAccountId}:{}),...(note?{note}:{})};
}

export function normalizePayrollSettlements(value:unknown,technicians:readonly Technician[]):PayrollSettlement[]{
  if(!Array.isArray(value))return [];
  const result:PayrollSettlement[]=[];
  for(const raw of value){
    if(typeof raw!=='object'||raw===null)continue;
    const item=raw as Partial<PayrollSettlement>,technician=technicians.find(record=>record.id===item.technicianId);
    if(!technician||!Number.isSafeInteger(item.amountCentimes)||Number(item.amountCentimes)<=0||typeof item.id!=='number'||!Number.isSafeInteger(item.id)||item.id<=0||!['نقداً','بطاقة','تحويل'].includes(item.method||'')||typeof item.date!=='string'||!validDate(item.date))continue;
    if(item.method!=='نقداً'&&(!item.bankAccountId||typeof item.bankAccountId!=='string'))continue;
    if(result.some(record=>record.id===item.id))continue;
    result.push({id:item.id!,technicianId:technician.id,technicianName:technician.name,date:item.date,amountCentimes:item.amountCentimes!,method:item.method as PayrollMethod,...(item.method!=='نقداً'?{bankAccountId:item.bankAccountId}:{}),...(typeof item.note==='string'&&item.note.trim()?{note:item.note.trim().slice(0,200)}:{})});
  }
  return result;
}
