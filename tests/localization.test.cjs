const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {translateWithDictionary} = require('../.test-build/localization.js');

const dictionary = {
  'تم تسجيل ': 'Enregistré ',
  'منتجات': 'produits',
  ' في المخزن ': ' dans le dépôt ',
  'الرئيسي': 'principal',
  'تم حفظ المستند': 'Document enregistré',
};

test('translates dynamic Arabic messages while preserving interpolated values', () => {
  assert.equal(
    translateWithDictionary('تم تسجيل 3 منتجات في المخزن الرئيسي', 'FR', dictionary),
    'Enregistré 3 produits dans le dépôt principal',
  );
});

test('uses the longest phrase before shorter dictionary fragments', () => {
  assert.equal(translateWithDictionary('تم حفظ المستند', 'FR', dictionary), 'Document enregistré');
});

test('Arabic remains unchanged and undefined input remains undefined', () => {
  assert.equal(translateWithDictionary('تم تسجيل 3 منتجات', 'AR', dictionary), 'تم تسجيل 3 منتجات');
  assert.equal(translateWithDictionary(undefined, 'FR', dictionary), undefined);
});

test('leaves unknown dynamic values intact rather than deleting user data', () => {
  assert.equal(translateWithDictionary('REF-2026-0007', 'FR', dictionary), 'REF-2026-0007');
});

test('French dictionary has no duplicate literal keys',()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','src','i18n.tsx'),'utf8');
 const keys=[...source.matchAll(/^\s*"([^"]+)"\s*:/gm)].map(match=>match[1]);
 const seen=new Set();
 const duplicates=keys.filter(key=>seen.has(key)||!seen.add(key));
 assert.deepEqual(duplicates,[]);
});

test('French dictionary covers stock count validation and dynamic warehouse balance errors', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n.tsx'), 'utf8');
  for (const key of [
    'معرف الحركة إجباري',
    'تاريخ الحركة غير صالح',
    'حركة المخزون مسجلة من قبل',
    'الكمية المعدودة خاصها تكون عدد صحيح صفر أو أكثر',
    'الجرد مطابق للمخزون المسجل، ما كاين حتى فرق',
    'الكمية الفعلية مطابقة للمخزون المسجل، ما تسجلات حتى حركة.',
  ]) {
    assert.ok(source.includes('"'+key+'"'), 'missing French translation for '+key);
  }
  assert.ok(source.includes('"المخزون غير كافٍ في هذا المخزن. المتوفر: "'));
  assert.ok(source.includes('"المخزون غير كافٍ في مخزن المصدر. المتوفر: "'));
  assert.equal(
    translateWithDictionary('المخزون غير كافٍ في هذا المخزن. المتوفر: 4', 'FR', {
      'المخزون غير كافٍ في هذا المخزن. المتوفر: ': 'Stock insuffisant dans cet entrepôt. Disponible : ',
    }),
    'Stock insuffisant dans cet entrepôt. Disponible : 4',
  );
});
