const test=require('node:test');
const assert=require('node:assert/strict');
const {preparePurchaseEntry}=require('../.test-build/domain/purchase-entry.js');

const base={
  id:7,product:{id:2,name:'Cable',qty:5},supplier:{name:'Shop',creditLimitCentimes:10000,paymentDelayDays:30},
  quantity:3,unitCost:12.345,paidAmount:10,method:'نقداً',warehouseId:'main',date:'14/11/2026',createdAt:'2026-11-14T10:00:00.000Z',currentSupplierDebtCentimes:1000,
};

test('purchase entry creates one centime-rounded supplier purchase and linked stock receipt',()=>{
  const entry=preparePurchaseEntry(base);
  assert.equal(entry.totalCentimes,3705);
  assert.equal(entry.paidCentimes,1000);
  assert.equal(entry.purchase.total,37.05);
  assert.equal(entry.purchase.unitCost,12.35);
  assert.equal(entry.purchase.paidAmount,10);
  assert.equal(entry.purchase.paymentDelayDays,30);
  assert.equal(entry.movement.productId,'2');
  assert.equal(entry.movement.warehouseId,'main');
  assert.equal(entry.movement.quantity,3);
  assert.equal(entry.newProductQuantity,8);
});

test('bank-paid purchase requires a selected funded account and stores the account reference',()=>{
  assert.throws(()=>preparePurchaseEntry({...base,method:'تحويل'}),/الحساب البنكي/);
  assert.throws(()=>preparePurchaseEntry({...base,method:'بطاقة',bankAccountId:'b1',bankBalanceCentimes:999}),/رصيد الحساب البنكي/);
  const entry=preparePurchaseEntry({...base,method:'تحويل',bankAccountId:' b1 ',bankBalanceCentimes:1000});
  assert.equal(entry.purchase.bankAccountId,'b1');
});

test('purchase entry rejects overpayment, over-credit and invalid product or warehouse details',()=>{
  assert.throws(()=>preparePurchaseEntry({...base,paidAmount:50}),/راجع كمية الشراء/);
  assert.throws(()=>preparePurchaseEntry({...base,currentSupplierDebtCentimes:9000}),/سقف الدين/);
  assert.throws(()=>preparePurchaseEntry({...base,supplier:{...base.supplier,creditLimitCentimes:-1}}),/سقف الدين/);
  assert.throws(()=>preparePurchaseEntry({...base,quantity:0}),/راجع كمية الشراء/);
  assert.throws(()=>preparePurchaseEntry({...base,warehouseId:''}),/راجع كمية الشراء/);
});

test('a cash purchase with no initial payment does not require or record a bank account',()=>{
  const entry=preparePurchaseEntry({...base,paidAmount:0,bankAccountId:undefined,bankBalanceCentimes:undefined});
  assert.equal(entry.purchase.paidAmount,0);
  assert.equal(entry.purchase.bankAccountId,undefined);
});
