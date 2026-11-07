const test = require('node:test');
const assert = require('node:assert/strict');
const {createCheque, transitionCheque, clearedChequeBankEffect, summarizeCheques} = require('../.test-build/cheques.js');

const base = (overrides = {}) => ({
  id: 'ch-1', direction: 'incoming', number: 'CH-001', counterparty: 'Client A',
  amountCentimes: 125050, issueDate: '2026-11-01', dueDate: '2026-11-10',
  bankAccountId: 'bank-1', createdAt: '2026-11-01', ...overrides,
});

test('creates valid cheque records in recorded state with centime-safe amounts', () => {
  const cheque = createCheque(base());
  assert.equal(cheque.status, 'recorded');
  assert.equal(cheque.updatedAt, cheque.createdAt);
  assert.equal(cheque.amountCentimes, 125050);
});

test('rejects duplicate cheque IDs and duplicate numbers per direction', () => {
  const first = createCheque(base());
  assert.throws(() => createCheque(base(), [first]), /معرف الشيك/);
  assert.throws(() => createCheque(base({id:'ch-2'}), [first]), /رقم الشيك/);
  assert.doesNotThrow(() => createCheque(base({id:'ch-3',direction:'outgoing'}), [first]));
});

test('rejects invalid amounts, dates and due dates', () => {
  assert.throws(() => createCheque(base({amountCentimes:0})), /مبلغ الشيك/);
  assert.throws(() => createCheque(base({amountCentimes:1.2})), /مبلغ الشيك/);
  assert.throws(() => createCheque(base({issueDate:'bad'})), /تاريخ الشيك/);\n  assert.throws(() => createCheque(base({issueDate:'2026-02-31'})), /تاريخ الشيك/);
  assert.throws(() => createCheque(base({dueDate:'2026-10-31'})), /تاريخ الاستحقاق/);
});

test('records deposit and clear transitions as auditable events', () => {
  const initial = createCheque(base());
  const deposited = transitionCheque(initial, 'deposited', {id:'ev-1',date:'2026-11-02'});
  assert.equal(deposited.cheque.status, 'deposited');
  assert.equal(deposited.event.from, 'recorded');
  assert.equal(deposited.event.to, 'deposited');
  const cleared = transitionCheque(deposited.cheque, 'cleared', {id:'ev-2',date:'2026-11-03'});
  assert.equal(cleared.cheque.status, 'cleared');
  assert.equal(clearedChequeBankEffect(cleared.cheque), 125050);
});

test('requires a bank account for deposit and rejects invalid lifecycle transitions', () => {
  const noBank = createCheque(base({bankAccountId:undefined}));
  assert.throws(() => transitionCheque(noBank,'deposited',{id:'ev-1',date:'2026-11-02'}), /حدد الحساب البنكي/);
  const cleared = createCheque(base({id:'ch-2',number:'CH-002'}));
  const settled = transitionCheque(cleared,'cleared',{id:'ev-2',date:'2026-11-02'}).cheque;
  assert.throws(() => transitionCheque(settled,'bounced',{id:'ev-3',date:'2026-11-03'}), /انتقال حالة الشيك/);
});

test('bounced cheques can be redeposited but cancelled and cleared records are terminal', () => {
  const cheque = createCheque(base());
  const bounced = transitionCheque(cheque,'bounced',{id:'ev-1',date:'2026-11-02'}).cheque;
  assert.equal(clearedChequeBankEffect(bounced), 0);
  const redeposited = transitionCheque(bounced,'deposited',{id:'ev-2',date:'2026-11-03'}).cheque;
  assert.equal(redeposited.status,'deposited');
  const cancelled = transitionCheque(redeposited,'cancelled',{id:'ev-3',date:'2026-11-04'}).cheque;
  assert.throws(() => transitionCheque(cancelled,'deposited',{id:'ev-4',date:'2026-11-05'}), /انتقال حالة الشيك/);
});

test('outgoing cleared cheques reduce bank balance and pending cheques do not', () => {
  const pending = createCheque(base({direction:'outgoing'}));
  assert.equal(clearedChequeBankEffect(pending),0);
  const cleared = transitionCheque(pending,'cleared',{id:'ev-1',date:'2026-11-02'}).cheque;
  assert.equal(clearedChequeBankEffect(cleared),-125050);
});

test('summarizes pending, cleared, bounced and cancelled cheques without rounding loss', () => {
  const incoming = createCheque(base());
  const outgoing = createCheque(base({id:'ch-2',number:'CH-002',direction:'outgoing'}));
  const cleared = transitionCheque(incoming,'cleared',{id:'ev-1',date:'2026-11-02'}).cheque;
  const bounced = transitionCheque(createCheque(base({id:'ch-3',number:'CH-003'})),'bounced',{id:'ev-2',date:'2026-11-02'}).cheque;
  const cancelled = transitionCheque(createCheque(base({id:'ch-4',number:'CH-004'})),'cancelled',{id:'ev-3',date:'2026-11-02'}).cheque;
  assert.deepEqual(summarizeCheques([cleared,outgoing,bounced,cancelled]), {
    incomingPendingCentimes:0, outgoingPendingCentimes:125050,
    incomingClearedCentimes:125050, outgoingClearedCentimes:0,
    bouncedCentimes:125050, cancelledCount:1,
  });
});
