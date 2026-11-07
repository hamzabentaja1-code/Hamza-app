export type BankAccount = {
  id: string;
  name: string;
  bankName?: string;
  accountReference?: string;
  openingBalanceCentimes: number;
  active: boolean;
};

export type BankMovementKind =
  | "deposit" | "withdrawal" | "transfer_in" | "transfer_out"
  | "adjustment_in" | "adjustment_out";

export type BankMovement = {
  id: string;
  accountId: string;
  kind: BankMovementKind;
  amountCentimes: number;
  date: string;
  description: string;
  reference?: string;
  transferId?: string;
};

function validMoney(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export function bankAccountBalance(account: BankAccount, movements: BankMovement[]): number {
  if (!Number.isSafeInteger(account.openingBalanceCentimes) || account.openingBalanceCentimes < 0) {
    throw new Error("الرصيد الافتتاحي للحساب البنكي غير صالح");
  }
  return movements.filter(item => item.accountId === account.id).reduce((balance, item) => {
    if (!validMoney(item.amountCentimes) || !Number.isFinite(Date.parse(item.date)) ||
        !item.description.trim() ||
        !["deposit", "withdrawal", "transfer_in", "transfer_out", "adjustment_in", "adjustment_out"].includes(item.kind)) {
      throw new Error("سجل البنك يحتوي على حركة غير صالحة");
    }
    const incoming = item.kind === "deposit" || item.kind === "transfer_in" || item.kind === "adjustment_in";
    const next = balance + (incoming ? item.amountCentimes : -item.amountCentimes);
    if (!Number.isSafeInteger(next) || next < 0) throw new Error("رصيد الحساب البنكي غير كافٍ أو غير صالح");
    return next;
  }, account.openingBalanceCentimes);
}

export function appendBankMovement(
  accounts: BankAccount[],
  movements: BankMovement[],
  movement: BankMovement,
): BankMovement[] {
  if (!movement.id.trim() || movements.some(item => item.id === movement.id)) {
    throw new Error("معرف حركة البنك فارغ أو مستعمل من قبل");
  }
  const account = accounts.find(item => item.id === movement.accountId && item.active);
  if (!account) throw new Error("الحساب البنكي غير موجود أو غير نشط");
  if (!validMoney(movement.amountCentimes)) throw new Error("مبلغ حركة البنك خاصو يكون موجب وبالسنتيم");
  if (!Number.isFinite(Date.parse(movement.date)) || !movement.description.trim()) {
    throw new Error("تاريخ ووصف حركة البنك مطلوبان");
  }
  if (!["deposit", "withdrawal", "transfer_in", "transfer_out", "adjustment_in", "adjustment_out"].includes(movement.kind)) {
    throw new Error("نوع حركة البنك غير صالح");
  }
  const incoming = movement.kind === "deposit" || movement.kind === "transfer_in" || movement.kind === "adjustment_in";
  if (!incoming && bankAccountBalance(account, movements) < movement.amountCentimes) {
    throw new Error("رصيد الحساب البنكي غير كافٍ لهذه العملية");
  }
  return [...movements, movement];
}

export function createBankTransfer(
  accounts: BankAccount[],
  movements: BankMovement[],
  input: {id:string;fromAccountId:string;toAccountId:string;amountCentimes:number;date:string;description:string},
): BankMovement[] {
  if (!input.id.trim()) throw new Error("معرف التحويل البنكي إجباري");
  if (input.fromAccountId === input.toAccountId) throw new Error("حساب المصدر والوجهة خاصهم يكونو مختلفين");
  if (!validMoney(input.amountCentimes)) throw new Error("مبلغ التحويل خاصو يكون موجب وبالسنتيم");
  if (!Number.isFinite(Date.parse(input.date)) || !input.description.trim()) throw new Error("تاريخ ووصف التحويل مطلوبان");
  const transferId = input.id;
  const out:BankMovement = {id:transferId+"-out",accountId:input.fromAccountId,kind:"transfer_out",amountCentimes:input.amountCentimes,date:input.date,description:input.description,transferId};
  const incoming:BankMovement = {id:transferId+"-in",accountId:input.toAccountId,kind:"transfer_in",amountCentimes:input.amountCentimes,date:input.date,description:input.description,transferId};
  if (movements.some(item => item.transferId === transferId || item.id === out.id || item.id === incoming.id)) {
    throw new Error("هذا التحويل البنكي مسجل من قبل");
  }
  const withOut = appendBankMovement(accounts,movements,out);
  return appendBankMovement(accounts,withOut,incoming);
}

export function reconcileBankBalance(
  accounts: BankAccount[],
  movements: BankMovement[],
  input: {id:string;accountId:string;statementBalanceCentimes:number;date:string;description:string},
): {movements:BankMovement[];differenceCentimes:number} {
  if (!Number.isSafeInteger(input.statementBalanceCentimes) || input.statementBalanceCentimes < 0) {
    throw new Error("رصيد كشف البنك غير صالح");
  }
  const account = accounts.find(item => item.id === input.accountId && item.active);
  if (!account) throw new Error("الحساب البنكي غير موجود أو غير نشط");
  const current = bankAccountBalance(account,movements);
  const differenceCentimes = input.statementBalanceCentimes-current;
  if (differenceCentimes === 0) return {movements,differenceCentimes:0};
  const movement:BankMovement = {
    id:input.id,accountId:input.accountId,
    kind:differenceCentimes>0?"adjustment_in":"adjustment_out",
    amountCentimes:Math.abs(differenceCentimes),date:input.date,
    description:input.description.trim()||"تسوية مع كشف الحساب",
  };
  return {movements:appendBankMovement(accounts,movements,movement),differenceCentimes};
}
