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

test('normalizes supported per-document PDF overrides after a JSON round trip', () => {
  const input = {
    pdfTemplateStyle: 'compact', pdfCustomFields: 'Global',
    pdfDocumentTemplates: {
      quote: {style: 'framed', customFields: 'Remise : sur devis'},
      invoice: {style: 'invalid', customFields: ''},
      delivery: {style: 'classic', customFields: 7},
      proforma: ['framed'],
      creditNote: {customFields: 'x'.repeat(2100)},
      customer_order: {style: 'framed'},
      unknown: {style: 'framed'},
    },
  };
  const normalized = normalizeCompanyProfile(JSON.parse(JSON.stringify(input)));
  assert.deepEqual(normalized.pdfDocumentTemplates, {
    quote: {style: 'framed', customFields: 'Remise : sur devis'},
    invoice: {customFields: ''},
    delivery: {style: 'classic'},
    creditNote: {customFields: 'x'.repeat(2000)},
    customer_order: {style: 'framed'},
  });
  assert.deepEqual(normalizeCompanyProfile(JSON.parse(JSON.stringify(normalized))), normalized);
  assert.equal(normalizeCompanyProfile({pdfDocumentTemplates: []}).pdfDocumentTemplates, undefined);
});
