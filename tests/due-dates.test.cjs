const test=require('node:test');
const assert=require('node:assert/strict');
const {calculateDueDate,isPastDue}=require('../.test-build/domain/due-dates.js');

test('calculates due dates from ISO and Moroccan day/month dates',()=>{
  assert.equal(calculateDueDate('2026-11-13',30),'2026-12-13');
  assert.equal(calculateDueDate('13/11/2026',30),'2026-12-13');
  assert.equal(calculateDueDate('28/02/2024',1),'2024-02-29');
  assert.equal(calculateDueDate('13/11/2026',undefined),null);
});

test('rejects invalid terms and dates, and flags only dates before today',()=>{
  assert.throws(()=>calculateDueDate('2026-11-13',-1),/أجل الأداء/);
  assert.equal(calculateDueDate('31/02/2026',10),null);
  assert.equal(isPastDue('2026-11-12','2026-11-13'),true);
  assert.equal(isPastDue('2026-11-13','2026-11-13'),false);
  assert.throws(()=>isPastDue('bad','2026-11-13'),/تاريخ الاستحقاق/);
});
