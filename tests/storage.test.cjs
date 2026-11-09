const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

const KEY='hamza_app_data_v03';

function setup(initial = {}, readError = false) {
  const map = new Map(Object.entries(initial));
  const writes = [];
  let failedKey = null;
  let failAllWrites = false;
  const storage = {
    getItem: async key => {
      if (readError) throw new Error('read failed');
      return map.has(key) ? map.get(key) : null;
    },
    setItem: async (key, value) => {
      if (failAllWrites || key === failedKey) throw new Error('write failed');
      writes.push({key,value});
      map.set(key,value);
    },
    removeItem: async key => map.delete(key),
  };
  const exports = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../.test-build/storage.js'),'utf8'), {
    exports, require: () => ({default: storage}),
  });
  return {
    api: exports, map, writes,
    failWrites: () => {failAllWrites = true;},
    failOnKey: value => {failedKey = value;},
  };
}

const pointer = source => JSON.parse(source.map.get(KEY));

for (const [label, raw] of [
  ['broken JSON','{'],
  ['array','[]'],
  ['null','null'],
  ['empty string',''],
  ['newer schema','{"schemaVersion":2,"products":[{"id":1}]}'],
  ['invalid chunk pointer','{"__hamzaStorage":"chunks-v1","slot":"missing"}'],
]) {
  test('never replaces unreadable original data: '+label, async()=>{
    const source=setup({[KEY]:raw});
    await assert.rejects(source.api.readAppData({products:[]}));
    await assert.rejects(source.api.writeAppData({products:[]}));
    assert.equal(source.map.get(KEY),raw);
    assert.equal(source.writes.length,0);
  });
}

test('read failure blocks startup writes before any storage key changes',async()=>{
  const source=setup({},true);
  await assert.rejects(source.api.readAppData({}));
  await assert.rejects(source.api.writeAppData({}));
  assert.equal(source.writes.length,0);
});

test('first launch saves in chunked, pointer-committed storage and reads after restart',async()=>{
  const source=setup();
  const fallback={products:[]};
  assert.deepEqual(source.api.readAppData ? await source.api.readAppData(fallback):null,fallback);
  await source.api.writeAppData({products:[{id:1,name:'Camera'}]});
  const manifest=pointer(source);
  assert.equal(manifest.__hamzaStorage,'chunks-v1');
  assert.ok(manifest.slot==='a'||manifest.slot==='b');
  assert.equal(manifest.count,1);
  const recovered=await source.api.readAppData({});
  assert.equal(recovered.products[0].name,'Camera');
});

test('legacy v0.3 data stays untouched until a validated chunked save commits',async()=>{
  const old='{"products":[{"id":2}]}';
  const source=setup({[KEY]:old});
  const data=await source.api.readAppData({});
  assert.equal(data.products[0].id,2);
  assert.equal(data.schemaVersion,1);
  assert.equal(source.map.get(KEY),old);
  await source.api.writeAppData(data);
  assert.equal(pointer(source).__hamzaStorage,'chunks-v1');
  assert.equal((await source.api.readAppData({})).products[0].id,2);
});

test('large snapshots are segmented and round-trip without Unicode corruption',async()=>{
  const source=setup();
  await source.api.readAppData({});
  const payload='🇲🇦الدار البيضاء🔐'.repeat(23000);
  await source.api.writeAppData({note:payload,products:[{id:5}]});
  const manifest=pointer(source);
  assert.ok(manifest.count>1);
  for(let i=0;i<manifest.count;i++)assert.ok(source.map.get(KEY+':chunks:'+manifest.slot+':'+i).length<=source.api.HAMZA_CHUNK_SIZE);
  assert.equal((await source.api.readAppData({})).note,payload);
});

test('a failed staged chunk write never changes the active snapshot',async()=>{
  const source=setup();
  await source.api.readAppData({});
  await source.api.writeAppData({products:[{id:1}]});
  const original=source.map.get(KEY);
  const target=pointer(source).slot==='a'?'b':'a';
  source.failOnKey(KEY+':chunks:'+target+':1');
  await assert.rejects(source.api.writeAppData({products:[{id:2}],memo:'x'.repeat(220000)}));
  assert.equal(source.map.get(KEY),original);
  assert.equal((await source.api.readAppData({})).products[0].id,1);
});

test('failed root-pointer commit preserves previous data and a retry can recover',async()=>{
  const source=setup();
  await source.api.readAppData({});
  await source.api.writeAppData({products:[{id:1}]});
  const previous=source.map.get(KEY);
  source.failOnKey(KEY);
  await assert.rejects(source.api.writeAppData({products:[{id:2}]}));
  assert.equal(source.map.get(KEY),previous);
  assert.equal((await source.api.readAppData({})).products[0].id,1);
  source.failOnKey(null);
  await source.api.writeAppData({products:[{id:3}]});
  assert.equal((await source.api.readAppData({})).products[0].id,3);
});

test('missing or tampered chunks block later startup writes',async()=>{
  const source=setup();
  await source.api.readAppData({});
  await source.api.writeAppData({products:[{id:1}]});
  const p=pointer(source), key=KEY+':chunks:'+p.slot+':0';
  source.map.set(key,source.map.get(key)+'TAMPER');
  await assert.rejects(source.api.readAppData({}));
  await assert.rejects(source.api.writeAppData({products:[]}));
  assert.equal(pointer(source).__hamzaStorage,'chunks-v1');
});

test('snapshot size guard refuses unbounded inline photos and leaves existing data intact',async()=>{
  const source=setup();
  await source.api.readAppData({});
  await source.api.writeAppData({products:[{id:1}]});
  const before=source.map.get(KEY);
  await assert.rejects(source.api.writeAppData({image:'A'.repeat(source.api.HAMZA_MAX_SNAPSHOT_CHARS+1)}),/كبير/);
  assert.equal(source.map.get(KEY),before);
  assert.equal((await source.api.readAppData({})).products[0].id,1);
});

test('writes are serialized, and the most recent successful write wins',async()=>{
  const source=setup();
  await source.api.readAppData({});
  await Promise.all([
    source.api.writeAppData({products:[{id:1}]}),
    source.api.writeAppData({products:[{id:2}]}),
    source.api.writeAppData({products:[{id:3}]}),
  ]);
  assert.equal((await source.api.readAppData({})).products[0].id,3);
});

test('only a successfully committed valid backup unlocks the data store',async()=>{
  const source=setup({[KEY]:'{'});
  await assert.rejects(source.api.readAppData({}));
  await assert.rejects(source.api.restoreBackup('{"app":"Other"}'));
  await assert.rejects(source.api.writeAppData({}));
  const backup=await source.api.createBackup({products:[{id:9}]});
  await source.api.restoreBackup(backup);
  await source.api.writeAppData({products:[{id:10}]});
  assert.equal((await source.api.readAppData({})).products[0].id,10);
});

test('failed backup restore remains blocked and never overwrites corrupted original',async()=>{
  const source=setup({[KEY]:'{'});
  await assert.rejects(source.api.readAppData({}));
  source.failWrites();
  await assert.rejects(source.api.restoreBackup(await source.api.createBackup({products:[]})));
  await assert.rejects(source.api.writeAppData({}));
  assert.equal(source.map.get(KEY),'{');
});
