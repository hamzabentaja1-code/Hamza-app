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

test('layout direction follows the selected language',()=>{
  const {getLayoutDirection}=require('../.test-build/i18n.js');
  assert.equal(getLayoutDirection('AR'),'rtl');
  assert.equal(getLayoutDirection('FR'),'ltr');
});
test('French translations cover POS validation and backup guidance',()=>{
  assert.equal(translate('FR','المخزون غير كافٍ'),'Stock insuffisant');
  assert.equal(translate('FR','راجع السلة'),'Vérifiez le panier');
  assert.equal(translate('FR','تخفيض غير صالح'),'Remise invalide');
});
test('voice product search controls and permission errors are translated to French',()=>{
  assert.equal(translate('FR','البحث بالصوت'),'Recherche vocale');
  assert.equal(translate('FR','إملاء اسم المنتج'),'Dicter le nom du produit');
  assert.equal(translate('FR','إيقاف البحث بالصوت'),'Arrêter la recherche vocale');
  assert.notEqual(translate('FR','خاصك تسمح باستعمال الميكروفون للبحث بالصوت.'),'خاصك تسمح باستعمال الميكروفون للبحث بالصوت.');
});


const fs = require('node:fs');
test('static Arabic labels used by workspaces all have French translations',()=>{
  for (const file of ['App.tsx','src/QuoteWorkspace.tsx','src/PosWorkspace.tsx','src/ProjectsWorkspace.tsx','src/SalesReturnWorkspace.tsx']) {
    const source = fs.readFileSync(file,'utf8');
    for (const match of source.matchAll(/\btr\((['"])(.*?)\1\)/g)) {
      const key = match[2].replace(/\\n/g,'\n');
      if (/[ء-ي]/.test(key)) assert.notEqual(translate('FR',key),key,file + ': ' + key);
    }
  }
});
