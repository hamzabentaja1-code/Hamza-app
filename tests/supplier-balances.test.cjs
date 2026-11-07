const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateSupplierBalances } = require('../.test-build/supplier-balances.js');

test('calculates supplier balance after partial payments', () => {
  const result = calculateSupplierBalances(
    [{ name: 'Supplier A' }, { name: 'Supplier B' }],
    [{ supplierName: 'Supplier A', total: 1000 }, { supplierName: 'Supplier A', total: 250 }, { supplierName: 'Supplier B', total: 400 }],
    [{ supplierName: 'Supplier A', amount: 300 }, { supplierName: 'Supplier B', amount: 400 }],
  );
  assert.deepEqual(result, [
    { supplierName: 'Supplier A', total: 1250, paid: 300, outstanding: 950 },
    { supplierName: 'Supplier B', total: 400, paid: 400, outstanding: 0 },
  ]);
});

test('rejects invalid purchase and payment amounts', () => {
  assert.throws(() => calculateSupplierBalances([{ name: 'A' }], [{ supplierName: 'A', total: -1 }], []));
  assert.throws(() => calculateSupplierBalances([{ name: 'A' }], [], [{ supplierName: 'A', amount: -1 }]));
});
