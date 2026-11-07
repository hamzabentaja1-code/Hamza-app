const test = require('node:test');
const assert = require('node:assert/strict');
const {cashBalance, appendCashMovement} = require('../.test-build/cashbook.js');

const movement = (id, kind, amountCentimes, description = 'اختبار') => ({
  id, kind, amountCentimes, date: '2026-11-07T10:00:00.000Z', description,
});

test('cash register opening, income and expense reconcile in centimes', () => {
  let rows = appendCashMovement([], movement('open', 'opening', 100000));
  rows = appendCashMovement(rows, movement('in', 'cash_in', 25000));
  rows = appendCashMovement(rows, movement('out', 'cash_out', 30000));
  assert.equal(cashBalance(rows), 95000);
});

test('cash register rejects expenses that exceed available cash', () => {
  const rows = appendCashMovement([], movement('open', 'opening', 1000));
  assert.throws(() => appendCashMovement(rows, movement('out', 'cash_out', 1001)), /غير كافٍ/);
});

test('cash register rejects duplicate ids, invalid amounts and missing descriptions', () => {
  const rows = appendCashMovement([], movement('open', 'opening', 1000));
  assert.throws(() => appendCashMovement(rows, movement('open', 'cash_in', 100)), /معرف/);
  assert.throws(() => appendCashMovement(rows, movement('bad', 'cash_in', 0)), /مبلغ/);
  assert.throws(() => appendCashMovement(rows, movement('empty', 'cash_in', 100, ' ')), /تاريخ ووصف/);
});
