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


const {buildAgendaMonthGrid}=require('../.test-build/agenda.js');
test('builds a Monday-first month grid with events grouped by exact date',()=>{
 const events=[
  {id:'a',type:'task',title:'Task A',date:'2026-11-02',subtitle:'',status:'todo',overdue:false},
  {id:'b',type:'invoice_due',title:'Invoice',date:'2026-11-02',subtitle:'',status:'unpaid',overdue:false},
  {id:'c',type:'work_order',title:'Outside',date:'2026-12-01',subtitle:'',status:'scheduled',overdue:false},
 ];
 const days=buildAgendaMonthGrid(2026,11,events);
 assert.equal(days.length,42);
 assert.equal(days[0].date,'2026-10-26');
 assert.equal(days[0].inMonth,false);
 const second=days.find(x=>x.date==='2026-11-02');
 assert.equal(second.inMonth,true);
 assert.deepEqual(second.events.map(x=>x.id),['a','b']);
 assert.equal(days.at(-1).date,'2026-12-06');
});
test('month grid handles 28-day and 31-day months and rejects invalid settings',()=>{
 assert.equal(buildAgendaMonthGrid(2026,2,[]).length,35);
 assert.equal(buildAgendaMonthGrid(2026,3,[]).length,42);
 assert.throws(()=>buildAgendaMonthGrid(2026,13,[]),/التقويم غير صالحة/);
 assert.throws(()=>buildAgendaMonthGrid(2026,1,[],7),/التقويم غير صالحة/);
});

const {filterAgendaEvents}=require('../.test-build/agenda.js');
test('agenda filters type, overdue state and customer/title text without changing date order',()=>{
 const events=[
 {id:'a',type:'task',title:'Caméra Casablanca',date:'2026-11-05',subtitle:'Hamza',status:'todo',overdue:true},
 {id:'b',type:'work_order',title:'Installation',date:'2026-11-06',subtitle:'Médiouna',status:'scheduled',overdue:false},
 {id:'c',type:'invoice_due',title:'FAC-7',date:'2026-11-07',subtitle:'Client Casa',status:'partial',overdue:true},
 ];
 assert.deepEqual(filterAgendaEvents(events,{type:'all',overdueOnly:true,query:''}).map(x=>x.id),['a','c']);
 assert.deepEqual(filterAgendaEvents(events,{type:'task',overdueOnly:false,query:'CAMÉRA'}).map(x=>x.id),['a']);
 assert.deepEqual(filterAgendaEvents(events,{type:'all',overdueOnly:false,query:'casa'}).map(x=>x.id),['a','c']);
 assert.deepEqual(filterAgendaEvents(events,{type:'work_order',overdueOnly:true,query:''}),[]);
 assert.deepEqual(filterAgendaEvents(events,{type:'all',overdueOnly:false,query:''}),events);
});
test('agenda UI exposes accessible filters and renders filtered events',()=>{
 const fs=require('node:fs');
 const app=fs.readFileSync('src/AgendaWorkspace.tsx','utf8');
 assert.match(app,/filterAgendaEvents\(result\.events/);
 assert.match(app,/\{filteredEvents\.map\(event/);
 assert.match(app,/accessibilityState=\{\{selected:eventType===option\.value\}\}/);
 assert.match(app,/accessibilityState=\{\{selected:overdueOnly\}\}/);
});
