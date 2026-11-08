const test=require('node:test');
const assert=require('node:assert/strict');
const {validateTask,changeTaskStatus,sortTasks}=require('../.test-build/agenda.js');

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
