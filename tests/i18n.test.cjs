const test = require('node:test');
const assert = require('node:assert/strict');
const {translate} = require('../.test-build/i18n.js');
test('French translations exist for navigation and settings',()=>{
  assert.equal(translate('FR','الرئيسية'),'Accueil');
  assert.equal(translate('FR','الإعدادات'),'Paramètres');
  assert.equal(translate('FR','الفواتير'),'Factures');
});
test('Arabic remains the source language and unknown labels safely fall back',()=>{
  assert.equal(translate('AR','الرئيسية'),'الرئيسية');
  assert.equal(translate('FR','نص غير مترجم'),'نص غير مترجم');
});
