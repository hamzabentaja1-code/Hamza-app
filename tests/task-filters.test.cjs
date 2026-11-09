const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {filterWorkTasks}=require('../.test-build/task-filters.js');

const tasks=[
  {id:1,title:'Installer caméra',projectName:'Magasin',projectId:2,assignee:'Ali',status:'todo',priority:'high',dueDate:'2026-11-07'},
  {id:2,title:'Vérifier facture',projectName:'Bureau',projectId:3,assignee:'Hamza',status:'done',priority:'low',dueDate:'2026-11-01'},
  {id:3,title:'Câblage réseau',projectName:'Magasin',projectId:2,assignee:'Ali',status:'doing',priority:'medium',dueDate:'2026-11-10'},
  {id:4,title:'Vérifier stock',projectName:'',assignee:'',status:'todo',priority:'low',dueDate:''},
];
const all={query:'',status:'all',priority:'all',projectId:'all'};

test('task list filters completed, open and overdue work correctly',()=>{
  assert.deepEqual(filterWorkTasks(tasks,{...all,status:'done'},'2026-11-09').map(x=>x.id),[2]);
  assert.deepEqual(filterWorkTasks(tasks,{...all,status:'open'},'2026-11-09').map(x=>x.id),[1,3,4]);
  assert.deepEqual(filterWorkTasks(tasks,{...all,status:'overdue'},'2026-11-09').map(x=>x.id),[1]);
  assert.deepEqual(filterWorkTasks(tasks,all,'2026-11-09'),tasks);
});
test('task list combines priority, project and case-insensitive title or assignee searches',()=>{
  assert.deepEqual(filterWorkTasks(tasks,{...all,priority:'high',projectId:2,query:'camÉRA'},'2026-11-09').map(x=>x.id),[1]);
  assert.deepEqual(filterWorkTasks(tasks,{...all,query:'ALI'},'2026-11-09').map(x=>x.id),[1,3]);
  assert.deepEqual(filterWorkTasks(tasks,{...all,query:'MAGASIN'},'2026-11-09').map(x=>x.id),[1,3]);
  assert.deepEqual(filterWorkTasks(tasks,{...all,projectId:'unassigned'},'2026-11-09').map(x=>x.id),[4]);
  assert.deepEqual(filterWorkTasks(tasks,{...all,projectId:3},'2026-11-09').map(x=>x.id),[2]);
});
test('overdue filter rejects malformed dates, and date validation is strict',()=>{
  const malformed=[{...tasks[0],dueDate:'2026-02-31'}];
  assert.deepEqual(filterWorkTasks(malformed,{...all,status:'overdue'},'2026-11-09'),[]);
  assert.throws(()=>filterWorkTasks(tasks,all,'2026-02-31'),/Invalid current date/);
});
test('task list remains unchanged and UI actually renders filtered task controls',()=>{
  const original=structuredClone(tasks);
  filterWorkTasks(tasks,{...all,status:'overdue'},'2026-11-09');
  assert.deepEqual(tasks,original);
  const app=fs.readFileSync('App.tsx','utf8');
  assert.match(app,/filterWorkTasks\(workTasks\.map\(/);
  assert.match(app,/visibleWorkTasks\.map\(task/);
  assert.match(app,/accessibilityState=\{\{selected:taskListStatus===option\.value\}\}/);
  assert.match(app,/accessibilityState=\{\{selected:taskListPriority===option\.value\}\}/);
});
