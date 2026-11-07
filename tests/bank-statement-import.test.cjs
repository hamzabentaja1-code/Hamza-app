const test=require('node:test');const assert=require('node:assert/strict');
const {parseBankStatementCsv,importBankStatement}=require('../.test-build/bank-statement-import.js');
test('parses semicolon CSV with headers and signed MAD amounts',()=>{
 const rows=parseBankStatementCsv('date;description;amount\n2026-11-01;Virement reçu;1.250,50\n02/11/2026;Frais bancaires;-15.25');
 assert.equal(rows.length,2);assert.equal(rows[0].amountCentimes,125050);assert.equal(rows[1].amountCentimes,-1525);
 assert.equal(rows[1].date,'2026-11-02T00:00:00.000Z');
});
test('imports unmatched movements and matches existing statement rows idempotently',()=>{
 const existing=[{id:'opening',accountId:'bank-a',kind:'opening',amountCentimes:100000,date:'2026-11-01T00:00:00.000Z',description:'Opening'}];
 const csv='date;description;amount\n2026-11-02;Client transfer;500\n2026-11-03;Supplier debit;-100';
 const first=importBankStatement(existing,'bank-a',csv);
 assert.equal(first.imported,2);assert.equal(first.matched,0);
 const second=importBankStatement(first.movements,'bank-a',csv);
 assert.equal(second.imported,0);assert.equal(second.matched,2);
 assert.equal(second.movements.length,3);
});
test('bank statement import rejects malformed rows, invalid dates and overdrafts atomically',()=>{
 const existing=[{id:'opening',accountId:'bank-a',kind:'opening',amountCentimes:500,date:'2026-11-01T00:00:00.000Z',description:'Opening'}];
 assert.throws(()=>importBankStatement(existing,'bank-a','date;description;amount\n2026-11-02;Debit;-10'));
 assert.throws(()=>parseBankStatementCsv('date;description;amount\n2026-02-30;Bad;1'));
 assert.equal(existing.length,1);
});

test('keeps identical repeated statement rows and remains idempotent on re-import',()=>{
 const csv='date;description;amount\n2026-11-02;Same credit;25\n2026-11-02;Same credit;25';
 const first=importBankStatement([],'bank-a',csv);
 assert.equal(first.imported,2);
 const second=importBankStatement(first.movements,'bank-a',csv);
 assert.equal(second.imported,0);
 assert.equal(second.matched,2);
 assert.equal(second.movements.length,2);
});
