const test=require('node:test');const assert=require('node:assert/strict');
const {allocateSupplierPaymentAcrossPurchases}=require('../.test-build/multi-supplier-payment.js');
const rows=()=>[
 {id:1,supplierName:'Supplier A',total:100,paidCentimes:0,returnedCentimes:0},
 {id:2,supplierName:'Supplier A',total:80,paidCentimes:2000,returnedCentimes:0},
 {id:3,supplierName:'Supplier B',total:50,paidCentimes:0,returnedCentimes:0},
];
test('allocates supplier payment oldest-first across open purchases',()=>{
 const result=allocateSupplierPaymentAcrossPurchases(rows(),'Supplier A',12000);
 assert.deepEqual(result.allocations,[{purchaseId:1,amountCentimes:10000},{purchaseId:2,amountCentimes:2000}]);
 assert.equal(result.purchases.find(x=>x.id===1).paidCentimes,10000);
 assert.equal(result.purchases.find(x=>x.id===2).paidCentimes,4000);
 assert.equal(result.purchases.find(x=>x.id===3).paidCentimes,0);
});
test('supplier returns reduce allocatable purchase debt',()=>{
 const result=allocateSupplierPaymentAcrossPurchases([{id:1,supplierName:'Supplier A',total:100,paidCentimes:2000,returnedCentimes:3000}],'Supplier A',5000);
 assert.equal(result.purchases[0].paidCentimes,7000);
});
test('rejects overpayment and suppliers without outstanding purchases',()=>{
 assert.throws(()=>allocateSupplierPaymentAcrossPurchases(rows(),'Supplier A',16001));
 assert.throws(()=>allocateSupplierPaymentAcrossPurchases(rows(),'Supplier B',5001));
});
