const test = require('node:test');
const assert = require('node:assert/strict');
const {bankBalance,appendBankMovement,createBankTransfer,reconcileBankAccount}=require('../.test-build/banking.js');

const movement=(id,accountId,kind,amountCentimes)=>({id,accountId,kind,amountCentimes,date:'2026-11-07T10:00:00.000Z',description:'اختبار'});

test('bank ledger reconciles opening, deposits, card sales and withdrawals in centimes',()=>{
  let rows=appendBankMovement([],movement('open','a','opening',100000));
  rows=appendBankMovement(rows,movement('deposit','a','deposit',20000));
  rows=appendBankMovement(rows,movement('card','a','pos_card',15000));
  rows=appendBankMovement(rows,movement('withdraw','a','withdrawal',5000));
  assert.equal(bankBalance(rows,'a'),130000);
});

test('bank ledger prevents negative balance and invalid entries',()=>{
  const rows=appendBankMovement([],movement('open','a','opening',1000));
  assert.throws(()=>appendBankMovement(rows,movement('over','a','withdrawal',1001)),/غير كافٍ/);
  assert.throws(()=>appendBankMovement(rows,movement('bad','a','deposit',0)),/مبلغ/);
  assert.throws(()=>appendBankMovement(rows,{...movement('empty','a','deposit',1),description:' '}),/تاريخ ووصف/);
});

test('bank transfer is a balanced atomic pair and keeps total bank funds unchanged',()=>{
  const rows=appendBankMovement([],movement('open','a','opening',10000));
  const next=createBankTransfer(rows,{id:'t1',fromAccountId:'a',toAccountId:'b',amountCentimes:4000,date:'2026-11-07T10:00:00.000Z'});
  assert.equal(bankBalance(next,'a'),6000);
  assert.equal(bankBalance(next,'b'),4000);
  assert.equal(bankBalance(next,'a')+bankBalance(next,'b'),10000);
  assert.equal(next.filter(x=>x.transferId==='t1').reduce((sum,x)=>sum+(x.kind==='bank_transfer_in'?x.amountCentimes:-x.amountCentimes),0),0);
  assert.throws(()=>createBankTransfer(rows,{id:'too-much',fromAccountId:'a',toAccountId:'b',amountCentimes:10001,date:'2026-11-07'}),/غير كافٍ/);
  assert.throws(()=>createBankTransfer(rows,{id:'same',fromAccountId:'a',toAccountId:'a',amountCentimes:1,date:'2026-11-07'}),/مختلفين/);
  assert.throws(()=>createBankTransfer(next,{id:'t1',fromAccountId:'a',toAccountId:'b',amountCentimes:1,date:'2026-11-07'}),/مسجل من قبل/);
  assert.equal(bankBalance(rows,'a'),10000);
});

test('bank reconciliation records zero difference without adjustment',()=>{
  const rows=appendBankMovement([],movement('open','a','opening',12000));
  const result=reconcileBankAccount(rows,{id:'rec1',accountId:'a',statementBalanceCentimes:12000,date:'2026-11-07'});
  assert.equal(result.reconciliation.differenceCentimes,0);
  assert.equal(result.movements.length,1);
});

test('bank reconciliation posts an auditable adjustment to match statement balance',()=>{
  const rows=appendBankMovement([],movement('open','a','opening',12000));
  const result=reconcileBankAccount(rows,{id:'rec2',accountId:'a',statementBalanceCentimes:10000,date:'2026-11-07',note:'رسوم بنكية'});
  assert.equal(result.reconciliation.differenceCentimes,-2000);
  assert.equal(result.movements.at(-1).kind,'adjustment_out');
  assert.equal(bankBalance(result.movements,'a'),10000);
  const income=reconcileBankAccount(rows,{id:'rec3',accountId:'a',statementBalanceCentimes:13500,date:'2026-11-07'});
  assert.equal(income.movements.at(-1).kind,'adjustment_in');
  assert.equal(bankBalance(income.movements,'a'),13500);
});

test('bank reconciliation rejects invalid statement balances and dates',()=>{
  const rows=appendBankMovement([],movement('open','a','opening',100));
  assert.throws(()=>reconcileBankAccount(rows,{id:'bad',accountId:'a',statementBalanceCentimes:-1,date:'2026-11-07'}),/صفر أو أكثر/);
  assert.throws(()=>reconcileBankAccount(rows,{id:'bad-date',accountId:'a',statementBalanceCentimes:100,date:'bad'}),/تاريخ التسوية/);
});
