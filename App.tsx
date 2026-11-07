import React, {useEffect, useMemo, useState} from 'react';
import {SafeAreaView, View, ScrollView, StyleSheet, Alert, ActivityIndicator, Share, Image, Modal} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {readAppData, writeAppData, createBackup, restoreBackup} from './src/storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import QuoteWorkspace, {QuoteRecord, QuoteConversionType} from './src/QuoteWorkspace';
import PosWorkspace from './src/PosWorkspace';
import {convertQuote as createConvertedDocument, ConvertedDocument} from './src/domain/document-conversion';
import {applyPaymentToInvoice} from './src/domain/payment-allocation';
import {calculateCustomerBalances} from './src/domain/customer-balances';
import {calculateSalesProfit} from './src/domain/profit';
import {calculateSupplierBalances} from './src/domain/supplier-balances';
import {AppLanguage, LanguageContext, TText as Text, TTextInput as TextInput} from './src/i18n';
import AccessiblePressable from './src/AccessiblePressable';
const Pressable = AccessiblePressable;
import {InventoryMovement, appendInventoryMovement, createStockCount} from './src/domain/inventory-ledger';
import {calculateSalesReturn, remainingReturnQuantity, totalReturnProfitAdjustment} from './src/domain/sales-returns';
import {allocateSupplierPayment, reverseSupplierPayment} from './src/domain/supplier-payments';
import {calculateSupplierReturn, remainingSupplierReturnQuantity, SupplierReturnRecord} from './src/domain/supplier-returns';
import {CashMovement, appendCashMovement, cashBalance} from './src/domain/cashbook';

