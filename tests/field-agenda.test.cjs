const test=require('node:test');
const assert=require('node:assert/strict');
const {createFieldVisit,updateFieldVisit,changeVisitStatus,assertVisitSlot,normalizeFieldVisits,buildFieldAgenda}=require('../.test-build/domain/field-agenda.js');
const {translate}=require('../.test-build/i18n.js');
const {visitKindLabels,visitStatusLabels}=require('../.test-build/domain/field-agenda.js');
const base={title:' Repair ',customer:'Client',address:'Casablanca',kind:'service'};
const dated={...base,date:'2026-12-02',time:'09:00',technicianId:7,projectId:8};
test('field requests require concrete identifiers and valid calendar fields',()=>{
 const row=createFieldVisit(base,1);
 assert.equal(row.title,'Repair');assert.equal(row.status,'requested');
 for(const draft of [{...base,address:''},{...base,date:'2026-02-30'},{...base,time:'09:00'},{...dated,time:'24:00'},{...dated,kind:'fake'}])assert.throws(()=>createFieldVisit(draft,1));
 assert.throws(()=>createFieldVisit(base,0));
});
test('planning requires date, time and technician, and completed requests are immutable',()=>{
 assert.throws(()=>changeVisitStatus(createFieldVisit(base,1),'scheduled'));
 const r=changeVisitStatus(createFieldVisit(dated,1),'scheduled');
 assert.throws(()=>updateFieldVisit(r,{...dated,technicianId:undefined}));
 assert.equal(updateFieldVisit(r,{...dated,time:'11:00'}).time,'11:00');
 assert.equal(changeVisitStatus(r,'requested').status,'requested');
 const complete=changeVisitStatus(r,'completed');
 assert.throws(()=>changeVisitStatus(complete,'scheduled'));
 assert.throws(()=>updateFieldVisit(complete,dated));
});
test('a technician cannot hold two appointments for the same start',()=>{
 const planned=(data,id)=>changeVisitStatus(createFieldVisit(data,id),'scheduled');
 const a=planned(dated,1);
 assert.throws(()=>assertVisitSlot(planned(dated,2),[a]));
 assert.doesNotThrow(()=>assertVisitSlot(planned({...dated,technicianId:8},2),[a]));
 assert.doesNotThrow(()=>assertVisitSlot(planned({...dated,time:'10:00'},2),[a]));
 assert.doesNotThrow(()=>assertVisitSlot(a,[a,changeVisitStatus(planned(dated,2),'cancelled')]));
});
test('old and damaged backups hydrate safely without erasing valid visits',()=>{
 const r=changeVisitStatus(createFieldVisit(dated,1),'scheduled');
 assert.deepEqual(normalizeFieldVisits(undefined),[]);
 assert.deepEqual(normalizeFieldVisits(JSON.parse(JSON.stringify([r,r,{...r,id:2,date:undefined},null,{id:3,title:5}]))),[r]);
});
test('agenda combines projects, tasks and real appointments, with closed filter and stable IDs',()=>{
 const p={id:8,name:'Job',customerName:'Client',targetDate:'2026-12-02',status:'جارٍ',tasks:[{id:1,title:'Open task',dueDate:'2026-12-01',done:false},{id:2,title:'Closed task',dueDate:'2026-12-02',done:true},{id:3,title:'Undated',done:false}],timeEntries:[]};
 const v=changeVisitStatus(createFieldVisit(dated,1),'scheduled'),unconfirmed=createFieldVisit(dated,2);
 assert.deepEqual(buildFieldAgenda([p],[v,unconfirmed]).map(r=>r.key),['t:8:1','v:1','p:8']);
 assert.deepEqual(buildFieldAgenda([p],[changeVisitStatus(v,'completed')],true).filter(r=>r.closed).map(r=>r.key),['v:1','t:8:2']);
});
test('dynamic visit types and statuses have French translations',()=>{
 for(const text of [...Object.values(visitKindLabels),...Object.values(visitStatusLabels)])assert.notEqual(translate('FR',text),text);
});
