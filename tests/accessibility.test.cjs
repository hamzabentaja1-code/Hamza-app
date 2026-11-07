const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('all primary workspaces use the shared accessible button wrapper', () => {
  for (const file of ['App.tsx', 'src/QuoteWorkspace.tsx', 'src/PosWorkspace.tsx']) {
    const source = read(file);
    assert.match(source, /import AccessiblePressable from ['"].*AccessiblePressable['"]/,
      file + ' must import AccessiblePressable');
    assert.match(source, /const Pressable = AccessiblePressable/,
      file + ' must route Pressable controls through AccessiblePressable');
  }
  for (const file of ['src/WarehouseWorkspace.tsx', 'src/BankWorkspace.tsx', 'src/FieldOperationsWorkspace.tsx', 'src/RecurringExpensesWorkspace.tsx', 'src/AgendaWorkspace.tsx']) {
    assert.match(read(file), /<AccessiblePressable\b/,
      file + ' must use accessible controls for interactive choices');
  }
});

test('primary workspace text inputs use translated accessible labels', () => {
  for (const file of ['App.tsx', 'src/QuoteWorkspace.tsx', 'src/PosWorkspace.tsx',
    'src/WarehouseWorkspace.tsx', 'src/BankWorkspace.tsx', 'src/FieldOperationsWorkspace.tsx', 'src/RecurringExpensesWorkspace.tsx', 'src/AgendaWorkspace.tsx', 'src/PeriodReportWorkspace.tsx']) {
    const source = read(file);
    assert.match(source, /TTextInput as TextInput/,
      file + ' must use the shared translated TextInput');
    assert.match(source, /<TextInput\b/,
      file + ' must contain accessible translated text inputs');
    assert.doesNotMatch(source, /<NativeTextInput\b/,
      file + ' must not render raw NativeTextInput controls');
  }
});

test('shared wrappers expose labels, focus, touch targets and state to assistive technology', () => {
  const input = read('src/i18n.tsx');
  assert.match(input, /accessibilityLabel=\{props\.accessibilityLabel\s*\|\|\s*translateText\(props\.placeholder,\s*language\)/);
  assert.match(input, /writingDirection: language === 'AR' \? 'rtl' : 'ltr'/);
  const button = read('src/AccessiblePressable.tsx');
  assert.match(button, /accessible=\{props\.accessible \?\? true\}/);
  assert.match(button, /focusable=\{props\.focusable \?\? true\}/);
  assert.match(button, /hitSlop=\{props\.hitSlop \?\? 8\}/);
  assert.match(button, /accessibilityState=\{/);
  assert.match(button, /accessibilityRole=\{props\.accessibilityRole \?\? 'button'\}/);
});

test('selected POS and banking choices expose selected state', () => {
  const pos = read('src/PosWorkspace.tsx');
  assert.match(pos, /accessibilityState=\{\{selected:method===m\.id\}\}/);
  assert.match(pos, /accessibilityState=\{\{selected:customerId===''\}\}/);
  const bank = read('src/BankWorkspace.tsx');
  assert.match(bank, /accessibilityState=\{\{selected:kind===v\}\}/);
  assert.match(bank, /accessibilityState=\{\{selected:destination===a\.id\}\}/);
});

test('main app announces selected states for project, return, expense and payment choices', () => {
  const app = read('App.tsx');
  const patterns = [
    /accessibilityState=\{\{selected:expenseProjectId===''\}\}/,
    /accessibilityState=\{\{selected:expenseProjectId===String\(p\.id\)\}\}/,
    /accessibilityState=\{\{selected:returnRestock\}\}/,
    /accessibilityState=\{\{selected:!returnRestock\}\}/,
    /accessibilityState=\{\{selected:project\.status===status\.value\}\}/,
    /accessibilityState=\{\{selected:taskProjectId===''\}\}/,
    /accessibilityState=\{\{selected:taskProjectId===String\(p\.id\)\}\}/,
    /accessibilityState=\{\{selected:taskPriority===p\.value\}\}/,
    /accessibilityState=\{\{selected:paymentCustomer===String\(c\.id\)\}\}/,
    /accessibilityState=\{\{selected:paymentDocument===String\(d\.id\)\}\}/,
    /accessibilityState=\{\{selected:paymentMethod===m\}\}/,
  ];
  for (const pattern of patterns) assert.match(app, pattern);
});

test('quote and POS removal buttons announce the affected product and action', () => {
  const quote = read('src/QuoteWorkspace.tsx');
  assert.match(quote, /accessibilityLabel=\{language===\x27AR\x27\?\x27حذف \x27\+line\.productName:\x27Supprimer \x27\+line\.productName\}/);
  assert.match(quote, /إزالة هذا المنتج من عرض السعر/);
  assert.match(quote, /Retirer ce produit du devis/);
  const pos = read('src/PosWorkspace.tsx');
  assert.match(pos, /accessibilityLabel=\{language===\x27AR\x27\?\x27حذف \x27\+line\.name:\x27Supprimer \x27\+line\.name\}/);
  assert.match(pos, /إزالة هذا المنتج من سلة البيع/);
  assert.match(pos, /Retirer ce produit du panier/);
});

test('field operations and recurring expense selectors announce selected state', () => {
  const field = read('src/FieldOperationsWorkspace.tsx');
  assert.match(field, /accessibilityState=\{\{selected:orderCustomer===String\(x\.id\)\}\}/);
  assert.match(field, /accessibilityState=\{\{selected:orderTechnician===x\.id\}\}/);
  assert.match(field, /accessibilityState=\{\{checked:selectedEquipment\.includes\(x\.id\)\}\}/);
  assert.match(field, /accessibilityState=\{\{selected:timeOrder===x\.id\}\}/);
  const recurring = read('src/RecurringExpensesWorkspace.tsx');
  assert.match(recurring, /accessibilityState=\{\{selected:frequency===x\.id\}\}/);
  assert.match(recurring, /accessibilityState=\{\{selected:projectId===String\(x\.id\)\}\}/);
});


test('agenda month navigation and day cells are accessible and translated', () => {
  const agenda = read('src/AgendaWorkspace.tsx');
  assert.match(agenda, /accessibilityLabel=\{t\('الشهر السابق'\)\}/);
  assert.match(agenda, /accessibilityLabel=\{t\('الشهر التالي'\)\}/);
  assert.match(agenda, /accessibilityState=\{\{selected:fromDate===day\.date&&toDate===day\.date\}\}/);
  assert.match(agenda, /accessibilityHint=\{t\('اضغط لعرض مواعيد هذا اليوم'\)\}/);
  const translations = read('src/i18n.tsx');
  for (const label of ['الشهر السابق','الشهر التالي','الاثنين','الأحد','اضغط لعرض مواعيد هذا اليوم']) {
    assert.ok(translations.includes('"'+label+'"'), 'missing French translation for '+label);
  }
});

test('inventory stocktaking and warehouse controls have French translations', () => {
  const translations = read('src/i18n.tsx');
  for (const label of [
    'إدارة المخازن',
    'المخزن النشط: ',
    'اسم المخزن الجديد',
    'إضافة مخزن',
    'تحويل بين المخازن',
    'مخزن الوجهة',
    'تأكيد التحويل',
    'المخزون حسب المخزن',
    'جرد المخزون',
    'سجل حركات المخزون',
    'اختار المنتج وسجل الكمية الفعلية. التطبيق يحسب الفرق ويسجلو كحركة جرد مع التاريخ والملاحظة.',
    'المسجل فالمخزن:',
    'الكمية المعدودة فعلياً',
    'ملاحظة الجرد (اختياري)',
    'تأكيد الجرد وتحديث المخزون',
    'المخزون السابق:',
    'المعدود:',
    'الفرق:',
  ]) {
    assert.ok(translations.includes('"' + label + '"'), 'missing French translation for ' + label);
  }
  const app = read('App.tsx');
  assert.match(app, /<WarehouseWorkspace\b/);
  assert.match(app, /createStockCount\(inventoryMovements/);
  const ledger = read('src/domain/inventory-ledger.ts');
  assert.match(ledger, /kind: "stock_count"/);
  assert.match(app, /سجل حركات المخزون/);
});

test('dynamic product, quote, POS and agenda labels have French translations', () => {
  const translations = read('src/i18n.tsx');
  for (const label of ['حذف ', 'إنقاص كمية ', 'زيادة كمية ', ' • افتراضي', '، ']) {
    assert.ok(translations.includes('"' + label + '"'), 'missing French translation for dynamic label ' + label);
  }
});

test('primary screens have no untranslated static Arabic labels', () => {
  const files = ['App.tsx', 'src/QuoteWorkspace.tsx', 'src/PosWorkspace.tsx',
    'src/WarehouseWorkspace.tsx', 'src/BankWorkspace.tsx', 'src/FieldOperationsWorkspace.tsx',
    'src/RecurringExpensesWorkspace.tsx', 'src/AgendaWorkspace.tsx', 'src/PeriodReportWorkspace.tsx', 'src/AccessiblePressable.tsx'];
  const dictionary = read('src/i18n.tsx');
  const keys = new Set([...dictionary.matchAll(/^\\s*"((?:[^"\\\\]|\\\\.)*)"\\s*:/gm)].map(match => match[1]));
  for (const file of files) {
    const source = read(file);
    const labels = [...source.matchAll(/(['"])([^'"\\\\\\n]{2,})\\1/g)]
      .map(match => match[2])
      .filter(value => /[\\u0600-\\u06FF]/.test(value) && !/[\\x60{}]/.test(value));
    for (const label of new Set(labels)) {
      assert.ok(keys.has(label), file + ' has an untranslated Arabic label: ' + label);
    }
  }
});

test('all primary workflow alerts and confirmation buttons respect the selected language', () => {
  for (const file of ['App.tsx', 'src/QuoteWorkspace.tsx', 'src/PosWorkspace.tsx',
    'src/WarehouseWorkspace.tsx', 'src/BankWorkspace.tsx', 'src/FieldOperationsWorkspace.tsx',
    'src/RecurringExpensesWorkspace.tsx']) {
    const source = read(file);
    assert.match(source, /const showAlert = \(\.\.\.args: Parameters<typeof Alert\.alert>\)/,
      file + ' must define the translated alert wrapper');
    assert.equal((source.match(/Alert\.alert\(/g) || []).length, 1,
      file + ' must call native Alert only inside the translation wrapper');
    assert.match(source, /showAlert\(/, file + ' must route alerts through the translation wrapper');
  }
});

test('company banking details and document series are persisted and localized', () => {
  const app = read('App.tsx');
  const dictionary = read('src/i18n.tsx');
  for (const key of ['bankName', 'bankAccount', 'bankRib', 'bankIban', 'quotePrefix', 'invoicePrefix', 'deliveryPrefix', 'purchasePrefix']) {
    assert.match(app, new RegExp(key), 'missing company profile field ' + key);
  }
  for (const label of ['اسم البنك', 'رقم الحساب البنكي', 'IBAN (اختياري)', 'بادئة عروض الأسعار — DEV',
    'بادئة الفواتير — FAC', 'بادئة سندات الخروج — BL', 'بادئة أوامر الشراء — BC']) {
    assert.ok(dictionary.includes('"' + label + '"'), 'missing French translation for ' + label);
  }
});

test('period analytics are connected to supplier purchase and return ledgers', () => {
  const app = read('App.tsx');
  const screen = read('src/PeriodReportWorkspace.tsx');
  const analytics = read('src/domain/report-analytics.ts');
  assert.match(app, /purchaseRows=\{purchases\.map/);
  assert.match(app, /supplierReturnRows=\{supplierReturns\.map/);
  assert.match(screen, /buildMonthlyTrend/);
  assert.match(screen, /buildSupplierPurchaseComparison/);
  assert.match(analytics, /netPurchases:row\.gross-row\.returned/);
});

test('customer payment screen offers automatic allocation across open invoices', () => {
  const app = read('App.tsx');
  const allocation = read('src/domain/multi-invoice-payment.ts');
  assert.match(app, /allocatePaymentAcrossInvoices\(documents,cst\.name/);
  assert.match(app, /توزيع تلقائي على جميع الفواتير المستحقة/);
  assert.match(allocation, /sort\(\(a,b\)=>a\.document\.id-b\.document\.id\)/);
});

test('period report exports monthly trends and supplier comparison in PDF', () => {
  const screen = read('src/PeriodReportWorkspace.tsx');
  const app = read('App.tsx');
  assert.match(screen, /onExportPdf\('Rapport de période/);
  assert.match(screen, /analytics\.trend\.map/);
  assert.match(screen, /analytics\.suppliers\.map/);
  assert.match(app, /onExportPdf=\{\(title,lines\)=>exportPdf\(title,'',lines,0,false\)\}/);
});

test('expense category dictionary is persisted, backed up and selectable', () => {
  const app = read('App.tsx');
  assert.match(app, /expenseCategories,language,companyProfile/);
  assert.match(app, /setExpenseCategories\(Array\.isArray\(d\.expenseCategories\)/);
  assert.match(app, /expenseCategories\.map\(category/);
  assert.match(app, /حفظ تصنيف جديد/);
});

test('product category and brand dictionaries persist and offer quick selection', () => {
  const app = read('App.tsx');
  assert.match(app, /productCategories,productBrands,language,companyProfile/);
  assert.match(app, /setProductCategories\(Array\.isArray\(d\.productCategories\)/);
  assert.match(app, /setProductBrands\(Array\.isArray\(d\.productBrands\)/);
  assert.match(app, /productCategories\.map\(category/);
  assert.match(app, /productBrands\.map\(brand/);
});
