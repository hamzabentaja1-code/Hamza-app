const test=require('node:test');
const assert=require('node:assert/strict');
const {createProject,addProjectTimeEntry}=require('../.test-build/projects.js');
const {buildProjectTimeReport}=require('../.test-build/domain/project-time-report.js');
const {filterByDateRange}=require('../.test-build/report-filters.js');

test('builds project labor report rows and filters by selected dates',()=>{
  const first=addProjectTimeEntry(createProject({name:'CCTV install',customerName:'Client A',budget:1000},1),{technician:'Tech A',date:'2026-11-15',hours:2.25,hourlyRate:80,note:'Cameras'},10);
  const second=addProjectTimeEntry(createProject({name:'Panel wiring',customerName:'Client B',budget:500},2),{technician:'Tech B',date:'2026-11-01',hours:1,hourlyRate:50},11);
  const rows=buildProjectTimeReport([first,second]);
  assert.equal(rows.length,2);
  assert.deepEqual(rows[0],{date:'2026-11-15',projectName:'CCTV install',customerName:'Client A',technician:'Tech A',hours:2.25,hourlyRate:80,laborCost:180,note:'Cameras'});
  assert.equal(filterByDateRange(rows,'2026-11-10','2026-11-30').length,1);
});

test('keeps an empty project labor report empty',()=>{
  assert.deepEqual(buildProjectTimeReport([]),[]);
});
