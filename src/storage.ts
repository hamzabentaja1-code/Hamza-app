import AsyncStorage from '@react-native-async-storage/async-storage';

export const HAMZA_STORAGE_KEY = 'hamza_app_data_v03';
export const HAMZA_SCHEMA_VERSION = 1;

export interface HamzaBackup {
  schemaVersion: number;
  exportedAt: string;
  app: 'HamZa';
  data: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let writesBlocked = false;

export async function readAppData<T extends Record<string, unknown>>(fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(HAMZA_STORAGE_KEY);
    if (raw === null) { writesBlocked = false; return fallback; }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) throw new Error('ملف البيانات المحلي تالف ولا يمكن قراءته.');
    // Migrate the original v0.3 local store without discarding user data.
    if (parsed.schemaVersion === undefined) {
      const migrated = { ...parsed, schemaVersion: HAMZA_SCHEMA_VERSION };
      await AsyncStorage.setItem(HAMZA_STORAGE_KEY, JSON.stringify(migrated));
      writesBlocked = false;
      return migrated as unknown as T;
    }
    if (parsed.schemaVersion !== HAMZA_SCHEMA_VERSION) {
      throw new Error('نسخة البيانات غير مدعومة. احتافظ بنسخة احتياطية قبل التحديث.');
    }
    writesBlocked = false;
    return parsed as T;
  } catch (error) {
    writesBlocked = true;
    if (error instanceof SyntaxError) throw new Error('ملف البيانات المحلي تالف ولا يمكن قراءته.');
    throw error;
  }
}

let writeQueue: Promise<void> = Promise.resolve();

export async function writeAppData(data: Record<string, unknown>): Promise<void> {
  if (writesBlocked) throw new Error('توقف الحفظ لحماية البيانات الأصلية. أعد فتح التطبيق أو استرجع نسخة احتياطية صالحة.');
  await enqueueWrite(data);
}

async function enqueueWrite(data: Record<string, unknown>): Promise<void> {
  const snapshot = JSON.stringify({ ...data, schemaVersion: HAMZA_SCHEMA_VERSION });
  const nextWrite = writeQueue.catch(() => undefined).then(() =>
    AsyncStorage.setItem(HAMZA_STORAGE_KEY, snapshot),
  );
  writeQueue = nextWrite;
  await nextWrite;
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
  await enqueueWrite(parsed.data);
  writesBlocked = false;
  return parsed.data;
}
