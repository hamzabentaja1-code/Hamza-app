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
  kind: 'opening' | 'purchase' | 'sale' | 'delivery' | 'return_in' | 'return_out' | 'adjustment' | 'stock_count' | 'transfer_in' | 'transfer_out';
  quantityDelta: number;
  date: string;
  reference?: string;
  note?: string;
  warehouseId?: string;
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
  if (!validDate(movement.date) || !Number.isSafeInteger(movement.quantityDelta) || movement.quantityDelta === 0 || (movement.warehouseId !== undefined && !movement.warehouseId.trim())) throw new Error('تاريخ أو كمية حركة النسخة غير صالحة');
  const variant = variants.find(item => item.id === movement.variantId && item.active);
  if (!variant) throw new Error('النسخة غير موجودة أو غير نشطة');
  if (!['opening','purchase','sale','delivery','return_in','return_out','adjustment','stock_count','transfer_in','transfer_out'].includes(movement.kind)) throw new Error('نوع حركة النسخة غير صالح');
  if ((movement.kind === 'sale' || movement.kind === 'delivery' || movement.kind === 'return_out' || movement.kind === 'transfer_out') && movement.quantityDelta > 0) throw new Error('اتجاه كمية الحركة لا يطابق نوعها');
  if (!['sale','delivery','return_out','transfer_out','adjustment','stock_count'].includes(movement.kind) && movement.quantityDelta < 0) throw new Error('اتجاه كمية الحركة لا يطابق نوعها');
  const warehouseId = movement.warehouseId?.trim();
  if (warehouseId) {
    const warehouseHistory = history.filter(item => item.variantId === variant.id && variantMovementWarehouseId(item) === warehouseId);
    const warehouseBalance = warehouseHistory.length
      ? warehouseHistory.reduce((sum, item) => sum + item.quantityDelta, 0)
      : warehouseId === DEFAULT_VARIANT_WAREHOUSE_ID && history.every(item => item.variantId !== variant.id)
        ? variant.stockQty
        : 0;
    if (warehouseBalance + movement.quantityDelta < 0) throw new Error('مخزون النسخة غير كافٍ في هذا المخزن');
  }
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


/** Inventory selling value for active variants, returned in integer centimes. */
export function variantStockValueCentimes(variants: ProductVariant[], productId: number, fallbackSalePriceCentimes: number): number {
  return variants.filter(item => item.productId === productId && item.active)
    .reduce((sum, item) => sum + item.stockQty * (item.salePriceCentimes ?? fallbackSalePriceCentimes), 0);
}

/** Potential gross profit for active variant stock, returned in integer centimes. */
export function variantStockProfitCentimes(
  variants: ProductVariant[],
  productId: number,
  fallbackSalePriceCentimes: number,
  fallbackCostPriceCentimes: number,
): number {
  return variants.filter(item => item.productId === productId && item.active)
    .reduce((sum, item) => sum + item.stockQty * ((item.salePriceCentimes ?? fallbackSalePriceCentimes) - (item.costPriceCentimes ?? fallbackCostPriceCentimes)), 0);
}


export const DEFAULT_VARIANT_WAREHOUSE_ID = 'warehouse-default';

export type VariantWarehouseBalance = {
  variantId: string;
  productId: number;
  warehouseId: string;
  quantity: number;
};

function variantMovementWarehouseId(movement: VariantStockMovement): string {
  return movement.warehouseId?.trim() || DEFAULT_VARIANT_WAREHOUSE_ID;
}

/** Returns a variant's balance in one warehouse from its movement ledger.
 * Legacy movements without warehouseId belong to the default warehouse.
 */
export function variantWarehouseBalance(
  variantId: string,
  movements: VariantStockMovement[],
  warehouseId: string = DEFAULT_VARIANT_WAREHOUSE_ID,
  legacyDefaultBalance = 0,
): number {
  if (!variantId.trim() || !warehouseId.trim() || !Number.isSafeInteger(legacyDefaultBalance) || legacyDefaultBalance < 0) throw new Error('النسخة أو المخزن غير صالح');
  const rows = movements.filter(item => item.variantId === variantId && variantMovementWarehouseId(item) === warehouseId);
  if (!rows.length && warehouseId === DEFAULT_VARIANT_WAREHOUSE_ID && !movements.some(item => item.variantId === variantId)) return legacyDefaultBalance;
  return rows.reduce((sum, item) => sum + item.quantityDelta, 0);
}

