const test = require('node:test');
const assert = require('node:assert/strict');
const {
  allocateSupplierPayment,
  reverseSupplierPayment,
} = require('../.test-build/supplier-payments.js');

test('supplier payments allocate partial amounts in centimes', () => {
  const result = allocateSupplierPayment({ total: 1200, paidCentimes: 25000 }, 17500);
  assert.deepEqual(result, { paidCentimes: 42500, remainingCentimes: 77500 });
});

test('supplier payments reject zero, fractional centimes and overpayment', () => {
  const purchase = { total: 100, paidCentimes: 2500 };
  assert.throws(() => allocateSupplierPayment(purchase, 0), /مبلغ الأداء/);
  assert.throws(() => allocateSupplierPayment(purchase, 1.5), /مبلغ الأداء/);
  assert.throws(() => allocateSupplierPayment(purchase, 7501), /أكبر من الدين/);
});

test('supplier payment reversal restores the outstanding amount', () => {
  const result = reverseSupplierPayment({ total: 100, paidCentimes: 7000 }, 2500);
  assert.deepEqual(result, { paidCentimes: 4500, remainingCentimes: 5500 });
});

test('supplier payment reversal cannot exceed paid amount', () => {
  assert.throws(() => reverseSupplierPayment({ total: 100, paidCentimes: 2000 }, 2001), /عكس الأداء/);
});
