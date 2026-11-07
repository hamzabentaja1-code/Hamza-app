import {agendaDateKey} from './agenda';
export type DueReminderKind='invoice'|'supplier'|'recurring_expense';
export type DueReminder={id:string;kind:DueReminderKind;date:string;title:string;body:string};
export type ReminderInvoice={id:number;number:string;customerName:string;total:number;paidCentimes?:number;dueDate?:string};
export type ReminderPurchase={id:number;supplierName:string;total:number;paidCentimes?:number;returnedCentimes?:number;date:string};
export type ReminderSupplier={name:string;paymentTermsDays?:number};
export type ReminderRecurringExpense={id:string;title:string;amount:number;nextDueDate:string;active:boolean};
function addDays(dateKey:string,days:number):string{
 const date=new Date(dateKey+'T00:00:00.000Z');date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);
}
export function buildDueReminders(input:{today:string;language?:'AR'|'FR';horizonDays?:number;invoices:ReminderInvoice[];purchases:ReminderPurchase[];suppliers:ReminderSupplier[];recurringExpenses:ReminderRecurringExpense[]}):DueReminder[]{
 const language=input.language??'AR';const today=agendaDateKey(input.today);if(!today)throw new Error('تاريخ التذكيرات غير صالح');
 const horizon= input.horizonDays??90;if(!Number.isSafeInteger(horizon)||horizon<1||horizon>365)throw new Error('نطاق التذكيرات غير صالح');
 const last=addDays(today,horizon);const result:DueReminder[]=[];
 for(const invoice of input.invoices){const date=invoice.dueDate?agendaDateKey(invoice.dueDate):null;const outstanding=Math.round(invoice.total*100)-(invoice.paidCentimes||0);if(date&&date>=today&&date<=last&&outstanding>0)result.push({id:'invoice-'+invoice.id,kind:'invoice',date,title:(language==='FR'?'Échéance de facture : ':'أجل فاتورة: ')+invoice.number,body:invoice.customerName+(language==='FR'?' • Reste ':' • المتبقي ')+(outstanding/100).toFixed(2)+' DH'});}
 for(const purchase of input.purchases){const supplier=input.suppliers.find(item=>item.name===purchase.supplierName);if(supplier?.paymentTermsDays===undefined)continue;const issue=agendaDateKey(purchase.date);if(!issue)continue;const date=addDays(issue,supplier.paymentTermsDays);const outstanding=Math.round(purchase.total*100)-(purchase.paidCentimes||0)-(purchase.returnedCentimes||0);if(date>=today&&date<=last&&outstanding>0)result.push({id:'supplier-'+purchase.id,kind:'supplier',date,title:(language==='FR'?'Échéance fournisseur : ':'أجل أداء المورد: ')+purchase.supplierName,body:(language==='FR'?'Achat n° ':'الشراء رقم ')+purchase.id+(language==='FR'?' • Reste ':' • المتبقي ')+(outstanding/100).toFixed(2)+' DH'});}
 for(const rule of input.recurringExpenses){const date=agendaDateKey(rule.nextDueDate);if(rule.active&&date&&date>=today&&date<=last&&Number.isFinite(rule.amount)&&rule.amount>0)result.push({id:'recurring-'+rule.id,kind:'recurring_expense',date,title:(language==='FR'?'Dépense récurrente : ':'مصروف متكرر: ')+rule.title,body:(language==='FR'?'Montant prévu ':'موعد المصروف ')+(rule.amount).toFixed(2)+' DH'});}
 return result.sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title));
}
