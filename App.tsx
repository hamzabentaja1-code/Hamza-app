Warning: truncated output (original token count: 45095)
Total output lines: 742

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {SafeAreaView, View, Text, Pressable, ScrollView, TextInput, StyleSheet, Alert, ActivityIndicator, Image, Modal} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {readAppData, writeAppData, createBackup, restoreBackup} from './src/storage';
import {appendProductPhoto, productPhotos, removeProductPhoto, serializeProductPhotos} from './src/product-gallery';
import {fingerprintJpegDataUri} from './src/image-fingerprint';
import {rankUniqueProductImageMatches} from './src/domain/image-search';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import QuoteWorkspace, {QuoteRecord, QuoteConversionType} from './src/QuoteWorkspace';
import PosWorkspace from './src/PosWorkspace';
import ProjectsWorkspace from './src/ProjectsWorkspace';
import {ProjectRecord,ProjectStatus,ProjectTaskPriority,addProjectTask,createProject,normalizeProjects,setProjectTaskDone} from './src/projects';
import SalesReturnWorkspace from './src/SalesReturnWorkspace';
import {applyCustomerCreditsToSalesReturns,createSalesReturn,normalizeSalesReturns,recordCustomerRefund,SaleForReturn,SalesReturnRecord} from './src/domain/sales-returns';
import {convertQuote as createConvertedDocument, ConvertedDocument} from './src/domain/document-conversion';
import {allocateCreditNoteAcrossInvoices,allocatePaymentAcrossInvoices,applyExistingCustomerCredits,applyExistingCustomerCreditsWhenSelected,applyPaymentToInvoice} from './src/domain/payment-allocation';
import {allocatePaymentAcrossCustomerDebt, calculateCustomerBalances} from './src/domain/customer-balances';
import {canExtendCredit, normalizeCreditTerms, normalizeOpeningBalanceCentimes} from './src/domain/contact-credit';
import {StockMovement, Warehouse, DEFAULT_WAREHOUSE, normalizeWarehouses, validateWarehouse, warehouseStock, inventoryValue, averageInventoryUnitCost, averageInventoryCostAcrossWarehouses, validateStockDemand, createStockCount, applyStockCount, transferStock} from './src/inventory';
import {translate, getLayoutDirection} from './src/i18n';
import {CompanyProfile, EMPTY_COMPANY_PROFILE, normalizeCompanyProfile} from './src/company-profile';
import {buildCsv, CsvCell} from './src/domain/csv-export';
import {buildXlsx} from './src/domain/xlsx-export';
import type {XlsxSheet} from './src/domain/xlsx-export';
import {calculateProfitLoss} from './src/domain/profit-loss';
import {BUSINESS_LEDGER_HEADERS,buildBusinessLedgerRows} from './src/domain/business-ledger';
import {filterByDateRange,validateDateRange} from './src/report-filters';
import {normalizePurchasePaidAmount,normalizeSupplierPayments,purchaseOutstanding,recordSupplierPayment,recordSupplierOpeningPayment,supplierAccountBalances,SupplierAccountPayment} from './src/supplier-account';
import {calculateDueDate,isPastDue} from './src/domain/due-dates';
import {canDeleteCustomer,canDeleteSupplier} from './src/domain/contact-deletion';
import {buildCashRegisterRows,calculateCashBalance,EMPTY_CASH_ACCOUNT,normalizeCashAccount,recordManualCashEntry,setCashOpeningBalance,CashAccount} from './src/domain/cash-register';
import {BankAccount,BankTransfer,BankStatementLine,BankLedgerEntry,BankReconciliationRecord,calculateBankBalance,createBankAccount,deleteBankAccount,matchBankStatementLines,normalizeBankAccounts,normalizeBankTransfers,normalizeBankStatementLines,normalizeBankReconciliationHistory,parseBankStatementCsv,reconcileBankStatement,recordBankTransfer,renameBankAccount} from './src/domain/bank-accounts';
import {preparePurchaseEntry} from './src/domain/purchase-entry';

declare const require: (id:string)=>any;
let speechRecognition: any;
try{speechRecognition=require('expo-speech-recognition').ExpoSpeechRecognitionModule;}catch{speechRecognition=undefined;}

