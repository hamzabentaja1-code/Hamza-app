export type ChequeDirection = 'incoming' | 'outgoing';
export type ChequeStatus = 'recorded' | 'deposited' | 'cleared' | 'bounced' | 'cancelled';

export type ChequeRecord = {
  id: string;
  direction: ChequeDirection;
  status: ChequeStatus;
  number: string;
  counterparty: string;
  amountCentimes: number;
  issueDate: string;
  dueDate?: string;
  bankAccountId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type ChequeEvent = {
  id: string;
  chequeId: string;
  from: ChequeStatus | null;
  to: ChequeStatus;
  date: string;
  note?: string;
};

export type ChequeSummary = {
  incomingPendingCentimes: number;
  outgoingPendingCentimes: number;
  incomingClearedCentimes: number;
  outgoingClearedCentimes: number;
  bouncedCentimes: number;
  cancelledCount: number;
};

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value));

export function createCheque(
  input: Omit<ChequeRecord, 'status' | 'updatedAt'>,
  existing: ChequeRecord[] = [],
): ChequeRecord {
  if (!input.id.trim() || !input.number.trim() || !input.counterparty.trim()) {
    throw new Error('معرف الشيك ورقمه واسم الطرف الآخر مطلوبة');
  }
  if (existing.some(item => item.id === input.id)) throw new Error('معرف الشيك مسجل من قبل');
  if (existing.some(item => item.direction === input.direction && item.number.trim().toLowerCase() === input.number.trim().toLowerCase())) {
    throw new Error('رقم الشيك مسجل من قبل في نفس الاتجاه');
  }
  if (!Number.isSafeInteger(input.amountCentimes) || input.amountCentimes <= 0) {
    throw new Error('مبلغ الشيك خاصو يكون موجب وبالسنتيم');
  }
  if (!validDate(input.issueDate) || !validDate(input.createdAt) || (input.dueDate && !validDate(input.dueDate))) {
    throw new Error('تاريخ الشيك غير صالح');
  }
  if (input.dueDate && input.dueDate < input.issueDate) throw new Error('تاريخ الاستحقاق ما يقدرش يسبق تاريخ الشيك');
  if (input.bankAccountId !== undefined && !input.bankAccountId.trim()) throw new Error('الحساب البنكي غير صالح');
  return { ...input, status: 'recorded', updatedAt: input.createdAt };
}

const allowed: Record<ChequeStatus, ChequeStatus[]> = {
  recorded: ['deposited', 'cleared', 'bounced', 'cancelled'],
  deposited: ['cleared', 'bounced', 'cancelled'],
  cleared: [],
  bounced: ['deposited', 'cancelled'],
  cancelled: [],
};

export function transitionCheque(
  cheque: ChequeRecord,
  next: ChequeStatus,
  event: Omit<ChequeEvent, 'chequeId' | 'from' | 'to'>,
): { cheque: ChequeRecord; event: ChequeEvent } {
  if (!event.id.trim() || !validDate(event.date)) throw new Error('معرف وتاريخ حركة الشيك مطلوبان');
  if (event.date < cheque.updatedAt.slice(0, 10)) throw new Error('تاريخ حركة الشيك ما يقدرش يسبق آخر تحديث');
  if (!allowed[cheque.status].includes(next)) throw new Error('انتقال حالة الشيك غير مسموح');
  if (next === 'deposited' && !cheque.bankAccountId) throw new Error('حدد الحساب البنكي قبل إيداع الشيك');
  const updated = { ...cheque, status: next, updatedAt: event.date };
  return {
    cheque: updated,
    event: { ...event, chequeId: cheque.id, from: cheque.status, to: next },
  };
}

/** Only cleared cheques affect the bank ledger; pending, bounced and cancelled cheques do not. */
export function clearedChequeBankEffect(cheque: ChequeRecord): number {
  if (cheque.status !== 'cleared') return 0;
  return cheque.direction === 'incoming' ? cheque.amountCentimes : -cheque.amountCentimes;
}

export function summarizeCheques(cheques: ChequeRecord[]): ChequeSummary {
  return cheques.reduce<ChequeSummary>((summary, cheque) => {
    if (cheque.status === 'cancelled') summary.cancelledCount += 1;
    else if (cheque.status === 'bounced') summary.bouncedCentimes += cheque.amountCentimes;
    else if (cheque.status === 'cleared') {
      if (cheque.direction === 'incoming') summary.incomingClearedCentimes += cheque.amountCentimes;
      else summary.outgoingClearedCentimes += cheque.amountCentimes;
    } else if (cheque.direction === 'incoming') summary.incomingPendingCentimes += cheque.amountCentimes;
    else summary.outgoingPendingCentimes += cheque.amountCentimes;
    return summary;
  }, {
    incomingPendingCentimes: 0,
    outgoingPendingCentimes: 0,
    incomingClearedCentimes: 0,
    outgoingClearedCentimes: 0,
    bouncedCentimes: 0,
    cancelledCount: 0,
  });
}
