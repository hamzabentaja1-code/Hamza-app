export type StockMovementKind = "opening" | "purchase" | "sale" | "return_in" | "return_out" | "transfer_in" | "transfer_out" | "adjustment";
export type StockMovement = {
  id: string;
  productId: string;
  warehouseId: string;
  kind: StockMovementKind;
  quantity: number;
  unitCost?: number;
  reference?: string;
  transferId?: string;
  createdAt: string;
  note?: string;
};

export type Warehouse = { id: string; name: string; address?: string; active: boolean };

export function warehouseStock(movements: StockMovement[], productId: string, warehouseId: string): number {
  return movements.filter(m => m.productId === productId && m.warehouseId === warehouseId)
    .reduce((sum, m) => sum + signedQuantity(m), 0);
}

function signedQuantity(m: StockMovement): number {
  switch (m.kind) {
    case "opening": case "purchase": case "return_in": case "transfer_in": return Math.abs(m.quantity);
    case "sale": case "return_out": case "transfer_out": return -Math.abs(m.quantity);
    case "adjustment": return m.quantity;
  }
}

export function validateStockIssue(movements: StockMovement[], productId: string, warehouseId: string, quantity: number): string | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return "الكمية خاصها تكون أكبر من صفر";
  const available = warehouseStock(movements, productId, warehouseId);
  return quantity > available ? `المخزون غير كافي. المتوفر: ${available}` : null;
}

export function transferStock(input: {
  id: string; productId: string; fromWarehouseId: string; toWarehouseId: string;
  quantity: number; createdAt: string; reference?: string;
}, movements: StockMovement[]): StockMovement[] {
  if (input.fromWarehouseId === input.toWarehouseId) throw new Error("اختار مخزنين مختلفين");
  const error = validateStockIssue(movements, input.productId, input.fromWarehouseId, input.quantity);
  if (error) throw new Error(error);
  if (movements.some(m => m.transferId === input.id)) throw new Error("هاد التحويل مسجل من قبل");
  const common = { id: input.id, productId: input.productId, quantity: Math.abs(input.quantity), transferId: input.id, createdAt: input.createdAt, reference: input.reference };
  return [...movements,
    { ...common, id: input.id + "-out", warehouseId: input.fromWarehouseId, kind: "transfer_out" },
    { ...common, id: input.id + "-in", warehouseId: input.toWarehouseId, kind: "transfer_in" }
  ];
}

export function inventoryValue(movements: StockMovement[], productId: string, warehouseId: string): number {
  const relevant = movements.filter(m => m.productId === productId && m.warehouseId === warehouseId);
  let quantity = 0, value = 0;
  for (const m of relevant) {
    const delta = signedQuantity(m);
    if (delta > 0) {
      value += delta * (m.unitCost ?? (quantity > 0 ? value / quantity : 0));
      quantity += delta;
    } else if (delta < 0 && quantity > 0) {
      const average = value / quantity;
      value += delta * average;
      quantity += delta;
    }
  }
  return Math.max(0, value);
}

export function validateWarehouse(warehouse: Partial<Warehouse>): string[] {
  const errors: string[] = [];
  if (!warehouse.name?.trim()) errors.push("اسم المخزن إجباري");
  return errors;
}
