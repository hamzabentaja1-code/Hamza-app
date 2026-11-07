export type SaleProfitRecord = { total: number; quantity: number; unitCost?: number };

export type SalesProfitSummary = {
  grossProfit: number;
  costOfGoodsSold: number;
  trackedSalesCount: number;
  untrackedSalesCount: number;
};

/** Uses the unit cost captured at the time of sale. Legacy sales without a cost are excluded. */
export function calculateSalesProfit(sales: SaleProfitRecord[]): SalesProfitSummary {
  let grossProfit = 0;
  let costOfGoodsSold = 0;
  let trackedSalesCount = 0;
  let untrackedSalesCount = 0;
  for (const sale of sales) {
    if (!Number.isFinite(sale.total) || sale.total < 0 ||
        !Number.isFinite(sale.quantity) || sale.quantity <= 0) {
      throw new Error('سجل البيع غير صالح لحساب الربح');
    }
    if (sale.unitCost === undefined) {
      untrackedSalesCount++;
      continue;
    }
    if (!Number.isFinite(sale.unitCost) || sale.unitCost < 0) {
      throw new Error('تكلفة المنتج غير صالحة');
    }
    const cost = sale.unitCost * sale.quantity;
    costOfGoodsSold += cost;
    grossProfit += sale.total - cost;
    trackedSalesCount++;
  }
  if (!Number.isFinite(grossProfit) || !Number.isFinite(costOfGoodsSold)) {
    throw new Error('قيمة الربح تجاوزت الحدود المسموح بها');
  }
  return { grossProfit, costOfGoodsSold, trackedSalesCount, untrackedSalesCount };
}
