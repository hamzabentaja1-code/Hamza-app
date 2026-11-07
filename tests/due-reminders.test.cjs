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
test('reminder generation rejects invalid dates and horizons',()=>{
 assert.throws(()=>buildDueReminders({...base,today:'bad'}),/تاريخ التذكيرات/);
 assert.throws(()=>buildDueReminders({...base,horizonDays:0}),/نطاق التذكيرات/);
});

test('local reminders are opt-in, persisted and scheduled from invoice, supplier and recurring-expense due dates',()=>{
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
