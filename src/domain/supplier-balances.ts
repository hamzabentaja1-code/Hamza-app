export type SupplierBalanceRecord = { supplierName: string; total: number; paid: number; outstanding: number };

/** Calculates supplier payables in integer centimes to avoid floating-point balance drift. */
export function calculateSupplierBalances(
  suppliers: { name: string }[],
  purchases: { supplierName: string; total: number }[],
  payments: { supplierName: string; amount: number }[],
): SupplierBalanceRecord[] {
  return suppliers.map(supplier => {
    const totalCentimes = purchases.filter(item => item.supplierName === supplier.name).reduce((sum, item) => {
      if (!Number.isFinite(item.total) || item.total < 0) throw new Error('مبلغ الشراء غير صالح');
      const cents = Math.round(item.total * 100);
      if (!Number.isSafeInteger(cents)) throw new Error('مبلغ الشراء كبير بزاف');
      return sum + cents;
    }, 0);
    const paidCentimes = payments.filter(item => item.supplierName === supplier.name).reduce((sum, item) => {
      if (!Number.isFinite(item.amount) || item.amount < 0) throw new Error('مبلغ أداء المورد غير صالح');
      const cents = Math.round(item.amount * 100);
      if (!Number.isSafeInteger(cents)) throw new Error('مبلغ الأداء كبير بزاف');
      return sum + cents;
    }, 0);
    if (!Number.isSafeInteger(totalCentimes) || !Number.isSafeInteger(paidCentimes)) {
      throw new Error('رصيد المورد تجاوز الحدود المسموح بها');
    }
    return {
      supplierName: supplier.name,
      total: totalCentimes / 100,
      paid: paidCentimes / 100,
      outstanding: Math.max(0, totalCentimes - paidCentimes) / 100,
    };
  });
}
