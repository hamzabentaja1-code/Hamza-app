import {Platform} from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import {AppLanguage} from './i18n';
import {buildSpeechRecognitionIntent, firstSpeechTranscript} from './domain/voice-recognition';
export async function recognizeSpeech(language: AppLanguage, prompt: string): Promise<string | null> {
  if (Platform.OS !== 'android') throw new Error('خدمة التعرف الصوتي غير متاحة على هذا الجهاز');
  const intent = buildSpeechRecognitionIntent(language, prompt);
  const result = await IntentLauncher.startActivityAsync(intent.action, {extra: intent.extras});
  if (result.resultCode !== -1) return null;
  return firstSpeechTranscript(result.extra);
}
