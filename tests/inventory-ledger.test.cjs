const test = require('node:test');
const assert = require('node:assert/strict');
const {
  appendInventoryMovement, inventoryBalance, inventoryBalanceForWarehouse,
  createStockCount, inventoryMovementsForProduct, createWarehouseTransfer,
  DEFAULT_WAREHOUSE_ID,
} = require('../.test-build/inventory-ledger.js');

const opening = {
  id: 'opening-1', productId: 1, productName: 'Cable',
  kind: 'opening', quantityDelta: 10, date: '2026-11-01',
};

test('ledger calculates opening, purchase and sale balance', () => {
  let movements = appendInventoryMovement([], opening);
  movements = appendInventoryMovement(movements, { ...opening, id: 'purchase-1', kind: 'purchase', quantityDelta: 5 });
  movements = appendInventoryMovement(movements, { ...opening, id: 'sale-1', kind: 'sale', quantityDelta: -3 });
  assert.equal(inventoryBalance(movements, 1), 12);
});

test('legacy movements without a warehouse belong to the default warehouse', () => {
  const movements = appendInventoryMovement([], opening);
  assert.equal(movements[0].warehouseId, DEFAULT_WAREHOUSE_ID);
  assert.equal(inventoryBalanceForWarehouse(movements, 1, DEFAULT_WAREHOUSE_ID), 10);
});

test('ledger rejects duplicate movements and negative stock in one warehouse', () => {
  const movements = appendInventoryMovement([], opening);
  assert.throws(() => appendInventoryMovement(movements, opening), /مسجلة من قبل/);
  assert.throws(() => appendInventoryMovement(movements, { ...opening, id: 'sale-too-much', kind: 'sale', quantityDelta: -11 }), /المخزون غير كافٍ/);
  const otherWarehouse = appendInventoryMovement(movements, { ...opening, id: 'other-opening', warehouseId: 'w2', quantityDelta: 4 });
  assert.throws(() => appendInventoryMovement(otherWarehouse, { ...opening, id: 'w2-sale', warehouseId: 'w2', kind: 'sale', quantityDelta: -5 }), /المخزون غير كافٍ/);
});

test('stock count is scoped to the selected warehouse', () => {
  const movements = appendInventoryMovement([], opening);
  const inSecond = appendInventoryMovement(movements, { ...opening, id: 'opening-w2', warehouseId: 'w2', quantityDelta: 6 });
  const result = createStockCount(inSecond, {
    id: 'count-1', productId: 1, productName: 'Cable', countedQuantity: 4,
    date: '2026-11-07', warehouseId: 'w2', note: 'جرد الرف',
  });
  assert.equal(result.expectedQuantity, 6);
  assert.equal(result.difference, -2);
  assert.equal(inventoryBalanceForWarehouse([...inSecond, result.movement], 1, 'w2'), 4);
  assert.equal(inventoryBalance([...inSecond, result.movement], 1), 14);
});

test('stock count rejects invalid quantities and no-difference counts', () => {
  assert.throws(() => createStockCount([opening], { id: 'count-bad', productId: 1, productName: 'Cable', countedQuantity: -1, date: '2026-11-07' }), /صفر أو أكثر/);
  assert.throws(() => createStockCount([opening], { id: 'count-fraction', productId: 1, productName: 'Cable', countedQuantity: 2.5, date: '2026-11-07' }), /عدد صحيح/);
  assert.throws(() => createStockCount([opening], { id: 'count-same', productId: 1, productName: 'Cable', countedQuantity: 10, date: '2026-11-07' }), /مطابق/);
});

