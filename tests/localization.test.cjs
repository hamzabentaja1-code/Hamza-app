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

test('translates dynamic Arabic bulk-import, invoice, purchase and balance fragments', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n.tsx'), 'utf8');
  const fragments = {
    '. راجع الصيغة والمرجع والباركود.': '. Vérifiez le format, la référence et le code-barres.',
    'تزادو ': 'Ajoutés ',
    'هو ': 'est ',
    'درهم': 'DH',
    '• المؤدى ': '• Payé ',
    '• الباقي ': '• Restant ',
    'أداء • ': 'Paiement • ',
    '• المرتجع ': '• Retourné ',
    '• رصيد دائن ': '• Solde créditeur ',
  };
  for (const [arabic, french] of Object.entries(fragments)) {
    assert.ok(source.includes(JSON.stringify(arabic) + ': ' + JSON.stringify(french) + ','), 'missing dynamic translation: ' + arabic);
  }
  assert.equal(
    translateWithDictionary('فاتورة FAC-0001 • المجموع 120 • المؤدى 40 • الباقي 80 درهم', 'FR', {
      ' • المؤدى ': ' • Payé ',
      ' • الباقي ': ' • Restant ',
      ' درهم': ' DH',
    }),
    'فاتورة FAC-0001 • المجموع 120 • Payé 40 • Restant 80 DH',
  );
});


test('French dictionary covers remaining static alert messages', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n.tsx'), 'utf8');
  for (const key of ['تم تسجيل الحركة', 'معلومات غير صالحة', 'راجع الحقول.', 'تعذر تصدير التقرير']) {
    assert.ok(source.includes(JSON.stringify(key) + ':'), 'missing translation for ' + key);
  }
});


test('French dictionary covers the field-operations category error', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n.tsx'), 'utf8');
  assert.ok(source.includes('"تعذر إضافة الفئة.": "Impossible d’ajouter la catégorie."'));
});


test('all Arabic alert titles and messages in primary workspaces have French translations', () => {
  const files = ['App.tsx', 'src/QuoteWorkspace.tsx', 'src/PosWorkspace.tsx',
    'src/WarehouseWorkspace.tsx', 'src/BankWorkspace.tsx', 'src/FieldOperationsWorkspace.tsx',
    'src/RecurringExpensesWorkspace.tsx', 'src/AgendaWorkspace.tsx', 'src/PeriodReportWorkspace.tsx',
    'src/ChequeWorkspace.tsx', 'src/VariantWorkspace.tsx', 'src/UserAccessWorkspace.tsx',
    'src/ContactHistoryWorkspace.tsx', 'src/CustomerOrdersWorkspace.tsx'];
  const dictionarySource = fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n.tsx'), 'utf8');
  const keys = new Set([...dictionarySource.matchAll(/^\s*"((?:\\.|[^"\\])*)"\s*:/gm)].map(match => match[1]));
  for (const file of files) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    for (let position = 0; (position = source.indexOf('showAlert(', position)) >= 0;) {
      const start = position + 'showAlert('.length;
      let depth = 1, quote = null, escaped = false, commas = [], end = start;
      for (; end < source.length && depth > 0; end++) {
        const char = source[end];
        if (quote) {
          if (escaped) escaped = false;
          else if (char === '\\') escaped = true;
          else if (char === quote) quote = null;
          continue;
        }
        if (char === "'" || char === '"' || char === '\`') quote = char;
        else if (char === '(') depth++;
        else if (char === ')') depth--;
        else if (char === ',' && depth === 1) commas.push(end);
      }
      const firstTwoArguments = source.slice(start, commas[1] ?? end - 1);
      for (const match of firstTwoArguments.matchAll(/'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"/g)) {
        const value = match[1] ?? match[2];
        if (/[\u0600-\u06FF]/.test(value)) {
          assert.ok(keys.has(value), file + ' has an untranslated alert string: ' + value);
        }
      }
      position = end;
    }
  }
});

test('all static Arabic fragments inside primary-workspace template messages have French translations',()=>{
 const dictionarySource=fs.readFileSync(path.join(__dirname,'..','src','i18n.tsx'),'utf8');
 const entries=[...dictionarySource.matchAll(/^\s*"((?:\\.|[^"\\])*)"\s*:\s*"((?:\\.|[^"\\])*)"/gm)];
 const actualDictionary={};
 for(const entry of entries){actualDictionary[JSON.parse('"'+entry[1]+'"')]=JSON.parse('"'+entry[2]+'"');}
 const files=['App.tsx','src/QuoteWorkspace.tsx','src/PosWorkspace.tsx','src/WarehouseWorkspace.tsx','src/BankWorkspace.tsx','src/FieldOperationsWorkspace.tsx','src/RecurringExpensesWorkspace.tsx','src/AgendaWorkspace.tsx','src/PeriodReportWorkspace.tsx','src/ChequeWorkspace.tsx','src/VariantWorkspace.tsx','src/UserAccessWorkspace.tsx','src/ContactHistoryWorkspace.tsx'];
 for(const file of files){
  const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  for(const template of source.matchAll(/`([^`]+)`/g)){
   for(const segment of template[1].split(/\$\{[^}]*\}/g)){
    const value=segment.trim();
    if(!/[\u0600-\u06FF]/.test(value))continue;
    const translated=translateWithDictionary(value,'FR',actualDictionary)||'';
    assert.doesNotMatch(translated,/[\u0600-\u06FF]/,file+' has an untranslated dynamic message fragment: '+value);
   }
  }
 }
});
