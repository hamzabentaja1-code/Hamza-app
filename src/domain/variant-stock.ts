export type VariantAttributes = Record<string, string>;
export type ProductVariant = {
  id: string;
  productId: number;
  sku?: string;
  barcode?: string;
  attributes: VariantAttributes;
  stockQty: number;
  costPriceCentimes?: number;
  salePriceCentimes?: number;
  active: boolean;
};
export type VariantStockMovement = {
  id: string;
  variantId: string;
  kind: 'opening' | 'purchase' | 'sale' | 'delivery' | 'return_in' | 'return_out' | 'adjustment' | 'stock_count';
  quantityDelta: number;
  date: string;
  reference?: string;
  note?: string;
};

const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
const normalizedAttributes = (attributes: VariantAttributes) =>
  Object.entries(attributes).map(([key, value]) => [key.trim().toLocaleLowerCase(), value.trim().toLocaleLowerCase()] as const)
    .filter(([key, value]) => key && value).sort(([a], [b]) => a.localeCompare(b));
const attributeKey = (attributes: VariantAttributes) => JSON.stringify(normalizedAttributes(attributes));

export function createProductVariant(variant: ProductVariant, existing: ProductVariant[] = []): ProductVariant {
  if (!variant.id.trim() || !Number.isSafeInteger(variant.productId) || variant.productId <= 0) throw new Error('معرف المنتج والنسخة غير صالحين');
  if (!Object.keys(variant.attributes).length || !normalizedAttributes(variant.attributes).length) throw new Error('خصائص النسخة مطلوبة');
  const normalized = normalizedAttributes(variant.attributes);
  if (new Set(normalized.map(([key]) => key)).size !== normalized.length) throw new Error('خصائص النسخة فيها أسماء مكررة');
  if (!Number.isSafeInteger(variant.stockQty) || variant.stockQty < 0) throw new Error('كمية النسخة غير صالحة');
  for (const value of [variant.costPriceCentimes, variant.salePriceCentimes]) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) throw new Error('ثمن النسخة غير صالح');
  }
  if (existing.some(item => item.id === variant.id)) throw new Error('معرف النسخة مسجل من قبل');
  if (variant.sku?.trim() && existing.some(item => item.productId === variant.productId && item.sku?.trim().toLowerCase() === variant.sku?.trim().toLowerCase())) {
    throw new Error('مرجع النسخة مسجل من قبل');
  }
  if (variant.barcode?.trim() && existing.some(item => item.barcode?.trim() === variant.barcode?.trim())) {
    throw new Error('باركود النسخة مسجل من قبل');
  }
  if (existing.some(item => item.productId === variant.productId && attributeKey(item.attributes) === attributeKey(variant.attributes))) {
    throw new Error('نفس خصائص النسخة مسجلة من قبل');
  }
  return {...variant, attributes: Object.fromEntries(normalized)};
}

export function applyVariantStockMovement(
  variants: ProductVariant[],
  movement: VariantStockMovement,
  history: VariantStockMovement[] = [],
): { variants: ProductVariant[]; movement: VariantStockMovement } {
  if (!movement.id.trim() || history.some(item => item.id === movement.id)) throw new Error('حركة المخزون مسجلة من قبل أو معرفها غير صالح');
  if (!validDate(movement.date) || !Number.isSafeInteger(movement.quantityDelta) || movement.quantityDelta === 0) throw new Error('تاريخ أو كمية حركة النسخة غير صالحة');
  const variant = variants.find(item => item.id === movement.variantId && item.active);
  if (!variant) throw new Error('النسخة غير موجودة أو غير نشطة');
  if (!['opening','purchase','sale','delivery','return_in','return_out','adjustment','stock_count'].includes(movement.kind)) throw new Error('نوع حركة النسخة غير صالح');
  if ((movement.kind === 'sale' || movement.kind === 'delivery' || movement.kind === 'return_out') && movement.quantityDelta > 0) throw new Error('اتجاه كمية الحركة لا يطابق نوعها');
  if (!['sale','delivery','return_out','adjustment','stock_count'].includes(movement.kind) && movement.quantityDelta < 0) throw new Error('اتجاه كمية الحركة لا يطابق نوعها');
  const nextQty = variant.stockQty + movement.quantityDelta;
  if (nextQty < 0) throw new Error('مخزون النسخة غير كافٍ');
  return {
    variants: variants.map(item => item.id === variant.id ? {...item, stockQty: nextQty} : item),
    movement: {...movement},
  };
}

export function totalVariantStock(variants: ProductVariant[], productId: number): number {
  return variants.filter(item => item.productId === productId && item.active).reduce((sum, item) => sum + item.stockQty, 0);
}

export function findVariantByAttributes(variants: ProductVariant[], productId: number, attributes: VariantAttributes): ProductVariant | undefined {
  const key = attributeKey(attributes);
  return variants.find(item => item.productId === productId && item.active && attributeKey(item.attributes) === key);
}
