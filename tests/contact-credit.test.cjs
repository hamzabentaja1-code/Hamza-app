const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCreditTerms, normalizeOpeningBalanceCentimes, canExtendCredit } = require('../.test-build/domain/contact-credit.js');

test('normalizes optional contact credit limits and payment days', () => {
  assert.deepEqual(normalizeCreditTerms('', ''), {});
  assert.deepEqual(normalizeCreditTerms('250,50', '30'), { creditLimitCentimes: 25050, paymentDelayDays: 30 });
  assert.throws(() => normalizeCreditTerms('-1', ''), /سقف الدين/);
  assert.throws(() => normalizeCreditTerms('10', '1.5'), /أجل الأداء/);
  assert.throws(() => normalizeCreditTerms('', '3651'), /أجل الأداء/);
});

test('checks proposed customer or supplier credit against the configured limit', () => {
  const terms = { creditLimitCentimes: 10000 };
  assert.equal(canExtendCredit(terms, 7000, 3000), true);
  assert.equal(canExtendCredit(terms, 7000, 3001), false);
  assert.equal(canExtendCredit({}, 100000, 50000), true);
  assert.equal(canExtendCredit(terms, -1, 100), false);
});

test('validates an optional customer opening balance in MAD', () => {
  assert.equal(normalizeOpeningBalanceCentimes(''), undefined);
  assert.equal(normalizeOpeningBalanceCentimes('320,75'), 32075);
  assert.throws(() => normalizeOpeningBalanceCentimes('-0.01'), /غير صالح/);
  assert.throws(() => normalizeOpeningBalanceCentimes('abc'), /غير صالح/);
});
