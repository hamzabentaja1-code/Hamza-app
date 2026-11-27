import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import {adaptHistoricalSnapshot} from './domain/historical-snapshot';

export const HAMZA_STORAGE_KEY = 'hamza_app_data_v03';
export const HAMZA_SNAPSHOT_KEY = 'hamza_app_snapshot_v2';
export const HAMZA_SCHEMA_VERSION = 1;
export const MAX_BACKUP_BYTES = 64 * 1024 * 1024;
const LEGACY_CHUNK_CHARS = 180_000;
const LEGACY_MAX_CHARS = 2_000_000;
const invalidData = 'ملف البيانات المحلي تالف ولا يمكن قراءته.';
const wrongSchema = 'نسخة البيانات غير مدعومة. احتافظ بنسخة احتياطية قبل التحديث.';
const invalidBackup = 'النسخة الاحتياطية لا تخص إصدار HamZa المدعوم.';
const oversized = 'حجم بيانات HamZa تجاوز الحد المسموح.';

export interface HamzaBackup {
  schemaVersion: number;
  exportedAt: string;
  app: 'HamZa';
  data: Record<string, unknown>;
}
type Slot = 'a' | 'b';

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const own = (value:object,key:string) => Object.prototype.hasOwnProperty.call(value,key);
const slotValid = (slot:unknown):slot is Slot => slot === 'a' || slot === 'b';
const bounded = (value:unknown,max:number):value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= max;
const checksumValid = (value:unknown):value is string => typeof value === 'string' && /^[0-9a-f]{8}$/.test(value);

/** Historical chunks-v1 uses FNV-1a over UTF-16 code units. This is corruption checking, not authentication. */
function checksum(value:string):string {
  let hash = 2166136261;
  for (let i=0;i<value.length;i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619) >>> 0;
  return hash.toString(16).padStart(8,'0');
}

function utf8Bytes(value:string):number {
  let bytes=0;
  for(let i=0;i<value.length;i++){
    const code=value.charCodeAt(i);
    if(code<0x80)bytes++;
    else if(code<0x800)bytes+=2;
    else if(code>=0xd800&&code<=0xdbff&&i+1<value.length&&value.charCodeAt(i+1)>=0xdc00&&value.charCodeAt(i+1)<=0xdfff){bytes+=4;i++;}
    else bytes+=3;
  }
  return bytes;
}

const businessArrays=['products','customers','suppliers','sales','purchases','quotes','documents','expenses','payments','stockMovements','inventoryMovements','warehouses','projects','salesReturns','supplierPayments','taskAttachmentFiles'] as const;
function assertBusinessShape(data:Record<string,unknown>,error:string,requireRecords:boolean){
  if(own(data,'__hamzaStorage') || (data.schemaVersion!==undefined&&data.schemaVersion!==HAMZA_SCHEMA_VERSION))throw new Error(error);
  const hasBusinessArrays=businessArrays.some(key=>Array.isArray(data[key]));
  if(requireRecords&&!hasBusinessArrays)throw new Error(error);
  for(const key of businessArrays){
    if(data[key]!==undefined&&(!Array.isArray(data[key])||!(data[key] as unknown[]).every(record)))throw new Error(error);
  }
}

function decodedLocal(raw:string):Record<string,unknown>{
  const data:unknown=JSON.parse(raw);
  if(!record(data))throw new Error(invalidData);
  if(data.schemaVersion!==undefined && data.schemaVersion!==HAMZA_SCHEMA_VERSION)throw new Error(wrongSchema);
  assertBusinessShape(data,invalidData,true);
  return {...data,schemaVersion:HAMZA_SCHEMA_VERSION};
}

async function readLegacy(root:string):Promise<Record<string,unknown>>{
  const manifest:unknown=JSON.parse(root);
  if(!record(manifest))throw new Error(invalidData);
  if(!own(manifest,'__hamzaStorage'))return decodedLocal(root);
  const {__hamzaStorage,slot,count,length,checksum:hash}=manifest;
  if(__hamzaStorage!=='chunks-v1'||!slotValid(slot)||!bounded(count,Math.ceil(LEGACY_MAX_CHARS/LEGACY_CHUNK_CHARS))||
     !bounded(length,LEGACY_MAX_CHARS)||Math.ceil(length/LEGACY_CHUNK_CHARS)!==count||!checksumValid(hash))throw new Error(invalidData);
  const fragments=[];
  for(let index=0;index<count;index++){
    const body=await AsyncStorage.getItem(HAMZA_STORAGE_KEY+':chunks:'+slot+':'+index);
    const expected=Math.min(LEGACY_CHUNK_CHARS,length-index*LEGACY_CHUNK_CHARS);
    if(body===null||body.length!==expected)throw new Error(invalidData);
    fragments.push(body);
  }
  const snapshot=fragments.join('');
  if(checksum(snapshot)!==hash)throw new Error(invalidData);
  return decodedLocal(snapshot);
}

