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
  if (!doc.id?.trim()) errors.push('معرف وثيقة الشراء إجباري');
  if (!doc.number?.trim()) errors.push('رقم وثيقة الشراء إجباري');
  if (!doc.supplierId?.trim()) errors.push("خاص اختيار المورد");
  if (!['request','order','receipt','supplier_invoice','supplier_credit'].includes(doc.kind)) errors.push('نوع وثيقة الشراء غير صالح');
  if (!['draft','confirmed','received','cancelled'].includes(doc.status)) errors.push('مرحلة وثيقة الشراء غير صالحة');
  if (!doc.lines.length) errors.push("زيد منتوج واحد على الأقل");
  if ((doc.kind === "order"||doc.kind === "receipt") && !doc.warehouseId?.trim()) errors.push("خاص اختيار المخزن");
  if (!Number.isFinite(doc.globalDiscount) || doc.globalDiscount < 0) errors.push('التخفيض الإجمالي غير صالح');
  doc.lines.forEach((line, i) => {
    if (!line.productId) errors.push(`المنتوج رقم ${i + 1} غير محدد`);
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) errors.push(`الكمية غير صحيحة فالسطر ${i + 1}`);
    if (!Number.isFinite(line.unitCost) || line.unitCost < 0) errors.push(`ثمن الشراء غير صحيح فالسطر ${i + 1}`);
    if (!Number.isFinite(line.discount) || line.discount < 0 || line.discount > line.quantity * line.unitCost) errors.push(`التخفيض غير صحيح فالسطر ${i + 1}`);
  });
  return errors;
}

export function createPurchaseDocument(input:Omit<PurchaseDocument,'status'>,existing:PurchaseDocument[]):PurchaseDocument{
  const document:PurchaseDocument={...input,status:'draft'};
  const errors=validatePurchase(document);
  if(errors.length)throw new Error(errors[0]);
  if(existing.some(item=>item.id===document.id||item.number===document.number))throw new Error('رقم وثيقة الشراء مستعمل من قبل');
  if(document.sourceDocumentId&&!existing.some(item=>item.id===document.sourceDocumentId))throw new Error('وثيقة الشراء الأصلية غير موجودة');
  return document;
}

export function convertPurchaseDocument(
  source:PurchaseDocument,
  target:'order'|'receipt'|'supplier_invoice',
  existing:PurchaseDocument[],
  id:string,
  number:string,
  createdAt:string,
  warehouseId?:string,
):PurchaseDocument{
  const allowed:Record<PurchaseDocument['kind'],PurchaseDocument['kind']|undefined>={
    request:'order',order:'receipt',receipt:'supplier_invoice',supplier_invoice:undefined,supplier_credit:undefined,
  };
  if(allowed[source.kind]!==target)throw new Error('تحويل وثيقة الشراء غير مسموح');
  if(source.status==='cancelled')throw new Error('الوثيقة ملغاة');
  if(source.kind==='request'&&source.status!=='confirmed')throw new Error('أكد طلب الشراء قبل تحويله');
  if(source.kind==='order'&&source.status!=='confirmed')throw new Error('أكد أمر الشراء قبل الاستلام');
  if(source.kind==='receipt'&&source.status!=='received')throw new Error('استلم المنتجات قبل إنشاء فاتورة المورد');
  if(existing.some(item=>item.sourceDocumentId===source.id&&item.kind===target))throw new Error('تم إنشاء الوثيقة المرتبطة من قبل');
  const document:PurchaseDocument={
    id,number,kind:target,status:target==='receipt'?'received':'draft',supplierId:source.supplierId,
    ...((target==='order'||target==='receipt')?{warehouseId:source.warehouseId||warehouseId}:{}),sourceDocumentId:source.id,
    lines:source.lines.map(line=>({...line})),globalDiscount:source.globalDiscount,createdAt,
  };
  const errors=validatePurchase(document);
  if(errors.length)throw new Error(errors[0]);
  if(existing.some(item=>item.id===id||item.number===number))throw new Error('رقم وثيقة الشراء مستعمل من قبل');
  return document;
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

export function supplierOutstanding(invoiceTotal: number, payments: SupplierPayment[], supplierId: string, credits = 0): number {
  if (!Number.isSafeInteger(invoiceTotal) || invoiceTotal < 0 || !Number.isSafeInteger(credits) || credits < 0) {
    throw new Error('رصيد المورد غير صالح');
  }
  const paid = payments.filter(p => p.supplierId === supplierId).reduce((sum, p) => sum + Math.max(0, p.amount), 0);
  return Math.max(0, invoiceTotal - paid - credits);
}

export function supplierCreditBalance(invoiceTotal: number, payments: SupplierPayment[], supplierId: string, credits = 0): number {
  if (!Number.isSafeInteger(invoiceTotal) || invoiceTotal < 0 || !Number.isSafeInteger(credits) || credits < 0) {
    throw new Error('رصيد المورد غير صالح');
  }
  const paid = payments.filter(p => p.supplierId === supplierId).reduce((sum, p) => sum + Math.max(0, p.amount), 0);
  return Math.max(0, credits + paid - invoiceTotal);
}

export function validateSupplierPayment(payment: SupplierPayment): string[] {
  const errors: string[] = [];
  if (!payment.supplierId) errors.push("المورد إجباري");
  if (!Number.isFinite(payment.amount) || payment.amount <= 0) errors.push("مبلغ الأداء خاصو يكون أكبر من صفر");
  if (!payment.date) errors.push("تاريخ الأداء إجباري");
  if (payment.method === "cheque" && !payment.reference?.trim()) errors.push("مرجع الشيك إجباري");
  return errors;
}
