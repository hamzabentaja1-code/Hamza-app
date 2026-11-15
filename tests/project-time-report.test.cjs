const test=require('node:test');
const assert=require('node:assert/strict');
const {createProject,addProjectTimeEntry}=require('../.test-build/projects.js');
const {buildProjectTimeReport,summarizeTechnicianWork}=require('../.test-build/domain/project-time-report.js');
const {filterByDateRange}=require('../.test-build/report-filters.js');

test('builds project labor report rows and filters by selected dates',()=>{
  const first=addProjectTimeEntry(createProject({name:'CCTV install',customerName:'Client A',budget:1000},1),{technician:'Tech A',date:'2026-11-15',hours:2.25,hourlyRate:80,note:'Cameras'},10);
  const second=addProjectTimeEntry(createProject({name:'Panel wiring',customerName:'Client B',budget:500},2),{technician:'Tech B',date:'2026-11-01',hours:1,hourlyRate:50},11);
  const rows=buildProjectTimeReport([first,second]);
  assert.equal(rows.length,2);
  assert.deepEqual(rows[0],{projectId:1,date:'2026-11-15',projectName:'CCTV install',customerName:'Client A',technician:'Tech A',hours:2.25,hourlyRate:80,laborCost:180,note:'Cameras'});
  assert.equal(filterByDateRange(rows,'2026-11-10','2026-11-30').length,1);
});

test('keeps an empty project labor report empty',()=>{
  assert.deepEqual(buildProjectTimeReport([]),[]);
});

test('summarizes filtered work by saved technician profile and counts distinct projects',()=>{
  const a=addProjectTimeEntry(createProject({name:'CCTV install',budget:1000},1),{technician:'Amina',technicianId:4,date:'2026-11-15',hours:2.25,hourlyRate:80},10);
  const b=addProjectTimeEntry(createProject({name:'Panel wiring',budget:1000},2),{technician:'Amina',technicianId:4,date:'2026-11-15',hours:1.5,hourlyRate:100},11);
  const c=addProjectTimeEntry(createProject({name:'Old project',budget:1000},3),{technician:' Amina ',date:'2026-11-01',hours:1,hourlyRate:50},12);
  const rows=filterByDateRange(buildProjectTimeReport([a,b,c]),'2026-11-10','2026-11-30');
  assert.deepEqual(summarizeTechnicianWork(rows),[
    {technicianId:4,technician:'Amina',workEntryCount:2,projectCount:2,hours:3.75,laborCostCentimes:33000},
  ]);
});

test('legacy work entries group by normalized name and stay distinct from linked profiles',()=>{
  const legacy1=addProjectTimeEntry(createProject({name:'Legacy 1',budget:0},1),{technician:'Tech A',date:'2026-11-01',hours:1,hourlyRate:10},1);
  const legacy2=addProjectTimeEntry(createProject({name:'Legacy 2',budget:0},2),{technician:' tech a ',date:'2026-11-02',hours:2,hourlyRate:10},2);
  const linked=addProjectTimeEntry(createProject({name:'Linked',budget:0},3),{technician:'Tech A',technicianId:9,date:'2026-11-03',hours:1,hourlyRate:10},3);
  assert.deepEqual(summarizeTechnicianWork(buildProjectTimeReport([legacy1,legacy2,linked])),[
    {technician:'Tech A',workEntryCount:2,projectCount:2,hours:3,laborCostCentimes:3000},
    {technicianId:9,technician:'Tech A',workEntryCount:1,projectCount:1,hours:1,laborCostCentimes:1000},
  ]);
});
