const test=require('node:test');
const assert=require('node:assert/strict');
const {planInvoiceStockDeduction}=require('../.test-build/domain/invoice-stock.js');

test('aggregates every linked quote line into one invoice stock movement per product',()=>{
  assert.deepEqual(planInvoiceStockDeduction([
    {productId:2,qty:1.5},{productId:2,qty:2},{productId:5,qty:1},
  ],false),[{productId:2,quantity:3.5},{productId:5,quantity:1}]);
});

test('does not deduct invoice stock a second time after a delivery note',()=>{
  assert.deepEqual(planInvoiceStockDeduction([{productId:2,qty:3}],true),[]);
});

test('ignores unlinked legacy products and rejects invalid linked quantities',()=>{
  assert.deepEqual(planInvoiceStockDeduction([{productId:0,qty:1}],false),[]);
  assert.throws(()=>planInvoiceStockDeduction([{productId:2,qty:0}],false));
});
