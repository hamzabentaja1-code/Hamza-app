export type SupplierPurchaseForReturn = {
  id: number; supplierName: string; productName: string; qty: number; unitCost: number;
};
export type SupplierReturnRecord = {
  id: number; purchaseId: number; supplierName: string; productName: string;
  qty: number; unitCost: number; amountCentimes: number; date: string; reason: string;
};
function validatePurchase(purchase: SupplierPurchaseForReturn): void {
  if (!Number.isSafeInteger(purchase.id) || purchase.id <= 0 ||
      !purchase.supplierName.trim() || !purchase.productName.trim() ||
      !Number.isSafeInteger(purchase.qty) || purchase.qty < 1 ||
      !Number.isFinite(purchase.unitCost) || purchase.unitCost < 0) {
    throw new Error('عملية الشراء غير صالحة للمرتجع');
  }
}
export function remainingSupplierReturnQuantity(
  purchase: SupplierPurchaseForReturn,
  returns: SupplierReturnRecord[],
): number {
  validatePurchase(purchase);
  const relevant = returns.filter(item => item.purchaseId === purchase.id);
  for (const item of relevant) {
    if (!Number.isSafeInteger(item.id) || item.id <= 0 ||
        !Number.isSafeInteger(item.qty) || item.qty < 1 ||
        !Number.isSafeInteger(item.amountCentimes) || item.amountCentimes < 0 ||
        !Number.isFinite(item.unitCost) || item.unitCost < 0 ||
        !item.date.trim() || !Number.isFinite(Date.parse(item.date))) {
      throw new Error('سجل مرتجعات المورد غير صالح');
    }
  }
  const returned = relevant.reduce((sum, item) => sum + item.qty, 0);
  if (!Number.isSafeInteger(returned) || returned < 0 || returned > purchase.qty) {
    throw new Error('كمية مرتجعات المورد غير صالحة');
  }
  return purchase.qty - returned;
}
export function calculateSupplierReturn(
  purchase: SupplierPurchaseForReturn,
  returns: SupplierReturnRecord[],
  input: { id: number; qty: number; date: string; reason?: string },
): SupplierReturnRecord {
  const remaining = remainingSupplierReturnQuantity(purchase, returns);
  if (!Number.isSafeInteger(input.qty) || input.qty < 1 || input.qty > remaining) {
    throw new Error('كمية المرتجع أكبر من الكمية المتبقية من الشراء');
  }
  if (!Number.isSafeInteger(input.id) || input.id <= 0 ||
      !input.date.trim() || !Number.isFinite(Date.parse(input.date))) {
    throw new Error('بيانات المرتجع غير صالحة');
  }
  const amountCentimes = Math.round(input.qty * purchase.unitCost * 100);
  if (!Number.isSafeInteger(amountCentimes) || amountCentimes < 0) {
    throw new Error('قيمة المرتجع غير صالحة');
  }
  return {
    id: input.id, purchaseId: purchase.id, supplierName: purchase.supplierName,
    productName: purchase.productName, qty: input.qty, unitCost: purchase.unitCost,
    amountCentimes, date: input.date, reason: input.reason?.trim() || '',
  };
}
