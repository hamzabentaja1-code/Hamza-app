import AsyncStorage from '@react-native-async-storage/async-storage';

export const HAMZA_STORAGE_KEY = 'hamza_app_data';
export const HAMZA_SCHEMA_VERSION = 1;

export interface HamzaBackup {
  schemaVersion: number;
  exportedAt: string;
  app: 'HamZa';
  data: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export async function readAppData<T extends Record<string, unknown>>(fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(HAMZA_STORAGE_KEY);
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return fallback;
    // Migrate the original v0.3 local store without discarding user data.
    if (parsed.schemaVersion === undefined) {
      const migrated = { ...parsed, schemaVersion: HAMZA_SCHEMA_VERSION };
      await AsyncStorage.setItem(HAMZA_STORAGE_KEY, JSON.stringify(migrated));
      return migrated as T;
    }
    if (parsed.schemaVersion !== HAMZA_SCHEMA_VERSION) {
      throw new Error('نسخة البيانات غير مدعومة. احتافظ بنسخة احتياطية قبل التحديث.');
    }
    return parsed as T;
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('ملف البيانات المحلي تالف ولا يمكن قراءته.');
    throw error;
  }
}

export async function writeAppData(data: Record<string, unknown>): Promise<void> {
  await AsyncStorage.setItem(
    HAMZA_STORAGE_KEY,
    JSON.stringify({ ...data, schemaVersion: HAMZA_SCHEMA_VERSION }),
  );
}

export async function createBackup(data: Record<string, unknown>): Promise<string> {
  const backup: HamzaBackup = {
    schemaVersion: HAMZA_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'HamZa',
    data,
  };
  return JSON.stringify(backup, null, 2);
}

export async function restoreBackup(json: string): Promise<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('ملف النسخة الاحتياطية غير صالح.');
  }
  if (!isRecord(parsed) || parsed.app !== 'HamZa' ||
      parsed.schemaVersion !== HAMZA_SCHEMA_VERSION || !isRecord(parsed.data)) {
    throw new Error('النسخة الاحتياطية لا تخص إصدار HamZa المدعوم.');
  }
  await writeAppData(parsed.data);
  return parsed.data;
}