const GOLD = '#D6AE55';
const htmlSafe=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
const STORE_KEY = 'hamza_app_data_v03';
const modules = [
  {ar:'المنتجات',en:'Products',icon:'▦'}, {ar:'نقطة البيع',en:'Point of Sale',icon:'🛒'}, {ar:'الزبناء',en:'Customers',icon:'♙'}, 
  {ar:'الموردون',en:'Suppliers',icon:'♧'}, {ar:'المبيعات',en:'Sales',icon:'↗'}, {ar:'المرتجعات',en:'Sales returns',icon:'↩'},
  {ar:'جرد وحركات المخزون',en:'Stock count & movements',icon:'⇄'},
  {ar:'المشتريات',en:'Purchases',icon:'↙'}, {ar:'المخزون',en:'Stock',icon:'▤'},
  {ar:'عروض الأسعار',en:'Quotes / Devis',icon:'▧'}, {ar:'الفواتير',en:'Invoices',icon:'▣'},
  {ar:'Bon de sortie',en:'Delivery notes',icon:'⇧'}, {ar:'المصاريف',en:'Expenses',icon:'−'}, {ar:'الصندوق',en:'Cash register',icon:'د.م'},
  {ar:'النسخ الاحتياطي',en:'Backup & Restore',icon:'↻'},
  {ar:'المشاريع والمهام',en:'Projects & tasks',icon:'📋'},
  {ar:'الأداءات',en:'Payments',icon:'د.م'}, {ar:'التقارير',en:'Reports',icon:'▥'},
];
type Product = {id:number; name:string; price:number; qty:number; costPrice?:number; reference?:string; barcode?:string; category?:string; brand?:string; unit?:string; variant?:string; photoData?:string};
type Customer = {id:number; name:string; phone?:string; address?:string; ice?:string; openingBalanceCentimes?:number; creditLimitCentimes?:number; paymentTermsDays?:number};
type Sale = {id:number; productId?:number; productName:string; customerName:string; qty:number; unitPrice:number; total:number; date:string; paymentMethod?:string; discount?:number; costPrice?:number};
type SalesReturn = {id:number; saleId:number; productId?:number; productName:string; customerName:string; qty:number; unitPrice:number; total:number; costPrice?:number; date:string; reason:string; restocked:boolean};
type Purchase = {id:number; productId?:number; productName:string; supplierName:string; qty:number; unitCost:number; total:number; date:string; paidCentimes?:number; returnedCentimes?:number};
type SupplierPayment = {id:number; purchaseId:number; supplierName:string; amountCentimes:number; method:string; date:string; note:string};
type Expense = {id:number; title:string; amount:number; date:string; projectId?:number; category?:string};
type Supplier = {id:number; name:string; phone?:string; address?:string; ice?:string; openingBalanceCentimes?:number; creditLimitCentimes?:number; paymentTermsDays?:number};
type Quote = QuoteRecord;
type CommercialDocument = ConvertedDocument & {paidCentimes?:number};
type Payment = {id:number; customerName:string; amount:number; method:string; date:string; note:string; documentId?:number};
type ProjectStatus = 'planned'|'active'|'completed'|'cancelled';
type Project = {id:number; name:string; customerName:string; budget:number; spent:number; status:ProjectStatus; startDate:string; dueDate:string; notes:string};
type TaskStatus = 'todo'|'doing'|'done';
type TaskPriority = 'low'|'medium'|'high';
type WorkTask = {id:number; title:string; projectId?:number; assignee:string; priority:TaskPriority; dueDate:string; durationHours:number; status:TaskStatus};
export default function App() {
  const [screen,setScreen]=useState('الرئيسية');
  const [search,setSearch]=useState(''); const [productSearch,setProductSearch]=useState(''); const [photoData,setPhotoData]=useState(''); const [photoPreview,setPhotoPreview]=useState<string|null>(null);
  const [language,setLanguage]=useState<AppLanguage>('AR');
  const [products,setProducts]=useState<Product[]>([]);
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [sales,setSales]=useState<Sale[]>([]);
  const [salesReturns,setSalesReturns]=useState<SalesReturn[]>([]);
  const [returnSaleId,setReturnSaleId]=useState('');
  const [returnQuantity,setReturnQuantity]=useState('1');
  const [returnReason,setReturnReason]=useState('');
  const [returnRestock,setReturnRestock]=useState(true);
  const [purchases,setPurchases]=useState<Purchase[]>([]); const [supplierPayments,setSupplierPayments]=useState<SupplierPayment[]>([]); const [supplierReturns,setSupplierReturns]=useState<SupplierReturnRecord[]>([]); const [expenses,setExpenses]=useState<Expense[]>([]); const [suppliers,setSuppliers]=useState<Supplier[]>([]);
  const [quotes,setQuotes]=useState<Quote[]>([]); const [payments,setPayments]=useState<Payment[]>([]); const [documents,setDocuments]=useState<CommercialDocument[]>([]);
  const [inventoryMovements,setInventoryMovements]=useState<InventoryMovement[]>([]);
  const [cashMovements,setCashMovements]=useState<CashMovement[]>([]);
  const [cashMovementKind,setCashMovementKind]=useState<'opening'|'cash_in'|'cash_out'>('cash_in');
  const [cashMovementAmount,setCashMovementAmount]=useState('');
  const [cashMovementDescription,setCashMovementDescription]=useState('');
  const [projects,setProjects]=useState<Project[]>([]);
  const [workTasks,setWorkTasks]=useState<WorkTask[]>([]);
  const [editingProjectId,setEditingProjectId]=useState<number|null>(null);
  const [editingTaskId,setEditingTaskId]=useState<number|null>(null);
  const [projectName,setProjectName]=useState(''); const [projectCustomer,setProjectCustomer]=useState(''); const [projectBudget,setProjectBudget]=useState(''); const [projectStartDate,setProjectStartDate]=useState(''); const [projectDueDate,setProjectDueDate]=useState(''); const [projectNotes,setProjectNotes]=useState('');
  const [taskTitle,setTaskTitle]=useState(''); const [taskProjectId,setTaskProjectId]=useState(''); const [taskAssignee,setTaskAssignee]=useState(''); const [taskPriority,setTaskPriority]=useState<TaskPriority>('medium'); const [taskDueDate,setTaskDueDate]=useState(''); const [taskDuration,setTaskDuration]=useState('');
  const [stockCountProduct,setStockCountProduct]=useState(''); const [stockCountQuantity,setStockCountQuantity]=useState(''); const [stockCountNote,setStockCountNote]=useState('');
  const [quoteProduct,setQuoteProduct]=useState(''); const [quoteCustomer,setQuoteCustomer]=useState(''); const [quoteQty,setQuoteQty]=useState('1');
  const [paymentCustomer,setPaymentCustomer]=useState(''); const [paymentDocument,setPaymentDocument]=useState(''); const [paymentAmount,setPaymentAmount]=useState(''); const [paymentMethod,setPaymentMethod]=useState('نقداً'); const [paymentNote,setPaymentNote]=useState('');
  const [supplierName,setSupplierName]=useState(''); const [supplierPhone,setSupplierPhone]=useState(''); const [supplierAddress,setSupplierAddress]=useState(''); const [supplierIce,setSupplierIce]=useState(''); const [supplierOpeningBalance,setSupplierOpeningBalance]=useState(''); const [supplierCreditLimit,setSupplierCreditLimit]=useState(''); const [supplierPaymentTerms,setSupplierPaymentTerms]=useState(''); const [purchaseProduct,setPurchaseProduct]=useState(''); const [purchaseSupplier,setPurchaseSupplier]=useState(''); const [purchaseQty,setPurchaseQty]=useState('1'); const [purchaseCost,setPurchaseCost]=useState(''); const [supplierPaymentPurchaseId,setSupplierPaymentPurchaseId]=useState<number|null>(null); const [supplierPaymentAmount,setSupplierPaymentAmount]=useState(''); const [supplierReturnPurchaseId,setSupplierReturnPurchaseId]=useState<number|null>(null); const [supplierReturnQuantity,setSupplierReturnQuantity]=useState('1'); const [supplierReturnReason,setSupplierReturnReason]=useState(''); const [expenseTitle,setExpenseTitle]=useState(''); const [expenseAmount,setExpenseAmount]=useState(''); const [expenseCategory,setExpenseCategory]=useState(''); const [expenseProjectId,setExpenseProjectId]=useState('');
  const [loaded,setLoaded]=useState(false); const [backupText,setBackupText]=useState(''); const [backupBusy,setBackupBusy]=useState(false);
  const [productBulkText,setProductBulkText]=useState('');
  const [name,setName]=useState(''); const [price,setPrice]=useState(''); const [costPrice,setCostPrice]=useState(''); const [qty,setQty]=useState(''); const [productReference,setProductReference]=useState(''); const [productBarcode,setProductBarcode]=useState(''); const [productCategory,setProductCategory]=useState(''); const [productBrand,setProductBrand]=useState(''); const [productUnit,setProductUnit]=useState(''); const [productVariant,setProductVariant]=useState(''); const [editingProductId,setEditingProductId]=useState<number|null>(null);
  const [customer,setCustomer]=useState(''); const [customerPhone,setCustomerPhone]=useState(''); const [customerAddress,setCustomerAddress]=useState(''); const [customerIce,setCustomerIce]=useState(''); const [customerOpeningBalance,setCustomerOpeningBalance]=useState(''); const [customerCreditLimit,setCustomerCreditLimit]=useState(''); const [customerPaymentTerms,setCustomerPaymentTerms]=useState('');
  const [saleProduct,setSaleProduct]=useState(''); const [saleCustomer,setSaleCustomer]=useState(''); const [saleQty,setSaleQty]=useState('1');
  useEffect(()=>{(async()=>{try{const d=await readAppData({products:[],customers:[],sales:[],salesReturns:[],purchases:[],supplierPayments:[],supplierReturns:[],cashMovements:[],expenses:[],suppliers:[],quotes:[],payments:[],documents:[],inventoryMovements:[],projects:[],workTasks:[],language:"AR"});setProducts(Array.isArray(d.products)?d.products as Product[]:[]);setCustomers(Array.isArray(d.customers)?d.customers as Customer[]:[]);setSales(Array.isArray(d.sales)?d.sales as Sale[]:[]);setSalesReturns(Array.isArray(d.salesReturns)?d.salesReturns as SalesReturn[]:[]);setPurchases(Array.isArray(d.purchases)?d.purchases as Purchase[]:[]);setSupplierPayments(Array.isArray(d.supplierPayments)?d.supplierPayments as SupplierPayment[]:[]);setSupplierReturns(Array.isArray(d.supplierReturns)?d.supplierReturns as SupplierReturnRecord[]:[]);setCashMovements(Array.isArray(d.cashMovements)?d.cashMovements as CashMovement[]:[]);setExpenses(Array.isArray(d.expenses)?d.expenses as Expense[]:[]);setSuppliers(Array.isArray(d.suppliers)?d.suppliers as Supplier[]:[]);setQuotes(Array.isArray(d.quotes)?d.quotes as Quote[]:[]);setPayments(Array.isArray(d.payments)?d.payments as Payment[]:[]);setDocuments(Array.isArray(d.documents)?d.documents as CommercialDocument[]:[]);setProjects(Array.isArray(d.projects)?d.projects as Project[]:[]);setWorkTasks(Array.isArray(d.workTasks)?d.workTasks as WorkTask[]:[]);setLanguage(d.language==='FR'?'FR':'AR');const savedProducts=Array.isArray(d.products)?d.products as Product[]:[];const savedMovements=Array.isArray(d.inventoryMovements)?d.inventoryMovements as InventoryMovement[]:[];setInventoryMovements(savedMovements.length?savedMovements:savedProducts.filter(p=>p.qty>0).map(p=>({id:'opening-'+p.id,productId:p.id,productName:p.name,kind:'opening' as const,quantityDelta:p.qty,date:new Date().toISOString(),note:'رصيد افتتاحي من البيانات القديمة'})));}catch(e){Alert.alert('تنبيه',e instanceof Error?e.message:'تعذر تحميل البيانات المحفوظة.');}finally{setLoaded(true);}})();},[]);
  useEffect(()=>{if(loaded){writeAppData({products,customers,sales,salesReturns,purchases,supplierPayments,supplierReturns,cashMovements,expenses,suppliers,quotes,payments,documents,inventoryMovements,projects,workTasks,language}).catch(()=>Alert.alert('خطأ','ما قدرناش نحفظو البيانات.'));}},[products,customers,sales,salesReturns,purchases,supplierPayments,supplierReturns,expenses,suppliers,quotes,payments,documents,inventoryMovements,projects,workTasks,language,loaded]);
  const cashOnHand=useMemo(()=>cashBalance(cashMovements),[cashMovements]);
  const stockValue=useMemo(()=>products.reduce((a,p)=>a+p.price*p.qty,0),[products]);
  const potentialStockProfit=useMemo(()=>products.reduce((sum,p)=>sum+(p.price-(p.costPrice||0))*p.qty,0),[products]);
  const salesTotal=useMemo(()=>sales.reduce((a,x)=>a+x.total,0)-salesReturns.reduce((a,x)=>a+x.total,0),[sales,salesReturns]);
  const profitSummary=useMemo(()=>calculateSalesProfit(sales.map(x=>({total:x.total,quantity:x.qty,unitCost:x.costPrice}))),[sales]);
  const grossProfit=profitSummary.grossProfit-totalReturnProfitAdjustment(salesReturns);
  const untrackedSalesCount=profitSummary.untrackedSalesCount;
  const purchaseTotal=useMemo(()=>purchases.reduce((a,x)=>a+x.total,0),[purchases]); const expenseTotal=useMemo(()=>expenses.reduce((a,x)=>a+x.amount,0),[expenses]);
  const customerBalances=useMemo(()=>calculateCustomerBalances(documents,customers.map(c=>({customerName:c.name,openingBalanceCentimes:c.openingBalanceCentimes}))),[documents,customers]);
  const supplierBalances=useMemo(()=>calculateSupplierBalances(purchases,suppliers.map(x=>({supplierName:x.name,openingBalanceCentimes:x.openingBalanceCentimes})),supplierReturns),[purchases,suppliers,supplierReturns]);
  const supplierPayablesTotal=supplierBalances.reduce((sum,x)=>sum+x.outstandingCentimes,0)/100;
  const balanceFor=(customerName:string)=>customerBalances.find(x=>x.customerName===customerName);
  const receivablesTotal=useMemo(()=>customerBalances.reduce((sum,x)=>sum+x.outstandingCentimes,0)/100,[customerBalances]);
  const openInvoiceCount=useMemo(()=>documents.filter(d=>d.type==='invoice'&&(d.total*100-(d.paidCentimes||0))>0).length,[documents]);
  const lowStockProducts=useMemo(()=>products.filter(p=>p.qty>0&&p.qty<=5),[products]);
  const outOfStockCount=useMemo(()=>products.filter(p=>p.qty<=0).length,[products]);
  const quoteTotal=useMemo(()=>quotes.reduce((sum,q)=>sum+q.total,0),[quotes]);
  const recordInventoryMovement=(movement:InventoryMovement)=>{try{const next=appendInventoryMovement(inventoryMovements,movement);setInventoryMovements(next);return true;}catch(error){Alert.alert('حركة المخزون',error instanceof Error?error.message:'تعذر تسجيل حركة المخزون.');return false;}};
  const addCashMovement=()=>{
    const amount=Number(cashMovementAmount.replace(',','.'));
    if(!Number.isFinite(amount)||amount<=0||!cashMovementDescription.trim()){Alert.alert('معلومات ناقصة','دخل مبلغ موجب ووصف واضح لحركة الصندوق.');return;}
    const record:CashMovement={id:'cash-'+Date.now(),kind:cashMovementKind,amountCentimes:Math.round(amount*100),date:new Date().toISOString(),description:cashMovementDescription.trim()};
    try{const next=appendCashMovement(cashMovements,record);setCashMovements(next);setCashMovementAmount('');setCashMovementDescription('');Alert.alert('تم تسجيل الحركة','الرصيد الحالي بعد التسجيل: '+(cashBalance(next)/100).toFixed(2)+' DH');}
    catch(error){Alert.alert('تعذر تسجيل الحركة',error instanceof Error?error.message:'راجع رصيد الصندوق.');}
  };
  const saveStockCount=()=>{const product=products.find(p=>String(p.id)===stockCountProduct);const counted=Number(stockCountQuantity.replace(',','.'));if(!product||!stockCountQuantity.trim()||!Number.isFinite(counted)||counted<0){Alert.alert('معلومات ناقصة','اختار المنتج ودخل الكمية المعدودة بشكل صحيح.');return;}try{const result=createStockCount(inventoryMovements,{id:'count-'+Date.now(),productId:product.id,productName:product.name,countedQuantity:counted,date:new Date().toISOString(),note:stockCountNote.trim()});setInventoryMovements(appendInventoryMovement(inventoryMovements,result.movement));setProducts(current=>current.map(p=>p.id===product.id?{...p,qty:counted}:p));setStockCountQuantity('');setStockCountNote('');Alert.alert('تم تسجيل الجرد',`المخزون السابق: ${result.expectedQuantity} • المعدود: ${counted} • الفرق: ${result.difference>0?'+':''}${result.difference}`);}catch(error){Alert.alert('تعذر تسجيل الجرد',error instanceof Error?error.message:'راجع الكمية.');}};
  const resetProductForm=()=>{setName('');setPrice('');setCostPrice('');setQty('');setProductReference('');setProductBarcode('');setProductCategory('');setProductBrand('');setProductUnit('');setProductVariant('');setPhotoData('');setEditingProductId(null);};
  const startEditProduct=(p:Product)=>{setEditingProductId(p.id);setName(p.name);setPrice(String(p.price));setCostPrice(p.costPrice===undefined?'':String(p.costPrice));setQty(String(p.qty));setProductReference(p.reference||'');setProductBarcode(p.barcode||'');setProductCategory(p.category||'');setProductBrand(p.brand||'');setProductUnit(p.unit||'');setProductVariant(p.variant||'');setPhotoData(p.photoData||'');};
  const addProduct=()=>{const n=Number(price.replace(',','.'));const cost=costPrice.trim()===''?undefined:Number(costPrice.replace(',','.'));const q=Number(qty||'0');const reference=productReference.trim();const barcode=productBarcode.trim();const category=productCategory.trim();const brand=productBrand.trim();const unit=productUnit.trim();const variant=productVariant.trim();if(!name.trim()||!price.trim()||!Number.isFinite(n)||n<0||(cost!==undefined&&(!Number.isFinite(cost)||cost<0))||!Number.isFinite(q)||q<0){Alert.alert('معلومات ناقصة','دخل اسم المنتج وثمن وكمية صحيحين.');return;}const duplicate=products.find(p=>p.id!==editingProductId&&((reference&&p.reference?.toLowerCase()===reference.toLowerCase())||(barcode&&p.barcode===barcode)));if(duplicate){Alert.alert('مرجع مستعمل','المرجع أو الباركود مسجل من قبل عند المنتج: '+duplicate.name);return;}const details={name:name.trim(),price:n,costPrice:cost,qty:q,reference:reference||undefined,barcode:barcode||undefined,category:category||undefined,brand:brand||undefined,unit:unit||undefined,variant:variant||undefined,photoData:photoData||undefined};if(editingProductId!==null){const previous=products.find(p=>p.id===editingProductId);const difference=previous?q-previous.qty:0;if(difference!==0&&!recordInventoryMovement({id:'adjust-'+Date.now(),productId:editingProductId,productName:details.name,kind:'adjustment',quantityDelta:difference,date:new Date().toISOString(),note:'تعديل الكمية من بطاقة المنتج'}))return;setProducts(v=>v.map(p=>p.id===editingProductId?{...p,...details}:p));Alert.alert('تم التعديل','تبدلات معلومات المنتج بنجاح.');}else{const id=Date.now();if(q>0&&!recordInventoryMovement({id:'opening-'+id,productId:id,productName:details.name,kind:'opening',quantityDelta:q,date:new Date().toISOString(),note:'رصيد افتتاحي عند إنشاء المنتج'}))return;setProducts(v=>[{id,...details},...v]);}resetProductForm();};
  const pickProductPhoto=async()=>{try{const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted){Alert.alert('إذن الصور مطلوب','سمح للتطبيق بالوصول للصور لاختيار صورة المنتج.');return;}const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.55,base64:true});if(result.canceled)return;const asset=result.assets[0];if(!asset.base64){Alert.alert('تعذر تحميل الصورة','اختار صورة أخرى.');return;}setPhotoData('data:image/jpeg;base64,'+asset.base64);}catch{Alert.alert('خطأ','ما قدرناش نختارو الصورة.');}};
  const importProductsBulk=()=>{
    const rows=productBulkText.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    if(!rows.length){Alert.alert('ما كايناش بيانات','لصق لائحة المنتجات أولاً.');return;}
    const delimiter=rows[0].includes('\t')?'\t':';';
    const parse=(line:string)=>line.split(delimiter).map(value=>value.trim().replace(/^"|"$/g,'').replace(/""/g,'"'));
    const first=parse(rows[0]).map(value=>value.toLowerCase());
    const hasHeader=first.some(value=>['name','nom','الاسم','product'].includes(value));
    const dataRows=hasHeader?rows.slice(1):rows;
    const seenRefs=new Set(products.map(p=>(p.reference||'').toLowerCase()).filter(Boolean));
    const seenBarcodes=new Set(products.map(p=>p.barcode||'').filter(Boolean));
    const imported:Product[]=[];let rejected=0;
    for(const row of dataRows){
      const values=parse(row);
      const [productName,reference,barcode,category,costText,priceText,qtyText,brand,unit,variant]=values;
      const number=(value:string|undefined)=>value===undefined||value===''?0:Number(value.replace(',','.').replace(/\s/g,''));
      const cost=costText===undefined||costText===''?undefined:number(costText),salePrice=number(priceText),quantity=number(qtyText);
      if(!productName||!priceText||(cost!==undefined&&(!Number.isFinite(cost)||cost<0))||!Number.isFinite(salePrice)||salePrice<0||!Number.isInteger(quantity)||quantity<0){rejected++;continue;}
      const ref=(reference||'').toLowerCase(),code=barcode||'';
      if((ref&&seenRefs.has(ref))||(code&&seenBarcodes.has(code))){rejected++;continue;}
      if(ref)seenRefs.add(ref);if(code)seenBarcodes.add(code);
      imported.push({id:Date.now()+imported.length,name:productName,reference:reference||undefined,barcode:barcode||undefined,category:category||undefined,brand:brand||undefined,unit:unit||undefined,variant:variant||undefined,costPrice:cost,price:salePrice,qty:quantity});
    }
    if(!imported.length){Alert.alert('ما تزاد حتى منتج',`الأسطر المرفوضة: ${rejected}. راجع الصيغة والمرجع والباركود.`);return;}
    try{
      let nextMovements=inventoryMovements;
      for(const product of imported){
        if(product.qty>0)nextMovements=appendInventoryMovement(nextMovements,{id:'opening-'+product.id,productId:product.id,productName:product.name,kind:'opening',quantityDelta:product.qty,date:new Date().toISOString(),note:'رصيد افتتاحي مستورد مع لائحة المنتجات'});
      }
      setInventoryMovements(nextMovements);
    }catch(error){Alert.alert('تعذر استيراد المخزون',error instanceof Error?error.message:'راجع كميات المنتجات المستوردة.');return;}
    setProducts(current=>[...imported,...current]);setProductBulkText('');
    Alert.alert('تم الاستيراد',`تزادو ${imported.length} منتج. الأسطر المرفوضة أو المكررة: ${rejected}.`);
  };
  const exportProductsCsv=async()=>{
    const quote=(value:unknown)=>{const text=String(value??'');return '"'+text.replace(/"/g,'""')+'"';};
    const lines=[['Name','Reference','Barcode','Category','Cost price DH','Sale price DH','Quantity','Brand','Unit','Variant'].join(';'),...products.map(p=>[p.name,p.reference||'',p.barcode||'',p.category||'',p.costPrice||0,p.price,p.qty,p.brand||'',p.unit||'',p.variant||''].map(quote).join(';'))];
    try{await Share.share({title:'HamZa products CSV',message:lines.join('\n')});}
    catch{Alert.alert('تعذر التصدير','ما قدرناش نشاركوا لائحة المنتجات.');}
  };
  const isValidIsoDate=(value:string)=>{if(!value)return true;if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [year,month,day]=value.split('-').map(Number);const date=new Date(Date.UTC(year,month-1,day));return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;};
  const startEditProject=(project:Project)=>{setEditingProjectId(project.id);setProjectName(project.name);setProjectCustomer(project.customerName);setProjectBudget(String(project.budget));setProjectStartDate(project.startDate);setProjectDueDate(project.dueDate);setProjectNotes(project.notes);};
  const deleteSalesReturn=(item:SalesReturn)=>{
    if(item.restocked){
      const productId=item.productId??products.find(p=>p.name===item.productName)?.id;
      const product=products.find(p=>p.id===productId);
      if(!product){Alert.alert('تعذر حذف المرتجع','المنتج المرتبط بالمرتجع غير موجود.');return;}
      if(!recordInventoryMovement({id:'return-out-'+item.id,productId:product.id,productName:product.name,kind:'return_out',quantityDelta:-item.qty,date:new Date().toISOString(),sourceId:String(item.saleId),note:'إلغاء مرتجع زبون'}))return;
      setProducts(current=>current.map(p=>p.id===product.id?{...p,qty:p.qty-item.qty}:p));
    }
    setSalesReturns(current=>current.filter(value=>value.id!==item.id));
  };
  const addSalesReturn=()=>{
    const sale=sales.find(item=>String(item.id)===returnSaleId);
    const quantity=Number(returnQuantity);
    if(!sale){Alert.alert('كمية الإرجاع غير صالحة','اختار عملية بيع صالحة أولاً.');return;}
    let calculation;
    try{calculation=calculateSalesReturn(sale,salesReturns,quantity);}catch(error){Alert.alert('كمية الإرجاع غير صالحة',error instanceof Error?error.message:'راجع كمية الإرجاع.');return;}
    const productId=sale.productId??products.find(p=>p.name===sale.productName)?.id;
    const record:SalesReturn={id:Date.now(),saleId:sale.id,productId,productName:sale.productName,customerName:sale.customerName,qty:quantity,unitPrice:calculation.unitPrice,total:calculation.total,costPrice:sale.costPrice,date:new Date().toLocaleDateString('fr-MA'),reason:returnReason.trim(),restocked:returnRestock};
    if(returnRestock){const product=products.find(p=>p.id===productId);if(!product){Alert.alert('المنتج غير موجود','لا يمكن إعادة الكمية للمخزون لأن المنتج غير موجود.');return;}if(!recordInventoryMovement({id:'return-in-'+record.id,productId:product.id,productName:product.name,kind:'return_in',quantityDelta:quantity,date:new Date().toISOString(),sourceId:String(sale.id),unitCost:sale.costPrice,note:record.reason||'إرجاع زبون وإعادة للمخزون'}))return;setProducts(current=>current.map(p=>p.id===product.id?{...p,qty:p.qty+quantity}:p));}
    setSalesReturns(current=>[record,...current]);setReturnSaleId('');setReturnQuantity('1');setReturnReason('');Alert.alert('تم تسجيل المرتجع','قيمة الإرجاع: '+record.total.toFixed(2)+' DH');
  };
  const addProject=()=>{
    const budget=Number(projectBudget.replace(',','.'));
    if(!projectName.trim()||!Number.isFinite(budget)||budget<0){Alert.alert('معلومات ناقصة','دخل اسم المشروع وميزانية صحيحة أو صفر.');return;}
    if(!isValidIsoDate(projectStartDate)||!isValidIsoDate(projectDueDate)){Alert.alert('تاريخ غير صالح','استعمل صيغة YYYY-MM-DD لتاريخ المشروع.');return;}
    if(projectStartDate&&projectDueDate&&projectDueDate<projectStartDate){Alert.alert('تاريخ غير صالح','تاريخ نهاية المشروع خاصو يكون من بعد تاريخ البداية.');return;}
    const previous=editingProjectId===null?undefined:projects.find(p=>p.id===editingProjectId);
    const project:Project={id:editingProjectId??Date.now(),name:projectName.trim(),customerName:projectCustomer.trim(),budget,spent:previous?.spent||0,status:previous?.status||'planned',startDate:projectStartDate,dueDate:projectDueDate,notes:projectNotes.trim()};
    if(editingProjectId!==null)setProjects(current=>current.map(p=>p.id===editingProjectId?project:p));else setProjects(current=>[project,...current]);
    setEditingProjectId(null);setProjectName('');setProjectCustomer('');setProjectBudget('');setProjectStartDate('');setProjectDueDate('');setProjectNotes('');
  };
  const startEditTask=(task:WorkTask)=>{setEditingTaskId(task.id);setTaskTitle(task.title);setTaskProjectId(task.projectId===undefined?'':String(task.projectId));setTaskAssignee(task.assignee);setTaskPriority(task.priority);setTaskDueDate(task.dueDate);setTaskDuration(String(task.durationHours));};
  const addWorkTask=()=>{
    const duration=taskDuration.trim()===''?0:Number(taskDuration.replace(',','.'));
    const projectId=taskProjectId?Number(taskProjectId):undefined;
    if(!taskTitle.trim()||!Number.isFinite(duration)||duration<0||(projectId!==undefined&&!projects.some(p=>p.id===projectId))){Alert.alert('معلومات ناقصة','دخل عنوان المهمة ومدة صحيحة واختار مشروعاً صالحاً إن وجد.');return;}
    if(!isValidIsoDate(taskDueDate)){Alert.alert('تاريخ غير صالح','استعمل صيغة YYYY-MM-DD لموعد المهمة.');return;}
    const previous=editingTaskId===null?undefined:workTasks.find(t=>t.id===editingTaskId);
    const task:WorkTask={id:editingTaskId??Date.now(),title:taskTitle.trim(),projectId,assignee:taskAssignee.trim(),priority:taskPriority,dueDate:taskDueDate,durationHours:duration,status:previous?.status||'todo'};
    if(editingTaskId!==null)setWorkTasks(current=>current.map(t=>t.id===editingTaskId?task:t));else setWorkTasks(current=>[task,...current]);
    setEditingTaskId(null);setTaskTitle('');setTaskProjectId('');setTaskAssignee('');setTaskPriority('medium');setTaskDueDate('');setTaskDuration('');
  };
  const addCustomer=()=>{const opening=customerOpeningBalance.trim()===''?0:Number(customerOpeningBalance.replace(',','.'));const limit=customerCreditLimit.trim()===''?undefined:Number(customerCreditLimit.replace(',','.'));const terms=customerPaymentTerms.trim()===''?undefined:Number(customerPaymentTerms);if(!customer.trim()||!Number.isFinite(opening)||opening<0||(limit!==undefined&&(!Number.isFinite(limit)||limit<0))||(terms!==undefined&&(!Number.isSafeInteger(terms)||terms<0))){Alert.alert('معلومات ناقصة','راجع اسم الزبون والرصيد الافتتاحي وسقف الدين وأجل الأداء.');return;}setCustomers(v=>[{id:Date.now(),name:customer.trim(),phone:customerPhone.trim(),address:customerAddress.trim(),ice:customerIce.trim(),openingBalanceCentimes:Math.round(opening*100),creditLimitCentimes:limit===undefined?undefined:Math.round(limit*100),paymentTermsDays:terms},...v]);setCustomer('');setCustomerPhone('');setCustomerAddress('');setCustomerIce('');setCustomerOpeningBalance('');setCustomerCreditLimit('');setCustomerPaymentTerms('');};
  const addSale=()=>{const p=products.find(x=>String(x.id)===saleProduct);const c=customers.find(x=>String(x.id)===saleCustomer);const q=Number(saleQty);if(!p||!c||!Number.isInteger(q)||q<1){Alert.alert('معلومات ناقصة','اختار منتج وزبون ودخل كمية صحيحة.');return;}if(q>p.qty){Alert.alert('المخزون غير كافٍ',`المتوفر هو ${p.qty} فقط.`);return;}const sale:Sale={id:Date.now(),productId:p.id,productName:p.name,customerName:c.name,qty:q,unitPrice:p.price,total:q*p.price,costPrice:p.costPrice,date:new Date().toLocaleDateString('fr-MA')};if(!recordInventoryMovement({id:'sale-'+sale.id,productId:p.id,productName:p.name,kind:'sale',quantityDelta:-q,date:new Date().toISOString(),sourceId:String(sale.id),unitCost:p.costPrice}))return;setSales(v=>[sale,...v]);setProducts(v=>v.map(x=>x.id===p.id?{...x,qty:x.qty-q}:x));setSaleQty('1');Alert.alert('تم تسجيل البيع',`المجموع: ${sale.total.toFixed(2)} DH`);};
  const addSupplier=()=>{const opening=supplierOpeningBalance.trim()===''?0:Number(supplierOpeningBalance.replace(',','.'));const limit=supplierCreditLimit.trim()===''?undefined:Number(supplierCreditLimit.replace(',','.'));const terms=supplierPaymentTerms.trim()===''?undefined:Number(supplierPaymentTerms);if(!supplierName.trim()||!Number.isFinite(opening)||opening<0||(limit!==undefined&&(!Number.isFinite(limit)||limit<0))||(terms!==undefined&&(!Number.isSafeInteger(terms)||terms<0))){Alert.alert('معلومات ناقصة','راجع اسم المورد والرصيد الافتتاحي وسقف الدين وأجل الأداء.');return;}setSuppliers(v=>[{id:Date.now(),name:supplierName.trim(),phone:supplierPhone.trim(),address:supplierAddress.trim(),ice:supplierIce.trim(),openingBalanceCentimes:Math.round(opening*100),creditLimitCentimes:limit===undefined?undefined:Math.round(limit*100),paymentTermsDays:terms},...v]);setSupplierName('');setSupplierPhone('');setSupplierAddress('');setSupplierIce('');setSupplierOpeningBalance('');setSupplierCreditLimit('');setSupplierPaymentTerms('');};
  const addPurchase=()=>{const p=products.find(x=>String(x.id)===purchaseProduct);const sup=suppliers.find(x=>String(x.id)===purchaseSupplier);const q=Number(purchaseQty),cost=Number(purchaseCost.replace(',','.'));if(!p||!sup||!Number.isInteger(q)||q<1||!Number.isFinite(cost)||cost<0){Alert.alert('معلومات ناقصة','اختار المنتج والمورد ودخل الكمية وثمن الشراء.');return;}const item:Purchase={id:Date.now(),productId:p.id,productName:p.name,supplierName:sup.name,qty:q,unitCost:cost,total:q*cost,date:new Date().toLocaleDateString('fr-MA'),paidCentimes:0};if(!recordInventoryMovement({id:'purchase-'+item.id,productId:p.id,productName:p.name,kind:'purchase',quantityDelta:q,date:new Date().toISOString(),sourceId:String(item.id),unitCost:cost}))return;setPurchases(v=>[item,...v]);setProducts(v=>v.map(x=>{if(x.id!==p.id)return x;const nextQty=x.qty+q;const weightedCost=x.costPrice===undefined?(x.qty>0?undefined:cost):(((x.costPrice*x.qty)+(cost*q))/nextQty);return {...x,qty:nextQty,costPrice:weightedCost===undefined?undefined:Number(weightedCost.toFixed(4))};}));setPurchaseQty('1');setPurchaseCost('');Alert.alert('تم تسجيل الشراء',`المجموع: ${item.total.toFixed(2)} DH`);};
  const addSupplierPayment=(purchaseId:number)=>{
    const purchase=purchases.find(x=>x.id===purchaseId);
    const amount=Number(supplierPaymentAmount.replace(',','.'));
    if(!purchase||!Number.isFinite(amount)||amount<=0){Alert.alert('معلومات ناقصة','دخل مبلغ أداء صحيح.');return;}
    const paymentCentimes=Math.round(amount*100);
    try{
      const allocation=allocateSupplierPayment({...purchase,returnedCentimes:purchase.returnedCentimes||0},paymentCentimes);
      const payment:SupplierPayment={id:Date.now(),purchaseId,supplierName:purchase.supplierName,amountCentimes:paymentCentimes,method:'نقداً',date:new Date().toLocaleDateString('fr-MA'),note:''};
      setPurchases(current=>current.map(x=>x.id===purchaseId?{...x,paidCentimes:allocation.paidCentimes}:x));
      setSupplierPayments(current=>[payment,...current]);
      setSupplierPaymentAmount('');setSupplierPaymentPurchaseId(null);
      Alert.alert('تسجل الأداء',`باقي للمورد: ${(allocation.remainingCentimes/100).toFixed(2)} DH`);
    }catch(error){Alert.alert('تعذر تسجيل الأداء',error instanceof Error?error.message:'راجع مبلغ الأداء.');}
  };
  const deleteSupplierPayment=(payment:SupplierPayment)=>{
    const purchase=purchases.find(x=>x.id===payment.purchaseId);
    if(!purchase){Alert.alert('تعذر حذف الأداء','عملية الشراء المرتبطة غير موجودة.');return;}
    try{
      const reversed=reverseSupplierPayment(purchase,payment.amountCentimes);
      setPurchases(current=>current.map(x=>x.id===purchase.id?{...x,paidCentimes:reversed.paidCentimes}:x));
      setSupplierPayments(current=>current.filter(x=>x.id!==payment.id));
    }catch(error){Alert.alert('تعذر عكس الأداء',error instanceof Error?error.message:'راجع رصيد المورد.');}
  };
  const addSupplierReturn=(purchaseId:number)=>{
    const purchase=purchases.find(x=>x.id===purchaseId);
    if(!purchase){Alert.alert('تعذر تسجيل المرتجع','عملية الشراء غير موجودة.');return;}
    const product=products.find(x=>x.id===purchase.productId)||products.find(x=>x.name===purchase.productName);
    if(!product){Alert.alert('تعذر تسجيل المرتجع','المنتج المرتبط بالشراء غير موجود في المخزون.');return;}
    const qty=Number(supplierReturnQuantity);
    try{
      const record=calculateSupplierReturn(purchase,supplierReturns,{id:Date.now(),qty,date:new Date().toISOString(),reason:supplierReturnReason});
      if(!recordInventoryMovement({id:'supplier-return-'+record.id,productId:product.id,productName:product.name,kind:'return_out',quantityDelta:-qty,date:record.date,sourceId:String(purchase.id),note:'مرتجع للمورد: '+record.reason,unitCost:purchase.unitCost}))return;
      setProducts(current=>current.map(x=>x.id===product.id?{...x,qty:x.qty-qty}:x));
      setPurchases(current=>current.map(x=>x.id===purchase.id?{...x,returnedCentimes:(x.returnedCentimes||0)+record.amountCentimes}:x));
      setSupplierReturns(current=>[record,...current]);
      setSupplierReturnPurchaseId(null);setSupplierReturnQuantity('1');setSupplierReturnReason('');
      Alert.alert('تم تسجيل مرتجع المورد',`القيمة: ${(record.amountCentimes/100).toFixed(2)} DH`);
    }catch(error){Alert.alert('تعذر تسجيل المرتجع',error instanceof Error?error.message:'راجع الكمية.');}
  };
  const deleteSupplierReturn=(item:SupplierReturnRecord)=>{
    const purchase=purchases.find(x=>x.id===item.purchaseId);
    const product=purchase&&(products.find(x=>x.id===purchase.productId)||products.find(x=>x.name===purchase.productName));
    if(!purchase||!product){Alert.alert('تعذر حذف المرتجع','الشراء أو المنتج المرتبط غير موجود.');return;}
    try{
      const next=appendInventoryMovement(inventoryMovements,{id:'supplier-return-reversal-'+item.id,productId:product.id,productName:product.name,kind:'adjustment',quantityDelta:item.qty,date:new Date().toISOString(),sourceId:String(item.id),note:'عكس مرتجع المورد'});
      setInventoryMovements(next);
      setProducts(current=>current.map(x=>x.id===product.id?{...x,qty:x.qty+item.qty}:x));
      setPurchases(current=>current.map(x=>x.id===purchase.id?{...x,returnedCentimes:Math.max(0,(x.returnedCentimes||0)-item.amountCentimes)}:x));
      setSupplierReturns(current=>current.filter(x=>x.id!==item.id));
    }catch(error){Alert.alert('تعذر عكس المرتجع',error instanceof Error?error.message:'راجع حركة المخزون.');}
  };
  const addExpense=()=>{const a=Number(expenseAmount.replace(',','.'));const projectId=expenseProjectId?Number(expenseProjectId):undefined;if(!expenseTitle.trim()||!Number.isFinite(a)||a<=0||(projectId!==undefined&&!projects.some(p=>p.id===projectId))){Alert.alert('معلومات ناقصة','دخل وصف المصروف ومبلغ صحيح واختار مشروعاً صالحاً إن وجد.');return;}setExpenses(v=>[{id:Date.now(),title:expenseTitle.trim(),amount:a,date:new Date().toLocaleDateString('fr-MA'),category:expenseCategory.trim()||undefined,projectId},...v]);setExpenseTitle('');setExpenseAmount('');setExpenseCategory('');setExpenseProjectId('');};
  const addQuote=()=>{const p=products.find(x=>String(x.id)===quoteProduct);const c=customers.find(x=>String(x.id)===quoteCustomer);const q=Number(quoteQty);if(!p||!c||!Number.isInteger(q)||q<1){Alert.alert('معلومات ناقصة','اختار المنتج والزبون والكمية.');return;}const x:Quote={id:Date.now(),productName:p.name,customerName:c.name,qty:q,unitPrice:p.price,total:q*p.price,date:new Date().toLocaleDateString('fr-MA'),status:'معلق'};setQuotes(v=>[x,...v]);setQuoteQty('1');Alert.alert('تم حفظ عرض السعر',`${x.total.toFixed(2)} DH`);};
  const convertQuote=(quote:Quote,type:QuoteConversionType)=>{
    try{
      const result=createConvertedDocument(
        quote,type,documents,products,Date.now(),new Date().toLocaleDateString('fr-MA'),
      );
      setDocuments(current=>[result.document,...current]);
      if(type==='delivery'){const updated=result.updatedProducts as Product[];try{let nextMovements=inventoryMovements;for(const previous of products){const next=updated.find(p=>p.id===previous.id);const delta=(next?.qty??previous.qty)-previous.qty;if(delta!==0)nextMovements=appendInventoryMovement(nextMovements,{id:'delivery-'+result.document.id+'-'+previous.id,productId:previous.id,productName:previous.name,kind:'delivery',quantityDelta:delta,date:new Date().toISOString(),sourceId:String(result.document.id)});}setInventoryMovements(nextMovements);setProducts(updated);}catch(error){Alert.alert('حركة المخزون',error instanceof Error?error.message:'تعذر تسجيل حركات سند الخروج.');return;}}
      Alert.alert('تم التحويل',type==='invoice'?'تسجلات الفاتورة.':'تسجل سند الخروج وتحدّث المخزون.');
    }catch(error){
      Alert.alert('تعذر التحويل',error instanceof Error?error.message:'وقع خطأ أثناء تحويل العرض.');
    }
  };
  const addPayment=()=>{
    const c=customers.find(x=>String(x.id)===paymentCustomer);
    const a=Number(paymentAmount.replace(',','.'));
    if(!c||!Number.isFinite(a)||a<=0){Alert.alert('معلومات ناقصة','اختار الزبون ودخل مبلغ صحيح.');return;}
    const invoice=documents.find(d=>d.id===Number(paymentDocument)&&d.type==='invoice'&&d.customerName===c.name);
    if(paymentDocument&&!invoice){Alert.alert('الفاتورة غير موجودة','عاود اختار فاتورة صالحة لهذا الزبون.');return;}
    let paidCentimes:number|undefined;
    if(invoice){
      try{
        const result=applyPaymentToInvoice({type:'invoice',total:invoice.total,paidCentimes:invoice.paidCentimes,status:invoice.status},Math.round(a*100));
        paidCentimes=result.invoice.paidCentimes;
        setDocuments(current=>current.map(d=>d.id===invoice.id?{...d,paidCentimes:result.invoice.paidCentimes,status:result.invoice.status}:d));
      }catch(error){Alert.alert('تعذر تسجيل الأداء',error instanceof Error?error.message:'راجع مبلغ الأداء.');return;}
    }
    setPayments(v=>[{id:Date.now(),customerName:c.name,amount:a,method:paymentMethod,date:new Date().toLocaleDateString('fr-MA'),note:paymentNote.trim(),...(invoice?{documentId:invoice.id}:{})},...v]);
    setPaymentAmount('');setPaymentNote('');setPaymentDocument('');
    Alert.alert('تم تسجيل الأداء',invoice?'تحدّث الرصيد المتبقي ديال الفاتورة.':'تسجل الأداء كدفعة غير مخصصة لفاتورة.');
  };
  const exportBackup=async()=>{try{setBackupBusy(true);const json=await createBackup({products,customers,sales,salesReturns,purchases,supplierPayments,supplierReturns,cashMovements,expenses,suppliers,quotes,payments,documents,inventoryMovements,projects,workTasks,language});await Share.share({title:'HamZa backup',message:json});}catch(e){Alert.alert('خطأ','ما قدرناش نوجدوا النسخة الاحتياطية.');}finally{setBackupBusy(false);}};
  const importBackup=()=>{Alert.alert('استرجاع البيانات','هاد العملية غادي تعوض البيانات الحالية بالنسخة اللي لصقتي. واش متأكد؟',[{text:'إلغاء',style:'cancel'},{text:'استرجاع',style:'destructive',onPress:async()=>{try{setBackupBusy(true);const d=await restoreBackup(backupText);setProducts(Array.isArray(d.products)?d.products as Product[]:[]);setCustomers(Array.isArray(d.customers)?d.customers as Customer[]:[]);setSales(Array.isArray(d.sales)?d.sales as Sale[]:[]);setSalesReturns(Array.isArray(d.salesReturns)?d.salesReturns as SalesReturn[]:[]);setPurchases(Array.isArray(d.purchases)?d.purchases as Purchase[]:[]);setSupplierPayments(Array.isArray(d.supplierPayments)?d.supplierPayments as SupplierPayment[]:[]);setSupplierReturns(Array.isArray(d.supplierReturns)?d.supplierReturns as SupplierReturnRecord[]:[]);setCashMovements(Array.isArray(d.cashMovements)?d.cashMovements as CashMovement[]:[]);setExpenses(Array.isArray(d.expenses)?d.expenses as Expense[]:[]);setSuppliers(Array.isArray(d.suppliers)?d.suppliers as Supplier[]:[]);setQuotes(Array.isArray(d.quotes)?d.quotes as Quote[]:[]);setPayments(Array.isArray(d.payments)?d.payments as Payment[]:[]);setDocuments(Array.isArray(d.documents)?d.documents as CommercialDocument[]:[]);setProjects(Array.isArray(d.projects)?d.projects as Project[]:[]);setWorkTasks(Array.isArray(d.workTasks)?d.workTasks as WorkTask[]:[]);const restoredProducts=Array.isArray(d.products)?d.products as Product[]:[];const restoredMovements=Array.isArray(d.inventoryMovements)?d.inventoryMovements as InventoryMovement[]:[];setInventoryMovements(restoredMovements.length?restoredMovements:restoredProducts.filter(p=>p.qty>0).map(p=>({id:'opening-'+p.id,productId:p.id,productName:p.name,kind:'opening' as const,quantityDelta:p.qty,date:new Date().toISOString(),note:'رصيد افتتاحي مسترجع من نسخة قديمة'})));setLanguage(d.language==='FR'?'FR':'AR');setBackupText('');Alert.alert('تم الاسترجاع','ترجعات البيانات بنجاح.');}catch(e){Alert.alert('تعذر الاسترجاع',e instanceof Error?e.message:'النسخة غير صالحة.');}finally{setBackupBusy(false);}}}]);};
  const exportPdf=async(title:string,customerName:string,lines:string[],total:number)=>{
    try{
      const rtl=language==='AR';
      const labels=rtl
        ? {client:'الزبون',date:'التاريخ',total:'المجموع',thanks:'شكراً على ثقتكم'}
        : {client:'Client',date:'Date',total:'Total',thanks:'Thank you for your trust'};
      const direction=rtl?'rtl':'ltr';
      const html=`<html lang="${rtl?'ar':'fr'}" dir="${direction}"><meta charset="utf-8"><body style="font-family:Arial,sans-serif;padding:28px;color:#222;direction:${direction};text-align:${rtl?'right':'left'}"><h1 style="color:#9A762D">HamZa</h1><h2>${htmlSafe(title)}</h2><p>${labels.client}: ${htmlSafe(customerName||'—')}</p><p>${labels.date}: ${new Date().toLocaleDateString(rtl?'ar-MA':'fr-MA')}</p><hr/>${lines.map(x=>`<p>${htmlSafe(x)}</p>`).join('')}<hr/><h2>${labels.total}: ${total.toFixed(2)} DH</h2><p>${labels.thanks}</p></body></html>`;
      const file=await Print.printToFileAsync({html});
      if(await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri,{mimeType:'application/pdf',dialogTitle:title});
      else Alert.alert('PDF جاهز',file.uri);
    }catch(e){Alert.alert('خطأ','تعذر إنشاء PDF. تأكد من تثبيت مكتبات expo-print و expo-sharing.');}
  };
  const exportCustomerStatement=(customerName:string)=>{
    const invoices=documents.filter(d=>d.type==='invoice'&&d.customerName===customerName);
    const customerPayments=payments.filter(p=>p.customerName===customerName);
    const openingBalance=customers.find(c=>c.name===customerName)?.openingBalanceCentimes||0;
    const lines=[
      ...(openingBalance>0?[language==='FR'?`Solde initial dû : ${(openingBalance/100).toFixed(2)} DH`:`دين افتتاحي: ${(openingBalance/100).toFixed(2)} درهم`]:[]),
      ...invoices.map(d=>{const total=Math.round(d.total*100),paid=d.paidCentimes||0;return language==='FR'?`Facture ${d.number} • ${d.date} • Total ${(total/100).toFixed(2)} DH • Payé ${(paid/100).toFixed(2)} DH • Reste ${((total-paid)/100).toFixed(2)} DH`:`فاتورة ${d.number} • ${d.date} • المجموع ${(total/100).toFixed(2)} • المؤدى ${(paid/100).toFixed(2)} • الباقي ${((total-paid)/100).toFixed(2)} درهم`;}),
      ...customerPayments.map(p=>language==='FR'?`Paiement • ${p.date} • ${p.method} • ${p.amount.toFixed(2)} DH${p.documentId?' • Facture '+p.documentId:''}`:`أداء • ${p.date} • ${p.method} • ${p.amount.toFixed(2)} درهم${p.documentId?' • الفاتورة '+p.documentId:''}`),
    ];
    if(!lines.length)lines.push(language==='FR'?'Aucune facture ou paiement enregistré.':'ما كايناش فواتير أو أداءات مسجلة.');
    exportPdf('كشف حساب الزبون',customerName,lines,(balanceFor(customerName)?.outstandingCentimes||0)/100);
  };
  const exportSupplierStatement=(supplierName:string)=>{
    const supplierPurchases=purchases.filter(p=>p.supplierName===supplierName);
    const supplierRows=supplierPayments.filter(p=>p.supplierName===supplierName);
    const openingBalance=suppliers.find(x=>x.name===supplierName)?.openingBalanceCentimes||0;
    const lines=[
      ...(openingBalance>0?[language==='FR'?`Solde initial dû : ${(openingBalance/100).toFixed(2)} DH`:`دين افتتاحي للمورد: ${(openingBalance/100).toFixed(2)} درهم`]:[]),
      ...supplierPurchases.map(p=>{const total=Math.round(p.total*100),paid=p.paidCentimes||0;return language==='FR'?`Achat ${p.id} • ${p.date} • ${p.productName} × ${p.qty} • Total ${(total/100).toFixed(2)} DH • Payé ${(paid/100).toFixed(2)} DH • Reste ${((total-paid)/100).toFixed(2)} DH`:`شراء ${p.id} • ${p.date} • ${p.productName} × ${p.qty} • المجموع ${(total/100).toFixed(2)} • المؤدى ${(paid/100).toFixed(2)} • الباقي ${((total-paid)/100).toFixed(2)} درهم`;}),
      ...supplierRows.map(p=>language==='FR'?`Paiement • ${p.date} • ${(p.amountCentimes/100).toFixed(2)} DH • Achat ${p.purchaseId}`:`أداء • ${p.date} • ${(p.amountCentimes/100).toFixed(2)} درهم • شراء ${p.purchaseId}`),
    ];
    if(!lines.length)lines.push(language==='FR'?'Aucun achat ou paiement enregistré.':'ما كايناش مشتريات أو أداءات مسجلة.');
    const balance=supplierBalances.find(x=>x.supplierName===supplierName)?.outstandingCentimes||0;
    exportPdf('كشف حساب المورد',supplierName,lines,balance/100);
  };
  const checkoutPos=(data:{customerName:string;lines:{productId:number;name:string;quantity:number;unitPrice:number;discount:number}[];paymentMethod:'cash'|'card'|'transfer';total:number})=>{
    const invalid=data.lines.find(line=>{const product=products.find(p=>p.id===line.productId);return !product||product.qty<line.quantity;});
    if(invalid){Alert.alert('المخزون تبدل','الكمية المتوفرة ما بقاتش كافية. راجع السلة.');return false;}
    const subtotal=data.lines.reduce((sum,line)=>sum+line.quantity*line.unitPrice-line.discount,0);
    const globalDiscount=Math.max(0,subtotal-data.total);
    const today=new Date().toLocaleDateString('fr-MA');
    try{let nextMovements=inventoryMovements;const posSource='pos-'+Date.now();for(const [index,line] of data.lines.entries()){const product=products.find(p=>p.id===line.productId);if(!product)throw new Error('المنتج غير موجود');nextMovements=appendInventoryMovement(nextMovements,{id:posSource+'-'+index,productId:product.id,productName:product.name,kind:'sale',quantityDelta:-line.quantity,date:new Date().toISOString(),sourceId:posSource,unitCost:product.costPrice});}setInventoryMovements(nextMovements);}catch(error){Alert.alert('حركة المخزون',error instanceof Error?error.message:'تعذر تسجيل حركات البيع.');return false;}
    const records=data.lines.map((line,index)=>{const raw=line.quantity*line.unitPrice-line.discount;const share=subtotal>0?globalDiscount*(raw/subtotal):0;const product=products.find(p=>p.id===line.productId);return {id:Date.now()+index,productId:product?.id,productName:line.name,customerName:data.customerName,qty:line.quantity,unitPrice:line.unitPrice,total:Math.max(0,raw-share),discount:line.discount+share,costPrice:product?.costPrice,date:today,paymentMethod:data.paymentMethod};});
    setSales(current=>[...records,...current]);
    setProducts(current=>current.map(product=>{const sold=data.lines.filter(line=>line.productId===product.id).reduce((sum,line)=>sum+line.quantity,0);return sold?{...product,qty:product.qty-sold}:product;}));
    const methodLabel=data.paymentMethod==='cash'?'نقداً':data.paymentMethod==='card'?'بطاقة':'تحويل';
    exportPdf('Reçu de vente',data.customerName,[...data.lines.map(line=>line.name+' × '+line.quantity+' — '+(line.quantity*line.unitPrice-line.discount).toFixed(2)+' DH'), 'طريقة الأداء: '+methodLabel],data.total);
    return true;
  };
  const go=(s:string)=>{setScreen(s);setSearch('');};
  if(!loaded)return <SafeAreaView style={s.safe}><StatusBar style="light"/><ActivityIndicator color={GOLD} style={{flex:1}}/></SafeAreaView>;
  <LanguageContext.Provider value={language}><SafeAreaView style={s.safe}><StatusBar style="light"/><View style={s.header}><View><Text style={s.brand}>HamZa</Text><Text style={s.sub}>Gestion commerciale</Text></View><Pressable accessibilityLabel={language==='AR'?'تغيير لغة التطبيق إلى الفرنسية':'Changer la langue de l’application en arabe'} accessibilityHint={language==='AR'?'التبديل إلى اللغة الفرنسية':'Passer en arabe'} onPress={()=>setLanguage(language==='AR'?'FR':'AR')} style={s.lang}><Text style={s.gold}>{language}</Text></Pressable></View>
    <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
      <View style={s.topline}><Pressable onPress={()=>go('الرئيسية')}><Text style={s.back}>⌂ الرئيسية</Text></Pressable><Text style={s.heading}>{screen}</Text></View>
      {screen==='الرئيسية'?<>
        <View style={s.hero}><Text style={s.heroLabel}>مرحبا بك في</Text><Text style={s.heroTitle}>HamZa</Text><Text style={s.heroText}>تسيير تجارتك من مكان واحد</Text></View>
        <View style={s.stats}><View style={s.stat}><Text style={s.statNum}>{products.length}</Text><Text style={s.statLabel}>المنتجات</Text></View><View style={s.stat}><Text style={s.statNum}>{customers.length}</Text><Text style={s.statLabel}>الزبناء</Text></View><View style={s.stat}><Text style={s.statNum}>{salesTotal.toFixed(0)} DH</Text><Text style={s.statLabel}>مجموع المبيعات</Text></View></View>
        <View style={s.summary}>
          <Text style={s.panelTitle}>ملخص النشاط</Text>
          <Text style={s.summaryText}>قيمة المخزون بسعر البيع: {stockValue.toFixed(2)} DH</Text><Text style={s.summaryText}>الربح المحتمل إذا تباع المخزون كامل: {potentialStockProfit.toFixed(2)} DH</Text>
          <Text style={s.summaryText}>المبيعات المسجلة: {salesTotal.toFixed(2)} DH • {sales.length} عملية</Text>
          <Text style={s.summaryText}>المشتريات: {purchaseTotal.toFixed(2)} DH</Text>
          <Text style={s.summaryText}>المصاريف: {expenseTotal.toFixed(2)} DH</Text>
          <Text style={s.summaryText}>الصافي الأولي: {(salesTotal-purchaseTotal-expenseTotal).toFixed(2)} DH</Text>
        </View>
        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statNum}>{receivablesTotal.toFixed(2)} DH</Text><Text style={s.statLabel}>ديون الزبناء</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{openInvoiceCount}</Text><Text style={s.statLabel}>فواتير غير مسواة</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{quotes.length}</Text><Text style={s.statLabel}>عروض الأسعار</Text></View>
        </View>
        <View style={s.summary}>
          <Text style={s.summaryText}>المنتجات قليلة المخزون (5 أو أقل): {lowStockProducts.length}</Text>
          <Text style={s.summaryText}>المنتجات النافدة: {outOfStockCount}</Text>
          {lowStockProducts.slice(0,4).map(p=><Text key={p.id} style={s.note}>{p.name} — باقي {p.qty}</Text>)}
          {lowStockProducts.length===0&&<Text style={s.summaryText}>ما كايناش منتجات قليلة المخزون حالياً.</Text>}
        </View>
        <TextInput value={search} onChangeText={setSearch} placeholder="قلب على قسم..." placeholderTextColor="#888" style={s.search}/>
        <View style={s.grid}>{modules.filter(m=>m.ar.includes(search)||m.en.toLowerCase().includes(search.toLowerCase())).map(m=><Pressable key={m.en} onPress={()=>go(m.ar)} style={s.tile}><Text style={s.tileIcon}>{m.icon}</Text><Text style={s.tileTitle}>{m.ar}</Text><Text style={s.tileSub}>{m.en}</Text></Pressable>)}</View>
      </> :screen==='جرد وحركات المخزون'?<>
        <View style={s.panel}><Text style={s.panelTitle}>جرد المخزون</Text><Text style={s.panelText}>اختار المنتج وسجل الكمية الفعلية. التطبيق يحسب الفرق ويسجلو كحركة جرد مع التاريخ والملاحظة.</Text>{products.map(p=><Pressable key={p.id} accessibilityState={{selected:stockCountProduct===String(p.id)}} onPress={()=>{setStockCountProduct(String(p.id));setStockCountQuantity(String(p.qty));}} style={[s.choice,stockCountProduct===String(p.id)&&s.choiceActive]}><Text style={s.itemTitle}>{p.name} • المسجل: {p.qty}</Text></Pressable>)}<TextInput value={stockCountQuantity} onChangeText={setStockCountQuantity} keyboardType="decimal-pad" placeholder="الكمية المعدودة فعلياً" placeholderTextColor="#888" style={s.input}/><TextInput value={stockCountNote} onChangeText={setStockCountNote} placeholder="ملاحظة الجرد (اختياري)" placeholderTextColor="#888" style={s.input}/><Pressable style={s.action} onPress={saveStockCount}><Text style={s.actionText}>تأكيد الجرد وتحديث المخزون</Text></Pressable></View>
        <Text style={s.section}>سجل حركات المخزون ({inventoryMovements.length})</Text>{inventoryMovements.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(m=><View key={m.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{m.productName} • {m.kind==='opening'?'رصيد افتتاحي':m.kind==='purchase'?'شراء':m.kind==='sale'?'بيع':m.kind==='delivery'?'سند خروج':m.kind==='stock_count'?'جرد':m.kind==='return_in'?'إرجاع زبون':m.kind==='return_out'?'إلغاء مرتجع':'تعديل'}</Text><Text style={s.itemSub}>{new Date(m.date).toLocaleString(language==='AR'?'ar-MA':'fr-MA')} {m.note||''}</Text></View><Text style={m.quantityDelta<0?s.delete:s.itemPrice}>{m.quantityDelta>0?'+':''}{m.quantityDelta}</Text></View>)}{inventoryMovements.length===0&&<Text style={s.empty}>مازال ما تسجلات حتى حركة مخزون.</Text>}
      </>
      :screen==='المنتجات'||screen==='المخزون'?<>
        <View style={s.panel}><Text style={s.panelTitle}>{editingProductId!==null?'تعديل المنتج':'إضافة منتج جديد'}</Text><TextInput value={name} onChangeText={setName} placeholder="اسم المنتج" placeholderTextColor="#888" style={s.input}/><View style={s.row}><TextInput value={productReference} onChangeText={setProductReference} placeholder="مرجع المنتج (اختياري)" placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={productBarcode} onChangeText={setProductBarcode} placeholder="الباركود (اختياري)" placeholderTextColor="#888" style={[s.input,s.half]}/></View><TextInput value={productCategory} onChangeText={setProductCategory} placeholder="الصنف / الفئة (اختياري)" placeholderTextColor="#888" style={s.input}/><View style={s.row}><TextInput value={productBrand} onChangeText={setProductBrand} placeholder="الماركة (اختياري)" placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={productUnit} onChangeText={setProductUnit} placeholder="الوحدة (قطعة، متر...)" placeholderTextColor="#888" style={[s.input,s.half]}/></View><TextInput value={productVariant} onChangeText={setProductVariant} placeholder="النوع / المقاس / اللون (اختياري)" placeholderTextColor="#888" style={s.input}/><View style={s.row}><TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="ثمن البيع (DH)" placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={qty} onChangeText={setQty} keyboardType="number-pad" placeholder="الكمية" placeholderTextColor="#888" style={[s.input,s.half]}/></View><TextInput value={costPrice} onChangeText={setCostPrice} keyboardType="decimal-pad" placeholder="ثمن الشراء / التكلفة (DH)" placeholderTextColor="#888" style={s.input}/>{photoData?<Pressable accessibilityLabel={language==='AR'?'معاينة صورة المنتج':'Aperçu de la photo du produit'} onPress={()=>setPhotoPreview(photoData)}><Image source={{uri:photoData}} style={{width:92,height:92,borderRadius:10,alignSelf:'center',marginBottom:10}}/></Pressable>:null}<View style={s.row}><Pressable style={[s.choice,{flex:1,borderColor:GOLD}]} onPress={pickProductPhoto}><Text style={s.gold}>{photoData?'تغيير صورة المنتج':'إضافة صورة المنتج'}</Text></Pressable>{photoData?<Pressable style={[s.choice,{flex:1}]} onPress={()=>setPhotoData('')}><Text style={s.delete}>حذف الصورة</Text></Pressable>:null}</View><Pressable style={s.action} onPress={addProduct}><Text style={s.actionText}>{editingProductId!==null?'حفظ التعديلات':'+ إضافة المنتج'}</Text></Pressable></View>
        <View style={[s.panel,{marginTop:12}]}>
          <Text style={s.panelTitle}>إدخال جماعي للمنتجات</Text>
          <Text style={s.panelText}>كل سطر منتج واحد، والفاصل هو ; أو Tab. الترتيب: الاسم؛ المرجع؛ الباركود؛ الصنف؛ ثمن الشراء؛ ثمن البيع؛ الكمية؛ الماركة؛ الوحدة؛ النوع/المقاس. آخر 3 خانات اختيارية، وثمن البيع والكمية ضروريين.</Text>
          <TextInput value={productBulkText} onChangeText={setProductBulkText} multiline numberOfLines={6} textAlignVertical="top" placeholder={'الاسم;المرجع;الباركود;الصنف;ثمن الشراء;ثمن البيع;الكمية;الماركة;الوحدة;النوع\nRouteur;R-01;61100001;Réseau;150;220;5;TP-Link;قطعة;AX3000'} placeholderTextColor="#888" style={[s.input,{minHeight:135,textAlign:'left',marginTop:10}]}/>
          <Pressable style={s.action} onPress={importProductsBulk}><Text style={s.actionText}>استيراد اللائحة وإضافة المنتجات</Text></Pressable>
          <Pressable style={[s.choice,{marginTop:8,borderColor:GOLD,alignItems:'center'}]} onPress={exportProductsCsv}><Text style={s.gold}>تصدير لائحة المنتجات CSV</Text></Pressable>
        </View>
        <Text style={s.section}>لائحة المنتجات ({products.length})</Text><TextInput value={productSearch} onChangeText={setProductSearch} placeholder="بحث بالاسم أو المرجع أو الباركود أو الصنف..." placeholderTextColor="#888" style={s.search}/>{products.length===0?<Text style={s.empty}>مازال ما زدتي حتى منتج.</Text> :products.filter(p=>[p.name,p.reference||'',p.barcode||'',p.category||'',p.brand||'',p.unit||'',p.variant||''].some(value=>value.toLowerCase().includes(productSearch.trim().toLowerCase()))).map(p=><View key={p.id} style={s.listItem}>{p.photoData?<Pressable accessibilityLabel={(language==='AR'?'تكبير صورة المنتج: ':'Agrandir la photo du produit : ')+p.name} onPress={()=>setPhotoPreview(p.photoData||null)}><Image source={{uri:p.photoData}} style={{width:48,height:48,borderRadius:8}}/></Pressable>:null}<View style={{flex:1}}><Text style={s.itemTitle}>{p.name}</Text><Text style={s.itemSub}>{[p.reference?'مرجع: '+p.reference:'',p.barcode?'باركود: '+p.barcode:'',p.category?'الصنف: '+p.category:'',p.brand?'الماركة: '+p.brand:'',p.unit?'الوحدة: '+p.unit:'',p.variant?'النوع: '+p.variant:''].filter(Boolean).join(' • ')}</Text><Text style={s.itemSub}>الكمية: {p.qty} • الشراء: {p.costPrice===undefined?'غير مسجل':p.costPrice.toFixed(2)+' DH'} • الربح: {p.costPrice===undefined?'غير محسوب':(p.price-p.costPrice).toFixed(2)+' DH'}</Text></View><Text style={s.itemPrice}>{p.price.toFixed(2)} DH</Text><Pressable onPress={()=>startEditProduct(p)}><Text style={s.gold}>تعديل</Text></Pressable><Pressable onPress={()=>Alert.alert('حذف المنتج؟',p.name,[{text:'إلغاء'},{text:'حذف',style:'destructive',onPress:()=>{setProducts(v=>v.filter(x=>x.id!==p.id));if(editingProductId===p.id)resetProductForm();}}])}><Text style={s.delete}>حذف</Text></Pressable></View>)}
      </>:screen==='الموردون'?<><View style={s.panel}><Text style={s.panelTitle}>إضافة مورد</Text><TextInput value={supplierName} onChangeText={setSupplierName} placeholder="اسم المورد" placeholderTextColor="#888" style={s.input}/><TextInput value={supplierPhone} onChangeText={setSupplierPhone} keyboardType="phone-pad" placeholder="الهاتف (اختياري)" placeholderTextColor="#888" style={s.input}/><TextInput value={supplierAddress} onChangeText={setSupplierAddress} placeholder="العنوان (اختياري)" placeholderTextColor="#888" style={s.input}/><TextInput value={supplierIce} onChangeText={setSupplierIce} placeholder="ICE (اختياري)" placeholderTextColor="#888" style={s.input}/><View style={s.row}><TextInput value={supplierOpeningBalance} onChangeText={setSupplierOpeningBalance} keyboardType="decimal-pad" placeholder="الدين الافتتاحي DH" placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={supplierCreditLimit} onChangeText={setSupplierCreditLimit} keyboardType="decimal-pad" placeholder="سقف الدين DH" placeholderTextColor="#888" style={[s.input,s.half]}/></View><TextInput value={supplierPaymentTerms} onChangeText={setSupplierPaymentTerms} keyboardType="number-pad" placeholder="أجل الأداء بالأيام (اختياري)" placeholderTextColor="#888" style={s.input}/><Pressable style={s.action} onPress={addSupplier}><Text style={s.actionText}>+ إضافة المورد</Text></Pressable></View><Text style={s.section}>لائحة الموردين ({suppliers.length})</Text>{suppliers.map(x=><View key={x.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{x.name}</Text><Text style={s.itemSub}>{[x.phone,x.address,x.ice?'ICE: '+x.ice:''].filter(Boolean).join(' • ')||'لا توجد معلومات إضافية'}</Text><Text style={s.itemSub}>المتبقي للمورد: {((supplierBalances.find(b=>b.supplierName===x.name)?.outstandingCentimes||0)/100).toFixed(2)} DH • الدين الافتتاحي: {((x.openingBalanceCentimes||0)/100).toFixed(2)} DH</Text><Text style={s.itemSub}>سقف الدين: {x.creditLimitCentimes===undefined?'غير محدد':(x.creditLimitCentimes/100).toFixed(2)+' DH'} • أجل الأداء: {x.paymentTermsDays===undefined?'غير محدد':x.paymentTermsDays+' يوم'}</Text></View><Pressable onPress={()=>exportSupplierStatement(x.name)}><Text style={s.gold}>كشف الحساب</Text></Pressable><Pressable onPress={()=>Alert.alert('حذف المورد؟',x.name,[{text:'إلغاء',style:'cancel'},{text:'حذف',style:'destructive',onPress:()=>setSuppliers(v=>v.filter(y=>y.id!==x.id))}])}><Text style={s.delete}>حذف</Text></Pressable></View>)}</>
      :screen==='الزبناء'?<><View style={s.panel}><Text style={s.panelTitle}>إضافة زبون</Text><TextInput value={customer} onChangeText={setCustomer} placeholder="اسم الزبون" placeholderTextColor="#888" style={s.input}/><TextInput value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" placeholder="الهاتف / WhatsApp (اختياري)" placeholderTextColor="#888" style={s.input}/><TextInput value={customerAddress} onChangeText={setCustomerAddress} placeholder="العنوان (اختياري)" placeholderTextColor="#888" style={s.input}/><TextInput value={customerIce} onChangeText={setCustomerIce} placeholder="ICE (اختياري)" placeholderTextColor="#888" style={s.input}/><View style={s.row}><TextInput value={customerOpeningBalance} onChangeText={setCustomerOpeningBalance} keyboardType="decimal-pad" placeholder="الدين الافتتاحي DH" placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={customerCreditLimit} onChangeText={setCustomerCreditLimit} keyboardType="decimal-pad" placeholder="سقف الدين DH" placeholderTextColor="#888" style={[s.input,s.half]}/></View><TextInput value={customerPaymentTerms} onChangeText={setCustomerPaymentTerms} keyboardType="number-pad" placeholder="أجل الأداء بالأيام (اختياري)" placeholderTextColor="#888" style={s.input}/><Pressable style={s.action} onPress={addCustomer}><Text style={s.actionText}>+ إضافة الزبون</Text></Pressable></View><Text style={s.section}>لائحة الزبناء ({customers.length})</Text><View style={[s.summary,{marginTop:10}]}><Text style={s.summaryText}>إجمالي ديون الزبناء: {(customerBalances.reduce((sum,x)=>sum+x.outstandingCentimes,0)/100).toFixed(2)} DH</Text><Text style={s.summaryText}>الفواتير المفتوحة: {customerBalances.filter(x=>x.outstandingCentimes>0).length}</Text></View>{customers.map(c=>{const balance=balanceFor(c.name);return <View key={c.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{c.name}</Text><Text style={s.itemSub}>{[c.phone,c.address,c.ice?'ICE: '+c.ice:''].filter(Boolean).join(' • ')}</Text><Text style={s.itemSub}>الفواتير: {balance?.invoiceCount||0} • المتبقي: {((balance?.outstandingCentimes||0)/100).toFixed(2)} DH</Text><Text style={s.itemSub}>الدين الافتتاحي: {((c.openingBalanceCentimes||0)/100).toFixed(2)} DH • سقف الدين: {c.creditLimitCentimes===undefined?'غير محدد':(c.creditLimitCentimes/100).toFixed(2)+' DH'} • أجل الأداء: {c.paymentTermsDays===undefined?'غير محدد':c.paymentTermsDays+' يوم'}</Text></View><Pressable onPress={()=>exportCustomerStatement(c.name)}><Text style={s.gold}>كشف الحساب</Text></Pressable><Pressable onPress={()=>Alert.alert('حذف الزبون؟',c.name,[{text:'إلغاء',style:'cancel'},{text:'حذف',style:'destructive',onPress:()=>setCustomers(v=>v.filter(x=>x.id!==c.id))}])}><Text style={s.delete}>حذف</Text></Pressable></View>;})}{customers.length===0&&<Text style={s.empty}>مازال ما زدتي حتى زبون.</Text>}</>
      :screen==='نقطة البيع'?<PosWorkspace products={products} customers={customers} onCheckout={checkoutPos}/>
      :screen==='المبيعات'?<><View style={s.panel}><Text style={s.panelTitle}>تسجيل عملية بيع</Text><Text style={s.fieldLabel}>اختار المنتج (ضغط عليه)</Text>{products.map(p=><Pressable key={p.id} accessibilityState={{selected:saleProduct===String(p.id)}} onPress={()=>setSaleProduct(String(p.id))} style={[s.choice,saleProduct===String(p.id)&&s.choiceActive]}><Text style={s.itemTitle}>{p.name} — {p.price.toFixed(2)} DH (متوفر: {p.qty})</Text></Pressable>)}{products.length===0&&<Text style={s.empty}>زيد منتجات أولاً.</Text>}<Text style={s.fieldLabel}>اختار الزبون</Text>{customers.map(c=><Pressable key={c.id} accessibilityState={{selected:saleCustomer===String(c.id)}} onPress={()=>setSaleCustomer(String(c.id))} style={[s.choice,saleCustomer===String(c.id)&&s.choiceActive]}><Text style={s.itemTitle}>{c.name}</Text></Pressable>)}{customers.length===0&&<Text style={s.empty}>زيد زبناء أولاً.</Text>}<TextInput value={saleQty} onChangeText={setSaleQty} keyboardType="number-pad" placeholder="الكمية" placeholderTextColor="#888" style={s.input}/><Pressable style={s.action} onPress={addSale}><Text style={s.actionText}>تأكيد البيع وتحديث المخزون</Text></Pressable></View><Text style={s.section}>سجل المبيعات ({sales.length})</Text>{sales.map(x=><View key={x.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{x.productName} × {x.qty}</Text><Text style={s.itemSub}>{x.customerName} • {x.date}</Text></View><Text style={s.itemPrice}>{x.total.toFixed(2)} DH</Text></View>)}{sales.length===0&&<Text style={s.empty}>مازال ما تسجلات حتى عملية بيع.</Text>}</>
      :screen==='المشتريات'?<><View style={s.panel}><Text style={s.panelTitle}>تسجيل شراء وإضافة للمخزون</Text><Text style={s.fieldLabel}>المنتج</Text>{products.map(p=><Pressable key={p.id} accessibilityState={{selected:purchaseProduct===String(p.id)}} onPress={()=>setPurchaseProduct(String(p.id))} style={[s.choice,purchaseProduct===String(p.id)&&s.choiceActive]}><Text style={s.itemTitle}>{p.name}</Text></Pressable>)}<Text style={s.fieldLabel}>المورد</Text>{suppliers.map(x=><Pressable key={x.id} accessibilityState={{selected:purchaseSupplier===String(x.id)}} onPress={()=>setPurchaseSupplier(String(x.id))} style={[s.choice,purchaseSupplier===String(x.id)&&s.choiceActive]}><Text style={s.itemTitle}>{x.name}</Text></Pressable>)}<View style={s.row}><TextInput value={purchaseQty} onChangeText={setPurchaseQty} keyboardType="number-pad" placeholder="الكمية" placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={purchaseCost} onChangeText={setPurchaseCost} keyboardType="decimal-pad" placeholder="ثمن الوحدة" placeholderTextColor="#888" style={[s.input,s.half]}/></View><Pressable style={s.action} onPress={addPurchase}><Text style={s.actionText}>تأكيد الشراء</Text></Pressable></View><Text style={s.section}>سجل المشتريات ({purchases.length})</Text><View style={s.summary}><Text style={s.summaryText}>إجمالي ديون الموردين: {supplierPayablesTotal.toFixed(2)} DH</Text>{supplierBalances.map(balance=><Text key={balance.supplierName} style={s.summaryText}>{balance.supplierName}: {(balance.outstandingCentimes/100).toFixed(2)} DH متبقية</Text>)}</View>{purchases.map(x=>{const remaining=Math.max(0,Math.round(x.total*100)-(x.paidCentimes||0));return <View key={x.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{x.productName} × {x.qty}</Text><Text style={s.itemSub}>{x.supplierName} • {x.date}</Text><Text style={s.itemSub}>المؤدى: {((x.paidCentimes||0)/100).toFixed(2)} DH • الباقي: {(remaining/100).toFixed(2)} DH</Text></View><Text style={s.itemPrice}>{x.total.toFixed(2)} DH</Text><Pressable onPress={()=>exportPdf('Bon d’achat',x.supplierName,[`${x.productName} × ${x.qty} — ${x.unitCost.toFixed(2)} DH / unité`,`Payé: ${((x.paidCentimes||0)/100).toFixed(2)} DH`,`Reste: ${(remaining/100).toFixed(2)} DH`],x.total)}><Text style={s.gold}>PDF</Text></Pressable>{remaining>0?<Pressable onPress={()=>{setSupplierPaymentPurchaseId(x.id);setSupplierPaymentAmount('');}}><Text style={s.gold}>دفعة</Text></Pressable>:<Text style={s.gold}>مخلص</Text>}{supplierPaymentPurchaseId===x.id&&remaining>0?<View style={{width:'100%',marginTop:10}}><TextInput value={supplierPaymentAmount} onChangeText={setSupplierPaymentAmount} keyboardType="decimal-pad" placeholder="مبلغ الدفعة DH" placeholderTextColor="#888" style={s.input}/><Pressable style={s.action} onPress={()=>addSupplierPayment(x.id)}><Text style={s.actionText}>تأكيد أداء المورد</Text></Pressable></View>:null}</View>;})}
         <Text style={s.section}>سجل أداءات الموردين ({supplierPayments.length})</Text>
         {supplierPayments.map(payment=><View key={payment.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{payment.supplierName}</Text><Text style={s.itemSub}>{payment.date} • شراء رقم {payment.purchaseId} • {payment.method}</Text></View><Text style={s.itemPrice}>{(payment.amountCentimes/100).toFixed(2)} DH</Text><Pressable onPress={()=>exportPdf('Reçu de paiement fournisseur',payment.supplierName,[`Achat: ${payment.purchaseId}`,`Date: ${payment.date}`,`Mode: ${payment.method}`,`Montant: ${(payment.amountCentimes/100).toFixed(2)} DH`],payment.amountCentimes/100)}><Text style={s.gold}>PDF</Text></Pressable><Pressable onPress={()=>Alert.alert('حذف أداء المورد؟',payment.supplierName,[{text:'إلغاء',style:'cancel'},{text:'حذف',style:'destructive',onPress:()=>deleteSupplierPayment(payment)}])}><Text style={s.delete}>حذف</Text></Pressable></View>)}
         {supplierPayments.length===0&&<Text style={s.empty}>مازال ما تسجل حتى أداء للموردين.</Text>}
       </>
      :screen==='المصاريف'?<><View style={s.panel}><Text style={s.panelTitle}>إضافة مصروف</Text><TextInput value={expenseTitle} onChangeText={setExpenseTitle} placeholder="وصف المصروف" placeholderTextColor="#888" style={s.input}/><TextInput value={expenseAmount} onChangeText={setExpenseAmount} keyboardType="decimal-pad" placeholder="المبلغ DH" placeholderTextColor="#888" style={s.input}/><TextInput value={expenseCategory} onChangeText={setExpenseCategory} placeholder="تصنيف المصروف (اختياري)" placeholderTextColor="#888" style={s.input}/><Text style={s.fieldLabel}>ربط المصروف بمشروع (اختياري)</Text><View style={s.row}><Pressable onPress={()=>setExpenseProjectId('')} style={[s.choice,{flex:1,borderColor:expenseProjectId===''?GOLD:'#444'}]}><Text style={s.itemTitle}>مصروف عام</Text></Pressable>{projects.map(p=><Pressable key={p.id} onPress={()=>setExpenseProjectId(String(p.id))} style={[s.choice,{flex:1,borderColor:expenseProjectId===String(p.id)?GOLD:'#444'}]}><Text style={s.itemTitle}>{p.name}</Text></Pressable>)}</View><Pressable style={s.action} onPress={addExpense}><Text style={s.actionText}>+ تسجيل المصروف</Text></Pressable></View><Text style={s.section}>سجل المصاريف — {expenseTotal.toFixed(2)} DH</Text>{expenses.map(x=><View key={x.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{x.title}</Text><Text style={s.itemSub}>{x.date} • {x.category||'بدون تصنيف'}</Text></View><Text style={s.itemPrice}>{x.amount.toFixed(2)} DH</Text><Pressable onPress={()=>exportPdf('Reçu de dépense','',[`${x.title} — ${x.amount.toFixed(2)} DH`],x.amount)}><Text style={s.gold}>PDF</Text></Pressable><Pressable onPress={()=>Alert.alert('حذف المصروف؟',x.title,[{text:'إلغاء',style:'cancel'},{text:'حذف',style:'destructive',onPress:()=>setExpenses(v=>v.filter(y=>y.id!==x.id))}])}><Text style={s.delete}>حذف</Text></Pressable></View>)}</>
      :screen==='عروض الأسعار'?<QuoteWorkspace products={products} customers={customers} quotes={quotes} onSave={(quote)=>setQuotes(v=>[quote,...v])} onPdf={exportPdf} onConvert={convertQuote}/>
      :screen==='الفواتير'||screen==='Bon de sortie'?<>
        <Text style={s.section}>{screen==='الفواتير'?'الفواتير':'سندات الخروج'}</Text>
        {documents.filter(d=>d.type===(screen==='الفواتير'?'invoice':'delivery')).map(d=><View key={d.id} style={s.listItem}>
          <View style={{flex:1}}><Text style={s.itemTitle}>{d.number} • {d.customerName}</Text><Text style={s.itemSub}>{d.date} • {d.status} • {d.lines.length} سطر</Text></View>
          <Text style={s.itemPrice}>{d.total.toFixed(2)} DH</Text>
          <Pressable onPress={()=>exportPdf(d.type==='invoice'?'Facture':'Bon de sortie',d.customerName,d.lines.map(line=>line.productName+' × '+line.qty+' — '+line.total.toFixed(2)+' DH'),d.total)}><Text style={s.gold}>PDF</Text></Pressable>
        </View>)}
        {documents.filter(d=>d.type===(screen==='الفواتير'?'invoice':'delivery')).length===0&&<Text style={s.empty}>مازال ما تسجلات حتى وثيقة من هاد النوع.</Text>}
        {sales.length>0&&<Text style={s.note}>سجل المبيعات القديم باقي محفوظ كما هو.</Text>}
      </>
      :screen==='المرتجعات'?<>
         <View style={s.panel}>
           <Text style={s.panelTitle}>تسجيل مرتجع زبون</Text>
           {sales.filter(sale=>remainingReturnQuantity(sale,salesReturns)>0).map(sale=>{const remaining=remainingReturnQuantity(sale,salesReturns);return <Pressable key={sale.id} onPress={()=>{setReturnSaleId(String(sale.id));setReturnQuantity('1');}} style={[s.choice,returnSaleId===String(sale.id)&&s.choiceActive]}><Text style={s.itemTitle}>{sale.productName} • {sale.customerName}</Text><Text style={s.itemSub}>{sale.date} • الكمية المتبقية للإرجاع: {remaining}</Text></Pressable>;})}
           {sales.length===0&&<Text style={s.empty}>ما كايناش مبيعات مسجلة.</Text>}
           <TextInput value={returnQuantity} onChangeText={setReturnQuantity} keyboardType="number-pad" placeholder="كمية الإرجاع" placeholderTextColor="#888" style={s.input}/>
           <TextInput value={returnReason} onChangeText={setReturnReason} placeholder="سبب الإرجاع (اختياري)" placeholderTextColor="#888" style={s.input}/>
           <View style={s.row}><Pressable onPress={()=>setReturnRestock(true)} style={[s.choice,{flex:1,borderColor:returnRestock?GOLD:'#444'}]}><Text style={s.itemTitle}>إرجاع للمخزون</Text></Pressable><Pressable onPress={()=>setReturnRestock(false)} style={[s.choice,{flex:1,borderColor:!returnRestock?GOLD:'#444'}]}><Text style={s.itemTitle}>بدون إعادة للمخزون</Text></Pressable></View>
           <Pressable style={s.action} onPress={addSalesReturn}><Text style={s.actionText}>تأكيد المرتجع</Text></Pressable>
         </View>
         <Text style={s.section}>سجل المرتجعات ({salesReturns.length})</Text>
         {salesReturns.map(item=><View key={item.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{item.productName} • {item.customerName}</Text><Text style={s.itemSub}>{item.date} • {item.reason||'بدون سبب'} • {item.restocked?'عاد للمخزون':'لم يعد للمخزون'}</Text></View><Text style={s.itemPrice}>{item.total.toFixed(2)} DH</Text><Pressable onPress={()=>Alert.alert('حذف المرتجع؟',item.productName,[{text:'إلغاء',style:'cancel'},{text:'حذف',style:'destructive',onPress:()=>deleteSalesReturn(item)}])}><Text style={s.delete}>حذف</Text></Pressable></View>)}
         {salesReturns.length===0&&<Text style={s.empty}>مازال ما تسجل حتى مرتجع.</Text>}
       </>
       :screen==='المشاريع والمهام'?<>
         <View style={s.panel}>
           <Text style={s.panelTitle}>إضافة مشروع / ورش</Text>
           <TextInput value={projectName} onChangeText={setProjectName} placeholder="اسم المشروع" placeholderTextColor="#888" style={s.input}/>
           <TextInput value={projectCustomer} onChangeText={setProjectCustomer} placeholder="اسم الزبون (اختياري)" placeholderTextColor="#888" style={s.input}/>
           <TextInput value={projectBudget} onChangeText={setProjectBudget} keyboardType="decimal-pad" placeholder="الميزانية المتفق عليها (DH)" placeholderTextColor="#888" style={s.input}/>
           <View style={s.row}><TextInput value={projectStartDate} onChangeText={setProjectStartDate} placeholder="تاريخ البداية YYYY-MM-DD" placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={projectDueDate} onChangeText={setProjectDueDate} placeholder="تاريخ التسليم YYYY-MM-DD" placeholderTextColor="#888" style={[s.input,s.half]}/></View>
           <TextInput value={projectNotes} onChangeText={setProjectNotes} placeholder="ملاحظات المشروع" placeholderTextColor="#888" style={s.input}/>
           <Pressable style={s.action} onPress={addProject}><Text style={s.actionText}>{editingProjectId===null?'حفظ المشروع':'حفظ تعديلات المشروع'}</Text></Pressable>
         </View>
         <Text style={s.section}>المشاريع ({projects.length})</Text>
         {projects.map(project=><View key={project.id} style={[s.panel,{marginBottom:9}]}>
           <Text style={s.itemTitle}>{project.name}</Text>
           <Text style={s.itemSub}>{project.customerName||'بدون زبون'} • {project.startDate||'بدون تاريخ بداية'} → {project.dueDate||'بدون موعد تسليم'}</Text>
           <Text style={s.panelText}>الميزانية: {project.budget.toFixed(2)} DH • المصروف المسجل: {expenses.filter(e=>e.projectId===project.id).reduce((sum,e)=>sum+e.amount,0).toFixed(2)} DH • المهام المكتملة: {workTasks.filter(t=>t.projectId===project.id&&t.status==='done').length}/{workTasks.filter(t=>t.projectId===project.id).length}</Text>
           <View style={s.row}>{([{value:'planned',label:'مخطط'},{value:'active',label:'قيد الإنجاز'},{value:'completed',label:'مكتمل'},{value:'cancelled',label:'ملغى'}] as const).map(status=><Pressable key={status.value} onPress={()=>setProjects(current=>current.map(p=>p.id===project.id?{...p,status:status.value}:p))} style={[s.choice,{flex:1,borderColor:project.status===status.value?GOLD:'#444'}]}><Text style={{color:project.status===status.value?GOLD:'#DDD',fontSize:11,textAlign:'center'}}>{status.label}</Text></Pressable>)}</View>
            <View style={{flexDirection:'row',gap:14,marginTop:8}}><Pressable onPress={()=>startEditProject(project)}><Text style={s.gold}>تعديل المشروع</Text></Pressable><Pressable onPress={()=>Alert.alert('حذف المشروع؟',project.name,[{text:'إلغاء',style:'cancel'},{text:'حذف',style:'destructive',onPress:()=>{setProjects(current=>current.filter(p=>p.id!==project.id));setWorkTasks(current=>current.map(t=>t.projectId===project.id?{...t,projectId:undefined}:t));setExpenses(current=>current.map(e=>e.projectId===project.id?{...e,projectId:undefined}:e));}}])}><Text style={s.delete}>حذف المشروع</Text></Pressable></View>
         </View>)}
         <View style={[s.panel,{marginTop:12}]}>
           <Text style={s.panelTitle}>إضافة مهمة</Text>
           <TextInput value={taskTitle} onChangeText={setTaskTitle} placeholder="عنوان المهمة" placeholderTextColor="#888" style={s.input}/>
           <Text style={s.fieldLabel}>ربط المهمة بمشروع</Text>
           <View style={s.row}><Pressable onPress={()=>setTaskProjectId('')} style={[s.choice,{flex:1,borderColor:taskProjectId===''?GOLD:'#444'}]}><Text style={s.itemTitle}>بدون مشروع</Text></Pressable>{projects.map(p=><Pressable key={p.id} onPress={()=>setTaskProjectId(String(p.id))} style={[s.choice,{flex:1,borderColor:taskProjectId===String(p.id)?GOLD:'#444'}]}><Text style={s.itemTitle}>{p.name}</Text></Pressable>)}</View>
           <TextInput value={taskAssignee} onChangeText={setTaskAssignee} placeholder="المسؤول عن المهمة" placeholderTextColor="#888" style={s.input}/>
           <Text style={s.fieldLabel}>الأولوية</Text>
           <View style={s.row}>{([{value:'low',label:'منخفضة'},{value:'medium',label:'متوسطة'},{value:'high',label:'مستعجلة'}] as const).map(p=><Pressable key={p.value} onPress={()=>setTaskPriority(p.value)} style={[s.choice,{flex:1,borderColor:taskPriority===p.value?GOLD:'#444'}]}><Text style={{color:taskPriority===p.value?GOLD:'#DDD',textAlign:'center'}}>{p.label}</Text></Pressable>)}</View>
           <View style={s.row}><TextInput value={taskDueDate} onChangeText={setTaskDueDate} placeholder="موعد المهمة YYYY-MM-DD" placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={taskDuration} onChangeText={setTaskDuration} keyboardType="decimal-pad" placeholder="المدة بالساعات" placeholderTextColor="#888" style={[s.input,s.half]}/></View>
           <Pressable style={s.action} onPress={addWorkTask}><Text style={s.actionText}>{editingTaskId===null?'حفظ المهمة':'حفظ تعديلات المهمة'}</Text></Pressable>
         </View>
         <Text style={s.section}>المهام ({workTasks.length})</Text>
         {workTasks.map(task=>{const linked=projects.find(p=>p.id===task.projectId);return <View key={task.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{task.title}</Text><Text style={s.itemSub}>{linked?.name||'بدون مشروع'} • {task.assignee||'بدون مسؤول'} • {task.dueDate||'بدون موعد'} • {task.durationHours} س</Text><Text style={s.itemSub}>الأولوية: {task.priority==='high'?'مستعجلة':task.priority==='medium'?'متوسطة':'منخفضة'} • الحالة: {task.status==='done'?'مكتملة':task.status==='doing'?'قيد الإنجاز':'جديدة'}</Text></View><Pressable onPress={()=>startEditTask(task)}><Text style={s.gold}>تعديل</Text></Pressable><Pressable onPress={()=>setWorkTasks(current=>current.map(t=>t.id===task.id?{...t,status:t.status==='todo'?'doing':t.status==='doing'?'done':'todo'}:t))}><Text style={s.gold}>{task.status==='todo'?'بدء':task.status==='doing'?'إنهاء':'إعادة'}</Text></Pressable><Pressable onPress={()=>Alert.alert('حذف المهمة؟',task.title,[{text:'إلغاء',style:'cancel'},{text:'حذف',style:'destructive',onPress:()=>setWorkTasks(current=>current.filter(t=>t.id!==task.id))}])}><Text style={s.delete}>حذف</Text></Pressable></View>;})}
         {workTasks.length===0&&<Text style={s.empty}>مازال ما تسجلات حتى مهمة.</Text>}
       </>
      :screen==='الأداءات'?<><View style={s.panel}><Text style={s.panelTitle}>تسجيل أداء زبون</Text>{customers.map(c=><Pressable key={c.id} onPress={()=>{setPaymentCustomer(String(c.id));setPaymentDocument('');}} style={[s.choice,paymentCustomer===String(c.id)&&s.choiceActive]}><Text style={s.itemTitle}>{c.name}</Text></Pressable>)}
        <Text style={s.fieldLabel}>اختار الفاتورة (اختياري)</Text>
        {documents.filter(d=>d.type==='invoice'&&(!paymentCustomer||d.customerName===customers.find(c=>String(c.id)===paymentCustomer)?.name)&&d.paidCentimes!==Math.round(d.total*100)).map(d=><Pressable key={d.id} onPress={()=>setPaymentDocument(String(d.id))} style={[s.choice,paymentDocument===String(d.id)&&s.choiceActive]}><Text style={s.itemTitle}>{d.number} — باقي {((d.total*100-(d.paidCentimes||0))/100).toFixed(2)} DH</Text></Pressable>)}
        <TextInput value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" placeholder="المبلغ DH" placeholderTextColor="#888" style={s.input}/><View style={s.row}>{['نقداً','تحويل','شيك'].map(m=><Pressable key={m} onPress={()=>setPaymentMethod(m)} style={[s.choice,{flex:1},paymentMethod===m&&s.choiceActive]}><Text style={s.itemTitle}>{m}</Text></Pressable>)}</View><TextInput value={paymentNote} onChangeText={setPaymentNote} placeholder="ملاحظة (اختياري)" placeholderTextColor="#888" style={s.input}/><Pressable style={s.action} onPress={addPayment}><Text style={s.actionText}>تسجيل الأداء</Text></Pressable></View><Text style={s.section}>سجل الأداءات ({payments.length})</Text>{payments.map(x=><View key={x.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{x.customerName} • {x.method}</Text><Text style={s.itemSub}>{x.date} {x.note}</Text></View><Text style={s.itemPrice}>{x.amount.toFixed(2)} DH</Text><Pressable onPress={()=>exportPdf('Reçu de paiement',x.customerName,[`Mode: ${x.method}`,`Montant: ${x.amount.toFixed(2)} DH`,x.note],x.amount)}><Text style={s.gold}>PDF</Text></Pressable></View>)}</>
      :screen==='النسخ الاحتياطي'?<><View style={s.panel}><Text style={s.panelTitle}>حماية بياناتك</Text><Text style={s.panelText}>صدر نسخة JSON فيها المنتجات والزبناء والموردين والمبيعات والمشتريات والمصاريف والعروض والأداءات. خزن الملف فمكان آمن.</Text><Pressable style={[s.action,{marginTop:14}]} disabled={backupBusy} onPress={exportBackup}><Text style={s.actionText}>{backupBusy?'جاري التحضير...':'تصدير نسخة احتياطية'}</Text></Pressable></View><View style={[s.panel,{marginTop:14}]}><Text style={s.panelTitle}>استرجاع نسخة</Text><Text style={s.panelText}>حل ملف النسخة الاحتياطية، نسخ المحتوى كامل، ولصقو هنا. الاسترجاع كيعوض البيانات الحالية.</Text><TextInput value={backupText} onChangeText={setBackupText} multiline numberOfLines={8} textAlignVertical="top" placeholder="لصق محتوى ملف JSON هنا..." placeholderTextColor="#888" style={[s.input,{minHeight:150,textAlign:'left'}]}/><Pressable style={s.action} disabled={backupBusy||!backupText.trim()} onPress={importBackup}><Text style={s.actionText}>استرجاع البيانات</Text></Pressable></View></>
      :screen==='الصندوق'?<>
        <View style={s.hero}>
          <Text style={s.heroLabel}>الرصيد الحالي للصندوق</Text>
          <Text style={s.heroTitle}>{(cashOnHand/100).toFixed(2)} DH</Text>
          <Text style={s.heroText}>الرصيد محسوب من الرصيد الافتتاحي والمداخيل والمصاريف النقدية المسجلة هنا</Text>
        </View>
        <View style={s.panel}>
          <Text style={s.panelTitle}>تسجيل حركة نقدية</Text>
          <View style={s.row}>
            {([{value:'opening',label:'رصيد افتتاحي'},{value:'cash_in',label:'مداخيل'},{value:'cash_out',label:'مصاريف'}] as const).map(kind=><Pressable key={kind.value} onPress={()=>setCashMovementKind(kind.value)} style={[s.choice,{flex:1,borderColor:cashMovementKind===kind.value?GOLD:'#444'}]}><Text style={{color:cashMovementKind===kind.value?GOLD:'#DDD',textAlign:'center',fontSize:12}}>{kind.label}</Text></Pressable>)}
          </View>
          <TextInput value={cashMovementAmount} onChangeText={setCashMovementAmount} keyboardType="decimal-pad" placeholder="المبلغ DH" placeholderTextColor="#888" style={s.input}/>
          <TextInput value={cashMovementDescription} onChangeText={setCashMovementDescription} placeholder="وصف الحركة (مثلاً: بيع نقدي، كراء...)" placeholderTextColor="#888" style={s.input}/>
          <Pressable style={s.action} onPress={addCashMovement}><Text style={s.actionText}>تسجيل الحركة</Text></Pressable>
        </View>
        <Text style={s.section}>سجل الصندوق ({cashMovements.length})</Text>
        {cashMovements.slice().sort((x,y)=>y.date.localeCompare(x.date)).map(item=><View key={item.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{item.description}</Text><Text style={s.itemSub}>{new Date(item.date).toLocaleString(language==='AR'?'ar-MA':'fr-MA')} • {item.kind==='opening'?'رصيد افتتاحي':item.kind==='cash_in'?'مدخول':'مصروف'}</Text></View><Text style={[s.itemPrice,{color:item.kind==='cash_out'?'#E28A78':GOLD}]}>{item.kind==='cash_out'?'-':'+'}{(item.amountCentimes/100).toFixed(2)} DH</Text></View>)}
        {cashMovements.length===0&&<Text style={s.empty}>الصندوق فارغ. سجل الرصيد الافتتاحي أولاً.</Text>}
        <Pressable style={s.action} onPress={()=>exportPdf('Journal de caisse','',cashMovements.map(item=>new Date(item.date).toLocaleDateString('fr-MA')+' — '+item.description+' — '+(item.kind==='cash_out'?'-':'+')+(item.amountCentimes/100).toFixed(2)+' DH'),cashOnHand/100)}><Text style={s.actionText}>تصدير سجل الصندوق PDF</Text></Pressable>
      </>
      :screen==='التقارير'?<>
        <View style={s.panel}>
          <Text style={s.panelTitle}>تقرير النشاط التجاري</Text>
          <Text style={s.panelText}>إجمالي المبيعات: {salesTotal.toFixed(2)} DH</Text>
          <Text style={s.panelText}>إجمالي المشتريات: {purchaseTotal.toFixed(2)} DH</Text>
          <Text style={s.panelText}>إجمالي المصاريف: {expenseTotal.toFixed(2)} DH</Text>
          <Text style={s.panelText}>ديون الموردين المتبقية: {supplierPayablesTotal.toFixed(2)} DH</Text>
          <Text style={s.panelText}>مجمل ربح المبيعات المحسوب بالتكلفة المسجلة: {grossProfit.toFixed(2)} DH</Text>
          <Text style={s.panelText}>الربح بعد المصاريف المسجلة: {(grossProfit-expenseTotal).toFixed(2)} DH</Text>
          <Text style={s.panelText}>مبيعات قديمة بلا تكلفة محفوظة: {untrackedSalesCount} (ما داخلاش فحساب الربح)</Text>
          <Text style={s.panelText}>الصافي الأولي النقدي (المبيعات - المشتريات - المصاريف): {(salesTotal-purchaseTotal-expenseTotal).toFixed(2)} DH</Text>
          <Pressable style={s.action} onPress={()=>exportPdf('Rapport d’activité','',['Ventes: '+salesTotal.toFixed(2)+' DH','Achats: '+purchaseTotal.toFixed(2)+' DH','Dépenses: '+expenseTotal.toFixed(2)+' DH','Marge brute suivie: '+grossProfit.toFixed(2)+' DH','Ventes historiques sans coût: '+untrackedSalesCount,'Résultat de trésorerie initial: '+(salesTotal-purchaseTotal-expenseTotal).toFixed(2)+' DH'],grossProfit-expenseTotal)}><Text style={s.actionText}>تصدير تقرير النشاط PDF</Text></Pressable>
        </View>
        <View style={[s.panel,{marginTop:12}]}>
          <Text style={s.panelTitle}>تقرير ديون الزبناء</Text>
          <Text style={s.panelText}>إجمالي المبالغ المتبقية: {receivablesTotal.toFixed(2)} DH</Text>
          <Text style={s.panelText}>عدد الفواتير المفتوحة: {openInvoiceCount}</Text>
          {customerBalances.filter(x=>x.outstandingCentimes>0).map(x=><View key={x.customerName} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{x.customerName}</Text><Text style={s.itemSub}>{x.invoiceCount} فاتورة</Text></View><Text style={s.itemPrice}>{(x.outstandingCentimes/100).toFixed(2)} DH</Text></View>)}
          {receivablesTotal===0&&<Text style={s.note}>ما كايناش ديون مسجلة حالياً.</Text>}
          <Pressable style={s.action} onPress={()=>exportPdf('Situation des clients','',customerBalances.filter(x=>x.outstandingCentimes>0).map(x=>x.customerName+' — '+(x.outstandingCentimes/100).toFixed(2)+' DH'),receivablesTotal)}><Text style={s.actionText}>تصدير تقرير الديون PDF</Text></Pressable>
        </View>
        <View style={[s.panel,{marginTop:12}]}>
          <Text style={s.panelTitle}>تقرير المخزون</Text>
          <Text style={s.panelText}>عدد المنتجات: {products.length}</Text>
          <Text style={s.panelText}>قيمة المخزون بسعر البيع: {stockValue.toFixed(2)} DH</Text>
          <Text style={s.panelText}>منتجات نافدة: {outOfStockCount}</Text>
          <Text style={s.panelText}>منتجات قليلة المخزون: {lowStockProducts.length}</Text>
          {products.map(p=><View key={p.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{p.name}</Text><Text style={s.itemSub}>الكمية: {p.qty}</Text></View><Text style={s.itemPrice}>{(p.price*p.qty).toFixed(2)} DH</Text></View>)}
          <Pressable style={s.action} onPress={()=>exportPdf('Etat du stock','',products.map(p=>p.name+' — '+p.qty+' × '+p.price.toFixed(2)+' DH'),stockValue)}><Text style={s.actionText}>تصدير حالة المخزون PDF</Text></Pressable>
        </View>
        <Text style={s.note}>الأرقام مبنية على السجلات الموجودة داخل HamZa. الصافي الأولي ليس ربحاً محاسبياً نهائياً، ولا يشمل تكلفة البضاعة المباعة أو الضرائب أو الالتزامات غير المسجلة.</Text>
      </>
      :<View style={s.panel}><Text style={s.panelTitle}>قسم {screen}</Text><Text style={s.panelText}>الواجهة الأولية موجودة. الوظائف التفصيلية لهذا القسم مازال ما تبرمجاتش.</Text><Text style={s.note}>الحالة: قيد التطوير</Text></View>}
      <Text style={s.footer}>HamZa • com.hamza.app • v0.8.0 • البيانات محفوظة على الهاتف</Text>
    </ScrollView><Modal visible={!!photoPreview} transparent animationType="fade" onRequestClose={()=>setPhotoPreview(null)}><Pressable onPress={()=>setPhotoPreview(null)} style={{flex:1,backgroundColor:'rgba(0,0,0,0.94)',justifyContent:'center',alignItems:'center',padding:16}}><Image source={{uri:photoPreview||undefined}} resizeMode="contain" style={{width:'100%',height:'85%'}}/><Text style={{color:'#FFF',marginTop:12}}>اضغط لإغلاق الصورة</Text></Pressable></Modal></SafeAreaView></LanguageContext.Provider>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#101010'},header:{padding:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderColor:'#292929'},brand:{fontSize:29,fontWeight:'900',color:GOLD},sub:{color:'#999',marginTop:2,fontSize:12},lang:{borderWidth:1,borderColor:GOLD,borderRadius:9,padding:9},gold:{color:GOLD,fontWeight:'800'},body:{padding:16,paddingBottom:30},topline:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},back:{color:GOLD,fontWeight:'700'},heading:{fontSize:22,fontWeight:'800',color:'#FFF'},hero:{backgroundColor:'#211D14',borderColor:'#5D4A25',borderWidth:1,borderRadius:16,padding:19,marginBottom:14},heroLabel:{color:'#D6C49B'},heroTitle:{fontSize:31,fontWeight:'900',color:GOLD,marginVertical:5},heroText:{color:'#DDD'},stats:{flexDirection:'row',gap:8,marginBottom:10},stat:{flex:1,backgroundColor:'#1C1C1C',borderRadius:11,padding:11,borderWidth:1,borderColor:'#333'},statNum:{color:GOLD,fontWeight:'900',fontSize:16},statLabel:{color:'#AAA',fontSize:11,marginTop:5},summary:{backgroundColor:'#1B1B1B',borderRadius:10,padding:12,marginBottom:14},summaryText:{color:'#DDD',marginVertical:3},search:{backgroundColor:'#1D1D1D',borderRadius:10,padding:13,color:'#FFF',marginBottom:14,borderWidth:1,borderColor:'#333',textAlign:'right'},grid:{flexDirection:'row',flexWrap:'wrap',gap:9},tile:{width:'48%',minHeight:102,backgroundColor:'#1B1B1B',borderColor:'#383838',borderWidth:1,borderRadius:12,padding:12,justifyContent:'center'},tileIcon:{fontSize:19,color:GOLD,marginBottom:5},tileTitle:{color:'#FFF',fontSize:15,fontWeight:'800'},tileSub:{color:GOLD,fontSize:11,marginTop:4},panel:{backgroundColor:'#1B1B1B',padding:16,borderRadius:14,borderWidth:1,borderColor:'#444'},panelTitle:{color:GOLD,fontSize:19,fontWeight:'800',marginBottom:12},input:{backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:12,color:'#FFF',marginBottom:10,textAlign:'right',flex:1},row:{flexDirection:'row',gap:8},half:{minWidth:0},action:{marginTop:3,backgroundColor:GOLD,borderRadius:9,padding:13,alignItems:'center'},actionText:{color:'#151515',fontWeight:'900'},section:{color:'#FFF',fontWeight:'800',fontSize:17,marginTop:20,marginBottom:10},empty:{color:'#888',textAlign:'center',padding:12},listItem:{backgroundColor:'#1B1B1B',borderRadius:10,padding:13,marginBottom:8,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:'#333'},itemTitle:{color:'#FFF',fontWeight:'800'},itemSub:{color:'#999',fontSize:12,marginTop:4},itemPrice:{color:GOLD,fontWeight:'800'},delete:{color:'#E28A78',fontSize:12,fontWeight:'700'},panelText:{color:'#DDD',lineHeight:24},note:{color:GOLD,marginTop:14},fieldLabel:{color:'#CCC',marginTop:10,marginBottom:7,fontWeight:'700'},choice:{borderWidth:1,borderColor:'#393939',borderRadius:8,padding:10,marginBottom:6},choiceActive:{borderColor:GOLD,backgroundColor:'#302819'},footer:{textAlign:'center',color:'#666',marginTop:28,fontSize:11}});
