export type CashMovementKind = "opening" | "cash_in" | "cash_out" | "transfer_in" | "transfer_out";

export type CashMovement = {
  id: string;
  kind: CashMovementKind;
  amountCentimes: number;
  date: string;
  description: string;
  reference?: string;
};

export function cashBalance(movements: CashMovement[]): number {
  return movements.reduce((balance, item) => {
    const incoming = item.kind === "opening" || item.kind === "cash_in" || item.kind === "transfer_in";
    return balance + (incoming ? item.amountCentimes : -item.amountCentimes);
  }, 0);
}

export function appendCashMovement(
  movements: CashMovement[],
  movement: CashMovement,
): CashMovement[] {
  if (!movement.id.trim() || movements.some(item => item.id === movement.id)) {
    throw new Error("معرف حركة الصندوق فارغ أو مستعمل من قبل");
  }
  if (!Number.isSafeInteger(movement.amountCentimes) || movement.amountCentimes <= 0) {
    throw new Error("مبلغ حركة الصندوق خاصو يكون موجب وبالسنتيم");
  }
  if (!Number.isFinite(Date.parse(movement.date)) || !movement.description.trim()) {
    throw new Error("تاريخ ووصف حركة الصندوق مطلوبان");
  }
  if (!["opening", "cash_in", "cash_out", "transfer_in", "transfer_out"].includes(movement.kind)) {
    throw new Error("نوع حركة الصندوق غير صالح");
  }
  const incoming = movement.kind === "opening" || movement.kind === "cash_in" || movement.kind === "transfer_in";
  if (!incoming && cashBalance(movements) < movement.amountCentimes) {
    throw new Error("رصيد الصندوق غير كافٍ لهذه العملية");
  }
  return [...movements, movement];
}

export function appendCashTransfer(
  movements: CashMovement[],
  input: { id: string; amountCentimes: number; date: string; description: string; reference?: string },
): CashMovement[] {
  if (!Number.isSafeInteger(input.amountCentimes) || input.amountCentimes <= 0) {
    throw new Error("مبلغ التحويل خاصو يكون موجب وبالسنتيم");
  }
  const outgoing: CashMovement = {
    id: input.id + "-out", kind: "transfer_out", amountCentimes: input.amountCentimes,
    date: input.date, description: input.description, reference: input.reference,
  };
  const incoming: CashMovement = {
    id: input.id + "-in", kind: "transfer_in", amountCentimes: input.amountCentimes,
    date: input.date, description: input.description, reference: input.reference,
  };
  const afterOutgoing = appendCashMovement(movements, outgoing);
  return appendCashMovement(afterOutgoing, incoming);
}
