const test=require('node:test');
const assert=require('node:assert/strict');
const {cashBalance,postCashMovement}=require('../.test-build/cash-ledger.js');
const move=(id,kind,amountCentimes)=>({id,kind,amountCentimes,date:'2026-11-08',note:''});

test('cash opening and receipts increase balance while expenses and payments decrease it',()=>{
  const entries=[move('open','opening',10000),move('sale','sale',5000),move('out','cash_out',2000)];
  assert.equal(cashBalance(entries),13000);
});

test('cash movements reject overspending, duplicate opening and invalid values',()=>{
  const opened=[move('open','opening',10000)];
  assert.throws(()=>postCashMovement(move('large','cash_out',10001),opened),/غير كافٍ/);
  assert.throws(()=>postCashMovement(move('open2','opening',1),opened),/مسجل من قبل/);
  assert.throws(()=>postCashMovement(move('bad','cash_in',0),opened),/أكبر من صفر/);
  assert.throws(()=>postCashMovement({...move('date','cash_in',1),date:'2026-02-30'},opened),/تاريخ حركة/);
});
