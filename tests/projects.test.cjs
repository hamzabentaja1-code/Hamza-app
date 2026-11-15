const test = require('node:test');
const assert = require('node:assert/strict');
const {createProject,addProjectTask,addProjectTimeEntry,removeProjectTimeEntry,setProjectTaskDone,projectFinancials,normalizeProjects} = require('../.test-build/projects.js');

test('creates a project with normalized names and optional target date',()=>{
  const project=createProject({name:'  Kitchen wiring  ',customerName:' Client ',budget:12000,targetDate:'2026-12-15'},10);
  assert.equal(project.name,'Kitchen wiring');
  assert.equal(project.customerName,'Client');
  assert.equal(project.status,'مخطط');
  assert.deepEqual(project.tasks,[]);
  assert.deepEqual(project.timeEntries,[]);
});

test('rejects empty names, negative budgets, and invalid delivery dates',()=>{
  assert.throws(()=>createProject({name:' ',budget:10},1));
  assert.throws(()=>createProject({name:'Project',budget:-1},2));
  assert.throws(()=>createProject({name:'Project',budget:10,targetDate:'2026-02-30'},3));
});

test('adds tasks and toggles completion without changing other tasks',()=>{
  const project=createProject({name:'Project',budget:100},1);
  const withTask=addProjectTask(project,'Install lights',2);
  const completed=setProjectTaskDone(withTask,2,true);
  assert.equal(completed.tasks[0].done,true);
  assert.equal(project.tasks.length,0);
  assert.throws(()=>setProjectTaskDone(completed,99,true));
});

test('project expenses and labor cost are linked to budget totals and can exceed budget',()=>{
  const project=createProject({name:'Project',budget:100},1);
  const withTime=addProjectTimeEntry(project,{technician:'Tech',date:'2026-11-15',hours:2,hourlyRate:30},5);
  assert.deepEqual(projectFinancials(withTime,[{id:1,projectId:1,amount:60},{id:2,projectId:2,amount:40}]),{spent:120,expenseCost:60,laborCost:60,remaining:-20,overBudget:true});
});

test('project work logs validate, calculate wages, and can be removed',()=>{
  const project=createProject({name:'Project',budget:500},1);
  const logged=addProjectTimeEntry(project,{technician:' Tech A ',date:'2026-11-15',hours:1.5,hourlyRate:80,note:' Wiring '},4);
  assert.deepEqual(logged.timeEntries[0],{id:4,technician:'Tech A',date:'2026-11-15',hours:1.5,hourlyRate:80,note:'Wiring'});
  assert.equal(projectFinancials(logged,[]).laborCost,120);
  assert.equal(removeProjectTimeEntry(logged,4).timeEntries.length,0);
  assert.throws(()=>addProjectTimeEntry(project,{technician:'',date:'2026-11-15',hours:1,hourlyRate:80},5));
  assert.throws(()=>addProjectTimeEntry(project,{technician:'Tech',date:'2026-02-30',hours:1,hourlyRate:80},5));
  assert.throws(()=>addProjectTimeEntry(project,{technician:'Tech',date:'2026-11-15',hours:25,hourlyRate:80},5));
  assert.throws(()=>addProjectTimeEntry(project,{technician:'Tech',date:'2026-11-15',hours:1,hourlyRate:-1},5));
  assert.throws(()=>addProjectTimeEntry(logged,{technician:'Tech',date:'2026-11-15',hours:1,hourlyRate:80},4));
});

test('stores task deadline, urgency and assignee and rejects invalid metadata',()=>{
  const project=createProject({name:'Project',budget:100},1);
  const taskProject=addProjectTask(project,'Site inspection',2,{dueDate:'2026-12-05',priority:'عاجل',assignee:' Tech A '});
  assert.equal(taskProject.tasks[0].dueDate,'2026-12-05');
  assert.equal(taskProject.tasks[0].priority,'عاجل');
  assert.equal(taskProject.tasks[0].assignee,'Tech A');
  assert.equal(addProjectTask(project,'Basic',3).tasks[0].priority,'عادي');
  assert.throws(()=>addProjectTask(project,'Bad date',4,{dueDate:'2026-02-30'}));
  assert.throws(()=>addProjectTask(project,'Bad priority',5,{priority:'مستعجل'}));
});

test('normalizes safe project records and discards malformed entries or tasks',()=>{
  const projects=normalizeProjects([{id:1,name:'Saved',customerName:'Client',budget:50,status:'جارٍ',tasks:[{id:2,title:'Task',done:false},{id:3,title:'Bad date',done:false,dueDate:'2026-02-30'},{id:'bad',title:'bad',done:false}]},{id:2,name:'invalid'}]);
  assert.equal(projects.length,1);
  assert.equal(projects[0].tasks.length,1);
  assert.equal(projects[0].tasks[0].priority,'عادي');
  assert.deepEqual(projects[0].timeEntries,[]);
});

test('normalizes work logs while dropping invalid entries and remains compatible with old projects',()=>{
  const [project]=normalizeProjects([{id:1,name:'Saved',customerName:'Client',budget:50,status:'جارٍ',tasks:[],timeEntries:[{id:4,technician:'Tech',date:'2026-11-15',hours:2,hourlyRate:80},{id:5,technician:'',date:'bad',hours:-2,hourlyRate:-1}]}]);
  assert.equal(project.timeEntries.length,1);
  assert.deepEqual(normalizeProjects([{id:2,name:'Old',customerName:'',budget:0,status:'مخطط',tasks:[]}])[0].timeEntries,[]);
});
