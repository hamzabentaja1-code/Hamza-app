const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateSupplierBalances } = require('../.test-build/supplier-balances.js');

test('groups supplier debts and partial payments in integer centimes', () => {
  const result = calculateSupplierBalances([
    { supplierName: 'Supplier A', total: 500, paidCentimes: 12500 },
    { supplierName: 'Supplier A', total: 100, paidCentimes: 0 },
    { supplierName: 'Supplier B', total: 300, paidCentimes: 30000 },
  ]);
  assert.deepEqual(result, [
    { supplierName: 'Supplier A', purchaseCount: 2, totalCentimes: 60000, paidCentimes: 12500, openingBalanceCentimes: 0, outstandingCentimes: 47500 },
    { supplierName: 'Supplier B', purchaseCount: 1, totalCentimes: 30000, paidCentimes: 30000, openingBalanceCentimes: 0, outstandingCentimes: 0 },
  ]);
});

test('rejects payments greater than a purchase total', () => {
  assert.throws(() => calculateSupplierBalances([{ supplierName: 'A', total: 100, paidCentimes: 10001 }]));
});

test('adds opening supplier balances even without purchases', () => {
  const result = calculateSupplierBalances([], [
    { supplierName: 'Supplier C', openingBalanceCentimes: 24000 },
  ]);
  assert.equal(result[0].openingBalanceCentimes, 24000);
  assert.equal(result[0].outstandingCentimes, 24000);
});
test('rejects invalid supplier opening balances', () => {
  assert.throws(() => calculateSupplierBalances([], [
    { supplierName: 'Supplier D', openingBalanceCentimes: -1 },
  ]));
});
