const test = require('node:test');
const assert = require('node:assert/strict');
const bank = require('../.test-build/domain/bank-accounts.js');

test('parses French debit and credit CSV rows and normalizes dates and MAD values', () => {
  const parsed = bank.parseBankStatementCsv('Date;Libellé;Débit;Crédit;Solde\n01/02/2026;Fournitures;1 250,50 MAD;;8 749,50 DH\n02/02/2026;Client;;500,00;9 249,50', 'bank-1');
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.lines.length, 2);
  assert.deepEqual(parsed.lines.map(line => line.date), ['2026-02-01', '2026-02-02']);
  assert.deepEqual(parsed.lines.map(line => line.amountCentimes), [-125050, 50000]);
  assert.equal(parsed.lines[0].reportedBalanceCentimes, 874950);
});

test('rejects malformed rows and repeated imports without losing valid rows', () => {
  const csv = 'Date;Libellé;Montant\n2026-02-01;Client;120,00\n31/02/2026;bad date;4,00\n2026-02-02;Client;120,00';
  const first = bank.parseBankStatementCsv(csv, 'bank-1');
  assert.equal(first.lines.length, 2);
  assert.equal(first.rejected, 1);
  const second = bank.parseBankStatementCsv(csv, 'bank-1', first.lines);
  assert.equal(second.lines.length, 0);
  assert.equal(second.rejected, 3);
});

test('requires recognizable date and amount headers', () => {
  const parsed = bank.parseBankStatementCsv('foo;bar\na;b', 'bank-1');
  assert.equal(parsed.lines.length, 0);
  assert.match(parsed.errors[0], /عناوين/);
});

test('matches account, normalized date and signed amount; leaves unmatched rows visible', () => {
  const lines = [
    { id: 's1', bankAccountId: 'bank-1', date: '2026-02-01', description: 'a', amountCentimes: -5000 },
    { id: 's2', bankAccountId: 'bank-1', date: '2026-02-02', description: 'b', amountCentimes: 7000 },
  ];
  const entries = [
    { id: 'e1', bankAccountId: 'bank-1', date: '01/02/2026', amountCentimes: -5000 },
    { id: 'e2', bankAccountId: 'bank-2', date: '2026-02-02', amountCentimes: 7000 },
  ];
  assert.deepEqual(bank.matchBankStatementLines(lines, entries), [
    { lineId: 's1', status: 'matched', ledgerEntryId: 'e1' },
    { lineId: 's2', status: 'unmatched' },
  ]);
});

test('reports ambiguous matches and calculates closing balance difference', () => {
  const account = { id: 'bank-1', name: 'Compte', openingBalanceCentimes: 100000, openingDate: '2026-01-01' };
  const lines = [{ id: 's1', bankAccountId: 'bank-1', date: '2026-02-01', description: 'Versement', amountCentimes: 25000, reportedBalanceCentimes: 124000 }];
  const entries = [
    { id: 'e1', bankAccountId: 'bank-1', date: '2026-02-01', amountCentimes: 25000 },
    { id: 'e2', bankAccountId: 'bank-1', date: '2026-02-01', amountCentimes: 25000 },
  ];
  const matches = bank.matchBankStatementLines(lines, entries);
  assert.equal(matches[0].status, 'ambiguous');
  const result = bank.reconcileBankStatement(account, lines, entries, matches);
  assert.equal(result.expectedBalanceCentimes, 150000);
  assert.equal(result.differenceCentimes, -26000);
  assert.equal(result.ambiguous, 1);
});

test('normalizes statement lines and history against known accounts', () => {
  const account = { id: 'bank-1', name: 'Compte', openingBalanceCentimes: 0, openingDate: '2026-01-01' };
  assert.equal(bank.normalizeBankStatementLines([{ id: 'ok', bankAccountId: 'bank-1', date: '01/02/2026', description: ' test ', amountCentimes: 10 }, { id: 'bad', bankAccountId: 'other', date: '2026-02-01', description: '', amountCentimes: 10 }], [account]).length, 1);
  const history = { id: 'h1', bankAccountId: 'bank-1', createdAt: '2026-02-03T00:00:00Z', fromDate: '2026-02-01', toDate: '2026-02-01', reportedBalanceCentimes: 10, expectedBalanceCentimes: 8, differenceCentimes: 2, matched: 1, confirmed: 1, unmatched: 0, ambiguous: 0 };
  assert.deepEqual(bank.normalizeBankReconciliationHistory([history, { ...history, id: 'bad', bankAccountId: 'other' }], [account]), [history]);
});
