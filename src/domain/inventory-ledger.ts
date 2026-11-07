export type InventoryMovementKind =
  | "opening" | "purchase" | "sale" | "delivery" | "return_in"
  | "return_out" | "adjustment" | "stock_count";

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
};

export type StockCountResult = {
  movement: InventoryMovement;
  expectedQuantity: number;
  countedQuantity: number;
  difference: number;
};

export function validateMovement(movement: InventoryMovement): string[] {
  const errors: string[] = [];
  if (!movement.id.trim()) errors.push("معرف الحركة إجباري");
  if (!Number.isSafeInteger(movement.productId) || movement.productId <= 0) errors.push("المنتج غير صالح");
  if (!movement.productName.trim()) errors.push("اسم المنتج إجباري");
  if (!Number.isSafeInteger(movement.quantityDelta) || movement.quantityDelta === 0) errors.push("تغيير الكمية خاصو يكون رقم صحيح وغير صفر");
  if (!movement.date.trim() || !Number.isFinite(Date.parse(movement.date))) errors.push("تاريخ الحركة غير صالح");
  if (!["opening", "purchase", "sale", "delivery", "return_in", "return_out", "adjustment", "stock_count"].includes(movement.kind)) errors.push("نوع حركة المخزون غير صالح");
  if (movement.unitCost !== undefined && (!Number.isFinite(movement.unitCost) || movement.unitCost < 0)) errors.push("تكلفة الوحدة غير صالحة");
  return errors;
}

export function appendInventoryMovement(
  movements: InventoryMovement[],
  movement: InventoryMovement,
): InventoryMovement[] {
  const errors = validateMovement(movement);
  if (errors.length) throw new Error(errors.join("؛ "));
  if (movements.some(item => item.id === movement.id)) throw new Error("حركة المخزون مسجلة من قبل");
  const balance = inventoryBalance(movements, movement.productId);
  if (balance + movement.quantityDelta < 0) throw new Error(`المخزون غير كافٍ. المتوفر: ${balance}`);
  return [...movements, movement];
}

export function inventoryBalance(movements: InventoryMovement[], productId: number): number {
  return movements.filter(item => item.productId === productId)
    .reduce((sum, item) => sum + item.quantityDelta, 0);
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
  },
): StockCountResult {
  if (!Number.isSafeInteger(input.countedQuantity) || input.countedQuantity < 0) {
    throw new Error("الكمية المعدودة خاصها تكون عدد صحيح صفر أو أكثر");
  }
  const expectedQuantity = inventoryBalance(movements, input.productId);
  const difference = input.countedQuantity - expectedQuantity;
  if (difference === 0) throw new Error("الجرد مطابق للمخزون المسجل، ما كاين حتى فرق");
  const movement: InventoryMovement = {
    id: input.id,
    productId: input.productId,
    productName: input.productName,
    kind: "stock_count",
    quantityDelta: difference,
    date: input.date,
    note: input.note?.trim() || `جرد: المسجل ${expectedQuantity}، المعدود ${input.countedQuantity}`,
  };
  const next = appendInventoryMovement(movements, movement);
  return { movement: next[next.length - 1], expectedQuantity, countedQuantity: input.countedQuantity, difference };
}

export function inventoryMovementsForProduct(
  movements: InventoryMovement[],
  productId: number,
): InventoryMovement[] {
  return movements.filter(item => item.productId === productId)
    .slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}
