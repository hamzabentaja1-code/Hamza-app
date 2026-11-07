const test=require('node:test');
const assert=require('node:assert/strict');
const {appendCashMovement,cashBalance}=require('../.test-build/cashbook.js');
const {appendBankMovement,bankBalance}=require('../.test-build/banking.js');
const {createCashBankTransfer}=require('../.test-build/cash-bank-transfers.js');
const cash=[{id:'cash-open',kind:'opening',amountCentimes:10000,date:'2026-11-07T08:00:00.000Z',description:'رصيد الصندوق'}];
const bank=[{id:'bank-open',accountId:'a',kind:'opening',amountCentimes:5000,date:'2026-11-07T08:00:00.000Z',description:'رصيد البنك'}];
test('cash-to-bank transfer posts matching entries and preserves combined funds',()=>{
 const result=createCashBankTransfer(cash,bank,{id:'t1',direction:'cash_to_bank',accountId:'a',amountCentimes:3000,date:'2026-11-07T10:00:00.000Z',description:'إيداع بالصندوق'});
 assert.equal(cashBalance(result.cashMovements),7000);
 assert.equal(bankBalance(result.bankMovements,'a'),8000);
 assert.equal(cashBalance(result.cashMovements)+bankBalance(result.bankMovements,'a'),15000);
 assert.equal(result.bankMovements.at(-1).kind,'cash_transfer_in');
});
test('bank-to-cash transfer validates bank balance and moves funds once',()=>{
 const result=createCashBankTransfer(cash,bank,{id:'t2',direction:'bank_to_cash',accountId:'a',amountCentimes:2000,date:'2026-11-07T10:00:00.000Z',description:'سحب نقدي'});
 assert.equal(cashBalance(result.cashMovements),12000);
 assert.equal(bankBalance(result.bankMovements,'a'),3000);
 assert.equal(result.bankMovements.at(-1).kind,'cash_transfer_out');
});
test('cash-bank transfer is atomic when either ledger rejects the amount',()=>{
 assert.throws(()=>createCashBankTransfer(cash,bank,{id:'too-cash',direction:'cash_to_bank',accountId:'a',amountCentimes:10001,date:'2026-11-07T10:00:00.000Z',description:'too much'}),/رصيد الصندوق/);
 assert.throws(()=>createCashBankTransfer(cash,bank,{id:'too-bank',direction:'bank_to_cash',accountId:'a',amountCentimes:5001,date:'2026-11-07T10:00:00.000Z',description:'too much'}),/رصيد الحساب البنكي/);
 assert.equal(cashBalance(cash),10000);
 assert.equal(bankBalance(bank,'a'),5000);
});
