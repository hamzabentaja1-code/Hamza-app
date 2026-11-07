const test=require('node:test');const assert=require('node:assert/strict');
const {nextRecurringDate,validateRecurringExpenseRule,generateDueRecurringExpenses}=require('../.test-build/recurring-expenses.js');
const rule={id:'rent',title:'الكراء',amount:2500,frequency:'monthly',nextDueDate:'2026-01-31',active:true};
test('monthly recurrence clamps month ends and leap years safely',()=>{
 assert.equal(nextRecurringDate('2026-01-31','monthly'),'2026-02-28');
 assert.equal(nextRecurringDate('2028-01-31','monthly'),'2028-02-29');
 assert.equal(nextRecurringDate('2028-02-29','yearly'),'2029-02-28');
});
test('weekly recurrence advances by seven calendar days',()=>assert.equal(nextRecurringDate('2026-11-07','weekly'),'2026-11-14'));
test('due expenses generate once and advance the next due date',()=>{
 const result=generateDueRecurringExpenses([rule],[],'2026-04-30',100);
 assert.deepEqual(result.generated.map(x=>x.dueDate),['2026-01-31','2026-02-28','2026-03-28','2026-04-28']);
 assert.equal(result.rules[0].nextDueDate,'2026-05-28');
 const again=generateDueRecurringExpenses(result.rules,result.expenses,'2026-04-30',200);
 assert.equal(again.generated.length,0);assert.equal(again.expenses.length,4);
});
test('inactive rules do not generate and invalid rules are rejected',()=>{
 const inactive={...rule,active:false};assert.equal(generateDueRecurringExpenses([inactive],[],'2026-12-31',1).generated.length,0);
 assert.ok(validateRecurringExpenseRule({...rule,amount:0}).length>0);
 assert.throws(()=>generateDueRecurringExpenses([rule],[],'bad',1),/YYYY-MM-DD/);
});
