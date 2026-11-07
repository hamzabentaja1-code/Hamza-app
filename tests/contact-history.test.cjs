const test = require('node:test');
const assert = require('node:assert/strict');
const { createContactInteraction, filterContactInteractions } = require('../.test-build/contact-history.js');

const base = {
  contactType: 'customer',
  contactId: 12,
  contactName: '  شركة الأمل  ',
  kind: 'call',
  summary: '  اتصال بخصوص العرض  ',
};

test('creates a normalized contact interaction with supplied id and timestamp', () => {
  const entry = createContactInteraction(base, 7, '2026-11-07T12:00:00.000Z');
  assert.deepEqual(entry, {
    id: 7,
    contactType: 'customer',
    contactId: 12,
    contactName: 'شركة الأمل',
    kind: 'call',
    summary: 'اتصال بخصوص العرض',
    createdAt: '2026-11-07T12:00:00.000Z',
  });
});

test('rejects invalid identifiers, contact types, interaction kinds and dates', () => {
  assert.throws(() => createContactInteraction(base, 0), /غير صالحة/);
  assert.throws(() => createContactInteraction({ ...base, contactId: -1 }), /غير صالحة/);
  assert.throws(() => createContactInteraction({ ...base, contactType: 'other' }), /غير صالحة/);
  assert.throws(() => createContactInteraction({ ...base, kind: 'email' }), /غير صالحة/);
  assert.throws(() => createContactInteraction(base, 1, 'not-a-date'), /غير صالحة/);
});

test('rejects empty and oversized names or summaries', () => {
  assert.throws(() => createContactInteraction({ ...base, contactName: '  ' }), /غير صالحة/);
  assert.throws(() => createContactInteraction({ ...base, contactName: 'x'.repeat(121) }), /غير صالحة/);
  assert.throws(() => createContactInteraction({ ...base, summary: 'x' }), /غير صالحة/);
  assert.throws(() => createContactInteraction({ ...base, summary: 'x'.repeat(1001) }), /غير صالحة/);
});

test('filters by contact type and id and sorts newest first without mutating input', () => {
  const entries = [
    createContactInteraction(base, 1, '2026-11-06T10:00:00.000Z'),
    createContactInteraction({ ...base, kind: 'message' }, 2, '2026-11-07T10:00:00.000Z'),
    createContactInteraction({ ...base, contactType: 'supplier', contactId: 8 }, 3, '2026-11-08T10:00:00.000Z'),
    createContactInteraction(base, 4, '2026-11-07T10:00:00.000Z'),
  ];
  const originalOrder = entries.map(entry => entry.id);
  const filtered = filterContactInteractions(entries, 'customer', 12);
  assert.deepEqual(filtered.map(entry => entry.id), [4, 2, 1]);
  assert.deepEqual(entries.map(entry => entry.id), originalOrder);
  assert.deepEqual(filterContactInteractions(entries, 'supplier').map(entry => entry.id), [3]);
});
