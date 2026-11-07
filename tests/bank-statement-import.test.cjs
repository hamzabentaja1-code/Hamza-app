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

test('bank workspace can import a CSV file selected from the phone',()=>{
 const fs=require('node:fs');const path=require('node:path');
 const app=fs.readFileSync(path.join(__dirname,'..','App.tsx'),'utf8');
 const workspace=fs.readFileSync(path.join(__dirname,'..','src','BankWorkspace.tsx'),'utf8');
 const translations=fs.readFileSync(path.join(__dirname,'..','src','i18n.tsx'),'utf8');
 assert.match(app,/DocumentPicker\.getDocumentAsync\(\{type:\['text\/csv','text\/plain','application\/vnd\.ms-excel'\]/);
 assert.match(app,/FileSystem\.readAsStringAsync\(asset\.uri\)/);
 assert.match(app,/onPickStatementFile=\{async accountId/);
 assert.match(workspace,/onPickStatementFile:\(accountId:string\)=>Promise/);
 assert.match(workspace,/onPress=\{pickStatementFile\}/);
 assert.match(workspace,/اختيار ملف CSV من الهاتف/);
 assert.match(translations,/"اختيار ملف CSV من الهاتف":/);
});

test('bank statement import fuzzy-matches a unique same-date same-amount description',()=>{
 const existing=[{id:'manual-credit',accountId:'bank-a',kind:'deposit',amountCentimes:50000,date:'2026-11-02T00:00:00.000Z',description:'Client transfer reference 001'}];
 const result=importBankStatement(existing,'bank-a','date;description;amount\\n2026-11-02;Client transfer;500.00');
 assert.equal(result.imported,0);assert.equal(result.matched,1);assert.equal(result.movements.length,1);
});
test('bank statement import does not fuzzy-match ambiguous same-value candidates',()=>{
 const existing=[
  {id:'manual-a',accountId:'bank-a',kind:'deposit',amountCentimes:50000,date:'2026-11-02T00:00:00.000Z',description:'Client transfer A'},
  {id:'manual-b',accountId:'bank-a',kind:'deposit',amountCentimes:50000,date:'2026-11-02T00:00:00.000Z',description:'Client transfer B'}
 ];
 const result=importBankStatement(existing,'bank-a','date;description;amount\\n2026-11-02;Client transfer;500.00');
 assert.equal(result.imported,1);assert.equal(result.matched,0);assert.equal(result.movements.length,3);
});
