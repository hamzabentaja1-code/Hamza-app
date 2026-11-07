const test=require('node:test');
const assert=require('node:assert/strict');
const {projectedCustomerBalance,exceedsCustomerCreditLimit,calculatePaymentDueDate}=require('../.test-build/credit-limits.js');
test('projects debt and checks the credit ceiling',()=>{
 assert.equal(projectedCustomerBalance(2500,3000),5500);
 assert.equal(exceedsCustomerCreditLimit(2500,3000,6000),false);
 assert.equal(exceedsCustomerCreditLimit(2500,3501,6000),true);
});
test('an undefined credit ceiling leaves credit unrestricted',()=>{
 assert.equal(exceedsCustomerCreditLimit(100,200),false);
});
test('allows overpayment credit balances below zero',()=>{
 assert.equal(exceedsCustomerCreditLimit(-1000,500,0),false);
});
test('calculates invoice due date from payment terms',()=>{
 assert.equal(calculatePaymentDueDate('2026-11-07T12:00:00.000Z',30),'2026-12-07');
 assert.equal(calculatePaymentDueDate('2026-11-07T12:00:00.000Z',0),'2026-11-07');
 assert.equal(calculatePaymentDueDate('2026-11-07',undefined),undefined);
});
test('rejects invalid limits, amounts and payment terms',()=>{
 assert.throws(()=>exceedsCustomerCreditLimit(0,100,-1));
 assert.throws(()=>projectedCustomerBalance(0,-1));
 assert.throws(()=>calculatePaymentDueDate('bad',2));
 assert.throws(()=>calculatePaymentDueDate('2026-11-07',1.5));
});
