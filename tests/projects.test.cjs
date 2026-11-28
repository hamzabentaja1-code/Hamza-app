const test = require('node:test');
const assert = require('node:assert/strict');
const {createProject,updateProjectDetails,assertProjectCanBeDeleted,addProjectTask,addProjectTaskAttachment,updateProjectTask,addProjectTimeEntry,removeProjectTask,removeProjectTaskAttachment,removeProjectTimeEntry,setProjectTaskDone,projectFinancials,normalizeProjects} = require('../.test-build/projects.js');

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

test('updates project details while preserving tasks, status and work logs',()=>{
  const project=addProjectTimeEntry(addProjectTask(createProject({name:'Old',budget:100},1),'Install',2),{technician:'Tech',date:'2026-11-15',hours:1,hourlyRate:30},3);
  const updated=updateProjectDetails({...project,status:'جارٍ'},{name:' New ',customerName:' Client ',budget:250,targetDate:'2026-12-01'});
  assert.equal(updated.name,'New');
  assert.equal(updated.customerName,'Client');
  assert.equal(updated.budget,250);
  assert.equal(updated.status,'جارٍ');
  assert.equal(updated.tasks.length,1);
  assert.equal(updated.timeEntries.length,1);
  assert.throws(()=>updateProjectDetails(project,{name:' ',budget:10}));
});

test('only permits deleting an empty project without linked expenses',()=>{
  const project=createProject({name:'Empty',budget:0},1);
  assert.doesNotThrow(()=>assertProjectCanBeDeleted(project,[]));
  assert.throws(()=>assertProjectCanBeDeleted(addProjectTask(project,'Task',2),[]));
  assert.throws(()=>assertProjectCanBeDeleted(addProjectTimeEntry(project,{technician:'Tech',date:'2026-11-15',hours:1,hourlyRate:20},3),[]));
  assert.throws(()=>assertProjectCanBeDeleted(project,[{id:1,projectId:1,amount:5}]));
});

test('adds tasks and toggles completion without changing other tasks',()=>{
  const project=createProject({name:'Project',budget:100},1);
  const withTask=addProjectTask(project,'Install lights',2);
  const completed=setProjectTaskDone(withTask,2,true);
  assert.equal(completed.tasks[0].done,true);
  assert.equal(project.tasks.length,0);
  assert.throws(()=>setProjectTaskDone(completed,99,true));
  assert.equal(removeProjectTask(completed,2).tasks.length,0);
  assert.throws(()=>removeProjectTask(completed,99));
});

