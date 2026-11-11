const test = require('node:test');
const assert = require('node:assert/strict');
const {createProject,addProjectTask,setProjectTaskDone,projectFinancials,normalizeProjects} = require('../.test-build/projects.js');

test('creates a project with normalized names and optional target date',()=>{
  const project=createProject({name:'  Kitchen wiring  ',customerName:' Client ',budget:12000,targetDate:'2026-12-15'},10);
  assert.equal(project.name,'Kitchen wiring');
  assert.equal(project.customerName,'Client');
  assert.equal(project.status,'مخطط');
  assert.deepEqual(project.tasks,[]);
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

test('project expenses are linked to budget totals and can exceed budget',()=>{
  const project=createProject({name:'Project',budget:100},1);
  assert.deepEqual(projectFinancials(project,[{id:1,projectId:1,amount:120},{id:2,projectId:2,amount:40}]),{spent:120,remaining:-20,overBudget:true});
});

test('normalizes safe project records and discards malformed entries or tasks',()=>{
  const projects=normalizeProjects([{id:1,name:'Saved',customerName:'Client',budget:50,status:'جارٍ',tasks:[{id:2,title:'Task',done:false},{id:'bad',title:'bad',done:false}]},{id:2,name:'invalid'}]);
  assert.equal(projects.length,1);
  assert.equal(projects[0].tasks.length,1);
});
