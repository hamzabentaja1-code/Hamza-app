const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '..', 'App.tsx'), 'utf8');
const exportStart = app.indexOf('const exportBackup=');
const importStart = app.indexOf('const importBackup=');
const importEnd = app.indexOf('const chooseCompanyLogo=');
assert.notEqual(exportStart, -1, 'backup export handler must exist');
assert.notEqual(importStart, -1, 'backup restore handler must exist');
assert.notEqual(importEnd, -1, 'backup restore handler must have a clear end');
const exportHandler = app.slice(exportStart, importStart);
const importHandler = app.slice(importStart, importEnd);

test('backup restore restores every exported user preference and pricing configuration', () => {
  for (const field of ['priceGroups', 'supplierPriceRules', 'notificationsEnabled']) {
    assert.ok(exportHandler.includes(field), 'backup must export '+field);
    assert.ok(importHandler.includes('d.'+field), 'backup restore must read '+field);
  }
  assert.ok(importHandler.includes('setPriceGroups('), 'price groups must be restored');
  assert.ok(importHandler.includes('setSupplierPriceRules('), 'supplier price rules must be restored');
  assert.ok(importHandler.includes('setNotificationsEnabled('), 'notification preference must be restored');
});

test('backup restore validates and normalizes restored pricing settings', () => {
  assert.ok(importHandler.includes('validateContactPriceGroups('));
  assert.ok(importHandler.includes('normalizeSupplierPriceRules('));
  assert.ok(importHandler.includes('d.notificationsEnabled===true'));
});
