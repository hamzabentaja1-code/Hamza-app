import AsyncStorage from '@react-native-async-storage/async-storage';

export const HAMZA_STORAGE_KEY = 'hamza_app_data_v03';
export const HAMZA_SCHEMA_VERSION = 1;

/** Keep each SQLite value well below Android's per-item read window. */
export const HAMZA_CHUNK_SIZE = 180_000;
/** Keep two staged copies below Android's usual 6 MB total SQLite limit. */
export const HAMZA_MAX_SNAPSHOT_CHARS = 2_000_000;

export interface HamzaBackup {
  schemaVersion: number;
  exportedAt: string;
  app: 'HamZa';
  data: Record<string, unknown>;
}

type StorageSlot = 'a' | 'b';
type ChunkPointer = {
  __hamzaStorage: 'chunks-v1';
  slot: StorageSlot;
  count: number;
  length: number;
  checksum: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const chunkKey = (slot: StorageSlot, index: number): string =>
  HAMZA_STORAGE_KEY + ':chunks:' + slot + ':' + index;
const metaKey = (slot: StorageSlot): string => HAMZA_STORAGE_KEY + ':meta:' + slot;

/** A non-cryptographic corruption check over UTF-16 units, not a security signature. */
const checksum = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

const pointerFrom = (value: unknown): ChunkPointer | null => {
  if (!isRecord(value) || value.__hamzaStorage !== 'chunks-v1') return null;
  if ((value.slot !== 'a' && value.slot !== 'b') ||
    !Number.isInteger(value.count) || (value.count as number) < 1 ||
    (value.count as number) > Math.ceil(HAMZA_MAX_SNAPSHOT_CHARS / HAMZA_CHUNK_SIZE) ||
    !Number.isInteger(value.length) || (value.length as number) < 1 ||
    (value.length as number) > HAMZA_MAX_SNAPSHOT_CHARS ||
    typeof value.checksum !== 'string' || !/^[0-9a-f]{8}$/.test(value.checksum)) {
    throw new Error('ملف البيانات المحلي تالف ولا يمكن قراءته.');
  }
  return value as ChunkPointer;
};

const parseAppSnapshot = (raw: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) throw new Error('ملف البيانات المحلي تالف ولا يمكن قراءته.');
  if (parsed.schemaVersion === undefined) return {...parsed, schemaVersion: HAMZA_SCHEMA_VERSION};
  if (parsed.schemaVersion !== HAMZA_SCHEMA_VERSION) {
    throw new Error('نسخة البيانات غير مدعومة. احتافظ بنسخة احتياطية قبل التحديث.');
  }
  return parsed;
};

async function loadChunked(pointer: ChunkPointer): Promise<string> {
  const fragments: string[] = [];
  for (let i = 0; i < pointer.count; i++) {
    const part = await AsyncStorage.getItem(chunkKey(pointer.slot, i));
    if (part === null) throw new Error('بعض أجزاء البيانات المحفوظة مفقودة. لا تمسح بيانات التطبيق.');
    fragments.push(part);
  }
  const snapshot = fragments.join('');
  if (snapshot.length !== pointer.length || checksum(snapshot) !== pointer.checksum) {
    throw new Error('بيانات التطبيق غير متطابقة. استرجع نسخة احتياطية صالحة.');
  }
  return snapshot;
}

// Fail closed: never let a corrupt, unreadable or future-version store
// be replaced by the empty startup state.
let writesBlocked = false;

export async function readAppData<T extends Record<string, unknown>>(fallback: T): Promise<T> {
  try {
    const root = await AsyncStorage.getItem(HAMZA_STORAGE_KEY);
    if (root === null) { writesBlocked = false; return fallback; }
    const decoded: unknown = JSON.parse(root);
    const pointer = pointerFrom(decoded);
    if (isRecord(decoded) && decoded.__hamzaStorage !== undefined && !pointer) {
      throw new Error('ملف البيانات المحلي تالف ولا يمكن قراءته.');
    }
    const loaded = parseAppSnapshot(pointer ? await loadChunked(pointer) : root);
    writesBlocked = false;
    return loaded as T;
  } catch (error) {
    writesBlocked = true;
    if (error instanceof SyntaxError) throw new Error('ملف البيانات المحلي تالف ولا يمكن قراءته.');
    throw error;
  }
}