test('warehouse transfer creates a balanced atomic pair and preserves global stock', () => {
  const movements = appendInventoryMovement([], opening);
  const next = createWarehouseTransfer(movements, {
    id: 'transfer-1', productId: 1, productName: 'Cable', quantity: 4,
    fromWarehouseId: DEFAULT_WAREHOUSE_ID, toWarehouseId: 'w2',
    date: '2026-11-07T10:00:00.000Z',
  });
  assert.equal(next.length, 3);
  assert.equal(inventoryBalanceForWarehouse(next, 1, DEFAULT_WAREHOUSE_ID), 6);
  assert.equal(inventoryBalanceForWarehouse(next, 1, 'w2'), 4);
  assert.equal(inventoryBalance(next, 1), 10);
  assert.equal(next.filter(x => x.transferId === 'transfer-1').reduce((sum, x) => sum + x.quantityDelta, 0), 0);
  assert.throws(() => createWarehouseTransfer(movements, {
    id: 'transfer-too-much', productId: 1, productName: 'Cable', quantity: 11,
    fromWarehouseId: DEFAULT_WAREHOUSE_ID, toWarehouseId: 'w2', date: '2026-11-07',
  }), /المخزون غير كافٍ/);
  assert.throws(() => createWarehouseTransfer(movements, {
    id: 'transfer-same', productId: 1, productName: 'Cable', quantity: 1,
    fromWarehouseId: DEFAULT_WAREHOUSE_ID, toWarehouseId: DEFAULT_WAREHOUSE_ID, date: '2026-11-07',
  }), /مختلفين/);
  assert.throws(() => createWarehouseTransfer(next, {
    id: 'transfer-1', productId: 1, productName: 'Cable', quantity: 1,
    fromWarehouseId: DEFAULT_WAREHOUSE_ID, toWarehouseId: 'w2', date: '2026-11-07',
  }), /مسجل من قبل/);
});

test('movement history is filtered and newest first', () => {
  const movements = [opening, { ...opening, id: 'count-2', date: '2026-11-07', quantityDelta: -1 }, { ...opening, id: 'other', productId: 2 }];
  assert.deepEqual(inventoryMovementsForProduct(movements, 1).map(x => x.id), ['count-2', 'opening-1']);
});

test('movement history can be scoped to one warehouse while legacy history stays compatible', () => {
  const movements = appendInventoryMovement([], opening);
  const second = appendInventoryMovement(movements, {
    ...opening, id: 'warehouse-two-opening', warehouseId: 'w2', quantityDelta: 6,
    date: '2026-11-02',
  });
  assert.deepEqual(inventoryMovementsForProduct(second, 1, DEFAULT_WAREHOUSE_ID).map(x => x.id), ['opening-1']);
  assert.deepEqual(inventoryMovementsForProduct(second, 1, 'w2').map(x => x.id), ['warehouse-two-opening']);
  assert.deepEqual(inventoryMovementsForProduct(second, 1).map(x => x.id), ['warehouse-two-opening', 'opening-1']);
});

test('movement validation rejects fractional quantities, invalid dates and incorrect movement directions', () => {
  assert.throws(() => appendInventoryMovement([], { ...opening, id: 'fractional', quantityDelta: 1.5 }), /رقم صحيح/);
  assert.throws(() => appendInventoryMovement([], { ...opening, id: 'bad-date', date: 'not-a-date' }), /تاريخ الحركة غير صالح/);
  assert.throws(() => appendInventoryMovement([], { ...opening, id: 'negative-opening', quantityDelta: -2 }), /خاصو يزيد المخزون/);
  assert.throws(() => appendInventoryMovement([], { ...opening, id: 'positive-sale', kind: 'sale', quantityDelta: 2 }), /خاصو ينقص المخزون/);
  assert.throws(() => appendInventoryMovement([], { ...opening, id: 'positive-transfer-out', kind: 'transfer_out', quantityDelta: 1 }), /خاصو ينقص المخزون/);
  assert.throws(() => appendInventoryMovement([], { ...opening, id: 'negative-transfer-in', kind: 'transfer_in', quantityDelta: -1 }), /خاصو يزيد المخزون/);
  assert.doesNotThrow(() => appendInventoryMovement([], { ...opening, id: 'positive-adjustment', kind: 'adjustment', quantityDelta: 2 }));
  assert.doesNotThrow(() => appendInventoryMovement([], { ...opening, id: 'negative-adjustment', kind: 'adjustment', quantityDelta: -2 }));
});

test('customer return movements add stock and reversal removes it safely', () => {
  let movements = appendInventoryMovement([], opening);
  movements = appendInventoryMovement(movements, { ...opening, id: 'sale-return-test', kind: 'sale', quantityDelta: -4 });
  movements = appendInventoryMovement(movements, { ...opening, id: 'return-in-test', kind: 'return_in', quantityDelta: 2 });
  assert.equal(inventoryBalance(movements, 1), 8);
  movements = appendInventoryMovement(movements, { ...opening, id: 'return-out-test', kind: 'return_out', quantityDelta: -2 });
  assert.equal(inventoryBalance(movements, 1), 6);
  assert.throws(() => appendInventoryMovement(movements, { ...opening, id: 'return-out-too-much', kind: 'return_out', quantityDelta: -7 }), /المخزون غير كافٍ/);
});
