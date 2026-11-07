const test=require('node:test');const assert=require('node:assert/strict');
const {buildDueReminders}=require('../.test-build/due-reminders.js');
const today='2026-11-07';
const base={today,invoices:[],purchases:[],suppliers:[],recurringExpenses:[]};
test('builds reminders for unpaid invoices with due dates',()=>{
 const reminders=buildDueReminders({...base,invoices:[{id:1,number:'FAC-1',customerName:'Client',total:250,paidCentimes:5000,dueDate:'2026-11-09'},{id:2,number:'FAC-2',customerName:'Paid',total:100,paidCentimes:10000,dueDate:'2026-11-08'}]});
 assert.equal(reminders.length,1);assert.equal(reminders[0].id,'invoice-1');assert.match(reminders[0].body,/200\.00 DH/);
});
test('builds supplier due reminders from payment terms and unpaid balance',()=>{
 const reminders=buildDueReminders({...base,suppliers:[{name:'Supplier',paymentTermsDays:30}],purchases:[{id:7,supplierName:'Supplier',total:500,paidCentimes:10000,returnedCentimes:5000,date:'2026-10-10'}]});
 assert.equal(reminders.length,1);assert.equal(reminders[0].id,'supplier-7');assert.equal(reminders[0].date,'2026-11-09');assert.match(reminders[0].body,/350\.00 DH/);
});
test('builds active recurring expense reminders and ignores inactive or out-of-window items',()=>{
 const reminders=buildDueReminders({...base,recurringExpenses:[{id:'r1',title:'كراء',amount:2000,nextDueDate:'2026-11-10',active:true},{id:'r2',title:'قديم',amount:100,nextDueDate:'2026-11-08',active:false},{id:'r3',title:'بعيد',amount:100,nextDueDate:'2027-12-01',active:true}]});
 assert.deepEqual(reminders.map(x=>x.id),['recurring-r1']);
});
test('builds reminders for upcoming open tasks and ignores completed tasks',()=>{
 const reminders=buildDueReminders({...base,tasks:[
  {id:11,title:'Installation visit',assignee:'Tech A',dueDate:'2026-11-08',status:'todo'},
  {id:12,title:'Completed task',assignee:'Tech B',dueDate:'2026-11-09',status:'done'},
  {id:13,title:'Far task',assignee:'Tech C',dueDate:'2027-12-01',status:'doing'}
 ]});
 assert.equal(reminders.length,1);assert.equal(reminders[0].id,'task-11');assert.equal(reminders[0].kind,'task');
 assert.equal(reminders[0].title,'موعد مهمة: Installation visit');assert.equal(reminders[0].body,'المسؤول: Tech A');
 const french=buildDueReminders({...base,language:'FR',tasks:[{id:14,title:'Visit',assignee:'Tech D',dueDate:'2026-11-09',status:'doing'}]})[0];
 assert.equal(french.title,'Échéance de tâche : Visit');assert.equal(french.body,'Responsable : Tech D');
});
test('reminder generation rejects invalid dates and horizons',()=>{
 assert.throws(()=>buildDueReminders({...base,today:'bad'}),/تاريخ التذكيرات/);
 assert.throws(()=>buildDueReminders({...base,horizonDays:0}),/نطاق التذكيرات/);
});

test('local reminders are opt-in, persisted and scheduled from invoice, supplier, recurring-expense and task due dates',()=>{
 const fs=require('node:fs');const path=require('node:path');const root=path.join(__dirname,'..');
 const app=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
 const service=fs.readFileSync(path.join(root,'src','local-notifications.ts'),'utf8');
 const config=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 assert.ok(pkg.dependencies['expo-notifications']);
 assert.ok(config.expo.plugins.some(plugin=>Array.isArray(plugin)&&plugin[0]==='expo-notifications'&&plugin[1].enableRemoteNotifications===false));
 assert.match(app,/notificationsEnabled,setNotificationsEnabled/);
 assert.match(app,/buildDueReminders\(/);
 assert.match(app,/syncScheduledDueNotifications\(dueReminders\)/);
 assert.match(app,/requestLocalNotificationPermission\(\)/);
 assert.match(app,/cancelScheduledDueNotifications\(\)/);
 assert.match(app,/createBackup\([\s\S]*?notificationsEnabled/);
 assert.match(service,/scheduleNotificationAsync/);
 assert.match(service,/cancelScheduledNotificationAsync/);
});

test('due reminder notification text follows the selected French or Arabic language',()=>{
 const invoice={id:4,number:'FAC-4',customerName:'Client',total:120,paidCentimes:2000,dueDate:'2026-11-09'};
 const french=buildDueReminders({...base,language:'FR',invoices:[invoice]})[0];
 const arabic=buildDueReminders({...base,language:'AR',invoices:[invoice]})[0];
 assert.equal(french.title,'Échéance de facture : FAC-4');
 assert.match(french.body,/Reste 100\.00 DH/);
 assert.equal(arabic.title,'أجل فاتورة: FAC-4');
 assert.match(arabic.body,/المتبقي 100\.00 DH/);
});
