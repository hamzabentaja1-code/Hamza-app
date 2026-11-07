const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateSalesProfit } = require('../.test-build/profit.js');

test('calculates gross profit from sale-time unit cost', () => {
  const result = calculateSalesProfit([
    { total: 500, quantity: 2, unitCost: 150 },
    { total: 180, quantity: 1, unitCost: 100 },
  ]);
  assert.deepEqual(result, {
    grossProfit: 280,
    costOfGoodsSold: 400,
    trackedSalesCount: 2,
    untrackedSalesCount: 0,
  });
});

test('excludes legacy sales without a stored cost and counts them', () => {
  const result = calculateSalesProfit([
    { total: 250, quantity: 1 },
    { total: 200, quantity: 2, unitCost: 60 },
  ]);
  assert.equal(result.grossProfit, 80);
  assert.equal(result.trackedSalesCount, 1);
  assert.equal(result.untrackedSalesCount, 1);
});

test('rejects invalid sale records', () => {
  assert.throws(() => calculateSalesProfit([{ total: -1, quantity: 1, unitCost: 0 }]));
  assert.throws(() => calculateSalesProfit([{ total: 10, quantity: 1, unitCost: -2 }]));
});
