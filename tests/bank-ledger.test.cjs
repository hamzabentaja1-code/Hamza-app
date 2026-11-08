const test=require('node:test');
const assert=require('node:assert/strict');
const {bankBalance,parseBankStatement,bankMatchCandidates,reconcileBankEntry,validateBankEntry}=require('../.test-build/bank-ledger.js');

test('bank statement import parses positive and negative amounts and rejects malformed rows',()=>{
  const entries=parseBankStatement('date;description;amount;reference\n2026-11-08;Client transfer;250,50;TR-01\n2026-11-08;Supplier cheque;-120.00;CH-04','batch');
  assert.equal(entries[0].direction,'in');
  assert.equal(entries[0].amountCentimes,25050);
  assert.equal(entries[1].direction,'out');
  assert.equal(bankBalance(entries),13050);
  assert.throws(()=>parseBankStatement('2026-02-30;Bad;10;X'),/تنسيق سطر/);
});

test('bank entries validate, match only same amount and direction, and reconcile once',()=>{
  const entry={id:'b1',date:'2026-11-08',description:'Incoming',amountCentimes:5000,direction:'in',reference:'R1'};
  const sources=[
    {id:'p1',type:'customer_payment',date:'08/11/2026',amountCentimes:5000,direction:'in',reference:'R1',label:'Client payment'},
    {id:'p2',type:'customer_payment',date:'2026-11-07',amountCentimes:5000,direction:'in',reference:'R2',label:'Different reference'},
    {id:'p3',type:'supplier_payment',date:'2026-11-08',amountCentimes:5000,direction:'out',reference:'R1',label:'Supplier payment'}
  ];
  assert.deepEqual(validateBankEntry(entry),[]);
  assert.deepEqual(bankMatchCandidates(entry,sources,[]).map(source=>source.id),['p1']);
  const reconciled=reconcileBankEntry(entry,sources[0],[],sources);
  assert.equal(reconciled.matchedSourceId,'p1');
  assert.deepEqual(bankMatchCandidates({...entry,id:'b2'},sources,[reconciled]),[]);
  assert.throws(()=>reconcileBankEntry(reconciled,sources[0],[reconciled],sources),/من قبل/);
  assert.ok(validateBankEntry(entry,[entry]).length);
});
