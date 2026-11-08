export type ReturnablePurchase = {
  id: number;
  productId?: number;
  productName: string;
  supplierName: string;
  supplierId?: string;
  qty: number;
  unitCost: number;
};

export type SupplierReturn = {
  id: number;
  purchaseId: number;
  productId: string;
  productName: string;
  supplierName: string;
  supplierId?: string;
  quantity: number;
  unitCost: number;
  total: number;
  date: string;
};

export function createSupplierReturn(
  purchase: ReturnablePurchase,
  previousReturns: SupplierReturn[],
  quantity: number,
  availableStock: number,
  id: number,
  date: string,
): SupplierReturn {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('رقم الإرجاع غير صالح');
  if (!Number.isSafeInteger(purchase.id) || purchase.id <= 0) throw new Error('الشراء غير موجود');
  if (!purchase.productId || !Number.isSafeInteger(purchase.productId)) throw new Error('المنتج الأصلي غير مربوط بالشراء');
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > purchase.qty) throw new Error('كمية الإرجاع غير صالحة');
  if (previousReturns.some(item => item.id === id)) throw new Error('رقم الإرجاع مستعمل من قبل');
  const alreadyReturned = previousReturns
    .filter(item => item.purchaseId === purchase.id)
    .reduce((sum, item) => sum + item.quantity, 0);
  if (alreadyReturned + quantity > purchase.qty) throw new Error('كمية الإرجاع تجاوزت الكمية المشتراة');
  if (!Number.isFinite(availableStock) || availableStock < quantity) throw new Error('المخزون غير كافٍ لإرجاع الكمية للمورد');
  if (!Number.isFinite(purchase.unitCost) || purchase.unitCost < 0) throw new Error('ثمن الشراء غير صالح');
  if (!date.trim()) throw new Error('تاريخ الإرجاع إجباري');
  return {
    id,
    purchaseId: purchase.id,
    productId: String(purchase.productId),
    productName: purchase.productName,
    supplierName: purchase.supplierName,
    supplierId: purchase.supplierId,
    quantity,
    unitCost: purchase.unitCost,
    total: Math.round(quantity * purchase.unitCost * 100) / 100,
    date,
  };
}

export function supplierReturnTotalCentimes(returns: SupplierReturn[], supplierId: string, supplierName?: string): number {
  return returns.filter(item => item.supplierId ? item.supplierId === supplierId : item.supplierName === supplierName)
    .reduce((sum, item) => sum + Math.round(item.total * 100), 0);
}
