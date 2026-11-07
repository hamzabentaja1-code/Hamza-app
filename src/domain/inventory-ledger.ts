export const DEFAULT_WAREHOUSE_ID = "warehouse-default";

export type Warehouse = {
  id: string;
  name: string;
  address?: string;
  isDefault?: boolean;
};

export type InventoryMovementKind =
  | "opening" | "purchase" | "sale" | "delivery" | "return_in"
  | "return_out" | "adjustment" | "stock_count"
  | "transfer_in" | "transfer_out";

export type InventoryMovement = {
  id: string;
  productId: number;
  productName: string;
  kind: InventoryMovementKind;
  quantityDelta: number;
  date: string;
  sourceId?: string;
  note?: string;
  unitCost?: number;
  warehouseId?: string;
  transferId?: string;
};

export type StockCountResult = {
  movement: InventoryMovement;
  expectedQuantity: number;
  countedQuantity: number;
  difference: number;
};

export type WarehouseTransferInput = {
  id: string;
  productId: number;
  productName: string;
  quantity: number;
  fromWarehouseId: string;
  toWarehouseId: string;
  date: string;
  note?: string;
  unitCost?: number;
};

export function movementWarehouseId(movement: InventoryMovement): string {
  return movement.warehouseId?.trim() || DEFAULT_WAREHOUSE_ID;
}

export function validateMovement(movement: InventoryMovement): string[] {
  const errors: string[] = [];
  if (!movement.id.trim()) errors.push("معرف الحركة إجباري");
  if (!Number.isSafeInteger(movement.productId) || movement.productId <= 0) errors.push("المنتج غير صالح");
  if (!movement.productName.trim()) errors.push("اسم المنتج إجباري");
  if (!Number.isSafeInteger(movement.quantityDelta) || movement.quantityDelta === 0) errors.push("تغيير الكمية خاصو يكون رقم صحيح وغير صفر");
  if (!movement.date.trim() || !Number.isFinite(Date.parse(movement.date))) errors.push("تاريخ الحركة غير صالح");
  if (!["opening", "purchase", "sale", "delivery", "return_in", "return_out", "adjustment", "stock_count", "transfer_in", "transfer_out"].includes(movement.kind)) {
    errors.push("نوع حركة المخزون غير صالح");
  } else {
    const positiveKinds: InventoryMovementKind[] = ["opening", "purchase", "return_in", "transfer_in"];
    const negativeKinds: InventoryMovementKind[] = ["sale", "delivery", "return_out", "transfer_out"];
    if (positiveKinds.includes(movement.kind) && movement.quantityDelta < 0) {
      errors.push("هاد النوع من الحركة خاصو يزيد المخزون");
    }
    if (negativeKinds.includes(movement.kind) && movement.quantityDelta > 0) {
      errors.push("هاد النوع من الحركة خاصو ينقص المخزون");
    }
  }
  if (movement.warehouseId !== undefined && !movement.warehouseId.trim()) errors.push("المخزن غير صالح");
  if (movement.unitCost !== undefined && (!Number.isFinite(movement.unitCost) || movement.unitCost < 0)) errors.push("تكلفة الوحدة غير صالحة");
  return errors;
}

export function appendInventoryMovement(
  movements: InventoryMovement[],
  movement: InventoryMovement,
): InventoryMovement[] {
  const normalized = { ...movement, warehouseId: movementWarehouseId(movement) };
  const errors = validateMovement(normalized);
  if (errors.length) throw new Error(errors.join("؛ "));
  if (movements.some(item => item.id === normalized.id)) throw new Error("حركة المخزون مسجلة من قبل");
  const balance = inventoryBalanceForWarehouse(movements, normalized.productId, normalized.warehouseId);
  if (balance + normalized.quantityDelta < 0) throw new Error(`المخزون غير كافٍ في هذا المخزن. المتوفر: ${balance}`);
  return [...movements, normalized];
}

export function inventoryBalance(movements: InventoryMovement[], productId: number): number {
  return movements.filter(item => item.productId === productId)
    .reduce((sum, item) => sum + item.quantityDelta, 0);
}

export function inventoryBalanceForWarehouse(
  movements: InventoryMovement[],
  productId: number,
  warehouseId: string = DEFAULT_WAREHOUSE_ID,
): number {
  return movements.filter(item => item.productId === productId && movementWarehouseId(item) === warehouseId)
    .reduce((sum, item) => sum + item.quantityDelta, 0);
}