const GOLD = '#D6AE55';
const htmlSafe=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
const tryCalculateDueDate=(issueDate:string,paymentDelayDays?:number)=>{try{return calculateDueDate(issueDate,paymentDelayDays);}catch{return null;}};
const STORE_KEY = 'hamza_app_data_v03';
const modules = [
  {ar:'المنتجات',en:'Products',icon:'▦'}, {ar:'نقطة البيع',en:'Point of Sale',icon:'🛒'}, {ar:'الزبناء',en:'Customers',icon:'♙'}, 
  {ar:'الموردون',en:'Suppliers',icon:'♧'}, {ar:'المبيعات',en:'Sales',icon:'↗'},
  {ar:'المشتريات',en:'Purchases',icon:'↙'}, {ar:'المخزون',en:'Stock',icon:'▤'},
  {ar:'عروض الأسعار',en:'Quotes / Devis',icon:'▧'}, {ar:'فاتورة مباشرة',en:'Direct invoice',icon:'＋'}, {ar:'الفواتير',en:'Invoices',icon:'▣'},
  {ar:'فاتورة أولية',en:'Proforma',icon:'▤'},
  {ar:'Bon de sortie',en:'Delivery notes',icon:'⇧'}, {ar:'المصاريف',en:'Expenses',icon:'−'},
  {ar:'المشاريع',en:'Projects',icon:'◈'},
  {ar:'الإشعارات الدائنة',en:'Credit notes',icon:'↩'},
  {ar:'النسخ الاحتياطي',en:'Backup & Restore',icon:'↻'},
  {ar:'الإعدادات',en:'Settings',icon:'⚙'},
  {ar:'الأداءات',en:'Payments',icon:'د.م'}, {ar:'الصندوق',en:'Cash register',icon:'◉'}, {ar:'التقارير',en:'Reports',icon:'▥'},
];
type Product = {id:number; name:string; price:number; qty:number; costPrice?:number; reference?:string; barcode?:string; category?:string; brand?:string; unit?:string; variant?:string; photoData?:string; photoGallery?:string[]};
type Customer = {id:number; name:string; phone?:string; address?:string; ice?:string; rc?:string; ifNumber?:string; creditLimitCentimes?:number; paymentDelayDays?:number; openingBalanceCentimes?:number};
type Sale = {id:number; productId?:number; warehouseId?:string; documentId?:number; productName:string; customerName:string; qty:number; unitPrice:number; unitCost?:number; total:number; date:string; paymentMethod?:string; bankAccountId?:string;discount?:number};
type Purchase = {id:number; productName:string; supplierName:string; qty:number; unitCost:number; total:number; paidAmount?:number; paymentMethod?:string;bankAccountId?:string; date:string;paymentDelayDays?:number};
type Expense = {id:number; title:string; amount:number; date:string; projectId?:number; paymentMethod?:string;bankAccountId?:string};
type Supplier = {id:number; name:string; phone?:string; address?:string; ice?:string; rc?:string; ifNumber?:string; creditLimitCentimes?:number; paymentDelayDays?:number; openingBalanceCentimes?:number};
type Quote = QuoteRecord;
type CommercialDocument = ConvertedDocument & {paidCentimes?:number;creditedCentimes?:number};
type Payment = {id:number; customerName:string; amount:number; method:string; date:string; note:string; documentId?:number; allocations?:{documentId:number;amountCentimes:number}[];openingBalanceAppliedCentimes?:number;bankAccountId?:string;reference?:string};
export default function App() {
  const [screen,setScreen]=useState('الرئيسية');
  const [reportStart,setReportStart]=useState(''); const [reportEnd,setReportEnd]=useState(''); const [appliedReportRange,setAppliedReportRange]=useState<{from:string;to:string}|null>(null);
  const [search,setSearch]=useState(''); const [productSearch,setProductSearch]=useState(''); const [photoGallery,setPhotoGallery]=useState<string[]>([]); const [photoPreview,setPhotoPreview]=useState<string|null>(null);
  const [speechListening,setSpeechListening]=useState(false); const [speechSearchError,setSpeechSearchError]=useState('');
  const speechTarget=useRef<'search'|'name'>('search');
  const [imageSearchActive,setImageSearchActive]=useState(false); const [imageSearchBusy,setImageSearchBusy]=useState(false); const [imageSearchPreview,setImageSearchPreview]=useState<string|null>(null); const [imageSearchMatches,setImageSearchMatches]=useState<Array<{id:number;distance:number}>>([]);
  const imageFingerprintCache=useRef(new Map<string,{photo:string;fingerprint:string}>());
  const [language,setLanguage]=useState<'AR'|'FR'>('AR');
  const [companyProfile,setCompanyProfile]=useState<CompanyProfile>({...EMPTY_COMPANY_PROFILE});
  const updateCompanyProfile=(key:keyof CompanyProfile,value:string)=>setCompanyProfile(current=>({...current,[key]:value}));
  const tr=(value:string)=>translate(language,value);
  useEffect(()=>{
    if(!speechRecognition)return;
    const startListener=speechRecognition.addListener('start',()=>setSpeechListening(true));
    const endListener=speechRecognition.addListener('end',()=>setSpeechListening(false));
    const resultListener=speechRecognition.addListener('result',(event:any)=>{
      const transcript=event.results[0]?.transcript?.trim();
      if(transcript){setSpeechSearchError('');if(speechTarget.current==='name')setName(transcript);else{clearImageSearch();setProductSearch(transcript);}}
    });
    const errorListener=speechRecognition.addListener('error',(event:any)=>{
      setSpeechListening(false);
      if(event.error!=='aborted'&&event.error!=='no-speech')setSpeechSearchError('تعذر البحث بالصوت. تأكد من الميكروفون وخدمة التعرف على الكلام.');
    });
    return ()=>{startListener.remove();endListener.remove();resultListener.remove();errorListener.remove();};
  },[]);
  const toggleVoiceProductSearch=async(target:'search'|'name'='search')=>{
    setSpeechSearchError('');
    speechTarget.current=target;
    if(!speechRecognition){setSpeechSearchError('التعرف على الكلام غير متوفر. فعّل خدمة البحث الصوتي فالهاتف.');return;}
    if(speechListening){speechRecognition.stop();return;}
    try{
      if(!speechRecognition.isRecognitionAvailable()){
        setSpeechSearchError('التعرف على الكلام غير متوفر. فعّل خدمة البحث الصوتي فالهاتف.');
        return;
      }
      const permission=await speechRecognition.requestPermissionsAsync();
      if(!permission.granted){setSpeechSearchError('خاصك تسمح باستعمال الميكروفون للبحث بالصوت.');return;}
      speechRecognition.start({lang:language==='FR'?'fr-MA':'ar-MA',interimResults:true,continuous:false});
    }catch{
      setSpeechListening(false);
      setSpeechSearchError('تعذر البحث بالصوت. تأكد من الميكروفون وخدمة التعرف على الكلام.');
    }
  };
  const [products,setProducts]=useState<Product[]>([]);
  const [stockMovements,setStockMovements]=useState<StockMovement[]>([]);
  const [warehouses,setWarehouses]=useState<Warehouse[]>([{...DEFAULT_WAREHOUSE}]);
  const [activeWarehouseId,setActiveWarehouseId]=useState('main');
  const inventoryAverageProductCost=(productId:number,fallback=0)=>{
    return averageInventoryCostAcrossWarehouses(stockMovements,String(productId),warehouses.map(warehouse=>warehouse.id),fallback);
  };
  const productsForExport=useMemo(()=>products.map(product=>({...product,costPrice:inventoryAverageProductCost(product.id,product.costPrice||0)})),[products,stockMovements,warehouses]);
  const [warehouseName,setWarehouseName]=useState('');
  const [warehouseAddress,setWarehouseAddress]=useState('');
  const [transferProductId,setTransferProductId]=useState('');
  const [transferTargetId,setTransferTargetId]=useState('');
  const [transferQuantity,setTransferQuantity]=useState('1');
  const [stockCountInputs,setStockCountInputs]=useState<Record<string,string>>({});
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [editingCustomerId,setEditingCustomerId]=useState<number|null>(null);
  const [sales,setSales]=useState<Sale[]>([]);
  const [purchases,setPurchases]=useState<Purchase[]>([]); const [expenses,setExpenses]=useState<Expense[]>([]); const [suppliers,setSuppliers]=useState<Supplier[]>([]); const [editingSupplierId,setEditingSupplierId]=useState<number|null>(null);
  const [quotes,setQuotes]=useState<Quote[]>([]); const [payments,setPayments]=useState<Payment[]>([]); const [documents,setDocuments]=useState<CommercialDocument[]>([]);
  const [projects,setProjects]=useState<ProjectRecord[]>([]);
  const [salesReturns,setSalesReturns]=useState<SalesReturnRecord[]>([]);
  const [supplierPayments,setSupplierPayments]=useState<SupplierAccountPayment[]>([]);
  const [cashAccount,setCashAccount]=useState<CashAccount>({...EMPTY_CASH_ACCOUNT,manualEntries:[]});
  const [bankAccounts,setBankAccounts]=useState<BankAccount[]>([]); const [bankTransfers,setBankTransfers]=useState<BankTransfer[]>([]); const [bankStatementLines,setBankStatementLines]=useState<BankStatementLine[]>([]); const [confirmedBankStatementLineIds,setConfirmedBankStatementLineIds]=useState<string[]>([]); const [bankReconciliationHistory,setBankReconciliationHistory]=useState<BankReconciliationRecord[]>([]); const [bankStatementBusy,setBankStatementBusy]=useState(false); const [bankStatementClosingBalance,setBankStatementClosingBalance]=useState('');
  const [editingBankAccountId,setEditingBankAccountId]=useState<string|null>(null);
  const [quoteProduct,setQuoteProduct]=useState(''); const [quoteCustomer,setQuoteCustomer]=useState(''); const [quoteQty,setQuoteQty]=useState('1');
  const [paymentCustomer,setPaymentCustomer]=useState(''); const [paymentDocument,setPaymentDocument]=useState(''); const [paymentAmount,setPaymentAmount]=useState(''); const [paymentMethod,setPaymentMethod]=useState('نقداً'); const [paymentNote,setPaymentNote]=useState(''); const [paymentBankAccountId,setPaymentBankAccountId]=useState(''); const [paymentChequeReference,setPaymentChequeReference]=useState('');
  const [supplierName,setSupplierName]=useState(''); const [supplierPhone,setSupplierPhone]=useState(''); const [supplierAddress,setSupplierAddress]=useState(''); const [supplierIce,setSupplierIce]=useState(''); const [supplierRc,setSupplierRc]=useState(''); const [supplierIf,setSupplierIf]=useState(''); const [supplierCreditLimit,setSupplierCreditLimit]=useState(''); const [supplierPaymentDays,setSupplierPaymentDays]=useState(''); const [supplierOpeningBalance,setSupplierOpeningBalance]=useState(''); const [purchaseProduct,setPurchaseProduct]=useState(''); const [purchaseSupplier,setPurchaseSupplier]=useState(''); const [purchaseQty,setPurchaseQty]=useState('1'); const [purchaseCost,setPurchaseCost]=useState(''); const [purchasePaidNow,setPurchasePaidNow]=useState('0'); const [purchasePaidMethod,setPurchasePaidMethod]=useState<'نقداً'|'بطاقة'|'تحويل'>('نقداً'); const [purchaseBankAccountId,setPurchaseBankAccountId]=useState(''); const [supplierPaymentPurchaseId,setSupplierPaymentPurchaseId]=useState<number|null>(null); const [supplierPaymentOpeningSupplierId,setSupplierPaymentOpeningSupplierId]=useState<number|null>(null); const [supplierPaymentAmount,setSupplierPaymentAmount]=useState(''); const [supplierPaymentMethod,setSupplierPaymentMethod]=useState<'نقداً'|'تحويل'|'شيك'>('نقداً'); const [supplierPaymentReference,setSupplierPaymentReference]=useState(''); const [supplierPaymentBankAccountId,setSupplierPaymentBankAccountId]=useState(''); const [expenseTitle,setExpenseTitle]=useState(''); const [expenseAmount,setExpenseAmount]=useState(''); const [expensePaymentMethod,setExpensePaymentMethod]=useState<'نقداً'|'بطاقة'|'تحويل'>('نقداً'); const [expenseBankAccountId,setExpenseBankAccountId]=useState('');
  const [openingCashAmount,setOpeningCashAmount]=useState(''); const [cashEntryAmount,setCashEntryAmount]=useState(''); const [cashEntryDescription,setCashEntryDescription]=useState(''); const [cashEntryDirection,setCashEntryDirection]=useState<'in'|'out'>('in');
  const [bankName,setBankName]=useState(''); const [bankOpeningAmount,setBankOpeningAmount]=useState(''); const [bankTransferAccountId,setBankTransferAccountId]=useState(''); const [bankTransferAmount,setBankTransferAmount]=useState(''); const [bankTransferDescription,setBankTransferDescription]=useState(''); const [bankTransferDirection,setBankTransferDirection]=useState<'cash_to_bank'|'bank_to_cash'>('cash_to_bank');
  const [loaded,setLoaded]=useState(false); const [storageReady,setStorageReady]=useState(false); const [backupText,setBackupText]=useState(''); const [backupBusy,setBackupBusy]=useState(false);
  const [productBulkText,setProductBulkText]=useState('');
  const [name,setName]=useState(''); const [price,setPrice]=useState(''); const [costPrice,setCostPrice]=useState(''); const [qty,setQty]=useState(''); const [productReference,setProductReference]=useState(''); const [productBarcode,setProductBarcode]=useState(''); const [productCategory,setProductCategory]=useState(''); const [productBrand,setProductBrand]=useState(''); const [productUnit,setProductUnit]=useState(''); const [productVariant,setProductVariant]=useState(''); const [editingProductId,setEditingProductId]=useState<number|null>(null);
  const [customer,setCustomer]=useState(''); const [customerPhone,setCustomerPhone]=useState(''); const [customerAddress,setCustomerAddress]=useState(''); const [customerIce,setCustomerIce]=useState(''); const [customerRc,setCustomerRc]=useState(''); const [customerIf,setCustomerIf]=useState(''); const [customerCreditLimit,setCustomerCreditLimit]=useState(''); const [customerPaymentDays,setCustomerPaymentDays]=useState(''); const [customerOpeningBalance,setCustomerOpeningBalance]=useState('');
  const [saleProduct,setSaleProduct]=useState(''); const [saleCustomer,setSaleCustomer]=useState(''); const [saleQty,setSaleQty]=useState('1');
  const [salePaymentMethod,setSalePaymentMethod]=useState<'نقداً'|'بطاقة'|'تحويل'>('نقداً'); const [saleBankAccountId,setSaleBankAccountId]=useState('');
  useEffect(()=>{(async()=>{try{const d=await readAppData({language:'AR' as 'AR'|'FR',companyProfile:EMPTY_COMPANY_PROFILE,products:[],stockMovements:[],warehouses:[{...DEFAULT_WAREHOUSE}],activeWarehouseId:'main',customers:[],sales:[],purchases:[],expenses:[],suppliers:[],quotes:[],payments:[],documents:[],projects:[],salesReturns:[],supplierPayments:[],cashAccount:EMPTY_CASH_ACCOUNT,bankAccounts:[],bankTransfers:[],bankStatementLines:[],confirmedBankStatementLineIds:[],bankReconciliationHistory:[]});setLanguage(d.language==='FR'?'FR':'AR');setCompanyProfile(normalizeCompanyProfile(d.companyProfile));setWarehouses(normalizeWarehouses(d.warehouses));setActiveWarehouseId(typeof d.activeWarehouseId==='string'&&normalizeWarehouses(d.warehouses).some(w=>w.id===d.activeWarehouseId)?d.activeWarehouseId:'main');setProducts(Array.isArray(d.products)?d.products as Product[]:[]);setStockMovements(Array.isArray(d.stockMovements)?d.stockMovements as StockMovement[]:(Array.isArray(d.products)?(d.products as Product[]).filter(p=>p.qty>0).map(p=>({id:'opening-migration-'+p.id,productId:String(p.id),warehouseId:activeWarehouseId,kind:'opening' as const,quantity:p.qty,unitCost:p.costPrice||0,createdAt:new Date().toISOString(),note:'رصيد افتتاحي مرحّل من النسخة السابقة'})):[]));setCustomers(Array.isArray(d.customers)?d.customers as Customer[]:[]);setSales(Array.isArray(d.sales)?d.sales as Sale[]:[]);setPurchases(Array.isArray(d.purchases)?(d.purchases as Purchase[]).map(p=>({...p,paidAmount:normalizePurchasePaidAmount(p.total,p.paidAmount)})):[]);setExpenses(Array.isArray(d.expenses)?d.expenses as Expense[]:[]);setSuppliers(Array.isArray(d.suppliers)?d.suppliers as Supplier[]:[]);setQuotes(Array.isArray(d.quotes)?d.quotes as Quote[]:[]);setPayments(Array.isArray(d.payments)?d.payments as Payment[]:[]);setDocuments(Array.isArray(d.documents)?d.documents as CommercialDocument[]:[]);setProjects(normalizeProjects(d.projects));setSalesReturns(normalizeSalesReturns(d.salesReturns));setSupplierPayments(normalizeSupplierPayments(d.…35095 tokens truncated…or:'#8A3E3E'}]} onPress={()=>removeBankAccount(account)}><Text style={{color:'#E58B83'}}>{tr('حذف الحساب')}</Text></Pressable></View></View>)}<Text style={s.fieldLabel}>{tr('نوع التحويل')}</Text><View style={s.row}>{(['cash_to_bank','bank_to_cash'] as const).map(direction=><Pressable key={direction} onPress={()=>setBankTransferDirection(direction)} style={[s.choice,{flex:1},bankTransferDirection===direction&&s.choiceActive]}><Text style={s.itemTitle}>{tr(direction==='cash_to_bank'?'من الصندوق إلى البنك':'من البنك إلى الصندوق')}</Text></Pressable>)}</View><TextInput value={bankTransferAmount} onChangeText={setBankTransferAmount} keyboardType="decimal-pad" placeholder={tr('مبلغ التحويل DH')} placeholderTextColor="#888" style={s.input}/><TextInput value={bankTransferDescription} onChangeText={setBankTransferDescription} placeholder={tr('وصف التحويل')} placeholderTextColor="#888" style={s.input}/><Pressable style={s.action} disabled={!bankAccounts.length} onPress={addBankTransfer}><Text style={s.actionText}>{tr('تسجيل التحويل')}</Text></Pressable>{bankTransfers.map(item=><Text key={item.id} style={s.itemSub}>{item.date} • {tr(item.direction==='cash_to_bank'?'إيداع بنكي':'سحب من البنك')} • {(item.amountCentimes/100).toFixed(2)} DH • {bankAccounts.find(account=>account.id===item.bankAccountId)?.name||item.bankAccountId}</Text>)}<Text style={s.fieldLabel}>{tr('الحركات البنكية المرتبطة')}</Text>{payments.filter(item=>item.bankAccountId===bankTransferAccountId).map(item=><Text key={'bank-customer-'+item.id} style={s.itemSub}>{item.date} • {tr('قبض بنكي')} • +{item.amount.toFixed(2)} DH • {item.customerName}</Text>)}{supplierPayments.filter(item=>item.bankAccountId===bankTransferAccountId).map(item=><Text key={'bank-supplier-'+item.id} style={s.itemSub}>{item.date} • {tr('دفع بنكي')} • −{item.amount.toFixed(2)} DH • {item.supplierName}</Text>)}{purchases.filter(item=>item.bankAccountId===bankTransferAccountId&&(item.paidAmount||0)>0).map(item=><Text key={'bank-purchase-'+item.id} style={s.itemSub}>{item.date} • {tr('شراء بنكي')} • −{(item.paidAmount||0).toFixed(2)} DH • {item.supplierName}</Text>)}{expenses.filter(item=>item.bankAccountId===bankTransferAccountId).map(item=><Text key={'bank-expense-'+item.id} style={s.itemSub}>{item.date} • {tr('مصروف بنكي')} • −{item.amount.toFixed(2)} DH • {item.title}</Text>)}</View><Text style={s.section}>{tr('سجل حركة الصندوق')} ({cashRegisterRows.length})</Text>{cashRegisterRows.map(row=><View key={row.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{row.description}</Text><Text style={s.itemSub}>{row.date} • {tr(row.direction==='in'?'داخل للصندوق':'خارج من الصندوق')}</Text></View><Text style={[s.itemPrice,{color:row.direction==='in'?'#80C98C':'#E58B83'}]}>{row.direction==='in'?'+':'−'}{(row.amountCentimes/100).toFixed(2)} DH</Text></View>)}{cashRegisterRows.length===0&&<Text style={s.empty}>{tr('مازال ما كايناش حركات.')}</Text>}<View style={[s.panel,{marginTop:12}]}><Text style={s.panelTitle}>{tr('مطابقة كشف البنك')}</Text><Text style={s.panelText}>{tr('اختار حساباً بنكياً من الأعلى، ثم حمّل ملف CSV صادر من البنك.')}</Text><Pressable style={[s.action,{marginTop:8}]} disabled={bankStatementBusy||!bankTransferAccountId} onPress={importBankStatement}><Text style={s.actionText}>{bankStatementBusy?tr('جاري التحميل...'):tr('استيراد كشف البنك CSV')}</Text></Pressable><Text style={s.fieldLabel}>{tr('رصيد الكشف الختامي:')}</Text><TextInput value={bankStatementClosingBalance} onChangeText={setBankStatementClosingBalance} keyboardType="decimal-pad" placeholder="0.00 DH" placeholderTextColor="#888" style={s.input}/>{selectedReconciliation&&<View style={s.summary}><Text style={s.summaryText}>{tr('الرصيد المحسوب حتى تاريخ الكشف:')} {(selectedReconciliation.expectedBalanceCentimes/100).toFixed(2)} DH</Text><Text style={s.summaryText}>{tr('فرق الرصيد:')} {displayedBankClosingCentimes===undefined?'—':((displayedBankClosingCentimes-selectedReconciliation.expectedBalanceCentimes)/100).toFixed(2)} DH</Text><Text style={s.summaryText}>{tr('مطابق')}: {selectedReconciliation.matched} • {tr('غير مطابق')}: {selectedReconciliation.unmatched} • {tr('مطابقة محتملة متعددة')}: {selectedReconciliation.ambiguous}</Text></View>}{selectedStatementLines.map(line=>{const match=selectedStatementMatches.find(item=>item.lineId===line.id);const confirmed=confirmedBankStatementLineIds.includes(line.id);return <View key={line.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{line.description||tr('بدون وصف')}</Text><Text style={s.itemSub}>{line.date} • {(line.amountCentimes/100).toFixed(2)} DH • {tr(match?.status==='matched'?'مطابق':match?.status==='ambiguous'?'مطابقة محتملة متعددة':'غير مطابق')}</Text></View>{match?.status==='matched'&&<Pressable style={s.choice} onPress={()=>toggleBankStatementConfirmation(line.id)}><Text style={s.gold}>{tr(confirmed?'مطابقة معتمدة':'اعتماد المطابقة')}</Text></Pressable>}</View>;})}{selectedStatementLines.length===0&&<Text style={s.empty}>{tr('مازال ما كايناش حركات.')}</Text>}<Pressable style={[s.action,{marginTop:8}]} disabled={!selectedStatementLines.length} onPress={saveBankReconciliation}><Text style={s.actionText}>{tr('حفظ نتيجة التسوية')}</Text></Pressable><Text style={s.section}>{tr('سجل التسويات البنكية')}</Text>{selectedStatementHistory.map(record=><View key={record.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{record.fromDate} — {record.toDate}</Text><Text style={s.itemSub}>{new Date(record.createdAt).toLocaleString(language==='FR'?'fr-MA':'ar-MA')} • {record.confirmed} {tr('مطابق مؤكد')}</Text></View><Text style={s.itemPrice}>{tr('الفرق:')} {(record.differenceCentimes/100).toFixed(2)} DH</Text></View>)}{selectedStatementHistory.length===0&&<Text style={s.empty}>{tr('مازال ما كايناش حركات.')}</Text>}</View></>
      :screen==='النسخ الاحتياطي'?<><View style={s.panel}><Text style={s.panelTitle}>{tr('حماية بياناتك')}</Text><Text style={s.panelText}>{tr('صدر نسخة JSON فيها المنتجات والزبناء والموردين والمبيعات والمرتجعات والمشتريات وأداءات الموردين والمصاريف والصندوق والحسابات البنكية والتحويلات والمشاريع والمهام والعروض والأداءات. خزن الملف فمكان آمن.')}</Text><Pressable style={[s.action,{marginTop:14}]} disabled={backupBusy} onPress={exportBackup}><Text style={s.actionText}>{backupBusy?tr('جاري التحضير...'):tr('تصدير نسخة احتياطية')}</Text></Pressable></View><View style={[s.panel,{marginTop:14}]}><Text style={s.panelTitle}>{tr('استرجاع نسخة')}</Text><Text style={s.panelText}>{tr('اختار ملف النسخة الاحتياطية JSON من الهاتف؛ ويمكنك أيضاً لصق محتواه هنا. الاسترجاع كيعوض البيانات الحالية.')}</Text><Pressable style={[s.choice,{borderColor:GOLD,alignItems:'center'}]} onPress={chooseBackupFile}><Text style={s.gold}>{tr('اختيار ملف النسخة الاحتياطية')}</Text></Pressable><TextInput value={backupText} onChangeText={setBackupText} multiline numberOfLines={8} textAlignVertical="top" placeholder={tr('لصق محتوى ملف JSON هنا...')} placeholderTextColor="#888" style={[s.input,{minHeight:150,textAlign:'left'}]}/><Pressable style={s.action} disabled={backupBusy||!backupText.trim()} onPress={importBackup}><Text style={s.actionText}>{tr('استرجاع البيانات')}</Text></Pressable></View></>
      :screen==='التقارير'?<>
        <View style={s.panel}>
          <Text style={s.panelTitle}>{tr('تقرير النشاط التجاري')}</Text>
          <View style={[s.row,{marginTop:8}]}><TextInput value={reportStart} onChangeText={setReportStart} placeholder={tr('من تاريخ YYYY-MM-DD')} placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={reportEnd} onChangeText={setReportEnd} placeholder={tr('إلى تاريخ YYYY-MM-DD')} placeholderTextColor="#888" style={[s.input,s.half]}/></View>
          <View style={s.row}><Pressable style={[s.choice,{flex:1,borderColor:GOLD}]} onPress={applyReportRange}><Text style={s.gold}>{tr('تطبيق الفترة')}</Text></Pressable><Pressable style={[s.choice,{flex:1}]} onPress={()=>{setReportStart('');setReportEnd('');setAppliedReportRange(null);}}><Text style={s.itemTitle}>{tr('مسح الفترة')}</Text></Pressable></View>
          <Text style={s.note}>{appliedReportRange?tr('الفترة المحددة')+': '+(appliedReportRange.from||'—')+' → '+(appliedReportRange.to||'—'):tr('كل الفترات')}</Text>
          <Text style={s.panelText}>{tr('إجمالي المبيعات:')} {reportSalesTotal.toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('إجمالي المشتريات:')} {reportPurchaseTotal.toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('إجمالي المصاريف:')} {reportExpenseTotal.toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('الرصيد الحالي:')} {(cashBalanceCentimes/100).toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('تكلفة البضاعة المباعة (حسب تكلفة البيع المحفوظة):')} {reportProfitLoss.costOfGoodsSold.toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('هامش الربح من المبيعات ذات التكلفة المسجلة:')} {reportProfitLoss.grossProfitOnCostedSales.toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('النتيجة بعد المصاريف على البيانات المحتسبة:')} {reportProfitLoss.netProfitOnCostedSales.toFixed(2)} DH</Text>
          {reportProfitLoss.uncostedRevenue>0&&<Text style={s.note}>{tr('قيمة المبيعات بلا تكلفة محفوظة:')} {reportProfitLoss.uncostedRevenue.toFixed(2)} DH</Text>}
          <Pressable style={s.action} onPress={()=>exportPdf('Rapport d’activité','',[appliedReportRange?tr('الفترة المحددة')+': '+(appliedReportRange.from||'—')+' → '+(appliedReportRange.to||'—'):tr('كل الفترات'),'Ventes nettes: '+reportSalesTotal.toFixed(2)+' DH','Achats (stock): '+reportPurchaseTotal.toFixed(2)+' DH','Dépenses: '+reportExpenseTotal.toFixed(2)+' DH','Solde de caisse: '+(cashBalanceCentimes/100).toFixed(2)+' DH','Coût de revient enregistré: '+reportProfitLoss.costOfGoodsSold.toFixed(2)+' DH','Marge brute calculable: '+reportProfitLoss.grossProfitOnCostedSales.toFixed(2)+' DH','Résultat après dépenses (données comptabilisées): '+reportProfitLoss.netProfitOnCostedSales.toFixed(2)+' DH','Ventes sans coût enregistré: '+reportProfitLoss.uncostedRevenue.toFixed(2)+' DH'],reportProfitLoss.netProfitOnCostedSales)}><Text style={s.actionText}>{tr('تصدير تقرير النشاط PDF')}</Text></Pressable>
          <Pressable style={[s.choice,{marginTop:8,borderColor:GOLD,alignItems:'center'}]} onPress={exportBusinessLedger}><Text style={s.gold}>{tr('تصدير السجل الكامل CSV')}</Text></Pressable><Pressable style={[s.choice,{marginTop:8,borderColor:GOLD,alignItems:'center'}]} onPress={exportBusinessLedgerXlsx}><Text style={s.gold}>{tr('تصدير السجل الكامل Excel')}</Text></Pressable>
        </View>
        <View style={[s.panel,{marginTop:12}]}>
          <Text style={s.panelTitle}>{tr('تقرير ديون الزبناء')}</Text>
          <Text style={s.panelText}>{tr('إجمالي المبالغ المتبقية:')} {receivablesTotal.toFixed(2)} DH</Text><Text style={s.panelText}>{tr('أرصدة لصالح الزبناء:')} {(customerBalances.reduce((sum,item)=>sum+item.customerCreditCentimes,0)/100).toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('عدد الفواتير المفتوحة:')} {openInvoiceCount}</Text>
          {customerBalances.filter(x=>x.outstandingCentimes>0||x.customerCreditCentimes>0).map(x=><View key={x.customerName} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{x.customerName}</Text><Text style={s.itemSub}>{x.invoiceCount} {tr('فاتورة')}</Text>{x.customerCreditCentimes>0&&<Text style={s.itemSub}>{tr('رصيد لصالح الزبون:')} {(x.customerCreditCentimes/100).toFixed(2)} DH</Text>}</View><Text style={s.itemPrice}>{(x.outstandingCentimes/100).toFixed(2)} DH</Text></View>)}
          {receivablesTotal===0&&<Text style={s.note}>{tr('ما كايناش ديون مسجلة حالياً.')}</Text>}
          <Pressable style={s.action} onPress={()=>exportPdf('Situation des clients','',customerBalances.filter(x=>x.outstandingCentimes>0).map(x=>x.customerName+' — '+(x.outstandingCentimes/100).toFixed(2)+' DH'),receivablesTotal)}><Text style={s.actionText}>{tr('تصدير تقرير الديون PDF')}</Text></Pressable>
        </View>
        <View style={[s.panel,{marginTop:12}]}>
          <Text style={s.panelTitle}>{tr('تقرير ديون الموردين')}</Text>
          <Text style={s.panelText}>{tr('إجمالي ديون الموردين:')} {supplierOutstandingTotal.toFixed(2)} DH</Text>
          {supplierBalances.filter(item=>item.outstanding>0).map(item=><View key={item.supplierName} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{item.supplierName}</Text><Text style={s.itemSub}>{item.purchaseCount} {tr('مشتريات')}</Text></View><Text style={s.itemPrice}>{item.outstanding.toFixed(2)} DH</Text></View>)}
          {supplierOutstandingTotal===0&&<Text style={s.note}>{tr('ما كايناش ديون للموردين حالياً.')}</Text>}
          <Pressable style={s.action} onPress={()=>exportPdf('Dettes fournisseurs','',supplierBalances.filter(item=>item.outstanding>0).map(item=>item.supplierName+' — '+item.outstanding.toFixed(2)+' DH'),supplierOutstandingTotal)}><Text style={s.actionText}>{tr('تصدير تقرير ديون الموردين PDF')}</Text></Pressable>
        </View>
        <View style={[s.panel,{marginTop:12}]}>
          <Text style={s.panelTitle}>{tr('تقرير المخزون')}</Text>
          <Text style={s.panelText}>{tr('عدد المنتجات:')} {products.length}</Text>
          <Text style={s.panelText}>{tr('قيمة المخزون بسعر البيع:')} {stockValue.toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('منتجات نافدة:')} {outOfStockCount}</Text>
          <Text style={s.panelText}>{tr('منتجات قليلة المخزون:')} {lowStockProducts.length}</Text>
          {products.map(p=><View key={p.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{p.name}</Text><Text style={s.itemSub}>{tr('الكمية:')} {p.qty}</Text></View><Text style={s.itemPrice}>{(p.price*p.qty).toFixed(2)} DH</Text></View>)}
          <Pressable style={s.action} onPress={()=>exportPdf('Etat du stock','',products.map(p=>p.name+' — '+p.qty+' × '+p.price.toFixed(2)+' DH'),stockValue)}><Text style={s.actionText}>{tr('تصدير حالة المخزون PDF')}</Text></Pressable>
        </View>
        <Text style={s.note}>{tr('الربح المحسوب يعتمد على تكلفة الوحدة المسجلة وقت البيع. السجلات القديمة بلا تكلفة تبقى خارج هامش الربح، والنتيجة لا تشمل الضرائب أو الالتزامات غير المسجلة.')}</Text>
      </>
      :<View style={s.panel}><Text style={s.panelTitle}>{tr('قسم ')}{tr(screen)}</Text><Text style={s.panelText}>{tr('الواجهة الأولية موجودة. الوظائف التفصيلية لهذا القسم مازال ما تبرمجاتش.')}</Text><Text style={s.note}>{tr('الحالة: قيد التطوير')}</Text></View>}
      <Text style={s.footer}>HamZa • com.hamza.app • v0.8.0 • {tr('البيانات محفوظة على الهاتف')}</Text>
    </ScrollView><Modal visible={!!photoPreview} transparent animationType="fade" onRequestClose={()=>setPhotoPreview(null)}><Pressable onPress={()=>setPhotoPreview(null)} style={{flex:1,backgroundColor:'rgba(0,0,0,0.94)',justifyContent:'center',alignItems:'center',padding:16}}><Image source={{uri:photoPreview||undefined}} resizeMode="contain" style={{width:'100%',height:'85%'}}/><Text style={{color:'#FFF',marginTop:12}}>{tr('اضغط لإغلاق الصورة')}</Text></Pressable></Modal></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#101010'},header:{padding:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderColor:'#292929'},brand:{fontSize:29,fontWeight:'900',color:GOLD},sub:{color:'#999',marginTop:2,fontSize:12},lang:{borderWidth:1,borderColor:GOLD,borderRadius:9,padding:9},gold:{color:GOLD,fontWeight:'800'},body:{padding:16,paddingBottom:30},topline:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},back:{color:GOLD,fontWeight:'700'},heading:{fontSize:22,fontWeight:'800',color:'#FFF'},hero:{backgroundColor:'#211D14',borderColor:'#5D4A25',borderWidth:1,borderRadius:16,padding:19,marginBottom:14},heroLabel:{color:'#D6C49B'},heroTitle:{fontSize:31,fontWeight:'900',color:GOLD,marginVertical:5},heroText:{color:'#DDD'},stats:{flexDirection:'row',gap:8,marginBottom:10},stat:{flex:1,backgroundColor:'#1C1C1C',borderRadius:11,padding:11,borderWidth:1,borderColor:'#333'},statNum:{color:GOLD,fontWeight:'900',fontSize:16},statLabel:{color:'#AAA',fontSize:11,marginTop:5},summary:{backgroundColor:'#1B1B1B',borderRadius:10,padding:12,marginBottom:14},summaryText:{color:'#DDD',marginVertical:3},search:{backgroundColor:'#1D1D1D',borderRadius:10,padding:13,color:'#FFF',marginBottom:14,borderWidth:1,borderColor:'#333',textAlign:'auto'},grid:{flexDirection:'row',flexWrap:'wrap',gap:9},tile:{width:'48%',minHeight:102,backgroundColor:'#1B1B1B',borderColor:'#383838',borderWidth:1,borderRadius:12,padding:12,justifyContent:'center'},tileIcon:{fontSize:19,color:GOLD,marginBottom:5},tileTitle:{color:'#FFF',fontSize:15,fontWeight:'800'},tileSub:{color:GOLD,fontSize:11,marginTop:4},panel:{backgroundColor:'#1B1B1B',padding:16,borderRadius:14,borderWidth:1,borderColor:'#444'},panelTitle:{color:GOLD,fontSize:19,fontWeight:'800',marginBottom:12},input:{backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:12,color:'#FFF',marginBottom:10,textAlign:'auto',flex:1},row:{flexDirection:'row',gap:8},half:{minWidth:0},action:{marginTop:3,backgroundColor:GOLD,borderRadius:9,padding:13,alignItems:'center'},actionText:{color:'#151515',fontWeight:'900'},section:{color:'#FFF',fontWeight:'800',fontSize:17,marginTop:20,marginBottom:10},empty:{color:'#888',textAlign:'center',padding:12},listItem:{backgroundColor:'#1B1B1B',borderRadius:10,padding:13,marginBottom:8,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:'#333'},itemTitle:{color:'#FFF',fontWeight:'800'},itemSub:{color:'#999',fontSize:12,marginTop:4},itemPrice:{color:GOLD,fontWeight:'800'},delete:{color:'#E28A78',fontSize:12,fontWeight:'700'},panelText:{color:'#DDD',lineHeight:24},note:{color:GOLD,marginTop:14},fieldLabel:{color:'#CCC',marginTop:10,marginBottom:7,fontWeight:'700'},choice:{borderWidth:1,borderColor:'#393939',borderRadius:8,padding:10,marginBottom:6},choiceActive:{borderColor:GOLD,backgroundColor:'#302819'},footer:{textAlign:'center',color:'#666',marginTop:28,fontSize:11}});
