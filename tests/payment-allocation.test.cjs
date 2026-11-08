const test = require('node:test');
const assert = require('node:assert/strict');
const { applyPaymentToInvoice } = require('../.test-build/domain/payment-allocation.js');

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

test('credit notes reduce the amount due and prevent payment above the revised balance',()=>{
  const result=applyPaymentToInvoice({type:'invoice',total:100,paidCentimes:0,creditedCentimes:2500,status:'صادرة'},7500);
  assert.equal(result.remainingCentimes,0);
  assert.throws(()=>applyPaymentToInvoice({type:'invoice',total:100,paidCentimes:0,creditedCentimes:2500,status:'صادرة'},7501),/exceeds/);
});
