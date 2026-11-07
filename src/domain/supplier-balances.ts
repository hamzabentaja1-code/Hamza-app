export type SupplierPurchaseRecord = { supplierName: string; total: number; paidCentimes?: number };
export type SupplierBalance = { supplierName: string; purchaseCount: number; totalCentimes: number; paidCentimes: number; outstandingCentimes: number };
/** Groups purchase liabilities by supplier, using integer centimes. */
export function calculateSupplierBalances(purchases: SupplierPurchaseRecord[]): SupplierBalance[] {
  const balances = new Map<string, SupplierBalance>();
  for (const purchase of purchases) {
    const name = purchase.supplierName.trim();
    if (!name) throw new Error('اسم المورد مطلوب لحساب الدين');
    const totalCentimes = Math.round(purchase.total * 100);
    const paidCentimes = purchase.paidCentimes ?? 0;
    if (!Number.isSafeInteger(totalCentimes) || totalCentimes < 0 ||
        !Number.isSafeInteger(paidCentimes) || paidCentimes < 0 || paidCentimes > totalCentimes) {
      throw new Error('رصيد شراء المورد غير صالح: ' + name);
    }
    const current = balances.get(name) ?? { supplierName: name, purchaseCount: 0, totalCentimes: 0, paidCentimes: 0, outstandingCentimes: 0 };
    current.purchaseCount++;
    current.totalCentimes += totalCentimes;
    current.paidCentimes += paidCentimes;
    current.outstandingCentimes += totalCentimes - paidCentimes;
    if (![current.totalCentimes, current.paidCentimes, current.outstandingCentimes].every(Number.isSafeInteger)) throw new Error('رصيد المورد كبير بزاف');
    balances.set(name, current);
  }
  return Array.from(balances.values()).sort((a, b) => b.outstandingCentimes - a.outstandingCentimes);
}
