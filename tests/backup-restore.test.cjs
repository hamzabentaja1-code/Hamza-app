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

test('backup restore restores every field included in exported backup data', () => {
  const fields = [
    'products','customers','sales','salesReturns','purchases','purchaseOrders',
    'supplierPayments','supplierReturns','cashMovements','expenses','suppliers',
    'quotes','payments','documents','inventoryMovements','warehouses',
    'activeWarehouseId','bankAccounts','bankMovements','bankReconciliations',
    'cheques','chequeEvents','productVariants','variantStockMovements',
    'activeBankAccountId','projects','workTasks','technicians','equipment',
    'workOrders','workTimeEntries','recurringExpenseRules','activityLog',
    'expenseCategories','productCategories','productBrands','language',
    'companyProfile','users','activeUserId','parkedPosCarts','contactInteractions',
    'priceGroups','supplierPriceRules','reportLayout','notificationsEnabled',
  ];
  for (const field of fields) {
    assert.ok(exportHandler.includes(field), 'backup must export '+field);
    assert.ok(importHandler.includes('d.'+field), 'backup restore must read '+field);
  }
  for (const setter of [
    'setPriceGroups(','setSupplierPriceRules(','setNotificationsEnabled(',
    'setContactInteractions(','setRecurringExpenseRules(',
  ]) {
    assert.ok(importHandler.includes(setter), 'backup restore must apply '+setter);
  }
});
test('backup restore validates and normalizes restored pricing settings', () => {
  assert.ok(importHandler.includes('validateContactPriceGroups('));
  assert.ok(importHandler.includes('normalizeSupplierPriceRules('));
  assert.ok(importHandler.includes('d.notificationsEnabled===true'));
});
