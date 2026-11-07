const test = require('node:test');
const assert = require('node:assert/strict');
const {normalizeCompanyProfile, EMPTY_COMPANY_PROFILE} = require('../.test-build/company-profile.js');
test('company profile restores only supported string fields',()=>{
  assert.deepEqual(normalizeCompanyProfile({name:'HamZa',phone:'0600000000',ice:'123',ignored:4}),{...EMPTY_COMPANY_PROFILE,name:'HamZa',phone:'0600000000',ice:'123'});
});
test('invalid or legacy company profile data safely defaults to empty fields',()=>{
  assert.deepEqual(normalizeCompanyProfile(null),EMPTY_COMPANY_PROFILE);
  assert.deepEqual(normalizeCompanyProfile({name:42,address:null}),EMPTY_COMPANY_PROFILE);
});
