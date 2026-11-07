const test = require('node:test');
const assert = require('node:assert/strict');
const {
  appendInventoryMovement,
  inventoryBalance,
  createStockCount,
  inventoryMovementsForProduct,
} = require('../.test-build/inventory-ledger.js');

const opening = {
  id: 'opening-1', productId: 1, productName: 'Cable',
  kind: 'opening', quantityDelta: 10, date: '2026-11-01',
};

test('ledger calculates opening, purchase and sale balance', () => {
  let movements = appendInventoryMovement([], opening);
  movements = appendInventoryMovement(movements, {
    ...opening, id: 'purchase-1', kind: 'purchase', quantityDelta: 5,
  });
  movements = appendInventoryMovement(movements, {
    ...opening, id: 'sale-1', kind: 'sale', quantityDelta: -3,
  });
  assert.equal(inventoryBalance(movements, 1), 12);
});

test('ledger rejects duplicate movements and negative stock', () => {
  const movements = appendInventoryMovement([], opening);
  assert.throws(() => appendInventoryMovement(movements, opening), /مسجلة من قبل/);
  assert.throws(() => appendInventoryMovement(movements, {
    ...opening, id: 'sale-too-much', kind: 'sale', quantityDelta: -11,
  }), /المخزون غير كافٍ/);
});

test('stock count creates an auditable adjustment to counted quantity', () => {
  const movements = appendInventoryMovement([], opening);
  const result = createStockCount(movements, {
    id: 'count-1', productId: 1, productName: 'Cable',
    countedQuantity: 7, date: '2026-11-07', note: 'جرد الرف',
  });
  assert.equal(result.expectedQuantity, 10);
  assert.equal(result.difference, -3);
  assert.equal(inventoryBalance([...movements, result.movement], 1), 7);
});

test('stock count rejects invalid quantities and no-difference counts', () => {
  assert.throws(() => createStockCount([opening], {
    id: 'count-bad', productId: 1, productName: 'Cable',
    countedQuantity: -1, date: '2026-11-07',
  }), /صفر أو أكثر/);
  assert.throws(() => createStockCount([opening], {
    id: 'count-same', productId: 1, productName: 'Cable',
    countedQuantity: 10, date: '2026-11-07',
  }), /مطابق/);
});

test('movement history is filtered and newest first', () => {
  const movements = [
    opening,
    { ...opening, id: 'count-2', date: '2026-11-07', quantityDelta: -1 },
    { ...opening, id: 'other', productId: 2 },
  ];
  assert.deepEqual(inventoryMovementsForProduct(movements, 1).map(x => x.id), ['count-2', 'opening-1']);
});
