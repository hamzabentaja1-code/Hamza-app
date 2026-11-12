const test=require('node:test');
const assert=require('node:assert/strict');
const {buildCashRegisterRows,calculateCashBalance,EMPTY_CASH_ACCOUNT,normalizeCashAccount,recordManualCashEntry,setCashOpeningBalance}=require('../.test-build/domain/cash-register.js');
const sources=({bankTransfers=[]}={})=>({payments:[],supplierPayments:[],purchases:[],expenses:[],refunds:[],bankTransfers});

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

test('bank transfers reconcile both the cash register and the selected bank account',()=>{
 const {calculateBankBalance,recordBankTransfer}=require('../.test-build/domain/bank-accounts.js');
 const account={id:'bank-1',name:'CIH',openingBalanceCentimes:25000,openingDate:'12/11/2026'};
 const deposit=recordBankTransfer({id:'t-1',bankAccountId:'bank-1',date:'12/11/2026',direction:'cash_to_bank',amount:40,description:'إيداع'},[account],[],10000);
 assert.equal(calculateBankBalance(account,[deposit]),29000);
 const withdrawal=recordBankTransfer({id:'t-2',bankAccountId:'bank-1',date:'12/11/2026',direction:'bank_to_cash',amount:15,description:'سحب'},[account],[deposit],6000);
 assert.equal(calculateBankBalance(account,[deposit,withdrawal]),27500);
 const cash=calculateCashBalance({...EMPTY_CASH_ACCOUNT,openingBalanceCentimes:10000,openingDate:'12/11/2026'},sources({bankTransfers:[deposit,withdrawal]}));
 assert.equal(cash,7500);
 const rows=buildCashRegisterRows(EMPTY_CASH_ACCOUNT,sources({bankTransfers:[deposit,withdrawal]}));
 assert.deepEqual(rows.map(row=>row.direction),['in','out']);
});

test('bank accounts and transfers reject invalid, duplicate, and overdrawn operations',()=>{
 const {calculateBankBalance,createBankAccount,deleteBankAccount,recordBankTransfer,renameBankAccount,normalizeBankAccounts,normalizeBankTransfers}=require('../.test-build/domain/bank-accounts.js');
 const account=createBankAccount({id:'bank-1',name:'CIH',openingBalance:25,openingDate:'12/11/2026'},[]);
 assert.throws(()=>createBankAccount({id:'bank-2',name:'cih',openingBalance:0,openingDate:'12/11/2026'},[account]),/اسم الحساب/);
 assert.throws(()=>recordBankTransfer({id:'out',bankAccountId:account.id,date:'today',direction:'bank_to_cash',amount:30,description:'سحب'},[account],[],10000),/رصيد الحساب البنكي/);
 assert.throws(()=>recordBankTransfer({id:'in',bankAccountId:account.id,date:'today',direction:'cash_to_bank',amount:101,description:'إيداع'},[account],[],10000),/رصيد الصندوق/);
 const t=recordBankTransfer({id:'in',bankAccountId:account.id,date:'today',direction:'cash_to_bank',amount:10,description:'إيداع'},[account],[],10000);
 assert.throws(()=>recordBankTransfer({id:'in',bankAccountId:account.id,date:'today',direction:'cash_to_bank',amount:1,description:'مكرر'},[account],[t],10000),/مستعمل/);
 assert.equal(normalizeBankAccounts([{...account},{...account,id:'bank-2',name:'cih'}]).length,1);
 assert.equal(normalizeBankTransfers([{...t},{...t,bankAccountId:'missing'}],[account]).length,1);
 assert.deepEqual(renameBankAccount([account],'bank-1','CIH Pro')[0].name,'CIH Pro');
 assert.throws(()=>renameBankAccount([account],'bank-1',''),/اسم الحساب/);
 assert.deepEqual(deleteBankAccount([account],[],'bank-1'),[]);
 assert.throws(()=>deleteBankAccount([account],[t],'bank-1'),/حركات مالية محفوظة/);
 assert.throws(()=>deleteBankAccount([account],[],'bank-1',[{id:1,bankAccountId:'bank-1'}]),/حركات مالية محفوظة/);
 const incoming=[{id:1,method:'تحويل',bankAccountId:'bank-1',amount:100,date:'today'},{id:3,method:'بطاقة',bankAccountId:'bank-1',amount:10,date:'today'}];
 const supplier=[{id:2,method:'تحويل',bankAccountId:'bank-1',amount:30,date:'today'}];
 const outflows=[{id:4,method:'بطاقة',bankAccountId:'bank-1',amount:20,date:'today'}];
 assert.equal(calculateBankBalance(account,[],incoming,supplier,outflows),8500);
 assert.throws(()=>recordBankTransfer({id:'out-linked',bankAccountId:account.id,date:'today',direction:'bank_to_cash',amount:86,description:'سحب'},[account],[],10000,incoming,supplier,outflows),/رصيد الحساب البنكي/);
});

