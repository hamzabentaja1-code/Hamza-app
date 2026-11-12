const test=require('node:test');
const assert=require('node:assert/strict');
const {buildCashRegisterRows,calculateCashBalance,EMPTY_CASH_ACCOUNT,normalizeCashAccount,recordManualCashEntry,setCashOpeningBalance}=require('../.test-build/domain/cash-register.js');

test('cash balance reconciles cash-only receipts, supplier payments, purchases, expenses, refunds and manual entries',()=>{
  const account=setCashOpeningBalance(EMPTY_CASH_ACCOUNT,100,'12/11/2026');
  const withManual=recordManualCashEntry(account,{id:1,date:'12/11/2026',direction:'in',amount:20,description:'Cash correction'},12000);
  assert.equal(calculateCashBalance(withManual,{
    payments:[{id:1,amount:50,method:'نقداً',date:'12/11/2026',customerName:'Ali'},{id:2,amount:200,method:'تحويل',date:'12/11/2026',customerName:'Sara'}],
    supplierPayments:[{id:3,amount:10,method:'نقداً',date:'12/11/2026',supplierName:'Shop'}],
    purchases:[{id:4,paidAmount:5,paymentMethod:'نقداً',date:'12/11/2026',productName:'Cable',supplierName:'Shop'},{id:5,paidAmount:70,paymentMethod:'تحويل',date:'12/11/2026',productName:'Switch',supplierName:'Shop'}],
    expenses:[{id:6,amount:8,paymentMethod:'Espèces',date:'12/11/2026',title:'Taxi'},{id:7,amount:30,date:'12/11/2026',title:'Unknown'}],
    refunds:[{id:8,amountCentimes:400,method:'cash',date:'12/11/2026',number:'AV-1',customerName:'Ali'}],
  }),14300);
});

test('cash history shows automatic cash transactions but excludes bank-only records',()=>{
  const rows=buildCashRegisterRows(setCashOpeningBalance(EMPTY_CASH_ACCOUNT,100,'12/11/2026'),{
    payments:[{id:1,amount:20,method:'نقداً',date:'12/11/2026',customerName:'Ali'},{id:2,amount:40,method:'تحويل',date:'12/11/2026',customerName:'Sara'}],
    supplierPayments:[],purchases:[],expenses:[],refunds:[],
  });
  assert.deepEqual(rows.map(item=>[item.source,item.direction,item.amountCentimes]),[['payment','in',2000],['opening','in',10000]]);
});

test('cash opening and movement validation prevents bad entries and overdrafts',()=>{
  assert.throws(()=>setCashOpeningBalance(EMPTY_CASH_ACCOUNT,-1,'12/11/2026'));
  assert.throws(()=>setCashOpeningBalance(EMPTY_CASH_ACCOUNT,10,''));
  const account=setCashOpeningBalance(EMPTY_CASH_ACCOUNT,10,'12/11/2026');
  assert.throws(()=>setCashOpeningBalance(account,20,'13/11/2026'));
  assert.throws(()=>recordManualCashEntry(account,{id:2,date:'12/11/2026',direction:'out',amount:10.01,description:'Bank transfer'},1000));
  assert.throws(()=>recordManualCashEntry(account,{id:2,date:'',direction:'in',amount:1,description:'Cash in'},1000));
});

test('normalizes cash account and removes malformed or duplicate manual entries',()=>{
  const valid={id:5,date:'12/11/2026',direction:'out',amountCentimes:200,description:'Transfer'};
  assert.deepEqual(normalizeCashAccount({openingBalanceCentimes:5000,openingDate:'12/11/2026',manualEntries:[valid,valid,null,{...valid,id:0}]}),{openingBalanceCentimes:5000,openingDate:'12/11/2026',manualEntries:[valid]});
  assert.deepEqual(normalizeCashAccount(null),{openingBalanceCentimes:0,openingDate:'',manualEntries:[]});
});
