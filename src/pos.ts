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

type PricedPosition=Pick<PosLine,'quantity'|'unitPrice'|'discount'>;
const toCents=(value:number)=>Math.round(value*100);
const lineNetCentimes=(line:PricedPosition)=>Math.max(0,toCents(line.quantity*line.unitPrice-line.discount));

/** Account for every centime exactly once, in a stable line order. */
export function allocatePosLineTotals(lines:readonly PricedPosition[],total:number):number[]{
  const weights=lines.map(lineNetCentimes),goal=toCents(total);
  const subtotal=weights.reduce((sum,value)=>sum+value,0);
  if(!Number.isSafeInteger(goal)||goal<0||!weights.every(Number.isSafeInteger)||
     !Number.isSafeInteger(subtotal)||goal>subtotal)throw new Error('مجموع نقطة البيع غير صالح.');
  if(subtotal===0)return weights.map(()=>0);
  let cumulative=BigInt(0),allocated=BigInt(0);
  const denominator=BigInt(subtotal),target=BigInt(goal);
  return weights.map(weight=>{
    cumulative+=BigInt(weight);
    const next=(cumulative*target+denominator/BigInt(2))/denominator;
    const portion=next-allocated;allocated=next;
    return Number(portion)/100;
  });
}

export function posTotals(cart: PosCart) {
  const subtotal = cart.lines.reduce((sum, line) => sum + lineNetCentimes(line), 0);
  const discount = Math.min(subtotal, Math.max(0,toCents(cart.globalDiscount)));
  const total = Math.max(0, subtotal - discount);
  const received = Math.max(0,toCents(cart.paidAmount));
  const paid = Math.min(total,received);
  return {subtotal:subtotal/100,discount:discount/100,total:total/100,paid:paid/100,
    remaining:(total-paid)/100,change:Math.max(0,received-total)/100};
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
  if (cart.paymentMethod === "credit" && !cart.customerId) errors.push("اختار زبوناً مسجلاً للبيع بالدين");
  if (cart.paymentMethod === "credit" && (!Number.isFinite(cart.paidAmount) || cart.paidAmount < 0 || cart.paidAmount > totals.total)) errors.push("المبلغ المؤدى ما صالحش");
  return errors;
}

export function emptyPosCart(): PosCart {
  return { lines: [], globalDiscount: 0, paymentMethod: "cash", paidAmount: 0 };
}
