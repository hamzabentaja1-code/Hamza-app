const test=require('node:test');
const assert=require('node:assert/strict');
const {createRecurringExpense,advanceRecurringExpense,normalizeRecurringExpenses,recordRecurringOccurrence}=require('../.test-build/recurring-expenses.js');

test('creates recurring expense rules and advances weekly and anchored monthly dates',()=>{
 const weekly=createRecurringExpense({title:'Internet',category:'Bills',amount:299.99,frequency:'أسبوعي',nextDueDate:'2026-11-15'},1);
 assert.equal(advanceRecurringExpense(weekly).nextDueDate,'2026-11-22');
 const monthly=createRecurringExpense({title:'Rent',category:'Premises',amount:2500,frequency:'شهري',nextDueDate:'2027-01-31'},2);
 assert.equal(advanceRecurringExpense(monthly).nextDueDate,'2027-02-28');
 assert.equal(advanceRecurringExpense(advanceRecurringExpense(monthly)).nextDueDate,'2027-03-31');
});

test('rejects malformed rules, keeps valid normalized records, and prevents duplicate occurrences',()=>{
 const rule=createRecurringExpense({title:'Phone',category:'Bills',amount:120,frequency:'شهري',nextDueDate:'2026-11-30'},4);
 assert.throws(()=>createRecurringExpense({title:'',category:'Bills',amount:1,frequency:'شهري',nextDueDate:'2026-11-30'},5));
 assert.throws(()=>createRecurringExpense({title:'Phone',category:'Bills',amount:1,frequency:'شهري',nextDueDate:'2026-02-30'},5));
 const occurrence=recordRecurringOccurrence(rule,[]);
 assert.throws(()=>recordRecurringOccurrence(rule,[occurrence]),/من قبل/);
 assert.deepEqual(normalizeRecurringExpenses([rule,{...rule,id:4,active:false},{...rule,id:'bad',title:''},{...rule,id:8,frequency:'yearly'},null]),[{...rule,active:true}]);
});
