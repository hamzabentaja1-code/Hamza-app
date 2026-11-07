const test = require('node:test');
const assert = require('node:assert/strict');
const {
  remainingReturnQuantity,
  calculateSalesReturn,
  totalReturnProfitAdjustment,
} = require('../.test-build/sales-returns.js');

const sale = { id: 7, qty: 5, total: 450, costPrice: 60 };
const existing = [
  { saleId: 7, qty: 1, total: 90, costPrice: 60 },
  { saleId: 8, qty: 2, total: 100, costPrice: 20 },
];

test('remaining quantity only counts returns for the selected sale', () => {
  assert.equal(remainingReturnQuantity(sale, existing), 4);
});

test('partial return uses the actual discounted sale unit value', () => {
  const result = calculateSalesReturn(sale, existing, 2);
  assert.equal(result.unitPrice, 90);
  assert.equal(result.total, 180);
  assert.equal(result.profitAdjustment, 60);
  assert.equal(result.remainingQuantity, 2);
});

test('return rejects fractional, zero and over-return quantities', () => {
  assert.throws(() => calculateSalesReturn(sale, existing, 0), /كمية الإرجاع/);
  assert.throws(() => calculateSalesReturn(sale, existing, 1.5), /كمية الإرجاع/);
  assert.throws(() => calculateSalesReturn(sale, existing, 5), /كمية الإرجاع/);
});

test('returns without stored cost do not invent a profit adjustment', () => {
  const result = calculateSalesReturn({ id: 9, qty: 2, total: 50 }, [], 1);
  assert.equal(result.total, 25);
  assert.equal(result.profitAdjustment, undefined);
});

test('total return profit adjustment is calculated from stored costs only', () => {
  assert.equal(totalReturnProfitAdjustment(existing), 90);
});
