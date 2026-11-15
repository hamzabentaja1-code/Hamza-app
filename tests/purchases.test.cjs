const test=require('node:test');
const assert=require('node:assert/strict');
const {createPurchaseDocument,normalizePurchaseDocuments,changePurchaseStatus,convertPurchaseDocument,prepareSupplierReturn,purchaseTotals}=require('../.test-build/purchases.js');
const line={productId:'p1',description:'Camera',quantity:2,unitCost:100,discount:10};
const create=(kind,id='doc-1',extra={})=>createPurchaseDocument({id,number:`PO-${id}`,kind,supplierId:'s1',lines:[line],createdAt:'2026-11-15T10:00:00.000Z',...extra});

test('creates, validates and calculates purchase document totals',()=>{
  const request=create('request');
  assert.equal(request.status,'draft');
  assert.equal(purchaseTotals(request).total,190);
  assert.throws(()=>createPurchaseDocument({id:'x',number:'x',kind:'receipt',supplierId:'s1',lines:[line],createdAt:'now'},[]),/المخزن/);
});

test('purchase documents move request to order to warehouse receipt',()=>{
  const request=changePurchaseStatus(create('request'),'confirmed');
  const order=convertPurchaseDocument(request,'order',{id:'doc-2',number:'PO-doc-2',createdAt:'2026-11-15T11:00:00.000Z'},[request]);
  const confirmedOrder=changePurchaseStatus(order,'confirmed');
  const receipt=convertPurchaseDocument(confirmedOrder,'receipt',{id:'doc-3',number:'PO-doc-3',createdAt:'2026-11-15T12:00:00.000Z',warehouseId:'w1'},[request,order]);
  assert.equal(receipt.kind,'receipt');
  assert.equal(receipt.warehouseId,'w1');
  assert.equal(receipt.sourceDocumentId,order.id);
  assert.deepEqual(receipt.lines,request.lines);
  assert.throws(()=>convertPurchaseDocument(request,'receipt',{id:'x',number:'x',createdAt:'now',warehouseId:'w1'},[request]));
  assert.throws(()=>convertPurchaseDocument(confirmedOrder,'receipt',{id:'x',number:'x',createdAt:'now'},[request,order]));
});

test('normalizes legacy-safe purchase documents and drops malformed or duplicate IDs',()=>{
  const valid=create('order');
  const restored=normalizePurchaseDocuments([valid,{...valid,id:'duplicate'},{...valid,id:'bad',status:'received'},{id:'x'}]);
  assert.equal(restored.length,1);
  assert.equal(restored[0].number,valid.number);
});

test('confirmed supplier credit notes cannot be cancelled after they affect the account',()=>{
  const credit=changePurchaseStatus(create('supplier_credit'),'confirmed');
  assert.throws(()=>changePurchaseStatus(credit,'cancelled'),/تلغي إشعار دائن/);
});

test('supplier physical returns remove available stock once and respect purchased quantity',()=>{
  const credit=create('supplier_credit','credit-1',{sourceDocumentId:'9',physicalReturn:true,warehouseId:'w1',lines:[{...line,quantity:2,unitCost:100,discount:0}]});
  const movements=[{id:'in-1',productId:'p1',warehouseId:'w1',kind:'purchase',quantity:4,unitCost:100,createdAt:'2026-11-15T10:00:00.000Z'}];
  const movement=prepareSupplierReturn({document:credit,purchase:{id:9,productId:'p1',qty:4,unitCost:100},movements,previouslyReturnedQuantity:1,createdAt:'2026-11-15T12:00:00.000Z'});
  assert.equal(movement.kind,'return_out');
  assert.equal(movement.quantity,2);
  assert.throws(()=>prepareSupplierReturn({document:credit,purchase:{id:9,productId:'p1',qty:4,unitCost:100},movements,previouslyReturnedQuantity:3,createdAt:'2026-11-15T12:00:00.000Z'}),/الكمية اللي تشرت/);
  assert.throws(()=>prepareSupplierReturn({document:credit,purchase:{id:9,productId:'p1',qty:4,unitCost:100},movements:[{...movements[0],quantity:1}],previouslyReturnedQuantity:0,createdAt:'2026-11-15T12:00:00.000Z'}),/ما كافيش/);
});
