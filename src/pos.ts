export type PosProduct = { id: string; name: string; reference?: string; barcode?: string; salePrice: number; stock?: number; trackStock?: boolean };
export type PosLine = { productId: string; name: string; quantity: number; unitPrice: number; discount: number };
export type PosCart = { customerId?: string; lines: PosLine[]; globalDiscount: number; paymentMethod: "cash" | "card" | "transfer" | "credit"; paidAmount: number };

export function findPosProduct(products: PosProduct[], term: string): PosProduct | undefined {
  const q = term.trim().toLocaleLowerCase();
  if (!q) return undefined;
  return products.find(p => p.barcode?.toLocaleLowerCase() === q)
    ?? products.find(p => p.reference?.toLocaleLowerCase() === q)
    ?? products.find(p => p.name.toLocaleLowerCase().includes(q));
}

export function addPosLine(cart: PosCart, product: PosProduct, quantity = 1): PosCart {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("الكمية غير صحيحة");
  const existing = cart.lines.find(l => l.productId === product.id);
  const nextQuantity = (existing?.quantity ?? 0) + quantity;
  if (product.trackStock && product.stock !== undefined && nextQuantity > product.stock) {
    throw new Error(`المخزون غير كافي: ${product.stock}`);
  }
  const lines = existing
    ? cart.lines.map(l => l.productId === product.id ? { ...l, quantity: nextQuantity } : l)
    : [...cart.lines, { productId: product.id, name: product.name, quantity, unitPrice: product.salePrice, discount: 0 }];
  return { ...cart, lines };
}

export function posTotals(cart: PosCart) {
  const subtotal = cart.lines.reduce((s, l) => s + Math.max(0, l.quantity * l.unitPrice - l.discount), 0);
  const discount = Math.min(subtotal, Math.max(0, cart.globalDiscount));
  const total = Math.max(0, subtotal - discount);
  const paid = Math.min(total, Math.max(0, cart.paidAmount));
  return { subtotal, discount, total, paid, remaining: total - paid, change: Math.max(0, cart.paidAmount - total) };
}

export function validateCheckout(cart: PosCart): string[] {
  const errors: string[] = [];
  if (!cart.lines.length) errors.push("السلة فارغة");
  for (const line of cart.lines) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) errors.push(`كمية غير صحيحة: ${line.name}`);
    if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) errors.push(`ثمن غير صحيح: ${line.name}`);
    if (!Number.isFinite(line.discount) || line.discount < 0 || line.discount > line.quantity * line.unitPrice) errors.push(`تخفيض غير صحيح: ${line.name}`);
  }
  const totals = posTotals(cart);
  if (cart.paymentMethod !== "credit" && totals.remaining > 0) errors.push("المبلغ المؤدى أقل من المجموع");
  return errors;
}

export function emptyPosCart(): PosCart {
  return { lines: [], globalDiscount: 0, paymentMethod: "cash", paidAmount: 0 };
}
