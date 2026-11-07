export type BankAccount = {
  id: string;
  name: string;
  bankName?: string;
  accountNumberMasked?: string;
  currency: "MAD";
  isDefault?: boolean;
};

export type BankMovementKind =
  | "opening" | "deposit" | "withdrawal"
  | "pos_card" | "pos_transfer" | "customer_payment" | "supplier_payment"
  | "bank_transfer_in" | "bank_transfer_out"
  | "cash_transfer_in" | "cash_transfer_out"
  | "adjustment_in" | "adjustment_out";

export type BankMovement = {
  id: string;
  accountId: string;
  kind: BankMovementKind;
  amountCentimes: number;
  date: string;
  description: string;
  sourceId?: string;
  transferId?: string;
};

export type BankTransferInput = {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amountCentimes: number;
  date: string;
  description?: string;
};

export type BankReconciliation = {
  id: string;
  accountId: string;
  date: string;
  bookBalanceCentimes: number;
  statementBalanceCentimes: number;
  differenceCentimes: number;
  note?: string;
};

export function bankBalance(movements: BankMovement[], accountId: string): number {
  return movements.filter(item => item.accountId === accountId).reduce((balance, item) => {
    if (!Number.isSafeInteger(item.amountCentimes) || item.amountCentimes <= 0 ||
        !isBankMovementKind(item.kind) || !item.accountId) {
      throw new Error("سجل البنك يحتوي على حركة غير صالحة");
    }
    const incoming = isIncoming(item.kind);
    const next = balance + (incoming ? item.amountCentimes : -item.amountCentimes);
    if (!Number.isSafeInteger(next) || next < 0) throw new Error("رصيد الحساب البنكي في السجل غير صالح");
    return next;
  }, 0);
}

function isBankMovementKind(kind: string): kind is BankMovementKind {
  return ["opening", "deposit", "withdrawal", "pos_card", "pos_transfer", "customer_payment", "supplier_payment", "bank_transfer_in", "bank_transfer_out", "cash_transfer_in", "cash_transfer_out", "adjustment_in", "adjustment_out"].includes(kind);
}

function isIncoming(kind: BankMovementKind): boolean {
  return ["opening", "deposit", "pos_card", "pos_transfer", "customer_payment", "bank_transfer_in", "cash_transfer_in", "adjustment_in"].includes(kind);
}

export function appendBankMovement(movements: BankMovement[], movement: BankMovement): BankMovement[] {
  if (!movement.id.trim() || movements.some(item => item.id === movement.id)) {
    throw new Error("معرف حركة البنك فارغ أو مستعمل من قبل");
  }
  if (!movement.accountId.trim()) throw new Error("الحساب البنكي مطلوب");
  if (!Number.isSafeInteger(movement.amountCentimes) || movement.amountCentimes <= 0) {
    throw new Error("مبلغ الحركة البنكية خاصو يكون موجب وبالسنتيم");
  }
  if (!Number.isFinite(Date.parse(movement.date)) || !movement.description.trim()) {
    throw new Error("تاريخ ووصف الحركة البنكية مطلوبان");
  }
  if (!isBankMovementKind(movement.kind)) throw new Error("نوع الحركة البنكية غير صالح");
  if (!isIncoming(movement.kind) && bankBalance(movements, movement.accountId) < movement.amountCentimes) {
    throw new Error("رصيد الحساب البنكي غير كافٍ لهذه العملية");
  }
  return [...movements, movement];
}

export function createBankTransfer(movements: BankMovement[], input: BankTransferInput): BankMovement[] {
  if (!input.id.trim()) throw new Error("معرف التحويل البنكي إجباري");
  if (!input.fromAccountId.trim() || !input.toAccountId.trim()) throw new Error("حدد حساب المصدر والوجهة");
  if (input.fromAccountId === input.toAccountId) throw new Error("حساب المصدر والوجهة خاصهم يكونو مختلفين");
  if (!Number.isSafeInteger(input.amountCentimes) || input.amountCentimes <= 0) throw new Error("مبلغ التحويل خاصو يكون موجب وبالسنتيم");
  if (!Number.isFinite(Date.parse(input.date))) throw new Error("تاريخ التحويل غير صالح");
  const transferId = input.id;
  if (movements.some(item => item.transferId === transferId || item.id === transferId + "-out" || item.id === transferId + "-in")) {
    throw new Error("هذا التحويل البنكي مسجل من قبل");
  }
  if (bankBalance(movements, input.fromAccountId) < input.amountCentimes) {
    throw new Error("رصيد حساب المصدر غير كافٍ للتحويل");
  }
  const description = input.description?.trim() || "تحويل بين الحسابات البنكية";
  const outgoing: BankMovement = {
    id: transferId + "-out", accountId: input.fromAccountId, kind: "bank_transfer_out",
    amountCentimes: input.amountCentimes, date: input.date, description,
    transferId, sourceId: transferId,
  };
  const incoming: BankMovement = {
    id: transferId + "-in", accountId: input.toAccountId, kind: "bank_transfer_in",
    amountCentimes: input.amountCentimes, date: input.date, description,
    transferId, sourceId: transferId,
  };
  const withOutgoing = appendBankMovement(movements, outgoing);
  return appendBankMovement(withOutgoing, incoming);
}

export function reconcileBankAccount(
  movements: BankMovement[],
  input: {
    id: string;
    accountId: string;
    statementBalanceCentimes: number;
    date: string;
    note?: string;
  },
): { reconciliation: BankReconciliation; movements: BankMovement[] } {
  if (!input.id.trim() || !input.accountId.trim()) throw new Error("معرف التسوية والحساب البنكي مطلوبان");
  if (!Number.isSafeInteger(input.statementBalanceCentimes) || input.statementBalanceCentimes < 0) {
    throw new Error("رصيد كشف البنك خاصو يكون صفر أو أكثر وبالسنتيم");
  }
  if (!Number.isFinite(Date.parse(input.date))) throw new Error("تاريخ التسوية غير صالح");
  const bookBalanceCentimes = bankBalance(movements, input.accountId);
  const differenceCentimes = input.statementBalanceCentimes - bookBalanceCentimes;
  const reconciliation: BankReconciliation = {
    id: input.id, accountId: input.accountId, date: input.date,
    bookBalanceCentimes, statementBalanceCentimes: input.statementBalanceCentimes,
    differenceCentimes, note: input.note?.trim() || undefined,
  };
  if (differenceCentimes === 0) return { reconciliation, movements };
  const adjustment: BankMovement = {
    id: "reconcile-" + input.id,
    accountId: input.accountId,
    kind: differenceCentimes > 0 ? "adjustment_in" : "adjustment_out",
    amountCentimes: Math.abs(differenceCentimes),
    date: input.date,
    description: input.note?.trim() || "تسوية رصيد كشف البنك",
    sourceId: input.id,
  };
  return { reconciliation, movements: appendBankMovement(movements, adjustment) };
}
