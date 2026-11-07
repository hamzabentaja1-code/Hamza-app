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
  for (const file of ['src/WarehouseWorkspace.tsx', 'src/BankWorkspace.tsx', 'src/FieldOperationsWorkspace.tsx', 'src/RecurringExpensesWorkspace.tsx', 'src/AgendaWorkspace.tsx', 'src/ChequeWorkspace.tsx', 'src/VariantWorkspace.tsx']) {
    assert.match(read(file), /<AccessiblePressable\b/,
      file + ' must use accessible controls for interactive choices');
  }
});

test('primary workspace text inputs use translated accessible labels', () => {
  for (const file of ['App.tsx', 'src/QuoteWorkspace.tsx', 'src/PosWorkspace.tsx',
    'src/WarehouseWorkspace.tsx', 'src/BankWorkspace.tsx', 'src/FieldOperationsWorkspace.tsx', 'src/RecurringExpensesWorkspace.tsx', 'src/AgendaWorkspace.tsx', 'src/PeriodReportWorkspace.tsx', 'src/ChequeWorkspace.tsx', 'src/VariantWorkspace.tsx']) {
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
    'src/RecurringExpensesWorkspace.tsx', 'src/AgendaWorkspace.tsx', 'src/PeriodReportWorkspace.tsx', 'src/AccessiblePressable.tsx', 'src/ChequeWorkspace.tsx', 'src/VariantWorkspace.tsx', 'src/UserAccessWorkspace.tsx'];
  const dictionary = read('src/i18n.tsx');
  const keys = new Set([...dictionary.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)].map(match => match[1]));
  for (const file of files) {
    const source = read(file);
    const labels = [...source.matchAll(/(['"])([^'"\\\n]{2,})\1/g)]
      .map(match => match[2])
      .filter(value => /[؀-ۿ]/.test(value) && !/[`{}]/.test(value));
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
  assert.match(app, /allocatePaymentAcrossInvoices\(invoiceDocuments,cst\.name/);
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
  assert.match(app, /expenseCategories,productCategories,productBrands,language,companyProfile/);
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

test('product records support a four-photo gallery with accessible removal and preview', () => {
  const app = read('App.tsx');
  assert.match(app, /photos\?:string\[\]/);
  assert.match(app, /allowsMultipleSelection:true,selectionLimit:4/);
  assert.match(app, /setProductPhotos\(combined\)/);
  assert.match(app, /معاينة صورة المنتج /);
  assert.match(app, /حذف جميع الصور/);
});

test('activity history records key operations and survives backup restore', () => {
  const app = read('App.tsx');
  assert.match(app, /type ActivityEntry =/);
  assert.match(app, /setActivityLog\(Array\.isArray\(d\.activityLog\)/);
  assert.match(app, /activityLog,expenseCategories,productCategories/);
  assert.match(app, /logActivity\('تسجيل بيع'/);
  assert.match(app, /logActivity\('تسجيل شراء'/);
  assert.match(app, /screen==='سجل النشاط'/);
});

test('supplier payments can be allocated across purchases and reversed as one transaction', () => {
  const app = read('App.tsx');
  const domain = read('src/domain/multi-supplier-payment.ts');
  assert.match(app, /allocateSupplierPaymentAcrossPurchases\(purchases,supplierName/);
  assert.match(app, /transactionId/);
  assert.match(app, /const group=payment\.transactionId\?/);
  assert.match(app, /دفعة موزعة/);
  assert.match(domain, /sort\(\(a,b\)=>a\.purchase\.id-b\.purchase\.id\)/);
});


test('stock count UI accepts whole units only before submitting', () => {
  const app = read('App.tsx');
  assert.match(app, /Number\.isSafeInteger\(counted\)/);
  assert.match(app, /keyboardType="number-pad" placeholder="الكمية المعدودة فعلياً"/);
});

test('inventory movement history is isolated to the active warehouse', () => {
  const app = read('App.tsx');
  assert.match(app, /inventoryMovements\.filter\(m=>\(m\.warehouseId\|\|DEFAULT_WAREHOUSE_ID\)===activeWarehouseId\)\.slice\(\)\.sort/);
  assert.match(app, /سجل حركات المخزون \(\{inventoryMovements\.filter/);
});

test('stock count screen and movement labels have French translations', () => {
  const translations = read('src/i18n.tsx');
  for (const label of [
    'سجل حركات المخزون', 'المسجل فالمخزن:', 'المخزون السابق: ',
    'المعدود: ', 'الفرق: ', 'تم تسجيل الجرد', 'تعذر تسجيل الجرد',
    'اختار المنتج ودخل الكمية المعدودة بشكل صحيح.',
    'مازال ما تسجلات حتى حركة مخزون.',
    'رصيد افتتاحي', 'شراء', 'بيع', 'سند خروج', 'جرد',
    'إرجاع زبون', 'إلغاء مرتجع', 'استلام تحويل', 'تحويل صادر', 'تعديل',
  ]) assert.ok(translations.includes('"' + label + '"'), 'missing French translation for ' + label);
});

test('changing the active warehouse clears stale stock-count form values', () => {
  const app = read('App.tsx');
  assert.match(app, /useEffect\(\(\)=>\{setStockCountProduct\(''\);setStockCountQuantity\(''\);setStockCountNote\(''\);\},\[activeWarehouseId\]\)/);
});

test('French translation dictionary contains unique keys', () => {
  const dictionary = read('src/i18n.tsx');
  const keys = [...dictionary.matchAll(/^\\s*"((?:[^"\\\\]|\\\\.)*)"\\s*:/gm)].map(match => match[1]);
  assert.equal(new Set(keys).size, keys.length, 'translation dictionary must not contain duplicate keys');
});

test('bank workspace imports pasted CSV statements and reports matched duplicates', () => {
  const app = read('App.tsx');
  const workspace = read('src/BankWorkspace.tsx');
  const domain = read('src/domain/bank-statement-import.ts');
  assert.match(app, /importBankStatement\(bankMovements,accountId,csv\)/);
  assert.match(workspace, /onImportStatement\(active\.id,statementCsv\)/);
  assert.match(workspace, /date;description;amount/);
  assert.match(domain, /existingCounts/);
  assert.match(domain, /appendBankMovement/);
});

test('service items are excluded from stock and remain available in POS and quotes', () => {
  const app = read('App.tsx');
  const pos = read('src/PosWorkspace.tsx');
  const quote = read('src/QuoteWorkspace.tsx');
  const conversion = read('src/domain/document-conversion.ts');
  assert.match(app, /kind==='service'\?0:q/);
  assert.match(app, /product\.kind!=='service'\)nextMovements=appendInventoryMovement/);
  assert.match(pos, /trackStock:p\.kind!=='service'/);
  assert.match(quote, /trackStock:selectedProduct\.kind!=='service'/);
  assert.match(conversion, /lines\.filter\(line=>line\.trackStock!==false\)/);
});

test('service items are not selectable for stock counts or warehouse transfers', () => {
  const app = read('App.tsx');
  assert.match(app, /products\.filter\(p=>p\.kind!=='service'&&!productVariants\.some\(v=>v\.productId===p\.id&&v\.active\)\)\.map\(p=><Pressable key=\{p\.id\} accessibilityState=\{\{selected:stockCountProduct/);
  assert.match(app, /products=\{products\.filter\(p=>p\.kind!=='service'&&!productVariants\.some\(v=>v\.productId===p\.id&&v\.active\)\)/);
  assert.match(app, /kindText==='service'\?'service':'product'/);
});

test('separate quote and invoice product prices are stored and applied on invoice conversion', () => {
  const app = read('App.tsx');
  const quote = read('src/QuoteWorkspace.tsx');
  const pricing = read('src/domain/document-pricing.ts');
  assert.match(app, /quotePrice\?:number; invoicePrice\?:number/);
  assert.match(app, /productQuotePrice/);
  assert.match(app, /productInvoicePrice/);
  assert.match(app, /applyInvoicePriceRules\(quote,products\)/);
  assert.match(quote, /selectedProduct\.quotePrice\?\?selectedProduct\.price/);
  assert.match(quote, /documentDiscount:calculation\.discountCentimes\/100/);
  assert.match(pricing, /invoicePrice/);
});

test('PDFs use TTC-only by default and allow optional HT/TVA/TTC breakdown', () => {
  const app = read('App.tsx');
  assert.ok(app.includes('showTaxFields:false,taxRate:20'));
  assert.ok(app.includes('إظهار TTC فقط (افتراضي)'));
  assert.ok(app.includes('إظهار HT و TVA و TTC'));
  assert.ok(app.includes('labels.vat'));
});


test('cheque workspace persists lifecycle records and posts cleared cheques to the bank ledger', () => {
  const app = read('App.tsx');
  const workspace = read('src/ChequeWorkspace.tsx');
  const domain = read('src/domain/cheques.ts');
  assert.match(app, /import ChequeWorkspace from ['"]\.\/src\/ChequeWorkspace['"]/);
  assert.match(app, /const \[cheques,setCheques\]=useState<ChequeRecord\[\]>\(\[\]\)/);
  assert.match(app, /const \[chequeEvents,setChequeEvents\]=useState<ChequeEvent\[\]>\(\[\]\)/);
  assert.match(app, /cheques,chequeEvents/);
  assert.match(app, /createCheque\(input,cheques\)/);
  assert.match(app, /transitionCheque\(cheque,next,event\)/);
  assert.match(app, /id:'cheque-clear-'\+cheque\.id/);
  assert.match(app, /kind:cheque\.direction==='incoming'\?'deposit':'withdrawal'/);
  assert.match(workspace, /onAdd: \(input: NewCheque\) => boolean/);
  assert.match(workspace, /onTransition: \(cheque: ChequeRecord, next: ChequeStatus/);
  assert.match(domain, /clearedChequeBankEffect/);
  const dictionary = read('src/i18n.tsx');
  for (const label of ['إضافة شيك','رقم الشيك','اسم الزبون أو المورد','المبلغ بالدرهم',
    'تاريخ الشيك YYYY-MM-DD','تاريخ الاستحقاق (اختياري)','الحساب البنكي المرتبط',
    'حفظ الشيك','سجل الشيكات','إيداع','تأكيد التحصيل / الأداء','تسجيل رفض الشيك','إلغاء الشيك',
    'مازال ما تسجل حتى شيك.','سجل حركات الشيكات','مازال ما تسجلات حتى حركة شيك.','إيداع الشيك','تقديم الشيك للبنك','إنشاء','مسجل','مودع','مقبوض / مؤدى','مرفوض','ملغى']) {
    assert.ok(dictionary.includes('"'+label+'"'), 'missing French cheque translation: '+label);
  }
});

test('quotes track expiry and accepted/rejected lifecycle with safe deletion', () => {
  const quote = read('src/QuoteWorkspace.tsx');
  const app = read('App.tsx');
  assert.match(quote, /validUntil\?:string/);
  assert.match(quote, /onUpdate\(\{\.\.\.q,status:'مقبول'\}\)/);
  assert.match(quote, /onUpdate\(\{\.\.\.q,status:'مرفوض'\}\)/);
  assert.match(quote, /ما يمكنش تحويل عرض مرفوض أو منتهي/);
  assert.match(app, /onDelete=\{\(id\)=>\{if\(documents\.some\(document=>document\.sourceQuoteId===id\)\).*const quote=quotes\.find/);
  assert.match(app, /documents\.some\(document=>document\.sourceQuoteId===id\)/);
});

test('proforma invoices have their own series and document screen without affecting stock', () => {
  const app = read('App.tsx');
  const quote = read('src/QuoteWorkspace.tsx');
  const conversion = read('src/domain/document-conversion.ts');
  assert.match(app, /proformaPrefix:'PRO'/);
  assert.match(app, /screen==='الفواتير الأولية'/);
  assert.match(app, /type==='delivery'\?companyProfile\.deliveryPrefix:companyProfile\.proformaPrefix/);
  assert.match(quote, /onConvert\(q,'proforma'\)/);
  assert.match(conversion, /type!=='proforma'&&/);
});

test('period analytics exports summary, monthly trend and supplier comparison as CSV', () => {
  const screen = read('src/PeriodReportWorkspace.tsx');
  const app = read('App.tsx');
  assert.match(screen, /onExportCsv:\(title:string,rows:string\[\]\[\]\)=>void/);
  assert.match(screen, /const exportCsv=/);
  assert.match(screen, /Tendance mensuelle/);
  assert.match(screen, /Fournisseur/);
  assert.match(screen, /تصدير التقرير CSV/);
  assert.match(app, /onExportCsv=\{\(title,rows\)=>/);
  assert.match(app, /join\('\\n'\)/);
  assert.match(read('src/i18n.tsx'), /"تصدير التقرير CSV":/);
});

test('variant workspace uses accessible controls and is persisted, backed up and restored', () => {
  const workspace = read('src/VariantWorkspace.tsx');
  const app = read('App.tsx');
  assert.match(workspace, /<AccessiblePressable/);
  assert.match(workspace, /<TextInput/);
  assert.match(workspace, /accessibilityState=\{\{selected:productId===String\(p\.id\)\}\}/);
  assert.match(workspace, /accessibilityState=\{\{selected:selected===v\.id\}\}/);
  assert.match(app, /<VariantWorkspace\b/);
  assert.match(app, /createProductVariant\(input,productVariants\)/);
  assert.match(app, /applyVariantStockMovement\(productVariants,movement,variantStockMovements\)/);
  assert.match(app, /productVariants,variantStockMovements/);
  assert.match(app, /setProductVariants\(Array\.isArray\(d\.productVariants\)/);
  assert.match(app, /setVariantStockMovements\(Array\.isArray\(d\.variantStockMovements\)/);
  const translations = read('src/i18n.tsx');
  for (const label of ['تنويعات المنتجات','تنويعات المنتجات والمخزون','المقاس (مثال: XL)','اللون (مثال: أسود)',
    'إضافة النسخة','تعديل حركات المخزون','تسجيل حركة المخزون','تعذر إضافة النسخة','تعذر تسجيل حركة المخزون',
    'SKU: ',' • المخزون: ','شراء: ',' • بيع: ']) {
    assert.ok(translations.includes('"'+label+'"'), 'missing French translation for '+label);
  }
});


test('user management workspace uses accessible controls and selected-state announcements', () => {
  const workspace = read('src/UserAccessWorkspace.tsx');
  assert.match(workspace, /import AccessiblePressable from/);
  assert.match(workspace, /const Pressable=AccessiblePressable/);
  assert.match(workspace, /TTextInput as TextInput/);
  assert.match(workspace, /accessibilityState=\{\{selected:/);
  assert.match(workspace, /disabled=\{selected\.role==='owner'\}/);
});


test('POS parked sales can be resumed or deleted and are persisted by the app', () => {
  const pos = read('src/PosWorkspace.tsx');
  const app = read('App.tsx');
  assert.match(pos, /onPark\(currentCart\)/);
  assert.match(pos, /parkedCarts\.map/);
  assert.match(pos, /resume\(item\.id\)/);
  assert.match(pos, /onDeleteParked\(item\.id\)/);
  assert.match(app, /parkedPosCarts/);
  assert.match(app, /users,activeUserId,parkedPosCarts/);
});


test('variant stock count records the exact physical-count variance', () => {
  const workspace = read('src/VariantWorkspace.tsx');
  const domain = read('src/domain/variant-stock.ts');
  assert.match(workspace, /kind:'stock_count'/);
  assert.match(workspace, /quantityDelta:difference/);
  assert.match(workspace, /الكمية الفعلية للنسخة/);
  assert.match(domain, /'stock_count'/);
});


test('quote workspace preserves variants through invoice and delivery conversion', () => {
  const quote = read('src/QuoteWorkspace.tsx');
  const app = read('App.tsx');
  const conversion = read('src/domain/document-conversion.ts');
  assert.match(quote, /variantId:selectedVariant\?\.id/);
  assert.match(quote, /variantLabel:selectedVariant/);
  assert.match(app, /kind:type==='invoice'\?'sale':'delivery'/);
  assert.match(app, /applyVariantStockMovement\(nextVariants/);
  assert.match(conversion, /variantId\?:string/);
});


test('customer returns receive a numbered credit-note PDF action', () => {
  const app = read('App.tsx');
  assert.match(app, /number:nextDocumentNumber\(companyProfile\.creditNotePrefix,salesReturns\)/);
  assert.match(app, /إشعار دائن /);
  assert.match(app, /exportPdf\('إشعار دائن/);
  assert.match(app, /creditNotePrefix:string/);
});


test('archived variants never fall back to the legacy parent-product stock', () => {
  const app = read('App.tsx');
  const pos = read('src/PosWorkspace.tsx');
  const quote = read('src/QuoteWorkspace.tsx');
  assert.match(app, /if\(allVariants\.length&&!variants\.length\)/);
  assert.match(app, /productVariants\.some\(v=>v\.productId===p\.id\)/);
  assert.match(pos, /if\(!allVariants\.length\)return/);
  assert.match(pos, /if\(!variantsForProduct\.length\)return \[\]/);
  assert.match(quote, /if\(hasVariants&&!selectedVariant\)/);
});


test('product deletion refuses to orphan non-zero variant inventory', () => {
  const app = read('App.tsx');
  assert.match(app, /linkedVariants\.some\(v=>v\.stockQty>0\)/);
  assert.match(app, /setProductVariants\(current=>current\.map\(v=>v\.productId===p\.id\?\{\.\.\.v,active:false\}:v\)\)/);
});


test('product deletion protects open purchase orders', () => {
  const app = read('App.tsx');
  assert.match(app, /purchaseOrders\.some\(order=>order\.lines\.some\(line=>line\.productId===p\.id&&line\.receivedQuantity<line\.quantity\)\)/);
});
