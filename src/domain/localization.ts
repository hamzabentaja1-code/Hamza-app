export type AppLanguage = 'AR' | 'FR';
export type TranslationDictionary = Record<string, string>;

/** Translates complete labels first, then the longest known fragments in dynamic text. */
export function translateWithDictionary(
  value: string | undefined,
  language: AppLanguage,
  dictionary: TranslationDictionary,
): string | undefined {
  if (value === undefined || language === 'AR') return value;
  if (dictionary[value] !== undefined) return dictionary[value];
  let result = value;
  for (const [source, translated] of Object.entries(dictionary).sort((a, b) => b[0].length - a[0].length)) {
    result = result.split(source).join(translated);
  }
  return result;
}
