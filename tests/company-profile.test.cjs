const test = require('node:test');
const assert = require('node:assert/strict');
const {normalizeCompanyProfile, EMPTY_COMPANY_PROFILE} = require('../.test-build/company-profile.js');
test('company profile restores only supported string fields',()=>{
  assert.deepEqual(normalizeCompanyProfile({name:'HamZa',phone:'0600000000',ice:'123',logoData:'data:image/png;base64,abc',paymentTerms:'15 days',documentNote:'Thanks',ignored:4}),{...EMPTY_COMPANY_PROFILE,name:'HamZa',phone:'0600000000',ice:'123',logoData:'data:image/png;base64,abc',paymentTerms:'15 days',documentNote:'Thanks'});
});
test('invalid or legacy company profile data safely defaults to empty fields',()=>{
  assert.deepEqual(normalizeCompanyProfile(null),EMPTY_COMPANY_PROFILE);
  assert.deepEqual(normalizeCompanyProfile({name:42,address:null}),EMPTY_COMPANY_PROFILE);
});
test('PDF settings normalize to safe template, color, and bounded custom fields',()=>{
  const value=normalizeCompanyProfile({pdfTemplateStyle:'framed',pdfAccentColor:'#12aBcD',pdfCustomFields:'معلومة: قيمة'});
  assert.equal(value.pdfTemplateStyle,'framed');assert.equal(value.pdfAccentColor,'#12aBcD');assert.equal(value.pdfCustomFields,'معلومة: قيمة');
  const invalid=normalizeCompanyProfile({pdfTemplateStyle:'<script>',pdfAccentColor:'red',pdfCustomFields:'x'.repeat(3000)});
  assert.equal(invalid.pdfTemplateStyle,'classic');assert.equal(invalid.pdfAccentColor,'#9A762D');assert.equal(invalid.pdfCustomFields.length,2000);
});