export function inventoryBalancesByWarehouse(
  movements: InventoryMovement[],
  productId: number,
  warehouses: Warehouse[],
): Array<{ warehouseId: string; warehouseName: string; quantity: number }> {
  return warehouses.map(warehouse => ({
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    quantity: inventoryBalanceForWarehouse(movements, productId, warehouse.id),
  }));
}

export function createWarehouseTransfer(
  movements: InventoryMovement[],
  input: WarehouseTransferInput,
): InventoryMovement[] {
  if (!input.id.trim()) throw new Error("معرف التحويل إجباري");
  if (!input.fromWarehouseId.trim() || !input.toWarehouseId.trim()) throw new Error("حدد مخزن المصدر والوجهة");
  if (input.fromWarehouseId === input.toWarehouseId) throw new Error("مخزن المصدر والوجهة خاصهم يكونو مختلفين");
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) throw new Error("كمية التحويل خاصها تكون عدد صحيح أكبر من صفر");
  if (!input.date.trim() || !Number.isFinite(Date.parse(input.date))) throw new Error("تاريخ التحويل غير صالح");
  if (!Number.isSafeInteger(input.productId) || input.productId <= 0 || !input.productName.trim()) throw new Error("المنتج غير صالح");
  if (input.unitCost !== undefined && (!Number.isFinite(input.unitCost) || input.unitCost < 0)) throw new Error("تكلفة الوحدة غير صالحة");
  const transferId = input.id;
  const source: InventoryMovement = {
    id: transferId + "-out", productId: input.productId, productName: input.productName,
    kind: "transfer_out", quantityDelta: -input.quantity, date: input.date,
    warehouseId: input.fromWarehouseId, transferId, sourceId: transferId,
    note: input.note?.trim() || "تحويل إلى مخزن آخر", unitCost: input.unitCost,
  };
  const destination: InventoryMovement = {
    id: transferId + "-in", productId: input.productId, productName: input.productName,
    kind: "transfer_in", quantityDelta: input.quantity, date: input.date,
    warehouseId: input.toWarehouseId, transferId, sourceId: transferId,
    note: input.note?.trim() || "استلام تحويل من مخزن آخر", unitCost: input.unitCost,
  };
  if (movements.some(item => item.id === source.id || item.id === destination.id || item.transferId === transferId)) {
    throw new Error("هذا التحويل مسجل من قبل");
  }
  const available = inventoryBalanceForWarehouse(movements, input.productId, input.fromWarehouseId);
  if (available < input.quantity) throw new Error(`المخزون غير كافٍ في مخزن المصدر. المتوفر: ${available}`);
  // Both entries are validated before returning a new array, so callers can persist them atomically.
  const withSource = appendInventoryMovement(movements, source);
  return appendInventoryMovement(withSource, destination);
}

export function createStockCount(
  movements: InventoryMovement[],
  input: {
    id: string;
    productId: number;
    productName: string;
    countedQuantity: number;
    date: string;
    note?: string;
    warehouseId?: string;
  },
): StockCountResult {
  if (!Number.isSafeInteger(input.countedQuantity) || input.countedQuantity < 0) {
    throw new Error("الكمية المعدودة خاصها تكون عدد صحيح صفر أو أكثر");
  }
  const warehouseId = input.warehouseId || DEFAULT_WAREHOUSE_ID;
  const expectedQuantity = inventoryBalanceForWarehouse(movements, input.productId, warehouseId);
  const difference = input.countedQuantity - expectedQuantity;
  if (difference === 0) throw new Error("الجرد مطابق للمخزون المسجل، ما كاين حتى فرق");
  const movement: InventoryMovement = {
    id: input.id, productId: input.productId, productName: input.productName,
    kind: "stock_count", quantityDelta: difference, date: input.date, warehouseId,
    note: input.note?.trim() || `جرد: المسجل ${expectedQuantity}، المعدود ${input.countedQuantity}`,
  };
  const next = appendInventoryMovement(movements, movement);
  return { movement: next[next.length - 1], expectedQuantity, countedQuantity: input.countedQuantity, difference };
}

export function inventoryMovementsForProduct(
  movements: InventoryMovement[],
  productId: number,
  warehouseId?: string,
): InventoryMovement[] {
  return movements.filter(item =>
    item.productId === productId &&
    (warehouseId === undefined || movementWarehouseId(item) === warehouseId)
  ).slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}
