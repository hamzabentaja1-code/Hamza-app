export type UserAccessLanguage = 'AR' | 'FR';

const fr: Record<string, string> = {
  'تعذر إنشاء المستخدم': 'Impossible de créer l’utilisateur',
  'كاين مستخدم بنفس الاسم.': 'Un utilisateur portant ce nom existe déjà.',
  'راجع المعلومات.': 'Vérifiez les informations.',
  'حذف المستخدم؟': 'Supprimer l’utilisateur ?',
  'غادي يتحذف الحساب المحلي ديال ': 'Le compte local de ',
  ' فقط.': ' uniquement.',
  'إلغاء': 'Annuler',
  'حذف': 'Supprimer',
};

/** Translate user-management alerts without changing names or other user-entered values. */
export function translateUserAccessMessage(
  value: string | undefined,
  language: UserAccessLanguage,
): string | undefined {
  if (value === undefined || language === 'AR') return value;
  if (fr[value] !== undefined) return fr[value];
  let result = value;
  for (const [source, translated] of Object.entries(fr).sort((a, b) => b[0].length - a[0].length)) {
    result = result.split(source).join(translated);
  }
  return result;
}
