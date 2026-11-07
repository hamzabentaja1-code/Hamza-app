const test=require('node:test');
const assert=require('node:assert/strict');
const {calculateCustomerBalances}=require('../.test-build/customer-balances.js');
test('groups invoice balances by customer and excludes delivery notes',()=>{
 const result=calculateCustomerBalances([
  {type:'invoice',customerName:'Amina',total:120,paidCentimes:2000},
  {type:'invoice',customerName:'Amina',total:80,paidCentimes:0},
  {type:'delivery',customerName:'Amina',total:500},
  {type:'invoice',customerName:'Youssef',total:50,paidCentimes:5000},
 ]);
 assert.deepEqual(result,[
  {customerName:'Amina',invoiceCount:2,totalCentimes:20000,paidCentimes:2000,openingBalanceCentimes:0,outstandingCentimes:18000},
  {customerName:'Youssef',invoiceCount:1,totalCentimes:5000,paidCentimes:5000,openingBalanceCentimes:0,outstandingCentimes:0},
 ]);
});
test('rejects invalid paid amounts and sorts largest debt first',()=>{
 assert.throws(()=>calculateCustomerBalances([{type:'invoice',customerName:'A',total:10,paidCentimes:1001}]),/invalid/);
 const result=calculateCustomerBalances([{type:'invoice',customerName:'A',total:10},{type:'invoice',customerName:'B',total:30}]);
 assert.equal(result[0].customerName,'B');
});

test('adds opening customer balances even when there are no invoices',()=>{
 const result=calculateCustomerBalances([],[
  {customerName:'Amina',openingBalanceCentimes:12500},
  {customerName:'Youssef',openingBalanceCentimes:0},
 ]);
 assert.equal(result[0].customerName,'Amina');
 assert.equal(result[0].openingBalanceCentimes,12500);
 assert.equal(result[0].outstandingCentimes,12500);
});
test('rejects invalid customer opening balances',()=>{
 assert.throws(()=>calculateCustomerBalances([],[{customerName:'A',openingBalanceCentimes:-1}]),/invalid/);
});

test('applies customer credit notes oldest unpaid invoice first and retains unused credit',()=>{
 const result=calculateCustomerBalances([
  {type:'invoice',customerName:'Amina',total:100,paidCentimes:0,date:'2026-01-01'},
  {type:'invoice',customerName:'Amina',total:80,paidCentimes:2000,date:'2026-02-01'},
  {type:'invoice',customerName:'Youssef',total:50,paidCentimes:0,date:'2026-01-03'},
 ],[],[
  {id:1,customerName:'Amina',total:120,date:'2026-03-01'},
  {id:2,customerName:'Amina',total:20,date:'2026-03-02'},
 ]);
 const amina=result.find(x=>x.customerName==='Amina');
 assert.equal(amina.outstandingCentimes,2000);
 assert.equal(amina.creditBalanceCentimes,0);
 assert.equal(result.find(x=>x.customerName==='Youssef').outstandingCentimes,5000);
});
test('keeps credit notes as customer credit when no invoice is outstanding',()=>{
 const result=calculateCustomerBalances([{type:'invoice',customerName:'Amina',total:25,paidCentimes:2500}],[],[
  {customerName:'Amina',total:40,date:'2026-04-01'}
 ]);
 const amina=result[0];
 assert.equal(amina.outstandingCentimes,0);
 assert.equal(amina.creditBalanceCentimes,4000);
});
test('rejects invalid customer credit notes',()=>{
 assert.throws(()=>calculateCustomerBalances([],[],[{customerName:'Amina',total:-1}]),/credit note is invalid/);
});

test('retains a credit note for a customer with no invoice or opening balance',()=>{
 const result=calculateCustomerBalances([],[],[{customerName:'Amina',total:12.5}]);
 assert.equal(result.length,1);
 assert.equal(result[0].outstandingCentimes,0);
 assert.equal(result[0].creditBalanceCentimes,1250);
});
