const test=require('node:test');const assert=require('node:assert/strict');
const {nextTaskOccurrence,completeRecurringWorkTask}=require('../.test-build/recurring-tasks.js');
const task={id:1,title:'متابعة عميل',dueDate:'2026-01-31',status:'todo',recurrence:'monthly',recurrenceEndDate:'2026-04-30'};
test('recurring task dates clamp month ends and handle leap years',()=>{
 assert.equal(nextTaskOccurrence('2026-01-31','monthly'),'2026-02-28');
 assert.equal(nextTaskOccurrence('2024-01-31','monthly'),'2024-02-29');
 assert.equal(nextTaskOccurrence('2024-02-29','yearly'),'2025-02-28');
 assert.equal(nextTaskOccurrence('2026-11-07','weekly'),'2026-11-14');
});
test('completing a recurring task creates one next occurrence and preserves the completed record',()=>{
 const result=completeRecurringWorkTask([task],1,2);
 assert.equal(result.tasks.length,2);
 assert.equal(result.tasks[1].status,'done');
 assert.equal(result.generated.id,2);
 assert.equal(result.generated.dueDate,'2026-02-28');
 assert.equal(result.generated.status,'todo');
});
test('recurring tasks stop at their end date and non-recurring tasks do not duplicate',()=>{
 const stopped=completeRecurringWorkTask([{...task,dueDate:'2026-04-30'}],1,2);
 assert.equal(stopped.generated,null);
 const plain=completeRecurringWorkTask([{...task,recurrence:undefined}],1,2);
 assert.equal(plain.generated,null);
 assert.equal(plain.tasks.length,1);
});
test('invalid dates, ids and unknown tasks are rejected',()=>{
 assert.throws(()=>nextTaskOccurrence('2026-02-30','monthly'));
 assert.throws(()=>completeRecurringWorkTask([task],9,2),/غير موجودة/);
 assert.throws(()=>completeRecurringWorkTask([task],1,0),/غير صالح/);
});

test('task workspace exposes recurring schedules and creates the next task only on completion',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const app=fs.readFileSync(path.join(__dirname,'..','App.tsx'),'utf8');
 assert.match(app,/taskRecurrenceEndDate/);
 assert.match(app,/completeRecurringWorkTask\(workTasks,task\.id,Date\.now\(\)\)/);
 assert.match(app,/taskRecurrence!==''/);
});

test('recurring work tasks do not duplicate attachments',()=>{
 const source=[{id:1,title:'Réparer',dueDate:'2026-01-05',status:'doing',recurrence:'weekly',attachments:[{id:'f1',name:'devis.pdf'}]}];
 const result=completeRecurringWorkTask(source,1,2);
 assert.deepEqual(result.generated.attachments,[]);
 assert.equal(result.tasks.find(task=>task.id===1).attachments.length,1);
});
