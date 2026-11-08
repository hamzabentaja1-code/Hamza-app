const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createSalesDocument, transitionDocument, stockDeltaForDocument,
  ensureStockAvailable, cashBalance,
} = require('../.test-build/workflows.js');

const line = { id: 'l1', productId: 'p1', description: 'Camera', quantity: 2, unitPrice: 25000 };
const makeDoc = (overrides = {}) => ({
  id: 'd1', kind: 'delivery_note', status: 'confirmed', customerId: 'c1',
  lines: [line], totals: { subtotal: 50000, discount: 0, total: 50000 },
  createdAt: '2026-11-08T10:00:00.000Z', updatedAt: '2026-11-08T10:00:00.000Z',
  ...overrides,
});

test('creates a dated draft with calculated centime totals and validates required fields', () => {
  const doc = createSalesDocument({ id: 'q1', kind: 'quote', customerId: 'c1', lines: [line], now: '2026-11-08T10:00:00.000Z' });
  assert.equal(doc.status, 'draft');
  assert.equal(doc.totals.total, 50000);
  assert.equal(doc.createdAt, doc.updatedAt);
  assert.throws(() => createSalesDocument({ id: 'bad', kind: 'quote', customerId: ' ', lines: [] }), /خاص اختيار الزبون/);
  assert.throws(() => createSalesDocument({ id: 'bad', kind: 'quote', customerId: 'c1', lines: [] }), /خاص تزيد سطر/);
});

test('document transitions follow allowed states and stamp the update time', () => {
  const draft = createSalesDocument({ id: 'q1', kind: 'quote', customerId: 'c1', lines: [line], now: '2026-11-08' });
  assert.equal(transitionDocument(draft, 'confirmed', '2026-11-09').updatedAt, '2026-11-09');
  assert.throws(() => transitionDocument(draft, 'paid'), /لا يمكن تغيير حالة الوثيقة/);
  assert.throws(() => transitionDocument({ ...draft, status: 'paid' }, 'cancelled'), /لا يمكن تغيير حالة الوثيقة/);
});

test('confirmed deliveries reduce stock only once; credit notes restore stock', () => {
  assert.deepEqual(stockDeltaForDocument(makeDoc(), 'w1', []), [{ productId: 'p1', warehouseId: 'w1', quantity: -2 }]);
  assert.deepEqual(stockDeltaForDocument(makeDoc(), 'w1', ['d1']), []);
  assert.deepEqual(stockDeltaForDocument(makeDoc({ sourceDocumentId: 'delivery-1' }), 'w1', ['delivery-1']), []);
  assert.deepEqual(stockDeltaForDocument(makeDoc({ kind: 'customer_credit_note' }), 'w1', []), [{ productId: 'p1', warehouseId: 'w1', quantity: 2 }]);
  assert.deepEqual(stockDeltaForDocument(makeDoc({ status: 'draft' }), 'w1', []), []);
});

test('stock validation rejects an issue beyond the selected warehouse balance', () => {
  assert.doesNotThrow(() => ensureStockAvailable([{ productId: 'p1', warehouseId: 'w1', quantity: 4 }], [{ productId: 'p1', warehouseId: 'w1', quantity: -3 }]));
  assert.throws(() => ensureStockAvailable([{ productId: 'p1', warehouseId: 'w1', quantity: 1 }], [{ productId: 'p1', warehouseId: 'w1', quantity: -2 }]), /المخزون غير كافٍ/);
});

test('cash ledger validates opening and movement amounts and totals inflows and outflows', () => {
  assert.equal(cashBalance(10000, [
    { id: '1', direction: 'in', amount: 5000, reason: 'sale', createdAt: '2026-11-08' },
    { id: '2', direction: 'out', amount: 2000, reason: 'expense', createdAt: '2026-11-08' },
  ]), 13000);
  assert.throws(() => cashBalance(0, [{ id: 'bad', direction: 'in', amount: 0, reason: '', createdAt: '' }]), /مبلغ الحركة غير صالح/);
});
