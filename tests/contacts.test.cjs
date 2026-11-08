const test = require('node:test');
const assert = require('node:assert/strict');
const { contactBalance, validateContact } = require('../.test-build/contacts.js');

const contact = (overrides = {}) => ({
  id: 'c1', kind: 'customer', name: 'Client A', openingBalance: 10000,
  active: true, createdAt: '2026-11-08', updatedAt: '2026-11-08',
  creditLimit: 50000, paymentDelayDays: 30, ...overrides,
});

test('contact balance combines opening amount with only that contact’s debit and credit entries', () => {
  const entries = [
    { id: '1', contactId: 'c1', date: '2026-11-01', description: 'Invoice', debit: 25000, credit: 0, sourceType: 'invoice' },
    { id: '2', contactId: 'c1', date: '2026-11-02', description: 'Payment', debit: 0, credit: 5000, sourceType: 'payment' },
    { id: '3', contactId: 's1', date: '2026-11-02', description: 'Other', debit: 90000, credit: 0, sourceType: 'invoice' },
  ];
  assert.equal(contactBalance(contact(), entries), 30000);
});

test('contact validation rejects invalid name, credit limit, delay, and identifiers', () => {
  assert.doesNotThrow(() => validateContact(contact()));
  assert.throws(() => validateContact(contact({ name: ' ' })), /إجباري/);
  assert.throws(() => validateContact(contact({ creditLimit: -1 })), /سقف الدين غير صالح/);
  assert.throws(() => validateContact(contact({ paymentDelayDays: 1.5 })), /أجل الأداء غير صالح/);
  assert.throws(() => validateContact(contact({ ice: 'X'.repeat(41) })), /أطول من المسموح/);
  assert.throws(() => contactBalance(contact(), [{ id: 'bad', contactId: 'c1', date: '', description: '', debit: -1, credit: 0, sourceType: 'adjustment' }]), /حركة الحساب غير صالحة/);
});
