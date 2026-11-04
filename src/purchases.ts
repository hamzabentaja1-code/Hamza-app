export type PurchaseKind = "request" | "order" | "receipt" | "supplier_invoice" | "supplier_credit";
export type PurchaseStatus = "draft" | "confirmed" | "received" | "cancelled";
export type PurchaseLine = { productId: string; description: string; quantity: number; unitCost: number; discount: number };
export type PurchaseDocument = {
  id: string; number: string; kind: PurchaseKind; status: PurchaseStatus;
  supplierId: string; warehouseId?: string; sourceDocumentId?: string;
  lines: PurchaseLine[]; globalDiscount: number; createdAt: string; dueDate?: string;
};
export type SupplierPayment = { id: string; supplierId: string; amount: number; date: string; method: "cash" | "bank" | "cheque"; reference?: string };

export function purchaseTotals(doc: PurchaseDocument) {
  const subtotal = doc.lines.reduce((sum, line) => sum + Math.max(0, line.quantity * line.unitCost - line.discount), 0);
  const discount = Math.min(subtotal, Math.max(0, doc.globalDiscount));
  return { subtotal, discount, total: Math.max(0, subtotal - discount) };
}

export function validatePurchase(doc: PurchaseDocument): string[] {
  const errors: string[] = [];
  if (!doc.supplierId) errors.push("خاص اختيار المورد");
  if (!doc.lines.length) errors.push("زيد منتوج واحد على الأقل");
  if (doc.kind === "receipt" && !doc.warehouseId) errors.push("خاص اختيار المخزن");
  doc.lines.forEach((line, i) => {
    if (!line.productId) errors.push(`المنتوج رقم ${i + 1} غير محدد`);
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) errors.push(`الكمية غير صحيحة فالسطر ${i + 1}`);
    if (!Number.isFinite(line.unitCost) || line.unitCost < 0) errors.push(`ثمن الشراء غير صحيح فالسطر ${i + 1}`);
    if (line.discount < 0 || line.discount > line.quantity * line.unitCost) errors.push(`التخفيض غير صحيح فالسطر ${i + 1}`);
  });
  return errors;
}

const allowed: Record<PurchaseKind, PurchaseStatus[]> = {
  request: ["draft", "confirmed", "cancelled"],
  order: ["draft", "confirmed", "cancelled"],
  receipt: ["draft", "received", "cancelled"],
  supplier_invoice: ["draft", "confirmed", "cancelled"],
  supplier_credit: ["draft", "confirmed", "cancelled"]
};

export function changePurchaseStatus(doc: PurchaseDocument, next: PurchaseStatus): PurchaseDocument {
  if (!allowed[doc.kind].includes(next)) throw new Error("هاد المرحلة ما مسموحاش لهاد الوثيقة");
  if (doc.status === "cancelled") throw new Error("الوثيقة ملغاة");
  if (doc.status === "received" && next !== "received") throw new Error("الاستلام مسجل نهائيا");
  return { ...doc, status: next };
}

export function supplierOutstanding(invoiceTotal: number, payments: SupplierPayment[], supplierId: string): number {
  const paid = payments.filter(p => p.supplierId === supplierId).reduce((sum, p) => sum + Math.max(0, p.amount), 0);
  return Math.max(0, invoiceTotal - paid);
}

export function validateSupplierPayment(payment: SupplierPayment): string[] {
  const errors: string[] = [];
  if (!payment.supplierId) errors.push("المورد إجباري");
  if (!Number.isFinite(payment.amount) || payment.amount <= 0) errors.push("مبلغ الأداء خاصو يكون أكبر من صفر");
  if (!payment.date) errors.push("تاريخ الأداء إجباري");
  if (payment.method === "cheque" && !payment.reference?.trim()) errors.push("مرجع الشيك إجباري");
  return errors;
}
