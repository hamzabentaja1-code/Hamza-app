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
test('credit notes reduce receivables and record customer credit after full payment',()=>{
 const result=calculateCustomerBalances([
  {type:'invoice',customerName:'Client A',total:100,paidCentimes:2500,creditedCentimes:5000},
  {type:'invoice',customerName:'Client B',total:100,paidCentimes:10000,creditedCentimes:1500},
 ]);
 assert.equal(result.find(x=>x.customerName==='Client A').outstandingCentimes,2500);
 assert.equal(result.find(x=>x.customerName==='Client A').customerCreditCentimes,0);
 assert.equal(result.find(x=>x.customerName==='Client B').outstandingCentimes,0);
 assert.equal(result.find(x=>x.customerName==='Client B').customerCreditCentimes,1500);
});
test('rejects invalid paid amounts and sorts largest debt first',()=>{
 assert.throws(()=>calculateCustomerBalances([{type:'invoice',customerName:'A',total:10,paidCentimes:-1}]),/invalid/);
 const result=calculateCustomerBalances([{type:'invoice',customerName:'A',total:10},{type:'invoice',customerName:'B',total:30}]);
 assert.equal(result[0].customerName,'B');
});

test('opening balances enter receivables and unallocated payments settle them',()=>{
  const result=calculateCustomerBalances([], [{name:'Hamza Client',openingBalanceCentimes:10000}], [
    {customerName:'Hamza Client',amount:40},
  ]);
  assert.equal(result[0].totalCentimes,10000);
  assert.equal(result[0].paidCentimes,4000);
  assert.equal(result[0].outstandingCentimes,6000);
});

test('unallocated payments above opening balance become customer credit',()=>{
  const result=calculateCustomerBalances([], [{name:'Hamza Client',openingBalanceCentimes:10000}], [
    {customerName:'Hamza Client',amount:150},
  ]);
  assert.equal(result[0].outstandingCentimes,0);
  assert.equal(result[0].customerCreditCentimes,5000);
});
