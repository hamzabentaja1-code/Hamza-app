export type CashMovementKind = "opening" | "cash_in" | "cash_out";

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
    const incoming = item.kind === "opening" || item.kind === "cash_in";
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
  if (!["opening", "cash_in", "cash_out"].includes(movement.kind)) {
    throw new Error("نوع حركة الصندوق غير صالح");
  }
  const incoming = movement.kind === "opening" || movement.kind === "cash_in";
  if (!incoming && cashBalance(movements) < movement.amountCentimes) {
    throw new Error("رصيد الصندوق غير كافٍ لهذه العملية");
  }
  return [...movements, movement];
}

