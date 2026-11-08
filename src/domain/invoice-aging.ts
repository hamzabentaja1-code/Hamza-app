export type AgingInvoice={id:number;number:string;customerName:string;dueDate?:string;total:number;paidCentimes?:number;creditedCentimes?:number;status:string};
export type OverdueInvoice=AgingInvoice&{remainingCentimes:number;overdueDays:number};

function isoDate(value:string):Date|null{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const date=new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==value?null:date;
}

export function getOverdueInvoices(invoices:AgingInvoice[],today:string):OverdueInvoice[]{
  const current=isoDate(today);
  if(!current)throw new Error('تاريخ اليوم غير صالح');
  return invoices.flatMap(invoice=>{
    if(invoice.status==='paid'||!invoice.dueDate)return [];
    const due=isoDate(invoice.dueDate);
    const totalCentimes=Math.round(invoice.total*100);
    const paid=invoice.paidCentimes||0;
    const credited=invoice.creditedCentimes||0;
    if(!due||due>=current||!Number.isSafeInteger(totalCentimes)||totalCentimes<=0||!Number.isSafeInteger(paid)||paid<0||!Number.isSafeInteger(credited)||credited<0)return [];
    const remainingCentimes=totalCentimes-paid-credited;
    if(remainingCentimes<=0)return [];
    return [{...invoice,remainingCentimes,overdueDays:Math.floor((current.getTime()-due.getTime())/86400000)}];
  }).sort((a,b)=>a.dueDate!.localeCompare(b.dueDate!));
}
