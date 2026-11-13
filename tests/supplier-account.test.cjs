const test=require('node:test');
const assert=require('node:assert/strict');
const {purchaseOutstanding,recordSupplierPayment,recordSupplierOpeningPayment,supplierAccountBalances,normalizeSupplierPayments,normalizePurchasePaidAmount}=require('../.test-build/supplier-account.js');

const purchase={id:9,supplierName:'Fournisseur',total:1000,paidAmount:200};
test('partial supplier payments reduce only the linked purchase balance',()=>{
  const first=recordSupplierPayment({purchase,payments:[],amount:300,id:1,date:'11/11/2026',method:'تحويل',bankAccountId:'bank-1'});
  assert.equal(purchaseOutstanding(purchase,[first]),500);
  assert.equal(purchaseOutstanding({...purchase,id:10},[first]),800);
});
test('supplier payment rejects overpayment and requires cheque reference',()=>{
  assert.throws(()=>recordSupplierPayment({purchase,payments:[],amount:801,id:2,date:'today',method:'نقداً'}));
  assert.throws(()=>recordSupplierPayment({purchase,payments:[],amount:50,id:3,date:'today',method:'شيك'}));
  assert.throws(()=>recordSupplierPayment({purchase,payments:[],amount:50,id:30,date:'today',method:'تحويل'}),/الحساب البنكي/);
});
test('supplier balances group purchases and payments by supplier',()=>{
  const payment=recordSupplierPayment({purchase,payments:[],amount:300,id:4,date:'today',method:'نقداً'});
  assert.deepEqual(supplierAccountBalances([purchase,{id:10,supplierName:'Fournisseur',total:50,paidAmount:0}],[payment]),[
    {supplierName:'Fournisseur',purchaseCount:2,total:1050,paid:500,openingBalanceCentimes:0,openingBalancePaidCentimes:0,outstanding:550},
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
test('supplier opening balances remain separate from purchases and accept partial payments',()=>{
  const opening=recordSupplierOpeningPayment({supplierName:'Supplier B',remainingCentimes:15000,amount:50,id:7,date:'today',method:'نقداً'});
  const rows=supplierAccountBalances([purchase],[],[{supplierName:'Supplier B',amountCentimes:15000}]);
  assert.equal(rows.find(row=>row.supplierName==='Supplier B').outstanding,150);
  const paidRows=supplierAccountBalances([purchase],[opening],[{supplierName:'Supplier B',amountCentimes:15000}]);
  assert.deepEqual(paidRows.find(row=>row.supplierName==='Supplier B'),{supplierName:'Supplier B',purchaseCount:0,total:0,paid:0,openingBalanceCentimes:15000,openingBalancePaidCentimes:5000,outstanding:100});
  assert.equal(normalizeSupplierPayments([opening,{id:'bad'}]).length,1);
});
test('supplier opening payment rejects overpayment and invalid cheque details',()=>{
  assert.throws(()=>recordSupplierOpeningPayment({supplierName:'Supplier B',remainingCentimes:1000,amount:11,id:8,date:'today',method:'نقداً'}),/أكبر من الدين/);
  assert.throws(()=>recordSupplierOpeningPayment({supplierName:'Supplier B',remainingCentimes:1000,amount:5,id:9,date:'today',method:'شيك'}),/مرجع الشيك/);
});
