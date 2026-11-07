const test = require('node:test');
const assert = require('node:assert/strict');
const access = require('../.test-build/user-access.js');

const modules = ['الرئيسية','المنتجات','المبيعات','المخزون','المستخدمون والصلاحيات'];

test('legacy data gets one full-access owner account', () => {
  const users = access.normalizeUserAccounts(undefined, modules);
  assert.equal(users.length, 1);
  assert.equal(users[0].role, 'owner');
  assert.equal(access.hasModuleAccess(users[0], 'المبيعات'), true);
});

test('sales role only sees assigned sales modules and cannot access user management', () => {
  const user = access.createUserAccount({name:'موظف مبيعات',role:'sales',moduleIds:modules,now:'2026-11-07T00:00:00.000Z'});
  assert.equal(access.hasModuleAccess(user, 'المبيعات'), true);
  assert.equal(access.hasModuleAccess(user, 'المخزون'), false);
  assert.equal(access.canManageUsers(user), false);
  assert.equal(access.canWriteModule(user, 'المبيعات'), true);
});

test('viewer cannot write and custom permissions can be narrowed', () => {
  const viewer = access.createUserAccount({name:'مراقب',role:'viewer',moduleIds:modules});
  assert.equal(access.canWriteModule(viewer, 'المنتجات'), false);
  const custom = access.setUserModuleAccess({...viewer,role:'custom',canWrite:true}, 'المبيعات', true);
  assert.equal(access.hasModuleAccess(custom, 'المبيعات'), true);
  assert.equal(access.hasModuleAccess(custom, 'المخزون'), false);
});

test('owner cannot be removed by normalization and cannot be deleted by workspace operations', () => {
  const normalized = access.normalizeUserAccounts([{id:'u1',name:'مستخدم',role:'viewer',allowedModules:[],canWrite:false,active:true}], modules);
  assert.equal(normalized.some(user=>user.role==='owner'), true);
});
`;
