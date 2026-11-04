import { Money } from './domain';

export interface BusinessContact {
  id: string;
  kind: 'customer' | 'supplier';
  name: string;
  code?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  ice?: string;
  rc?: string;
  ifNumber?: string;
  openingBalance: Money;
  creditLimit?: Money;
  paymentDelayDays?: number;
  paymentTerms?: string;
  priceGroupId?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  contactId: string;
  date: string;
  description: string;
  debit: Money;
  credit: Money;
  sourceType: 'opening_balance' | 'invoice' | 'credit_note' | 'payment' | 'adjustment';
  sourceId?: string;
}

export function contactBalance(contact: BusinessContact, entries: LedgerEntry[]): Money {
  if (!Number.isSafeInteger(contact.openingBalance)) throw new Error('الرصيد الافتتاحي غير صالح');
  return entries
    .filter(entry => entry.contactId === contact.id)
    .reduce((balance, entry) => {
      if (!Number.isSafeInteger(entry.debit) || !Number.isSafeInteger(entry.credit) ||
          entry.debit < 0 || entry.credit < 0) {
        throw new Error('حركة الحساب غير صالحة');
      }
      return balance + entry.debit - entry.credit;
    }, contact.openingBalance);
}

export function validateContact(contact: BusinessContact): void {
  if (!contact.name.trim()) throw new Error('اسم الزبون أو المورد إجباري');
  if (contact.creditLimit !== undefined &&
      (!Number.isSafeInteger(contact.creditLimit) || contact.creditLimit < 0)) {
    throw new Error('سقف الدين غير صالح');
  }
  if (contact.paymentDelayDays !== undefined &&
      (!Number.isInteger(contact.paymentDelayDays) || contact.paymentDelayDays < 0)) {
    throw new Error('أجل الأداء غير صالح');
  }
  for (const value of [contact.ice, contact.rc, contact.ifNumber]) {
    if (value && value.length > 40) throw new Error('رقم التعريف أطول من المسموح');
  }
}
