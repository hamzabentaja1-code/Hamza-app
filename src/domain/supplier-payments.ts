export type SupplierPaymentRecord = {
  id: number;
  purchaseId: number;
  supplierName: string;
  amountCentimes: number;
  method: string;
  date: string;
  note: string;
};

export type PurchasePaymentState = {
  total: number;
  paidCentimes?: number;
};

export function allocateSupplierPayment(
  purchase: PurchasePaymentState,
  amountCentimes: number,
): { paidCentimes: number; remainingCentimes: number } {
  const totalCentimes = Math.round(purchase.total * 100);
  const paidCentimes = purchase.paidCentimes ?? 0;
  if (!Number.isSafeInteger(totalCentimes) || totalCentimes < 0 ||
      !Number.isSafeInteger(paidCentimes) || paidCentimes < 0 ||
      paidCentimes > totalCentimes) {
    throw new Error("رصيد الشراء غير صالح");
  }
  if (!Number.isSafeInteger(amountCentimes) || amountCentimes <= 0) {
    throw new Error("مبلغ الأداء خاصو يكون موجب وبالسنتيم");
  }
  const remainingCentimes = totalCentimes - paidCentimes;
  if (amountCentimes > remainingCentimes) {
    throw new Error("الأداء أكبر من الدين المتبقي للمورد");
  }
  return {
    paidCentimes: paidCentimes + amountCentimes,
    remainingCentimes: remainingCentimes - amountCentimes,
  };
}

export function reverseSupplierPayment(
  purchase: PurchasePaymentState,
  amountCentimes: number,
): { paidCentimes: number; remainingCentimes: number } {
  const totalCentimes = Math.round(purchase.total * 100);
  const paidCentimes = purchase.paidCentimes ?? 0;
  if (!Number.isSafeInteger(totalCentimes) || totalCentimes < 0 ||
      !Number.isSafeInteger(paidCentimes) || paidCentimes < 0 ||
      paidCentimes > totalCentimes ||
      !Number.isSafeInteger(amountCentimes) || amountCentimes <= 0 ||
      amountCentimes > paidCentimes) {
    throw new Error("لا يمكن عكس الأداء: راجع الرصيد ومبلغ الأداء");
  }
  return {
    paidCentimes: paidCentimes - amountCentimes,
    remainingCentimes: totalCentimes - paidCentimes + amountCentimes,
  };
}
