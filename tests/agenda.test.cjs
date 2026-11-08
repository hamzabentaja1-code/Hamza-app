const test=require('node:test');
const assert=require('node:assert/strict');
const {validateTask,changeTaskStatus,sortTasks,validateWorkLog,workLogCostCentimes,validateWorkLogSettlement,workLogOutstandingCentimes,workLogPaidCentimes}=require('../.test-build/agenda.js');

const task=(overrides={})=>({id:'t1',title:'Install camera',priority:'high',status:'open',dueDate:'2026-11-09',durationMinutes:90,createdAt:'2026-11-08T00:00:00Z',...overrides});

test('task validation and status changes are safe',()=>{
  assert.deepEqual(validateTask(task()),[]);
  assert.ok(validateTask(task({title:'',dueDate:'2026-02-30'})).length>=2);
  assert.ok(validateTask(task({durationMinutes:0})).some(error=>error.includes('مدة')));
  assert.ok(validateTask(task(),[task()]).some(error=>error.includes('معرف')));
  assert.equal(changeTaskStatus(task(),'in_progress').status,'in_progress');
  assert.throws(()=>changeTaskStatus(task(),'wrong'));
});

test('task sorting groups active tasks by priority and deadline before completed work',()=>{
  const result=sortTasks([task({id:'done',status:'done',priority:'high'}),task({id:'low',priority:'low'}),task({id:'normal',priority:'normal'}),task({id:'urgent',priority:'high'})]);
  assert.deepEqual(result.map(item=>item.id),['urgent','normal','low','done']);
});


test('work log validates task linkage, dates, duration and rate',()=>{
  const projectTask=task({projectId:'p1'});
  const log={id:'w1',taskId:'t1',projectId:'p1',technician:'Hamza',date:'2026-11-08',durationMinutes:90,hourlyRateCentimes:12000};
  assert.deepEqual(validateWorkLog(log,[projectTask]),[]);
  assert.equal(workLogCostCentimes(log),18000);
  assert.ok(validateWorkLog({...log,id:'',technician:'',date:'2026-02-30',durationMinutes:0,hourlyRateCentimes:-1},[projectTask]).length>=5);
  assert.ok(validateWorkLog({...log,projectId:'p2'},[projectTask]).some(error=>error.includes('المشروع')));
  assert.ok(validateWorkLog(log,[projectTask],[log]).some(error=>error.includes('معرف')));
  assert.throws(()=>workLogCostCentimes({...log,durationMinutes:0}));
});


test('technician settlements support partial payment and reject overpayment',()=>{
  const logs=[{id:'w1',taskId:'t1',projectId:'p1',technician:'Hamza',date:'2026-11-08',durationMinutes:90,hourlyRateCentimes:12000}];
  const first={id:'s1',technician:'Hamza',date:'2026-11-08',amountCentimes:7000,method:'cash'};
  assert.deepEqual(validateWorkLogSettlement(first,logs,[]),[]);
  assert.equal(workLogPaidCentimes([first],'hamza'),7000);
  assert.equal(workLogOutstandingCentimes(logs,[first],'Hamza'),11000);
  assert.ok(validateWorkLogSettlement({...first,id:'s2',amountCentimes:12000},logs,[first]).some(error=>error.includes('أكبر من الأجرة')));
  assert.ok(validateWorkLogSettlement({...first,id:'s3',amountCentimes:0},logs,[first]).some(error=>error.includes('أكبر من صفر')));
  assert.ok(validateWorkLogSettlement({...first,id:'s4',method:'cheque',reference:''},logs,[]).some(error=>error.includes('مرجع الشيك')));
  assert.ok(validateWorkLogSettlement({...first,id:'s5',technician:'Other'},logs,[]).some(error=>error.includes('ما كايناش أجرة')));
});
