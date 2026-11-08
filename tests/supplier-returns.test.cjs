const test = require('node:test');
const assert = require('node:assert/strict');
const {createSupplierReturn,supplierReturnTotalCentimes} = require('../.test-build/supplier-returns.js');
const purchase = {id:10,productId:3,productName:'Camera',supplierName:'Supplier A',supplierId:'s1',qty:5,unitCost:200};

test('supplier return links to the purchase, values the credit, and totals supplier credits',()=>{
  const returned=createSupplierReturn(purchase,[],2,4,50,'2026-11-08');
  assert.deepEqual(returned,{id:50,purchaseId:10,productId:'3',productName:'Camera',supplierName:'Supplier A',supplierId:'s1',quantity:2,unitCost:200,total:400,date:'2026-11-08'});
  assert.equal(supplierReturnTotalCentimes([returned],'s1','Supplier A'),40000);
});

test('supplier returns reject quantities beyond purchase balance or current stock',()=>{
  const prior=createSupplierReturn(purchase,[],3,5,51,'2026-11-08');
  assert.throws(()=>createSupplierReturn(purchase,[prior],3,5,52,'2026-11-08'),/تجاوزت الكمية/);
  assert.throws(()=>createSupplierReturn(purchase,[],2,1,53,'2026-11-08'),/المخزون غير كافٍ/);
  assert.throws(()=>createSupplierReturn(purchase,[],0,5,54,'2026-11-08'),/كمية الإرجاع غير صالحة/);
});
