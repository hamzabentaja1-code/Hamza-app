const test = require('node:test');
const assert = require('node:assert/strict');
const { contactBalance, validateContact } = require('../.test-build/contacts.js');

const baseContact = {
  id: 'customer-1', kind: 'customer', name: 'Client A', openingBalance: 12500,
  creditLimit: 50000, paymentDelayDays: 30, active: true,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

test('validates business contact credit terms and identifiers', () => {
  assert.doesNotThrow(() => validateContact(baseContact));
  assert.throws(() => validateContact({ ...baseContact, name: ' ' }), /إجباري/);
  assert.throws(() => validateContact({ ...baseContact, creditLimit: -1 }), /سقف الدين/);
  assert.throws(() => validateContact({ ...baseContact, paymentDelayDays: 1.5 }), /أجل الأداء/);
  assert.throws(() => validateContact({ ...baseContact, ice: 'x'.repeat(41) }), /أطول/);
});

test('calculates contact balance from opening balance and only that contact ledger', () => {
  const entries = [
    { id: '1', contactId: 'customer-1', date: '2026-01-02', description: 'Invoice', debit: 8000, credit: 0, sourceType: 'invoice' },
    { id: '2', contactId: 'customer-1', date: '2026-01-03', description: 'Payment', debit: 0, credit: 3000, sourceType: 'payment' },
    { id: '3', contactId: 'customer-2', date: '2026-01-03', description: 'Other', debit: 90000, credit: 0, sourceType: 'invoice' },
  ];
  assert.equal(contactBalance(baseContact, entries), 17500);
  assert.throws(() => contactBalance(baseContact, [{ ...entries[0], debit: -1 }]), /حركة الحساب/);
  assert.throws(() => contactBalance({ ...baseContact, openingBalance: 1.2 }, []), /الرصيد الافتتاحي/);
});