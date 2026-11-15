const test=require('node:test');
const assert=require('node:assert/strict');
const {summarizePurchasesBySupplier}=require('../.test-build/domain/purchase-report.js');

test('summarizes supplier purchase volume, initial payments, period settlements and credits separately',()=>{
  const rows=summarizePurchasesBySupplier([
    {supplierName:'Supplier B',quantity:2,total:1000,paidAmount:200},
    {supplierName:' supplier b ',quantity:3.125,total:500,paidAmount:0},
    {supplierName:'Supplier A',quantity:1,total:1200,paidAmount:1200},
    {supplierName:'Bad',quantity:0,total:10,paidAmount:0},
  ],[
    {supplierName:'Supplier B',amount:50,method:'نقداً'},
    {supplierName:'Supplier B',amount:20,method:'إشعار دائن'},
    {supplierName:'Supplier A',amount:10,method:'تحويل'},
  ]);
  assert.deepEqual(rows,[
    {supplierName:'Supplier B',purchaseCount:2,quantityMilliUnits:5125,purchaseTotalCentimes:150000,paidAtPurchaseCentimes:20000,cashSettledCentimes:5000,creditNoteCentimes:2000},
    {supplierName:'Supplier A',purchaseCount:1,quantityMilliUnits:1000,purchaseTotalCentimes:120000,paidAtPurchaseCentimes:120000,cashSettledCentimes:1000,creditNoteCentimes:0},
  ]);
});

test('includes suppliers with period-only payments and preserves legacy fully-paid purchases',()=>{
  assert.deepEqual(summarizePurchasesBySupplier([
    {supplierName:'Old supplier',quantity:1,total:12.345},
  ],[
    {supplierName:'Payment only',amount:7,method:'شيك'},
  ]),[
    {supplierName:'Old supplier',purchaseCount:1,quantityMilliUnits:1000,purchaseTotalCentimes:1235,paidAtPurchaseCentimes:1235,cashSettledCentimes:0,creditNoteCentimes:0},
    {supplierName:'Payment only',purchaseCount:0,quantityMilliUnits:0,purchaseTotalCentimes:0,paidAtPurchaseCentimes:0,cashSettledCentimes:700,creditNoteCentimes:0},
  ]);
});
