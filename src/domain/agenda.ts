export type AgendaEventType='task'|'work_order'|'recurring_expense'|'invoice_due';
export type AgendaEvent={id:string;type:AgendaEventType;title:string;date:string;subtitle:string;status:string;overdue:boolean};
export type AgendaTask={id:number;title:string;dueDate:string;status:string;assignee?:string};
export type AgendaWorkOrder={id:string;number:string;title:string;scheduledAt?:string;status:string;customerName:string};
export type AgendaRecurringExpense={id:string;title:string;nextDueDate:string;active:boolean;amount:number};
export type AgendaInvoice={id:number;number:string;dueDate?:string;customerName:string;status:string;paidCentimes?:number;total:number};

export function agendaDateKey(value:string):string|null{
 if(!value)return null;
 const iso=value.match(/^(\d{4}-\d{2}-\d{2})/);
 if(iso){const date=new Date(iso[1]+'T00:00:00.000Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===iso[1]?iso[1]:null;}
 const local=value.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
 if(local){const day=Number(local[1]),month=Number(local[2]),year=Number(local[3]);const date=new Date(Date.UTC(year,month-1,day));return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day?date.toISOString().slice(0,10):null;}
 return null;
}
export function buildAgendaEvents(input:{
 tasks:AgendaTask[];workOrders:AgendaWorkOrder[];recurringExpenses:AgendaRecurringExpense[];invoices:AgendaInvoice[];
 fromDate:string;toDate:string;today:string;
}):AgendaEvent[]{
 const from=agendaDateKey(input.fromDate),to=agendaDateKey(input.toDate),today=agendaDateKey(input.today);
 if(!from||!to||!today||from>to)throw new Error('نطاق تاريخ الأجندة غير صالح');
 const events:AgendaEvent[]=[];
 for(const task of input.tasks){const date=agendaDateKey(task.dueDate);if(date)events.push({id:'task-'+task.id,type:'task',title:task.title,date,subtitle:task.assignee||'',status:task.status,overdue:date<today&&!['done','completed','cancelled'].includes(task.status)});}
 for(const order of input.workOrders){const date=order.scheduledAt?agendaDateKey(order.scheduledAt):null;if(date)events.push({id:'work-'+order.id,type:'work_order',title:order.number+' • '+order.title,date,subtitle:order.customerName,status:order.status,overdue:date<today&&!['completed','cancelled'].includes(order.status)});}
 for(const rule of input.recurringExpenses){const date=rule.active?agendaDateKey(rule.nextDueDate):null;if(date)events.push({id:'recurring-'+rule.id,type:'recurring_expense',title:rule.title,date,subtitle:rule.amount.toFixed(2)+' DH',status:'active',overdue:date<today});}
 for(const invoice of input.invoices){const date=invoice.dueDate?agendaDateKey(invoice.dueDate):null;const outstanding=invoice.total*100-(invoice.paidCentimes||0);if(date&&outstanding>0)events.push({id:'invoice-'+invoice.id,type:'invoice_due',title:invoice.number,date,subtitle:invoice.customerName+' • '+(outstanding/100).toFixed(2)+' DH',status:invoice.status,overdue:date<today});}
 return events.filter(e=>e.date>=from&&e.date<=to).sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title));
}
