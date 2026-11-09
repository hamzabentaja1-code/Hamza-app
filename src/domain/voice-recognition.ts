export type VoiceLanguage = 'AR' | 'FR';
export const SPEECH_RECOGNITION_ACTION = 'android.speech.action.RECOGNIZE_SPEECH';
export const SPEECH_RESULTS_EXTRA = 'android.speech.extra.RESULTS';
export function buildSpeechRecognitionIntent(language: VoiceLanguage, prompt: string) {
  return {action: SPEECH_RECOGNITION_ACTION, extras: {
    'android.speech.extra.LANGUAGE_MODEL': 'free_form',
    'android.speech.extra.LANGUAGE': language === 'AR' ? 'ar-MA' : 'fr-MA',
    'android.speech.extra.MAX_RESULTS': 3,
    'android.speech.extra.PROMPT': prompt,
  }};
}
export function firstSpeechTranscript(extra: unknown): string | null {
  if (!extra || typeof extra !== 'object') return null;
  const values = (extra as Record<string, unknown>)[SPEECH_RESULTS_EXTRA];
  if (!Array.isArray(values)) return null;
  for (const value of values) if (typeof value === 'string' && value.trim()) return value.trim().replace(/\s+/g, ' ');
  return null;
}
