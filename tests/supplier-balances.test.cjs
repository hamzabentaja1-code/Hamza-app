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
    { supplierName: 'Supplier A', purchaseCount: 2, totalCentimes: 60000, paidCentimes: 12500, outstandingCentimes: 47500 },
    { supplierName: 'Supplier B', purchaseCount: 1, totalCentimes: 30000, paidCentimes: 30000, outstandingCentimes: 0 },
  ]);
});

test('rejects payments greater than a purchase total', () => {
  assert.throws(() => calculateSupplierBalances([{ supplierName: 'A', total: 100, paidCentimes: 10001 }]));
});