type FilePointer = {format:'file-v2';slot:Slot;size:number;checksum:string};
function filePointer(raw:string):FilePointer {
  const value:unknown=JSON.parse(raw);
  if(!record(value)||value.format!=='file-v2'||!slotValid(value.slot)||!bounded(value.size,MAX_BACKUP_BYTES)||!checksumValid(value.checksum))throw new Error(invalidData);
  return {format:'file-v2',slot:value.slot,size:value.size,checksum:value.checksum};
}
function snapshotUri(slot:Slot):string{
  if(!FileSystem.documentDirectory)throw new Error(invalidData);
  return FileSystem.documentDirectory+'hamza-snapshot-v2-'+slot+'.json';
}
async function readVerified(pointer:FilePointer):Promise<string>{
  const uri=snapshotUri(pointer.slot);
  const info=await FileSystem.getInfoAsync(uri);
  if(!info.exists||info.isDirectory||info.size!==pointer.size)throw new Error(invalidData);
  const value=await FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.UTF8});
  if(utf8Bytes(value)!==pointer.size||checksum(value)!==pointer.checksum)throw new Error(invalidData);
  return value;
}
let writesBlocked=false;
let lastRead:Record<string,unknown>={};
let queue:Promise<unknown>=Promise.resolve();
function queued<T>(operation:()=>Promise<T>):Promise<T>{
  const next=queue.catch(()=>undefined).then(operation);
  queue=next;
  return next;
}

async function readOriginal():Promise<Record<string,unknown>|null>{
  const pointer=await AsyncStorage.getItem(HAMZA_SNAPSHOT_KEY);
  if(pointer!==null)return decodedLocal(await readVerified(filePointer(pointer)));
  const legacy=await AsyncStorage.getItem(HAMZA_STORAGE_KEY);
  return legacy===null?null:readLegacy(legacy);
}

export function readAppData<T extends Record<string,unknown>>(fallback:T):Promise<T>{
  return queued(async()=>{
    try{
      const original=await readOriginal();
      lastRead=original===null?{}:adaptHistoricalSnapshot(original);
      writesBlocked=false;
      return original===null?fallback:lastRead as T;
    }catch(error){
      writesBlocked=true;
      if(error instanceof SyntaxError)throw new Error(invalidData);
      throw error;
    }
  });
}

/** Export a structurally verified original even when its financial migration requires review. */
export function exportOriginalBackup():Promise<string>{
  return queued(async()=>{
    const original=await readOriginal();
    if(original===null)throw new Error(invalidData);
    return encodeBackup(original);
  });
}

async function persist(data:Record<string,unknown>,restoring:boolean):Promise<void>{
  if(writesBlocked&&!restoring)throw new Error('توقف الحفظ لحماية البيانات الأصلية. أعد فتح التطبيق أو استرجع نسخة احتياطية صالحة.');
  const merged={...(restoring?{}:lastRead),...data,schemaVersion:HAMZA_SCHEMA_VERSION};
  assertBusinessShape(merged,invalidData,true);
  const snapshot=JSON.stringify(merged);
  const size=utf8Bytes(snapshot);
  if(size>MAX_BACKUP_BYTES)throw new Error(oversized);
  const current=await AsyncStorage.getItem(HAMZA_SNAPSHOT_KEY);
  let active:Slot|undefined;
  if(current!==null){
    try {active=filePointer(current).slot;}
    catch(error){if(!restoring){writesBlocked=true;throw error;} }
  }
  const slot=active==='a'?'b':'a';
  const pointer:FilePointer={format:'file-v2',slot,size,checksum:checksum(snapshot)};
  // An interrupted write never touches the current slot or the original historical storage.
  await FileSystem.writeAsStringAsync(snapshotUri(slot),snapshot,{encoding:FileSystem.EncodingType.UTF8});
  if(await readVerified(pointer)!==snapshot)throw new Error(invalidData);
  await AsyncStorage.setItem(HAMZA_SNAPSHOT_KEY,JSON.stringify(pointer));
  lastRead=merged;
  writesBlocked=false;
}

export function writeAppData(data:Record<string,unknown>):Promise<void>{
  return queued(()=>persist(data,false));
}

function encodeBackup(data:Record<string,unknown>):string{
  const json=JSON.stringify({schemaVersion:HAMZA_SCHEMA_VERSION,exportedAt:new Date().toISOString(),app:'HamZa',data},null,2);
  if(utf8Bytes(json)>MAX_BACKUP_BYTES)throw new Error(oversized);
  return json;
}

export async function createBackup(data:Record<string,unknown>):Promise<string>{
  if(writesBlocked)throw new Error(invalidData);
  return encodeBackup({...lastRead,...data});
}

export function decodeHamzaBackup(json:string):Record<string,unknown>{
  if(json.length>MAX_BACKUP_BYTES||utf8Bytes(json)>MAX_BACKUP_BYTES)throw new Error(oversized);
  let envelope:unknown;
  try {envelope=JSON.parse(json);} catch {throw new Error(invalidBackup);}
  if(!record(envelope)||envelope.app!=='HamZa'||envelope.schemaVersion!==HAMZA_SCHEMA_VERSION||!record(envelope.data))throw new Error(invalidBackup);
  assertBusinessShape(envelope.data,invalidBackup,true);
  return envelope.data;
}

export async function restoreAppData(data:Record<string,unknown>):Promise<Record<string,unknown>>{
  assertBusinessShape(data,invalidBackup,true);
  const adapted=adaptHistoricalSnapshot(data);
  await queued(()=>persist(adapted,true));
  return adapted;
}

export function restoreBackup(json:string):Promise<Record<string,unknown>>{
  return Promise.resolve().then(()=>restoreAppData(decodeHamzaBackup(json)));
}
