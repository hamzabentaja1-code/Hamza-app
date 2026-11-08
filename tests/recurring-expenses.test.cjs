const test = require('node:test');
const assert = require('node:assert/strict');
const {generateDueExpenses,validateRecurringExpense} = require('../.test-build/recurring-expenses.js');

const schedule = (overrides = {}) => ({
  id: 'rent', title: 'Rent', amount: 2500, category: 'Office', interval: 'monthly',
  nextDueDate: '2026-01-31', active: true, ...overrides,
});

test('monthly dues are generated through the requested date and schedule advances', () => {
  const result = generateDueExpenses([schedule()], [], '2026-04-30', 500);
  assert.equal(result.createdCount, 4);
  assert.deepEqual(result.expenses.map(item => item.date), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  assert.equal(result.schedules[0].nextDueDate, '2026-05-31');
  assert.ok(result.expenses.every(item => item.category === 'Office' && item.amount === 2500));
});

test('a second run does not duplicate previously generated installments', () => {
  const first = generateDueExpenses([schedule({nextDueDate:'2026-04-01'})], [], '2026-04-30', 10);
  const second = generateDueExpenses(first.schedules, first.expenses, '2026-04-30', 20);
  assert.equal(first.createdCount, 1);
  assert.equal(second.createdCount, 0);
  assert.equal(second.expenses.length, 1);
});

test('inactive schedules do not produce records or advance', () => {
  const inactive = schedule({active:false});
  const result = generateDueExpenses([inactive], [], '2026-12-31');
  assert.equal(result.createdCount, 0);
  assert.equal(result.schedules[0].nextDueDate, inactive.nextDueDate);
});

test('weekly schedule catches up each due date without skipping', () => {
  const result = generateDueExpenses([schedule({interval:'weekly', nextDueDate:'2026-01-01'})], [], '2026-01-22');
  assert.deepEqual(result.expenses.map(item=>item.date), ['2026-01-01','2026-01-08','2026-01-15','2026-01-22']);
  assert.equal(result.schedules[0].nextDueDate,'2026-01-29');
});

test('invalid amount and invalid calendar date are rejected', () => {
  assert.ok(validateRecurringExpense(schedule({amount:0})).includes('مبلغ المصروف خاصو يكون أكبر من صفر'));
  assert.ok(validateRecurringExpense(schedule({nextDueDate:'2026-02-30'})).includes('تاريخ المصروف غير صالح'));
  assert.throws(()=>generateDueExpenses([schedule()], [], '2026-02-30'), /تاريخ المصروف غير صالح/);
});
