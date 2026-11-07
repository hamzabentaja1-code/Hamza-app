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
  stockCountId?: string;
  createdAt: string;
  note?: string;
};

export type Warehouse = { id: string; name: string; address?: string; active: boolean };
export type StockCountLine = {
  productId: string;
  expectedQuantity: number;
  countedQuantity: number;
  difference: number;
};
export type StockCount = {
  id: string;
  warehouseId: string;
  createdAt: string;
  reference?: string;
  lines: StockCountLine[];
};

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
  if (!input.id.trim()) throw new Error("معرف التحويل إجباري");
  if (input.fromWarehouseId === input.toWarehouseId) throw new Error("اختار مخزنين مختلفين");
  if (movements.some(m => m.id === input.id + "-out" || m.id === input.id + "-in")) throw new Error("معرف التحويل مستعمل من قبل");
  const error = validateStockIssue(movements, input.productId, input.fromWarehouseId, input.quantity);
  if (error) throw new Error(error);
  if (movements.some(m => m.transferId === input.id)) throw new Error("هاد التحويل مسجل من قبل");
  const common = { productId: input.productId, quantity: Math.abs(input.quantity), transferId: input.id, createdAt: input.createdAt, reference: input.reference };
  return [...movements,
    { ...common, id: input.id + "-out", warehouseId: input.fromWarehouseId, kind: "transfer_out" },
    { ...common, id: input.id + "-in", warehouseId: input.toWarehouseId, kind: "transfer_in" }
  ];
}

/** Prepare a physical count against a stable snapshot of the current ledger. */
export function createStockCount(input: {
  id: string; warehouseId: string; createdAt: string;
  reference?: string; lines: Array<{ productId: string; countedQuantity: number }>;
}, movements: StockMovement[]): StockCount {
  if (!input.id.trim() || !input.warehouseId.trim()) throw new Error("معرف الجرد والمخزن إجباريان");
  if (!Array.isArray(input.lines) || input.lines.length === 0) throw new Error("خاص الجرد يحتوي على منتج واحد على الأقل");
  if (movements.some(m => m.stockCountId === input.id)) throw new Error("هاد الجرد تطبق من قبل");
  const seen = new Set<string>();
  const lines = input.lines.map(line => {
    if (!line.productId?.trim()) throw new Error("المنتج فالجرد غير محدد");
    if (seen.has(line.productId)) throw new Error("كاين منتج مكرر فالجرد");
    seen.add(line.productId);
    if (!Number.isFinite(line.countedQuantity) || line.countedQuantity < 0) throw new Error("الكمية الفعلية خاصها تكون صفر أو أكثر");
    const expectedQuantity = warehouseStock(movements, line.productId, input.warehouseId);
    if (expectedQuantity < 0) throw new Error("رصيد المخزون الحالي سالب ولا يمكن جرده");
    return {
      productId: line.productId,
      expectedQuantity,
      countedQuantity: line.countedQuantity,
      difference: line.countedQuantity - expectedQuantity,
    };
  });
  return { id: input.id, warehouseId: input.warehouseId, createdAt: input.createdAt, reference: input.reference, lines };
}

/** Apply a count once; each non-zero difference becomes a traceable adjustment. */
export function applyStockCount(count: StockCount, movements: StockMovement[]): StockMovement[] {
  if (!count.id.trim() || !count.warehouseId.trim() || count.lines.length === 0) throw new Error("بيانات الجرد غير مكتملة");
  if (movements.some(m => m.stockCountId === count.id)) throw new Error("هاد الجرد تطبق من قبل");
  const ids = new Set(movements.map(m => m.id));
  const seen = new Set<string>();
  const adjustments: StockMovement[] = [];
  for (const line of count.lines) {
    if (!line.productId?.trim() || seen.has(line.productId)) throw new Error("المنتج فالجرد ناقص أو مكرر");
    seen.add(line.productId);
    if (!Number.isFinite(line.countedQuantity) || line.countedQuantity < 0 ||
        !Number.isFinite(line.expectedQuantity) || line.expectedQuantity < 0 ||
        !Number.isFinite(line.difference) || line.difference !== line.countedQuantity - line.expectedQuantity) {
      throw new Error("معطيات الجرد غير صحيحة");
    }
    const current = warehouseStock(movements, line.productId, count.warehouseId);
    if (current !== line.expectedQuantity) throw new Error("تبدل المخزون من بعد إعداد الجرد؛ عاود الجرد لتفادي خطأ فالرصيد");
    if (line.difference !== 0) {
      const id = count.id + "-" + line.productId;
      if (ids.has(id)) throw new Error("معرف حركة الجرد مستعمل من قبل");
      ids.add(id);
      adjustments.push({
        id, productId: line.productId, warehouseId: count.warehouseId,
        kind: "adjustment", quantity: line.difference, stockCountId: count.id,
        reference: count.reference ?? count.id, createdAt: count.createdAt,
        note: "تسوية جرد المخزون",
      });
    }
  }
  // Persist a zero-quantity marker when every counted line matches, so the
  // same physical count cannot be applied repeatedly without changing stock.
  if (adjustments.length === 0) {
    const first = count.lines[0];
    const id = count.id + "-verified";
    if (ids.has(id)) throw new Error("معرف حركة الجرد مستعمل من قبل");
    adjustments.push({
      id, productId: first.productId, warehouseId: count.warehouseId,
      kind: "adjustment", quantity: 0, stockCountId: count.id,
      reference: count.reference ?? count.id, createdAt: count.createdAt,
      note: "تأكيد جرد بلا فروقات",
    });
  }
  return [...movements, ...adjustments];
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
