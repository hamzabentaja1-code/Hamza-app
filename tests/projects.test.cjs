const test = require('node:test');
const assert = require('node:assert/strict');
const {validateProject, projectBalance, summarizeProjects} = require('../.test-build/projects.js');

const project=(overrides={})=>({id:1,name:'Installation caméra',customerName:'Client A',status:'in_progress',budgetCentimes:1250000,paidCentimes:300000,startDate:'2026-11-01',dueDate:'2026-11-30',notes:'',...overrides});

test('validates required project data and payment limits',()=>{
  assert.deepEqual(validateProject(project()),[]);
  assert.ok(validateProject(project({name:' '})).includes('دخل اسم المشروع.'));
  assert.ok(validateProject(project({paidCentimes:1250001})).includes('المبلغ المؤدى غير صحيح.'));
  assert.ok(validateProject(project({dueDate:'2026-10-01'})).includes('تاريخ النهاية خاصو يكون من بعد البداية.'));
});

test('summarizes project budgets, payments, outstanding amounts and active count',()=>{
  const result=summarizeProjects([project(),project({id:2,status:'completed',budgetCentimes:500000,paidCentimes:500000})]);
  assert.deepEqual(result,{count:2,activeCount:1,budgetCentimes:1750000,paidCentimes:800000,balanceCentimes:950000});
  assert.equal(projectBalance(project()),950000);
});
