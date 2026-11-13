export type CreditTerms = { creditLimitCentimes?: number; paymentDelayDays?: number };

/** Blank credit limits mean unlimited credit; limits are stored in integer centimes. */
export function normalizeCreditTerms(limitText: string, delayText: string): CreditTerms {
  const limit = limitText.trim() === '' ? undefined : Number(limitText.trim().replace(',', '.'));
  const delay = delayText.trim() === '' ? undefined : Number(delayText.trim());
  if (limit !== undefined && (!Number.isFinite(limit) || limit < 0 || !Number.isSafeInteger(Math.round(limit * 100)))) {
    throw new Error('سقف الدين غير صالح');
  }
  if (delay !== undefined && (!Number.isInteger(delay) || delay < 0 || delay > 3650)) {
    throw new Error('أجل الأداء غير صالح');
  }
  return {
    ...(limit === undefined ? {} : { creditLimitCentimes: Math.round(limit * 100) }),
    ...(delay === undefined ? {} : { paymentDelayDays: delay }),
  };
}

export function canExtendCredit(
  terms: CreditTerms,
  currentOutstandingCentimes: number,
  proposedDebtCentimes: number,
): boolean {
  if (!Number.isSafeInteger(currentOutstandingCentimes) || currentOutstandingCentimes < 0 ||
      !Number.isSafeInteger(proposedDebtCentimes) || proposedDebtCentimes < 0) return false;
  if (terms.creditLimitCentimes === undefined) return true;
  if (!Number.isSafeInteger(terms.creditLimitCentimes) || terms.creditLimitCentimes < 0) return false;
  return currentOutstandingCentimes + proposedDebtCentimes <= terms.creditLimitCentimes;
}
