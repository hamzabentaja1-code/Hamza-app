import test from 'node:test';
import assert from 'node:assert/strict';
import {
  warehouseStock, inventoryValue, transferStock, validateStockIssue,
  createStockCount, applyStockCount,
} from '../.test-build/inventory.js';

const base = [
  { id: 'open-1', productId: 'p1', warehouseId: 'w1', kind: 'opening', quantity: 10, unitCost: 20, createdAt: '2026-01-01' },
  { id: 'buy-1', productId: 'p1', warehouseId: 'w1', kind: 'purchase', quantity: 5, unitCost: 30, createdAt: '2026-01-02' },
  { id: 'sale-1', productId: 'p1', warehouseId: 'w1', kind: 'sale', quantity: 3, createdAt: '2026-01-03' },
];

test('stock balance and weighted inventory value remain consistent', () => {
  assert.equal(warehouseStock(base, 'p1', 'w1'), 12);
  assert.equal(inventoryValue(base, 'p1', 'w1'), 280);
});

test('transfer posts paired movements and preserves total stock', () => {
  const next = transferStock({
    id: 'tr-1', productId: 'p1', fromWarehouseId: 'w1',
    toWarehouseId: 'w2', quantity: 4, createdAt: '2026-01-04',
  }, base);
  assert.equal(warehouseStock(next, 'p1', 'w1'), 8);
  assert.equal(warehouseStock(next, 'p1', 'w2'), 4);
  assert.equal(warehouseStock(next, 'p1', 'w1') + warehouseStock(next, 'p1', 'w2'), 12);
  assert.throws(() => transferStock({
    id: 'tr-1', productId: 'p1', fromWarehouseId: 'w1',
    toWarehouseId: 'w2', quantity: 1, createdAt: '2026-01-05',
  }, next), /مسجل/);
});

test('stock issue rejects invalid and unavailable quantities', () => {
  assert.match(validateStockIssue(base, 'p1', 'w1', 0) ?? '', /أكبر من صفر/);
  assert.match(validateStockIssue(base, 'p1', 'w1', 99) ?? '', /غير كافي/);
});

test('stock count records only differences as auditable adjustments', () => {
  const count = createStockCount({
    id: 'count-1', warehouseId: 'w1', createdAt: '2026-02-01',
    lines: [{ productId: 'p1', countedQuantity: 10 }, { productId: 'p2', countedQuantity: 7 }],
  }, base);
  assert.equal(count.lines[0].expectedQuantity, 12);
  assert.equal(count.lines[0].difference, -2);
  assert.equal(count.lines[1].expectedQuantity, 0);
  assert.equal(count.lines[1].difference, 7);
  const next = applyStockCount(count, base);
  assert.equal(warehouseStock(next, 'p1', 'w1'), 10);
  assert.equal(warehouseStock(next, 'p2', 'w1'), 7);
  assert.equal(next.filter(m => m.stockCountId === 'count-1').length, 2);
  assert.throws(() => applyStockCount(count, next), /تطبق/);
});

test('stock count rejects duplicate products and negative or invalid counts', () => {
  assert.throws(() => createStockCount({
    id: 'bad-1', warehouseId: 'w1', createdAt: 'now',
    lines: [{ productId: 'p1', countedQuantity: 1 }, { productId: 'p1', countedQuantity: 2 }],
  }, base), /مكرر/);
  assert.throws(() => createStockCount({
    id: 'bad-2', warehouseId: 'w1', createdAt: 'now',
    lines: [{ productId: 'p1', countedQuantity: -1 }],
  }, base), /صفر/);
});
