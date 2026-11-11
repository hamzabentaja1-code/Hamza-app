const test=require('node:test');
const assert=require('node:assert/strict');
const {calculateCustomerBalances}=require('../.test-build/domain/customer-balances.js');
test('groups invoice balances by customer and excludes delivery notes',()=>{
 const result=calculateCustomerBalances([
  {type:'invoice',customerName:'Amina',total:120,paidCentimes:2000},
  {type:'invoice',customerName:'Amina',total:80,paidCentimes:0},
  {type:'delivery',customerName:'Amina',total:500},
  {type:'invoice',customerName:'Youssef',total:50,paidCentimes:5000},
 ]);
 assert.deepEqual(result,[
  {customerName:'Amina',invoiceCount:2,totalCentimes:20000,paidCentimes:2000,creditedCentimes:0,outstandingCentimes:18000,customerCreditCentimes:0},
  {customerName:'Youssef',invoiceCount:1,totalCentimes:5000,paidCentimes:5000,creditedCentimes:0,outstandingCentimes:0,customerCreditCentimes:0},
 ]);
});
test('reduces receivables by allocated returns and retains excess customer credit',()=>{
 const result=calculateCustomerBalances([{type:'invoice',customerName:'Amina',total:100,paidCentimes:2000,creditedCentimes:3000}], [{customerName:'Amina',unappliedCentimes:2500},{customerName:'Rachid',unappliedCentimes:500}]);
 assert.deepEqual(result,[
  {customerName:'Amina',invoiceCount:1,totalCentimes:10000,paidCentimes:2000,creditedCentimes:3000,outstandingCentimes:5000,customerCreditCentimes:2500},
  {customerName:'Rachid',invoiceCount:0,totalCentimes:0,paidCentimes:0,creditedCentimes:0,outstandingCentimes:0,customerCreditCentimes:500},
 ]);
});
test('rejects invalid paid amounts and sorts largest debt first',()=>{
 assert.throws(()=>calculateCustomerBalances([{type:'invoice',customerName:'A',total:10,paidCentimes:1001}]),/invalid/);
 const result=calculateCustomerBalances([{type:'invoice',customerName:'A',total:10},{type:'invoice',customerName:'B',total:30}]);
 assert.equal(result[0].customerName,'B');
});
