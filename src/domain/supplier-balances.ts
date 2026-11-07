export type SupplierPurchaseRecord = { supplierName: string; total: number; paidCentimes?: number };
export type SupplierOpeningBalanceRecord = { supplierName: string; openingBalanceCentimes?: number };
export type SupplierReturnBalanceRecord = { supplierName: string; amountCentimes: number };
export type SupplierBalance = { supplierName: string; purchaseCount: number; totalCentimes: number; paidCentimes: number; openingBalanceCentimes: number; returnedCentimes: number; outstandingCentimes: number };
/** Groups purchase liabilities by supplier, using integer centimes. */
export function calculateSupplierBalances(
  purchases: SupplierPurchaseRecord[],
  openingBalances: SupplierOpeningBalanceRecord[] = [],
  returns: SupplierReturnBalanceRecord[] = [],
): SupplierBalance[] {
  const balances = new Map<string, SupplierBalance>();
  for (const supplier of openingBalances) {
    const name = supplier.supplierName.trim();
    const opening = supplier.openingBalanceCentimes ?? 0;
    if (!name || !Number.isSafeInteger(opening) || opening < 0) {
      throw new Error('رصيد افتتاحي للمورد غير صالح');
    }
    const current = balances.get(name) ?? {
      supplierName: name, purchaseCount: 0, totalCentimes: 0, paidCentimes: 0,
      openingBalanceCentimes: 0, returnedCentimes: 0, outstandingCentimes: 0,
    };
    current.openingBalanceCentimes += opening;
    current.outstandingCentimes += opening;
    if (![current.openingBalanceCentimes, current.outstandingCentimes].every(Number.isSafeInteger)) {
      throw new Error('رصيد افتتاحي للمورد كبير بزاف');
    }
    balances.set(name, current);
  }
  for (const purchase of purchases) {
    const name = purchase.supplierName.trim();
    if (!name) throw new Error('اسم المورد مطلوب لحساب الدين');
    const totalCentimes = Math.round(purchase.total * 100);
    const paidCentimes = purchase.paidCentimes ?? 0;
    if (!Number.isSafeInteger(totalCentimes) || totalCentimes < 0 ||
        !Number.isSafeInteger(paidCentimes) || paidCentimes < 0 || paidCentimes > totalCentimes) {
      throw new Error('رصيد شراء المورد غير صالح: ' + name);
    }
    const current = balances.get(name) ?? { supplierName: name, purchaseCount: 0, totalCentimes: 0, paidCentimes: 0, openingBalanceCentimes: 0, returnedCentimes: 0, outstandingCentimes: 0 };
    current.purchaseCount++;
    current.totalCentimes += totalCentimes;
    current.paidCentimes += paidCentimes;
    current.outstandingCentimes += totalCentimes - paidCentimes;
    if (![current.totalCentimes, current.paidCentimes, current.outstandingCentimes].every(Number.isSafeInteger)) throw new Error('رصيد المورد كبير بزاف');
    balances.set(name, current);
  }
  for (const item of returns) {
    const name = item.supplierName.trim();
    if (!name || !Number.isSafeInteger(item.amountCentimes) || item.amountCentimes < 0) {
      throw new Error('مرتجع المورد غير صالح');
    }
    const current = balances.get(name) ?? {
      supplierName:name, purchaseCount:0, totalCentimes:0, paidCentimes:0,
      openingBalanceCentimes:0, returnedCentimes:0, outstandingCentimes:0,
    };
    current.returnedCentimes += item.amountCentimes;
    current.outstandingCentimes -= item.amountCentimes;
    if (![current.returnedCentimes,current.outstandingCentimes].every(Number.isSafeInteger)) {
      throw new Error('رصيد مرتجعات المورد كبير بزاف');
    }
    balances.set(name,current);
  }
  return Array.from(balances.values()).sort((a, b) => b.outstandingCentimes - a.outstandingCentimes);
}
