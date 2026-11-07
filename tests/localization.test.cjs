const test = require('node:test');
const assert = require('node:assert/strict');
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
