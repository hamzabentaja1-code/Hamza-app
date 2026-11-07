export type SupplierBalanceRecord = { supplierName: string; total: number; paid: number; outstanding: number };

export function calculateSupplierBalances(
  suppliers: { name: string }[],
  purchases: { supplierName: string; total: number }[],
  payments: { supplierName: string; amount: number }[],
): SupplierBalanceRecord[] {
  return suppliers.map(supplier => {
    const total = purchases.filter(item => item.supplierName === supplier.name).reduce((sum, item) => {
      if (!Number.isFinite(item.total) || item.total < 0) throw new Error('مبلغ الشراء غير صالح');
      return sum + item.total;
    }, 0);
    const paid = payments.filter(item => item.supplierName === supplier.name).reduce((sum, item) => {
      if (!Number.isFinite(item.amount) || item.amount < 0) throw new Error('مبلغ أداء المورد غير صالح');
      return sum + item.amount;
    }, 0);
    if (!Number.isFinite(total) || !Number.isFinite(paid)) throw new Error('رصيد المورد تجاوز الحدود المسموح بها');
    return { supplierName: supplier.name, total, paid, outstanding: Math.max(0, total - paid) };
  });
}
