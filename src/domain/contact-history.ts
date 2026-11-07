export type ContactType = 'customer' | 'supplier';
export type ContactInteractionKind = 'call' | 'message' | 'meeting' | 'note';
export type ContactInteraction = {
  id: number;
  contactType: ContactType;
  contactId: number;
  contactName: string;
  kind: ContactInteractionKind;
  summary: string;
  createdAt: string;
};

export function createContactInteraction(
  input: Omit<ContactInteraction, 'id' | 'createdAt'>,
  id = Date.now(),
  createdAt = new Date().toISOString(),
): ContactInteraction {
  const contactName = input.contactName.trim();
  const summary = input.summary.trim();
  if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(input.contactId) || input.contactId <= 0 ||
      !contactName || contactName.length > 120 || summary.length < 2 || summary.length > 1000 ||
      !['customer','supplier'].includes(input.contactType) ||
      !['call','message','meeting','note'].includes(input.kind) ||
      !Number.isFinite(Date.parse(createdAt))) {
    throw new Error('معلومات سجل التواصل غير صالحة');
  }
  return {...input, id, contactName, summary, createdAt};
}

export function filterContactInteractions(
  entries: ContactInteraction[],
  contactType?: ContactType,
  contactId?: number,
): ContactInteraction[] {
  return entries
    .filter(entry => (contactType === undefined || entry.contactType === contactType) &&
      (contactId === undefined || entry.contactId === contactId))
    .slice()
    .sort((a,b) => b.createdAt.localeCompare(a.createdAt) || b.id-a.id);
}
