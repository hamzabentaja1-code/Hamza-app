const test = require('node:test');
const assert = require('node:assert/strict');
const { nextDocumentNumber, normalizeSeriesPrefix } = require('../.test-build/document-numbering.js');

test('document numbering starts at one and increments within a year', () => {
  assert.equal(nextDocumentNumber('fac', [], 2026), 'FAC-2026-0001');
  assert.equal(nextDocumentNumber('FAC', [
    { number: 'FAC-2026-0001' },
    { number: 'FAC-2026-0003' },
    { number: 'DEV-2026-0009' },
  ], 2026), 'FAC-2026-0004');
});

test('document numbering resets by year and ignores malformed series values', () => {
  assert.equal(nextDocumentNumber('DEV', [
    { number: 'DEV-2025-0012' },
    { number: 'DEV-2026-0002-extra' },
    { number: 'DEV-2026-ABCD' },
  ], 2026), 'DEV-2026-0001');
});

test('prefixes are normalized and unsafe empty prefixes use fallback', () => {
  assert.equal(normalizeSeriesPrefix(' fac  pro ', 'DOC'), 'FACPRO');
  assert.equal(normalizeSeriesPrefix('---', 'DOC'), 'DOC');
  assert.throws(() => normalizeSeriesPrefix('THIS-PREFIX-IS-TOO-LONG', 'DOC'));
});

test('invalid years are rejected', () => {
  assert.throws(() => nextDocumentNumber('FAC', [], 1999));
});
