import {productDeletionBlock} from './src/domain/product-deletion';
import {allocatePosLineTotals} from './src/pos';
import type {ArchivedSupplierInvoice} from './src/domain/historical-supplier-invoices';
import type {HistoricalSupplierReturn} from './src/domain/historical-supplier-returns';
import {adaptHistoricalSnapshot} from './src/domain/historical-snapshot';
import {assertVisitSlot,changeVisitStatus,createFieldVisit,FieldVisit,normalizeFieldVisits,updateFieldVisit,VisitInput,VisitStatus} from './src/domain/field-agenda';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {SafeAreaView, View, Text, Pressable, ScrollView, TextInput, StyleSheet, Alert, ActivityIndicator, Image, Modal, Linking, unstable_batchedUpdates} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {MAX_BACKUP_BYTES,decodeHamzaBackup,readAppData,writeAppData,createBackup,restoreAppData,exportOriginalBackup} from './src/storage';
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
import BarcodeScannerButton from './src/BarcodeScannerButton';
import ProjectsWorkspace from './src/ProjectsWorkspace';
import PurchaseDocumentsWorkspace from './src/PurchaseDocumentsWorkspace';
import {PurchaseDocument,PurchaseKind,PurchaseLine,PurchaseStatus,changePurchaseStatus,convertPurchaseDocument,createPurchaseDocument,normalizePurchaseDocuments,prepareSupplierReturn,purchaseTotals,validatePurchase} from './src/purchases';
import {ProjectRecord,ProjectStatus,ProjectTaskAttachment,ProjectTaskPriority,addProjectTask,addProjectTaskAttachment,addProjectTimeEntry,assertProjectCanBeDeleted,createProject,normalizeProjects,removeProjectTask,removeProjectTaskAttachment,removeProjectTimeEntry,setProjectTaskDone,updateProjectDetails,updateProjectTask} from './src/projects';
import {createTechnician,normalizeTechnicians,Technician,updateTechnician} from './src/technicians';
import {createEquipment,normalizeEquipment,TechnicianEquipment,updateEquipment} from './src/technician-equipment';
import {calculateTechnicianPayroll,createPayrollSettlement,normalizePayrollSettlements,PayrollSettlement,summarizePayrollSettlements} from './src/technician-payroll';
import RecurringExpensesWorkspace from './src/RecurringExpensesWorkspace';
import {advanceRecurringExpense,createRecurringExpense,normalizeRecurringExpenses,recordRecurringOccurrence,RecurringExpenseInput,RecurringExpenseRule} from './src/recurring-expenses';
import SalesReturnWorkspace from './src/SalesReturnWorkspace';
import {applyCustomerCreditsToSalesReturns,createSalesReturn,normalizeSalesReturns,recordCashCustomerRefund,SaleForReturn,SalesReturnRecord} from './src/domain/sales-returns';
import {allowedTrackedSalesDocumentStatuses,changeTrackedSalesDocumentStatus} from './src/domain/commercial-lifecycle';
import {convertQuote as createConvertedDocument, ConvertedDocument} from './src/domain/document-conversion';
import {DEFAULT_DOCUMENT_NUMBER_PREFIXES,DocumentNumberPrefixes,normalizeDocumentNumberPrefixes,nextDocumentNumber} from './src/domain/document-numbering';
import {planInvoiceStockDeduction} from './src/domain/invoice-stock';
import {allocateCreditNoteAcrossInvoices,allocatePaymentAcrossInvoices,applyExistingCustomerCredits,applyExistingCustomerCreditsWhenSelected,applyPaymentToInvoice} from './src/domain/payment-allocation';
import {allocatePaymentAcrossCustomerDebt, calculateCustomerBalances} from './src/domain/customer-balances';
import {canExtendCredit, normalizeCreditTerms, normalizeOpeningBalanceCentimes} from './src/domain/contact-credit';
import {StockMovement, Warehouse, DEFAULT_WAREHOUSE, normalizeWarehouses, validateWarehouse, warehouseStock, inventoryValue, averageInventoryUnitCost, averageInventoryCostAcrossWarehouses, validateStockDemand, createStockCount, applyStockCount, transferStock} from './src/inventory';
import {translate, getLayoutDirection} from './src/i18n';
import {CompanyProfile, EMPTY_COMPANY_PROFILE, normalizeCompanyProfile, PDF_DOCUMENT_KINDS, PDF_TEMPLATE_STYLES, PdfDocumentKind, PdfDocumentTemplate} from './src/company-profile';
import {buildPdfDocumentHtml,formatPdfAmount,formatPdfDiscountLines,formatPdfProductLine} from './src/pdf-document';
import {buildWhatsAppChatUrl} from './src/whatsapp';
import {normalizeParkedPosSales,parkedCheckoutError,saveParkedPosSale,ParkedPosSale} from './src/domain/pos-parked-sales';
import {buildCsv, CsvCell} from './src/domain/csv-export';
import {buildXlsx} from './src/domain/xlsx-export';
import type {XlsxSheet} from './src/domain/xlsx-export';
import {calculateProfitLoss} from './src/domain/profit-loss';
import {BUSINESS_LEDGER_HEADERS,buildBusinessLedgerRows} from './src/domain/business-ledger';
import {filterByDateRange,matchesReportSearch,validateDateRange} from './src/report-filters';
import {normalizePurchasePaidAmount,normalizeSupplierPayments,recordSupplierPayment,recordSupplierCredit,recordSupplierOpeningPayment,supplierAccountLedger,SupplierAccountPayment} from './src/supplier-account';
import {calculateDueDate,isPastDue} from './src/domain/due-dates';
import {canDeleteCustomer,canDeleteSupplier} from './src/domain/contact-deletion';
import {buildCashRegisterRows,calculateCashBalance,EMPTY_CASH_ACCOUNT,normalizeCashAccount,recordManualCashEntry,setCashOpeningBalance,CashAccount} from './src/domain/cash-register';
import {BankAccount,BankTransfer,BankStatementLine,BankReconciliationRecord,buildBankLedgerEntries,calculateBankBalance,createBankAccount,deleteBankAccount,matchBankStatementLines,normalizeBankAccounts,normalizeBankTransfers,normalizeBankStatementLines,normalizeBankReconciliationHistory,parseBankStatementCsv,reconcileBankStatement,recordBankTransfer,renameBankAccount} from './src/domain/bank-accounts';
import {preparePurchaseEntry} from './src/domain/purchase-entry';
import {parseOptionalProductPrice} from './src/domain/product-pricing';
import ReportDetailsWorkspace,{type DetailMode} from './src/ReportDetailsWorkspace';
import {buildCashDetail,buildDetailReportHtml,buildStockDetail,moneyReportTotal,orderDatedReport,selectOpenBalances,type DetailReport} from './src/domain/report-details';
import {buildActivityReportRows,includeInvoicedSales} from './src/domain/activity-report';
import {buildProjectTimeReport,summarizeTechnicianWork} from './src/domain/project-time-report';
import {summarizePurchasesBySupplier} from './src/domain/purchase-report';

declare const require: (id:string)=>any;
import {ProductVoiceSession,productVoiceLocale,productVoiceTargetMatchesScreen,productVoiceValue,type ProductVoiceTarget} from './src/domain/product-voice';
import {MAX_PRODUCT_IMPORT_BYTES,previewProductImport,type ProductImportPreview} from './src/domain/product-import';
let speechRecognition: typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule | undefined;
try{speechRecognition=require('expo-speech-recognition').ExpoSpeechRecognitionModule;}catch{speechRecognition=undefined;}

