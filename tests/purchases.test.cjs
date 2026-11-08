const test=require('node:test');
const assert=require('node:assert/strict');
const {purchaseTotals,validatePurchase,changePurchaseStatus,supplierOutstanding,supplierCreditBalance,validateSupplierPayment}=require('../.test-build/purchases.js');

const doc=(overrides={})=>({id:'p1',number:'ACH-1',kind:'supplier_invoice',status:'draft',supplierId:'s1',lines:[{productId:'prod1',description:'Caméra',quantity:2,unitCost:100,discount:10}],globalDiscount:5,createdAt:'2026-11-08',...overrides});

test('purchase totals apply line and document discounts',()=>assert.deepEqual(purchaseTotals(doc()),{subtotal:190,discount:5,total:185}));
test('purchase validation requires a supplier and valid product quantities',()=>{
  assert.deepEqual(validatePurchase(doc()),[]);
  assert.ok(validatePurchase(doc({supplierId:''})).includes('خاص اختيار المورد'));
  assert.ok(validatePurchase(doc({lines:[{productId:'',description:'',quantity:0,unitCost:-1,discount:0}]})).length>=3);
});
test('purchase statuses reject invalid receipt transitions and cancelled updates',()=>{
  assert.equal(changePurchaseStatus(doc(), 'confirmed').status,'confirmed');
  assert.throws(()=>changePurchaseStatus(doc({kind:'receipt'}),'confirmed'));
  assert.throws(()=>changePurchaseStatus(doc({status:'cancelled'}),'confirmed'));
});
test('supplier payments reduce the balance and require cheque references',()=>{
  const payments=[{id:'pay1',supplierId:'s1',amount:4000,date:'2026-11-08',method:'cash'}];
  assert.equal(supplierOutstanding(10000,payments,'s1'),6000);
  assert.deepEqual(validateSupplierPayment({id:'p2',supplierId:'s1',amount:1000,date:'2026-11-08',method:'cheque'}),['مرجع الشيك إجباري']);
});
test('supplier return credits offset debt and produce a supplier credit after settlement',()=>{
  const payments=[{id:'p1',supplierId:'s1',amount:6000,date:'2026-11-08',method:'cash'}];
  assert.equal(supplierOutstanding(10000,payments,'s1',2000),2000);
  assert.equal(supplierCreditBalance(10000,payments,'s1',12000),8000);
});
