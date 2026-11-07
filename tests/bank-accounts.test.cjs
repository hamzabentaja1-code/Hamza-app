const test = require('node:test');
const assert = require('node:assert/strict');
const {bankAccountBalance,appendBankMovement,createBankTransfer,reconcileBankBalance}=require('../.test-build/bank-accounts.js');
const accounts=[
 {id:'a',name:'الحساب الجاري',openingBalanceCentimes:100000,active:true},
 {id:'b',name:'حساب التوفير',openingBalanceCentimes:50000,active:true},
];
const movement=(id,accountId,kind,amountCentimes)=>({id,accountId,kind,amountCentimes,date:'2026-11-07T10:00:00.000Z',description:'اختبار'});
test('bank ledger calculates deposits and withdrawals in centimes',()=>{
 let rows=appendBankMovement(accounts,[],movement('in','a','deposit',25000));
 rows=appendBankMovement(accounts,rows,movement('out','a','withdrawal',10000));
 assert.equal(bankAccountBalance(accounts[0],rows),115000);
});
test('bank ledger rejects duplicate, invalid, inactive and overdraft movements',()=>{
 const rows=appendBankMovement(accounts,[],movement('out','a','withdrawal',10000));
 assert.throws(()=>appendBankMovement(accounts,rows,movement('out','a','deposit',100)),/معرف/);
 assert.throws(()=>appendBankMovement(accounts,rows,movement('bad','a','withdrawal',100000)),/غير كافٍ/);
 assert.throws(()=>appendBankMovement(accounts,rows,movement('inactive','x','deposit',100)),/غير موجود/);
 assert.throws(()=>appendBankMovement(accounts,rows,movement('zero','a','deposit',0)),/موجب/);
});
test('bank transfer is paired, atomic and preserves combined balances',()=>{
 const rows=createBankTransfer(accounts,[],{id:'tr1',fromAccountId:'a',toAccountId:'b',amountCentimes:30000,date:'2026-11-07T10:00:00.000Z',description:'تحويل داخلي'});
 assert.equal(bankAccountBalance(accounts[0],rows),70000);
 assert.equal(bankAccountBalance(accounts[1],rows),80000);
 assert.equal(rows.filter(x=>x.transferId==='tr1').reduce((s,x)=>s+(x.kind==='transfer_in'?x.amountCentimes:-x.amountCentimes),0),0);
 assert.throws(()=>createBankTransfer(accounts,[],{id:'tr2',fromAccountId:'a',toAccountId:'b',amountCentimes:100001,date:'2026-11-07',description:'تحويل'}),/غير كافٍ/);
 assert.throws(()=>createBankTransfer(accounts,rows,{id:'tr1',fromAccountId:'a',toAccountId:'b',amountCentimes:100,date:'2026-11-07',description:'مكرر'}),/مسجل من قبل/);
 assert.throws(()=>createBankTransfer(accounts,[],{id:'tr3',fromAccountId:'a',toAccountId:'a',amountCentimes:100,date:'2026-11-07',description:'نفس الحساب'}),/مختلفين/);
});
test('bank reconciliation adjusts to statement and reports exact difference',()=>{
 const result=reconcileBankBalance(accounts,[],{id:'adj1',accountId:'a',statementBalanceCentimes:95000,date:'2026-11-07',description:'تسوية'});
 assert.equal(result.differenceCentimes,-5000);
 assert.equal(bankAccountBalance(accounts[0],result.movements),95000);
 const unchanged=reconcileBankBalance(accounts,result.movements,{id:'adj2',accountId:'a',statementBalanceCentimes:95000,date:'2026-11-07',description:'مطابق'});
 assert.equal(unchanged.differenceCentimes,0);
 assert.equal(unchanged.movements.length,1);
});
