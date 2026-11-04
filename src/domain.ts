/**
 * HamZa commercial domain primitives.
 * Pure functions: safe to test and reuse from screens and document workflows.
 * Amounts are stored as integer centimes to avoid floating-point money drift.
 */
export type Money = number; // integer centimes (1 DH = 100)
export type PriceMode = 'HT' | 'TTC';
export type PaymentMethod = 'cash' | 'transfer' | 'cheque' | 'draft' | 'card' | 'credit';

export interface DocumentLine {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: Money;
  discountPercent?: number;
}
export interface DocumentTotals {
  subtotal: Money;
  discount: Money;
  total: Money;
}
export interface StockMovement {
  id: string;
  productId: string;
  warehouseId: string;
  quantityDelta: number;
  source: 'purchase_receipt' | 'sale_delivery' | 'sale_invoice' | 'purchase_return' | 'customer_return' | 'transfer_in' | 'transfer_out' | 'adjustment';
  documentId?: string;
  createdAt: string;
}
export interface PaymentAllocation {
  documentId: string;
  amount: Money;
}
export interface AccountDocument {
  id: string;
  total: Money;
  allocations: PaymentAllocation[];
}

export function dhToMoney(value: number): Money {
  if (!Number.isFinite(value)) throw new Error('المبلغ غير صالح');
  return Math.round(value * 100);
}
export function moneyToDh(value: Money): number {
  if (!Number.isSafeInteger(value)) throw new Error('القيمة المالية خاصها تكون عدد صحيح بالسنتيم');
  return value / 100;
}
export function calculateDocumentTotals(lines: DocumentLine[]): DocumentTotals {
  let subtotal = 0;
  let discount = 0;
  for (const line of lines) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) throw new Error('الكمية خاصها تكون أكبر من صفر');
    if (!Number.isSafeInteger(line.unitPrice) || line.unitPrice < 0) throw new Error('ثمن الوحدة غير صالح');
    const rate = line.discountPercent ?? 0;
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('نسبة التخفيض خاصها تكون بين 0 و100');
    const gross = Math.round(line.quantity * line.unitPrice);
    subtotal += gross;
    discount += Math.round(gross * rate / 100);
  }
  return { subtotal, discount, total: subtotal - discount };
}
export function getDocumentBalance(document: AccountDocument): Money {
  if (!Number.isSafeInteger(document.total) || document.total < 0) throw new Error('مجموع الوثيقة غير صالح');
  const paid = document.allocations.reduce((sum, item) => {
    if (!Number.isSafeInteger(item.amount) || item.amount < 0) throw new Error('مبلغ الأداء غير صالح');
    return sum + item.amount;
  }, 0);
  return Math.max(0, document.total - paid);
}
export function getStockBalance(movements: StockMovement[], productId: string, warehouseId: string): number {
  return movements
    .filter(m => m.productId === productId && m.warehouseId === warehouseId)
    .reduce((balance, movement) => balance + movement.quantityDelta, 0);
}
export function validateStockIssue(available: number, requested: number): void {
  if (!Number.isFinite(available) || available < 0) throw new Error('رصيد المخزون غير صالح');
  if (!Number.isFinite(requested) || requested <= 0) throw new Error('الكمية المطلوبة غير صالحة');
  if (requested > available) throw new Error('المخزون غير كافٍ');
}
export function formatDh(value: Money, locale: 'ar-MA' | 'fr-MA' = 'fr-MA'): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(moneyToDh(value)) + ' DH';
}
