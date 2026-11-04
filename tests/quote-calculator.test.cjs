const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateQuote } = require('../.test-build/quote-calculator.js');

test('calculates multiple quote lines in integer centimes', () => {
  const result = calculateQuote([
    { description: 'A', quantity: 2, unitPriceCentimes: 1250 },
    { description: 'B', quantity: 3, unitPriceCentimes: 2000 },
  ]);
  assert.equal(result.subtotalCentimes, 8500);
  assert.equal(result.totalCentimes, 8500);
});

test('applies line and document discounts', () => {
  const result = calculateQuote([
    { description: 'A', quantity: 2, unitPriceCentimes: 1000, discountCentimes: 100 },
    { description: 'B', quantity: 1, unitPriceCentimes: 500 },
  ], 200);
  assert.equal(result.subtotalCentimes, 2400);
  assert.equal(result.totalCentimes, 2200);
});

test('supports fractional quantities to three decimal places', () => {
  const result = calculateQuote([
    { description: 'Cable', quantity: 0.25, unitPriceCentimes: 10000 },
  ]);
  assert.equal(result.totalCentimes, 2500);
});

test('rejects an empty quote', () => {
  assert.throws(() => calculateQuote([]), /at least one/i);
});

test('rejects invalid quantities and negative prices', () => {
  assert.throws(() => calculateQuote([{ description: 'A', quantity: 0, unitPriceCentimes: 100 }]));
  assert.throws(() => calculateQuote([{ description: 'A', quantity: 1, unitPriceCentimes: -1 }]));
  assert.throws(() => calculateQuote([{ description: 'A', quantity: 1.0001, unitPriceCentimes: 100 }]));
});

test('rejects discounts greater than the amount', () => {
  assert.throws(() => calculateQuote([
    { description: 'A', quantity: 1, unitPriceCentimes: 100, discountCentimes: 101 },
  ]));
  assert.throws(() => calculateQuote([
    { description: 'A', quantity: 1, unitPriceCentimes: 100 },
  ], 101));
});
