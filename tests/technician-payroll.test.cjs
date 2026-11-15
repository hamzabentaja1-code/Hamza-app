const test=require('node:test');
const assert=require('node:assert/strict');
const {createProject,addProjectTimeEntry}=require('../.test-build/projects.js');
const {calculateTechnicianPayroll,createPayrollSettlement,normalizePayrollSettlements,summarizePayrollSettlements}=require('../.test-build/technician-payroll.js');

test('calculates earned pay from time-entry rate snapshots and applies partial settlements',()=>{
  const technician={id:3,name:'Amina',hourlyRate:100};
  let project=createProject({name:'Installation',budget:1000},1);
  project=addProjectTimeEntry(project,{technician:'Amina',technicianId:3,date:'2026-11-01',hours:3.5,hourlyRate:80},11);
  project=addProjectTimeEntry(project,{technician:'AMINA',date:'2026-11-02',hours:1,hourlyRate:80},12);
  const earned=calculateTechnicianPayroll([project],[technician],[])[0];
  assert.deepEqual(earned,{technicianId:3,technicianName:'Amina',earnedCentimes:36000,paidCentimes:0,dueCentimes:36000});
  const settlement=createPayrollSettlement({technician,amount:100,method:'نقداً',date:'2026-11-03',id:20,dueCentimes:earned.dueCentimes});
  assert.equal(calculateTechnicianPayroll([project],[technician],[settlement])[0].dueCentimes,26000);
  assert.throws(()=>createPayrollSettlement({technician,amount:300,method:'نقداً',date:'2026-11-03',id:21,dueCentimes:26000},[settlement]),/أكبر من أجرة/);
});

test('requires a bank account for bank payroll and normalizes only valid settlements',()=>{
  const technician={id:1,name:'Tech',hourlyRate:50};
  assert.throws(()=>createPayrollSettlement({technician,amount:10,method:'تحويل',date:'2026-11-03',id:1,dueCentimes:10000}),/الحساب البنكي/);
  const valid=createPayrollSettlement({technician,amount:10,method:'تحويل',bankAccountId:'bank1',date:'2026-11-03',id:1,dueCentimes:10000});
  assert.throws(()=>createPayrollSettlement({technician,amount:10,method:'نقداً',date:'2026-02-30',id:2,dueCentimes:10000}),/تاريخاً صحيحاً/);
  assert.deepEqual(normalizePayrollSettlements([valid,{...valid,id:1,amountCentimes:1},{...valid,id:2,technicianId:999}], [technician]),[valid]);
});

test('summarizes period payroll payments by technician without merging different profiles',()=>{
 const rows=summarizePayrollSettlements([
  {id:1,technicianId:4,technicianName:'Amina',date:'2026-11-01',amountCentimes:5000,method:'نقداً'},
  {id:2,technicianId:4,technicianName:'Amina',date:'2026-11-05',amountCentimes:2500,method:'تحويل',bankAccountId:'bank1'},
  {id:3,technicianId:5,technicianName:'Ali',date:'2026-11-05',amountCentimes:7000,method:'نقداً'},
 ]);
 assert.deepEqual(rows,[{technicianId:4,technicianName:'Amina',paymentCount:2,paidCentimes:7500},{technicianId:5,technicianName:'Ali',paymentCount:1,paidCentimes:7000}]);
});
