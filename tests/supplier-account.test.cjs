const test=require('node:test');
const assert=require('node:assert/strict');
const {purchaseOutstanding,recordSupplierPayment,supplierAccountBalances,normalizeSupplierPayments,normalizePurchasePaidAmount}=require('../.test-build/supplier-account.js');

const purchase={id:9,supplierName:'Fournisseur',total:1000,paidAmount:200};
test('partial supplier payments reduce only the linked purchase balance',()=>{
  const first=recordSupplierPayment({purchase,payments:[],amount:300,id:1,date:'11/11/2026',method:'تحويل'});
  assert.equal(purchaseOutstanding(purchase,[first]),500);
  assert.equal(purchaseOutstanding({...purchase,id:10},[first]),800);
});
test('supplier payment rejects overpayment and requires cheque reference',()=>{
  assert.throws(()=>recordSupplierPayment({purchase,payments:[],amount:801,id:2,date:'today',method:'نقداً'}));
  assert.throws(()=>recordSupplierPayment({purchase,payments:[],amount:50,id:3,date:'today',method:'شيك'}));
});
test('supplier balances group purchases and payments by supplier',()=>{
  const payment=recordSupplierPayment({purchase,payments:[],amount:300,id:4,date:'today',method:'نقداً'});
  assert.deepEqual(supplierAccountBalances([purchase,{id:10,supplierName:'Fournisseur',total:50,paidAmount:0}],[payment]),[
    {supplierName:'Fournisseur',purchaseCount:2,total:1050,paid:500,outstanding:550},
  ]);
});
test('normalizer drops malformed supplier payment records',()=>{
  const payment=recordSupplierPayment({purchase,payments:[],amount:10,id:5,date:'today',method:'نقداً'});
  assert.equal(normalizeSupplierPayments([payment,{id:'bad'}]).length,1);
  assert.deepEqual(normalizeSupplierPayments(null),[]);
});
test('legacy purchases without settlement history are migrated as settled',()=>{
  assert.equal(normalizePurchasePaidAmount(90,undefined),90);
  assert.equal(normalizePurchasePaidAmount(90,20),20);
  assert.equal(normalizePurchasePaidAmount(90,120),90);
});
