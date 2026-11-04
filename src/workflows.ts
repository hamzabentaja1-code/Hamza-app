/**
 * Transaction-safe workflow helpers for HamZa.
 * These pure functions keep document status, stock and cash rules consistent.
 */
import { DocumentLine, DocumentTotals, calculateDocumentTotals, validateStockIssue } from './domain';

export type SalesDocumentKind =
  | 'quote' | 'customer_order' | 'delivery_note' | 'sales_invoice'
  | 'proforma' | 'customer_credit_note';
export type DocumentStatus = 'draft' | 'confirmed' | 'partially_paid' | 'paid' | 'cancelled';

export interface SalesDocument {
  id: string;
  kind: SalesDocumentKind;
  status: DocumentStatus;
  customerId: string;
  lines: DocumentLine[];
  totals: DocumentTotals;
  createdAt: string;
  updatedAt: string;
  sourceDocumentId?: string;
}
export interface InventoryItem { productId: string; warehouseId: string; quantity: number; }
export interface WorkflowResult {
  document: SalesDocument;
  stockChanges: InventoryItem[];
}

const transitions: Record<DocumentStatus, DocumentStatus[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['partially_paid', 'paid', 'cancelled'],
  partially_paid: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
};

export function transitionDocument(doc: SalesDocument, next: DocumentStatus, now = new Date().toISOString()): SalesDocument {
  if (!transitions[doc.status].includes(next)) {
    throw new Error(`لا يمكن تغيير حالة الوثيقة من ${doc.status} إلى ${next}`);
  }
  return { ...doc, status: next, updatedAt: now };
}

export function createSalesDocument(input: {
  id: string; kind: SalesDocumentKind; customerId: string; lines: DocumentLine[];
  now?: string; sourceDocumentId?: string;
}): SalesDocument {
  if (!input.customerId.trim()) throw new Error('خاص اختيار الزبون');
  if (!input.lines.length) throw new Error('خاص تزيد سطر واحد على الأقل');
  const now = input.now ?? new Date().toISOString();
  return {
    id: input.id, kind: input.kind, customerId: input.customerId,
    lines: input.lines, totals: calculateDocumentTotals(input.lines),
    status: 'draft', createdAt: now, updatedAt: now,
    sourceDocumentId: input.sourceDocumentId,
  };
}

/** A delivery note posts stock once; invoices derived from it must not post the same stock again. */
export function stockDeltaForDocument(
  doc: SalesDocument,
  warehouseId: string,
  alreadyPostedSourceIds: string[],
): InventoryItem[] {
  if (doc.status !== 'confirmed') return [];
  if (doc.kind !== 'delivery_note' && doc.kind !== 'sales_invoice' &&
      doc.kind !== 'customer_credit_note') return [];
  if (alreadyPostedSourceIds.includes(doc.id)) return [];
  if (doc.sourceDocumentId && alreadyPostedSourceIds.includes(doc.sourceDocumentId)) return [];
  const sign = doc.kind === 'customer_credit_note' ? 1 : -1;
  return doc.lines.filter(line => line.productId).map(line => ({
    productId: line.productId as string,
    warehouseId,
    quantity: sign * line.quantity,
  }));
}

export function ensureStockAvailable(items: InventoryItem[], changes: InventoryItem[]): void {
  for (const change of changes) {
    const current = items.find(item =>
      item.productId === change.productId && item.warehouseId === change.warehouseId,
    )?.quantity ?? 0;
    if (change.quantity < 0) validateStockIssue(current, Math.abs(change.quantity));
  }
}

export interface CashEntry {
  id: string;
  direction: 'in' | 'out';
  amount: number; // integer centimes
  reason: string;
  createdAt: string;
}
export function cashBalance(openingBalance: number, entries: CashEntry[]): number {
  if (!Number.isSafeInteger(openingBalance)) throw new Error('الرصيد الافتتاحي غير صالح');
  return entries.reduce((balance, entry) => {
    if (!Number.isSafeInteger(entry.amount) || entry.amount <= 0) throw new Error('مبلغ الحركة غير صالح');
    return balance + (entry.direction === 'in' ? entry.amount : -entry.amount);
  }, openingBalance);
}
