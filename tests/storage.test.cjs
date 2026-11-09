const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup(raw, readError = false) {
  const writes = [];
  let failWrite = false;
  const storage = {
    getItem: async () => { if (readError) throw new Error('read failed'); return raw; },
    setItem: async (_, value) => { if (failWrite) throw new Error('write failed'); writes.push(value); raw = value; },
  };
  const exports = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../.test-build/storage.js'), 'utf8'), {
    exports, require: () => ({default: storage}),
  });
  return {api: exports, writes, failWrites: () => {failWrite = true;}};
}
for (const [label, raw] of [['broken JSON', '{'], ['array', '[]'], ['null', 'null'], ['empty string', ''], ['newer schema', '{"schemaVersion":2,"products":[{"id":1}]}']]) {
  test(`preserves original storage after reading ${label}`, async () => {
    const {api, writes} = setup(raw);
    await assert.rejects(api.readAppData({products: []}));
    await assert.rejects(api.writeAppData({products: []}));
    assert.equal(writes.length, 0);
  });
}
test('read failures also prevent empty startup data from being saved', async () => {
  const {api, writes} = setup(null, true);
  await assert.rejects(api.readAppData({}));
  await assert.rejects(api.writeAppData({}));
  assert.equal(writes.length, 0);
});
test('first launch can save and legacy migration preserves records', async () => {
  const fresh = setup(null);
  await fresh.api.readAppData({products: []});
  await fresh.api.writeAppData({products: [{id: 1}]});
  assert.equal(JSON.parse(fresh.writes[0]).products[0].id, 1);
  const legacy = setup('{"products":[{"id":2}]}');
  const data = await legacy.api.readAppData({});
  assert.equal(data.products[0].id, 2);
  assert.equal(JSON.parse(legacy.writes[0]).schemaVersion, 1);
});
test('only a successfully saved valid backup re-enables writes after a read failure', async () => {
  const {api, writes} = setup('{');
  await assert.rejects(api.readAppData({}));
  await assert.rejects(api.restoreBackup('{"app":"Other"}'));
  await assert.rejects(api.writeAppData({}));
  const backup = await api.createBackup({products: [{id: 9}]});
  await api.restoreBackup(backup);
  await api.writeAppData({products: [{id: 10}]});
  assert.equal(JSON.parse(writes[0]).products[0].id, 9);
  assert.equal(JSON.parse(writes[1]).products[0].id, 10);
});
test('failed restore keeps the write protection active', async () => {
  const {api, writes, failWrites} = setup('{');
  await assert.rejects(api.readAppData({}));
  failWrites();
  await assert.rejects(api.restoreBackup(await api.createBackup({products: []})));
  await assert.rejects(api.writeAppData({}));
  assert.equal(writes.length, 0);
});
