const test=require('node:test');
const assert=require('node:assert/strict');
const {compareSupplierPrices}=require('../.test-build/supplier-price-comparison.js');

test('supplier comparison keeps the latest price per supplier and sorts the cheapest first',()=>{
  const result=compareSupplierPrices([
    {productId:'p1',productName:'Camera',supplierId:'s1',supplierName:'One',unitCost:120,date:'2026-01-01'},
    {productId:'p1',productName:'Camera',supplierId:'s1',supplierName:'One',unitCost:100,date:'2026-02-01'},
    {productId:'p1',productName:'Camera',supplierId:'s2',supplierName:'Two',unitCost:110,date:'02/03/2026'},
    {productId:'p1',productName:'Camera',supplierId:'s3',supplierName:'Invalid',unitCost:-1,date:'2026-03-01'}
  ]);
  assert.equal(result.length,1);
  assert.equal(result[0].options[0].supplierId,'s1');
  assert.equal(result[0].options[0].unitCost,100);
  assert.equal(result[0].options[1].date,'2026-03-02');
  assert.equal(result[0].saving,10);
});
