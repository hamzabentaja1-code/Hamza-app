const test=require('node:test');
const assert=require('node:assert/strict');
const {purchaseTotals,validatePurchase,changePurchaseStatus,createPurchaseDocument,convertPurchaseDocument,createSupplierCredit,supplierOutstanding,supplierCreditBalance,validateSupplierPayment}=require('../.test-build/purchases.js');

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
test('purchase workflow links request, order, receipt, and supplier invoice without duplicate stock documents',()=>{
  const request=createPurchaseDocument({...doc(),kind:'request',status:undefined},[]);
  const confirmedRequest=changePurchaseStatus(request,'confirmed');
  const order=convertPurchaseDocument(confirmedRequest,'order',[request,confirmedRequest],'p2','CMD-2','2026-11-08','main');
  const confirmedOrder=changePurchaseStatus(order,'confirmed');
  const receipt=convertPurchaseDocument(confirmedOrder,'receipt',[request,confirmedRequest,order,confirmedOrder],'p3','REC-3','2026-11-08','main');
  assert.equal(receipt.status,'received');
  const invoice=convertPurchaseDocument(receipt,'supplier_invoice',[request,confirmedRequest,order,confirmedOrder,receipt],'p4','FAC-4','2026-11-08');
  assert.equal(invoice.status,'draft');
  assert.equal(invoice.sourceDocumentId,receipt.id);
  assert.throws(()=>convertPurchaseDocument(confirmedOrder,'receipt',[request,confirmedRequest,order,confirmedOrder,receipt],'p5','REC-5','2026-11-08','main'),/من قبل/);
});

test('purchase conversions require confirmed sources and valid inventory receipt warehouse',()=>{
  const request=createPurchaseDocument({...doc(),kind:'request'},[]);
  assert.throws(()=>convertPurchaseDocument(request,'order',[request],'p2','CMD-2','2026-11-08'),/أكد طلب/);
  const order={...doc(),id:'o1',number:'CMD-1',kind:'order',status:'confirmed'};
  assert.throws(()=>convertPurchaseDocument(order,'receipt',[order],'r1','REC-1','2026-11-08'),/المخزن/);
});


test('supplier credit returns confirmed invoice quantities once and prorates discounts',()=>{
  const invoice=doc({kind:'supplier_invoice',status:'confirmed',warehouseId:'main',globalDiscount:10});
  const credit=createSupplierCredit(invoice,[invoice],{prod1:1},'cr1','AV-1','2026-11-08');
  assert.equal(credit.kind,'supplier_credit');
  assert.equal(credit.status,'confirmed');
  assert.equal(credit.warehouseId,'main');
  assert.equal(credit.lines[0].quantity,1);
  assert.equal(Math.round(purchaseTotals(credit).total*100),9000);
  assert.throws(()=>createSupplierCredit(invoice,[invoice,credit],{prod1:2},'cr2','AV-2','2026-11-08'),/المتبقية/);
  assert.throws(()=>createSupplierCredit(invoice,[invoice],{missing:1},'cr3','AV-3','2026-11-08'),/غير موجود/);
});