test('bank statement CSV parses French debit and credit columns and matches exact dated movements',()=>{
 const {parseBankStatementCsv,matchBankStatementLines}=require('../.test-build/domain/bank-accounts.js');
 const csv='Date;Libellé;Débit;Crédit;Solde\n12/11/2026;"Achat; câble";25,00;;975,00\n2026-11-12;Versement;;10,50;985,50';
 const parsed=parseBankStatementCsv(csv,'bank-1');
 assert.equal(parsed.lines.length,2);assert.equal(parsed.rejected,0);
 assert.equal(parsed.lines[0].description,'Achat; câble');assert.equal(parsed.lines[0].amountCentimes,-2500);
 assert.equal(parsed.lines[1].amountCentimes,1050);assert.equal(parsed.lines[1].reportedBalanceCentimes,98550);
 const duplicate=parseBankStatementCsv(csv,'bank-1',parsed.lines);assert.equal(duplicate.lines.length,0);assert.equal(duplicate.rejected,2);
 const matches=matchBankStatementLines(parsed.lines,[{id:'expense-1',bankAccountId:'bank-1',date:'12/11/2026',amountCentimes:-2500},{id:'payment-1',bankAccountId:'bank-1',date:'12/11/2026',amountCentimes:1050}]);
 assert.deepEqual(matches.map(item=>item.status),['matched','matched']);
 const ambiguous=matchBankStatementLines([parsed.lines[0]],[{id:'a',bankAccountId:'bank-1',date:'2026-11-12',amountCentimes:-2500},{id:'b',bankAccountId:'bank-1',date:'2026-11-12',amountCentimes:-2500}]);
 assert.equal(ambiguous[0].status,'ambiguous');
});

test('bank statement CSV recognizes currency suffixes in debit, credit and balance headings',()=>{
 const {parseBankStatementCsv}=require('../.test-build/domain/bank-accounts.js');
 const parsed=parseBankStatementCsv('Date;Libellé;Débit MAD;Crédit MAD;Solde MAD\n12/11/2026;Frais;12,50;;87,50','bank-1');
 assert.equal(parsed.lines.length,1);assert.equal(parsed.lines[0].amountCentimes,-1250);assert.equal(parsed.lines[0].reportedBalanceCentimes,8750);
});

test('bank reconciliation compares the latest reported balance with app movements through statement date',()=>{
 const {reconcileBankStatement,matchBankStatementLines}=require('../.test-build/domain/bank-accounts.js');
 const account={id:'bank-1',name:'CIH',openingBalanceCentimes:10000,openingDate:'2026-11-01'};
 const lines=[{id:'s1',bankAccountId:'bank-1',date:'2026-11-02',description:'Receipt',amountCentimes:5000,reportedBalanceCentimes:15500}];
 const entries=[{id:'p1',bankAccountId:'bank-1',date:'2026-11-02',amountCentimes:5000},{id:'later',bankAccountId:'bank-1',date:'2026-11-03',amountCentimes:2000}];
 const result=reconcileBankStatement(account,lines,entries,matchBankStatementLines(lines,entries));
 assert.equal(result.matched,1);assert.equal(result.expectedBalanceCentimes,15000);assert.equal(result.differenceCentimes,500);
});

test('bank reconciliation history restore keeps valid account records and drops invalid entries',()=>{
 const {normalizeBankReconciliationHistory}=require('../.test-build/domain/bank-accounts.js');
 const account={id:'bank-1',name:'CIH',openingBalanceCentimes:0,openingDate:'2026-11-01'};
 const valid={id:'rec-1',bankAccountId:'bank-1',createdAt:'2026-11-12T10:00:00.000Z',fromDate:'2026-11-01',toDate:'2026-11-12',reportedBalanceCentimes:10000,expectedBalanceCentimes:9500,differenceCentimes:500,matched:3,confirmed:2,unmatched:1,ambiguous:0};
 assert.deepEqual(normalizeBankReconciliationHistory([valid,valid,{...valid,id:'bad',bankAccountId:'missing'},{...valid,id:'broken',matched:-1}], [account]),[valid]);
});
