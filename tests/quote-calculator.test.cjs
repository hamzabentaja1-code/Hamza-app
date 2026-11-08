const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateQuote } = require('../.test-build/domain/quote-calculator.js');

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

const { convertQuote } = require('../.test-build/domain/document-conversion.js');

test('converts quote to invoice without changing stock', () => {
  const products = [{id:7,qty:10}];
  const result = convertQuote({
    id:1,productName:'Widget',customerName:'Client',qty:2,unitPrice:500,total:1000,
    lines:[{productId:7,productName:'Widget',qty:2,unitPrice:500,total:1000}],
  },'invoice',[],products,99,'04/11/2026');
  assert.equal(result.document.number,'FAC-99');
  assert.deepEqual(result.updatedProducts,products);
});

test('delivery conversion deducts stock once and blocks duplicates', () => {
  const quote = {
    id:2,productName:'Widget',customerName:'Client',qty:3,unitPrice:100,total:300,
    lines:[{productId:7,productName:'Widget',qty:3,unitPrice:100,total:300}],
  };
  const products = [{id:7,qty:8}];
  const result = convertQuote(quote,'delivery',[],products,100,'04/11/2026');
  assert.equal(result.document.number,'BL-100');
  assert.equal(result.updatedProducts[0].qty,5);
  assert.throws(() => convertQuote(quote,'delivery',[result.document],products,101,'04/11/2026'),/already been delivered/);
});

test('delivery conversion refuses insufficient stock', () => {
  const quote = {
    id:3,productName:'Widget',customerName:'Client',qty:4,unitPrice:100,total:400,
    lines:[{productId:7,productName:'Widget',qty:4,unitPrice:100,total:400}],
  };
  assert.throws(() => convertQuote(quote,'delivery',[],[{id:7,qty:2}],102,'04/11/2026'),/Insufficient stock/);
});
