const test=require('node:test');const assert=require('node:assert/strict');
const {agendaDateKey,buildAgendaEvents}=require('../.test-build/agenda.js');
test('agenda normalizes ISO and Moroccan day/month/year dates',()=>{
 assert.equal(agendaDateKey('2026-11-07T10:00:00.000Z'),'2026-11-07');
 assert.equal(agendaDateKey('07/11/2026'),'2026-11-07');
 assert.equal(agendaDateKey('31/02/2026'),null);
});
test('agenda combines tasks, work orders, recurring expenses and unpaid invoices in date order',()=>{
 const events=buildAgendaEvents({fromDate:'2026-11-01',toDate:'2026-11-30',today:'2026-11-07',
 tasks:[{id:1,title:'مهمة متأخرة',dueDate:'06/11/2026',status:'todo',assignee:'تقني'}],
 workOrders:[{id:'wo1',number:'WO-1',title:'تركيب',scheduledAt:'2026-11-08T10:00:00Z',status:'scheduled',customerName:'زبون'}],
 recurringExpenses:[{id:'rent',title:'كراء',nextDueDate:'2026-11-05',active:true,amount:2000}],
 invoices:[{id:5,number:'FAC-5',dueDate:'2026-11-10',customerName:'عميل',status:'partial',total:500,paidCentimes:10000}]});
 assert.deepEqual(events.map(e=>e.type),['recurring_expense','task','work_order','invoice_due']);
 assert.equal(events.find(e=>e.type==='task').overdue,true);
 assert.equal(events.find(e=>e.type==='work_order').overdue,false);
});
test('agenda omits inactive recurring rules, settled invoices and events outside the range',()=>{
 const events=buildAgendaEvents({fromDate:'2026-11-01',toDate:'2026-11-09',today:'2026-11-07',tasks:[],workOrders:[],recurringExpenses:[{id:'x',title:'x',nextDueDate:'2026-11-04',active:false,amount:1}],invoices:[{id:1,number:'FAC',dueDate:'2026-11-08',customerName:'c',status:'paid',total:10,paidCentimes:1000}]});
 assert.equal(events.length,0);
});
test('agenda rejects invalid and reversed date ranges',()=>{
 assert.throws(()=>buildAgendaEvents({fromDate:'bad',toDate:'2026-11-10',today:'2026-11-07',tasks:[],workOrders:[],recurringExpenses:[],invoices:[]}),/غير صالح/);
 assert.throws(()=>buildAgendaEvents({fromDate:'2026-11-10',toDate:'2026-11-01',today:'2026-11-07',tasks:[],workOrders:[],recurringExpenses:[],invoices:[]}),/غير صالح/);
});
