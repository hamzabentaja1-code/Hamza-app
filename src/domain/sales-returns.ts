export type SaleReturnSource = {
  id: number;
  qty: number;
  total: number;
  costPrice?: number;
};

export type ExistingSaleReturn = {
  saleId: number;
  qty: number;
  total: number;
  costPrice?: number;
};

export type SalesReturnCalculation = {
  saleId: number;
  quantity: number;
  unitPrice: number;
  total: number;
  profitAdjustment?: number;
  remainingQuantity: number;
};

export function remainingReturnQuantity(
  sale: SaleReturnSource,
  returns: ExistingSaleReturn[],
): number {
  return Math.max(0, sale.qty - returns
    .filter(item => item.saleId === sale.id)
    .reduce((sum, item) => sum + item.qty, 0));
}

export function calculateSalesReturn(
  sale: SaleReturnSource,
  returns: ExistingSaleReturn[],
  quantity: number,
): SalesReturnCalculation {
  if (!Number.isSafeInteger(sale.qty) || sale.qty <= 0 || !Number.isFinite(sale.total) || sale.total < 0) {
    throw new Error("بيانات البيع الأصلية غير صالحة");
  }
  if (sale.costPrice !== undefined && (!Number.isFinite(sale.costPrice) || sale.costPrice < 0)) {
    throw new Error("تكلفة البيع الأصلية غير صالحة");
  }
  const remainingQuantity = remainingReturnQuantity(sale, returns);
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > remainingQuantity) {
    throw new Error("كمية الإرجاع تتجاوز الكمية المتبقية أو غير صالحة");
  }
  const unitPrice = sale.total / sale.qty;
  const total = Number((unitPrice * quantity).toFixed(2));
  const profitAdjustment = sale.costPrice === undefined
    ? undefined
    : Number((total - quantity * sale.costPrice).toFixed(2));
  return {
    saleId: sale.id,
    quantity,
    unitPrice,
    total,
    profitAdjustment,
    remainingQuantity: remainingQuantity - quantity,
  };
}

export function totalReturnProfitAdjustment(returns: ExistingSaleReturn[]): number {
  return Number(returns.reduce((sum, item) =>
    sum + (item.costPrice === undefined ? 0 : item.total - item.qty * item.costPrice), 0).toFixed(2));
}