let writeQueue: Promise<void> = Promise.resolve();

async function persistSnapshot(data: Record<string, unknown>): Promise<void> {
  const snapshot = JSON.stringify({...data, schemaVersion: HAMZA_SCHEMA_VERSION});
  if (snapshot.length > HAMZA_MAX_SNAPSHOT_CHARS) {
    throw new Error('حجم بيانات HamZa كبير بزاف للحفظ المحلي. نقص حجم الصور أو صدّر نسخة احتياطية.');
  }
  const root = await AsyncStorage.getItem(HAMZA_STORAGE_KEY);
  let active: ChunkPointer | null = null;
  if (root !== null) {
    try { active = pointerFrom(JSON.parse(root)); }
    catch { /* Explicit backup restore can replace unreadable legacy data. */ }
  }
  const target: StorageSlot = active?.slot === 'a' ? 'b' : 'a';
  const chunks: string[] = [];
  for (let i = 0; i < snapshot.length; i += HAMZA_CHUNK_SIZE) {
    chunks.push(snapshot.slice(i, i + HAMZA_CHUNK_SIZE));
  }
  const previousCountRaw = await AsyncStorage.getItem(metaKey(target));
  const previousCount = Number(previousCountRaw);
  if (Number.isSafeInteger(previousCount) && previousCount > 0 &&
      previousCount <= Math.ceil(HAMZA_MAX_SNAPSHOT_CHARS / HAMZA_CHUNK_SIZE)) {
    for (let i = 0; i < previousCount; i++) await AsyncStorage.removeItem(chunkKey(target, i));
  }
  // Store the planned count before writing so an interrupted attempt can
  // clean up all of its partially staged chunks on the next retry.
  await AsyncStorage.setItem(metaKey(target), String(chunks.length));
  for (let i = 0; i < chunks.length; i++) await AsyncStorage.setItem(chunkKey(target, i), chunks[i]);
  const pointer: ChunkPointer = {
    __hamzaStorage: 'chunks-v1',
    slot: target,
    count: chunks.length,
    length: snapshot.length,
    checksum: checksum(snapshot),
  };
  if (await loadChunked(pointer) !== snapshot) throw new Error('تعذر التحقق من البيانات قبل حفظها.');
  // This small pointer is the commit point; until it succeeds the previous
  // complete snapshot remains the only visible data.
  await AsyncStorage.setItem(HAMZA_STORAGE_KEY, JSON.stringify(pointer));
  // Best effort cleanup only after the new snapshot has been committed.
  if (active) {
    try {
      for (let i = 0; i < active.count; i++) await AsyncStorage.removeItem(chunkKey(active.slot, i));
    } catch { /* Recovery is still possible from the committed new pointer. */ }
  }
}

async function enqueueWrite(data: Record<string, unknown>): Promise<void> {
  const nextWrite = writeQueue.catch(() => undefined).then(() => persistSnapshot(data));
  writeQueue = nextWrite;
  await nextWrite;
}

export async function writeAppData(data: Record<string, unknown>): Promise<void> {
  if (writesBlocked) throw new Error('توقف الحفظ لحماية البيانات الأصلية. أعد فتح التطبيق أو استرجع نسخة احتياطية صالحة.');
  await enqueueWrite(data);
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
  try { parsed = JSON.parse(json); }
  catch { throw new Error('ملف النسخة الاحتياطية غير صالح.'); }
  if (!isRecord(parsed) || parsed.app !== 'HamZa' ||
      parsed.schemaVersion !== HAMZA_SCHEMA_VERSION || !isRecord(parsed.data)) {
    throw new Error('النسخة الاحتياطية لا تخص إصدار HamZa المدعوم.');
  }
  await enqueueWrite(parsed.data);
  writesBlocked = false;
  return parsed.data;
}