test('updates task details while preserving completion and rejects invalid edits',()=>{
  const project=setProjectTaskDone(addProjectTask(createProject({name:'Project',budget:100},1),'Old task',2,{assignee:'Tech'}),2,true);
  const updated=updateProjectTask(project,2,{title:' New task ',dueDate:'2026-12-01',priority:'عاجل',assignee:' Tech B '});
  assert.deepEqual(updated.tasks[0],{id:2,title:'New task',done:true,priority:'عاجل',dueDate:'2026-12-01',assignee:'Tech B'});
  assert.equal(updateProjectTask(updated,2,{title:'Renamed',priority:'عادي'}).tasks[0].dueDate,undefined);
  assert.throws(()=>updateProjectTask(project,2,{title:' ',priority:'عادي'}));
  assert.throws(()=>updateProjectTask(project,2,{title:'Task',dueDate:'2026-02-30',priority:'عادي'}));
  assert.throws(()=>updateProjectTask(project,2,{title:'Task',priority:'مستعجل'}));
  assert.throws(()=>updateProjectTask(project,999,{title:'Task',priority:'عادي'}));
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

test('adds, removes and validates locally saved task attachments',()=>{
  const project=addProjectTask(createProject({name:'Install',budget:100},1),'Mount cameras',2);
  const attachment={id:'att-2',name:'site-photo.jpg',uri:'file:///app/task-attachments/site-photo.jpg',mimeType:'image/jpeg',size:2048};
  const updated=addProjectTaskAttachment(project,2,attachment);
  assert.deepEqual(updated.tasks[0].attachments,[attachment]);
  assert.equal(removeProjectTaskAttachment(updated,2,'att-2').tasks[0].attachments.length,0);
  assert.throws(()=>addProjectTaskAttachment(project,99,attachment),/المهمة غير موجودة/);
  assert.throws(()=>addProjectTaskAttachment(updated,2,attachment),/مسجل من قبل/);
  assert.throws(()=>addProjectTaskAttachment(project,2,{...attachment,uri:'https://example.com/file'}),/المرفق غير صالح/);
  assert.throws(()=>addProjectTaskAttachment(project,2,{...attachment,size:6*1024*1024}),/5 ميغابايت/);
  let full=project;
  for(let index=0;index<10;index++)full=addProjectTaskAttachment(full,2,{...attachment,id:`att-${index}`,name:`photo-${index}.jpg`,uri:`file:///app/photo-${index}.jpg`});
  assert.throws(()=>addProjectTaskAttachment(full,2,{...attachment,id:'att-11',uri:'file:///app/photo-11.jpg'}),/10 مرفقات/);
});

test('restores valid task attachment metadata and drops invalid or duplicate attachment entries',()=>{
  const backup=normalizeProjects([{id:1,name:'Install',customerName:'',budget:100,status:'جارٍ',tasks:[{id:2,title:'Mount cameras',done:false,attachments:[
    {id:'a',name:'photo.jpg',uri:'file:///app/photo.jpg',size:100},
    {id:'a',name:'duplicate-id',uri:'file:///app/other.jpg',size:100},
    {id:'b',name:'bad-url',uri:'https://example.com/file',size:100},
    {id:'c',name:'too-large',uri:'file:///app/large.bin',size:6*1024*1024},
  ]}]}]);
  assert.deepEqual(backup[0].tasks[0].attachments,[{id:'a',name:'photo.jpg',uri:'file:///app/photo.jpg',size:100}]);
  const legacy=normalizeProjects([{id:2,name:'Legacy',customerName:'',budget:0,status:'مخطط',tasks:[{id:1,title:'Old task',done:false}]}]);
  assert.equal(Object.hasOwn(legacy[0].tasks[0],'attachments'),false);
});

test('shared task attachment budget accepts the existing 27 MiB case, blocks excess and preserves original rows during records-only recovery',()=>{
  const {assertTaskAttachmentBudget,taskAttachmentSize,projectRecordsWithoutTaskFiles}=require('../.test-build/projects.js');
  const size=4.5*1024*1024;
  const attachments=Array.from({length:6},(_,i)=>({id:'file-'+i,name:'File '+i,uri:'file:///files/'+i,size}));
  const tasks=[{id:1,title:'Fixture',done:false,attachments},{id:2,title:'Keep me',done:true}];
  const projects=[{id:1,name:'Project',tasks,timeEntries:[]}];
  const total=taskAttachmentSize(projects);
  assert.equal(total,27*1024*1024);
  assert.doesNotThrow(()=>assertTaskAttachmentBudget(total));
  assert.doesNotThrow(()=>assertTaskAttachmentBudget(total+5*1024*1024));
  assert.throws(()=>assertTaskAttachmentBudget(total+5*1024*1024+1),/32/);
  const records=projectRecordsWithoutTaskFiles(projects);
  assert.equal(Object.hasOwn(records[0].tasks[0],'attachments'),false);
  assert.equal(records[0].tasks[1].title,'Keep me');
  assert.deepEqual(projects[0].tasks[0].attachments,attachments);
});

test('base64 size check handles padding and refuses malformed or oversize file entries',()=>{
  const {MAX_TASK_ATTACHMENT_BYTES,taskAttachmentBase64Bytes}=require('../.test-build/projects.js');
  assert.equal(taskAttachmentBase64Bytes('YQ=='),1);
  assert.equal(taskAttachmentBase64Bytes('YWI='),2);
  assert.equal(taskAttachmentBase64Bytes('YWJj'),3);
  for(const text of ['','','YWI','Y=I=','AA+!','===='])assert.equal(taskAttachmentBase64Bytes(text),undefined);
  const max=Buffer.alloc(MAX_TASK_ATTACHMENT_BYTES).toString('base64');
  assert.equal(taskAttachmentBase64Bytes(max),MAX_TASK_ATTACHMENT_BYTES);
  assert.equal(taskAttachmentBase64Bytes(max.replace(/=+$/,'A')),undefined);
});