/** Produces a complete variant-by-warehouse matrix, including zero balances. */
export function variantWarehouseStockMatrix(
  variants: ProductVariant[],
  movements: VariantStockMovement[],
  warehouses: Array<{id: string; name: string}>,
  productId?: number,
): Array<VariantWarehouseBalance & {warehouseName: string; attributes: VariantAttributes}> {
  const selectedVariants = variants.filter(item =>
    item.active && (productId === undefined || item.productId === productId)
  );
  if (warehouses.some(warehouse => !warehouse.id.trim() || !warehouse.name.trim()) ||
      new Set(warehouses.map(warehouse => warehouse.id)).size !== warehouses.length) {
    throw new Error('لائحة المخازن غير صالحة');
  }
  return selectedVariants.flatMap(variant => warehouses.map(warehouse => ({
    variantId: variant.id,
    productId: variant.productId,
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    attributes: {...variant.attributes},
    quantity: variantWarehouseBalance(variant.id, movements, warehouse.id, warehouse.id === DEFAULT_VARIANT_WAREHOUSE_ID ? variant.stockQty : 0),
  })));
}

/** Lists every warehouse balance for a single variant. */
export function variantWarehouseBalances(
  variantId: string,
  movements: VariantStockMovement[],
  warehouses: Array<{id: string; name: string}>,
): Array<{warehouseId: string; warehouseName: string; quantity: number}> {
  if (!warehouses.length) return [];
  return warehouses.map(warehouse => ({
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    quantity: variantWarehouseBalance(variantId, movements, warehouse.id),
  }));
}


export type VariantWarehouseTransferInput = {
  id: string;
  variantId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  date: string;
  reference?: string;
  note?: string;
};

/** Creates a paired, atomic transfer while preserving the variant's aggregate stock. */
export function transferVariantStockBetweenWarehouses(
  variants: ProductVariant[],
  history: VariantStockMovement[],
  input: VariantWarehouseTransferInput,
): {variants: ProductVariant[]; movements: [VariantStockMovement, VariantStockMovement]} {
  if (!input.id.trim() || !input.fromWarehouseId.trim() || !input.toWarehouseId.trim() ||
      input.fromWarehouseId === input.toWarehouseId || !Number.isSafeInteger(input.quantity) ||
      input.quantity <= 0 || !validDate(input.date)) {
    throw new Error('بيانات تحويل مخزون النسخة غير صالحة');
  }
  if (history.some(item => item.id === input.id + ':out' || item.id === input.id + ':in')) {
    throw new Error('تحويل مخزون النسخة مسجل من قبل');
  }
  const source: VariantStockMovement = {
    id: input.id + ':out', variantId: input.variantId, kind: 'transfer_out',
    quantityDelta: -input.quantity, date: input.date, warehouseId: input.fromWarehouseId,
    reference: input.reference, note: input.note,
  };
  const destination: VariantStockMovement = {
    id: input.id + ':in', variantId: input.variantId, kind: 'transfer_in',
    quantityDelta: input.quantity, date: input.date, warehouseId: input.toWarehouseId,
    reference: input.reference, note: input.note,
  };
  const afterSource = applyVariantStockMovement(variants, source, history);
  const afterDestination = applyVariantStockMovement(
    afterSource.variants, destination, [...history, afterSource.movement],
  );
  if (afterDestination.variants.find(item => item.id === input.variantId)?.stockQty !==
      variants.find(item => item.id === input.variantId)?.stockQty) {
    throw new Error('تحويل المخزون يجب أن يحافظ على الكمية الإجمالية');
  }
  return {
    variants: afterDestination.variants,
    movements: [afterSource.movement, afterDestination.movement],
  };
}