const GOLD = '#D6AE55';
const tryCalculateDueDate=(issueDate:string,paymentDelayDays?:number)=>{try{return calculateDueDate(issueDate,paymentDelayDays);}catch{return null;}};
const modules = [
  {ar:'المنتجات',en:'Products',icon:'▦'}, {ar:'نقطة البيع',en:'Point of Sale',icon:'🛒'}, {ar:'الزبناء',en:'Customers',icon:'♙'}, 
  {ar:'الموردون',en:'Suppliers',icon:'♧'}, {ar:'المبيعات',en:'Sales',icon:'↗'},
  {ar:'المشتريات',en:'Purchases',icon:'↙'}, {ar:'وثائق المشتريات',en:'Purchase documents',icon:'▤'}, {ar:'المخزون',en:'Stock',icon:'▤'},
  {ar:'عروض الأسعار',en:'Quotes / Devis',icon:'▧'}, {ar:'فاتورة مباشرة',en:'Direct invoice',icon:'＋'}, {ar:'الفواتير',en:'Invoices',icon:'▣'},
  {ar:'فاتورة أولية',en:'Proforma',icon:'▤'}, {ar:'طلبات الزبناء',en:'Customer orders',icon:'▤'},
  {ar:'Bon de sortie',en:'Delivery notes',icon:'⇧'}, {ar:'المصاريف',en:'Expenses',icon:'−'},
  {ar:'المشاريع',en:'Projects',icon:'◈'},
  {ar:'الإشعارات الدائنة',en:'Credit notes',icon:'↩'},
  {ar:'النسخ الاحتياطي',en:'Backup & Restore',icon:'↻'},
  {ar:'الإعدادات',en:'Settings',icon:'⚙'},
  {ar:'الأداءات',en:'Payments',icon:'د.م'}, {ar:'الصندوق',en:'Cash register',icon:'◉'}, {ar:'التقارير',en:'Reports',icon:'▥'},
];
type Product = {id:number; name:string; price:number; quotePrice?:number; invoicePrice?:number; qty:number; costPrice?:number; reference?:string; barcode?:string; category?:string; brand?:string; unit?:string; variant?:string; photoData?:string; photoGallery?:string[]};
type Customer = {id:number; name:string; phone?:string; whatsapp?:string; address?:string; ice?:string; rc?:string; ifNumber?:string; creditLimitCentimes?:number; paymentDelayDays?:number; openingBalanceCentimes?:number};
type Sale = {id:number; productId?:number; warehouseId?:string; documentId?:number; productName:string; customerName:string; qty:number; unitPrice:number; unitCost?:number; total:number; date:string; paymentMethod?:string; bankAccountId?:string;discount?:number};
type Purchase = {id:number; historicalInvoicePaidCentimes?:number; historicalSupplierReturns?:HistoricalSupplierReturn[]; productId?:string; warehouseId?:string; productName:string; supplierName:string; qty:number; unitCost:number; total:number; paidAmount?:number; paymentMethod?:string;bankAccountId?:string; date:string;paymentDelayDays?:number};
type Expense = {id:number; title:string; amount:number; date:string; projectId?:number; paymentMethod?:string;bankAccountId?:string;category?:string;recurringRuleId?:number;recurringOccurrenceDate?:string};
type Supplier = {id:number; name:string; phone?:string; whatsapp?:string; address?:string; ice?:string; rc?:string; ifNumber?:string; creditLimitCentimes?:number; paymentDelayDays?:number; openingBalanceCentimes?:number};
type Quote = QuoteRecord;
type CommercialDocument = ConvertedDocument & {paidCentimes?:number;creditedCentimes?:number};
type Payment = {id:number; customerName:string; amount:number; method:string; date:string; note:string; documentId?:number; allocations?:{documentId:number;amountCentimes:number}[];openingBalanceAppliedCentimes?:number;bankAccountId?:string;reference?:string};
const purchaseDocumentLocks=new Set<string>();
async function materializeBackupTaskAttachments(projects:ProjectRecord[],value:unknown,staged:string[]):Promise<ProjectRecord[]>{
  const invalid='مرفقات النسخة الاحتياطية ناقصة أو غير صالحة.';
  const tooBig='حجم مرفقات المهام ف النسخة الاحتياطية تجاوز الحد المسموح.';
  const files=new Map<string,{body:string;bytes:number}>();
  let total=0;
  if(value!==undefined&&!Array.isArray(value))throw new Error(invalid);
  for(const row of (value??[]) as unknown[]){
    if(typeof row!=='object'||row===null)throw new Error(invalid);
    const {id,base64}=row as {id?:unknown;base64?:unknown};
    if(typeof id!=='string'||!id.trim()||files.has(id)||typeof base64!=='string'||!base64.length||base64.length%4!==0)throw new Error(invalid);
    if(base64.length>7*1024*1024)throw new Error(tooBig);
    const body=base64.replace(/={1,2}$/,'');
    if(/[^a-zA-Z0-9+/]/.test(body))throw new Error(invalid);
    const bytes=base64.length/4*3-(base64.length-body.length);
    total+=bytes;
    if(bytes<=0||bytes>5*1024*1024||total>25*1024*1024)throw new Error(tooBig);
    files.set(id,{body:base64,bytes});
  }
  const expected=projects.flatMap(project=>project.tasks.flatMap(task=>task.attachments||[]));
  if(!expected.length&&!files.size)return projects;
  const ids=new Set(expected.map(item=>item.id));
  if(ids.size!==expected.length||ids.size!==files.size||expected.some(item=>!files.has(item.id)))throw new Error(invalid);
  const root=FileSystem.documentDirectory;if(!root)throw new Error('ما قدرناش نوصلو لمجلد ملفات التطبيق.');
  const directory=`${root}task-attachments/`;await FileSystem.makeDirectoryAsync(directory,{intermediates:true});
  const output:ProjectRecord[]=[];let sequence=0;
  const stamp=Date.now();
  for(const project of projects){const tasks=[];
    for(const task of project.tasks){const attachments=[];
      for(const attachment of task.attachments||[]){
        const file=files.get(attachment.id)!;
        const ext=attachment.name.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0]||'';
        let uri:string;
        do{uri=`${directory}restored-${stamp}-${++sequence}${ext}`;}while((await FileSystem.getInfoAsync(uri)).exists);
        staged.push(uri);
        await FileSystem.writeAsStringAsync(uri,file.body,{encoding:FileSystem.EncodingType.Base64});
        const info=await FileSystem.getInfoAsync(uri);
        if(!info.exists||info.isDirectory||info.size!==file.bytes)throw new Error(invalid);
        attachments.push({...attachment,uri,size:info.size});
      }
      tasks.push({...task,...(task.attachments?{attachments}:{})});
    }
    output.push({...project,tasks});
  }
  return output;
}
export default function App() {
  const [screen,setScreen]=useState('الرئيسية');
  const voiceScreen=useRef(screen);
  voiceScreen.current=screen;
  const [posSearch,setPosSearch]=useState('');
  const [detailMode,setDetailMode]=useState<DetailMode>('sales');
  const [detailWarehouse,setDetailWarehouse]=useState('');
  const [detailCashDirection,setDetailCashDirection]=useState<'all'|'in'|'out'>('all');
  const [reportStart,setReportStart]=useState(''); const [reportEnd,setReportEnd]=useState(''); const [reportSearch,setReportSearch]=useState(''); const [appliedReportSearch,setAppliedReportSearch]=useState(''); const [appliedReportRange,setAppliedReportRange]=useState<{from:string;to:string}|null>(null);
  const [search,setSearch]=useState(''); const [productSearch,setProductSearch]=useState(''); const [photoGallery,setPhotoGallery]=useState<string[]>([]); const [photoPreview,setPhotoPreview]=useState<string|null>(null);
  const speechSession=useRef(new ProductVoiceSession());
  const [voiceTarget,setVoiceTarget]=useState<ProductVoiceTarget>();
  const [voiceError,setVoiceError]=useState<{target:ProductVoiceTarget;message:string}>();
  const [imageSearchActive,setImageSearchActive]=useState(false); const [imageSearchBusy,setImageSearchBusy]=useState(false); const [imageSearchPreview,setImageSearchPreview]=useState<string|null>(null); const [imageSearchMatches,setImageSearchMatches]=useState<Array<{id:number;distance:number}>>([]);
  const imageFingerprintCache=useRef(new Map<string,{photo:string;fingerprint:string}>());
  const [language,setLanguage]=useState<'AR'|'FR'>('AR');
  const [companyProfile,setCompanyProfile]=useState<CompanyProfile>({...EMPTY_COMPANY_PROFILE});
  const [numberingPrefixes,setNumberingPrefixes]=useState<DocumentNumberPrefixes>({...DEFAULT_DOCUMENT_NUMBER_PREFIXES});
  const updateCompanyProfile=(key:keyof typeof EMPTY_COMPANY_PROFILE,value:string)=>setCompanyProfile(current=>({...current,[key]:value}));
  const [selectedPdfKind,setSelectedPdfKind]=useState<PdfDocumentKind>('invoice');
  const selectedPdfTemplate=companyProfile.pdfDocumentTemplates?.[selectedPdfKind];
  const updatePdfTemplate=(patch:PdfDocumentTemplate)=>setCompanyProfile(current=>{
    const templates={...current.pdfDocumentTemplates};
    const existing={...templates[selectedPdfKind],...patch};
    if(existing.style===undefined)delete existing.style;
    if(existing.customFields===undefined)delete existing.customFields;
    if(Object.keys(existing).length)templates[selectedPdfKind]=existing;
    else delete templates[selectedPdfKind];
    return {...current,pdfDocumentTemplates:templates};
  });

  const tr=(value:string)=>translate(language,value);
  const pdfKindLabels:Record<PdfDocumentKind,string>={quote:tr('عرض السعر'),invoice:tr('فاتورة'),delivery:tr('سند خروج'),proforma:tr('فاتورة أولية'),creditNote:tr('إشعار دائن للزبون'),customer_order:tr('طلب زبون')};
  const stopProductVoice=(target?:ProductVoiceTarget)=>{
    const session=speechSession.current;
    if(session.cancel(target)){
      try{speechRecognition?.abort();}catch{session.finish();}
    }
    if(!session.current)setVoiceTarget(undefined);
  };
  useEffect(()=>{
    if(!speechRecognition)return;
    const endListener=speechRecognition.addListener('end',()=>{
      if(speechSession.current.current?.phase==='preparing')return;
      speechSession.current.finish();setVoiceTarget(undefined);
    });
    const resultListener=speechRecognition.addListener('result',event=>{
      const target=speechSession.current.resultTarget();
      if(!event.isFinal||!target||!productVoiceTargetMatchesScreen(target,voiceScreen.current))return;
      const value=productVoiceValue(target,event.results[0]?.transcript??'');
      if(!value){
        setVoiceError({target,message:target==='price'||target==='quantity'
          ?'قول رقم واحد بوحدو، ولا دخلو بالكتابة.':'ما تسمع حتى كلام واضح. حاول من جديد.'});
        return;
      }
      setVoiceError(undefined);
      if(target==='name')setName(value);
      else if(target==='price')setPrice(value);
      else if(target==='quantity')setQty(value);
      else if(target==='pos-search')setPosSearch(value);
      else{clearImageSearch();setProductSearch(value);}
    });
    const errorListener=speechRecognition.addListener('error',event=>{
      const target=speechSession.current.resultTarget();
      if(!target||event.error==='aborted'||!productVoiceTargetMatchesScreen(target,voiceScreen.current))return;
      const message=event.error==='no-speech'?'ما تسمع حتى كلام واضح. حاول من جديد.'
        :event.error==='language-not-supported'
          ?'حمّل لغة التعرّف على الكلام بلا إنترنت من إعدادات الهاتف.'
          :'تعذر التعرّف على الكلام بلا إنترنت. تأكد من الميكروفون ولغة الهاتف.';
      setVoiceError({target,message});
    });
    return ()=>{endListener.remove();resultListener.remove();errorListener.remove();if(speechSession.current.cancel())speechRecognition?.abort();};
  },[]);
  useEffect(()=>{
    const target=speechSession.current.current?.target;
    if(target&&!productVoiceTargetMatchesScreen(target,screen))stopProductVoice(target);
    setVoiceError(current=>current&&!productVoiceTargetMatchesScreen(current.target,screen)?undefined:current);
    if(screen!=='نقطة البيع')setPosSearch('');
  },[screen]);
  const toggleProductVoice=async(target:ProductVoiceTarget)=>{
    if(!productVoiceTargetMatchesScreen(target,voiceScreen.current))return;
    const recognizer=speechRecognition;
    const controller=speechSession.current;
    if(controller.current){
      if(controller.current.target!==target)return;
      if(controller.current.phase==='preparing'){stopProductVoice(target);return;}
      if(controller.stop(target)){
        try{recognizer?.stop();}catch{stopProductVoice(target);}
      }
      return;
    }
    const session=controller.begin(target);
    if(!session)return;
    setVoiceTarget(target);setVoiceError(undefined);
    const fail=(message:string)=>{
      if(controller.finish(session)){setVoiceTarget(undefined);setVoiceError({target,message});}
    };
    try{
      if(!recognizer?.supportsOnDeviceRecognition()){
        fail('التعرّف على الكلام بلا إنترنت غير متوفر فهاد الهاتف. تقدر تكتب مباشرة.');return;
      }
      const permission=await recognizer.requestMicrophonePermissionsAsync();
      if(controller.current!==session||!productVoiceTargetMatchesScreen(target,voiceScreen.current))return;
      if(!permission.granted){fail('سمح بالميكروفون من إعدادات الهاتف باش تستعمل الصوت.');return;}
      const locales=await recognizer.getSupportedLocales({}).catch(()=>undefined);
      if(!productVoiceTargetMatchesScreen(target,voiceScreen.current)||!controller.start(session))return;
      recognizer.start({lang:productVoiceLocale(language,locales?.installedLocales??[]),requiresOnDeviceRecognition:true,interimResults:false,continuous:false});
    }catch{
      fail('تعذر التعرّف على الكلام بلا إنترنت. تأكد من الميكروفون ولغة الهاتف.');
    }
  };
  const productVoiceButton=(target:ProductVoiceTarget,label:string)=>{
    const active=voiceTarget===target;
    const disabled=!!voiceTarget&&!active;
    return <Pressable onPress={()=>void toggleProductVoice(target)} disabled={disabled} accessibilityRole="button" accessibilityLabel={active?tr('إيقاف الميكروفون'):label} accessibilityState={{disabled}} style={{minWidth:46,minHeight:48,paddingHorizontal:8,borderRadius:9,borderWidth:1,borderColor:active?'#E28A78':GOLD,backgroundColor:'#211D14',alignItems:'center',justifyContent:'center',opacity:disabled?0.55:1}}><Text style={[s.gold,active&&{color:'#E28A78'}]}>{active?'■':'🎙'}</Text></Pressable>;
  };
  const productVoiceHint=(target:ProductVoiceTarget)=>voiceError?.target===target
    ?<Text accessibilityLiveRegion="polite" style={[s.note,{marginTop:0,marginBottom:8}]}>{tr(voiceError.message)}</Text>:null;
  const clearVoiceField=(target:ProductVoiceTarget)=>{
    stopProductVoice(target);
    if(voiceError?.target===target)setVoiceError(undefined);
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
  const [purchases,setPurchases]=useState<Purchase[]>([]); const [purchaseDocuments,setPurchaseDocuments]=useState<PurchaseDocument[]>([]); const [expenses,setExpenses]=useState<Expense[]>([]); const [suppliers,setSuppliers]=useState<Supplier[]>([]); const [editingSupplierId,setEditingSupplierId]=useState<number|null>(null);
  const [quotes,setQuotes]=useState<Quote[]>([]); const [payments,setPayments]=useState<Payment[]>([]); const [documents,setDocuments]=useState<CommercialDocument[]>([]);
  const [parkedPosSales,setParkedPosSales]=useState<ParkedPosSale[]>([]);
  const [projects,setProjects]=useState<ProjectRecord[]>([]);
  const [technicians,setTechnicians]=useState<Technician[]>([]);
  const [technicianEquipment,setTechnicianEquipment]=useState<TechnicianEquipment[]>([]);
  const [payrollSettlements,setPayrollSettlements]=useState<PayrollSettlement[]>([]);
  const [fieldVisits,setFieldVisits]=useState<FieldVisit[]>([]);
  const fieldVisitsRef=useRef<FieldVisit[]>([]);
  const saveFieldVisits=(next:FieldVisit[])=>{fieldVisitsRef.current=next;setFieldVisits(next);};

  const [recurringExpenseRules,setRecurringExpenseRules]=useState<RecurringExpenseRule[]>([]);
  const [salesReturns,setSalesReturns]=useState<SalesReturnRecord[]>([]);
  const [supplierPayments,setSupplierPayments]=useState<SupplierAccountPayment[]>([]);
  const [cashAccount,setCashAccount]=useState<CashAccount>({...EMPTY_CASH_ACCOUNT,manualEntries:[]});
  const [bankAccounts,setBankAccounts]=useState<BankAccount[]>([]); const [bankTransfers,setBankTransfers]=useState<BankTransfer[]>([]); const [bankStatementLines,setBankStatementLines]=useState<BankStatementLine[]>([]); const [confirmedBankStatementLineIds,setConfirmedBankStatementLineIds]=useState<string[]>([]); const [bankReconciliationHistory,setBankReconciliationHistory]=useState<BankReconciliationRecord[]>([]); const [bankStatementBusy,setBankStatementBusy]=useState(false); const [bankStatementClosingBalance,setBankStatementClosingBalance]=useState('');
  const [editingBankAccountId,setEditingBankAccountId]=useState<string|null>(null);
  const [quoteProduct,setQuoteProduct]=useState(''); const [quoteCustomer,setQuoteCustomer]=useState(''); const [quoteQty,setQuoteQty]=useState('1');
  const [paymentCustomer,setPaymentCustomer]=useState(''); const [paymentDocument,setPaymentDocument]=useState(''); const [paymentAmount,setPaymentAmount]=useState(''); const [paymentMethod,setPaymentMethod]=useState('نقداً'); const [paymentNote,setPaymentNote]=useState(''); const [paymentBankAccountId,setPaymentBankAccountId]=useState(''); const [paymentChequeReference,setPaymentChequeReference]=useState('');
  const [supplierName,setSupplierName]=useState(''); const [supplierPhone,setSupplierPhone]=useState(''); const [supplierWhatsapp,setSupplierWhatsapp]=useState(''); const [supplierAddress,setSupplierAddress]=useState(''); const [supplierIce,setSupplierIce]=useState(''); const [supplierRc,setSupplierRc]=useState(''); const [supplierIf,setSupplierIf]=useState(''); const [supplierCreditLimit,setSupplierCreditLimit]=useState(''); const [supplierPaymentDays,setSupplierPaymentDays]=useState(''); const [supplierOpeningBalance,setSupplierOpeningBalance]=useState(''); const [purchaseProduct,setPurchaseProduct]=useState(''); const [purchaseSupplier,setPurchaseSupplier]=useState(''); const [purchaseQty,setPurchaseQty]=useState('1'); const [purchaseCost,setPurchaseCost]=useState(''); const [purchasePaidNow,setPurchasePaidNow]=useState('0'); const [purchasePaidMethod,setPurchasePaidMethod]=useState<'نقداً'|'بطاقة'|'تحويل'>('نقداً'); const [purchaseBankAccountId,setPurchaseBankAccountId]=useState(''); const [supplierPaymentPurchaseId,setSupplierPaymentPurchaseId]=useState<number|null>(null); const [supplierPaymentOpeningSupplierId,setSupplierPaymentOpeningSupplierId]=useState<number|null>(null); const [supplierPaymentAmount,setSupplierPaymentAmount]=useState(''); const [supplierPaymentMethod,setSupplierPaymentMethod]=useState<'نقداً'|'تحويل'|'شيك'>('نقداً'); const [supplierPaymentReference,setSupplierPaymentReference]=useState(''); const [supplierPaymentBankAccountId,setSupplierPaymentBankAccountId]=useState(''); const [expenseTitle,setExpenseTitle]=useState(''); const [expenseCategory,setExpenseCategory]=useState(''); const [expenseAmount,setExpenseAmount]=useState(''); const [expensePaymentMethod,setExpensePaymentMethod]=useState<'نقداً'|'بطاقة'|'تحويل'>('نقداً'); const [expenseBankAccountId,setExpenseBankAccountId]=useState('');
  const [openingCashAmount,setOpeningCashAmount]=useState(''); const [cashEntryAmount,setCashEntryAmount]=useState(''); const [cashEntryDescription,setCashEntryDescription]=useState(''); const [cashEntryDirection,setCashEntryDirection]=useState<'in'|'out'>('in');
  const [historicalSupplierInvoices,setHistoricalSupplierInvoices]=useState<ArchivedSupplierInvoice[]>([]);
  const [bankName,setBankName]=useState(''); const [bankOpeningAmount,setBankOpeningAmount]=useState(''); const [bankTransferAccountId,setBankTransferAccountId]=useState(''); const [bankTransferAmount,setBankTransferAmount]=useState(''); const [bankTransferDescription,setBankTransferDescription]=useState(''); const [bankTransferDirection,setBankTransferDirection]=useState<'cash_to_bank'|'bank_to_cash'>('cash_to_bank');
  const [loaded,setLoaded]=useState(false); const [storageReady,setStorageReady]=useState(false); const [backupText,setBackupText]=useState(''); const [backupBusy,setBackupBusy]=useState(false);
  const [productBulkText,setProductBulkText]=useState('');
  const [productImport,setProductImport]=useState<{source:string;preview:ProductImportPreview;warehouseId:string;filename?:string}>();
  const [productImportBusy,setProductImportBusy]=useState(false);
  const productImportOpen=useRef(false);

  const [name,setName]=useState(''); const [price,setPrice]=useState(''); const [costPrice,setCostPrice]=useState(''); const [quotePrice,setQuotePrice]=useState(''); const [invoicePrice,setInvoicePrice]=useState(''); const [qty,setQty]=useState(''); const [productReference,setProductReference]=useState(''); const [productBarcode,setProductBarcode]=useState(''); const [productCategory,setProductCategory]=useState(''); const [productBrand,setProductBrand]=useState(''); const [productUnit,setProductUnit]=useState(''); const [productVariant,setProductVariant]=useState(''); const [editingProductId,setEditingProductId]=useState<number|null>(null);
  const [customer,setCustomer]=useState(''); const [customerPhone,setCustomerPhone]=useState(''); const [customerWhatsapp,setCustomerWhatsapp]=useState(''); const [customerAddress,setCustomerAddress]=useState(''); const [customerIce,setCustomerIce]=useState(''); const [customerRc,setCustomerRc]=useState(''); const [customerIf,setCustomerIf]=useState(''); const [customerCreditLimit,setCustomerCreditLimit]=useState(''); const [customerPaymentDays,setCustomerPaymentDays]=useState(''); const [customerOpeningBalance,setCustomerOpeningBalance]=useState('');
  const [saleProduct,setSaleProduct]=useState(''); const [saleCustomer,setSaleCustomer]=useState(''); const [saleQty,setSaleQty]=useState('1');
  const [salePaymentMethod,setSalePaymentMethod]=useState<'نقداً'|'بطاقة'|'تحويل'>('نقداً'); const [saleBankAccountId,setSaleBankAccountId]=useState('');
  useEffect(()=>{(async()=>{try{const d=await readAppData({language:'AR' as 'AR'|'FR',companyProfile:EMPTY_COMPANY_PROFILE,numberingPrefixes:DEFAULT_DOCUMENT_NUMBER_PREFIXES,products:[],stockMovements:[],warehouses:[{...DEFAULT_WAREHOUSE}],activeWarehouseId:'main',customers:[],sales:[],purchases:[],purchaseDocuments:[],expenses:[],suppliers:[],quotes:[],payments:[],documents:[],parkedPosSales:[],projects:[],fieldVisits:[],technicians:[],technicianEquipment:[],payrollSettlements:[],recurringExpenseRules:[],salesReturns:[],supplierPayments:[],cashAccount:EMPTY_CASH_ACCOUNT,bankAccounts:[],bankTransfers:[],bankStatementLines:[],confirmedBankStatementLineIds:[],bankReconciliationHistory:[],historicalSupplierInvoices:[]});setLanguage(d.language==='FR'?'FR':'AR');setCompanyProfile(normalizeCompanyProfile(d.companyProfile));setNumberingPrefixes(normalizeDocumentNumberPrefixes(d.numberingPrefixes));setWarehouses(normalizeWarehouses(d.warehouses));setActiveWarehouseId(typeof d.activeWarehouseId==='string'&&normalizeWarehouses(d.warehouses).some(w=>w.id===d.activeWarehouseId)?d.activeWarehouseId:'main');setProducts(Array.isArray(d.products)?d.products as Product[]:[]);setStockMovements(Array.isArray(d.stockMovements)?d.stockMovements as StockMovement[]:(Array.isArray(d.products)?(d.products as Product[]).filter(p=>p.qty>0).map(p=>({id:'opening-migration-'+p.id,productId:String(p.id),warehouseId:activeWarehouseId,kind:'opening' as const,quantity:p.qty,unitCost:p.costPrice||0,createdAt:new Date().toISOString(),note:'رصيد افتتاحي مرحّل من النسخة السابقة'})):[]));setCustomers(Array.isArray(d.customers)?d.customers as Customer[]:[]);setSales(Array.isArray(d.sales)?d.sales as Sale[]:[]);setPurchases(Array.isArray(d.purchases)?(d.purchases as Purchase[]).map(p=>({...p,paidAmount:normalizePurchasePaidAmount(p.total,p.paidAmount)})):[]);setHistoricalSupplierInvoices(Array.isArray(d.historicalSupplierInvoices)?d.historicalSupplierInvoices as ArchivedSupplierInvoice[]:[]);setPurchaseDocuments(normalizePurchaseDocuments(d.purchaseDocuments));setExpenses(Array.isArray(d.expenses)?d.expenses as Expense[]:[]);setSuppliers(Array.isArray(d.suppliers)?d.suppliers as Supplier[]:[]);setQuotes(Array.isArray(d.quotes)?d.quotes as Quote[]:[]);setPayments(Array.isArray(d.payments)?d.payments as Payment[]:[]);setDocuments(Array.isArray(d.documents)?d.documents as CommercialDocument[]:[]);setParkedPosSales(normalizeParkedPosSales(d.parkedPosSales));setProjects(normalizeProjects(d.projects));saveFieldVisits(normalizeFieldVisits(d.fieldVisits));setTechnicians(normalizeTechnicians(d.technicians));setTechnicianEquipment(normalizeEquipment(d.technicianEquipment,normalizeTechnicians(d.technicians).map(item=>item.id)));setPayrollSettlements(normalizePayrollSettlements(d.payrollSettlements,normalizeTechnicians(d.technicians)));setRecurringExpenseRules(normalizeRecurringExpenses(d.recurringExpenseRules));setSalesReturns(normalizeSalesReturns(d.salesReturns));setSupplierPayments(normalizeSupplierPayments(d.supplierPayments));setCashAccount(normalizeCashAccount(d.cashAccount));const normalizedBanks=normalizeBankAccounts(d.bankAccounts);setBankAccounts(normalizedBanks);setBankTransfers(normalizeBankTransfers(d.bankTransfers,normalizedBanks));setBankStatementLines(normalizeBankStatementLines(d.bankStatementLines,normalizedBanks));setConfirmedBankStatementLineIds(Array.isArray(d.confirmedBankStatementLineIds)?(d.confirmedBankStatementLineIds as unknown[]).filter((id):id is string=>typeof id==='string'):[]);setBankReconciliationHistory(normalizeBankReconciliationHistory(d.bankReconciliationHistory,normalizedBanks));setStorageReady(true);}catch(e){Alert.alert(tr('تنبيه'),e instanceof Error?tr(e.message):tr('تعذر تحميل البيانات المحفوظة.'));}finally{setLoaded(true);}})();},[]);
  useEffect(()=>{if(loaded&&storageReady){writeAppData({language,companyProfile,numberingPrefixes,products,stockMovements,warehouses,activeWarehouseId,customers,sales,purchases,purchaseDocuments,expenses,suppliers,quotes,payments,documents,parkedPosSales,projects,fieldVisits,technicians,technicianEquipment,payrollSettlements,recurringExpenseRules,salesReturns,supplierPayments,cashAccount,bankAccounts,bankTransfers,bankStatementLines,confirmedBankStatementLineIds,bankReconciliationHistory}).catch(error=>Alert.alert(tr('ما قدرناش نحفظو البيانات.'),error instanceof Error?tr(error.message):undefined));}},[language,companyProfile,numberingPrefixes,products,stockMovements,warehouses,activeWarehouseId,customers,sales,purchases,purchaseDocuments,expenses,suppliers,quotes,payments,documents,parkedPosSales,projects,fieldVisits,technicians,technicianEquipment,payrollSettlements,recurringExpenseRules,salesReturns,supplierPayments,cashAccount,bankAccounts,bankTransfers,bankStatementLines,confirmedBankStatementLineIds,bankReconciliationHistory,parkedPosSales,loaded,storageReady]);
  const addWarehouse=()=>{const nameValue=warehouseName.trim();const warehouse:Warehouse={id:'wh-'+Date.now(),name:nameValue,address:warehouseAddress.trim()||undefined,active:true};const errors=validateWarehouse(warehouse,warehouses);if(errors.length){Alert.alert(tr('تعذر إضافة المخزن'),tr(errors[0]));return;}setWarehouses(current=>[...current,warehouse]);setActiveWarehouseId(warehouse.id);setWarehouseName('');setWarehouseAddress('');Alert.alert(tr('تمت إضافة المخزن'),warehouse.name);};
  const addWarehouseTransfer=()=>{try{const quantity=Number(transferQuantity.replace(',','.'));if(!transferProductId||!transferTargetId||!Number.isFinite(quantity)){throw new Error('اختار المنتج والمخزن المستهدف والكمية.');}const next=transferStock({id:'transfer-'+Date.now(),productId:transferProductId,fromWarehouseId:activeWarehouseId,toWarehouseId:transferTargetId,quantity,createdAt:new Date().toISOString()},stockMovements);setStockMovements(next);setTransferQuantity('1');Alert.alert(tr('تم التحويل'),tr('تسجل تحويل المخزون بنجاح.'));}catch(error){Alert.alert(tr('تعذر تحويل المخزون'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}};
  const clearImageSearch=()=>{setImageSearchActive(false);setImageSearchPreview(null);setImageSearchMatches([]);};
  const searchProductsByImage=async()=>{
    if(!products.some(product=>productPhotos(product).length>0)){Alert.alert(tr('البحث بالصورة'),tr('ما كايناش صور المنتجات. زيد صورة لكل منتج ثم عاود البحث.'));return;}
    try{
      const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
      if(!permission.granted){Alert.alert(tr('إذن الصور مطلوب'),tr('سمح للتطبيق بالوصول للصور لاختيار صورة المنتج.'));return;}
      const selected=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.55,base64:true});
      if(selected.canceled)return;
      const asset=selected.assets[0];
      if(!asset.base64){Alert.alert(tr('تعذر تحميل الصورة'),tr('اختار صورة أخرى.'));return;}
      setImageSearchBusy(true);
      await new Promise(resolve=>setTimeout(resolve,20));
      const queryData='data:image/jpeg;base64,'+asset.base64;
      setProductSearch('');setImageSearchPreview(queryData);setImageSearchMatches([]);setImageSearchActive(true);
      const queryFingerprint=fingerprintJpegDataUri(queryData);
      const candidates:Array<{item:Product;fingerprint:string}>=[];
      const photos=products.flatMap(product=>productPhotos(product).map((photo,index)=>({product,photo,key:product.id+':'+index})));
      for(let index=0;index<photos.length;index++){
        const {product,photo,key}=photos[index];
        try{
          const cached=imageFingerprintCache.current.get(key);
          const fingerprint=cached?.photo===photo?cached.fingerprint:fingerprintJpegDataUri(photo);
          if(cached?.photo!==photo)imageFingerprintCache.current.set(key,{photo,fingerprint});
          candidates.push({item:product,fingerprint});
        }catch{}
        if(index%4===3)await new Promise(resolve=>setTimeout(resolve,0));
      }
      const matches=rankUniqueProductImageMatches(queryFingerprint,candidates,14,20);
      setImageSearchMatches(matches.map(match=>({id:match.item.id,distance:match.distance})));
    }catch(error){Alert.alert(tr('تعذر تحميل الصورة'),error instanceof Error?error.message:tr('اختار صورة أخرى.'));}
    finally{setImageSearchBusy(false);}
  };
  const addProject=(input:{name:string;customerName:string;budget:number;targetDate:string})=>{try{const project=createProject(input,Date.now());setProjects(current=>[project,...current]);Alert.alert(tr('تمت إضافة المشروع'),project.name);}catch(error){Alert.alert(tr('تعذر إضافة المشروع'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}};
  const updateProject=(projectId:number,input:{name:string;customerName:string;budget:number;targetDate:string}):boolean=>{try{const project=projects.find(item=>item.id===projectId);if(!project)throw new Error('المشروع غير موجود.');const updated=updateProjectDetails(project,input);setProjects(current=>current.map(item=>item.id===projectId?updated:item));return true;}catch(error){Alert.alert(tr('تعذر تعديل المشروع'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));return false;}};
  const deleteProject=(projectId:number)=>Alert.alert(tr('حذف المشروع'),tr('واش متأكد تحذف المشروع؟'),[{text:tr('إلغاء'),style:'cancel'},{text:tr('حذف'),style:'destructive',onPress:()=>{const project=projects.find(item=>item.id===projectId);if(!project)return;try{if(fieldVisitsRef.current.some(v=>v.projectId===projectId))throw new Error('المشروع مربوط بطلب تدخل.');assertProjectCanBeDeleted(project,expenses);setProjects(current=>current.filter(item=>item.id!==projectId));}catch(error){Alert.alert(tr('تعذر حذف المشروع'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}}}]);
  const validateVisitLinks=(input:VisitInput)=>{
    if(input.projectId!==undefined&&!projects.some(p=>p.id===input.projectId))throw new Error('المشروع غير موجود.');
    if(input.technicianId!==undefined&&!technicians.some(t=>t.id===input.technicianId))throw new Error('التقني غير موجود.');
  };
  const saveVisit=(input:VisitInput,id?:number):boolean=>{
    try{
      validateVisitLinks(input);
      const all=fieldVisitsRef.current,old=id===undefined?undefined:all.find(v=>v.id===id);
      if(id!==undefined&&!old)throw new Error('طلب التدخل غير موجود.');
      let newId=Date.now();while(all.some(v=>v.id===newId))newId++;
      const next=old?updateFieldVisit(old,input):createFieldVisit(input,newId);
      assertVisitSlot(next,all);
      saveFieldVisits(old?all.map(v=>v.id===next.id?next:v):[next,...all]);return true;
    }catch(error){Alert.alert(tr('تعذر حفظ طلب التدخل'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));return false;}
  };
  const setVisitStatus=(id:number,status:VisitStatus)=>{
    try{
      const all=fieldVisitsRef.current,old=all.find(v=>v.id===id);
      if(!old)throw new Error('طلب التدخل غير موجود.');
      if(status==='scheduled')validateVisitLinks(old);
      const next=changeVisitStatus(old,status);
      assertVisitSlot(next,all);
      saveFieldVisits(all.map(v=>v.id===id?next:v));
    }catch(error){Alert.alert(tr('تعذر تغيير حالة الطلب'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}
  };
  const changeProjectStatus=(projectId:number,status:ProjectStatus)=>setProjects(current=>current.map(project=>project.id===projectId?{...project,status}:project));
  const addTaskToProject=(projectId:number,task:{title:string;dueDate?:string;priority:ProjectTaskPriority;assignee?:string})=>{try{setProjects(current=>current.map(project=>project.id===projectId?addProjectTask(project,task.title,Date.now(),{dueDate:task.dueDate,priority:task.priority,assignee:task.assignee}):project));}catch(error){Alert.alert(tr('تعذر إضافة المهمة'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}};
  const toggleProjectTask=(projectId:number,taskId:number,done:boolean)=>setProjects(current=>current.map(project=>project.id===projectId?setProjectTaskDone(project,taskId,done):project));
  const updateTaskInProject=(projectId:number,taskId:number,input:{title:string;dueDate?:string;priority:ProjectTaskPriority;assignee?:string}):boolean=>{try{const project=projects.find(item=>item.id===projectId);if(!project)throw new Error('المشروع غير موجود.');const updated=updateProjectTask(project,taskId,input);setProjects(current=>current.map(item=>item.id===projectId?updated:item));return true;}catch(error){Alert.alert(tr('تعذر تعديل المهمة'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));return false;}};
  const deleteProjectTask=(projectId:number,taskId:number)=>Alert.alert(tr('حذف المهمة'),tr('واش متأكد تحذف هاد المهمة؟'),[{text:tr('إلغاء'),style:'cancel'},{text:tr('حذف'),style:'destructive',onPress:async()=>{const project=projects.find(item=>item.id===projectId);if(!project)return;try{const attachments=project.tasks.find(item=>item.id===taskId)?.attachments||[];const updated=removeProjectTask(project,taskId);setProjects(current=>current.map(item=>item.id===projectId?updated:item));await Promise.all(attachments.map(item=>FileSystem.deleteAsync(item.uri,{idempotent:true}).catch(()=>undefined)));}catch(error){Alert.alert(tr('تعذر الحذف'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}}}]);
  const addTaskAttachment=async(projectId:number,taskId:number)=>{let copiedUri:string|undefined;try{const project=projects.find(item=>item.id===projectId),task=project?.tasks.find(item=>item.id===taskId);if(!project||!task)throw new Error('المهمة غير موجودة.');if((task.attachments||[]).length>=10)throw new Error('وصلتي للحد الأقصى ديال 10 مرفقات للمهمة.');const picked=await DocumentPicker.getDocumentAsync({copyToCacheDirectory:true,multiple:false});if(picked.canceled||!picked.assets.length)return;const asset=picked.assets[0];if(typeof asset.size==='number'&&asset.size>5*1024*1024)throw new Error('المرفق غير صالح أو حجمه أكبر من 5 ميغابايت.');const root=FileSystem.documentDirectory;if(!root)throw new Error('ما قدرناش نوصلو لمجلد ملفات التطبيق.');const directory=`${root}task-attachments/`;await FileSystem.makeDirectoryAsync(directory,{intermediates:true});const id=`task-${projectId}-${taskId}-${Date.now()}`,extension=asset.name.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0]||'',uri=`${directory}${id}${extension}`;await FileSystem.copyAsync({from:asset.uri,to:uri});copiedUri=uri;const info=await FileSystem.getInfoAsync(uri);if(!info.exists||typeof info.size!=='number')throw new Error('تعذر حفظ المرفق محلياً.');const updated=addProjectTaskAttachment(project,taskId,{id,name:asset.name,uri,mimeType:asset.mimeType,size:info.size});setProjects(current=>current.map(item=>item.id===projectId?updated:item));}catch(error){if(copiedUri)await FileSystem.deleteAsync(copiedUri,{idempotent:true}).catch(()=>undefined);Alert.alert(tr('تعذر إضافة المرفق'),error instanceof Error?tr(error.message):tr('راجع الملف وحاول من جديد.'));}};
  const openTaskAttachment=async(attachment:ProjectTaskAttachment)=>{try{if(!await Sharing.isAvailableAsync())throw new Error('المشاركة غير متاحة على هاد الجهاز.');await Sharing.shareAsync(attachment.uri,{mimeType:attachment.mimeType||'application/octet-stream',dialogTitle:tr('فتح أو مشاركة المرفق')});}catch(error){Alert.alert(tr('تعذر فتح المرفق'),error instanceof Error?tr(error.message):tr('راجع الملف وحاول من جديد.'));}};
  const deleteTaskAttachment=(projectId:number,taskId:number,attachmentId:string)=>Alert.alert(tr('حذف المرفق؟'),tr('غادي يتحيد هاد المرفق من المهمة.'),[{text:tr('إلغاء'),style:'cancel'},{text:tr('حذف'),style:'destructive',onPress:async()=>{const project=projects.find(item=>item.id===projectId),attachment=project?.tasks.find(item=>item.id===taskId)?.attachments?.find(item=>item.id===attachmentId);if(!project||!attachment)return;try{const updated=removeProjectTaskAttachment(project,taskId,attachmentId);setProjects(current=>current.map(item=>item.id===projectId?updated:item));await FileSystem.deleteAsync(attachment.uri,{idempotent:true}).catch(()=>undefined);}catch(error){Alert.alert(tr('تعذر حذف المرفق'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}}}]);
  const addProjectTime=(projectId:number,input:{technician:string;technicianId?:number;date:string;hours:number;hourlyRate:number;note?:string}):boolean=>{try{const project=projects.find(item=>item.id===projectId);if(!project)throw new Error('المشروع غير موجود.');const updated=addProjectTimeEntry(project,input,Date.now());setProjects(current=>current.map(item=>item.id===projectId?updated:item));return true;}catch(error){Alert.alert(tr('تعذر تسجيل ساعات العمل'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));return false;}};
  const settleTechnicianPayroll=(technicianId:number,amount:number,method:'نقداً'|'بطاقة'|'تحويل',bankAccountId?:string,note?:string):boolean=>{try{const technician=technicians.find(item=>item.id===technicianId);if(!technician)throw new Error('التقني غير موجود.');const row=calculateTechnicianPayroll(projects,technicians,payrollSettlements).find(item=>item.technicianId===technicianId);if(!row)throw new Error('حساب الأجرة غير موجود.');const bank=method==='نقداً'?undefined:bankAccounts.find(item=>item.id===bankAccountId);if(method!=='نقداً'&&!bank)throw new Error('اختار الحساب البنكي لأداء الأجرة.');const amountCentimes=Math.round(amount*100);if(method==='نقداً'&&amountCentimes>cashBalanceCentimes)throw new Error('المبلغ أكبر من الرصيد المتوفر فالصندوق.');if(bank&&amountCentimes>calculateBankBalance(bank,bankTransfers,payments,supplierPayments,bankOutflows))throw new Error('المبلغ أكبر من رصيد الحساب البنكي المتوفر.');let id=Date.now();while(payrollSettlements.some(item=>item.id===id))id++;const record=createPayrollSettlement({technician,amount,method,date:new Date().toISOString().slice(0,10),bankAccountId:bank?.id,note,id,dueCentimes:row.dueCentimes},payrollSettlements);setPayrollSettlements(current=>[record,...current]);return true;}catch(error){Alert.alert(tr('تعذر تسوية الأجرة'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));return false;}};
  const addRecurringExpenseRule=(input:RecurringExpenseInput):boolean=>{try{const rule=createRecurringExpense(input,Date.now(),recurringExpenseRules);setRecurringExpenseRules(current=>[rule,...current]);return true;}catch(error){Alert.alert(tr('تعذر إضافة المصروف الدوري'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));return false;}};
  const toggleRecurringExpenseRule=(id:number)=>setRecurringExpenseRules(current=>current.map(rule=>rule.id===id?{...rule,active:!rule.active}:rule));
  const deleteRecurringExpenseRule=(id:number)=>{if(expenses.some(expense=>expense.recurringRuleId===id)){Alert.alert(tr('تعذر حذف المصروف الدوري'),tr('هاد المصروف عندو أداءات مسجلة؛ وقف التكرار عوض الحذف.'));return;}setRecurringExpenseRules(current=>current.filter(rule=>rule.id!==id));};
  const recordRecurringExpensePayment=(id:number,method:'نقداً'|'بطاقة'|'تحويل',bankAccountId?:string):boolean=>{try{const rule=recurringExpenseRules.find(item=>item.id===id);if(!rule||!rule.active)throw new Error('المصروف الدوري غير موجود أو متوقف.');const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;if(rule.nextDueDate>today)throw new Error('موعد المصروف الدوري مازال ما وصلش.');const prior=expenses.map(item=>({recurringRuleId:item.recurringRuleId,recurringOccurrenceDate:item.recurringOccurrenceDate})).filter(item=>item.recurringRuleId&&item.recurringOccurrenceDate) as {recurringRuleId:number;recurringOccurrenceDate:string}[];const occurrence=recordRecurringOccurrence(rule,prior);const bank=method==='نقداً'?undefined:bankAccounts.find(item=>item.id===bankAccountId);if(method!=='نقداً'&&!bank)throw new Error('اختار الحساب البنكي لأداء المصروف.');const cents=Math.round(rule.amount*100);if(method==='نقداً'&&cents>cashBalanceCentimes)throw new Error('المبلغ أكبر من الرصيد المتوفر فالصندوق.');if(bank&&cents>calculateBankBalance(bank,bankTransfers,payments,supplierPayments,bankOutflows))throw new Error('المبلغ أكبر من رصيد الحساب البنكي المتوفر.');setExpenses(current=>[{id:Date.now(),title:rule.title,amount:rule.amount,date:occurrence.recurringOccurrenceDate,category:rule.category,paymentMethod:method,...(bank?{bankAccountId:bank.id}:{}),...occurrence},...current]);setRecurringExpenseRules(current=>current.map(item=>item.id===id?advanceRecurringExpense(item):item));return true;}catch(error){Alert.alert(tr('تعذر تسجيل المصروف الدوري'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));return false;}};
  const addTechnicianProfile=(input:{name:string;phone?:string;specialty?:string;hourlyRate:number}):boolean=>{try{const item=createTechnician(input,Date.now(),technicians);setTechnicians(current=>[...current,item]);setProjects(current=>current.map(project=>({...project,timeEntries:project.timeEntries.map(entry=>entry.technicianId===undefined&&entry.technician.trim().toLocaleLowerCase()===item.name.trim().toLocaleLowerCase()?({...entry,technicianId:item.id}):entry)})));return true;}catch(error){Alert.alert(tr('تعذر إضافة التقني'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));return false;}};
  const updateTechnicianProfile=(technicianId:number,input:{name:string;phone?:string;specialty?:string;hourlyRate:number}):boolean=>{try{const existing=technicians.find(item=>item.id===technicianId);if(!existing)throw new Error('التقني غير موجود.');const updated=updateTechnician(technicians,technicianId,input);setTechnicians(updated);setProjects(current=>current.map(project=>({...project,timeEntries:project.timeEntries.map(entry=>entry.technicianId===undefined&&entry.technician.trim().toLocaleLowerCase()===existing.name.trim().toLocaleLowerCase()?({...entry,technicianId}):entry)})));return true;}catch(error){Alert.alert(tr('تعذر تعديل التقني'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));return false;}};
  const addTechnicianEquipment=(input:Parameters<typeof createEquipment>[0]):boolean=>{try{const item=createEquipment(input,Date.now(),technicianEquipment,technicians.map(value=>value.id));setTechnicianEquipment(current=>[...current,item]);return true;}catch(error){Alert.alert(tr('تعذر حفظ المعدة'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));return false;}};
  const updateTechnicianEquipment=(id:number,input:Parameters<typeof createEquipment>[0]):boolean=>{try{setTechnicianEquipment(current=>updateEquipment(current,id,input,technicians.map(value=>value.id)));return true;}catch(error){Alert.alert(tr('تعذر تعديل المعدة'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));return false;}};
  const deleteTechnicianEquipment=(id:number)=>Alert.alert(tr('حذف المعدة؟'),tr('هاد المعدة غادي تتحيد من السجل.'),[{text:tr('إلغاء'),style:'cancel'},{text:tr('حذف'),style:'destructive',onPress:()=>setTechnicianEquipment(current=>current.filter(item=>item.id!==id))}]);
  const deleteTechnicianProfile=(technicianId:number)=>{const item=technicians.find(value=>value.id===technicianId);if(!item)return;if(fieldVisitsRef.current.some(v=>v.technicianId===technicianId)){Alert.alert(tr('تعذر حذف التقني'),tr('التقني مربوط بطلب تدخل.'));return;}if(payrollSettlements.some(record=>record.technicianId===technicianId)||projects.some(project=>project.timeEntries.some(entry=>entry.technicianId===technicianId||entry.technicianId===undefined&&entry.technician.trim().toLocaleLowerCase()===item.name.trim().toLocaleLowerCase()))){Alert.alert(tr('تعذر حذف التقني'),tr('ما يمكنش تحذف تقني عندو ساعات عمل أو تسويات أجور مسجلة.'));return;}Alert.alert(tr('حذف التقني؟'),item.name,[{text:tr('إلغاء'),style:'cancel'},{text:tr('حذف'),style:'destructive',onPress:()=>{setTechnicians(current=>current.filter(value=>value.id!==technicianId));setTechnicianEquipment(current=>current.map(record=>record.technicianId===technicianId?({...record,technicianId:undefined}):record));}}]);};
  const deleteProjectTime=(projectId:number,entryId:number)=>{const sourceProject=projects.find(item=>item.id===projectId),sourceEntry=sourceProject?.timeEntries.find(item=>item.id===entryId);if(sourceEntry&&payrollSettlements.some(record=>record.technicianId===sourceEntry.technicianId||sourceEntry.technicianId===undefined&&record.technicianName.trim().toLocaleLowerCase()===sourceEntry.technician.trim().toLocaleLowerCase())){Alert.alert(tr('تعذر حذف سجل الوقت'),tr('ما يمكنش تحذف ساعات مرتبطة بأداء أجرة مسجل.'));return;}Alert.alert(tr('حذف سجل الوقت'),tr('واش متأكد تحذف هاد التسجيل؟'),[{text:tr('إلغاء'),style:'cancel'},{text:tr('حذف'),style:'destructive',onPress:()=>{try{const project=projects.find(item=>item.id===projectId);if(!project)throw new Error('المشروع غير موجود.');const updated=removeProjectTimeEntry(project,entryId);setProjects(current=>current.map(item=>item.id===projectId?updated:item));}catch(error){Alert.alert(tr('تعذر الحذف'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}}}]);};
  const addProjectExpense=(projectId:number,title:string,amount:number)=>setExpenses(current=>[{id:Date.now(),projectId,title:title.trim(),amount,paymentMethod:'نقداً',date:new Date().toLocaleDateString('fr-MA')},...current]);
  const addSalesReturn=(input:{sale:SaleForReturn;quantity:number;reason:string;restock:boolean}):boolean=>{
    const matches=input.sale.productId?products.filter(product=>product.id===input.sale.productId):input.sale.sourceKey?[]:products.filter(product=>product.name===input.sale.productName);
    const product=matches.length===1?matches[0]:undefined;
    if(input.restock&&(!product||input.sale.canRestock===false)){Alert.alert(tr('تعذر تسجيل المرتجع'),tr('المنتج الأصلي غير محدد بوضوح؛ سجل المرتجع بلا إرجاع للمخزون.'));return false;}
    try{
      const item={...createSalesReturn({sale:input.sale,quantity:input.quantity,existingReturns:salesReturns,id:Date.now(),date:new Date().toLocaleDateString('fr-MA'),reason:input.reason,restock:input.restock,productId:product?.id}),number:nextDocumentNumber(numberingPrefixes.creditNote,salesReturns)};
      const eligibleInvoices=documents.filter(document=>document.type==='invoice'&&document.customerName===item.customerName);
      const credit=allocateCreditNoteAcrossInvoices(eligibleInvoices.map(document=>({id:document.id,total:document.total,paidCentimes:document.paidCentimes,creditedCentimes:document.creditedCentimes,status:document.status})),Math.round(item.total*100),item.documentId);
      if(credit.allocations.length){setDocuments(current=>current.map(document=>{const allocation=credit.allocations.find(value=>value.invoiceId===document.id);return allocation?{...document,creditedCentimes:allocation.creditedCentimes,status:allocation.status}:document;}));}
      const recordedReturn={...item,invoiceAllocations:credit.allocations.map(value=>({documentId:value.invoiceId,creditedCentimes:value.creditedCentimes,allocatedCentimes:value.allocatedCentimes,status:value.status})),unappliedCentimes:credit.unappliedCentimes};
      setSalesReturns(current=>[recordedReturn,...current]);
      if(item.restocked&&product){const movement={id:'return-'+item.id,productId:String(product.id),warehouseId:item.warehouseId,kind:'return_in' as const,quantity:item.qty,unitCost:input.sale.unitCost??product.costPrice??0,createdAt:new Date().toISOString(),reference:item.number,note:'إرجاع منتج من مرتجع بيع'};const next=[...stockMovements,movement];setStockMovements(next);setProducts(current=>current.map(currentProduct=>currentProduct.id===product.id?{...currentProduct,qty:warehouses.reduce((sum,warehouse)=>sum+warehouseStock(next,String(product.id),warehouse.id),0)}:currentProduct));}
      Alert.alert(tr('تم تسجيل المرتجع'),item.number+' • '+item.total.toFixed(2)+' DH'+(credit.unappliedCentimes?` • ${tr('رصيد لصالح الزبون:')} ${(credit.unappliedCentimes/100).toFixed(2)} DH`:''));return true;
    }catch(error){Alert.alert(tr('تعذر تسجيل المرتجع'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));return false;}
  };
  const requestCustomerRefund=(item:SalesReturnRecord,amount:number)=>Alert.alert(
    tr('تأكيد الرد النقدي'),
    `${tr('رد نقدي')}: ${amount.toFixed(2)} DH\n${tr('رصيد لصالح الزبون:')} ${((item.unappliedCentimes||0)/100).toFixed(2)} DH`,
    [{text:tr('إلغاء'),style:'cancel'},{text:tr('تأكيد'),style:'destructive',onPress:()=>{
      try{
        const current=refundState.current;
        const fresh=current.returns.find(row=>row.id===item.id);
        if(!fresh)throw new Error('راجع البيانات وحاول من جديد.');
        const updated=recordCashCustomerRefund(fresh,amount,Date.now(),new Date().toLocaleDateString('fr-MA'),current.cash);
        refundState.current={cash:current.cash-Math.round(amount*100),returns:current.returns.map(row=>row.id===item.id?updated:row)};
        setSalesReturns(rows=>rows.map(row=>row.id===item.id?updated:row));
        Alert.alert(tr('تم رد المبلغ'),`${amount.toFixed(2)} DH`);
      }catch(error){Alert.alert(tr('تعذر تسجيل المرتجع'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}
    }}]);
  const exportSalesReturnPdf=(item:SalesReturnRecord)=>exportCommercialPdf('creditNote',(language==='FR'?'Avoir ':'إشعار دائن ')+item.number,item.customerName,[tr('تاريخ المرتجع:')+' '+item.date,tr('مرجع البيع:')+' '+(item.saleReference??item.saleId),item.productName+' × '+item.qty,tr('سبب المرتجع')+': '+(item.reason||tr('بدون سبب')),tr(item.restocked?'عاد للمخزون':'لم يعد للمخزون'),...(item.historicalAllocation?[tr('توزيع الرصيد من النسخة القديمة')]:[]),tr('المخصوم من دين الفاتورة:')+' '+((item.invoiceAllocations||[]).reduce((sum,allocation)=>sum+allocation.allocatedCentimes,0)/100).toFixed(2)+' DH',...(item.refunds||[]).map(refund=>`${tr('رد نقدي')}: ${(refund.amountCentimes/100).toFixed(2)} DH • ${refund.date}`),tr('رصيد لصالح الزبون:')+' '+((item.unappliedCentimes||0)/100).toFixed(2)+' DH'],item.total,item.date,[undefined,undefined,item.productId]);
  const productDeletionState=useRef({products,stockMovements,sales,purchases,quotes,documents,purchaseDocuments,parkedPosSales,salesReturns,editingProductId});
  productDeletionState.current={products,stockMovements,sales,purchases,quotes,documents,purchaseDocuments,parkedPosSales,salesReturns,editingProductId};
  const requestProductDeletion=(id:number)=>{
    const check=()=>{
      const current=productDeletionState.current;
      const product=current.products.find(row=>row.id===id);
      if(!product)return undefined;
      const block=productDeletionBlock(product,current.stockMovements,[
        current.sales,current.purchases,current.salesReturns,
        current.quotes.flatMap(quote=>quote.lines?.length?quote.lines:[{productName:quote.productName}]),
        current.documents.flatMap(doc=>doc.lines),
        current.purchaseDocuments.flatMap(doc=>doc.lines),
        current.parkedPosSales.flatMap(sale=>sale.cart.lines),
      ]);
      if(block){
        Alert.alert(tr('تعذر حذف المنتج'),block==='stock'?tr('هاد المنتج باقي عندو رصيد فالمخزون.'):tr('هاد المنتج مربوط بسجلات المخزون أو وثائق أو عمليات مسجلة.'));
        return undefined;
      }
      return product;
    };
    const product=check();
    if(!product)return;
    Alert.alert(tr('حذف المنتج؟'),product.name,[{text:tr('إلغاء'),style:'cancel'},{text:tr('حذف'),style:'destructive',onPress:()=>{
      if(!check())return;
      setProducts(rows=>rows.filter(row=>row.id!==id));
      if(productDeletionState.current.editingProductId===id)resetProductForm();
    }}]);
  };
  const stockValue=useMemo(()=>products.reduce((a,p)=>a+p.price*p.qty,0),[products]);
  const potentialStockProfit=useMemo(()=>products.reduce((sum,p)=>sum+(p.price-inventoryAverageProductCost(p.id,p.costPrice||0))*p.qty,0),[products,warehouses,stockMovements]);
  const accountedSales=useMemo(()=>includeInvoicedSales(sales,documents,stockMovements),[sales,documents,stockMovements]);
  const returnableSales=useMemo(()=>accountedSales.map(sale=>sale.sourceKey&&(
    !products.some(product=>product.id===sale.productId)||!warehouses.some(warehouse=>warehouse.id===sale.warehouseId)
  )?{...sale,canRestock:false}:sale),[accountedSales,products,warehouses]);
  const salesReturnTotal=useMemo(()=>salesReturns.reduce((sum,item)=>sum+item.total,0),[salesReturns]);
  const salesTotal=useMemo(()=>accountedSales.reduce((a,x)=>a+x.total,0)-salesReturnTotal,[accountedSales,salesReturnTotal]);
  const purchaseTotal=useMemo(()=>purchases.reduce((a,x)=>a+x.total,0),[purchases]); const expenseTotal=useMemo(()=>expenses.reduce((a,x)=>a+x.amount,0),[expenses]);
  const profitLoss=useMemo(()=>calculateProfitLoss(accountedSales,salesReturns,expenses),[accountedSales,salesReturns,expenses]);
  const reportSales=(appliedReportRange?filterByDateRange(accountedSales,appliedReportRange.from,appliedReportRange.to):accountedSales).filter(item=>matchesReportSearch(appliedReportSearch,item.customerName,item.productName,item.reference,item.id));
  const reportPurchases=(appliedReportRange?filterByDateRange(purchases,appliedReportRange.from,appliedReportRange.to):purchases).filter(item=>matchesReportSearch(appliedReportSearch,item.supplierName,item.productName,item.id));
  const reportExpenses=(appliedReportRange?filterByDateRange(expenses,appliedReportRange.from,appliedReportRange.to):expenses).filter(item=>matchesReportSearch(appliedReportSearch,item.title,item.category,item.id));
  const reportReturns=(appliedReportRange?filterByDateRange(salesReturns,appliedReportRange.from,appliedReportRange.to):salesReturns).filter(item=>matchesReportSearch(appliedReportSearch,item.customerName,item.productName,item.number,item.saleReference,item.id));
  const reportPayments=(appliedReportRange?filterByDateRange(payments,appliedReportRange.from,appliedReportRange.to):payments).filter(item=>matchesReportSearch(appliedReportSearch,item.customerName,item.method,item.note,item.reference,item.id));
  const reportSupplierPayments=(appliedReportRange?filterByDateRange(supplierPayments,appliedReportRange.from,appliedReportRange.to):supplierPayments).filter(item=>matchesReportSearch(appliedReportSearch,item.supplierName,item.method,item.reference,item.id));
  const reportPayrollSettlements=(appliedReportRange?filterByDateRange(payrollSettlements,appliedReportRange.from,appliedReportRange.to):payrollSettlements).filter(item=>matchesReportSearch(appliedReportSearch,item.technicianName,item.method,item.note,item.id));
  const reportPayrollByTechnician=summarizePayrollSettlements(reportPayrollSettlements);
  const reportPayrollPaidCentimes=reportPayrollSettlements.reduce((sum,item)=>sum+item.amountCentimes,0);
  const reportSalesTotal=reportSales.reduce((sum,item)=>sum+item.total,0)-reportReturns.reduce((sum,item)=>sum+item.total,0);
  const reportPurchaseTotal=reportPurchases.reduce((sum,item)=>sum+item.total,0);
  const reportPurchasesBySupplier=summarizePurchasesBySupplier(reportPurchases,reportSupplierPayments);
  const reportExpenseTotal=reportExpenses.reduce((sum,item)=>sum+item.amount,0);
  const reportExpenseCategories=Object.entries(reportExpenses.reduce<Record<string,number>>((totals,item)=>{const category=item.category?.trim()||'غير مصنف';totals[category]=(totals[category]||0)+item.amount;return totals;},{})).sort((a,b)=>b[1]-a[1]);
  const reportProfitLoss=calculateProfitLoss(reportSales,reportReturns,reportExpenses);
  const applyReportRange=()=>{const errors=validateDateRange(reportStart,reportEnd);if(errors.length){Alert.alert(tr('تاريخ غير صالح'),tr(errors[0]));return;}setAppliedReportRange(reportStart.trim()||reportEnd.trim()?{from:reportStart,to:reportEnd}:null);setAppliedReportSearch(reportSearch.trim());};
  const customerBalances=useMemo(()=>calculateCustomerBalances(documents,salesReturns.map(item=>({customerName:item.customerName,unappliedCentimes:item.unappliedCentimes??0})),customers.map(item=>({customerName:item.name,amountCentimes:item.openingBalanceCentimes||0})),payments.filter(item=>(item.openingBalanceAppliedCentimes||0)>0).map(item=>({customerName:item.customerName,amountCentimes:item.openingBalanceAppliedCentimes||0}))),[documents,salesReturns,customers,payments]);
  const supplierLedger=useMemo(()=>supplierAccountLedger(purchases.map(item=>({id:item.id,supplierName:item.supplierName,total:item.total,paidAmount:normalizePurchasePaidAmount(item.total,item.paidAmount),historicalSupplierReturns:item.historicalSupplierReturns})),supplierPayments,suppliers.map(item=>({supplierName:item.name,amountCentimes:item.openingBalanceCentimes||0}))),[purchases,supplierPayments,suppliers]);
  const supplierBalances=supplierLedger.balances;
  const supplierOutstandingTotal=useMemo(()=>supplierBalances.reduce((sum,item)=>sum+item.outstanding,0),[supplierBalances]);
  const payrollRows=useMemo(()=>calculateTechnicianPayroll(projects,technicians,payrollSettlements),[projects,technicians,payrollSettlements]);
  const localToday=new Date();const todayIso=`${localToday.getFullYear()}-${String(localToday.getMonth()+1).padStart(2,'0')}-${String(localToday.getDate()).padStart(2,'0')}`;
  const overdueInvoices=useMemo(()=>documents.filter(item=>item.type==='invoice').flatMap(item=>{const dueCentimes=Math.max(0,Math.round(item.total*100)-(item.paidCentimes||0)-(item.creditedCentimes||0));if(!dueCentimes)return[];const customer=customers.find(contact=>contact.name===item.customerName);const dueDate=tryCalculateDueDate(item.date,item.paymentDelayDays??customer?.paymentDelayDays);return dueDate&&isPastDue(dueDate,todayIso)?[{id:item.id,name:item.customerName,number:item.number,dueDate,amountCentimes:dueCentimes}]:[];}),[documents,customers,todayIso]);
  const overduePurchases=useMemo(()=>purchases.flatMap(item=>{const due=(supplierLedger.dueByPurchase.get(item.id)??0)/100;if(!due)return[];const supplier=suppliers.find(contact=>contact.name===item.supplierName);const dueDate=tryCalculateDueDate(item.date,item.paymentDelayDays??supplier?.paymentDelayDays);return dueDate&&isPastDue(dueDate,todayIso)?[{id:item.id,name:item.supplierName,dueDate,amount:due}]:[];}),[purchases,supplierPayments,suppliers,todayIso]);
  const bankOutflows=useMemo(()=>[...purchases.filter(item=>(item.paidAmount||0)>0).map(item=>({id:item.id,bankAccountId:item.bankAccountId,method:item.paymentMethod||'',amount:item.paidAmount||0,date:item.date,supplierName:item.supplierName})),...expenses.map(item=>({id:item.id,bankAccountId:item.bankAccountId,method:item.paymentMethod||'',amount:item.amount,date:item.date})),...payrollSettlements.map(item=>({id:-item.id,bankAccountId:item.bankAccountId,method:item.method,amount:item.amountCentimes/100,date:item.date,technicianName:item.technicianName}))],[purchases,expenses,payrollSettlements]);
  const bankLedgerEntries=useMemo(()=>buildBankLedgerEntries(bankAccounts,bankTransfers,payments,supplierPayments,bankOutflows),
    [bankAccounts,bankTransfers,payments,supplierPayments,bankOutflows]);
  const selectedBankAccount=bankAccounts.find(account=>account.id===bankTransferAccountId);
  const selectedStatementLines=bankStatementLines.filter(line=>line.bankAccountId===bankTransferAccountId);
  const selectedStatementMatches=useMemo(()=>matchBankStatementLines(selectedStatementLines,bankLedgerEntries),[selectedStatementLines,bankLedgerEntries]);
  const selectedReconciliation=selectedBankAccount?reconcileBankStatement(selectedBankAccount,selectedStatementLines,bankLedgerEntries,selectedStatementMatches):undefined;
  const typedBankClosing=Number(bankStatementClosingBalance.replace(',','.'));
  const displayedBankClosingCentimes=selectedReconciliation?.reportedBalanceCentimes??(bankStatementClosingBalance.trim()&&Number.isFinite(typedBankClosing)?Math.round(typedBankClosing*100):undefined);
  const selectedStatementHistory=bankReconciliationHistory.filter(record=>record.bankAccountId===bankTransferAccountId);
  const selectedSupplierPaymentPurchase=purchases.find(item=>item.id===supplierPaymentPurchaseId);
  const selectedSupplierOpening=suppliers.find(item=>item.id===supplierPaymentOpeningSupplierId);
  const selectedPaymentInvoice=documents.find(item=>item.id===Number(paymentDocument)&&item.type==='invoice');
  const selectedCustomerCreditCentimes=salesReturns.filter(item=>item.customerName===customers.find(customer=>String(customer.id)===paymentCustomer)?.name).reduce((sum,item)=>sum+(item.unappliedCentimes||0),0);
  const cashSources=useMemo(()=>({payments,supplierPayments,purchases,expenses,refunds:salesReturns.flatMap(item=>(item.refunds||[]).map(refund=>({...refund,number:item.number,customerName:item.customerName}))),bankTransfers,payrollSettlements}),[payments,supplierPayments,purchases,expenses,salesReturns,bankTransfers,payrollSettlements]);
  const cashBalanceCentimes=useMemo(()=>calculateCashBalance(cashAccount,cashSources),[cashAccount,cashSources]);
  const refundState=useRef({cash:cashBalanceCentimes,returns:salesReturns});
  useEffect(()=>{refundState.current={cash:cashBalanceCentimes,returns:salesReturns};},[cashBalanceCentimes,salesReturns]);
  const cashRegisterRows=useMemo(()=>buildCashRegisterRows(cashAccount,cashSources),[cashAccount,cashSources]);
  const reportCashRows=(appliedReportRange?filterByDateRange(cashRegisterRows,appliedReportRange.from,appliedReportRange.to):cashRegisterRows).filter(row=>matchesReportSearch(appliedReportSearch,row.description,row.source,row.id));
  const reportBankEntries=(appliedReportRange?filterByDateRange(bankLedgerEntries,appliedReportRange.from,appliedReportRange.to):bankLedgerEntries).filter(entry=>matchesReportSearch(appliedReportSearch,entry.id,entry.description,entry.bankAccountId,bankAccounts.find(account=>account.id===entry.bankAccountId)?.name,entry.amountCentimes));
  const datedStockMovements=stockMovements.map(item=>({...item,date:item.createdAt.slice(0,10)}));
  const reportStockMovements=(appliedReportRange?filterByDateRange(datedStockMovements,appliedReportRange.from,appliedReportRange.to):datedStockMovements).filter(item=>matchesReportSearch(appliedReportSearch,item.productId,products.find(product=>String(product.id)===item.productId)?.name,item.kind,tr(item.kind),warehouses.find(warehouse=>warehouse.id===item.warehouseId)?.name,item.reference,item.transferId,item.stockCountId,item.note));
  const allProjectTimeRows=buildProjectTimeReport(projects);
  const reportProjectTimeRows=(appliedReportRange?filterByDateRange(allProjectTimeRows,appliedReportRange.from,appliedReportRange.to):allProjectTimeRows).filter(item=>matchesReportSearch(appliedReportSearch,item.technician,item.projectName,item.customerName,item.note));
  const reportProjectLaborCost=reportProjectTimeRows.reduce((sum,row)=>sum+row.laborCost,0);
  const reportProjectHours=reportProjectTimeRows.reduce((sum,row)=>sum+row.hours,0);
  const reportTechnicianWork=summarizeTechnicianWork(reportProjectTimeRows);
  const exportCashRegisterCsv=()=>exportCsvFile('HamZa-cash-register',['Date','Direction','Description','Amount DH','Source'],cashRegisterRows.map(row=>[row.date,row.direction==='in'?'In':'Out',row.description,row.amountCentimes/100,row.source]));
  const outstandingForPurchase=(item:Purchase)=>(supplierLedger.dueByPurchase.get(item.id)??0)/100;
  const paidForPurchase=(item:Purchase)=>Math.max(0,normalizePurchasePaidAmount(item.total,item.paidAmount)+supplierPayments.filter(payment=>payment.purchaseId===item.id&&payment.method!=='إشعار دائن').reduce((sum,payment)=>sum+payment.amount,0));
  const dueDateForInvoice=(item:CommercialDocument)=>tryCalculateDueDate(item.date,item.paymentDelayDays??customers.find(contact=>contact.name===item.customerName)?.paymentDelayDays);
  const dueDateForPurchase=(item:Purchase)=>tryCalculateDueDate(item.date,item.paymentDelayDays??suppliers.find(contact=>contact.name===item.supplierName)?.paymentDelayDays);
  const balanceFor=(customerName:string)=>customerBalances.find(x=>x.customerName===customerName);
  const exportCustomerStatement=(customerName:string)=>{
    const balance=balanceFor(customerName);
    const lines=[
      ...documents.filter(item=>item.type==='invoice'&&item.customerName===customerName).map(item=>`${tr('فاتورة')} ${item.number} • ${item.date} • ${tr('المجموع')}: ${item.total.toFixed(2)} DH • ${tr('المدفوع:')} ${((item.paidCentimes||0)/100).toFixed(2)} DH • ${tr('المخصوم من دين الفاتورة:')} ${((item.creditedCentimes||0)/100).toFixed(2)} DH • ${tr('الباقي:')} ${(Math.max(0,Math.round(item.total*100)-(item.paidCentimes||0)-(item.creditedCentimes||0))/100).toFixed(2)} DH`),
      ...sales.filter(item=>item.customerName===customerName&&!item.documentId).map(item=>`${tr('بيع مباشر')} ${item.date} • ${item.productName} × ${item.qty} • ${tr('المجموع')}: ${item.total.toFixed(2)} DH`),
      ...payments.filter(item=>item.customerName===customerName).map(item=>`${tr('أداء')} ${item.date} • ${tr('المبلغ')}: ${item.amount.toFixed(2)} DH • ${tr('طريقة الأداء')}: ${tr(item.method)}${item.bankAccountId?' • '+(bankAccounts.find(account=>account.id===item.bankAccountId)?.name||item.bankAccountId):''}${item.allocations?.length?' • '+tr('موزع على الفواتير:')+' '+item.allocations.map(allocation=>`${documents.find(document=>document.id===allocation.documentId)?.number||allocation.documentId} ${(allocation.amountCentimes/100).toFixed(2)} DH`).join('، '):''}${item.reference?' • '+tr('مرجع الشيك')+': '+item.reference:''}${item.note?' • '+item.note:''}${item.openingBalanceAppliedCentimes?' • '+tr('مخصص للرصيد الافتتاحي:')+' '+(item.openingBalanceAppliedCentimes/100).toFixed(2)+' DH':''}`),
      ...salesReturns.filter(item=>item.customerName===customerName).flatMap(item=>[`${item.number} • ${item.date} • ${item.productName} × ${item.qty} • ${tr('المجموع')}: ${item.total.toFixed(2)} DH • ${tr('المخصوم من دين الفاتورة:')} ${((item.invoiceAllocations||[]).reduce((sum,allocation)=>sum+allocation.allocatedCentimes,0)/100).toFixed(2)} DH${item.unappliedCentimes?' • '+tr('رصيد لصالح الزبون:')+' '+(item.unappliedCentimes/100).toFixed(2)+' DH':''}`,...(item.refunds||[]).map(refund=>`${tr('رد نقدي')} • ${refund.date} • ${(refund.amountCentimes/100).toFixed(2)} DH`)]),
      `${tr('المتبقي على الزبون:')} ${((balance?.outstandingCentimes||0)/100).toFixed(2)} DH`,
      `${tr('الرصيد الافتتاحي:')} ${((customers.find(item=>item.name===customerName)?.openingBalanceCentimes||0)/100).toFixed(2)} DH`,
      `${tr('رصيد لصالح الزبون:')} ${((balance?.customerCreditCentimes||0)/100).toFixed(2)} DH`,
    ];
    exportPdf(language==='FR'?'Relevé client':'كشف حساب الزبون',customerName,lines,(balance?.outstandingCentimes||0)/100);
  };
  const exportSupplierStatement=(supplierName:string)=>{
    const supplierPurchases=purchases.filter(item=>item.supplierName===supplierName);
    const supplierPaymentTotal=supplierPurchases.reduce((sum,item)=>sum+item.total,0);
    const supplier=suppliers.find(item=>item.name===supplierName);
    const accountBalance=supplierBalances.find(item=>item.supplierName===supplierName);
    const supplierDue=accountBalance?.outstanding??0;
    const lines=[
      `${tr('الرصيد الافتتاحي:')} ${((supplier?.openingBalanceCentimes||0)/100).toFixed(2)} DH`,
      ...supplierPayments.filter(payment=>payment.supplierName===supplierName&&payment.openingBalanceAppliedCentimes).map(payment=>`${tr('أداء من الرصيد الافتتاحي')} • ${payment.date} • ${payment.amount.toFixed(2)} DH`),
      ...historicalSupplierInvoices.filter(item=>item.supplierId===String(supplier?.id)).map(item=>
        `${tr('فاتورة مورد من النسخة القديمة')} ${item.number} • ${item.issuedAt.slice(0,10)} • ${tr('المدفوع وقت النقل')}: ${(item.paidCentimes/100).toFixed(2)} DH`),
      ...supplierPurchases.flatMap(item=>[
        `${tr('شراء')} ${item.productName} • ${item.date} • ${tr('المجموع')}: ${item.total.toFixed(2)} DH • ${tr('المدفوع:')} ${paidForPurchase(item).toFixed(2)} DH • ${tr('المتبقي:')} ${outstandingForPurchase(item).toFixed(2)} DH`,
        ...(item.historicalSupplierReturns??[]).map(record=>`${tr('مرتجع مورد من النسخة القديمة')} #${record.id} • ${record.date.slice(0,10)} • ${record.productName} × ${record.qty} • ${(record.amountCentimes/100).toFixed(2)} DH`),
        ...supplierPayments.filter(payment=>payment.purchaseId===item.id).map(payment=>`${tr('دفعة:')} ${payment.date} • ${payment.amount.toFixed(2)} DH • ${tr(payment.method)}${payment.bankAccountId?' • '+(bankAccounts.find(account=>account.id===payment.bankAccountId)?.name||payment.bankAccountId):''}${payment.reference?' • '+payment.reference:''}`),
      ]),
      `${tr('إجمالي المشتريات:')} ${supplierPaymentTotal.toFixed(2)} DH`,
      `${tr('الدين المتبقي:')} ${supplierDue.toFixed(2)} DH`,
      ...((accountBalance?.availableCreditCentimes??0)>0?[`${tr('رصيد دائن عند المورد DH')}: ${((accountBalance?.availableCreditCentimes??0)/100).toFixed(2)}`]:[]),
    ];
    exportPdf(language==='FR'?'Relevé fournisseur':'كشف حساب المورد',supplierName,lines,supplierDue);
  };
  const receivablesTotal=useMemo(()=>customerBalances.reduce((sum,x)=>sum+x.outstandingCentimes,0)/100,[customerBalances]);
  const openInvoiceCount=useMemo(()=>documents.filter(d=>d.type==='invoice'&&(d.total*100-(d.paidCentimes||0)-(d.creditedCentimes||0))>0).length,[documents]);
  const lowStockProducts=useMemo(()=>products.filter(p=>p.qty>0&&p.qty<=5),[products]);
  const outOfStockCount=useMemo(()=>products.filter(p=>p.qty<=0).length,[products]);
  const quoteTotal=useMemo(()=>quotes.reduce((sum,q)=>sum+q.total,0),[quotes]);
  const resetProductForm=()=>{stopProductVoice();setVoiceError(undefined);setName('');setPrice('');setCostPrice('');setQuotePrice('');setInvoicePrice('');setQty('');setProductReference('');setProductBarcode('');setProductCategory('');setProductBrand('');setProductUnit('');setProductVariant('');setPhotoGallery([]);setEditingProductId(null);};
  const startEditProduct=(p:Product)=>{stopProductVoice();setVoiceError(undefined);setEditingProductId(p.id);setName(p.name);setPrice(String(p.price));setCostPrice(String(inventoryAverageProductCost(p.id,p.costPrice||0)));setQuotePrice(p.quotePrice===undefined?'':String(p.quotePrice));setInvoicePrice(p.invoicePrice===undefined?'':String(p.invoicePrice));setQty(String(warehouseStock(stockMovements,String(p.id),activeWarehouseId)));setProductReference(p.reference||'');setProductBarcode(p.barcode||'');setProductCategory(p.category||'');setProductBrand(p.brand||'');setProductUnit(p.unit||'');setProductVariant(p.variant||'');setPhotoGallery(productPhotos(p));};
  const addProduct=()=>{
    const n=Number(price.replace(',','.'));const cost=Number((costPrice||'0').replace(',','.'));const q=Number(qty||'0');
    let quotePriceValue:number|undefined,invoicePriceValue:number|undefined;
    try{quotePriceValue=parseOptionalProductPrice(quotePrice);invoicePriceValue=parseOptionalProductPrice(invoicePrice);}catch(error){Alert.alert(tr('معلومات ناقصة'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));return;}
    const reference=productReference.trim();const barcode=productBarcode.trim();const category=productCategory.trim();const brand=productBrand.trim();const unit=productUnit.trim();const variant=productVariant.trim();
    if(!name.trim()||!price.trim()||!Number.isFinite(n)||n<0||!Number.isFinite(cost)||cost<0||!Number.isFinite(q)||q<0){Alert.alert(tr('معلومات ناقصة'),tr('دخل اسم المنتج وثمن وكمية صحيحين.'));return;}
    const duplicate=products.find(p=>p.id!==editingProductId&&((reference&&p.reference?.toLowerCase()===reference.toLowerCase())||(barcode&&p.barcode===barcode)));
    if(duplicate){Alert.alert(tr('مرجع مستعمل'),tr('المرجع أو الباركود مسجل من قبل عند المنتج: ')+duplicate.name);return;}
    const previousProduct=editingProductId!==null?products.find(p=>p.id===editingProductId):undefined;const previousWarehouseQty=previousProduct?warehouseStock(stockMovements,String(previousProduct.id),activeWarehouseId):0;const nextTotalQty=previousProduct?previousProduct.qty+q-previousWarehouseQty:q;
    const details={name:name.trim(),price:n,quotePrice:quotePriceValue,invoicePrice:invoicePriceValue,costPrice:cost,qty:nextTotalQty,reference:reference||undefined,barcode:barcode||undefined,category:category||undefined,brand:brand||undefined,unit:unit||undefined,variant:variant||undefined,...serializeProductPhotos(photoGallery)};
    if(editingProductId!==null){const previous=products.find(p=>p.id===editingProductId);if(previous&&q!==previousWarehouseQty){setStockMovements(v=>[...v,{id:'product-edit-'+editingProductId+'-'+Date.now(),productId:String(editingProductId),warehouseId:activeWarehouseId,kind:'adjustment',quantity:q-previousWarehouseQty,createdAt:new Date().toISOString(),note:'تعديل كمية المنتج من بطاقة المنتج'}]);}setProducts(v=>v.map(p=>p.id===editingProductId?{...p,...details}:p));Alert.alert(tr('تم التعديل'),tr('تبدلات معلومات المنتج بنجاح.'));}
    else{const id=Date.now();setProducts(v=>[{id,...details},...v]);if(q>0)setStockMovements(v=>[...v,{id:'opening-'+id,productId:String(id),warehouseId:activeWarehouseId,kind:'opening',quantity:q,unitCost:cost,createdAt:new Date().toISOString(),note:'رصيد افتتاحي عند إضافة المنتج'}]);}
    resetProductForm();
  };
  const pickCompanyLogo=async()=>{try{const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted){Alert.alert(tr('إذن الصور مطلوب'),tr('سمح للتطبيق بالوصول للصور لاختيار شعار الشركة.'));return;}const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.45,base64:true});if(result.canceled)return;const asset=result.assets[0];if(!asset.base64){Alert.alert(tr('تعذر تحميل الصورة'),tr('اختار صورة أخرى.'));return;}updateCompanyProfile('logoData','data:image/jpeg;base64,'+asset.base64);}catch{Alert.alert(tr('خطأ'),tr('ما قدرناش نختارو الصورة.'));}};
  const pickProductPhoto=async()=>{if(photoGallery.length>=4){Alert.alert(tr('صور المنتج'),tr('الحد الأقصى أربع صور للمنتج.'));return;}try{const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted){Alert.alert(tr('إذن الصور مطلوب'),tr('سمح للتطبيق بالوصول للصور لاختيار صورة المنتج.'));return;}const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.55,base64:true});if(result.canceled)return;const asset=result.assets[0];if(!asset.base64){Alert.alert(tr('تعذر تحميل الصورة'),tr('اختار صورة أخرى.'));return;}setPhotoGallery(current=>appendProductPhoto(current,'data:image/jpeg;base64,'+asset.base64));}catch{Alert.alert(tr('خطأ'),tr('ما قدرناش نختارو الصورة.'));}};
  const productImportMessage=(error:unknown)=>{
    const reasons:Record<string,string>={
      product_import_format:'ملف المنتجات ماشي فصيغة CSV أو TSV صحيحة.',
      product_import_headers:'العناوين خاص فيها اسم المنتج وثمن البيع بلا تكرار.',
      product_import_size_or_encoding:'استعمل ملف نصي UTF-8 أقل من 1 ميغابايت.',
      product_import_too_many_rows:'قسم اللائحة لأجزاء ما يفوتوش 2000 سطر.',
    };
    return tr(reasons[error instanceof Error?error.message:'']||'ما قدرناش نقراو ملف المنتجات.');
  };
  const openProductImport=(source:string,filename?:string)=>{
    try{
      const preview=previewProductImport(source,products);
      if(!preview.accepted.length&&!preview.rejected.length){Alert.alert(tr('ما كايناش بيانات'),tr('لائحة المنتجات فارغة'));return;}
      setProductImport({source,preview,warehouseId:activeWarehouseId,filename});
    }catch(error){Alert.alert(tr('تعذر استيراد المنتجات'),productImportMessage(error));}
  };
  const pickProductImport=async()=>{
    if(productImportOpen.current)return;
    productImportOpen.current=true;setProductImportBusy(true);
    try{
      const picked=await DocumentPicker.getDocumentAsync({type:['text/csv','text/tab-separated-values','text/plain','application/vnd.ms-excel','application/octet-stream'],copyToCacheDirectory:true,multiple:false});
      if(picked.canceled||!picked.assets.length)return;
      const {name,uri,size}=picked.assets[0];
      if(!/\.(csv|tsv|txt)$/i.test(name))throw new Error('product_import_format');
      const measured=size??(await FileSystem.getInfoAsync(uri));
      const bytes=typeof measured==='number'?measured:measured.exists?measured.size:undefined;
      if(!Number.isFinite(bytes)||bytes!>MAX_PRODUCT_IMPORT_BYTES)throw new Error('product_import_size_or_encoding');
      const source=await FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.UTF8});
      openProductImport(source,name);
    }catch(error){Alert.alert(tr('تعذر استيراد المنتجات'),productImportMessage(error));}
    finally{productImportOpen.current=false;setProductImportBusy(false);}
  };
  const importProductIssue=(code:ProductImportPreview['rejected'][number]['code'])=>({
    missing_name:tr('اسم المنتج ناقص'),invalid_number:tr('ثمن أو كمية غير صالحة'),duplicate:tr('مرجع أو باركود مكرر'),
    column_count:tr('عدد الخانات ما مطابقش'),unsupported_text:tr('نص طويل أو ترميز غير مدعوم'),
  }[code]);
  const confirmProductImport=()=>{
    const staged=productImport;
    if(!staged||!staged.preview.accepted.length)return;
    if(!warehouses.some(warehouse=>warehouse.id===staged.warehouseId&&warehouse.active)){
      setProductImport(undefined);Alert.alert(tr('تعذر استيراد المنتجات'),tr('اختار مخزناً نشيطاً وعاود المعاينة.'));return;
    }
    try{
      const fresh=previewProductImport(staged.source,products);
      if(JSON.stringify(fresh)!==JSON.stringify(staged.preview)){
        setProductImport({...staged,preview:fresh});
        Alert.alert(tr('تبدلات نتائج المعاينة'),tr('راجع اللائحة الجديدة قبل التأكيد.'));return;
      }
      const firstId=products.reduce((id,product)=>Math.max(id,product.id+1),Date.now());
      const imported:Product[]=fresh.accepted.map(({product},index)=>({id:firstId+index,...product}));
      const timestamp=new Date().toISOString();
      const movements:StockMovement[]=imported.filter(p=>p.qty>0).map(p=>({id:'opening-'+p.id,productId:String(p.id),warehouseId:staged.warehouseId,kind:'opening',quantity:p.qty,unitCost:p.costPrice,createdAt:timestamp,note:'رصيد افتتاحي من الاستيراد الجماعي'}));
      setProducts(current=>[...imported,...current]);setStockMovements(current=>[...current,...movements]);
      setProductImport(undefined);if(!staged.filename)setProductBulkText('');
      Alert.alert(tr('تم الاستيراد'),tr('منتجات تزادو')+': '+imported.length);
    }catch(error){Alert.alert(tr('تعذر استيراد المنتجات'),productImportMessage(error));}
  };
  const exportCsvFile=async(filename:string,headers:CsvCell[],rows:CsvCell[][])=>{
    try{
      const directory=FileSystem.cacheDirectory;
      if(!directory)throw new Error('cache unavailable');
      const uri=`${directory}${filename}-${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(uri,buildCsv(headers,rows),{encoding:FileSystem.EncodingType.UTF8});
      if(!await Sharing.isAvailableAsync())throw new Error('sharing unavailable');
      await Sharing.shareAsync(uri,{mimeType:'text/csv',dialogTitle:tr('مشاركة ملف CSV')});
    }catch{
      Alert.alert(tr('تعذر التصدير'),tr('ما قدرناش نشاركوا ملف CSV.'));
    }
  };
  const exportXlsxFile=async(filename:string,sheets:XlsxSheet[])=>{
    try{
      const directory=FileSystem.cacheDirectory;
      if(!directory)throw new Error('cache unavailable');
      const uri=`${directory}${filename}-${Date.now()}.xlsx`;
      const base64=await buildXlsx(sheets);
      await FileSystem.writeAsStringAsync(uri,base64,{encoding:FileSystem.EncodingType.Base64});
      if(!await Sharing.isAvailableAsync())throw new Error('sharing unavailable');
      await Sharing.shareAsync(uri,{mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',dialogTitle:tr('مشاركة ملف Excel')});
    }catch{
      Alert.alert(tr('تعذر التصدير'),tr('ما قدرناش نشاركوا ملف Excel.'));
    }
  };
  const exportProductsCsv=()=>exportCsvFile('HamZa-products',
    ['Nom','Référence','Code-barres','Catégorie','Prix achat DH','Prix vente DH','Prix devis DH','Prix facture DH','Quantité','Marque','Unité','Modèle'],
    productsForExport.map(p=>[p.name,p.reference||'',p.barcode||'',p.category||'',p.costPrice||0,p.price,p.quotePrice??'',p.invoicePrice??'',p.qty,p.brand||'',p.unit||'',p.variant||'']));
  const exportSalesCsv=()=>exportCsvFile('HamZa-sales',
    ['Date','Produit','Client','Quantité','Prix unitaire DH','Total DH'],
    accountedSales.map(item=>[item.date,item.productName,item.customerName,item.qty,item.unitPrice,item.total]));
  const exportBusinessLedger=()=>exportCsvFile('HamZa-business-ledger',BUSINESS_LEDGER_HEADERS,
    buildBusinessLedgerRows({products:productsForExport,sales:accountedSales,returns:salesReturns,purchases,expenses,payments,supplierPayments,bankTransfers,receivables:customerBalances}));
  const exportProductsXlsx=()=>exportXlsxFile('HamZa-products',[{name:'Produits',headers:['Nom','Référence','Code-barres','Catégorie','Prix achat DH','Prix vente DH','Prix devis DH','Prix facture DH','Quantité','Marque','Unité','Modèle'],rows:productsForExport.map(p=>[p.name,p.reference||'',p.barcode||'',p.category||'',p.costPrice||0,p.price,p.quotePrice??'',p.invoicePrice??'',p.qty,p.brand||'',p.unit||'',p.variant||''])}]);
  const exportSalesXlsx=()=>exportXlsxFile('HamZa-sales',[{name:'Ventes',headers:['Date','Produit','Client','Quantité','Prix unitaire DH','Total DH'],rows:accountedSales.map(item=>[item.date,item.productName,item.customerName,item.qty,item.unitPrice,item.total])}]);
  const exportBusinessLedgerXlsx=()=>exportXlsxFile('HamZa-business-ledger',[{name:'Registre',headers:BUSINESS_LEDGER_HEADERS,rows:buildBusinessLedgerRows({products:productsForExport,sales:accountedSales,returns:salesReturns,purchases,expenses,payments,supplierPayments,bankTransfers,receivables:customerBalances})}]);
  const exportCashRegisterXlsx=()=>exportXlsxFile('HamZa-cash-register',[{name:'Caisse',headers:['Date','Direction','Description','Amount DH','Source'],rows:cashRegisterRows.map(row=>[row.date,row.direction==='in'?'In':'Out',row.description,row.amountCentimes/100,row.source])}]);
  const detailedReport=():DetailReport=>{
    const searchLabel=tr('بحث التقرير')+': '+(appliedReportSearch||tr('الكل'));
    const period=appliedReportRange?`${appliedReportRange.from||'—'} → ${appliedReportRange.to||'—'}`:tr('كل الفترات');
    const context=`${tr('الفترة')}: ${period} • ${searchLabel}`;
    const amount=tr('المبلغ DH');
    if(detailMode==='sales'){
      const rows=orderDatedReport([
        ...reportSales.map(value=>({date:value.date,kind:tr('بيع'),contact:value.customerName,product:value.productName,ref:value.reference??value.id,qty:value.qty,amount:value.total})),
        ...reportReturns.map(value=>({date:value.date,kind:tr('إشعار دائن للزبون'),contact:value.customerName,product:value.productName,ref:value.number,qty:-value.qty,amount:-value.total})),
      ]);
      return {title:tr('المبيعات'),context,headers:[tr('التاريخ'),tr('نوع الحركة'),tr('الزبون'),tr('المنتج'),tr('المرجع'),tr('الكمية'),amount],
        rows:rows.map(row=>[row.date,row.kind,row.contact,row.product,row.ref,row.qty,row.amount]),
        summary:[[tr('المبيعات الصافية'),moneyReportTotal(rows.map(row=>row.amount)).toFixed(2)+' DH']]};
    }
    if(detailMode==='purchases'){
      const rows=orderDatedReport(reportPurchases);
      return {title:tr('المشتريات'),context,headers:[tr('التاريخ'),tr('المورد'),tr('المنتج'),tr('المرجع'),tr('الكمية'),amount,tr('الأداء عند الشراء')+' DH'],
        rows:rows.map(item=>[item.date,item.supplierName,item.productName,item.id,item.qty,item.total,item.paidAmount===undefined?'':normalizePurchasePaidAmount(item.total,item.paidAmount)]),
        summary:[[tr('إجمالي المشتريات:'),moneyReportTotal(rows.map(item=>item.total)).toFixed(2)+' DH']]};
    }
    if(detailMode==='stock'){
      // A restored backup may no longer have the warehouse selected before restore.
      const selectedWarehouse=warehouses.find(item=>item.id===detailWarehouse);
      const rows=buildStockDetail(reportStockMovements,selectedWarehouse?.id||'');
      const names=new Map(products.map(item=>[String(item.id),item.name]));
      const places=new Map(warehouses.map(item=>[item.id,item.name]));
      return {title:tr('المخزون'),context:`${context} • ${tr('المخزن')}: ${selectedWarehouse?.name||tr('كل المخازن')}`,
        headers:[tr('التاريخ'),tr('نوع الحركة'),tr('المنتج'),tr('المخزن'),tr('الكمية الموقعة'),tr('تكلفة الوحدة DH'),tr('المرجع'),tr('ملاحظة')],
        rows:rows.map(item=>[item.date,tr(item.kind),names.get(item.productId)||item.productId,places.get(item.warehouseId)||item.warehouseId,item.signedQuantity,item.unitCost??'',item.reference||item.transferId||item.stockCountId||'',item.note||'']),
        summary:[[tr('عدد الحركات'),rows.length]]};
    }
    if(detailMode==='cash'){
      const rows=buildCashDetail(reportCashRows,detailCashDirection);
      const net=rows.reduce((sum,row)=>sum+(row.source==='opening'?0:row.signedCentimes),0);
      const direction=detailCashDirection==='in'?tr('داخل'):detailCashDirection==='out'?tr('خارج'):tr('الكل');
      return {title:tr('الصندوق'),context:`${context} • ${tr('نوع الحركة')}: ${direction}`,
        headers:[tr('التاريخ'),tr('نوع الحركة'),tr('الوصف'),amount],
        rows:rows.map(row=>[row.date,row.source==='opening'?tr('الرصيد الافتتاحي'):row.direction==='in'?tr('داخل'):tr('خارج'),row.description,row.signedCentimes/100]),
        summary:[[tr('صافي الحركات بلا الرصيد الافتتاحي'),(net/100).toFixed(2)+' DH']]};
    }
    const balanceContext=`${tr('الرصيد الحالي ما مرتبطش بالفترة.') } • ${searchLabel}`;
    const dueLabel=tr('المبلغ المتبقي DH');
    if(detailMode==='receivables'){
      const rows=selectOpenBalances(customerBalances,appliedReportSearch,item=>item.customerName,item=>item.outstandingCentimes);
      return {title:tr('ديون الزبناء'),context:balanceContext,headers:[tr('الزبون'),dueLabel,tr('رصيد غير مستعمل للزبون DH')],
        rows:rows.map(item=>[item.customerName,item.outstandingCentimes/100,item.customerCreditCentimes/100]),
        summary:[[tr('إجمالي المبالغ المتبقية:'),(rows.reduce((sum,row)=>sum+row.outstandingCentimes,0)/100).toFixed(2)+' DH']]};
    }
    const rows=selectOpenBalances(supplierBalances,appliedReportSearch,item=>item.supplierName,item=>item.outstanding+(item.availableCreditCentimes??0)/100);
    return {title:tr('ديون الموردين'),context:balanceContext,headers:[tr('المورد'),dueLabel,tr('رصيد دائن عند المورد DH')],
      rows:rows.map(item=>[item.supplierName,item.outstanding,(item.availableCreditCentimes??0)/100]),
      summary:[[tr('إجمالي المبالغ المتبقية:'),moneyReportTotal(rows.map(row=>row.outstanding)).toFixed(2)+' DH']]};
  };
  const exportDetailReport=async(report:DetailReport,format:'CSV'|'XLSX'|'PDF'|'print')=>{
    const filename='HamZa-report-'+detailMode;
    if(format==='CSV')return exportCsvFile(filename,report.headers,report.rows);
    if(format==='XLSX')return exportXlsxFile(filename,[
      {name:tr('تفاصيل التقارير'),headers:report.headers,rows:report.rows},
      {name:tr('الفلاتر والمجاميع'),headers:[tr('الوصف'),tr('القيمة')],rows:[[report.title,report.context],...report.summary.map(row=>[...row])]},
    ]);
    try{
      const html=buildDetailReportHtml(language,companyProfile.name,report,tr('ما كايناش بيانات بهاد الاختيار.'));
      if(format==='print'){await Print.printAsync({html});return;}
      if(!await Sharing.isAvailableAsync())throw new Error('sharing unavailable');
      const file=await Print.printToFileAsync({html});
      await Sharing.shareAsync(file.uri,{mimeType:'application/pdf',dialogTitle:report.title});
    }catch{Alert.alert(tr('تعذر التصدير'),tr('ما قدرناش نشاركوا أو نطبعوا هاد التقرير.'));}
  };
  const renderDetailReport=()=>{
    const report=detailedReport();
    return <ReportDetailsWorkspace key={JSON.stringify([appliedReportRange,appliedReportSearch])}
      tr={tr} mode={detailMode} setMode={setDetailMode} report={report}
      warehouse={warehouses.some(item=>item.id===detailWarehouse)?detailWarehouse:''} setWarehouse={setDetailWarehouse} warehouses={warehouses}
      cashDirection={detailCashDirection} setCashDirection={setDetailCashDirection} onShare={format=>void exportDetailReport(report,format)}
      onPrint={()=>void exportDetailReport(report,'print')}/>;
  };
  const reportDetailHeaders:CsvCell[]=['Date','Type','Contact','Description','Quantité','Montant DH'];
  const reportDetailRows:CsvCell[][]=[...buildActivityReportRows({sales:reportSales,returns:reportReturns,purchases:reportPurchases,expenses:reportExpenses,customerPayments:reportPayments,supplierPayments:reportSupplierPayments}),...reportProjectTimeRows.map(item=>[item.date,tr('ساعات مشروع'),`${item.projectName}${item.customerName?' • '+item.customerName:''}`,`${item.technician}${item.note?' • '+item.note:''}`,item.hours,item.laborCost]),...reportPayrollSettlements.map(item=>[item.date,tr('أداء أجرة تقني'),item.technicianName,[tr(item.method),item.note||''].filter(Boolean).join(' • '),'',-item.amountCentimes/100])];
  const exportActivityReportCsv=()=>exportCsvFile('HamZa-activity-report',reportDetailHeaders,reportDetailRows);
  const exportActivityReportXlsx=()=>exportXlsxFile('HamZa-activity-report',[
    {name:'Résumé',headers:['Indicateur','Valeur'],rows:[[tr('الفترة'),appliedReportRange?`${appliedReportRange.from||'—'} → ${appliedReportRange.to||'—'}`:tr('كل الفترات')],[tr('بحث التقرير'),appliedReportSearch||tr('الكل')],[tr('المبيعات الصافية'),reportSalesTotal],[tr('المشتريات'),reportPurchaseTotal],[tr('المصاريف'),reportExpenseTotal],[tr('أداءات أجور التقنيين فالفترة:'),reportPayrollPaidCentimes/100],...reportPayrollByTechnician.map(item=>[item.technicianName,item.paidCentimes/100] as (string|number)[]),...reportExpenseCategories.map(([category,value])=>[`${tr('المصاريف حسب التصنيف')}: ${category}`,value] as (string|number)[]),[tr('تحصيلات الزبناء فالفترة'),reportPayments.reduce((sum,item)=>sum+item.amount,0)],[tr('أداءات الموردين فالفترة'),reportSupplierPayments.filter(item=>item.method!=='إشعار دائن').reduce((sum,item)=>sum+item.amount,0)],[tr('صافي حركة الصندوق فالفترة:'),reportCashRows.reduce((sum,row)=>sum+(row.direction==='in'?row.amountCentimes:-row.amountCentimes),0)/100],[tr('صافي حركة الحسابات البنكية فالفترة:'),reportBankEntries.reduce((sum,entry)=>sum+entry.amountCentimes,0)/100],[tr('حركات المخزون فالفترة:'),reportStockMovements.length],[tr('تكلفة أجور المشاريع فالفترة:'),reportProjectLaborCost],[tr('ساعات العمل فالفترة:'),reportProjectHours],...reportTechnicianWork.map(item=>[`${tr('ملخص عمل التقني')}: ${item.technician} (${item.hours} ${tr('ساعة')}، ${item.projectCount} ${tr('مشروع')})`,item.laborCostCentimes/100] as (string|number)[]),[tr('ديون الزبناء الحالية'),receivablesTotal],[tr('ديون الموردين الحالية'),supplierOutstandingTotal],[tr('الرصيد الحالي:'),cashBalanceCentimes/100],[tr('تكلفة المبيعات'),reportProfitLoss.costOfGoodsSold],[tr('هامش الربح'),reportProfitLoss.grossProfitOnCostedSales],[tr('النتيجة'),reportProfitLoss.netProfitOnCostedSales]]},
    {name:'Détails',headers:reportDetailHeaders,rows:reportDetailRows},
    {name:tr('مقارنة الموردين'),headers:[tr('المورد'),tr('عدد المشتريات'),tr('الكمية'),tr('المشتريات')+' DH',tr('الأداء عند الشراء')+' DH',tr('تسويات الفترة')+' DH',tr('إشعارات دائنة')+' DH'],rows:reportPurchasesBySupplier.map(item=>[item.supplierName,item.purchaseCount,item.quantityMilliUnits/1000,item.purchaseTotalCentimes/100,item.paidAtPurchaseCentimes/100,item.cashSettledCentimes/100,item.creditNoteCentimes/100])},
    {name:tr('الصندوق'),headers:[tr('التاريخ'),tr('نوع الحركة'),tr('الوصف'),tr('المبلغ DH'),tr('المصدر')],rows:reportCashRows.map(row=>[row.date,tr(row.direction==='in'?'داخل':'خارج'),row.description,(row.direction==='in'?1:-1)*row.amountCentimes/100,row.source])},
    {name:tr('الحسابات البنكية والتحويلات'),headers:[tr('التاريخ'),tr('الحساب'),tr('نوع الحركة'),tr('المرجع'),tr('المبلغ DH')],rows:reportBankEntries.map(entry=>{const transfer=bankTransfers.find(item=>item.id===entry.id);const account=bankAccounts.find(item=>item.id===entry.bankAccountId);const kind=entry.id.startsWith('customer-payment-')?'تحصيل زبون':entry.id.startsWith('supplier-payment-')?'أداء مورد':entry.id.startsWith('bank-outflow-')?'شراء أو مصروف بنكي':transfer?.direction==='cash_to_bank'?'تحويل من الصندوق للبنك':'تحويل من البنك للصندوق';return [entry.date,account?.name||entry.bankAccountId,tr(kind),transfer?.description||entry.id,entry.amountCentimes/100];})},
    {name:tr('المخزون'),headers:[tr('التاريخ'),tr('نوع الحركة'),tr('المنتج'),tr('المخزن'),tr('الكمية الموقعة'),tr('تكلفة الوحدة DH'),tr('المرجع'),tr('ملاحظة')],rows:reportStockMovements.map(item=>{const sign=item.kind==='sale'||item.kind==='return_out'||item.kind==='transfer_out'?-1:1;const quantity=item.kind==='adjustment'?item.quantity:sign*Math.abs(item.quantity);return [item.date,tr(item.kind),products.find(product=>String(product.id)===item.productId)?.name||item.productId,warehouses.find(warehouse=>warehouse.id===item.warehouseId)?.name||item.warehouseId,quantity,item.unitCost??'',item.reference||item.transferId||item.stockCountId||'',item.note||''];})},
    {name:tr('وقت المشاريع'),headers:[tr('التاريخ'),tr('المشروع'),tr('الزبون'),tr('التقني'),tr('الساعات'),tr('أجرة الساعة DH'),tr('تكلفة الأجور'),tr('ملاحظة')],rows:reportProjectTimeRows.map(item=>[item.date,item.projectName,item.customerName,item.technician,item.hours,item.hourlyRate,item.laborCost,item.note])},
    {name:tr('أجور التقنيين'),headers:[tr('التاريخ'),tr('التقني'),tr('طريقة الأداء'),tr('المبلغ DH'),tr('ملاحظة')],rows:reportPayrollSettlements.map(item=>[item.date,item.technicianName,tr(item.method),item.amountCentimes/100,item.note||''])},
    {name:'Créances',headers:['Client','Factures DH','Payé DH','Avoirs DH','Dû DH','Crédit DH'],rows:customerBalances.map(item=>[item.customerName,item.totalCentimes/100,item.paidCentimes/100,item.creditedCentimes/100,item.outstandingCentimes/100,item.customerCreditCentimes/100])},
    {name:'Dettes',headers:['Fournisseur','Achats DH','Payé DH','Solde initial DH','Solde initial payé DH','Dû DH','Crédit fournisseur DH'],rows:supplierBalances.map(item=>[item.supplierName,item.total,item.paid,item.openingBalanceCentimes/100,item.openingBalancePaidCentimes/100,item.outstanding,(item.availableCreditCentimes??0)/100])},
  ]);
  const addCustomer=()=>{
    if(!customer.trim()){Alert.alert(tr('معلومات ناقصة'),tr('دخل اسم الزبون.'));return;}
    let terms;let openingBalanceCentimes:number|undefined;
    try{terms=normalizeCreditTerms(customerCreditLimit,customerPaymentDays);if(editingCustomerId===null)openingBalanceCentimes=normalizeOpeningBalanceCentimes(customerOpeningBalance);}catch(error){Alert.alert(tr('معلومات غير صالحة'),error instanceof Error?tr(error.message):tr('راجع المعلومات.'));return;}
    const value={name:customer.trim(),phone:customerPhone.trim(),whatsapp:customerWhatsapp.trim(),address:customerAddress.trim(),ice:customerIce.trim(),rc:customerRc.trim(),ifNumber:customerIf.trim(),...terms,...(openingBalanceCentimes===undefined?{}:{openingBalanceCentimes})};
    if(editingCustomerId!==null){const previous=customers.find(item=>item.id===editingCustomerId);if(previous&&previous.name!==value.name){setSales(items=>items.map(item=>item.customerName===previous.name?{...item,customerName:value.name}:item));setQuotes(items=>items.map(item=>item.customerName===previous.name?{...item,customerName:value.name}:item));setPayments(items=>items.map(item=>item.customerName===previous.name?{...item,customerName:value.name}:item));setDocuments(items=>items.map(item=>item.customerName===previous.name?{...item,customerName:value.name}:item));setProjects(items=>items.map(item=>item.customerName===previous.name?{...item,customerName:value.name}:item));setSalesReturns(items=>items.map(item=>item.customerName===previous.name?{...item,customerName:value.name}:item));}setCustomers(items=>items.map(item=>item.id===editingCustomerId?{...item,...value}:item));}
    else setCustomers(items=>[{id:Date.now(),...value},...items]);
    setEditingCustomerId(null);setCustomer('');setCustomerPhone('');setCustomerWhatsapp('');setCustomerAddress('');setCustomerIce('');setCustomerRc('');setCustomerIf('');setCustomerCreditLimit('');setCustomerPaymentDays('');setCustomerOpeningBalance('');
  };
  const removeCustomer=(contact:Customer)=>{if(!canDeleteCustomer(contact.name,contact.openingBalanceCentimes,[sales,quotes,payments,documents,projects,salesReturns])){Alert.alert(tr('تعذر حذف الزبون'),tr('ما يمكنش حذف زبون عندو معاملات؛ استعمل تعديل الاسم باش يبقى كشف الحساب محفوظ.'));return;}setCustomers(items=>items.filter(item=>item.id!==contact.id));};
  const removeSupplier=(contact:Supplier)=>{if(!canDeleteSupplier(contact.name,contact.openingBalanceCentimes,[purchases,supplierPayments])){Alert.alert(tr('تعذر حذف المورد'),tr('ما يمكنش حذف مورد عندو معاملات؛ استعمل تعديل الاسم باش يبقى كشف الحساب محفوظ.'));return;}setSuppliers(items=>items.filter(item=>item.id!==contact.id));};
  const addSale=()=>{const p=products.find(x=>String(x.id)===saleProduct);const c=customers.find(x=>String(x.id)===saleCustomer);const q=Number(saleQty);if(!p||!c||!Number.isInteger(q)||q<1){Alert.alert(tr('معلومات ناقصة'),tr('اختار منتج وزبون ودخل كمية صحيحة.'));return;}const available=warehouseStock(stockMovements,String(p.id),activeWarehouseId);if(q>available){Alert.alert(tr('المخزون غير كافٍ'),`${tr('المتوفر في المخزن المحدد هو')} ${available}.`);return;}const bankAccount=salePaymentMethod==='نقداً'?undefined:bankAccounts.find(item=>item.id===saleBankAccountId);if(salePaymentMethod!=='نقداً'&&!bankAccount){Alert.alert(tr('معلومات ناقصة'),tr('اختار الحساب البنكي للتحويل.'));return;}const sale:Sale={id:Date.now(),productId:p.id,warehouseId:activeWarehouseId,productName:p.name,customerName:c.name,qty:q,unitPrice:p.price,unitCost:averageInventoryUnitCost(stockMovements,String(p.id),activeWarehouseId)??inventoryAverageProductCost(p.id,p.costPrice||0),total:q*p.price,date:new Date().toLocaleDateString('fr-MA'),paymentMethod:salePaymentMethod,...(bankAccount?{bankAccountId:bankAccount.id}:{})};setSales(v=>[sale,...v]);setPayments(current=>[{id:sale.id,customerName:c.name,amount:sale.total,method:salePaymentMethod,date:sale.date,note:'بيع مباشر',...(bankAccount?{bankAccountId:bankAccount.id}:{})},...current]);setProducts(v=>v.map(x=>x.id===p.id?{...x,qty:x.qty-q}:x));setStockMovements(v=>[...v,{id:'sale-'+sale.id,productId:String(p.id),warehouseId:activeWarehouseId,kind:'sale',quantity:q,createdAt:new Date().toISOString(),reference:String(sale.id),note:'بيع مباشر'}]);setSaleQty('1');Alert.alert(tr('تم تسجيل البيع'),`المجموع: ${sale.total.toFixed(2)} DH`);};
  const addSupplier=()=>{
    if(!supplierName.trim()){Alert.alert(tr('معلومات ناقصة'),tr('دخل اسم المورد.'));return;}
    let terms;
    try{terms=normalizeCreditTerms(supplierCreditLimit,supplierPaymentDays);}catch(error){Alert.alert(tr('معلومات غير صالحة'),error instanceof Error?tr(error.message):tr('راجع المعلومات.'));return;}
    const openingAmount=Number(supplierOpeningBalance.replace(',','.'));const openingCentimes=Math.round(openingAmount*100);
    if(editingSupplierId===null&&supplierOpeningBalance.trim()&&(!Number.isFinite(openingAmount)||openingAmount<0||!Number.isSafeInteger(openingCentimes))){Alert.alert(tr('معلومات غير صالحة'),tr('رصيد افتتاحي للمورد غير صالح.'));return;}
    const value={name:supplierName.trim(),phone:supplierPhone.trim(),whatsapp:supplierWhatsapp.trim(),address:supplierAddress.trim(),ice:supplierIce.trim(),rc:supplierRc.trim(),ifNumber:supplierIf.trim(),...terms,...(editingSupplierId===null?{openingBalanceCentimes:openingCentimes}: {})};
    if(editingSupplierId!==null){const previous=suppliers.find(item=>item.id===editingSupplierId);if(previous&&previous.name!==value.name){setPurchases(items=>items.map(item=>item.supplierName===previous.name?{...item,supplierName:value.name}:item));setSupplierPayments(items=>items.map(item=>item.supplierName===previous.name?{...item,supplierName:value.name}:item));}setSuppliers(items=>items.map(item=>item.id===editingSupplierId?{...item,...value}:item));}
    else setSuppliers(items=>[{id:Date.now(),...value},...items]);
    setEditingSupplierId(null);setSupplierName('');setSupplierPhone('');setSupplierWhatsapp('');setSupplierAddress('');setSupplierIce('');setSupplierRc('');setSupplierIf('');setSupplierCreditLimit('');setSupplierPaymentDays('');setSupplierOpeningBalance('');
  };
  const addPurchase=()=>{const p=products.find(x=>String(x.id)===purchaseProduct);const sup=suppliers.find(x=>String(x.id)===purchaseSupplier);const q=Number(purchaseQty),cost=Number(purchaseCost.replace(',','.')),paid=Number(purchasePaidNow.replace(',','.'));try{if(!p||!sup)throw new Error('راجع كمية الشراء والثمن والمبلغ المؤدى.');const bank=paid>0&&(purchasePaidMethod==='بطاقة'||purchasePaidMethod==='تحويل')?bankAccounts.find(item=>item.id===purchaseBankAccountId):undefined;const item=preparePurchaseEntry({id:Date.now(),product:{id:p.id,name:p.name,qty:p.qty},supplier:{name:sup.name,creditLimitCentimes:sup.creditLimitCentimes,paymentDelayDays:sup.paymentDelayDays},quantity:q,unitCost:cost,paidAmount:paid,method:purchasePaidMethod,warehouseId:activeWarehouseId,date:new Date().toLocaleDateString('fr-MA'),createdAt:new Date().toISOString(),currentSupplierDebtCentimes:Math.round((supplierBalances.find(row=>row.supplierName===sup.name)?.outstanding||0)*100),...(bank?{bankAccountId:bank.id,bankBalanceCentimes:calculateBankBalance(bank,bankTransfers,payments,supplierPayments,bankOutflows)}:{})});const purchaseRecord={...item.purchase,productId:String(p.id),warehouseId:activeWarehouseId};setPurchases(v=>[purchaseRecord,...v]);setProducts(v=>v.map(x=>x.id===p.id?{...x,qty:item.newProductQuantity}:x));setStockMovements(v=>[...v,item.movement]);setPurchaseQty('1');setPurchaseCost('');setPurchasePaidNow('0');setPurchaseBankAccountId('');Alert.alert(tr('تم تسجيل الشراء'),`${tr('المجموع')}: ${item.purchase.total.toFixed(2)} DH • ${tr('الباقي للمورد')}: ${((item.totalCentimes-item.paidCentimes)/100).toFixed(2)} DH`);}catch(error){const message=error instanceof Error?error.message:'راجع البيانات وحاول من جديد.';const title=message==='تجاوز سقف الدين'?'تجاوز سقف الدين':message==='المبلغ أكبر من رصيد الحساب البنكي المتوفر.'?'تعذر تسجيل الشراء':'معلومات ناقصة';Alert.alert(tr(title),tr(message));}};
  const createPurchaseOrderDocument=(input:{kind:'request'|'order';supplierId:string;lines:PurchaseLine[];globalDiscount:number}):boolean=>{try{const doc=createPurchaseDocument({id:`po-${Date.now()}`,number:`PO-${Date.now()}`,kind:input.kind,supplierId:input.supplierId,lines:input.lines,globalDiscount:input.globalDiscount,createdAt:new Date().toISOString()},purchaseDocuments);setPurchaseDocuments(current=>[doc,...current]);return true;}catch(error){Alert.alert(tr('تعذر إنشاء وثيقة الشراء'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));return false;}};
  const createSpecialPurchaseDocument=(input:{kind:'supplier_invoice'|'supplier_credit';supplierId:string;sourceDocumentId:string;lines:PurchaseLine[];physicalReturn?:boolean;warehouseId?:string}):boolean=>{try{const purchase=purchases.find(item=>String(item.id)===input.sourceDocumentId);if(!purchase||purchase.supplierName!==suppliers.find(item=>String(item.id)===input.supplierId)?.name)throw new Error('اختار عملية شراء صالحة من نفس المورد.');if(input.kind==='supplier_invoice'&&purchaseDocuments.some(item=>item.kind==='supplier_invoice'&&item.sourceDocumentId===input.sourceDocumentId&&item.status!=='cancelled'))throw new Error('كاينة فاتورة مسجلة لهاد الشراء من قبل.');if(input.physicalReturn&&(!purchase.productId||!input.warehouseId||!warehouses.some(item=>item.id===input.warehouseId)))throw new Error('اختار المنتج والمخزن قبل تسجيل الإرجاع الفعلي.');const doc=createPurchaseDocument({id:`vendor-${Date.now()}`,number:`${input.kind==='supplier_invoice'?'FA':'AV'}-${Date.now()}`,kind:input.kind,supplierId:input.supplierId,sourceDocumentId:input.sourceDocumentId,warehouseId:input.warehouseId,physicalReturn:input.physicalReturn,lines:input.lines,createdAt:new Date().toISOString()},purchaseDocuments);setPurchaseDocuments(current=>[doc,...current]);return true;}catch(error){Alert.alert(tr('تعذر إنشاء وثيقة الشراء'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));return false;}};
  const purchaseDocumentTitle=(doc:PurchaseDocument)=>tr(doc.kind==='request'?'طلب شراء':doc.kind==='order'?'أمر شراء':doc.kind==='receipt'?'سند الاستلام':doc.kind==='supplier_credit'?'إشعار دائن':'فاتورة المورد');
  const exportPurchaseDocumentPdf=(doc:PurchaseDocument)=>{const supplier=suppliers.find(item=>String(item.id)===doc.supplierId);const lines=[`${tr('رقم الوثيقة')}: ${doc.number}`,`${tr('نوع الوثيقة')}: ${purchaseDocumentTitle(doc)}`,`${tr('الحالة')}: ${tr(doc.status)}`,...(doc.sourceDocumentId?[`${tr('مرجع الوثيقة الأصلية')}: ${doc.sourceDocumentId}`]:[]),...doc.lines.map(line=>`${line.description} × ${line.quantity} — ${line.unitCost.toFixed(2)} DH`),...(doc.physicalReturn?[tr('إرجاع فعلي للمورد')]:[])];void exportPdf(purchaseDocumentTitle(doc),supplier?.name||'',lines,purchaseTotals(doc).total);};
  const sharePurchaseDocumentWhatsApp=(doc:PurchaseDocument)=>{const supplier=suppliers.find(item=>String(item.id)===doc.supplierId);const message=`${purchaseDocumentTitle(doc)} ${doc.number}\n${tr('المجموع')}: ${purchaseTotals(doc).total.toFixed(2)} DH${doc.sourceDocumentId?`\n${tr('مرجع الوثيقة الأصلية')}: ${doc.sourceDocumentId}`:''}`;openWhatsApp(supplier?.whatsapp||supplier?.phone,message);};
  const exportPurchaseDocumentsXlsx=()=>exportXlsxFile('HamZa-purchase-documents',[{name:'Documents',headers:['Document','Type','Status','Supplier','Source reference','Date','Warehouse','Product','Quantity','Unit cost DH','Line discount DH','Document total DH','Physical return'],rows:purchaseDocuments.flatMap(doc=>{const supplier=suppliers.find(item=>String(item.id)===doc.supplierId);return doc.lines.map(line=>[doc.number,purchaseDocumentTitle(doc),tr(doc.status),supplier?.name||doc.supplierId,doc.sourceDocumentId||'',doc.createdAt.slice(0,10),warehouses.find(item=>item.id===doc.warehouseId)?.name||'',line.description,line.quantity,line.unitCost,line.discount,purchaseTotals(doc).total,doc.physicalReturn?'Yes':'No']);})}]);
  const updatePurchaseDocumentStatus=(doc:PurchaseDocument,status:PurchaseStatus)=>{if(purchaseDocumentLocks.has(doc.id))return;purchaseDocumentLocks.add(doc.id);try{
    const current=purchaseDocuments.find(item=>item.id===doc.id);
    if(!current||current.status!==doc.status)throw new Error('الوثيقة تبدلات؛ عاود راجع حالتها.');
    if(status==='cancelled'&&current.kind==='supplier_credit'&&current.status==='confirmed')throw new Error('ما يمكنش تلغي إشعار دائن تطبق من قبل.');
    let supplierCredit:SupplierAccountPayment|undefined;
    let returnMovement:StockMovement|undefined;
    if(status==='confirmed'&&current.kind==='supplier_credit'){
      const purchase=purchases.find(item=>String(item.id)===current.sourceDocumentId);
      const supplier=suppliers.find(item=>String(item.id)===current.supplierId);
      if(!purchase||!supplier||purchase.supplierName!==supplier.name)throw new Error('مرجع الشراء أو المورد غير موجود.');
      if(supplierPayments.some(item=>item.method==='إشعار دائن'&&item.reference===current.number))throw new Error('تسجل هاد الإشعار الدائن من قبل.');
      if(current.physicalReturn)returnMovement=prepareSupplierReturn({document:current,purchase,movements:stockMovements,previouslyReturnedQuantity:purchaseDocuments.filter(item=>item.kind==='supplier_credit'&&item.status==='confirmed'&&item.physicalReturn&&item.sourceDocumentId===String(purchase.id)).reduce((sum,item)=>sum+item.lines.reduce((lineSum,line)=>lineSum+line.quantity,0),0),createdAt:new Date().toISOString()});
      supplierCredit=recordSupplierCredit({purchase:{id:purchase.id,supplierName:purchase.supplierName,total:purchase.total,paidAmount:normalizePurchasePaidAmount(purchase.total,purchase.paidAmount)},payments:supplierPayments,maximumCentimes:supplierLedger.dueByPurchase.get(purchase.id)??0,amount:purchaseTotals(current).total,id:Date.now(),date:new Date().toLocaleDateString('fr-MA'),reference:current.number});
    }
    const updated=changePurchaseStatus(current,status);
    if(supplierCredit)setSupplierPayments(rows=>[supplierCredit!,...rows]);
    if(returnMovement){const movements=[...stockMovements,returnMovement];setStockMovements(movements);setProducts(rows=>rows.map(product=>String(product.id)===returnMovement!.productId?{...product,qty:warehouses.reduce((sum,warehouse)=>sum+warehouseStock(movements,returnMovement!.productId,warehouse.id),0)}:product));}
    setPurchaseDocuments(rows=>rows.map(item=>item.id===current.id?updated:item));
  }catch(error){Alert.alert(tr('تعذر تحديث الوثيقة'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}finally{purchaseDocumentLocks.delete(doc.id);}};
  const convertPurchaseOrderDocument=(doc:PurchaseDocument,kind:PurchaseKind,warehouseId?:string)=>{try{const converted=convertPurchaseDocument(doc,kind,{id:`po-${Date.now()}`,number:`PO-${Date.now()}`,createdAt:new Date().toISOString(),...(warehouseId?{warehouseId}:{})},purchaseDocuments);setPurchaseDocuments(current=>[converted,...current]);}catch(error){Alert.alert(tr('تعذر تحويل وثيقة الشراء'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}};
  const receivePurchaseOrderDocument=(doc:PurchaseDocument)=>{try{if(doc.kind!=='receipt'||doc.status!=='draft')throw new Error('سند الاستلام غير صالح أو مستلم من قبل.');const validation=validatePurchase(doc);if(validation.length)throw new Error(validation[0]);const supplier=suppliers.find(item=>String(item.id)===doc.supplierId);const warehouse=warehouses.find(item=>item.id===doc.warehouseId);if(!supplier||!warehouse)throw new Error('المورد أو المخزن غير موجود.');const totals=purchaseTotals(doc),totalCentimes=Math.round(totals.total*100),currentDue=Math.round((supplierBalances.find(item=>item.supplierName===supplier.name)?.outstanding||0)*100);if(!canExtendCredit({creditLimitCentimes:supplier.creditLimitCentimes},currentDue,totalCentimes))throw new Error('تجاوز سقف الدين');const baseCents=doc.lines.map(line=>Math.max(0,Math.round(line.quantity*line.unitCost*100)-Math.round(line.discount*100)));const subtotalCents=baseCents.reduce((sum,value)=>sum+value,0),globalCents=Math.round(doc.globalDiscount*100);let allocated=0;const purchaseRows:Purchase[]=[],movements:StockMovement[]=[];const quantityByProduct=new Map<string,number>();doc.lines.forEach((line,index)=>{const product=products.find(item=>String(item.id)===line.productId);if(!product)throw new Error('المنتج غير موجود.');const share=index===doc.lines.length-1?globalCents-allocated:subtotalCents?Math.round(globalCents*baseCents[index]/subtotalCents):0;allocated+=share;const lineTotalCents=Math.max(0,baseCents[index]-share),effectiveUnitCost=lineTotalCents/100/line.quantity,purchaseId=Date.now()+index;purchaseRows.push({id:purchaseId,productId:String(product.id),warehouseId:warehouse.id,productName:product.name,supplierName:supplier.name,qty:line.quantity,unitCost:effectiveUnitCost,total:lineTotalCents/100,paidAmount:0,date:new Date(doc.createdAt).toLocaleDateString('fr-MA'),paymentDelayDays:supplier.paymentDelayDays});movements.push({id:`${doc.id}-line-${index+1}`,productId:String(product.id),warehouseId:warehouse.id,kind:'purchase',quantity:line.quantity,unitCost:effectiveUnitCost,createdAt:new Date().toISOString(),reference:doc.number,note:line.description});quantityByProduct.set(String(product.id),(quantityByProduct.get(String(product.id))||0)+line.quantity);});const received=changePurchaseStatus(doc,'received');setPurchaseDocuments(current=>current.map(item=>item.id===doc.id?received:item));setPurchases(current=>[...purchaseRows,...current]);setStockMovements(current=>[...current,...movements]);setProducts(current=>current.map(product=>{const added=quantityByProduct.get(String(product.id))||0;return added?{...product,qty:product.qty+added}:product;}));Alert.alert(tr('تم استلام المشتريات'),`${tr('المجموع')}: ${(totalCentimes/100).toFixed(2)} DH`);}catch(error){Alert.alert(tr('تعذر استلام المشتريات'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}};
  const addSupplierPayment=()=>{const purchase=purchases.find(item=>item.id===supplierPaymentPurchaseId);const openingSupplier=suppliers.find(item=>item.id===supplierPaymentOpeningSupplierId);const amount=Number(supplierPaymentAmount.replace(',','.'));try{if(supplierPaymentMethod==='تحويل'){const bank=bankAccounts.find(item=>item.id===supplierPaymentBankAccountId);if(!bank)throw new Error('اختار الحساب البنكي للتحويل.');if(Math.round(amount*100)>calculateBankBalance(bank,bankTransfers,payments,supplierPayments,bankOutflows))throw new Error('المبلغ أكبر من رصيد الحساب البنكي المتوفر.');}let item:SupplierAccountPayment;if(openingSupplier){const remaining=supplierLedger.openingDueBySupplier.get(openingSupplier.name)??0;item=recordSupplierOpeningPayment({supplierName:openingSupplier.name,remainingCentimes:remaining,amount,id:Date.now(),date:new Date().toLocaleDateString('fr-MA'),method:supplierPaymentMethod,reference:supplierPaymentReference,bankAccountId:supplierPaymentBankAccountId});}else{if(!purchase)throw new Error('اختار عملية شراء.');item=recordSupplierPayment({purchase:{id:purchase.id,supplierName:purchase.supplierName,total:purchase.total,paidAmount:normalizePurchasePaidAmount(purchase.total,purchase.paidAmount)},payments:supplierPayments,maximumCentimes:supplierLedger.dueByPurchase.get(purchase.id)??0,amount,id:Date.now(),date:new Date().toLocaleDateString('fr-MA'),method:supplierPaymentMethod,reference:supplierPaymentReference,bankAccountId:supplierPaymentBankAccountId});}setSupplierPayments(current=>[item,...current]);setSupplierPaymentPurchaseId(null);setSupplierPaymentOpeningSupplierId(null);setSupplierPaymentAmount('');setSupplierPaymentReference('');setSupplierPaymentBankAccountId('');Alert.alert(tr('تم تسجيل أداء المورد'),`${item.amount.toFixed(2)} DH`);}catch(error){Alert.alert(tr('تعذر تسجيل الأداء'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}};
  const addExpense=()=>{const a=Number(expenseAmount.replace(',','.')),category=expenseCategory.trim();if(!expenseTitle.trim()||!Number.isFinite(a)||a<=0||category.length>60){Alert.alert(tr('معلومات ناقصة'),tr('دخل وصف المصروف ومبلغ صحيح.'));return;}const usesBank=expensePaymentMethod==='بطاقة'||expensePaymentMethod==='تحويل';const bank=usesBank?bankAccounts.find(item=>item.id===expenseBankAccountId):undefined;if(usesBank&&!bank){Alert.alert(tr('معلومات ناقصة'),tr('اختار الحساب البنكي للتحويل.'));return;}if(bank&&Math.round(a*100)>calculateBankBalance(bank,bankTransfers,payments,supplierPayments,bankOutflows)){Alert.alert(tr('تعذر تسجيل المصروف'),tr('المبلغ أكبر من رصيد الحساب البنكي المتوفر.'));return;}setExpenses(v=>[{id:Date.now(),title:expenseTitle.trim(),amount:a,paymentMethod:expensePaymentMethod,date:new Date().toLocaleDateString('fr-MA'),...(category?{category}:{}),...(bank?{bankAccountId:bank.id}:{})},...v]);setExpenseTitle('');setExpenseCategory('');setExpenseAmount('');setExpenseBankAccountId('');};
  const changeOpeningCash=()=>{const amount=Number(openingCashAmount.replace(',','.'));try{if(!openingCashAmount.trim())throw new Error('دخل رصيد افتتاحي صحيح.');const next=setCashOpeningBalance(cashAccount,amount,new Date().toLocaleDateString('fr-MA'));Alert.alert(tr('تأكيد الرصيد الافتتاحي'),`${amount.toFixed(2)} DH`,[{text:tr('إلغاء'),style:'cancel'},{text:tr('تأكيد'),onPress:()=>{setCashAccount(next);setOpeningCashAmount('');}}]);}catch(error){Alert.alert(tr('تعذر تحديث الصندوق'),error instanceof Error?tr(error.message):tr('دخل رصيد افتتاحي صحيح.'));}};
  const addManualCashMovement=()=>{const amount=Number(cashEntryAmount.replace(',','.'));try{const next=recordManualCashEntry(cashAccount,{id:Date.now(),date:new Date().toLocaleDateString('fr-MA'),direction:cashEntryDirection,amount,description:cashEntryDescription},cashBalanceCentimes);setCashAccount(next);setCashEntryAmount('');setCashEntryDescription('');Alert.alert(tr('تم تسجيل الحركة'),`${amount.toFixed(2)} DH`);}catch(error){Alert.alert(tr('تعذر تسجيل الحركة'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}};
  const addBankAccount=()=>{try{if(editingBankAccountId){const updated=renameBankAccount(bankAccounts,editingBankAccountId,bankName);setBankAccounts(updated);setEditingBankAccountId(null);setBankName('');Alert.alert(tr('تم تحديث الحساب البنكي'));return;}const opening=Number((bankOpeningAmount||'0').replace(',','.'));const account=createBankAccount({id:'bank-'+Date.now(),name:bankName,openingBalance:opening,openingDate:new Date().toLocaleDateString('fr-MA')},bankAccounts);setBankAccounts(current=>[account,...current]);setBankName('');setBankOpeningAmount('');if(!bankTransferAccountId)setBankTransferAccountId(account.id);Alert.alert(tr('تمت إضافة الحساب البنكي'),account.name);}catch(error){Alert.alert(tr(editingBankAccountId?'تعذر تحديث الحساب البنكي':'تعذر إضافة الحساب البنكي'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}};
  const removeBankAccount=(account:BankAccount)=>Alert.alert(tr('تأكيد حذف الحساب البنكي'),account.name,[{text:tr('إلغاء'),style:'cancel'},{text:tr('حذف الحساب'),style:'destructive',onPress:()=>{try{const updated=deleteBankAccount(bankAccounts,bankTransfers,account.id,[...payments,...supplierPayments,...bankOutflows]);setBankAccounts(updated);if(bankTransferAccountId===account.id)setBankTransferAccountId(updated[0]?.id||'');if(paymentBankAccountId===account.id)setPaymentBankAccountId('');if(supplierPaymentBankAccountId===account.id)setSupplierPaymentBankAccountId('');if(saleBankAccountId===account.id)setSaleBankAccountId('');if(purchaseBankAccountId===account.id)setPurchaseBankAccountId('');if(expenseBankAccountId===account.id)setExpenseBankAccountId('');if(editingBankAccountId===account.id){setEditingBankAccountId(null);setBankName('');}Alert.alert(tr('تم حذف الحساب البنكي'));}catch(error){Alert.alert(tr('تعذر حذف الحساب البنكي'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}}}]);
  const addBankTransfer=()=>{const amount=Number(bankTransferAmount.replace(',','.'));try{const account=bankAccounts.find(item=>item.id===bankTransferAccountId);const transfer=recordBankTransfer({id:'bank-transfer-'+Date.now(),bankAccountId:bankTransferAccountId,date:new Date().toLocaleDateString('fr-MA'),direction:bankTransferDirection,amount,description:bankTransferDescription},bankAccounts,bankTransfers,cashBalanceCentimes,payments,supplierPayments,bankOutflows);Alert.alert(tr('تأكيد التحويل بين الحسابات'),`${amount.toFixed(2)} DH • ${tr(bankTransferDirection==='cash_to_bank'?'من الصندوق إلى البنك':'من البنك إلى الصندوق')} • ${account?.name||''}`,[{text:tr('إلغاء'),style:'cancel'},{text:tr('تأكيد'),onPress:()=>{setBankTransfers(current=>[transfer,...current]);setBankTransferAmount('');setBankTransferDescription('');}}]);}catch(error){Alert.alert(tr('تعذر تسجيل التحويل'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}};
  const addQuote=()=>{const p=products.find(x=>String(x.id)===quoteProduct);const c=customers.find(x=>String(x.id)===quoteCustomer);const q=Number(quoteQty);if(!p||!c||!Number.isInteger(q)||q<1){Alert.alert(tr('معلومات ناقصة'),tr('اختار المنتج والزبون والكمية.'));return;}const quoteUnitPrice=p.quotePrice??p.price;const x:Quote={id:Date.now(),productName:p.name,customerName:c.name,qty:q,unitPrice:quoteUnitPrice,total:q*quoteUnitPrice,date:new Date().toLocaleDateString('fr-MA'),status:'معلق'};setQuotes(v=>[x,...v]);setQuoteQty('1');Alert.alert(tr('تم حفظ عرض السعر'),`${x.total.toFixed(2)} DH`);};
  const deliveryStockIssuedByInvoice=(quoteId:number)=>documents.some(document=>document.type==='invoice'&&document.sourceQuoteId===quoteId&&stockMovements.some(movement=>movement.kind==='sale'&&movement.id.startsWith('invoice-'+document.id+'-')));
  const orderHasDelivery=(quoteId:number)=>documents.some(document=>document.type==='delivery'&&document.sourceQuoteId===quoteId);
  const updateCustomerOrder=(order:CommercialDocument,status:string)=>{
    if(order.type!=='customer_order')return;
    const apply=()=>setDocuments(current=>current.map(item=>{
      if(item.id!==order.id||item.type!=='customer_order')return item;
      return {...item,...changeTrackedSalesDocumentStatus({type:item.type,status:item.status,sourceQuoteId:item.sourceQuoteId},status,orderHasDelivery(item.sourceQuoteId))};
    }));
    if(status==='ملغى')Alert.alert(tr('إلغاء الطلب؟'),order.number,[{text:tr('إلغاء'),style:'cancel'},{text:tr('تأكيد'),style:'destructive',onPress:apply}]);
    else apply();
  };
  const documentTypeForScreen=screen==='الفواتير'?'invoice':screen==='فاتورة أولية'?'proforma':screen==='طلبات الزبناء'?'customer_order':'delivery';
  const convertQuote=(quote:Quote,type:QuoteConversionType,direct=false,applyCredit=true):boolean=>{
    try{
      const skipDeliveryIssue=type==='delivery'&&deliveryStockIssuedByInvoice(quote.id);
      if(type==='delivery'&&!skipDeliveryIssue){
        const deliveryLines=quote.lines?.length?quote.lines:[{productId:products.find(p=>p.name===quote.productName)?.id||0,qty:quote.qty}];
        if(deliveryLines.some(line=>!products.some(p=>p.id===line.productId)))throw new Error('الكمية المطلوبة أكبر من مخزون المستودع المحدد.');
        const stockError=validateStockDemand(stockMovements,activeWarehouseId,deliveryLines.map(line=>({productId:String(line.productId),quantity:line.qty})));
        if(stockError)throw new Error(stockError);
      }
      const invoiceStockQuantities=new Map<number,number>();
      const alreadyDelivered=type==='invoice'&&documents.some(document=>document.sourceQuoteId===quote.id&&document.type==='delivery');
      if(type==='invoice'&&!alreadyDelivered){
        const invoiceLines=quote.lines?.length?quote.lines:[{productId:products.find(product=>product.name===quote.productName)?.id||0,qty:quote.qty}];
        for(const line of planInvoiceStockDeduction(invoiceLines,alreadyDelivered))invoiceStockQuantities.set(line.productId,line.quantity);
        if(invoiceStockQuantities.size){
          const stockError=validateStockDemand(stockMovements,activeWarehouseId,Array.from(invoiceStockQuantities,([productId,quantity])=>({productId:String(productId),quantity})));
          if(stockError)throw new Error(stockError);
        }
      }
      const result=createConvertedDocument(
        quote,type,documents,products,Date.now(),new Date().toLocaleDateString('fr-MA'),skipDeliveryIssue,
      );
      result.document.number=nextDocumentNumber(type==='customer_order'?'CMD':numberingPrefixes[type],documents.filter(document=>document.type===type));
      let convertedDocument:CommercialDocument=result.document;if(type==='invoice'){const customer=customers.find(item=>item.name===quote.customerName);if(customer?.paymentDelayDays!==undefined)convertedDocument={...result.document,paymentDelayDays:customer.paymentDelayDays};}
      let appliedCreditCentimes=0;
      if(type==='invoice'){const contact=customers.find(item=>item.name===quote.customerName);const creditPool=salesReturns.filter(item=>item.customerName===quote.customerName).reduce((sum,item)=>sum+(item.unappliedCentimes||0),0);const canUseCredits=!direct||applyCredit;const plannedCredit=canUseCredits?Math.min(creditPool,Math.round(result.document.total*100)):0;const currentDue=balanceFor(quote.customerName)?.outstandingCentimes||0;if(!canExtendCredit({creditLimitCentimes:contact?.creditLimitCentimes},currentDue,Math.round(result.document.total*100)-plannedCredit))throw new Error('هاد الفاتورة غادي تفوت سقف الدين المحدد للزبون.');}
      if(type==='invoice'){
        const availableCredits=salesReturns.filter(item=>item.customerName===quote.customerName&&(item.unappliedCentimes||0)>0);
        const credit=applyExistingCustomerCreditsWhenSelected(availableCredits.map(item=>({id:item.id,unappliedCentimes:item.unappliedCentimes||0})),result.document.id,Math.round(result.document.total*100),!direct||applyCredit);
        appliedCreditCentimes=credit.creditedCentimes;
        const status=appliedCreditCentimes>=Math.round(result.document.total*100)?'paid':appliedCreditCentimes>0?'partially_paid':result.document.status;
        convertedDocument={...convertedDocument,paidCentimes:0,creditedCentimes:appliedCreditCentimes,status};
        if(credit.allocations.length)setSalesReturns(current=>applyCustomerCreditsToSalesReturns(current,credit.allocations,result.document.id,status==='paid'?'paid':'partially_paid'));
      }
      setDocuments(current=>[convertedDocument,...current]);
      if(type==='delivery'&&!skipDeliveryIssue){setProducts(result.updatedProducts as Product[]);const delivery=result.document;setStockMovements(v=>[...v,...delivery.lines.map((line,index)=>({id:'delivery-'+delivery.id+'-'+index,productId:String(line.productId),warehouseId:activeWarehouseId,kind:'sale' as const,quantity:line.qty,unitCost:averageInventoryUnitCost(stockMovements,String(line.productId),activeWarehouseId),createdAt:new Date().toISOString(),reference:delivery.number,note:'سند خروج'}))]);}
      else if(type==='invoice'&&invoiceStockQuantities.size){const invoice=result.document;setProducts(current=>current.map(product=>{const quantity=invoiceStockQuantities.get(product.id)||0;return quantity?{...product,qty:product.qty-quantity}:product;}));setStockMovements(current=>[...current,...Array.from(invoiceStockQuantities.entries()).map(([productId,quantity])=>({id:'invoice-'+invoice.id+'-'+productId,productId:String(productId),warehouseId:activeWarehouseId,kind:'sale' as const,quantity,unitCost:averageInventoryUnitCost(stockMovements,String(productId),activeWarehouseId),createdAt:new Date().toISOString(),reference:invoice.number,note:direct?'فاتورة مباشرة':'فاتورة محولة من عرض'}))]);}
      Alert.alert(tr('تم التحويل'),type==='invoice'?`تسجلات الفاتورة.${appliedCreditCentimes?` ${tr('رصيد سابق مستعمل:')} ${(appliedCreditCentimes/100).toFixed(2)} DH`:''}`:tr(type==='delivery'&&!skipDeliveryIssue?'تسجل سند الخروج وتحدّث المخزون.':'تسجلات الوثيقة.'));
      return true;
    }catch(error){
      Alert.alert(tr('تعذر التحويل'),tr(error instanceof Error?error.message:'وقع خطأ أثناء تحويل العرض.'));
      return false;
    }
  };
  const addPayment=()=>{
    const c=customers.find(x=>String(x.id)===paymentCustomer);
    const a=Number(paymentAmount.replace(',','.'));
    if(!c||!Number.isFinite(a)||a<=0){Alert.alert(tr('معلومات ناقصة'),tr('اختار الزبون ودخل مبلغ صحيح.'));return;}if(paymentMethod==='شيك'&&!paymentChequeReference.trim()){Alert.alert(tr('معلومات ناقصة'),tr('مرجع الشيك إجباري.'));return;}
    const paymentBank=paymentMethod==='تحويل'?bankAccounts.find(item=>item.id===paymentBankAccountId):undefined;
    if(paymentMethod==='تحويل'&&!paymentBank){Alert.alert(tr('معلومات ناقصة'),tr('اختار الحساب البنكي للتحويل.'));return;}
    const invoice=documents.find(d=>d.id===Number(paymentDocument)&&d.type==='invoice'&&d.customerName===c.name);
    if(paymentDocument&&!invoice){Alert.alert(tr('الفاتورة غير موجودة'),tr('عاود اختار فاتورة صالحة لهذا الزبون.'));return;}
    let paymentAllocations:{documentId:number;amountCentimes:number}[]=[];
    let openingBalanceAppliedCentimes=0;
    if(invoice){
      try{
        const result=applyPaymentToInvoice({type:'invoice',total:invoice.total,paidCentimes:invoice.paidCentimes,creditedCentimes:invoice.creditedCentimes,status:invoice.status},Math.round(a*100));
        paymentAllocations=[{documentId:invoice.id,amountCentimes:Math.round(a*100)}];
        setDocuments(current=>current.map(d=>d.id===invoice.id?{...d,paidCentimes:result.invoice.paidCentimes,creditedCentimes:result.invoice.creditedCentimes,status:result.invoice.status}:d));
      }catch(error){Alert.alert(tr('تعذر تسجيل الأداء'),error instanceof Error?error.message:'راجع مبلغ الأداء.');return;}
    }else{
      const openInvoices=documents.filter(d=>d.type==='invoice'&&d.customerName===c.name&&Math.round(d.total*100)>(d.paidCentimes||0)+(d.creditedCentimes||0));
      const invoiceDueCentimes=openInvoices.reduce((sum,d)=>sum+Math.max(0,Math.round(d.total*100)-(d.paidCentimes||0)-(d.creditedCentimes||0)),0);
      const openingDueCentimes=Math.max(0,(c.openingBalanceCentimes||0)-(balanceFor(c.name)?.openingBalancePaidCentimes||0));
      const requestedCentimes=Math.round(a*100);
      let allocation:{invoicePaymentCentimes:number;openingBalanceAppliedCentimes:number;unappliedCentimes:number};
      try{allocation=allocatePaymentAcrossCustomerDebt(requestedCentimes,invoiceDueCentimes,openingDueCentimes);}catch(error){Alert.alert(tr('تعذر تسجيل الأداء'),error instanceof Error?tr(error.message):tr('راجع مبلغ الأداء.'));return;}
      const invoicePaymentCentimes=allocation.invoicePaymentCentimes;
      if(invoicePaymentCentimes>0){
        try{
          const allocations=allocatePaymentAcrossInvoices(openInvoices.map(d=>({id:d.id,total:d.total,paidCentimes:d.paidCentimes,creditedCentimes:d.creditedCentimes,status:d.status})),invoicePaymentCentimes);
          paymentAllocations=allocations.map(item=>({documentId:item.invoiceId,amountCentimes:item.allocatedCentimes}));
          setDocuments(current=>current.map(d=>{const allocation=allocations.find(item=>item.invoiceId===d.id);return allocation?{...d,paidCentimes:allocation.paidCentimes,creditedCentimes:allocation.creditedCentimes??d.creditedCentimes,status:allocation.status}:d;}));
        }catch(error){Alert.alert(tr('تعذر تسجيل الأداء'),error instanceof Error?tr(error.message):tr('راجع مبلغ الأداء.'));return;}
      }
      openingBalanceAppliedCentimes=allocation.openingBalanceAppliedCentimes;
    }
    setPayments(v=>[{id:Date.now(),customerName:c.name,amount:a,method:paymentMethod,date:new Date().toLocaleDateString('fr-MA'),note:paymentNote.trim(),...(paymentMethod==='شيك'?{reference:paymentChequeReference.trim()}:{}),...(openingBalanceAppliedCentimes>0?{openingBalanceAppliedCentimes}:{}),...(paymentBank?{bankAccountId:paymentBank.id}:{}),...(invoice?{documentId:invoice.id}:{}),...(paymentAllocations.length?{allocations:paymentAllocations}:{})},...v]);
    setPaymentAmount('');setPaymentNote('');setPaymentDocument('');setPaymentBankAccountId('');setPaymentChequeReference('');
    Alert.alert(tr('تم تسجيل الأداء'),invoice?tr('تحدّث الرصيد المتبقي ديال الفاتورة.'):openingBalanceAppliedCentimes>0?tr('تسجل الأداء على الرصيد الافتتاحي.'):paymentAllocations.length?tr('توزع الأداء تلقائياً على أقدم الفواتير المفتوحة.'):tr('ما كايناش فاتورة مفتوحة؛ تسجل الأداء كدفعة غير مخصصة.'));
  };
  const applyCustomerCreditToSelectedInvoice=()=>{
    const invoice=selectedPaymentInvoice;
    const customerName=customers.find(item=>String(item.id)===paymentCustomer)?.name;
    if(!invoice||!customerName||invoice.customerName!==customerName){Alert.alert(tr('تعذر تطبيق الرصيد'),tr('اختار زبوناً وفاتورة مفتوحة صالحة.'));return;}
    const due=Math.max(0,Math.round(invoice.total*100)-(invoice.paidCentimes||0)-(invoice.creditedCentimes||0));
    if(!due||!selectedCustomerCreditCentimes){Alert.alert(tr('تعذر تطبيق الرصيد'),tr('ما كاين لا دين مفتوح لا رصيد متاح.'));return;}
    try{
      const eligible=salesReturns.filter(item=>item.customerName===customerName&&(item.unappliedCentimes||0)>0);
      const credit=applyExistingCustomerCredits(eligible.map(item=>({id:item.id,unappliedCentimes:item.unappliedCentimes||0})),invoice.id,due);
      if(!credit.allocations.length){Alert.alert(tr('تعذر تطبيق الرصيد'),tr('ما كاين لا دين مفتوح لا رصيد متاح.'));return;}
      Alert.alert(tr('تأكيد تطبيق الرصيد'),`${(credit.creditedCentimes/100).toFixed(2)} DH • ${invoice.number}`,[{text:tr('إلغاء'),style:'cancel'},{text:tr('تأكيد'),onPress:()=>{try{const nextCredited=(invoice.creditedCentimes||0)+credit.creditedCentimes;const status=(invoice.paidCentimes||0)+nextCredited>=Math.round(invoice.total*100)?'paid':'partially_paid';setSalesReturns(current=>applyCustomerCreditsToSalesReturns(current,credit.allocations,invoice.id,status));setDocuments(current=>current.map(item=>item.id===invoice.id?{...item,creditedCentimes:nextCredited,status}:item));Alert.alert(tr('تم تطبيق الرصيد'),`${(credit.creditedCentimes/100).toFixed(2)} DH • ${invoice.number}`);}catch(error){Alert.alert(tr('تعذر تطبيق الرصيد'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}}}]);
    }catch(error){Alert.alert(tr('تعذر تطبيق الرصيد'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}
  };
  const importBankStatement=async()=>{
    if(!bankTransferAccountId){Alert.alert(tr('معلومات ناقصة'),tr('اختار الحساب البنكي'));return;}
    try{
      setBankStatementBusy(true);
      const picked=await DocumentPicker.getDocumentAsync({type:['text/csv','text/plain','application/vnd.ms-excel'],copyToCacheDirectory:true,multiple:false});
      if(picked.canceled||!picked.assets.length)return;
      const csv=await FileSystem.readAsStringAsync(picked.assets[0].uri,{encoding:FileSystem.EncodingType.UTF8});
      const parsed=parseBankStatementCsv(csv,bankTransferAccountId,bankStatementLines);
      if(!parsed.lines.length){Alert.alert(tr('تعذر استيراد كشف البنك'),tr(parsed.errors[0]||'ما لقيناش حركات صالحة في الملف.'));return;}
      setBankStatementLines(current=>[...current,...parsed.lines]);
      const closing=[...parsed.lines].reverse().find(line=>line.reportedBalanceCentimes!==undefined)?.reportedBalanceCentimes;
      if(closing!==undefined)setBankStatementClosingBalance((closing/100).toFixed(2));
      Alert.alert(tr('تم تحميل كشف البنك'),`${parsed.lines.length} • ${tr('حركة مستوردة')}${parsed.rejected?` • ${parsed.rejected} ${tr('سطور مرفوضة أو مكررة')}`:''}`);
    }catch(error){Alert.alert(tr('تعذر استيراد كشف البنك'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}
    finally{setBankStatementBusy(false);}
  };
  const toggleBankStatementConfirmation=(lineId:string)=>{
    const match=selectedStatementMatches.find(item=>item.lineId===lineId);
    if(!match||match.status!=='matched'||!match.ledgerEntryId)return;
    setConfirmedBankStatementLineIds(current=>current.includes(lineId)?current.filter(id=>id!==lineId):[...current,lineId]);
  };
  const saveBankReconciliation=()=>{
    if(!selectedBankAccount||!selectedReconciliation||!selectedStatementLines.length){Alert.alert(tr('تعذر حفظ التسوية'),tr('استورد كشفاً بنكياً صالحاً أولاً.'));return;}
    const parsedClosing=Number(bankStatementClosingBalance.replace(',','.'));
    const reported=selectedReconciliation.reportedBalanceCentimes??(bankStatementClosingBalance.trim()&&Number.isFinite(parsedClosing)?Math.round(parsedClosing*100):undefined);
    if(reported===undefined){Alert.alert(tr('تعذر حفظ التسوية'),tr('كشف البنك خاصو يتضمن رصيداً ختامياً قبل حفظ التسوية.'));return;}
    const ordered=[...selectedStatementLines].sort((a,b)=>a.date.localeCompare(b.date));
    const confirmed=selectedStatementLines.filter(line=>confirmedBankStatementLineIds.includes(line.id)&&selectedStatementMatches.some(match=>match.lineId===line.id&&match.status==='matched')).length;
    const record:BankReconciliationRecord={id:`reconciliation-${Date.now()}`,bankAccountId:selectedBankAccount.id,createdAt:new Date().toISOString(),fromDate:ordered[0].date,toDate:ordered[ordered.length-1].date,reportedBalanceCentimes:reported,expectedBalanceCentimes:selectedReconciliation.expectedBalanceCentimes,differenceCentimes:reported-selectedReconciliation.expectedBalanceCentimes,matched:selectedReconciliation.matched,confirmed,unmatched:selectedReconciliation.unmatched,ambiguous:selectedReconciliation.ambiguous};
    setBankReconciliationHistory(current=>[record,...current]);
    Alert.alert(tr('تم حفظ التسوية'),`${tr('فرق الرصيد:')} ${(record.differenceCentimes/100).toFixed(2)} DH`);
  };
  const exportBackup=async()=>{try{
    setBackupBusy(true);
    const taskAttachmentFiles:{id:string;base64:string}[]=[];
    let attachmentBytes=0;
    for(const project of projects)for(const task of project.tasks)for(const attachment of task.attachments||[]){
      const info=await FileSystem.getInfoAsync(attachment.uri);
      if(!info.exists)throw new Error('تعذر قراءة مرفق مهمة؛ تأكد أن الملف موجود على الجهاز.');
      const size=typeof info.size==='number'?info.size:attachment.size;
      attachmentBytes+=size;
      if(size>5*1024*1024||attachmentBytes>25*1024*1024)throw new Error('حجم مرفقات المهام ف النسخة الاحتياطية تجاوز الحد المسموح.');
      taskAttachmentFiles.push({id:attachment.id,base64:await FileSystem.readAsStringAsync(attachment.uri,{encoding:FileSystem.EncodingType.Base64})});
    }
    const json=storageReady?await createBackup({language,companyProfile,numberingPrefixes,products,stockMovements,warehouses,activeWarehouseId,customers,sales,purchases,purchaseDocuments,expenses,suppliers,quotes,payments,documents,parkedPosSales,projects,fieldVisits,taskAttachmentFiles,technicians,technicianEquipment,payrollSettlements,recurringExpenseRules,salesReturns,supplierPayments,cashAccount,bankAccounts,bankTransfers,bankStatementLines,confirmedBankStatementLineIds,bankReconciliationHistory}):await exportOriginalBackup();
    const directory=FileSystem.cacheDirectory;if(!directory)throw new Error('cache unavailable');const uri=`${directory}HamZa-backup-${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(uri,json,{encoding:FileSystem.EncodingType.UTF8});
    if(!await Sharing.isAvailableAsync())throw new Error('sharing unavailable');
    await Sharing.shareAsync(uri,{mimeType:'application/json',dialogTitle:tr('مشاركة نسخة JSON')});
  }catch(e){Alert.alert(tr('خطأ'),e instanceof Error?tr(e.message):tr('ما قدرناش نوجدوا النسخة الاحتياطية.'));}finally{setBackupBusy(false);}};
  const chooseBackupFile=async()=>{try{const result=await DocumentPicker.getDocumentAsync({type:['application/json','text/json'],copyToCacheDirectory:true,multiple:false});if(result.canceled||!result.assets.length)return;const asset=result.assets[0];const info=await FileSystem.getInfoAsync(asset.uri);if(!info.exists||info.isDirectory||info.size>MAX_BACKUP_BYTES)throw new Error('حجم بيانات HamZa تجاوز الحد المسموح.');const json=await FileSystem.readAsStringAsync(asset.uri,{encoding:FileSystem.EncodingType.UTF8});decodeHamzaBackup(json);setBackupText(json);Alert.alert(tr('تم تحميل ملف النسخة'),result.assets[0].name);}catch{Alert.alert(tr('تعذر قراءة ملف النسخة'),tr('اختار ملف JSON صالح صادر من HamZa.'));}};
  const backupRestoreLock=useRef(false);
  const importBackup=()=>{Alert.alert(tr('استرجاع البيانات'),tr('هاد العملية غادي تعوض البيانات الحالية بالنسخة اللي لصقتي. واش متأكد؟'),[{text:tr('إلغاء'),style:'cancel'},{text:tr('استرجاع'),style:'destructive',onPress:async()=>{
    if(backupRestoreLock.current)return;
    backupRestoreLock.current=true;
    const staged:string[]=[];
    let committed=false;
    try{setBackupBusy(true);
    const source=adaptHistoricalSnapshot(decodeHamzaBackup(backupText));
    const restoredProjects=await materializeBackupTaskAttachments(normalizeProjects(source.projects),source.taskAttachmentFiles,staged);
    const {taskAttachmentFiles:_,...rest}=source;
    const d=await restoreAppData({...rest,projects:restoredProjects});
    committed=true;
    setLanguage(d.language==='FR'?'FR':'AR');setCompanyProfile(normalizeCompanyProfile(d.companyProfile));setNumberingPrefixes(normalizeDocumentNumberPrefixes(d.numberingPrefixes));setWarehouses(normalizeWarehouses(d.warehouses));setActiveWarehouseId(typeof d.activeWarehouseId==='string'&&normalizeWarehouses(d.warehouses).some(w=>w.id===d.activeWarehouseId)?d.activeWarehouseId:'main');setProducts(Array.isArray(d.products)?d.products as Product[]:[]);setStockMovements(Array.isArray(d.stockMovements)?d.stockMovements as StockMovement[]:(Array.isArray(d.products)?(d.products as Product[]).filter(p=>p.qty>0).map(p=>({id:'opening-backup-'+p.id,productId:String(p.id),warehouseId:'main',kind:'opening' as const,quantity:p.qty,unitCost:p.costPrice||0,createdAt:new Date().toISOString(),note:'رصيد افتتاحي مرحّل من النسخة الاحتياطية'})):[]));setCustomers(Array.isArray(d.customers)?d.customers as Customer[]:[]);setSales(Array.isArray(d.sales)?d.sales as Sale[]:[]);setPurchases(Array.isArray(d.purchases)?(d.purchases as Purchase[]).map(p=>({...p,paidAmount:normalizePurchasePaidAmount(p.total,p.paidAmount)})):[]);setHistoricalSupplierInvoices(Array.isArray(d.historicalSupplierInvoices)?d.historicalSupplierInvoices as ArchivedSupplierInvoice[]:[]);setPurchaseDocuments(normalizePurchaseDocuments(d.purchaseDocuments));setExpenses(Array.isArray(d.expenses)?d.expenses as Expense[]:[]);setSuppliers(Array.isArray(d.suppliers)?d.suppliers as Supplier[]:[]);setQuotes(Array.isArray(d.quotes)?d.quotes as Quote[]:[]);setPayments(Array.isArray(d.payments)?d.payments as Payment[]:[]);setDocuments(Array.isArray(d.documents)?d.documents as CommercialDocument[]:[]);setParkedPosSales(normalizeParkedPosSales(d.parkedPosSales));setProjects(restoredProjects);saveFieldVisits(normalizeFieldVisits(d.fieldVisits));setTechnicians(normalizeTechnicians(d.technicians));setTechnicianEquipment(normalizeEquipment(d.technicianEquipment,normalizeTechnicians(d.technicians).map(item=>item.id)));setPayrollSettlements(normalizePayrollSettlements(d.payrollSettlements,normalizeTechnicians(d.technicians)));setRecurringExpenseRules(normalizeRecurringExpenses(d.recurringExpenseRules));setSalesReturns(normalizeSalesReturns(d.salesReturns));setSupplierPayments(normalizeSupplierPayments(d.supplierPayments));setCashAccount(normalizeCashAccount(d.cashAccount));const normalizedBanks=normalizeBankAccounts(d.bankAccounts);setBankAccounts(normalizedBanks);setBankTransfers(normalizeBankTransfers(d.bankTransfers,normalizedBanks));setBankStatementLines(normalizeBankStatementLines(d.bankStatementLines,normalizedBanks));setConfirmedBankStatementLineIds(Array.isArray(d.confirmedBankStatementLineIds)?(d.confirmedBankStatementLineIds as unknown[]).filter((id):id is string=>typeof id==='string'):[]);setBankReconciliationHistory(normalizeBankReconciliationHistory(d.bankReconciliationHistory,normalizedBanks));setStorageReady(true);setBackupText('');Alert.alert(tr('تم الاسترجاع'),tr('ترجعات البيانات بنجاح.'));}catch(e){Alert.alert(tr('تعذر الاسترجاع'),e instanceof Error?tr(e.message):tr('النسخة غير صالحة.'));}finally{if(!committed)await Promise.all(staged.map(uri=>FileSystem.deleteAsync(uri,{idempotent:true}).catch(()=>undefined)));backupRestoreLock.current=false;setBackupBusy(false);}}}]);};
  const exportPdf=async(title:string,customerName:string,lines:string[],total:number,documentDate?:string,imageRows?:Array<{text:string;imageData?:string}>,documentKind?:PdfDocumentKind)=>{
    try{
      const date=documentDate||new Date().toLocaleDateString(language==='AR'?'ar-MA':'fr-MA');
      const html=buildPdfDocumentHtml({language,companyProfile,title,customerName,date,lines,total,imageRows,includeImages:!!imageRows,documentKind});
      const file=await Print.printToFileAsync({html});
      if(await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri,{mimeType:'application/pdf',dialogTitle:title});
      else Alert.alert(tr('PDF جاهز'),file.uri);
    }catch(e){Alert.alert(tr('خطأ'),tr('تعذر إنشاء PDF. تأكد من تثبيت مكتبات expo-print و expo-sharing.'));}
  };
  const exportCommercialPdf=(documentKind:PdfDocumentKind,title:string,customerName:string,lines:string[],total:number,date?:string,photoProductIds?:Array<number|undefined>)=>{
    const rows=lines.map((text,index)=>{
      const product=products.find(item=>item.id===photoProductIds?.[index]);
      return {text,imageData:product?productPhotos(product)[0]:undefined};
    });
    if(!rows.some(row=>row.imageData)){void exportPdf(title,customerName,lines,total,date,undefined,documentKind);return;}
    Alert.alert(tr('صور المنتجات في PDF'),title,[
      {text:tr('إلغاء'),style:'cancel'},
      {text:tr('PDF بلا صور'),onPress:()=>{void exportPdf(title,customerName,lines,total,date,undefined,documentKind);}},
      {text:tr('PDF بالصور'),onPress:()=>{void exportPdf(title,customerName,lines,total,date,rows,documentKind);}},
    ]);
  };
  const exportProductsPdf=async(includeImages:boolean)=>{
    if(productsForExport.length===0){Alert.alert(tr('لائحة المنتجات فارغة'),tr('زيد منتجات قبل التصدير.'));return;}
    try{
      const date=new Date().toLocaleDateString(language==='AR'?'ar-MA':'fr-MA');
      const imageRows=productsForExport.map(product=>({
        text:[product.name,product.reference?`${tr('المرجع')}: ${product.reference}`:'',product.barcode?`${tr('الباركود')}: ${product.barcode}`:'',`${tr('الكمية')}: ${product.qty}`,`${tr('ثمن البيع')}: ${product.price.toFixed(2)} DH`].filter(Boolean).join(' • '),
        imageData:productPhotos(product)[0],
      }));
      const html=buildPdfDocumentHtml({language,companyProfile,title:tr('لائحة المنتجات'),customerName:'',date,lines:imageRows.map(row=>row.text),imageRows,includeImages,total:productsForExport.reduce((sum,product)=>sum+product.qty*product.price,0)});
      const file=await Print.printToFileAsync({html});
      if(await Sharing.isAvailableAsync())await Sharing.shareAsync(file.uri,{mimeType:'application/pdf',dialogTitle:tr(includeImages?'لائحة المنتجات بالصور':'لائحة المنتجات بلا صور')});
      else Alert.alert(tr('PDF جاهز'),file.uri);
    }catch{
      Alert.alert(tr('خطأ'),tr('تعذر إنشاء PDF. تأكد من تثبيت مكتبات expo-print و expo-sharing.'));
    }
  };
  const openWhatsApp=(phone?:string,message?:string)=>{
    const url=buildWhatsAppChatUrl(phone,message);
    if(!url){Alert.alert(tr('رقم WhatsApp غير صالح'),tr('دخل رقم WhatsApp صحيحاً مع رمز الدولة.'));return;}
    void Linking.openURL(url).catch(()=>Alert.alert(tr('تعذر فتح WhatsApp'),tr('تأكد من وجود تطبيق أو متصفح يفتح روابط WhatsApp.')));
  };
  const parkedPosRef=useRef(parkedPosSales);
  parkedPosRef.current=parkedPosSales;
  const publishParkedPos=(rows:ParkedPosSale[])=>{parkedPosRef.current=rows;setParkedPosSales(rows);};
  const parkPosSale=(sale:ParkedPosSale,replace:boolean)=>{
    try{
      if(sale.warehouseId!==activeWarehouseId)throw new Error('هاد البيع مربوط بمخزن آخر.');
      publishParkedPos(saveParkedPosSale(parkedPosRef.current,sale,replace));
      Alert.alert(tr('تم حفظ البيع مؤقتاً'),sale.title);
      return true;
    }catch(error){Alert.alert(tr('تعذر حفظ البيع'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));return false;}
  };
  const removeParkedPosSale=(id:string)=>Alert.alert(tr('حذف البيع المحفوظ؟'),tr('هاد البيع غادي يتحيد من المبيعات المحفوظة.'),[
    {text:tr('إلغاء'),style:'cancel'},
    {text:tr('حذف'),style:'destructive',onPress:()=>publishParkedPos(parkedPosRef.current.filter(sale=>sale.id!==id))},
  ]);
  const checkoutPos=(data:{warehouseId:string;parkedSaleId?:string;legacyWarehouseConfirmed?:boolean;customerId?:number;customerName:string;lines:{productId:number;name:string;quantity:number;unitPrice:number;discount:number}[];paymentMethod:'cash'|'card'|'transfer'|'credit';total:number;paidAmount:number;bankAccountId?:string;creditPaymentMethod?:'cash'|'card'|'transfer'})=>{
    const parkingError=parkedCheckoutError(parkedPosRef.current,activeWarehouseId,data);
    if(parkingError||!warehouses.some(row=>row.id===data.warehouseId&&row.active)){
      Alert.alert(tr('راجع السلة'),tr(parkingError??'اختار المخزن ديال هاد البيع.'));return false;
    }
    const receivedBankMethod=data.paymentMethod==='credit'?data.creditPaymentMethod||'cash':data.paymentMethod;
    const bankAccount=(receivedBankMethod==='card'||receivedBankMethod==='transfer')?bankAccounts.find(item=>item.id===data.bankAccountId):undefined;
    if((receivedBankMethod==='card'||receivedBankMethod==='transfer')&&!bankAccount){Alert.alert(tr('معلومات ناقصة'),tr('اختار الحساب البنكي للتحويل.'));return false;}
    if(data.paymentMethod==='credit'){const contact=customers.find(item=>item.id===data.customerId);const availableCredit=salesReturns.filter(item=>item.customerName===data.customerName).reduce((sum,item)=>sum+(item.unappliedCentimes||0),0);const dueCentimes=Math.max(0,Math.round(data.total*100)-Math.round(data.paidAmount*100)-Math.min(availableCredit,Math.max(0,Math.round(data.total*100)-Math.round(data.paidAmount*100))));if(!canExtendCredit({creditLimitCentimes:contact?.creditLimitCentimes},balanceFor(data.customerName)?.outstandingCentimes||0,dueCentimes)){Alert.alert(tr('تجاوز سقف الدين'),tr('هاد البيع غادي يفوت سقف الدين المحدد للزبون.'));return false;}}
    const missing=data.lines.some(line=>!products.some(product=>product.id===line.productId));
    const stockError=validateStockDemand(stockMovements,data.warehouseId,data.lines.map(line=>({productId:String(line.productId),quantity:line.quantity})));
    if(missing||stockError){Alert.alert(tr('المخزون تبدل'),tr('الكمية المتوفرة ما بقاتش كافية. راجع السلة.'));return false;}
    let lineTotals:number[];
    try{lineTotals=allocatePosLineTotals(data.lines,data.total);}
    catch{Alert.alert(tr('معلومات ناقصة'),tr('مجموع نقطة البيع غير صالح.'));return false;}
    const today=new Date().toLocaleDateString('fr-MA');
    const transactionId=Date.now();
    const invoiceId=transactionId+data.lines.length+1;
    const paidCentimes=Math.round(data.paidAmount*100);
    const customerCredits=data.paymentMethod==='credit'&&data.customerId? salesReturns.filter(item=>item.customerName===data.customerName&&(item.unappliedCentimes||0)>0):[];
    const carriedCredit=applyExistingCustomerCredits(customerCredits.map(item=>({id:item.id,unappliedCentimes:item.unappliedCentimes||0})),invoiceId,Math.max(0,Math.round(data.total*100)-paidCentimes));
    const creditedCentimes=carriedCredit.creditedCentimes;
    const invoiceStatus=paidCentimes+creditedCentimes>=Math.round(data.total*100)?'paid':paidCentimes+creditedCentimes>0?'partially_paid':'صادرة';
    if(carriedCredit.allocations.length)setSalesReturns(current=>applyCustomerCreditsToSalesReturns(current,carriedCredit.allocations,invoiceId,invoiceStatus==='paid'?'paid':'partially_paid'));
    const records=data.lines.map((line,index)=>{const total=lineTotals[index];return {id:transactionId+index,productId:line.productId,warehouseId:data.warehouseId,documentId:invoiceId,productName:line.name,customerName:data.customerName,qty:line.quantity,unitPrice:line.unitPrice,unitCost:averageInventoryUnitCost(stockMovements,String(line.productId),data.warehouseId)??inventoryAverageProductCost(line.productId,products.find(product=>product.id===line.productId)?.costPrice||0),total,discount:Math.max(0,Math.round((line.quantity*line.unitPrice-total)*100)/100),date:today,paymentMethod:data.paymentMethod};});
    setSales(current=>[...records,...current]);
    setProducts(current=>current.map(product=>{const sold=data.lines.filter(line=>line.productId===product.id).reduce((sum,line)=>sum+line.quantity,0);return sold?{...product,qty:product.qty-sold}:product;}));
    setStockMovements(current=>[...current,...data.lines.map((line,index)=>({id:'pos-'+Date.now()+'-'+index,productId:String(line.productId),warehouseId:data.warehouseId,kind:'sale' as const,quantity:line.quantity,createdAt:new Date().toISOString(),note:'بيع نقطة البيع'}))]);
    const invoice:CommercialDocument={id:invoiceId,number:nextDocumentNumber(numberingPrefixes.invoice,documents.filter(document=>document.type==='invoice')),type:'invoice',customerName:data.customerName,total:data.total,paidCentimes,creditedCentimes,status:invoiceStatus,date:today,sourceQuoteId:-invoiceId,...(customers.find(item=>item.name===data.customerName)?.paymentDelayDays!==undefined?{paymentDelayDays:customers.find(item=>item.name===data.customerName)?.paymentDelayDays}:{}),lines:records.map(record=>({productId:record.productId,productName:record.productName,qty:record.qty,unitPrice:record.unitPrice,total:record.total}))};
    setDocuments(current=>[invoice,...current]);
    const methodLabel=data.paymentMethod==='cash'?'نقداً':data.paymentMethod==='card'?'بطاقة':data.paymentMethod==='credit'?'دين':'تحويل';
    const receivedMethodLabel=receivedBankMethod==='cash'?'نقداً':receivedBankMethod==='card'?'بطاقة':'تحويل';
    if(paidCentimes>0)setPayments(current=>[{id:invoiceId+1,customerName:data.customerName,amount:paidCentimes/100,method:receivedMethodLabel,date:today,note:'أداء نقطة البيع',documentId:invoiceId,allocations:[{documentId:invoiceId,amountCentimes:paidCentimes}],...(bankAccount?{bankAccountId:bankAccount.id}:{})},...current]);
    // Enqueue removal in the same synchronous state batch as stock, invoice and payment.
    if(data.parkedSaleId)publishParkedPos(parkedPosRef.current.filter(row=>row.id!==data.parkedSaleId));
    const due=Math.max(0,data.total-(paidCentimes+creditedCentimes)/100);
    exportPdf('Reçu de vente',data.customerName,[...records.map(record=>record.productName+' × '+record.qty+' — '+record.total.toFixed(2)+' DH'),tr('طريقة الأداء:')+' '+tr(methodLabel),...(data.paymentMethod==='credit'&&paidCentimes>0?[tr('طريقة أداء التسبيق')+': '+tr(receivedMethodLabel)]:[]),tr('المؤدى الآن:')+' '+(paidCentimes/100).toFixed(2)+' DH',...(creditedCentimes>0?[tr('رصيد سابق مستعمل:')+' '+(creditedCentimes/100).toFixed(2)+' DH']:[]),...(due>0?[tr('الباقي:')+' '+due.toFixed(2)+' DH']:[])],data.total);
    return true;
  };
  const checkoutPosRef=useRef(checkoutPos);
  checkoutPosRef.current=checkoutPos;
  const mainScroll=useRef<ScrollView>(null);
  useEffect(()=>{mainScroll.current?.scrollTo({y:0,animated:false});},[screen]);
  const go=(s:string)=>{voiceScreen.current=s;setScreen(s);setSearch('');};
  const productImageDistance=new Map(imageSearchMatches.map(match=>[match.id,match.distance]));
  const visibleProducts=products.filter(product=>imageSearchActive?productImageDistance.has(product.id):[product.name,product.reference||'',product.barcode||'',product.category||'',product.brand||'',product.unit||'',product.variant||''].some(value=>value.toLowerCase().includes(productSearch.trim().toLowerCase()))).sort((left,right)=>imageSearchActive?(productImageDistance.get(left.id)??65)-(productImageDistance.get(right.id)??65):0);
  if(!loaded)return <SafeAreaView style={s.safe}><StatusBar style="light"/><ActivityIndicator color={GOLD} style={{flex:1}}/></SafeAreaView>;
  if(!storageReady&&screen!=='النسخ الاحتياطي')return <SafeAreaView style={s.safe}><StatusBar style="light"/><View style={{padding:18}}>
    <Text style={s.panelTitle}>{tr('حماية بياناتك')}</Text>
    <Text style={s.panelText}>{tr('الحفظ متوقف لحماية بياناتك. استرجع نسخة احتياطية صالحة قبل المتابعة.')}</Text>
    <Pressable style={s.action} onPress={()=>go('النسخ الاحتياطي')}><Text style={s.actionText}>{tr('فتح النسخ الاحتياطي')}</Text></Pressable>
  </View></SafeAreaView>;
  return <SafeAreaView style={[s.safe,{direction:getLayoutDirection(language)}]}><StatusBar style="light"/><View style={s.header}><View><Text style={s.brand}>HamZa</Text><Text testID="hamza-language-subtitle" style={s.sub}>{language==='FR'?'Gestion commerciale':'تسيير تجاري'}</Text></View><Pressable testID="hamza-toggle-language" onPress={()=>setLanguage(language==='AR'?'FR':'AR')} style={s.lang}><Text style={s.gold}>{language}</Text></Pressable></View>
    <ScrollView ref={mainScroll} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
      {!storageReady&&<View style={s.note}><Text style={s.panelText}>{tr('الحفظ متوقف لحماية بياناتك. استرجع نسخة احتياطية صالحة قبل المتابعة.')}</Text><Pressable onPress={()=>go('النسخ الاحتياطي')}><Text style={s.gold}>{tr('فتح النسخ الاحتياطي')}</Text></Pressable></View>}<View style={s.topline}><Pressable testID="hamza-home" onPress={()=>go('الرئيسية')}><Text style={s.back}>{tr('⌂ الرئيسية')}</Text></Pressable><Text style={s.heading}>{tr(screen)}</Text></View>
      {screen==='الرئيسية'?<>
        <View style={s.hero}><Text style={s.heroLabel}>{tr('مرحبا بك في')}</Text><Text style={s.heroTitle}>HamZa</Text><Text style={s.heroText}>{tr('تسيير تجارتك من مكان واحد')}</Text></View>
        <View style={s.stats}><View style={s.stat}><Text style={s.statNum}>{products.length}</Text><Text style={s.statLabel}>{tr('المنتجات')}</Text></View><View style={s.stat}><Text style={s.statNum}>{customers.length}</Text><Text style={s.statLabel}>{tr('الزبناء')}</Text></View><View style={s.stat}><Text style={s.statNum}>{salesTotal.toFixed(0)} DH</Text><Text style={s.statLabel}>{tr('مجموع المبيعات')}</Text></View></View>
        <View style={s.summary}>
          <Text style={s.panelTitle}>{tr('ملخص النشاط')}</Text>
          <Text style={s.summaryText}>{tr('قيمة المخزون بسعر البيع:')} {stockValue.toFixed(2)} DH</Text><Text style={s.summaryText}>{tr('الربح المحتمل إذا تباع المخزون كامل:')} {potentialStockProfit.toFixed(2)} DH</Text>
          <Text style={s.summaryText}>{tr('المبيعات المسجلة:')} {salesTotal.toFixed(2)} DH</Text>
          <Text style={s.summaryText}>{tr('المشتريات:')} {purchaseTotal.toFixed(2)} DH</Text>
          <Text style={s.summaryText}>{tr('المصاريف:')} {expenseTotal.toFixed(2)} DH</Text><Text style={s.summaryText}>{tr('الرصيد الحالي:')} {(cashBalanceCentimes/100).toFixed(2)} DH</Text><Text style={s.summaryText}>{tr('ديون الموردين:')} {supplierOutstandingTotal.toFixed(2)} DH</Text>
          <Text style={s.summaryText}>{tr('هامش الربح من المبيعات ذات التكلفة المسجلة:')} {profitLoss.grossProfitOnCostedSales.toFixed(2)} DH</Text>
          {profitLoss.uncostedRevenue>0&&<Text style={s.note}>{tr('قيمة المبيعات بلا تكلفة محفوظة:')} {profitLoss.uncostedRevenue.toFixed(2)} DH</Text>}
        </View>
        {(overdueInvoices.length>0||overduePurchases.length>0)&&<View style={[s.summary,{marginTop:12}]}><Text style={s.panelTitle}>{tr('مستحقات متأخرة')}</Text>{overdueInvoices.slice(0,4).map(item=><View key={'overdue-invoice-'+item.id} style={[s.row,{alignItems:'center',marginTop:6}]}><Text style={[s.summaryText,{flex:1}]}>{item.name} • {item.number} • {item.amountCentimes/100} DH • {tr('تاريخ الاستحقاق')}: {item.dueDate}</Text><Pressable onPress={()=>{const customer=customers.find(contact=>contact.name===item.name);setPaymentCustomer(customer?String(customer.id):'');setPaymentDocument(String(item.id));setPaymentAmount((item.amountCentimes/100).toFixed(2));setScreen('الأداءات');}}><Text style={s.gold}>{tr('تسديد')}</Text></Pressable></View>)}{overduePurchases.slice(0,4).map(item=><View key={'overdue-purchase-'+item.id} style={[s.row,{alignItems:'center',marginTop:6}]}><Text style={[s.summaryText,{flex:1}]}>{item.name} • {item.amount.toFixed(2)} DH • {tr('تاريخ الاستحقاق')}: {item.dueDate}</Text><Pressable onPress={()=>{setSupplierPaymentPurchaseId(item.id);setSupplierPaymentOpeningSupplierId(null);setSupplierPaymentAmount(item.amount.toFixed(2));setScreen('المشتريات');}}><Text style={s.gold}>{tr('تسديد')}</Text></Pressable></View>)}</View>}
        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statNum}>{receivablesTotal.toFixed(2)} DH</Text><Text style={s.statLabel}>{tr('ديون الزبناء')}</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{openInvoiceCount}</Text><Text style={s.statLabel}>{tr('فواتير غير مسواة')}</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{quotes.length}</Text><Text style={s.statLabel}>{tr('عروض الأسعار')}</Text></View>
        </View>
        <View style={s.summary}>
          <Text style={s.summaryText}>{tr('المنتجات قليلة المخزون (5 أو أقل):')} {lowStockProducts.length}</Text>
          <Text style={s.summaryText}>{tr('المنتجات النافدة:')} {outOfStockCount}</Text>
          {lowStockProducts.slice(0,4).map(p=><Text key={p.id} style={s.note}>{p.name} — باقي {p.qty}</Text>)}
          {lowStockProducts.length===0&&<Text style={s.summaryText}>{tr('ما كايناش منتجات قليلة المخزون حالياً.')}</Text>}
        </View>
        <TextInput value={search} onChangeText={setSearch} placeholder={tr('قلب على قسم...')} placeholderTextColor="#888" style={s.search}/>
        <View style={s.grid}>{modules.filter(m=>m.ar.includes(search)||m.en.toLowerCase().includes(search.toLowerCase())).map(m=><Pressable key={m.en} testID={m.en==='Products'?'hamza-module-products':m.en==='Point of Sale'?'hamza-module-pos':undefined} onPress={()=>go(m.ar)} style={s.tile}><Text style={s.tileIcon}>{m.icon}</Text><Text style={s.tileTitle}>{tr(m.ar)}</Text><Text style={s.tileSub}>{language==='FR'?({'Produits':'Produits','Point of Sale':'Point de vente','Customers':'Clients','Suppliers':'Fournisseurs','Sales':'Ventes','Purchases':'Achats','Stock':'Stock','Quotes / Devis':'Devis','Invoices':'Factures','Delivery notes':'Bons de sortie','Expenses':'Dépenses','Backup & Restore':'Sauvegarde','Payments':'Paiements','Cash register':'Caisse','Reports':'Rapports','Settings':'Paramètres'} as Record<string,string>)[m.en]||m.en:m.en}</Text></Pressable>)}</View>
      </>:screen==='المنتجات'?<>
        <View style={s.panel}><Text style={s.panelTitle}>{editingProductId!==null?tr('تعديل المنتج'):tr('إضافة منتج جديد')}</Text><View style={[s.row,{alignItems:'center'}]}><TextInput testID="hamza-product-name" value={name} onChangeText={value=>{clearVoiceField('name');setName(value);}} placeholder={tr("اسم المنتج")} placeholderTextColor="#888" style={[s.input,{flex:1,marginBottom:0}]}/>{productVoiceButton('name',tr('إملاء اسم المنتج'))}</View>{productVoiceHint('name')}<View style={s.row}><TextInput value={productReference} onChangeText={setProductReference} placeholder={tr("مرجع المنتج (اختياري)")} placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={productBarcode} onChangeText={setProductBarcode} placeholder={tr("الباركود (اختياري)")} placeholderTextColor="#888" style={[s.input,s.half]}/></View><BarcodeScannerButton language={language} onScanned={setProductBarcode}/><TextInput value={productCategory} onChangeText={setProductCategory} placeholder={tr("الصنف / الفئة (اختياري)")} placeholderTextColor="#888" style={s.input}/><View style={s.row}><TextInput value={productBrand} onChangeText={setProductBrand} placeholder={tr("العلامة التجارية (اختياري)")} placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={productUnit} onChangeText={setProductUnit} placeholder={tr("الوحدة (اختياري)")} placeholderTextColor="#888" style={[s.input,s.half]}/></View><TextInput value={productVariant} onChangeText={setProductVariant} placeholder={tr("الموديل / النسخة (اختياري)")} placeholderTextColor="#888" style={s.input}/><View style={[s.row,{alignItems:'center'}]}><TextInput testID="hamza-product-price" value={price} onChangeText={value=>{clearVoiceField('price');setPrice(value);}} keyboardType="decimal-pad" placeholder={tr("ثمن البيع (DH)")} placeholderTextColor="#888" style={[s.input,{flex:1,marginBottom:0}]}/>{productVoiceButton('price',tr('إملاء ثمن البيع'))}</View>{productVoiceHint('price')}
        <View style={[s.row,{alignItems:'center'}]}><TextInput testID="hamza-product-stock" value={qty} onChangeText={value=>{clearVoiceField('quantity');setQty(value);}} keyboardType="number-pad" placeholder={tr("الكمية")} placeholderTextColor="#888" style={[s.input,{flex:1,marginBottom:0}]}/>{productVoiceButton('quantity',tr('إملاء الكمية'))}</View>{productVoiceHint('quantity')}<View style={s.row}><TextInput value={quotePrice} onChangeText={setQuotePrice} keyboardType="decimal-pad" placeholder={tr("ثمن العرض الخاص (اختياري DH)")} placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={invoicePrice} onChangeText={setInvoicePrice} keyboardType="decimal-pad" placeholder={tr("ثمن الفاتورة الخاص (اختياري DH)")} placeholderTextColor="#888" style={[s.input,s.half]}/></View><TextInput value={costPrice} onChangeText={setCostPrice} keyboardType="decimal-pad" placeholder={tr("ثمن الشراء / التكلفة (DH)")} placeholderTextColor="#888" style={s.input}/>{photoGallery.length>0?<View style={[s.row,{flexWrap:'wrap',justifyContent:'center'}]}>{photoGallery.map((uri,index)=><View key={index} style={{margin:4,alignItems:'center'}}><Pressable onPress={()=>setPhotoPreview(uri)}><Image source={{uri}} style={{width:72,height:72,borderRadius:9}}/></Pressable><Pressable accessibilityLabel={tr('حذف الصورة')} onPress={()=>setPhotoGallery(current=>removeProductPhoto(current,index))}><Text style={s.delete}>× {tr('حذف الصورة')}</Text></Pressable></View>)}</View>:null}<Pressable disabled={photoGallery.length>=4} style={[s.choice,{borderColor:GOLD,alignItems:'center',opacity:photoGallery.length>=4?0.5:1}]} onPress={pickProductPhoto}><Text style={s.gold}>{tr('إضافة صورة المنتج')} ({photoGallery.length}/4)</Text></Pressable><Pressable testID="hamza-save-product" style={s.action} onPress={addProduct}><Text style={s.actionText}>{editingProductId!==null?tr('حفظ التعديلات'):tr('+ إضافة المنتج')}</Text></Pressable></View>
        <View style={[s.panel,{marginTop:12}]}>
          <Text style={s.panelTitle}>{tr('إدخال جماعي للمنتجات')}</Text>
          <Text style={s.panelText}>{tr('كل سطر منتج واحد، والفاصل هو ; أو Tab. الترتيب: الاسم؛ المرجع؛ الباركود؛ الصنف؛ ثمن الشراء؛ ثمن البيع؛ الكمية؛ العلامة التجارية؛ الوحدة؛ الموديل؛ ثمن العرض؛ ثمن الفاتورة. آخر حقلين اختياريان.')}</Text>
          <TextInput value={productBulkText} onChangeText={value=>{setProductBulkText(value);setProductImport(undefined);}} multiline numberOfLines={6} textAlignVertical="top" placeholder={tr('الاسم;المرجع;الباركود;الصنف;ثمن الشراء;ثمن البيع;الكمية;العلامة التجارية;الوحدة;الموديل;ثمن العرض;ثمن الفاتورة\nRouteur;R-01;61100001;Réseau;150;220;5;TP-Link;Pièce;Archer C6;210;205')} placeholderTextColor="#888" style={[s.input,{minHeight:135,textAlign:'left',marginTop:10}]}/>
          <Pressable style={s.action} onPress={()=>openProductImport(productBulkText)}><Text style={s.actionText}>{tr('معاينة اللائحة')}</Text></Pressable>
          <Pressable style={[s.choice,{marginTop:8,borderColor:GOLD,alignItems:'center'}]} disabled={productImportBusy} onPress={()=>void pickProductImport()}><Text style={s.gold}>{productImportBusy?tr('جاري التحميل...'):tr('اختار ملف CSV أو TSV')}</Text></Pressable>
          <Text style={s.note}>{tr('من Excel اختار الحفظ بصيغة CSV UTF-8.')}</Text>
          {productImport&&<View style={s.summary}>
            <Text style={s.panelTitle}>{tr('معاينة الاستيراد')}</Text>
            {!!productImport.filename&&<Text style={s.note}>{productImport.filename}</Text>}
            <Text style={s.summaryText}>{tr('المخزن')}: {warehouses.find(w=>w.id===productImport.warehouseId)?.name??productImport.warehouseId}</Text>
            <Text style={s.summaryText}>{tr('منتجات مقبولة')}: {productImport.preview.accepted.length} • {tr('سطور مرفوضة أو مكررة')}: {productImport.preview.rejected.length}</Text>
            {productImport.preview.accepted.slice(0,8).map(({line,product})=><Text key={'preview-'+line} style={s.itemSub}>{line} • {product.name} • {product.qty} × {product.price.toFixed(2)} DH</Text>)}
            {productImport.preview.rejected.slice(0,8).map(({line,code})=><Text key={'reject-'+line} style={s.note}>{tr('السطر')} {line}: {importProductIssue(code)}</Text>)}
            {(productImport.preview.accepted.length>8||productImport.preview.rejected.length>8)&&<Text style={s.note}>{tr('المعاينة كتبرز غير أول 8 أسطر من كل فئة.')}</Text>}
            {productImport.preview.accepted.length>0&&<Pressable style={s.action} onPress={confirmProductImport}><Text style={s.actionText}>{tr('أكد إضافة المنتجات المقبولة')}</Text></Pressable>}
            <Pressable style={s.choice} onPress={()=>setProductImport(undefined)}><Text style={s.itemSub}>{tr('إلغاء')}</Text></Pressable>
          </View>}
          <Pressable style={[s.choice,{marginTop:8,borderColor:GOLD,alignItems:'center'}]} onPress={exportProductsCsv}><Text style={s.gold}>{tr("تصدير لائحة المنتجات CSV")}</Text></Pressable><Pressable style={[s.choice,{marginTop:8,borderColor:GOLD,alignItems:'center'}]} onPress={exportProductsXlsx}><Text style={s.gold}>{tr("تصدير لائحة المنتجات Excel")}</Text></Pressable><Pressable style={[s.choice,{marginTop:8,borderColor:GOLD,alignItems:'center'}]} onPress={()=>exportProductsPdf(false)}><Text style={s.gold}>{tr("تصدير لائحة المنتجات PDF بلا صور")}</Text></Pressable><Pressable style={[s.choice,{marginTop:8,borderColor:GOLD,alignItems:'center'}]} onPress={()=>exportProductsPdf(true)}><Text style={s.gold}>{tr("تصدير لائحة المنتجات PDF بالصور")}</Text></Pressable>
        </View>
        <Text style={s.section}>{tr("لائحة المنتجات")} ({products.length})</Text><View style={[s.row,{alignItems:'center',marginBottom:8}]}><TextInput value={productSearch} onChangeText={value=>{clearVoiceField('search');clearImageSearch();setProductSearch(value);}} placeholder={tr("بحث بالاسم أو المرجع أو الباركود أو الصنف...")} placeholderTextColor="#888" style={[s.search,{flex:1,marginBottom:0}]}/>{productVoiceButton('search',tr('البحث بالصوت'))}</View>{productVoiceHint('search')}<View style={[s.row,{justifyContent:'flex-end',marginBottom:10}]}><Pressable onPress={searchProductsByImage} disabled={imageSearchBusy} accessibilityRole="button" accessibilityLabel={tr('البحث بالصورة')} style={{minWidth:76,minHeight:44,paddingHorizontal:10,borderRadius:9,borderWidth:1,borderColor:GOLD,backgroundColor:'#211D14',alignItems:'center',justifyContent:'center'}}><Text style={s.gold}>{imageSearchBusy?'…':tr('البحث بالصورة')}</Text></Pressable></View>{imageSearchPreview?<View style={[s.row,{alignItems:'center',marginBottom:10}]}><Image source={{uri:imageSearchPreview}} style={{width:48,height:48,borderRadius:8}}/><View style={{flex:1}}><Text style={s.itemSub}>{imageSearchBusy?tr('البحث عن صور المنتجات'):tr('عدد النتائج:')+' '+imageSearchMatches.length}</Text><Text style={[s.itemSub,{fontSize:10}]}>{tr('النتائج كتقارن الشكل العام والإضاءة ديال الصور المحفوظة.')}</Text></View><Pressable onPress={clearImageSearch}><Text style={s.gold}>{tr('إلغاء البحث بالصورة')}</Text></Pressable></View>:null}{imageSearchActive&&imageSearchMatches.length===0&&!imageSearchBusy?<Text style={s.empty}>{tr('ما لقيناش صور قريبة. زيد صور واضحة للمنتجات وجرب صورة أخرى.')}</Text>:null}{products.length===0?<Text style={s.empty}>{tr("مازال ما زدتي حتى منتج.")}</Text> :visibleProducts.map(p=><View key={p.id} style={s.listItem}>{p.photoData?<Pressable onPress={()=>setPhotoPreview(p.photoData||null)}><Image source={{uri:p.photoData}} style={{width:48,height:48,borderRadius:8}}/></Pressable>:null}<View style={{flex:1}}><Text style={s.itemTitle}>{p.name}</Text><Text style={s.itemSub}>{[p.reference?tr('مرجع: ')+p.reference:'',p.barcode?tr('باركود: ')+p.barcode:'',p.category?tr('الصنف: ')+p.category:'',p.brand?tr('العلامة: ')+p.brand:'',p.unit?tr('الوحدة: ')+p.unit:'',p.variant?tr('الموديل: ')+p.variant:''].filter(Boolean).join(' • ')}</Text><Text style={s.itemSub}>{tr("الكمية:")} {p.qty} • {tr("الشراء:")} {inventoryAverageProductCost(p.id,p.costPrice||0).toFixed(2)} DH • {tr('ربح الوحدة:')} {(p.price-inventoryAverageProductCost(p.id,p.costPrice||0)).toFixed(2)} DH</Text>{(p.quotePrice!==undefined||p.invoicePrice!==undefined)&&<Text style={s.itemSub}>{p.quotePrice!==undefined?tr("ثمن العرض:")+" "+p.quotePrice.toFixed(2)+" DH ":""}{p.invoicePrice!==undefined?tr("ثمن الفاتورة:")+" "+p.invoicePrice.toFixed(2)+" DH":""}</Text>}</View><Text style={s.itemPrice}>{p.price.toFixed(2)} DH</Text><Pressable onPress={()=>startEditProduct(p)}><Text style={s.gold}>{tr("تعديل")}</Text></Pressable><Pressable onPress={()=>requestProductDeletion(p.id)}><Text style={s.delete}>{tr("حذف")}</Text></Pressable></View>)}
      </>:screen==='الإعدادات'?<>
        <View style={s.panel}>
          <Text style={s.panelTitle}>{tr('اختار اللغة')}</Text>
          <Pressable style={[s.action,{marginBottom:10,backgroundColor:language==='AR'?GOLD:'#292929'}]} onPress={()=>setLanguage('AR')}><Text style={[s.actionText,{color:language==='AR'?'#151515':'#FFF'}]}>العربية {language==='AR'?'✓':''}</Text></Pressable>
          <Pressable style={[s.action,{backgroundColor:language==='FR'?GOLD:'#292929'}]} onPress={()=>setLanguage('FR')}><Text style={[s.actionText,{color:language==='FR'?'#151515':'#FFF'}]}>Français {language==='FR'?'✓':''}</Text></Pressable>
          <Text style={[s.panelText,{marginTop:14}]}>{tr('اللغة المختارة كتتحفظ فالهاتف وكتبقى حتى من بعد ما تسد التطبيق.')}</Text>
        </View>
        <View style={[s.panel,{marginTop:12}]}>
          <Text style={s.panelTitle}>{tr('ترقيم الوثائق')}</Text>
          {([['quote','بادئة رقم عرض السعر'],['invoice','بادئة رقم الفاتورة'],['delivery','بادئة رقم سند الخروج'],['proforma','بادئة رقم الفاتورة الأولية'],['creditNote','بادئة رقم الإشعار الدائن']] as const).map(([key,label])=><View key={key}>
            <Text style={s.itemSub}>{tr(label)}</Text>
            <TextInput value={numberingPrefixes[key]} onChangeText={value=>setNumberingPrefixes(current=>({...current,[key]:value.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,20)}))} onEndEditing={()=>setNumberingPrefixes(current=>normalizeDocumentNumberPrefixes(current))} autoCapitalize="characters" maxLength={20} placeholderTextColor="#888" style={s.input}/>
          </View>)}
          <Text style={s.note}>{tr('تبدل البادئة ما كيبدلش أرقام الوثائق القديمة؛ الترقيم الجديد كيكمل من آخر رقم محفوظ.')}</Text>
        </View>
         <View style={[s.panel,{marginTop:12}]}>
           <Text style={s.panelTitle}>{tr('معلومات الشركة')}</Text>
           {companyProfile.logoData?<Image source={{uri:companyProfile.logoData}} style={{width:88,height:88,borderRadius:12,alignSelf:'center',marginBottom:10}}/>:null}
           <View style={s.row}><Pressable style={[s.choice,{flex:1,borderColor:GOLD}]} onPress={pickCompanyLogo}><Text style={s.gold}>{companyProfile.logoData?tr('تغيير شعار الشركة'):tr('إضافة شعار الشركة')}</Text></Pressable>{companyProfile.logoData?<Pressable style={[s.choice,{flex:1}]} onPress={()=>updateCompanyProfile('logoData','')}><Text style={s.delete}>{tr('حذف الشعار')}</Text></Pressable>:null}</View>
           <TextInput value={companyProfile.name} onChangeText={v=>updateCompanyProfile('name',v)} placeholder={tr('اسم الشركة أو النشاط')} placeholderTextColor="#888" style={s.input}/>
           <TextInput value={companyProfile.phone} onChangeText={v=>updateCompanyProfile('phone',v)} keyboardType="phone-pad" placeholder={tr('الهاتف')} placeholderTextColor="#888" style={s.input}/>
           <TextInput value={companyProfile.email} onChangeText={v=>updateCompanyProfile('email',v)} keyboardType="email-address" autoCapitalize="none" placeholder={tr('البريد الإلكتروني')} placeholderTextColor="#888" style={s.input}/>
           <TextInput value={companyProfile.address} onChangeText={v=>updateCompanyProfile('address',v)} placeholder={tr('العنوان')} placeholderTextColor="#888" style={s.input}/>
           <View style={s.row}><TextInput value={companyProfile.ice} onChangeText={v=>updateCompanyProfile('ice',v)} placeholder="ICE" placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={companyProfile.rc} onChangeText={v=>updateCompanyProfile('rc',v)} placeholder="RC" placeholderTextColor="#888" style={[s.input,s.half]}/></View>
           <TextInput value={companyProfile.taxId} onChangeText={v=>updateCompanyProfile('taxId',v)} placeholder="IF" placeholderTextColor="#888" style={s.input}/>
           <TextInput value={companyProfile.bank} onChangeText={v=>updateCompanyProfile('bank',v)} placeholder={tr('البنك')} placeholderTextColor="#888" style={s.input}/>
           <TextInput value={companyProfile.rib} onChangeText={v=>updateCompanyProfile('rib',v)} keyboardType="number-pad" placeholder="RIB" placeholderTextColor="#888" style={s.input}/>
           <TextInput value={companyProfile.paymentTerms} onChangeText={v=>updateCompanyProfile('paymentTerms',v)} placeholder={tr('شروط الأداء اللي تظهر فـ PDF (اختياري)')} placeholderTextColor="#888" multiline style={[s.input,{minHeight:56,textAlignVertical:'top'}]}/>
           <TextInput value={companyProfile.documentNote} onChangeText={v=>updateCompanyProfile('documentNote',v)} placeholder={tr('ملاحظة أسفل الوثيقة (اختيارية)')} placeholderTextColor="#888" multiline style={[s.input,{minHeight:72,textAlignVertical:'top'}]}/>
           <Text style={s.fieldLabel}>{tr('قالب PDF')}</Text>
           <View style={s.row}>{PDF_TEMPLATE_STYLES.map(style=><Pressable key={style} onPress={()=>updateCompanyProfile('pdfTemplateStyle',style)} style={[s.choice,{flex:1},companyProfile.pdfTemplateStyle===style&&s.choiceActive]}><Text style={s.itemTitle}>{tr(style==='classic'?'كلاسيكي':style==='compact'?'مضغوط':'مؤطر')}</Text></Pressable>)}</View>
           <TextInput value={companyProfile.pdfAccentColor} onChangeText={v=>updateCompanyProfile('pdfAccentColor',v)} autoCapitalize="characters" maxLength={7} placeholder={tr('لون القالب بصيغة #RRGGBB')} placeholderTextColor="#888" style={s.input}/>
           <TextInput value={companyProfile.pdfCustomFields} onChangeText={v=>updateCompanyProfile('pdfCustomFields',v.slice(0,2000))} placeholder={tr('الحقول العامة الإضافية (سطر لكل حقل)')} placeholderTextColor="#888" multiline style={[s.input,{minHeight:72,textAlignVertical:'top'}]}/>
           <Text style={s.note}>{tr('الإعدادات العامة كتطبق إلا إذا خصصتي نوع الوثيقة. الاختيارات كتحفظ مع النسخة الاحتياطية.')}</Text>
           <Text style={s.fieldLabel}>{tr('تخصيص حسب نوع الوثيقة')}</Text>
           {PDF_DOCUMENT_KINDS.map(kind=><Pressable key={kind} accessibilityRole="button" accessibilityState={{selected:selectedPdfKind===kind}} style={[s.choice,selectedPdfKind===kind&&s.choiceActive]} onPress={()=>setSelectedPdfKind(kind)}><Text style={s.itemTitle}>{pdfKindLabels[kind]}</Text></Pressable>)}
           <Text style={s.fieldLabel}>{pdfKindLabels[selectedPdfKind]} · {tr('قالب PDF')}</Text>
           <Pressable accessibilityRole="button" accessibilityState={{selected:!selectedPdfTemplate?.style}} onPress={()=>updatePdfTemplate({style:undefined})} style={[s.choice,!selectedPdfTemplate?.style&&s.choiceActive]}><Text style={s.itemTitle}>{tr('استعمال القالب العام')}</Text></Pressable>
           <View style={s.row}>{PDF_TEMPLATE_STYLES.map(style=><Pressable key={style} accessibilityRole="button" accessibilityState={{selected:selectedPdfTemplate?.style===style}} onPress={()=>updatePdfTemplate({style})} style={[s.choice,{flex:1},selectedPdfTemplate?.style===style&&s.choiceActive]}><Text style={s.itemTitle}>{tr(style==='classic'?'كلاسيكي':style==='compact'?'مضغوط':'مؤطر')}</Text></Pressable>)}</View>
           <Pressable accessibilityRole="switch" accessibilityState={{checked:selectedPdfTemplate?.customFields!==undefined}} style={[s.choice,selectedPdfTemplate?.customFields!==undefined&&s.choiceActive]} onPress={()=>updatePdfTemplate({customFields:selectedPdfTemplate?.customFields===undefined?companyProfile.pdfCustomFields:undefined})}><Text style={s.itemTitle}>{tr('استبدال الحقول العامة لهاد النوع')}</Text></Pressable>
           {selectedPdfTemplate?.customFields!==undefined&&<TextInput key={selectedPdfKind} value={selectedPdfTemplate.customFields} onChangeText={customFields=>updatePdfTemplate({customFields:customFields.slice(0,2000)})} accessibilityLabel={tr('الحقول الخاصة بالوثيقة')} placeholder={tr('سطر لكل حقل. خليه فارغ باش تخبي الحقول العامة.')} placeholderTextColor="#888" multiline style={[s.input,{minHeight:72,textAlignVertical:'top'}]}/>}
           <Text style={s.note}>{tr('معلومات الشركة كتتحفظ تلقائياً وكتظهر فوثائق PDF.')}</Text>
         </View>
      </>:screen==='المخزون'?<>
        <View style={s.panel}>
          <Text style={s.panelTitle}>{tr('المخازن')}</Text>
          <View style={s.row}>{warehouses.filter(w=>w.active).map(w=><Pressable key={w.id} onPress={()=>{setActiveWarehouseId(w.id);setStockCountInputs({});setTransferTargetId('');setTransferProductId('');}} style={[s.choice,{flex:1},activeWarehouseId===w.id&&s.choiceActive]}><Text style={s.itemTitle}>{w.name}</Text><Text style={s.itemSub}>{w.id}</Text></Pressable>)}</View>
          <TextInput value={warehouseName} onChangeText={setWarehouseName} placeholder={tr('اسم المخزن الجديد')} placeholderTextColor="#888" style={s.input}/>
          <TextInput value={warehouseAddress} onChangeText={setWarehouseAddress} placeholder={tr('عنوان المخزن (اختياري)')} placeholderTextColor="#888" style={s.input}/>
          <Pressable style={s.action} onPress={addWarehouse}><Text style={s.actionText}>{tr('+ إضافة مخزن')}</Text></Pressable>
        </View>
        <View style={s.panel}>
          <Text style={s.panelTitle}>{tr('تحويل بين المخازن')}</Text>
          <Text style={s.note}>{tr('المخزن المصدر:')} {warehouses.find(w=>w.id===activeWarehouseId)?.name||activeWarehouseId}</Text>
          <Text style={s.fieldLabel}>{tr('اختار المنتج')}</Text>
          {products.map(p=><Pressable key={p.id} onPress={()=>setTransferProductId(String(p.id))} style={[s.choice,transferProductId===String(p.id)&&s.choiceActive]}><Text style={s.itemTitle}>{p.name} — {warehouseStock(stockMovements,String(p.id),activeWarehouseId)}</Text></Pressable>)}
          <Text style={s.fieldLabel}>{tr('المخزن المستهدف')}</Text>
          {warehouses.filter(w=>w.active&&w.id!==activeWarehouseId).map(w=><Pressable key={w.id} onPress={()=>setTransferTargetId(w.id)} style={[s.choice,transferTargetId===w.id&&s.choiceActive]}><Text style={s.itemTitle}>{w.name}</Text></Pressable>)}
          <TextInput value={transferQuantity} onChangeText={setTransferQuantity} keyboardType="decimal-pad" placeholder={tr('الكمية المراد تحويلها')} placeholderTextColor="#888" style={s.input}/>
          <Pressable style={s.action} onPress={addWarehouseTransfer}><Text style={s.actionText}>{tr('تأكيد التحويل')}</Text></Pressable>
        </View>
        <View style={s.summary}>
          <Text style={s.summaryText}>{tr("المخزن المحدد:")} {warehouses.find(w=>w.id===activeWarehouseId)?.name||activeWarehouseId}</Text>
          <Text style={s.summaryText}>{tr("عدد حركات المخزون:")} {stockMovements.filter(m=>m.warehouseId===activeWarehouseId).length}</Text>
          <Text style={s.summaryText}>{tr("إجمالي الكميات الحالية:")} {products.reduce((sum,p)=>sum+p.qty,0)}</Text>
          <Text style={s.summaryText}>{tr("المنتجات اللي خاصها الجرد:")} {products.length}</Text>
        </View>
        <View style={s.panel}>
          <Text style={s.panelTitle}>{tr('جرد فعلي للمخزون')}</Text>
          <Text style={s.panelText}>{tr('دخل الكمية اللي لقيتي فعلياً فكل منتج، ومن بعد أكد الجرد. التطبيق غادي يسجل غير الفرق فحركات المخزون، بلا ما يمسح الحركات السابقة.')}</Text>
          {products.map(p=><View key={p.id} style={[s.row,{alignItems:'center',marginTop:8}]}><View style={{flex:1}}><Text style={s.itemTitle}>{p.name}</Text><Text style={s.itemSub}>{tr("المسجل:")} {warehouseStock(stockMovements,String(p.id),activeWarehouseId)} • {tr("المرجع:")} {p.reference||"—"}</Text></View><TextInput value={stockCountInputs[activeWarehouseId+':'+String(p.id)]??String(warehouseStock(stockMovements,String(p.id),activeWarehouseId))} onChangeText={v=>setStockCountInputs(current=>({...current,[activeWarehouseId+':'+String(p.id)]:v}))} keyboardType="decimal-pad" placeholder={tr("الفعلي")} placeholderTextColor="#888" style={[s.input,{width:90,textAlign:'center'}]}/></View>)}
          <Pressable style={s.action} onPress={()=>{
            try{
              const lines=products.map(p=>({productId:String(p.id),countedQuantity:Number((stockCountInputs[activeWarehouseId+':'+String(p.id)]??String(warehouseStock(stockMovements,String(p.id),activeWarehouseId))).replace(',','.')),unitCost:averageInventoryUnitCost(stockMovements,String(p.id),activeWarehouseId)??inventoryAverageProductCost(p.id,p.costPrice||0)}));
              const count=createStockCount({id:'count-'+Date.now(),warehouseId:activeWarehouseId,createdAt:new Date().toISOString(),lines},stockMovements);
              const next=applyStockCount(count,stockMovements);
              setStockMovements(next);
              setProducts(current=>current.map(p=>({...p,qty:warehouses.reduce((sum,w)=>sum+warehouseStock(next,String(p.id),w.id),0)})));
              setStockCountInputs({});
              Alert.alert(tr('تم الجرد'),tr('تسجل الجرد بنجاح. عدد التسويات: ')+count.lines.filter(line=>line.difference!==0).length);
            }catch(error){Alert.alert(tr('تعذر إتمام الجرد'),error instanceof Error?error.message:'راجع الكميات وحاول من جديد.');}
          }}><Text style={s.actionText}>{tr("تأكيد الجرد وتسجيل الفروقات")}</Text></Pressable>
        </View>
        <Text style={s.section}>{tr("سجل حركات المخزون")} ({stockMovements.filter(m=>m.warehouseId===activeWarehouseId).length})</Text>
        {stockMovements.filter(m=>m.warehouseId===activeWarehouseId).slice().reverse().slice(0,100).map(m=>{const p=products.find(x=>String(x.id)===m.productId);const sign=['sale','return_out','transfer_out'].includes(m.kind)||(m.kind==='adjustment'&&m.quantity<0)?'−':'+';return <View key={m.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{p?.name||tr('منتج محذوف')} • {m.kind}</Text><Text style={s.itemSub}>{m.note||m.reference||m.createdAt}</Text><Text style={s.itemSub}>{m.createdAt}</Text></View><Text style={s.itemPrice}>{sign}{Math.abs(m.quantity)}</Text></View>;})}
        {stockMovements.filter(m=>m.warehouseId===activeWarehouseId).length===0&&<Text style={s.empty}>{tr("مازال ما تسجلات حتى حركة مخزون.")}</Text>}
      </>:screen==='الموردون'?<><View style={s.panel}><Text style={s.panelTitle}>{tr(editingSupplierId!==null?'تعديل المورد':'إضافة مورد')}</Text><TextInput value={supplierName} onChangeText={setSupplierName} placeholder={tr("اسم المورد")} placeholderTextColor="#888" style={s.input}/><TextInput value={supplierPhone} onChangeText={setSupplierPhone} keyboardType="phone-pad" placeholder={tr("الهاتف (اختياري)")} placeholderTextColor="#888" style={s.input}/><TextInput value={supplierWhatsapp} onChangeText={setSupplierWhatsapp} keyboardType="phone-pad" placeholder={tr("رقم WhatsApp مع رمز الدولة (اختياري)")} placeholderTextColor="#888" style={s.input}/><TextInput value={supplierAddress} onChangeText={setSupplierAddress} placeholder={tr("العنوان (اختياري)")} placeholderTextColor="#888" style={s.input}/><TextInput value={supplierIce} onChangeText={setSupplierIce} placeholder={tr("ICE (اختياري)")} placeholderTextColor="#888" style={s.input}/><TextInput value={supplierRc} onChangeText={setSupplierRc} placeholder={tr("RC (اختياري)")} placeholderTextColor="#888" style={s.input}/><TextInput value={supplierIf} onChangeText={setSupplierIf} placeholder={tr("IF (اختياري)")} placeholderTextColor="#888" style={s.input}/><TextInput value={supplierCreditLimit} onChangeText={setSupplierCreditLimit} keyboardType="decimal-pad" placeholder={tr("سقف الدين (DH، اختياري)")} placeholderTextColor="#888" style={s.input}/><TextInput value={supplierPaymentDays} onChangeText={setSupplierPaymentDays} keyboardType="number-pad" placeholder={tr("أجل الأداء بالأيام (اختياري)")} placeholderTextColor="#888" style={s.input}/>{editingSupplierId===null&&<TextInput value={supplierOpeningBalance} onChangeText={setSupplierOpeningBalance} keyboardType="decimal-pad" placeholder={tr("الرصيد الافتتاحي للمورد (DH، اختياري)")} placeholderTextColor="#888" style={s.input}/>}<Pressable style={s.action} onPress={addSupplier}><Text style={s.actionText}>{tr(editingSupplierId!==null?'حفظ التعديلات':'+ إضافة المورد')}</Text></Pressable>{editingSupplierId!==null&&<Pressable style={s.choice} onPress={()=>{setEditingSupplierId(null);setSupplierName('');setSupplierPhone('');setSupplierWhatsapp('');setSupplierAddress('');setSupplierIce('');setSupplierRc('');setSupplierIf('');setSupplierCreditLimit('');setSupplierPaymentDays('');setSupplierOpeningBalance('');}}><Text style={s.gold}>{tr('إلغاء')}</Text></Pressable>}</View><Text style={s.section}>{tr("لائحة الموردين")} ({suppliers.length})</Text>{suppliers.map(x=><View key={x.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{x.name}</Text><Text style={s.itemSub}>{[x.phone,x.whatsapp?tr('WhatsApp: ')+x.whatsapp:'',x.address,x.ice?tr('ICE: ')+x.ice:'',x.rc?tr('RC: ')+x.rc:'',x.ifNumber?tr('IF: ')+x.ifNumber:'',x.creditLimitCentimes!==undefined?tr('سقف الدين:')+' '+(x.creditLimitCentimes/100).toFixed(2)+' DH':'',x.paymentDelayDays!==undefined?tr('أجل الأداء:')+' '+x.paymentDelayDays+' '+tr('يوم'):'',(x.openingBalanceCentimes||0)>0?tr('الرصيد الافتتاحي المتبقي:')+' '+((supplierLedger.openingDueBySupplier.get(x.name)??0)/100).toFixed(2)+' DH':'' ].filter(Boolean).join(' • ')||tr("لا توجد معلومات إضافية")}</Text>{(supplierLedger.openingDueBySupplier.get(x.name)??0)>0&&<Pressable onPress={()=>{const due=supplierLedger.openingDueBySupplier.get(x.name)??0;if(due>0){setSupplierPaymentOpeningSupplierId(x.id);setSupplierPaymentPurchaseId(null);setSupplierPaymentAmount((due/100).toFixed(2));setScreen('المشتريات');}}}><Text style={s.gold}>{tr('أداء الرصيد الافتتاحي')}</Text></Pressable>}</View><Pressable onPress={()=>exportSupplierStatement(x.name)}><Text style={s.gold}>{tr('كشف الحساب')}</Text></Pressable>{(x.whatsapp||x.phone)?<Pressable onPress={()=>openWhatsApp(x.whatsapp||x.phone)}><Text style={s.gold}>{tr('فتح WhatsApp')}</Text></Pressable>:null}<Pressable onPress={()=>{setEditingSupplierId(x.id);setSupplierName(x.name);setSupplierPhone(x.phone||'');setSupplierWhatsapp(x.whatsapp||'');setSupplierAddress(x.address||'');setSupplierIce(x.ice||'');setSupplierRc(x.rc||'');setSupplierIf(x.ifNumber||'');setSupplierCreditLimit(x.creditLimitCentimes===undefined?'':(x.creditLimitCentimes/100).toFixed(2));setSupplierPaymentDays(x.paymentDelayDays===undefined?'':String(x.paymentDelayDays));}}><Text style={s.gold}>{tr('تعديل')}</Text></Pressable><Pressable onPress={()=>Alert.alert(tr('حذف المورد؟'),x.name,[{text:tr('إلغاء'),style:'cancel'},{text:tr('حذف'),style:'destructive',onPress:()=>removeSupplier(x)}])}><Text style={s.delete}>{tr("حذف")}</Text></Pressable></View>)}</>
      :screen==='الزبناء'?<><View style={s.panel}><Text style={s.panelTitle}>{tr(editingCustomerId!==null?'تعديل الزبون':'إضافة زبون')}</Text><TextInput value={customer} onChangeText={setCustomer} placeholder={tr("اسم الزبون")} placeholderTextColor="#888" style={s.input}/><TextInput value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" placeholder={tr("الهاتف (اختياري)")} placeholderTextColor="#888" style={s.input}/><TextInput value={customerWhatsapp} onChangeText={setCustomerWhatsapp} keyboardType="phone-pad" placeholder={tr("رقم WhatsApp مع رمز الدولة (اختياري)")} placeholderTextColor="#888" style={s.input}/><TextInput value={customerAddress} onChangeText={setCustomerAddress} placeholder={tr("العنوان (اختياري)")} placeholderTextColor="#888" style={s.input}/><TextInput value={customerIce} onChangeText={setCustomerIce} placeholder={tr("ICE (اختياري)")} placeholderTextColor="#888" style={s.input}/><TextInput value={customerRc} onChangeText={setCustomerRc} placeholder={tr("RC (اختياري)")} placeholderTextColor="#888" style={s.input}/><TextInput value={customerIf} onChangeText={setCustomerIf} placeholder={tr("IF (اختياري)")} placeholderTextColor="#888" style={s.input}/><TextInput value={customerCreditLimit} onChangeText={setCustomerCreditLimit} keyboardType="decimal-pad" placeholder={tr("سقف الدين (DH، اختياري)")} placeholderTextColor="#888" style={s.input}/><TextInput value={customerPaymentDays} onChangeText={setCustomerPaymentDays} keyboardType="number-pad" placeholder={tr("أجل الأداء بالأيام (اختياري)")} placeholderTextColor="#888" style={s.input}/>{editingCustomerId===null&&<TextInput value={customerOpeningBalance} onChangeText={setCustomerOpeningBalance} keyboardType="decimal-pad" placeholder={tr("رصيد افتتاحي مستحق (DH، اختياري)")} placeholderTextColor="#888" style={s.input}/>}<Pressable style={s.action} onPress={addCustomer}><Text style={s.actionText}>{tr(editingCustomerId!==null?'حفظ التعديلات':'+ إضافة الزبون')}</Text></Pressable>{editingCustomerId!==null&&<Pressable style={s.choice} onPress={()=>{setEditingCustomerId(null);setCustomer('');setCustomerPhone('');setCustomerWhatsapp('');setCustomerAddress('');setCustomerIce('');setCustomerRc('');setCustomerIf('');setCustomerCreditLimit('');setCustomerPaymentDays('');setCustomerOpeningBalance('');}}><Text style={s.gold}>{tr('إلغاء')}</Text></Pressable>}</View><Text style={s.section}>{tr("لائحة الزبناء")} ({customers.length})</Text><View style={[s.summary,{marginTop:10}]}><Text style={s.summaryText}>{tr("إجمالي ديون الزبناء:")} {(customerBalances.reduce((sum,x)=>sum+x.outstandingCentimes,0)/100).toFixed(2)} DH</Text><Text style={s.summaryText}>{tr("الفواتير المفتوحة:")} {customerBalances.filter(x=>x.outstandingCentimes>0).length}</Text></View>{customers.map(c=>{const balance=balanceFor(c.name);return <View key={c.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{c.name}</Text><Text style={s.itemSub}>{[c.phone,c.whatsapp?tr('WhatsApp: ')+c.whatsapp:'',c.address,c.ice?'ICE: '+c.ice:'',c.rc?'RC: '+c.rc:'',c.ifNumber?'IF: '+c.ifNumber:'',c.creditLimitCentimes!==undefined?tr('سقف الدين:')+' '+(c.creditLimitCentimes/100).toFixed(2)+' DH':'',c.paymentDelayDays!==undefined?tr('أجل الأداء:')+' '+c.paymentDelayDays+' '+tr('يوم'):''].filter(Boolean).join(' • ')}</Text><Text style={s.itemSub}>{tr("الفواتير:")} {balance?.invoiceCount||0} • {tr("المتبقي:")} {((balance?.outstandingCentimes||0)/100).toFixed(2)} DH</Text>{(balance?.openingBalanceCentimes||0)>0&&<Text style={s.itemSub}>{tr('الرصيد الافتتاحي المتبقي:')} {(((balance?.openingBalanceCentimes||0)-(balance?.openingBalancePaidCentimes||0))/100).toFixed(2)} DH</Text>}{(balance?.customerCreditCentimes||0)>0&&<Text style={s.itemSub}>{tr('رصيد لصالح الزبون:')} {((balance?.customerCreditCentimes||0)/100).toFixed(2)} DH</Text>}</View><Pressable onPress={()=>exportCustomerStatement(c.name)}><Text style={s.gold}>{tr('كشف الحساب')}</Text></Pressable>{(c.whatsapp||c.phone)?<Pressable onPress={()=>openWhatsApp(c.whatsapp||c.phone)}><Text style={s.gold}>{tr('فتح WhatsApp')}</Text></Pressable>:null}<Pressable onPress={()=>{setEditingCustomerId(c.id);setCustomerOpeningBalance('');setCustomer(c.name);setCustomerPhone(c.phone||'');setCustomerWhatsapp(c.whatsapp||'');setCustomerAddress(c.address||'');setCustomerIce(c.ice||'');setCustomerRc(c.rc||'');setCustomerIf(c.ifNumber||'');setCustomerCreditLimit(c.creditLimitCentimes===undefined?'':(c.creditLimitCentimes/100).toFixed(2));setCustomerPaymentDays(c.paymentDelayDays===undefined?'':String(c.paymentDelayDays));}}><Text style={s.gold}>{tr('تعديل')}</Text></Pressable><Pressable onPress={()=>Alert.alert(tr('حذف الزبون؟'),c.name,[{text:tr('إلغاء'),style:'cancel'},{text:tr('حذف'),style:'destructive',onPress:()=>removeCustomer(c)}])}><Text style={s.delete}>{tr('حذف')}</Text></Pressable></View>;})}{customers.length===0&&<Text style={s.empty}>{tr("مازال ما زدتي حتى زبون.")}</Text>}</>
      :screen==='نقطة البيع'?<PosWorkspace language={language} searchTerm={posSearch} onSearchChange={value=>{clearVoiceField('pos-search');setPosSearch(value);}} onBarcodeStart={()=>clearVoiceField('pos-search')} voiceSearchButton={productVoiceButton('pos-search',tr('البحث بالصوت'))} voiceSearchHint={productVoiceHint('pos-search')} products={products.map(p=>({...p,qty:warehouseStock(stockMovements,String(p.id),activeWarehouseId)}))} customers={customers} bankAccounts={bankAccounts.map(account=>({id:account.id,name:account.name,balance:calculateBankBalance(account,bankTransfers,payments,supplierPayments,bankOutflows)/100}))} creditByCustomer={Object.fromEntries(customerBalances.map(balance=>[balance.customerName,balance.customerCreditCentimes/100]))} outstandingByCustomer={Object.fromEntries(customerBalances.map(balance=>[balance.customerName,balance.outstandingCentimes/100]))} parkedSales={parkedPosSales} warehouseId={activeWarehouseId} warehouses={warehouses} onPark={parkPosSale} onDeleteParked={removeParkedPosSale} onCheckout={data=>unstable_batchedUpdates(()=>checkoutPosRef.current(data))}/>
      :screen==='المبيعات'?<><View style={s.panel}><Text style={s.panelTitle}>{tr('تسجيل عملية بيع')}</Text><Text style={s.fieldLabel}>{tr('اختار المنتج (ضغط عليه)')}</Text>{products.map(p=><Pressable key={p.id} onPress={()=>setSaleProduct(String(p.id))} style={[s.choice,saleProduct===String(p.id)&&s.choiceActive]}><Text style={s.itemTitle}>{p.name} — {p.price.toFixed(2)} DH ({tr('متوفر:')} {p.qty})</Text></Pressable>)}{products.length===0&&<Text style={s.empty}>{tr('زيد منتجات أولاً.')}</Text>}<Text style={s.fieldLabel}>{tr('اختار الزبون')}</Text>{customers.map(c=><Pressable key={c.id} onPress={()=>setSaleCustomer(String(c.id))} style={[s.choice,saleCustomer===String(c.id)&&s.choiceActive]}><Text style={s.itemTitle}>{c.name}</Text></Pressable>)}{customers.length===0&&<Text style={s.empty}>{tr('زيد زبناء أولاً.')}</Text>}<TextInput value={saleQty} onChangeText={setSaleQty} keyboardType="number-pad" placeholder={tr('الكمية')} placeholderTextColor="#888" style={s.input}/><Text style={s.fieldLabel}>{tr('طريقة الأداء')}</Text><View style={s.row}>{(['نقداً','بطاقة','تحويل'] as const).map(method=><Pressable key={method} onPress={()=>setSalePaymentMethod(method)} style={[s.choice,{flex:1},salePaymentMethod===method&&s.choiceActive]}><Text style={s.itemTitle}>{tr(method)}</Text></Pressable>)}</View>{salePaymentMethod!=='نقداً'&&<View><Text style={s.fieldLabel}>{tr('الحساب البنكي')}</Text>{bankAccounts.map(account=><Pressable key={account.id} onPress={()=>setSaleBankAccountId(account.id)} style={[s.choice,saleBankAccountId===account.id&&s.choiceActive]}><Text style={s.itemTitle}>{account.name} • {(calculateBankBalance(account,bankTransfers,payments,supplierPayments,bankOutflows)/100).toFixed(2)} DH</Text></Pressable>)}{bankAccounts.length===0&&<Text style={s.note}>{tr('أضف حساباً بنكياً من شاشة الصندوق أولاً.')}</Text>}</View>}<Pressable style={s.action} onPress={addSale}><Text style={s.actionText}>{tr('تأكيد البيع وتحديث المخزون')}</Text></Pressable></View><Text style={s.section}>{tr('سجل المبيعات')} ({sales.length})</Text><Pressable style={[s.choice,{marginBottom:10,borderColor:GOLD,alignItems:'center'}]} onPress={exportSalesCsv}><Text style={s.gold}>{tr('تصدير سجل المبيعات CSV')}</Text></Pressable><Pressable style={[s.choice,{marginBottom:10,borderColor:GOLD,alignItems:'center'}]} onPress={exportSalesXlsx}><Text style={s.gold}>{tr('تصدير سجل المبيعات Excel')}</Text></Pressable>{sales.map(x=><View key={x.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{x.productName} × {x.qty}</Text><Text style={s.itemSub}>{x.customerName} • {x.date} • {tr(x.paymentMethod||'غير محدد')}</Text></View><Text style={s.itemPrice}>{x.total.toFixed(2)} DH</Text></View>)}{sales.length===0&&<Text style={s.empty}>{tr('مازال ما تسجلات حتى عملية بيع.')}</Text>}</>
      :screen==='المشتريات'?<><View style={s.panel}><Text style={s.panelTitle}>{tr('تسجيل شراء وإضافة للمخزون')}</Text><Text style={s.fieldLabel}>{tr('المنتج')}</Text>{products.map(p=><Pressable key={p.id} onPress={()=>setPurchaseProduct(String(p.id))} style={[s.choice,purchaseProduct===String(p.id)&&s.choiceActive]}><Text style={s.itemTitle}>{p.name}</Text></Pressable>)}<Text style={s.fieldLabel}>{tr('المورد')}</Text>{suppliers.map(x=><Pressable key={x.id} onPress={()=>setPurchaseSupplier(String(x.id))} style={[s.choice,purchaseSupplier===String(x.id)&&s.choiceActive]}><Text style={s.itemTitle}>{x.name}</Text></Pressable>)}<View style={s.row}><TextInput value={purchaseQty} onChangeText={setPurchaseQty} keyboardType="number-pad" placeholder={tr("الكمية")} placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={purchaseCost} onChangeText={setPurchaseCost} keyboardType="decimal-pad" placeholder={tr('ثمن الوحدة')} placeholderTextColor="#888" style={[s.input,s.half]}/></View><TextInput value={purchasePaidNow} onChangeText={setPurchasePaidNow} keyboardType="decimal-pad" placeholder={tr('المؤدى الآن DH')} placeholderTextColor="#888" style={s.input}/><Text style={s.fieldLabel}>{tr('طريقة أداء الشراء')}</Text><View style={s.row}>{(['نقداً','بطاقة','تحويل'] as const).map(method=><Pressable key={method} onPress={()=>setPurchasePaidMethod(method)} style={[s.choice,{flex:1},purchasePaidMethod===method&&s.choiceActive]}><Text style={s.itemTitle}>{tr(method)}</Text></Pressable>)}</View>{Number(purchasePaidNow.replace(',','.'))>0&&purchasePaidMethod!=='نقداً'&&<View><Text style={s.fieldLabel}>{tr('الحساب البنكي')}</Text>{bankAccounts.map(account=><Pressable key={account.id} onPress={()=>setPurchaseBankAccountId(account.id)} style={[s.choice,purchaseBankAccountId===account.id&&s.choiceActive]}><Text style={s.itemTitle}>{account.name} • {(calculateBankBalance(account,bankTransfers,payments,supplierPayments,bankOutflows)/100).toFixed(2)} DH</Text></Pressable>)}{bankAccounts.length===0&&<Text style={s.note}>{tr('أضف حساباً بنكياً من شاشة الصندوق أولاً.')}</Text>}</View>}<Text style={s.note}>{tr('دخل المؤدى الآن؛ الصفر يعني أن المبلغ كامل باقي للمورد.')}</Text><Text style={s.panelText}>{tr('المشتريات القديمة بلا سجل أداء محسوبَة مؤداة لتجنب إنشاء دين غير مؤكد.')}</Text><Pressable style={s.action} onPress={addPurchase}><Text style={s.actionText}>{tr('تأكيد الشراء')}</Text></Pressable></View><Text style={s.section}>{tr('سجل المشتريات')} ({purchases.length})</Text>{(selectedSupplierPaymentPurchase||selectedSupplierOpening)&&<View style={[s.panel,{marginBottom:12}]}><Text style={s.panelTitle}>{tr('أداء المورد')} • {selectedSupplierOpening?.name||selectedSupplierPaymentPurchase?.supplierName}</Text><Text style={s.panelText}>{tr('الدين المتبقي:')} {selectedSupplierOpening?Math.max(0,((selectedSupplierOpening.openingBalanceCentimes||0)-(supplierBalances.find(row=>row.supplierName===selectedSupplierOpening.name)?.openingBalancePaidCentimes||0))/100).toFixed(2):outstandingForPurchase(selectedSupplierPaymentPurchase!).toFixed(2)} DH</Text><TextInput value={supplierPaymentAmount} onChangeText={setSupplierPaymentAmount} keyboardType="decimal-pad" placeholder={tr('مبلغ الأداء DH')} placeholderTextColor="#888" style={s.input}/><View style={s.row}>{(['نقداً','تحويل','شيك'] as const).map(method=><Pressable key={method} onPress={()=>setSupplierPaymentMethod(method)} style={[s.choice,{flex:1},supplierPaymentMethod===method&&s.choiceActive]}><Text style={s.itemTitle}>{tr(method)}</Text></Pressable>)}</View>{supplierPaymentMethod==='شيك'&&<TextInput value={supplierPaymentReference} onChangeText={setSupplierPaymentReference} placeholder={tr('مرجع الشيك')} placeholderTextColor="#888" style={s.input}/>}{supplierPaymentMethod==='تحويل'&&<View><Text style={s.fieldLabel}>{tr('الحساب البنكي')}</Text>{bankAccounts.map(account=><Pressable key={account.id} onPress={()=>setSupplierPaymentBankAccountId(account.id)} style={[s.choice,supplierPaymentBankAccountId===account.id&&s.choiceActive]}><Text style={s.itemTitle}>{account.name} • {(calculateBankBalance(account,bankTransfers,payments,supplierPayments,bankOutflows)/100).toFixed(2)} DH</Text></Pressable>)}</View>}<View style={s.row}><Pressable style={[s.action,{flex:1}]} onPress={addSupplierPayment}><Text style={s.actionText}>{tr('تأكيد الأداء')}</Text></Pressable><Pressable style={[s.choice,{marginTop:3}]} onPress={()=>{setSupplierPaymentPurchaseId(null);setSupplierPaymentOpeningSupplierId(null);}}><Text style={s.gold}>{tr('إلغاء')}</Text></Pressable></View></View>}{purchases.map(x=>{const due=outstandingForPurchase(x);return <View key={x.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{x.productName} × {x.qty}</Text><Text style={s.itemSub}>{x.supplierName} • {x.date} • {tr('المتبقي:')} {due.toFixed(2)} DH</Text><Text style={s.itemSub}>{tr('المدفوع:')} {paidForPurchase(x).toFixed(2)} DH</Text>{dueDateForPurchase(x)&&<Text style={s.itemSub}>{tr('تاريخ الاستحقاق')}: {dueDateForPurchase(x)}</Text>}{supplierPayments.filter(payment=>payment.purchaseId===x.id).map(payment=><Text key={payment.id} style={s.itemSub}>{tr('دفعة:')} {payment.amount.toFixed(2)} DH • {payment.date} • {tr(payment.method)}{payment.reference?' • '+payment.reference:''}</Text>)}</View><Text style={s.itemPrice}>{x.total.toFixed(2)} DH</Text>{due>0&&<Pressable onPress={()=>{setSupplierPaymentPurchaseId(x.id);setSupplierPaymentOpeningSupplierId(null);setSupplierPaymentAmount(due.toFixed(2));setSupplierPaymentReference('');}}><Text style={s.gold}>{tr('أداء')}</Text></Pressable>}<Pressable onPress={()=>exportPdf('Bon d’achat',x.supplierName,[`${x.productName} × ${x.qty} — ${x.unitCost.toFixed(2)} DH / unité`,tr('المدفوع:')+' '+paidForPurchase(x).toFixed(2)+' DH',tr('الدين المتبقي:')+' '+due.toFixed(2)+' DH'],x.total)}><Text style={s.gold}>PDF</Text></Pressable></View>})}</>
      :screen==='وثائق المشتريات'?<>{historicalSupplierInvoices.length>0&&<View style={s.panel}>
        <Text style={s.panelTitle}>{tr('فواتير الموردين من النسخة القديمة')}</Text>
        <Text style={s.note}>{tr('الأداءات القديمة محسوبة فالمشتريات وما خاصهاش تتسجل مرة أخرى.')}</Text>
        {historicalSupplierInvoices.map(item=><View key={item.id} style={s.listItem}><View style={{flex:1}}>
          <Text style={s.itemTitle}>{item.number} • {suppliers.find(row=>String(row.id)===item.supplierId)?.name??item.supplierId}</Text>
          <Text style={s.itemSub}>{item.issuedAt.slice(0,10)} • #{item.purchaseOrderId}{item.dueDate?' • '+item.dueDate.slice(0,10):''}</Text>
          <Text style={s.itemSub}>{tr('المدفوع وقت النقل')}: {(item.paidCentimes/100).toFixed(2)} DH</Text>
          {item.payments.map(payment=><Text key={payment.id} style={s.itemSub}>{payment.date.slice(0,10)} • {(payment.amountCentimes/100).toFixed(2)} DH • {tr(payment.method==='cash'?'نقداً':payment.method==='bank'?'تحويل':'شيك')}{payment.reference?' • '+payment.reference:''}</Text>)}
        </View><Text style={s.itemPrice}>{(item.totalCentimes/100).toFixed(2)} DH</Text></View>)}
      </View>}<PurchaseDocumentsWorkspace language={language} documents={purchaseDocuments} suppliers={suppliers} products={products.map(product=>({...product,costPrice:inventoryAverageProductCost(product.id,product.costPrice||0)}))} warehouses={warehouses} purchases={purchases.map(item=>({...item,productId:item.productId??(products.filter(product=>product.name===item.productName).length===1?String(products.find(product=>product.name===item.productName)?.id):undefined),supplierId:String(suppliers.find(supplier=>supplier.name===item.supplierName)?.id??''),due:outstandingForPurchase(item)}))} onCreate={createPurchaseOrderDocument} onCreateSpecial={createSpecialPurchaseDocument} onExportPdf={exportPurchaseDocumentPdf} onShareWhatsApp={sharePurchaseDocumentWhatsApp} onExportXlsx={exportPurchaseDocumentsXlsx} onStatus={updatePurchaseDocumentStatus} onConvert={convertPurchaseOrderDocument} onReceive={receivePurchaseOrderDocument}/></>
      :screen==='المصاريف'?<><View style={s.panel}><Text style={s.panelTitle}>{tr('إضافة مصروف')}</Text><TextInput value={expenseTitle} onChangeText={setExpenseTitle} placeholder={tr('وصف المصروف')} placeholderTextColor="#888" style={s.input}/><TextInput value={expenseCategory} onChangeText={setExpenseCategory} placeholder={tr('تصنيف المصروف (اختياري)')} placeholderTextColor="#888" style={s.input}/>{Array.from(new Set([...expenses.map(item=>item.category||''),...recurringExpenseRules.map(item=>item.category)].filter(Boolean))).map(category=><Pressable key={category} onPress={()=>setExpenseCategory(category)} style={[s.choice,expenseCategory===category&&s.choiceActive]}><Text style={s.itemTitle}>{category}</Text></Pressable>)}<TextInput value={expenseAmount} onChangeText={setExpenseAmount} keyboardType="decimal-pad" placeholder={tr('المبلغ DH')} placeholderTextColor="#888" style={s.input}/><Text style={s.fieldLabel}>{tr('طريقة أداء المصروف')}</Text><View style={s.row}>{(['نقداً','بطاقة','تحويل'] as const).map(method=><Pressable key={method} onPress={()=>setExpensePaymentMethod(method)} style={[s.choice,{flex:1},expensePaymentMethod===method&&s.choiceActive]}><Text style={s.itemTitle}>{tr(method)}</Text></Pressable>)}</View>{expensePaymentMethod!=='نقداً'&&<View><Text style={s.fieldLabel}>{tr('الحساب البنكي')}</Text>{bankAccounts.map(account=><Pressable key={account.id} onPress={()=>setExpenseBankAccountId(account.id)} style={[s.choice,expenseBankAccountId===account.id&&s.choiceActive]}><Text style={s.itemTitle}>{account.name} • {(calculateBankBalance(account,bankTransfers,payments,supplierPayments,bankOutflows)/100).toFixed(2)} DH</Text></Pressable>)}{bankAccounts.length===0&&<Text style={s.note}>{tr('أضف حساباً بنكياً من شاشة الصندوق أولاً.')}</Text>}</View>}<Pressable style={s.action} onPress={addExpense}><Text style={s.actionText}>{tr('+ تسجيل المصروف')}</Text></Pressable></View><Text style={s.section}>{tr('سجل المصاريف')} — {expenseTotal.toFixed(2)} DH</Text>{expenses.map(x=><View key={x.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{x.title}</Text><Text style={s.itemSub}>{x.category?x.category+' • ':''}{x.projectId?tr('مشروع')+': '+(projects.find(project=>project.id===x.projectId)?.name||'—')+' • ':''}{x.date}</Text></View><Text style={s.itemPrice}>{x.amount.toFixed(2)} DH</Text><Pressable onPress={()=>exportPdf('Reçu de dépense','',[`${x.title} — ${x.amount.toFixed(2)} DH`],x.amount)}><Text style={s.gold}>PDF</Text></Pressable>{x.recurringRuleId?<Text style={s.note}>{tr('ضمن مصروف دوري')}</Text>:<Pressable onPress={()=>setExpenses(v=>v.filter(y=>y.id!==x.id))}><Text style={s.delete}>{tr('حذف')}</Text></Pressable>}</View>)}<RecurringExpensesWorkspace language={language} rules={recurringExpenseRules} bankAccounts={bankAccounts} occurrences={expenses.filter(item=>item.recurringRuleId!==undefined).map(item=>({recurringRuleId:item.recurringRuleId,recurringOccurrenceDate:item.recurringOccurrenceDate}))} onCreate={addRecurringExpenseRule} onToggle={toggleRecurringExpenseRule} onDelete={deleteRecurringExpenseRule} onRecord={recordRecurringExpensePayment}/></>
       :screen==='المشاريع'?<ProjectsWorkspace language={language} fieldVisits={fieldVisits} onSaveVisit={saveVisit} onVisitStatus={setVisitStatus} projects={projects} expenses={expenses} technicians={technicians} payrollRows={payrollRows} payrollSettlements={payrollSettlements} bankAccounts={bankAccounts} onSettlePayroll={settleTechnicianPayroll} technicianEquipment={technicianEquipment} onAddEquipment={addTechnicianEquipment} onUpdateEquipment={updateTechnicianEquipment} onDeleteEquipment={deleteTechnicianEquipment} onAddTechnician={addTechnicianProfile} onUpdateTechnician={updateTechnicianProfile} onDeleteTechnician={deleteTechnicianProfile} onCreate={addProject} onUpdate={updateProject} onDelete={deleteProject} onStatusChange={changeProjectStatus} onAddTask={addTaskToProject} onUpdateTask={updateTaskInProject} onToggleTask={toggleProjectTask} onDeleteTask={deleteProjectTask} onAddTaskAttachment={addTaskAttachment} onOpenTaskAttachment={openTaskAttachment} onRemoveTaskAttachment={deleteTaskAttachment} onAddExpense={addProjectExpense} onAddTime={addProjectTime} onDeleteTime={deleteProjectTime}/>
       :screen==='الإشعارات الدائنة'?<SalesReturnWorkspace language={language} sales={returnableSales} returns={salesReturns} onCreate={addSalesReturn} onPdf={exportSalesReturnPdf} onRefund={requestCustomerRefund}/>
        :screen==='عروض الأسعار'||screen==='فاتورة مباشرة'?<QuoteWorkspace language={language} products={products} customers={customers} customerCredits={Object.fromEntries(customerBalances.map(balance=>[balance.customerName,balance.customerCreditCentimes]))} quotes={quotes} initialMode={screen==='فاتورة مباشرة'?'invoice':'quote'} showHistory={screen==='عروض الأسعار'} onSave={(quote)=>setQuotes(v=>[{...quote,number:nextDocumentNumber(numberingPrefixes.quote,v)},...v])} onPdf={exportCommercialPdf} onConvert={convertQuote}/>
       :screen==='الفواتير'||screen==='Bon de sortie'||screen==='فاتورة أولية'||screen==='طلبات الزبناء'?<>
         <Text style={s.section}>{screen==='الفواتير'?tr('الفواتير'):screen==='فاتورة أولية'?tr('فاتورة أولية'):screen==='طلبات الزبناء'?tr('طلبات الزبناء'):tr('سندات الخروج')}</Text>
         {documents.filter(d=>d.type===documentTypeForScreen).map(d=><View key={d.id} style={s.listItem}>
           <View style={{flex:1}}><Text style={s.itemTitle}>{d.number} • {d.customerName}</Text><Text style={s.itemSub}>{d.date} • {tr(d.status)} • {d.lines.length} {tr('سطر')}</Text>{d.type==='proforma'&&d.validUntil&&<Text style={s.itemSub}>{tr('صالحة إلى غاية:')} {d.validUntil}</Text>}{d.type==='invoice'&&<><Text style={s.itemSub}>{tr('المدفوع:')} {((d.paidCentimes||0)/100).toFixed(2)} DH • {tr('باقي')} {((Math.max(0,Math.round(d.total*100)-(d.paidCentimes||0)-(d.creditedCentimes||0)))/100).toFixed(2)} DH</Text>{dueDateForInvoice(d)&&<Text style={s.itemSub}>{tr('تاريخ الاستحقاق')}: {dueDateForInvoice(d)}</Text>}</>}</View>
          <Text style={s.itemPrice}>{d.total.toFixed(2)} DH</Text>
           {d.type==='customer_order'&&<View style={{gap:4}}>{allowedTrackedSalesDocumentStatuses({type:d.type,status:d.status,sourceQuoteId:d.sourceQuoteId},orderHasDelivery(d.sourceQuoteId)).map(status=><Pressable key={status} onPress={()=>updateCustomerOrder(d,status)} style={s.choice}><Text style={s.gold}>{tr(status)}</Text></Pressable>)}</View>}
           <Pressable onPress={()=>exportCommercialPdf(d.type,(d.type==='invoice'?tr('فاتورة'):d.type==='proforma'?tr('فاتورة أولية'):d.type==='customer_order'?tr('طلب زبون'):tr('سند خروج'))+' '+d.number,d.customerName,[...d.lines.map(line=>formatPdfProductLine(line,language)),...formatPdfDiscountLines(d.total,d.discountCentimes,language),...(d.notes?[d.notes]:[]),...(d.type==='invoice'?[tr('المدفوع:')+' '+formatPdfAmount((d.paidCentimes||0)/100,language)+' DH',tr('المخصوم من دين الفاتورة:')+' '+formatPdfAmount((d.creditedCentimes||0)/100,language)+' DH',tr('الباقي:')+' '+formatPdfAmount(Math.max(0,Math.round(d.total*100)-(d.paidCentimes||0)-(d.creditedCentimes||0))/100,language)+' DH']:[]),...(d.type==='proforma'&&d.validUntil?[tr('صالحة إلى غاية:')+' '+d.validUntil]:[])],d.total,d.date,d.lines.map(line=>line.productId))}><Text style={s.gold}>PDF</Text></Pressable>
        </View>)}
         {documents.filter(d=>d.type===documentTypeForScreen).length===0&&<Text style={s.empty}>{tr('مازال ما تسجلات حتى وثيقة من هاد النوع.')}</Text>}
        {sales.length>0&&<Text style={s.note}>{tr('سجل المبيعات القديم باقي محفوظ كما هو.')}</Text>}
      </>
      :screen==='الأداءات'?<><View style={s.panel}><Text style={s.panelTitle}>{tr('تسجيل أداء زبون')}</Text>{customers.map(c=><Pressable key={c.id} onPress={()=>{setPaymentCustomer(String(c.id));setPaymentDocument('');}} style={[s.choice,paymentCustomer===String(c.id)&&s.choiceActive]}><Text style={s.itemTitle}>{c.name}</Text></Pressable>)}
        <Text style={s.fieldLabel}>{tr('اختار الفاتورة (اختياري)')}</Text>
        <Text style={s.panelText}>{tr('إلا ما اخترتيش فاتورة، الأداء كيتوزع على أقدم الفواتير المفتوحة ديال الزبون.')}</Text>
        {documents.filter(d=>d.type==='invoice'&&(!paymentCustomer||d.customerName===customers.find(c=>String(c.id)===paymentCustomer)?.name)&&Math.round(d.total*100)>(d.paidCentimes||0)+(d.creditedCentimes||0)).map(d=><Pressable key={d.id} onPress={()=>setPaymentDocument(String(d.id))} style={[s.choice,paymentDocument===String(d.id)&&s.choiceActive]}><Text style={s.itemTitle}>{d.number} — {tr('باقي')} {((d.total*100-(d.paidCentimes||0)-(d.creditedCentimes||0))/100).toFixed(2)} DH</Text></Pressable>)}
        {selectedPaymentInvoice&&selectedCustomerCreditCentimes>0&&<View style={[s.summary,{marginVertical:8}]}><Text style={s.summaryText}>{tr('رصيد متاح للاستعمال:')} {(selectedCustomerCreditCentimes/100).toFixed(2)} DH</Text><Pressable style={[s.action,{marginTop:8}]} onPress={applyCustomerCreditToSelectedInvoice}><Text style={s.actionText}>{tr('استعمال الرصيد على الفاتورة')}</Text></Pressable></View>}
        <TextInput value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" placeholder={tr("المبلغ DH")} placeholderTextColor="#888" style={s.input}/><View style={s.row}>{['نقداً','تحويل','شيك'].map(m=><Pressable key={m} onPress={()=>setPaymentMethod(m)} style={[s.choice,{flex:1},paymentMethod===m&&s.choiceActive]}><Text style={s.itemTitle}>{tr(m)}</Text></Pressable>)}</View>{paymentMethod==='شيك'&&<TextInput value={paymentChequeReference} onChangeText={setPaymentChequeReference} placeholder={tr('مرجع الشيك')} placeholderTextColor="#888" style={s.input}/>} {paymentMethod==='تحويل'&&<View><Text style={s.fieldLabel}>{tr('الحساب البنكي')}</Text>{bankAccounts.map(account=><Pressable key={account.id} onPress={()=>setPaymentBankAccountId(account.id)} style={[s.choice,paymentBankAccountId===account.id&&s.choiceActive]}><Text style={s.itemTitle}>{account.name} • {(calculateBankBalance(account,bankTransfers,payments,supplierPayments,bankOutflows)/100).toFixed(2)} DH</Text></Pressable>)}</View>}<TextInput value={paymentNote} onChangeText={setPaymentNote} placeholder={tr('ملاحظات (اختياري)')} placeholderTextColor="#888" style={s.input}/><Pressable style={s.action} onPress={addPayment}><Text style={s.actionText}>{tr('تسجيل الأداء')}</Text></Pressable></View><Text style={s.section}>{tr('سجل الأداءات')} ({payments.length})</Text>{payments.map(x=><View key={x.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{x.customerName} • {tr(x.method)}</Text><Text style={s.itemSub}>{x.date} {x.note}{x.reference?' • '+tr('مرجع الشيك')+': '+x.reference:''}{x.allocations?.length?` • ${tr('موزع على الفواتير:')} ${x.allocations.map(allocation=>`${documents.find(document=>document.id===allocation.documentId)?.number||allocation.documentId} ${(allocation.amountCentimes/100).toFixed(2)} DH`).join('، ')}`:''}</Text></View><Text style={s.itemPrice}>{x.amount.toFixed(2)} DH</Text><Pressable onPress={()=>exportPdf('Reçu de paiement',x.customerName,[`Mode: ${x.method}`,`Montant: ${x.amount.toFixed(2)} DH`,...(x.reference?[tr('مرجع الشيك')+': '+x.reference]:[]),x.note],x.amount)}><Text style={s.gold}>PDF</Text></Pressable></View>)}</>
      :screen==='الصندوق'?<><View style={s.panel}><Text style={s.panelTitle}>{tr('الصندوق النقدي')}</Text><Text style={[s.statNum,{marginVertical:8}]}>{tr('الرصيد الحالي:')} {(cashBalanceCentimes/100).toFixed(2)} DH</Text>{cashAccount.historicalJournal?<Text style={s.note}>{tr('تحافظ سجل الصندوق القديم. الحركات اللي كتسجل دابا كيبقاو كيتحسبو معاه.')}</Text>:<Text style={s.panelText}>{tr('الرصيد الافتتاحي')}: {(cashAccount.openingBalanceCentimes/100).toFixed(2)} DH{cashAccount.openingDate?' • '+cashAccount.openingDate:''}</Text>}{cashAccount.historicalJournal?null:cashAccount.openingDate?<Text style={s.note}>{tr('الرصيد الافتتاحي متسجل. استعمل حركة داخل أو خارج للتصحيح.')}</Text>:<><TextInput value={openingCashAmount} onChangeText={setOpeningCashAmount} keyboardType="decimal-pad" placeholder={tr('الرصيد الافتتاحي')+' DH'} placeholderTextColor="#888" style={s.input}/><Pressable style={s.action} onPress={changeOpeningCash}><Text style={s.actionText}>{tr('تحديد الرصيد الافتتاحي')}</Text></Pressable></>}<Pressable style={[s.choice,{marginTop:8,borderColor:GOLD,alignItems:'center'}]} onPress={exportCashRegisterCsv}><Text style={s.gold}>{tr('تصدير سجل الصندوق CSV')}</Text></Pressable><Pressable style={[s.choice,{marginTop:8,borderColor:GOLD,alignItems:'center'}]} onPress={exportCashRegisterXlsx}><Text style={s.gold}>{tr('تصدير سجل الصندوق Excel')}</Text></Pressable><Pressable style={[s.choice,{marginTop:8,borderColor:GOLD,alignItems:'center'}]} onPress={()=>exportPdf(language==='FR'?'Rapport de caisse':'تقرير الصندوق','',[`${tr('الرصيد الحالي:')} ${(cashBalanceCentimes/100).toFixed(2)} DH`,...cashRegisterRows.map(row=>`${row.date} • ${row.description} • ${row.direction==='in'?'+':'−'}${(row.amountCentimes/100).toFixed(2)} DH`)],cashBalanceCentimes/100)}><Text style={s.gold}>{tr('تصدير تقرير الصندوق PDF')}</Text></Pressable></View><View style={[s.panel,{marginTop:12}]}><Text style={s.panelTitle}>{tr('تسجيل الحركة')}</Text><Text style={s.fieldLabel}>{tr('نوع الحركة')}</Text><View style={s.row}>{(['in','out'] as const).map(direction=><Pressable key={direction} onPress={()=>setCashEntryDirection(direction)} style={[s.choice,{flex:1},cashEntryDirection===direction&&s.choiceActive]}><Text style={s.itemTitle}>{tr(direction==='in'?'داخل للصندوق':'خارج من الصندوق')}</Text></Pressable>)}</View><TextInput value={cashEntryAmount} onChangeText={setCashEntryAmount} keyboardType="decimal-pad" placeholder={tr('المبلغ DH')} placeholderTextColor="#888" style={s.input}/><TextInput value={cashEntryDescription} onChangeText={setCashEntryDescription} placeholder={tr('وصف الحركة')} placeholderTextColor="#888" style={s.input}/><Pressable style={s.action} onPress={addManualCashMovement}><Text style={s.actionText}>{tr('تسجيل الحركة')}</Text></Pressable></View><View style={[s.panel,{marginTop:12}]}><Text style={s.panelTitle}>{tr('الحسابات البنكية والتحويلات')}</Text><TextInput value={bankName} onChangeText={setBankName} placeholder={tr('اسم الحساب البنكي')} placeholderTextColor="#888" style={s.input}/>{!editingBankAccountId&&<TextInput value={bankOpeningAmount} onChangeText={setBankOpeningAmount} keyboardType="decimal-pad" placeholder={tr('الرصيد الافتتاحي البنكي DH')} placeholderTextColor="#888" style={s.input}/>}<Pressable style={s.action} onPress={addBankAccount}><Text style={s.actionText}>{tr(editingBankAccountId?'حفظ اسم الحساب':'إضافة حساب بنكي')}</Text></Pressable>{editingBankAccountId&&<Pressable style={s.choice} onPress={()=>{setEditingBankAccountId(null);setBankName('');}}><Text style={s.itemSub}>{tr('إلغاء التعديل')}</Text></Pressable>}{bankAccounts.map(account=><View key={account.id} style={[s.choice,bankTransferAccountId===account.id&&s.choiceActive]}><Pressable onPress={()=>{setBankTransferAccountId(account.id);setBankStatementClosingBalance('');}}><Text style={s.itemTitle}>{account.name} • {(calculateBankBalance(account,bankTransfers,payments,supplierPayments,bankOutflows)/100).toFixed(2)} DH</Text>{account.historicalJournal?<Text style={s.itemSub}>{tr('سجل البنك القديم محفوظ')}</Text>:<Text style={s.itemSub}>{tr('الرصيد الافتتاحي')}: {(account.openingBalanceCentimes/100).toFixed(2)} DH • {account.openingDate}</Text>}</Pressable><View style={[s.row,{marginTop:6}]}><Pressable style={[s.choice,{flex:1}]} onPress={()=>{setEditingBankAccountId(account.id);setBankName(account.name);setBankTransferAccountId(account.id);}}><Text style={s.gold}>{tr('تعديل الحساب')}</Text></Pressable><Pressable style={[s.choice,{flex:1,borderColor:'#8A3E3E'}]} onPress={()=>removeBankAccount(account)}><Text style={{color:'#E58B83'}}>{tr('حذف الحساب')}</Text></Pressable></View></View>)}<Text style={s.fieldLabel}>{tr('نوع التحويل')}</Text><View style={s.row}>{(['cash_to_bank','bank_to_cash'] as const).map(direction=><Pressable key={direction} onPress={()=>setBankTransferDirection(direction)} style={[s.choice,{flex:1},bankTransferDirection===direction&&s.choiceActive]}><Text style={s.itemTitle}>{tr(direction==='cash_to_bank'?'من الصندوق إلى البنك':'من البنك إلى الصندوق')}</Text></Pressable>)}</View><TextInput value={bankTransferAmount} onChangeText={setBankTransferAmount} keyboardType="decimal-pad" placeholder={tr('مبلغ التحويل DH')} placeholderTextColor="#888" style={s.input}/><TextInput value={bankTransferDescription} onChangeText={setBankTransferDescription} placeholder={tr('وصف التحويل')} placeholderTextColor="#888" style={s.input}/><Pressable style={s.action} disabled={!bankAccounts.length} onPress={addBankTransfer}><Text style={s.actionText}>{tr('تسجيل التحويل')}</Text></Pressable><Text style={s.fieldLabel}>{tr('الحركات البنكية المرتبطة')}</Text>{bankLedgerEntries.filter(item=>item.bankAccountId===bankTransferAccountId).slice().sort((a,b)=>b.date.localeCompare(a.date)).map(item=><Text key={item.id} style={s.itemSub}>{item.date} • {item.amountCentimes>0?'+':''}{(item.amountCentimes/100).toFixed(2)} DH{item.description?' • '+item.description:''}</Text>)}</View><Text style={s.section}>{tr('سجل حركة الصندوق')} ({cashRegisterRows.length})</Text>{cashRegisterRows.map(row=><View key={row.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{row.description}</Text><Text style={s.itemSub}>{row.date} • {tr(row.direction==='in'?'داخل للصندوق':'خارج من الصندوق')}</Text></View><Text style={[s.itemPrice,{color:row.direction==='in'?'#80C98C':'#E58B83'}]}>{row.direction==='in'?'+':'−'}{(row.amountCentimes/100).toFixed(2)} DH</Text></View>)}{cashRegisterRows.length===0&&<Text style={s.empty}>{tr('مازال ما كايناش حركات.')}</Text>}<View style={[s.panel,{marginTop:12}]}><Text style={s.panelTitle}>{tr('مطابقة كشف البنك')}</Text><Text style={s.panelText}>{tr('اختار حساباً بنكياً من الأعلى، ثم حمّل ملف CSV صادر من البنك.')}</Text><Pressable style={[s.action,{marginTop:8}]} disabled={bankStatementBusy||!bankTransferAccountId} onPress={importBankStatement}><Text style={s.actionText}>{bankStatementBusy?tr('جاري التحميل...'):tr('استيراد كشف البنك CSV')}</Text></Pressable><Text style={s.fieldLabel}>{tr('رصيد الكشف الختامي:')}</Text><TextInput value={bankStatementClosingBalance} onChangeText={setBankStatementClosingBalance} keyboardType="decimal-pad" placeholder="0.00 DH" placeholderTextColor="#888" style={s.input}/>{selectedReconciliation&&<View style={s.summary}><Text style={s.summaryText}>{tr('الرصيد المحسوب حتى تاريخ الكشف:')} {(selectedReconciliation.expectedBalanceCentimes/100).toFixed(2)} DH</Text><Text style={s.summaryText}>{tr('فرق الرصيد:')} {displayedBankClosingCentimes===undefined?'—':((displayedBankClosingCentimes-selectedReconciliation.expectedBalanceCentimes)/100).toFixed(2)} DH</Text><Text style={s.summaryText}>{tr('مطابق')}: {selectedReconciliation.matched} • {tr('غير مطابق')}: {selectedReconciliation.unmatched} • {tr('مطابقة محتملة متعددة')}: {selectedReconciliation.ambiguous}</Text></View>}{selectedStatementLines.map(line=>{const match=selectedStatementMatches.find(item=>item.lineId===line.id);const confirmed=confirmedBankStatementLineIds.includes(line.id);return <View key={line.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{line.description||tr('بدون وصف')}</Text><Text style={s.itemSub}>{line.date} • {(line.amountCentimes/100).toFixed(2)} DH • {tr(match?.status==='matched'?'مطابق':match?.status==='ambiguous'?'مطابقة محتملة متعددة':'غير مطابق')}</Text></View>{match?.status==='matched'&&<Pressable style={s.choice} onPress={()=>toggleBankStatementConfirmation(line.id)}><Text style={s.gold}>{tr(confirmed?'مطابقة معتمدة':'اعتماد المطابقة')}</Text></Pressable>}</View>;})}{selectedStatementLines.length===0&&<Text style={s.empty}>{tr('مازال ما كايناش حركات.')}</Text>}<Pressable style={[s.action,{marginTop:8}]} disabled={!selectedStatementLines.length} onPress={saveBankReconciliation}><Text style={s.actionText}>{tr('حفظ نتيجة التسوية')}</Text></Pressable><Text style={s.section}>{tr('سجل التسويات البنكية')}</Text>{selectedStatementHistory.map(record=><View key={record.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{record.fromDate} — {record.toDate}</Text><Text style={s.itemSub}>{new Date(record.createdAt).toLocaleString(language==='FR'?'fr-MA':'ar-MA')} • {record.confirmed} {tr('مطابق مؤكد')}</Text></View><Text style={s.itemPrice}>{tr('الفرق:')} {(record.differenceCentimes/100).toFixed(2)} DH</Text></View>)}{selectedBankAccount?.historicalJournal?.reconciliations.map(record=><View key={'archived-'+record.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{record.date.slice(0,10)} • {tr('تسوية قديمة')}</Text><Text style={s.itemSub}>{tr('رصيد الكشف الختامي:')} {(record.statementBalanceCentimes/100).toFixed(2)} DH{record.note?' • '+record.note:''}</Text></View><Text style={s.itemPrice}>{tr('الفرق:')} {(record.differenceCentimes/100).toFixed(2)} DH</Text></View>)}{selectedStatementHistory.length===0&&!selectedBankAccount?.historicalJournal?.reconciliations.length&&<Text style={s.empty}>{tr('مازال ما كايناش حركات.')}</Text>}</View></>
      :screen==='النسخ الاحتياطي'?<><View style={s.panel}><Text style={s.panelTitle}>{tr('حماية بياناتك')}</Text><Text style={s.panelText}>{tr('صدر نسخة JSON فيها المنتجات والزبناء والموردين والمبيعات والمرتجعات والمشتريات وأداءات الموردين والمصاريف الدورية والمصاريف المسجلة والصندوق والحسابات البنكية والتحويلات والمشاريع والمهام والعروض والأداءات. خزن الملف فمكان آمن.')}</Text><Pressable style={[s.action,{marginTop:14}]} disabled={backupBusy} onPress={exportBackup}><Text style={s.actionText}>{backupBusy?tr('جاري التحضير...'):storageReady?tr('تصدير نسخة احتياطية'):tr('تصدير البيانات الأصلية')}</Text></Pressable></View><View style={[s.panel,{marginTop:14}]}><Text style={s.panelTitle}>{tr('استرجاع نسخة')}</Text><Text style={s.panelText}>{tr('اختار ملف النسخة الاحتياطية JSON من الهاتف؛ ويمكنك أيضاً لصق محتواه هنا. الاسترجاع كيعوض البيانات الحالية.')}</Text><Pressable style={[s.choice,{borderColor:GOLD,alignItems:'center'}]} onPress={chooseBackupFile}><Text style={s.gold}>{tr('اختيار ملف النسخة الاحتياطية')}</Text></Pressable><TextInput value={backupText} onChangeText={setBackupText} multiline numberOfLines={8} textAlignVertical="top" placeholder={tr('لصق محتوى ملف JSON هنا...')} placeholderTextColor="#888" style={[s.input,{minHeight:150,textAlign:'left'}]}/><Pressable style={s.action} disabled={backupBusy||!backupText.trim()} onPress={importBackup}><Text style={s.actionText}>{tr('استرجاع البيانات')}</Text></Pressable></View></>
      :screen==='التقارير'?<>
        <View style={s.panel}>
          <Text style={s.panelTitle}>{tr('تقرير النشاط التجاري')}</Text>
          <TextInput value={reportSearch} onChangeText={setReportSearch} placeholder={tr('بحث التقرير')} placeholderTextColor="#888" style={s.input}/>
          <View style={[s.row,{marginTop:8}]}><TextInput value={reportStart} onChangeText={setReportStart} placeholder={tr('من تاريخ YYYY-MM-DD')} placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={reportEnd} onChangeText={setReportEnd} placeholder={tr('إلى تاريخ YYYY-MM-DD')} placeholderTextColor="#888" style={[s.input,s.half]}/></View>
          <View style={s.row}><Pressable style={[s.choice,{flex:1,borderColor:GOLD}]} onPress={applyReportRange}><Text style={s.gold}>{tr('تطبيق الفترة')}</Text></Pressable><Pressable style={[s.choice,{flex:1}]} onPress={()=>{setReportStart('');setReportEnd('');setReportSearch('');setAppliedReportRange(null);setAppliedReportSearch('');}}><Text style={s.itemTitle}>{tr('مسح الفترة')}</Text></Pressable></View>
          <Text style={s.note}>{appliedReportRange?tr('الفترة المحددة')+': '+(appliedReportRange.from||'—')+' → '+(appliedReportRange.to||'—'):tr('كل الفترات')}{appliedReportSearch?' • '+tr('بحث التقرير')+': '+appliedReportSearch:''}</Text>
          <Text style={s.panelText}>{tr('إجمالي المبيعات:')} {reportSalesTotal.toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('إجمالي المشتريات:')} {reportPurchaseTotal.toFixed(2)} DH</Text><Text style={[s.panelText,{fontWeight:'800',marginTop:6}]}>{tr('مقارنة الموردين')}</Text>{reportPurchasesBySupplier.map(item=><Text key={item.supplierName} style={s.itemSub}>• {item.supplierName}: {tr('عدد المشتريات')} {item.purchaseCount}، {tr('الكمية')} {item.quantityMilliUnits/1000}، {tr('المشتريات')} {(item.purchaseTotalCentimes/100).toFixed(2)} DH، {tr('الأداء عند الشراء')} {(item.paidAtPurchaseCentimes/100).toFixed(2)} DH، {tr('تسويات الفترة')} {(item.cashSettledCentimes/100).toFixed(2)} DH، {tr('إشعارات دائنة')} {(item.creditNoteCentimes/100).toFixed(2)} DH</Text>)}
          <Text style={s.panelText}>{tr('إجمالي المصاريف:')} {reportExpenseTotal.toFixed(2)} DH</Text><Text style={[s.panelText,{fontWeight:'800',marginTop:6}]}>{tr('المصاريف حسب التصنيف')}</Text>{reportExpenseCategories.map(([category,value])=><Text key={category} style={s.panelText}>• {category}: {value.toFixed(2)} DH</Text>)}
          <Text style={s.panelText}>{tr('تحصيلات الزبناء فالفترة:')} {reportPayments.reduce((sum,item)=>sum+item.amount,0).toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('أداءات الموردين فالفترة:')} {reportSupplierPayments.filter(item=>item.method!=='إشعار دائن').reduce((sum,item)=>sum+item.amount,0).toFixed(2)} DH</Text><Text style={s.panelText}>{tr('أداءات أجور التقنيين فالفترة:')} {(reportPayrollPaidCentimes/100).toFixed(2)} DH • {reportPayrollSettlements.length} {tr('تسوية')}</Text>{reportPayrollByTechnician.map(item=><Text key={item.technicianId} style={s.itemSub}>• {item.technicianName}: {(item.paidCentimes/100).toFixed(2)} DH ({item.paymentCount} {tr('تسوية')})</Text>)}
          <Text style={s.panelText}>{tr('ديون الزبناء الحالية:')} {receivablesTotal.toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('ديون الموردين الحالية:')} {supplierOutstandingTotal.toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('الرصيد الحالي:')} {(cashBalanceCentimes/100).toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('صافي حركة الصندوق فالفترة:')} {(reportCashRows.reduce((sum,row)=>sum+(row.direction==='in'?row.amountCentimes:-row.amountCentimes),0)/100).toFixed(2)} DH • {reportCashRows.length} {tr('حركة')}</Text>
          <Text style={s.panelText}>{tr('صافي حركة الحسابات البنكية فالفترة:')} {(reportBankEntries.reduce((sum,entry)=>sum+entry.amountCentimes,0)/100).toFixed(2)} DH • {reportBankEntries.length} {tr('حركة')}</Text>
          <Text style={s.panelText}>{tr('حركات المخزون فالفترة:')} {reportStockMovements.length}</Text>
          <Text style={s.panelText}>{tr('تكلفة أجور المشاريع فالفترة:')} {reportProjectLaborCost.toFixed(2)} DH • {tr('ساعات العمل فالفترة:')} {reportProjectHours.toFixed(2)}</Text>{reportTechnicianWork.map((item,index)=><Text key={item.technicianId??item.technician+'-'+index} style={s.itemSub}>• {tr('ملخص عمل التقني')} {item.technician}: {item.hours} {tr('ساعة')}، {item.workEntryCount} {tr('تسجيل')}, {item.projectCount} {tr('مشروع')}, {(item.laborCostCentimes/100).toFixed(2)} DH</Text>)}
          <Text style={s.panelText}>{tr('تكلفة البضاعة المباعة (حسب تكلفة البيع المحفوظة):')} {reportProfitLoss.costOfGoodsSold.toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('هامش الربح من المبيعات ذات التكلفة المسجلة:')} {reportProfitLoss.grossProfitOnCostedSales.toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('النتيجة بعد المصاريف على البيانات المحتسبة:')} {reportProfitLoss.netProfitOnCostedSales.toFixed(2)} DH</Text>
          {reportProfitLoss.uncostedRevenue>0&&<Text style={s.note}>{tr('قيمة المبيعات بلا تكلفة محفوظة:')} {reportProfitLoss.uncostedRevenue.toFixed(2)} DH</Text>}
          <Pressable style={s.action} onPress={()=>exportPdf('Rapport d’activité','',[appliedReportRange?tr('الفترة المحددة')+': '+(appliedReportRange.from||'—')+' → '+(appliedReportRange.to||'—'):tr('كل الفترات'),tr('بحث التقرير')+': '+(appliedReportSearch||tr('الكل')),'Ventes nettes: '+reportSalesTotal.toFixed(2)+' DH','Achats (stock): '+reportPurchaseTotal.toFixed(2)+' DH',...reportPurchasesBySupplier.map(item=>`${tr('مقارنة الموردين')} ${item.supplierName}: ${(item.purchaseTotalCentimes/100).toFixed(2)} DH · ${tr('الأداء عند الشراء')} ${(item.paidAtPurchaseCentimes/100).toFixed(2)} DH · ${tr('تسويات الفترة')} ${(item.cashSettledCentimes/100).toFixed(2)} DH · ${tr('إشعارات دائنة')} ${(item.creditNoteCentimes/100).toFixed(2)} DH`),'Dépenses: '+reportExpenseTotal.toFixed(2)+' DH',`${tr('أداءات أجور التقنيين فالفترة:')} ${(reportPayrollPaidCentimes/100).toFixed(2)} DH`,...reportPayrollByTechnician.map(item=>`${item.technicianName}: ${(item.paidCentimes/100).toFixed(2)} DH`),...reportExpenseCategories.map(([category,value])=>`${tr('المصاريف حسب التصنيف')}: ${category} — ${value.toFixed(2)} DH`),tr('تكلفة أجور المشاريع فالفترة:')+' '+reportProjectLaborCost.toFixed(2)+' DH • '+tr('ساعات العمل فالفترة:')+' '+reportProjectHours.toFixed(2),...reportTechnicianWork.map(item=>`${tr('ملخص عمل التقني')} ${item.technician}: ${item.hours} ${tr('ساعة')}, ${item.workEntryCount} ${tr('تسجيل')}, ${item.projectCount} ${tr('مشروع')}, ${(item.laborCostCentimes/100).toFixed(2)} DH`),'Solde de caisse: '+(cashBalanceCentimes/100).toFixed(2)+' DH','Coût de revient enregistré: '+reportProfitLoss.costOfGoodsSold.toFixed(2)+' DH','Marge brute calculable: '+reportProfitLoss.grossProfitOnCostedSales.toFixed(2)+' DH','Résultat après dépenses (données comptabilisées): '+reportProfitLoss.netProfitOnCostedSales.toFixed(2)+' DH','Ventes sans coût enregistré: '+reportProfitLoss.uncostedRevenue.toFixed(2)+' DH'],reportProfitLoss.netProfitOnCostedSales)}><Text style={s.actionText}>{tr('تصدير تقرير النشاط PDF')}</Text></Pressable>
          <Pressable style={[s.choice,{marginTop:8,borderColor:GOLD,alignItems:'center'}]} onPress={exportActivityReportCsv}><Text style={s.gold}>{tr('تصدير تفاصيل الفترة CSV')}</Text></Pressable>
          <Pressable style={[s.choice,{marginTop:8,borderColor:GOLD,alignItems:'center'}]} onPress={exportActivityReportXlsx}><Text style={s.gold}>{tr('تصدير تقرير الفترة Excel')}</Text></Pressable>
          <Pressable style={[s.choice,{marginTop:8,borderColor:GOLD,alignItems:'center'}]} onPress={exportBusinessLedger}><Text style={s.gold}>{tr('تصدير السجل الكامل CSV')}</Text></Pressable><Pressable style={[s.choice,{marginTop:8,borderColor:GOLD,alignItems:'center'}]} onPress={exportBusinessLedgerXlsx}><Text style={s.gold}>{tr('تصدير السجل الكامل Excel')}</Text></Pressable>
        </View>
        {renderDetailReport()}
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
