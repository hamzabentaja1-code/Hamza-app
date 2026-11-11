const test = require('node:test');
const assert = require('node:assert/strict');
const { applyPaymentToInvoice, allocateCreditNoteAcrossInvoices, allocatePaymentAcrossInvoices } = require('../.test-build/domain/payment-allocation.js');

test('partial payment updates paid amount and remaining balance', () => {
  const result = applyPaymentToInvoice({type:'invoice',total:250,paidCentimes:0,status:'صادرة'},7500);
  assert.equal(result.invoice.paidCentimes,7500);
  assert.equal(result.invoice.status,'partially_paid');
  assert.equal(result.remainingCentimes,17500);
});

test('final payment marks invoice paid', () => {
  const result = applyPaymentToInvoice({type:'invoice',total:250,paidCentimes:20000,status:'partially_paid'},5000);
  assert.equal(result.invoice.status,'paid');
  assert.equal(result.remainingCentimes,0);
});

test('overpayment and non-invoice allocations are rejected', () => {
  assert.throws(() => applyPaymentToInvoice({type:'invoice',total:100,status:'صادرة'},10001));
  assert.throws(() => applyPaymentToInvoice({type:'delivery',total:100,status:'صادرة'},100));
});

test('allocates unassigned customer payments to oldest open invoices first',()=>{
  const result=allocatePaymentAcrossInvoices([
    {id:20,total:100,paidCentimes:5000,status:'partially_paid'},
    {id:10,total:80,paidCentimes:0,status:'issued'},
  ],9000);
  assert.deepEqual(result,[
    {invoiceId:10,paidCentimes:8000,allocatedCentimes:8000,status:'paid'},
    {invoiceId:20,paidCentimes:6000,allocatedCentimes:1000,status:'partially_paid'},
  ]);
});

test('automatic allocation rejects payments above all outstanding invoices',()=>{
  assert.throws(()=>allocatePaymentAcrossInvoices([{id:1,total:10,paidCentimes:900,status:'partial'}],101));
  assert.throws(()=>allocatePaymentAcrossInvoices([],1));
});

test('credit notes reduce invoice due and payments cannot exceed the remaining amount',()=>{
 const credit=allocateCreditNoteAcrossInvoices([
  {id:20,total:100,paidCentimes:6000,status:'partial'},
  {id:10,total:80,paidCentimes:0,status:'issued'},
 ],2500,20);
 assert.deepEqual(credit,{allocations:[{invoiceId:20,creditedCentimes:2500,allocatedCentimes:2500,status:'partially_paid'}],unappliedCentimes:0});
 const paid=allocatePaymentAcrossInvoices([{id:20,total:100,paidCentimes:6000,creditedCentimes:2500,status:'partial'}],1500);
 assert.deepEqual(paid,[{invoiceId:20,paidCentimes:7500,creditedCentimes:2500,allocatedCentimes:1500,status:'paid'}]);
 assert.throws(()=>allocatePaymentAcrossInvoices([{id:20,total:100,paidCentimes:6000,creditedCentimes:2500,status:'partial'}],1501));
});

test('credit note leaves unapplied customer credit when no invoice is due',()=>{
 const result=allocateCreditNoteAcrossInvoices([{id:7,total:30,paidCentimes:3000,status:'paid'}],4500,7);
 assert.deepEqual(result,{allocations:[],unappliedCentimes:4500});
});
