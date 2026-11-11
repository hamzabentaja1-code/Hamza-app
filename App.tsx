import React, {useEffect, useMemo, useState} from 'react';
import {SafeAreaView, View, Text, Pressable, ScrollView, TextInput, StyleSheet, Alert, ActivityIndicator, Share, Image, Modal} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {readAppData, writeAppData, createBackup, restoreBackup} from './src/storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import QuoteWorkspace, {QuoteRecord, QuoteConversionType} from './src/QuoteWorkspace';
import PosWorkspace from './src/PosWorkspace';
import ProjectsWorkspace from './src/ProjectsWorkspace';
import {ProjectRecord,ProjectStatus,addProjectTask,createProject,normalizeProjects,setProjectTaskDone} from './src/projects';
import SalesReturnWorkspace from './src/SalesReturnWorkspace';
import {createSalesReturn,normalizeSalesReturns,SaleForReturn,SalesReturnRecord} from './src/domain/sales-returns';
import {convertQuote as createConvertedDocument, ConvertedDocument} from './src/domain/document-conversion';
import {applyPaymentToInvoice} from './src/domain/payment-allocation';
import {calculateCustomerBalances} from './src/domain/customer-balances';
import {StockMovement, Warehouse, DEFAULT_WAREHOUSE, normalizeWarehouses, validateWarehouse, warehouseStock, createStockCount, applyStockCount, transferStock} from './src/inventory';
import {translate, getLayoutDirection} from './src/i18n';
import {CompanyProfile, EMPTY_COMPANY_PROFILE, normalizeCompanyProfile} from './src/company-profile';
import {buildCsv, CsvCell} from './src/domain/csv-export';
import {calculateProfitLoss} from './src/domain/profit-loss';
import {BUSINESS_LEDGER_HEADERS,buildBusinessLedgerRows} from './src/domain/business-ledger';

const GOLD = '#D6AE55';
const htmlSafe=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
const STORE_KEY = 'hamza_app_data_v03';
const modules = [
  {ar:'المنتجات',en:'Products',icon:'▦'}, {ar:'نقطة البيع',en:'Point of Sale',icon:'🛒'}, {ar:'الزبناء',en:'Customers',icon:'♙'}, 
  {ar:'الموردون',en:'Suppliers',icon:'♧'}, {ar:'المبيعات',en:'Sales',icon:'↗'},
  {ar:'المشتريات',en:'Purchases',icon:'↙'}, {ar:'المخزون',en:'Stock',icon:'▤'},
  {ar:'عروض الأسعار',en:'Quotes / Devis',icon:'▧'}, {ar:'الفواتير',en:'Invoices',icon:'▣'},
  {ar:'فاتورة أولية',en:'Proforma',icon:'▤'},
  {ar:'Bon de sortie',en:'Delivery notes',icon:'⇧'}, {ar:'المصاريف',en:'Expenses',icon:'−'},
  {ar:'المشاريع',en:'Projects',icon:'◈'},
  {ar:'الإشعارات الدائنة',en:'Credit notes',icon:'↩'},
  {ar:'النسخ الاحتياطي',en:'Backup & Restore',icon:'↻'},
  {ar:'الإعدادات',en:'Settings',icon:'⚙'},
  {ar:'الأداءات',en:'Payments',icon:'د.م'}, {ar:'التقارير',en:'Reports',icon:'▥'},
];
type Product = {id:number; name:string; price:number; qty:number; costPrice?:number; reference?:string; barcode?:string; category?:string; brand?:string; unit?:string; variant?:string; photoData?:string};
type Customer = {id:number; name:string; phone?:string; address?:string; ice?:string};
type Sale = {id:number; productId?:number; warehouseId?:string; productName:string; customerName:string; qty:number; unitPrice:number; unitCost?:number; total:number; date:string; paymentMethod?:string; discount?:number};
type Purchase = {id:number; productName:string; supplierName:string; qty:number; unitCost:number; total:number; date:string};
type Expense = {id:number; title:string; amount:number; date:string; projectId?:number};
type Supplier = {id:number; name:string; phone?:string; address?:string; ice?:string};
type Quote = QuoteRecord;
type CommercialDocument = ConvertedDocument & {paidCentimes?:number};
type Payment = {id:number; customerName:string; amount:number; method:string; date:string; note:string; documentId?:number};
export default function App() {
  const [screen,setScreen]=useState('الرئيسية');
  const [search,setSearch]=useState(''); const [productSearch,setProductSearch]=useState(''); const [photoData,setPhotoData]=useState(''); const [photoPreview,setPhotoPreview]=useState<string|null>(null);
  const [language,setLanguage]=useState<'AR'|'FR'>('AR');
  const [companyProfile,setCompanyProfile]=useState<CompanyProfile>({...EMPTY_COMPANY_PROFILE});
  const updateCompanyProfile=(key:keyof CompanyProfile,value:string)=>setCompanyProfile(current=>({...current,[key]:value}));
  const tr=(value:string)=>translate(language,value);
  const [products,setProducts]=useState<Product[]>([]);
  const [stockMovements,setStockMovements]=useState<StockMovement[]>([]);
  const [warehouses,setWarehouses]=useState<Warehouse[]>([{...DEFAULT_WAREHOUSE}]);
  const [activeWarehouseId,setActiveWarehouseId]=useState('main');
  const [warehouseName,setWarehouseName]=useState('');
  const [warehouseAddress,setWarehouseAddress]=useState('');
  const [transferProductId,setTransferProductId]=useState('');
  const [transferTargetId,setTransferTargetId]=useState('');
  const [transferQuantity,setTransferQuantity]=useState('1');
  const [stockCountInputs,setStockCountInputs]=useState<Record<string,string>>({});
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [sales,setSales]=useState<Sale[]>([]);
  const [purchases,setPurchases]=useState<Purchase[]>([]); const [expenses,setExpenses]=useState<Expense[]>([]); const [suppliers,setSuppliers]=useState<Supplier[]>([]);
  const [quotes,setQuotes]=useState<Quote[]>([]); const [payments,setPayments]=useState<Payment[]>([]); const [documents,setDocuments]=useState<CommercialDocument[]>([]);
  const [projects,setProjects]=useState<ProjectRecord[]>([]);
  const [salesReturns,setSalesReturns]=useState<SalesReturnRecord[]>([]);
  const [quoteProduct,setQuoteProduct]=useState(''); const [quoteCustomer,setQuoteCustomer]=useState(''); const [quoteQty,setQuoteQty]=useState('1');
  const [paymentCustomer,setPaymentCustomer]=useState(''); const [paymentDocument,setPaymentDocument]=useState(''); const [paymentAmount,setPaymentAmount]=useState(''); const [paymentMethod,setPaymentMethod]=useState('نقداً'); const [paymentNote,setPaymentNote]=useState('');
  const [supplierName,setSupplierName]=useState(''); const [supplierPhone,setSupplierPhone]=useState(''); const [supplierAddress,setSupplierAddress]=useState(''); const [supplierIce,setSupplierIce]=useState(''); const [purchaseProduct,setPurchaseProduct]=useState(''); const [purchaseSupplier,setPurchaseSupplier]=useState(''); const [purchaseQty,setPurchaseQty]=useState('1'); const [purchaseCost,setPurchaseCost]=useState(''); const [expenseTitle,setExpenseTitle]=useState(''); const [expenseAmount,setExpenseAmount]=useState('');
  const [loaded,setLoaded]=useState(false); const [backupText,setBackupText]=useState(''); const [backupBusy,setBackupBusy]=useState(false);
  const [productBulkText,setProductBulkText]=useState('');
  const [name,setName]=useState(''); const [price,setPrice]=useState(''); const [costPrice,setCostPrice]=useState(''); const [qty,setQty]=useState(''); const [productReference,setProductReference]=useState(''); const [productBarcode,setProductBarcode]=useState(''); const [productCategory,setProductCategory]=useState(''); const [productBrand,setProductBrand]=useState(''); const [productUnit,setProductUnit]=useState(''); const [productVariant,setProductVariant]=useState(''); const [editingProductId,setEditingProductId]=useState<number|null>(null);
  const [customer,setCustomer]=useState(''); const [customerPhone,setCustomerPhone]=useState(''); const [customerAddress,setCustomerAddress]=useState(''); const [customerIce,setCustomerIce]=useState('');
  const [saleProduct,setSaleProduct]=useState(''); const [saleCustomer,setSaleCustomer]=useState(''); const [saleQty,setSaleQty]=useState('1');
  useEffect(()=>{(async()=>{try{const d=await readAppData({language:'AR' as 'AR'|'FR',companyProfile:EMPTY_COMPANY_PROFILE,products:[],stockMovements:[],warehouses:[{...DEFAULT_WAREHOUSE}],activeWarehouseId:'main',customers:[],sales:[],purchases:[],expenses:[],suppliers:[],quotes:[],payments:[],documents:[],projects:[],salesReturns:[]});setLanguage(d.language==='FR'?'FR':'AR');setCompanyProfile(normalizeCompanyProfile(d.companyProfile));setWarehouses(normalizeWarehouses(d.warehouses));setActiveWarehouseId(typeof d.activeWarehouseId==='string'&&normalizeWarehouses(d.warehouses).some(w=>w.id===d.activeWarehouseId)?d.activeWarehouseId:'main');setProducts(Array.isArray(d.products)?d.products as Product[]:[]);setStockMovements(Array.isArray(d.stockMovements)?d.stockMovements as StockMovement[]:(Array.isArray(d.products)?(d.products as Product[]).filter(p=>p.qty>0).map(p=>({id:'opening-migration-'+p.id,productId:String(p.id),warehouseId:activeWarehouseId,kind:'opening' as const,quantity:p.qty,unitCost:p.costPrice||0,createdAt:new Date().toISOString(),note:'رصيد افتتاحي مرحّل من النسخة السابقة'})):[]));setCustomers(Array.isArray(d.customers)?d.customers as Customer[]:[]);setSales(Array.isArray(d.sales)?d.sales as Sale[]:[]);setPurchases(Array.isArray(d.purchases)?d.purchases as Purchase[]:[]);setExpenses(Array.isArray(d.expenses)?d.expenses as Expense[]:[]);setSuppliers(Array.isArray(d.suppliers)?d.suppliers as Supplier[]:[]);setQuotes(Array.isArray(d.quotes)?d.quotes as Quote[]:[]);setPayments(Array.isArray(d.payments)?d.payments as Payment[]:[]);setDocuments(Array.isArray(d.documents)?d.documents as CommercialDocument[]:[]);setProjects(normalizeProjects(d.projects));setSalesReturns(normalizeSalesReturns(d.salesReturns));}catch(e){Alert.alert(tr('تنبيه'),e instanceof Error?e.message:'تعذر تحميل البيانات المحفوظة.');}finally{setLoaded(true);}})();},[]);
  useEffect(()=>{if(loaded){writeAppData({language,companyProfile,products,stockMovements,warehouses,activeWarehouseId,customers,sales,purchases,expenses,suppliers,quotes,payments,documents,projects,salesReturns}).catch(()=>Alert.alert(tr('خطأ'),tr('ما قدرناش نحفظو البيانات.')));}},[language,companyProfile,products,stockMovements,warehouses,activeWarehouseId,customers,sales,purchases,expenses,suppliers,quotes,payments,documents,projects,salesReturns,loaded]);
  const addWarehouse=()=>{const nameValue=warehouseName.trim();const warehouse:Warehouse={id:'wh-'+Date.now(),name:nameValue,address:warehouseAddress.trim()||undefined,active:true};const errors=validateWarehouse(warehouse,warehouses);if(errors.length){Alert.alert(tr('تعذر إضافة المخزن'),tr(errors[0]));return;}setWarehouses(current=>[...current,warehouse]);setActiveWarehouseId(warehouse.id);setWarehouseName('');setWarehouseAddress('');Alert.alert(tr('تمت إضافة المخزن'),warehouse.name);};
  const addWarehouseTransfer=()=>{try{const quantity=Number(transferQuantity.replace(',','.'));if(!transferProductId||!transferTargetId||!Number.isFinite(quantity)){throw new Error('اختار المنتج والمخزن المستهدف والكمية.');}const next=transferStock({id:'transfer-'+Date.now(),productId:transferProductId,fromWarehouseId:activeWarehouseId,toWarehouseId:transferTargetId,quantity,createdAt:new Date().toISOString()},stockMovements);setStockMovements(next);setTransferQuantity('1');Alert.alert(tr('تم التحويل'),tr('تسجل تحويل المخزون بنجاح.'));}catch(error){Alert.alert(tr('تعذر تحويل المخزون'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}};
  const addProject=(input:{name:string;customerName:string;budget:number;targetDate:string})=>{try{const project=createProject(input,Date.now());setProjects(current=>[project,...current]);Alert.alert(tr('تمت إضافة المشروع'),project.name);}catch(error){Alert.alert(tr('تعذر إضافة المشروع'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}};
  const changeProjectStatus=(projectId:number,status:ProjectStatus)=>setProjects(current=>current.map(project=>project.id===projectId?{...project,status}:project));
  const addTaskToProject=(projectId:number,title:string)=>{try{setProjects(current=>current.map(project=>project.id===projectId?addProjectTask(project,title,Date.now()):project));}catch(error){Alert.alert(tr('تعذر إضافة المهمة'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));}};
  const toggleProjectTask=(projectId:number,taskId:number,done:boolean)=>setProjects(current=>current.map(project=>project.id===projectId?setProjectTaskDone(project,taskId,done):project));
  const addProjectExpense=(projectId:number,title:string,amount:number)=>setExpenses(current=>[{id:Date.now(),projectId,title:title.trim(),amount,date:new Date().toLocaleDateString('fr-MA')},...current]);
  const addSalesReturn=(input:{sale:SaleForReturn;quantity:number;reason:string;restock:boolean}):boolean=>{
    const matches=input.sale.productId?products.filter(product=>product.id===input.sale.productId):products.filter(product=>product.name===input.sale.productName);
    const product=matches.length===1?matches[0]:undefined;
    if(input.restock&&!product){Alert.alert(tr('تعذر تسجيل المرتجع'),tr('المنتج الأصلي غير محدد بوضوح؛ سجل المرتجع بلا إرجاع للمخزون.'));return false;}
    try{
      const item=createSalesReturn({sale:input.sale,quantity:input.quantity,existingReturns:salesReturns,id:Date.now(),date:new Date().toLocaleDateString('fr-MA'),reason:input.reason,restock:input.restock,productId:product?.id});
      setSalesReturns(current=>[item,...current]);
      if(item.restocked&&product){const movement={id:'return-'+item.id,productId:String(product.id),warehouseId:item.warehouseId,kind:'return_in' as const,quantity:item.qty,createdAt:new Date().toISOString(),reference:item.number,note:'إرجاع منتج من مرتجع بيع'};const next=[...stockMovements,movement];setStockMovements(next);setProducts(current=>current.map(currentProduct=>currentProduct.id===product.id?{...currentProduct,qty:warehouses.reduce((sum,warehouse)=>sum+warehouseStock(next,String(product.id),warehouse.id),0)}:currentProduct));}
      Alert.alert(tr('تم تسجيل المرتجع'),item.number+' • '+item.total.toFixed(2)+' DH');return true;
    }catch(error){Alert.alert(tr('تعذر تسجيل المرتجع'),error instanceof Error?tr(error.message):tr('راجع البيانات وحاول من جديد.'));return false;}
  };
  const exportSalesReturnPdf=(item:SalesReturnRecord)=>exportPdf((language==='FR'?'Avoir ':'إشعار دائن ')+item.number,item.customerName,[tr('تاريخ المرتجع:')+' '+item.date,tr('مرجع البيع:')+' '+item.saleId,item.productName+' × '+item.qty,tr('سبب المرتجع')+': '+(item.reason||tr('بدون سبب')),tr(item.restocked?'عاد للمخزون':'لم يعد للمخزون')],item.total);
  const stockValue=useMemo(()=>products.reduce((a,p)=>a+p.price*p.qty,0),[products]);
  const potentialStockProfit=useMemo(()=>products.reduce((sum,p)=>sum+(p.price-(p.costPrice||0))*p.qty,0),[products]);
  const salesReturnTotal=useMemo(()=>salesReturns.reduce((sum,item)=>sum+item.total,0),[salesReturns]);
  const salesTotal=useMemo(()=>Math.max(0,sales.reduce((a,x)=>a+x.total,0)-salesReturnTotal),[sales,salesReturnTotal]);
  const purchaseTotal=useMemo(()=>purchases.reduce((a,x)=>a+x.total,0),[purchases]); const expenseTotal=useMemo(()=>expenses.reduce((a,x)=>a+x.amount,0),[expenses]);
  const profitLoss=useMemo(()=>calculateProfitLoss(sales,salesReturns,expenses),[sales,salesReturns,expenses]);
  const customerBalances=useMemo(()=>calculateCustomerBalances(documents),[documents]);
  const balanceFor=(customerName:string)=>customerBalances.find(x=>x.customerName===customerName);
  const receivablesTotal=useMemo(()=>customerBalances.reduce((sum,x)=>sum+x.outstandingCentimes,0)/100,[customerBalances]);
  const openInvoiceCount=useMemo(()=>documents.filter(d=>d.type==='invoice'&&(d.total*100-(d.paidCentimes||0))>0).length,[documents]);
  const lowStockProducts=useMemo(()=>products.filter(p=>p.qty>0&&p.qty<=5),[products]);
  const outOfStockCount=useMemo(()=>products.filter(p=>p.qty<=0).length,[products]);
  const quoteTotal=useMemo(()=>quotes.reduce((sum,q)=>sum+q.total,0),[quotes]);
  const resetProductForm=()=>{setName('');setPrice('');setCostPrice('');setQty('');setProductReference('');setProductBarcode('');setProductCategory('');setProductBrand('');setProductUnit('');setProductVariant('');setPhotoData('');setEditingProductId(null);};
  const startEditProduct=(p:Product)=>{setEditingProductId(p.id);setName(p.name);setPrice(String(p.price));setCostPrice(String(p.costPrice||0));setQty(String(warehouseStock(stockMovements,String(p.id),activeWarehouseId)));setProductReference(p.reference||'');setProductBarcode(p.barcode||'');setProductCategory(p.category||'');setProductBrand(p.brand||'');setProductUnit(p.unit||'');setProductVariant(p.variant||'');setPhotoData(p.photoData||'');};
  const addProduct=()=>{const n=Number(price.replace(',','.'));const cost=Number((costPrice||'0').replace(',','.'));const q=Number(qty||'0');const reference=productReference.trim();const barcode=productBarcode.trim();const category=productCategory.trim();const brand=productBrand.trim();const unit=productUnit.trim();const variant=productVariant.trim();if(!name.trim()||!price.trim()||!Number.isFinite(n)||n<0||!Number.isFinite(cost)||cost<0||!Number.isFinite(q)||q<0){Alert.alert(tr('معلومات ناقصة'),tr('دخل اسم المنتج وثمن وكمية صحيحين.'));return;}const duplicate=products.find(p=>p.id!==editingProductId&&((reference&&p.reference?.toLowerCase()===reference.toLowerCase())||(barcode&&p.barcode===barcode)));if(duplicate){Alert.alert(tr('مرجع مستعمل'),tr('المرجع أو الباركود مسجل من قبل عند المنتج: ')+duplicate.name);return;}const previousProduct=editingProductId!==null?products.find(p=>p.id===editingProductId):undefined;const previousWarehouseQty=previousProduct?warehouseStock(stockMovements,String(previousProduct.id),activeWarehouseId):0;const nextTotalQty=previousProduct?previousProduct.qty+q-previousWarehouseQty:q;const details={name:name.trim(),price:n,costPrice:cost,qty:nextTotalQty,reference:reference||undefined,barcode:barcode||undefined,category:category||undefined,brand:brand||undefined,unit:unit||undefined,variant:variant||undefined,photoData:photoData||undefined};if(editingProductId!==null){const previous=products.find(p=>p.id===editingProductId);if(previous&&q!==previousWarehouseQty){setStockMovements(v=>[...v,{id:'product-edit-'+editingProductId+'-'+Date.now(),productId:String(editingProductId),warehouseId:activeWarehouseId,kind:'adjustment',quantity:q-previousWarehouseQty,createdAt:new Date().toISOString(),note:'تعديل كمية المنتج من بطاقة المنتج'}]);}setProducts(v=>v.map(p=>p.id===editingProductId?{...p,...details}:p));Alert.alert(tr('تم التعديل'),tr('تبدلات معلومات المنتج بنجاح.'));}else{const id=Date.now();setProducts(v=>[{id,...details},...v]);if(q>0)setStockMovements(v=>[...v,{id:'opening-'+id,productId:String(id),warehouseId:activeWarehouseId,kind:'opening',quantity:q,unitCost:cost,createdAt:new Date().toISOString(),note:'رصيد افتتاحي عند إضافة المنتج'}]);}resetProductForm();};
  const pickCompanyLogo=async()=>{try{const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted){Alert.alert(tr('إذن الصور مطلوب'),tr('سمح للتطبيق بالوصول للصور لاختيار شعار الشركة.'));return;}const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.45,base64:true});if(result.canceled)return;const asset=result.assets[0];if(!asset.base64){Alert.alert(tr('تعذر تحميل الصورة'),tr('اختار صورة أخرى.'));return;}updateCompanyProfile('logoData','data:image/jpeg;base64,'+asset.base64);}catch{Alert.alert(tr('خطأ'),tr('ما قدرناش نختارو الصورة.'));}};
  const pickProductPhoto=async()=>{try{const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted){Alert.alert(tr('إذن الصور مطلوب'),tr('سمح للتطبيق بالوصول للصور لاختيار صورة المنتج.'));return;}const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.55,base64:true});if(result.canceled)return;const asset=result.assets[0];if(!asset.base64){Alert.alert(tr('تعذر تحميل الصورة'),tr('اختار صورة أخرى.'));return;}setPhotoData('data:image/jpeg;base64,'+asset.base64);}catch{Alert.alert(tr('خطأ'),tr('ما قدرناش نختارو الصورة.'));}};
  const importProductsBulk=()=>{
    const rows=productBulkText.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    if(!rows.length){Alert.alert(tr('ما كايناش بيانات'),tr('لصق لائحة المنتجات أولاً.'));return;}
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
      const cost=number(costText),salePrice=number(priceText),quantity=number(qtyText);
      if(!productName||!priceText||!Number.isFinite(cost)||cost<0||!Number.isFinite(salePrice)||salePrice<0||!Number.isInteger(quantity)||quantity<0){rejected++;continue;}
      const ref=(reference||'').toLowerCase(),code=barcode||'';
      if((ref&&seenRefs.has(ref))||(code&&seenBarcodes.has(code))){rejected++;continue;}
      if(ref)seenRefs.add(ref);if(code)seenBarcodes.add(code);
      imported.push({id:Date.now()+imported.length,name:productName,reference:reference||undefined,barcode:barcode||undefined,category:category||undefined,brand:brand||undefined,unit:unit||undefined,variant:variant||undefined,costPrice:cost,price:salePrice,qty:quantity});
    }
    if(!imported.length){Alert.alert(tr('ما تزاد حتى منتج'),`الأسطر المرفوضة: ${rejected}. راجع الصيغة والمرجع والباركود.`);return;}
    setProducts(current=>[...imported,...current]);setStockMovements(current=>[...current,...imported.filter(p=>p.qty>0).map(p=>({id:'opening-'+p.id,productId:String(p.id),warehouseId:'main',kind:'opening' as const,quantity:p.qty,unitCost:p.costPrice||0,createdAt:new Date().toISOString(),note:'رصيد افتتاحي من الاستيراد الجماعي'}))]);setProductBulkText('');
    Alert.alert(tr('تم الاستيراد'),`تزادو ${imported.length} منتج. الأسطر المرفوضة أو المكررة: ${rejected}.`);
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
  const exportProductsCsv=()=>exportCsvFile('HamZa-products',
    ['Nom','Référence','Code-barres','Catégorie','Prix achat DH','Prix vente DH','Quantité','Marque','Unité','Modèle'],
    products.map(p=>[p.name,p.reference||'',p.barcode||'',p.category||'',p.costPrice||0,p.price,p.qty,p.brand||'',p.unit||'',p.variant||'']));
  const exportSalesCsv=()=>exportCsvFile('HamZa-sales',
    ['Date','Produit','Client','Quantité','Prix unitaire DH','Total DH'],
    sales.map(item=>[item.date,item.productName,item.customerName,item.qty,item.unitPrice,item.total]));
  const exportBusinessLedger=()=>exportCsvFile('HamZa-business-ledger',BUSINESS_LEDGER_HEADERS,
    buildBusinessLedgerRows({products,sales,returns:salesReturns,purchases,expenses,payments,receivables:customerBalances}));
  const addCustomer=()=>{if(!customer.trim()){Alert.alert(tr('معلومات ناقصة'),tr('دخل اسم الزبون.'));return;}setCustomers(v=>[{id:Date.now(),name:customer.trim(),phone:customerPhone.trim(),address:customerAddress.trim(),ice:customerIce.trim()},...v]);setCustomer('');setCustomerPhone('');setCustomerAddress('');setCustomerIce('');};
  const addSale=()=>{const p=products.find(x=>String(x.id)===saleProduct);const c=customers.find(x=>String(x.id)===saleCustomer);const q=Number(saleQty);if(!p||!c||!Number.isInteger(q)||q<1){Alert.alert(tr('معلومات ناقصة'),tr('اختار منتج وزبون ودخل كمية صحيحة.'));return;}const available=warehouseStock(stockMovements,String(p.id),activeWarehouseId);if(q>available){Alert.alert(tr('المخزون غير كافٍ'),`${tr('المتوفر في المخزن المحدد هو')} ${available}.`);return;}const sale:Sale={id:Date.now(),productId:p.id,warehouseId:activeWarehouseId,productName:p.name,customerName:c.name,qty:q,unitPrice:p.price,unitCost:p.costPrice,total:q*p.price,date:new Date().toLocaleDateString('fr-MA')};setSales(v=>[sale,...v]);setProducts(v=>v.map(x=>x.id===p.id?{...x,qty:x.qty-q}:x));setStockMovements(v=>[...v,{id:'sale-'+sale.id,productId:String(p.id),warehouseId:activeWarehouseId,kind:'sale',quantity:q,createdAt:new Date().toISOString(),reference:String(sale.id),note:'بيع مباشر'}]);setSaleQty('1');Alert.alert(tr('تم تسجيل البيع'),`المجموع: ${sale.total.toFixed(2)} DH`);};
  const addSupplier=()=>{if(!supplierName.trim()){Alert.alert(tr('معلومات ناقصة'),tr('دخل اسم المورد.'));return;}setSuppliers(v=>[{id:Date.now(),name:supplierName.trim(),phone:supplierPhone.trim(),address:supplierAddress.trim(),ice:supplierIce.trim()},...v]);setSupplierName('');setSupplierPhone('');setSupplierAddress('');setSupplierIce('');};
  const addPurchase=()=>{const p=products.find(x=>String(x.id)===purchaseProduct);const sup=suppliers.find(x=>String(x.id)===purchaseSupplier);const q=Number(purchaseQty),cost=Number(purchaseCost.replace(',','.'));if(!p||!sup||!Number.isInteger(q)||q<1||!Number.isFinite(cost)||cost<0){Alert.alert(tr('معلومات ناقصة'),tr('اختار المنتج والمورد ودخل الكمية وثمن الشراء.'));return;}const item:Purchase={id:Date.now(),productName:p.name,supplierName:sup.name,qty:q,unitCost:cost,total:q*cost,date:new Date().toLocaleDateString('fr-MA')};setPurchases(v=>[item,...v]);setProducts(v=>v.map(x=>x.id===p.id?{...x,qty:x.qty+q}:x));setStockMovements(v=>[...v,{id:'purchase-'+item.id,productId:String(p.id),warehouseId:activeWarehouseId,kind:'purchase',quantity:q,unitCost:cost,createdAt:new Date().toISOString(),reference:String(item.id),note:'شراء من المورد '+sup.name}]);setPurchaseQty('1');setPurchaseCost('');Alert.alert(tr('تم تسجيل الشراء'),`المجموع: ${item.total.toFixed(2)} DH`);};
  const addExpense=()=>{const a=Number(expenseAmount.replace(',','.'));if(!expenseTitle.trim()||!Number.isFinite(a)||a<=0){Alert.alert(tr('معلومات ناقصة'),tr('دخل وصف المصروف ومبلغ صحيح.'));return;}setExpenses(v=>[{id:Date.now(),title:expenseTitle.trim(),amount:a,date:new Date().toLocaleDateString('fr-MA')},...v]);setExpenseTitle('');setExpenseAmount('');};
  const addQuote=()=>{const p=products.find(x=>String(x.id)===quoteProduct);const c=customers.find(x=>String(x.id)===quoteCustomer);const q=Number(quoteQty);if(!p||!c||!Number.isInteger(q)||q<1){Alert.alert(tr('معلومات ناقصة'),tr('اختار المنتج والزبون والكمية.'));return;}const x:Quote={id:Date.now(),productName:p.name,customerName:c.name,qty:q,unitPrice:p.price,total:q*p.price,date:new Date().toLocaleDateString('fr-MA'),status:'معلق'};setQuotes(v=>[x,...v]);setQuoteQty('1');Alert.alert(tr('تم حفظ عرض السعر'),`${x.total.toFixed(2)} DH`);};
  const convertQuote=(quote:Quote,type:QuoteConversionType)=>{
    try{
      if(type==='delivery'){
        const deliveryLines=quote.lines?.length?quote.lines:[{productId:products.find(p=>p.name===quote.productName)?.id||0,qty:quote.qty}];
        const insufficient=deliveryLines.find(line=>{
          const product=products.find(p=>p.id===line.productId);
          return !product||line.qty>warehouseStock(stockMovements,String(line.productId),activeWarehouseId);
        });
        if(insufficient)throw new Error('الكمية المطلوبة أكبر من مخزون المستودع المحدد.');
      }
      const result=createConvertedDocument(
        quote,type,documents,products,Date.now(),new Date().toLocaleDateString('fr-MA'),
      );
      setDocuments(current=>[result.document,...current]);
      if(type==='delivery'){setProducts(result.updatedProducts as Product[]);const delivery=result.document;setStockMovements(v=>[...v,...delivery.lines.map((line,index)=>({id:'delivery-'+delivery.id+'-'+index,productId:String(line.productId),warehouseId:activeWarehouseId,kind:'sale' as const,quantity:line.qty,createdAt:new Date().toISOString(),reference:delivery.number,note:'سند خروج'}))]);}
      Alert.alert(tr('تم التحويل'),type==='invoice'?'تسجلات الفاتورة.':'تسجل سند الخروج وتحدّث المخزون.');
    }catch(error){
      Alert.alert(tr('تعذر التحويل'),error instanceof Error?error.message:'وقع خطأ أثناء تحويل العرض.');
    }
  };
  const addPayment=()=>{
    const c=customers.find(x=>String(x.id)===paymentCustomer);
    const a=Number(paymentAmount.replace(',','.'));
    if(!c||!Number.isFinite(a)||a<=0){Alert.alert(tr('معلومات ناقصة'),tr('اختار الزبون ودخل مبلغ صحيح.'));return;}
    const invoice=documents.find(d=>d.id===Number(paymentDocument)&&d.type==='invoice'&&d.customerName===c.name);
    if(paymentDocument&&!invoice){Alert.alert(tr('الفاتورة غير موجودة'),tr('عاود اختار فاتورة صالحة لهذا الزبون.'));return;}
    let paidCentimes:number|undefined;
    if(invoice){
      try{
        const result=applyPaymentToInvoice({type:'invoice',total:invoice.total,paidCentimes:invoice.paidCentimes,status:invoice.status},Math.round(a*100));
        paidCentimes=result.invoice.paidCentimes;
        setDocuments(current=>current.map(d=>d.id===invoice.id?{...d,paidCentimes:result.invoice.paidCentimes,status:result.invoice.status}:d));
      }catch(error){Alert.alert(tr('تعذر تسجيل الأداء'),error instanceof Error?error.message:'راجع مبلغ الأداء.');return;}
    }
    setPayments(v=>[{id:Date.now(),customerName:c.name,amount:a,method:paymentMethod,date:new Date().toLocaleDateString('fr-MA'),note:paymentNote.trim(),...(invoice?{documentId:invoice.id}:{})},...v]);
    setPaymentAmount('');setPaymentNote('');setPaymentDocument('');
    Alert.alert(tr('تم تسجيل الأداء'),invoice?'تحدّث الرصيد المتبقي ديال الفاتورة.':'تسجل الأداء كدفعة غير مخصصة لفاتورة.');
  };
  const exportBackup=async()=>{try{setBackupBusy(true);const json=await createBackup({language,companyProfile,products,stockMovements,warehouses,activeWarehouseId,customers,sales,purchases,expenses,suppliers,quotes,payments,documents,projects,salesReturns});await Share.share({title:'HamZa backup',message:json});}catch(e){Alert.alert(tr('خطأ'),tr('ما قدرناش نوجدوا النسخة الاحتياطية.'));}finally{setBackupBusy(false);}};
  const importBackup=()=>{Alert.alert(tr('استرجاع البيانات'),tr('هاد العملية غادي تعوض البيانات الحالية بالنسخة اللي لصقتي. واش متأكد؟'),[{text:tr('إلغاء'),style:'cancel'},{text:'استرجاع',style:'destructive',onPress:async()=>{try{setBackupBusy(true);const d=await restoreBackup(backupText);setLanguage(d.language==='FR'?'FR':'AR');setCompanyProfile(normalizeCompanyProfile(d.companyProfile));setWarehouses(normalizeWarehouses(d.warehouses));setActiveWarehouseId(typeof d.activeWarehouseId==='string'&&normalizeWarehouses(d.warehouses).some(w=>w.id===d.activeWarehouseId)?d.activeWarehouseId:'main');setProducts(Array.isArray(d.products)?d.products as Product[]:[]);setStockMovements(Array.isArray(d.stockMovements)?d.stockMovements as StockMovement[]:(Array.isArray(d.products)?(d.products as Product[]).filter(p=>p.qty>0).map(p=>({id:'opening-backup-'+p.id,productId:String(p.id),warehouseId:'main',kind:'opening' as const,quantity:p.qty,unitCost:p.costPrice||0,createdAt:new Date().toISOString(),note:'رصيد افتتاحي مرحّل من النسخة الاحتياطية'})):[]));setCustomers(Array.isArray(d.customers)?d.customers as Customer[]:[]);setSales(Array.isArray(d.sales)?d.sales as Sale[]:[]);setPurchases(Array.isArray(d.purchases)?d.purchases as Purchase[]:[]);setExpenses(Array.isArray(d.expenses)?d.expenses as Expense[]:[]);setSuppliers(Array.isArray(d.suppliers)?d.suppliers as Supplier[]:[]);setQuotes(Array.isArray(d.quotes)?d.quotes as Quote[]:[]);setPayments(Array.isArray(d.payments)?d.payments as Payment[]:[]);setDocuments(Array.isArray(d.documents)?d.documents as CommercialDocument[]:[]);setProjects(normalizeProjects(d.projects));setSalesReturns(normalizeSalesReturns(d.salesReturns));setBackupText('');Alert.alert(tr('تم الاسترجاع'),tr('ترجعات البيانات بنجاح.'));}catch(e){Alert.alert(tr('تعذر الاسترجاع'),e instanceof Error?e.message:'النسخة غير صالحة.');}finally{setBackupBusy(false);}}}]);};
  const exportPdf=async(title:string,customerName:string,lines:string[],total:number)=>{
    try{
      const rtl=language==='AR';
      const labels=rtl
        ? {client:'الزبون',date:'التاريخ',total:'المجموع',thanks:'شكراً على ثقتكم'}
        : {client:'Client',date:'Date',total:'Total',thanks:'Thank you for your trust'};
      const direction=rtl?'rtl':'ltr';
      const companyLogoHtml=companyProfile.logoData?'<img src="'+htmlSafe(companyProfile.logoData)+'" style="max-width:110px;max-height:80px;object-fit:contain"/>':'';
      const html=`<html lang="${rtl?'ar':'fr'}" dir="${direction}"><meta charset="utf-8"><body style="font-family:Arial,sans-serif;padding:28px;color:#222;direction:${direction};text-align:${rtl?'right':'left'}">${companyLogoHtml}<h1 style="color:#9A762D">${htmlSafe(companyProfile.name.trim()||'HamZa')}</h1><p>${htmlSafe(companyProfile.address)} ${htmlSafe(companyProfile.phone)} ${htmlSafe(companyProfile.email)}</p><p>${htmlSafe(companyProfile.ice?`ICE: ${companyProfile.ice}`:'')} ${htmlSafe(companyProfile.rc?`RC: ${companyProfile.rc}`:'')} ${htmlSafe(companyProfile.taxId?`IF: ${companyProfile.taxId}`:'')}</p><h2>${htmlSafe(title)}</h2><p>${labels.client}: ${htmlSafe(customerName||'—')}</p><p>${labels.date}: ${new Date().toLocaleDateString(rtl?'ar-MA':'fr-MA')}</p><hr/>${lines.map(x=>`<p>${htmlSafe(x)}</p>`).join('')}<hr/><h2>${labels.total}: ${total.toFixed(2)} DH</h2><p>${labels.thanks}</p></body></html>`;
      const file=await Print.printToFileAsync({html});
      if(await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri,{mimeType:'application/pdf',dialogTitle:title});
      else Alert.alert(tr('PDF جاهز'),file.uri);
    }catch(e){Alert.alert(tr('خطأ'),tr('تعذر إنشاء PDF. تأكد من تثبيت مكتبات expo-print و expo-sharing.'));}
  };
  const checkoutPos=(data:{customerName:string;lines:{productId:number;name:string;quantity:number;unitPrice:number;discount:number}[];paymentMethod:'cash'|'card'|'transfer';total:number})=>{
    const invalid=data.lines.find(line=>{const product=products.find(p=>p.id===line.productId);return !product||warehouseStock(stockMovements,String(line.productId),activeWarehouseId)<line.quantity;});
    if(invalid){Alert.alert(tr('المخزون تبدل'),tr('الكمية المتوفرة ما بقاتش كافية. راجع السلة.'));return false;}
    const subtotal=data.lines.reduce((sum,line)=>sum+line.quantity*line.unitPrice-line.discount,0);
    const globalDiscount=Math.max(0,subtotal-data.total);
    const today=new Date().toLocaleDateString('fr-MA');
    const records=data.lines.map((line,index)=>{const raw=line.quantity*line.unitPrice-line.discount;const share=subtotal>0?globalDiscount*(raw/subtotal):0;return {id:Date.now()+index,productId:line.productId,warehouseId:activeWarehouseId,productName:line.name,customerName:data.customerName,qty:line.quantity,unitPrice:line.unitPrice,unitCost:products.find(product=>product.id===line.productId)?.costPrice,total:Math.max(0,raw-share),discount:line.discount+share,date:today,paymentMethod:data.paymentMethod};});
    setSales(current=>[...records,...current]);
    setProducts(current=>current.map(product=>{const sold=data.lines.filter(line=>line.productId===product.id).reduce((sum,line)=>sum+line.quantity,0);return sold?{...product,qty:product.qty-sold}:product;}));
    setStockMovements(current=>[...current,...data.lines.map((line,index)=>({id:'pos-'+Date.now()+'-'+index,productId:String(line.productId),warehouseId:activeWarehouseId,kind:'sale' as const,quantity:line.quantity,createdAt:new Date().toISOString(),note:'بيع نقطة البيع'}))]);
    const methodLabel=data.paymentMethod==='cash'?'نقداً':data.paymentMethod==='card'?'بطاقة':'تحويل';
    exportPdf('Reçu de vente',data.customerName,[...data.lines.map(line=>line.name+' × '+line.quantity+' — '+(line.quantity*line.unitPrice-line.discount).toFixed(2)+' DH'), ''+tr('طريقة الأداء:')+' '+methodLabel],data.total);
    return true;
  };
  const go=(s:string)=>{setScreen(s);setSearch('');};
  if(!loaded)return <SafeAreaView style={s.safe}><StatusBar style="light"/><ActivityIndicator color={GOLD} style={{flex:1}}/></SafeAreaView>;
  return <SafeAreaView style={[s.safe,{direction:getLayoutDirection(language)}]}><StatusBar style="light"/><View style={s.header}><View><Text style={s.brand}>HamZa</Text><Text style={s.sub}>{language==='FR'?'Gestion commerciale':'تسيير تجاري'}</Text></View><Pressable onPress={()=>setLanguage(language==='AR'?'FR':'AR')} style={s.lang}><Text style={s.gold}>{language}</Text></Pressable></View>
    <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
      <View style={s.topline}><Pressable onPress={()=>go('الرئيسية')}><Text style={s.back}>{tr('⌂ الرئيسية')}</Text></Pressable><Text style={s.heading}>{tr(screen)}</Text></View>
      {screen==='الرئيسية'?<>
        <View style={s.hero}><Text style={s.heroLabel}>{tr('مرحبا بك في')}</Text><Text style={s.heroTitle}>HamZa</Text><Text style={s.heroText}>{tr('تسيير تجارتك من مكان واحد')}</Text></View>
        <View style={s.stats}><View style={s.stat}><Text style={s.statNum}>{products.length}</Text><Text style={s.statLabel}>{tr('المنتجات')}</Text></View><View style={s.stat}><Text style={s.statNum}>{customers.length}</Text><Text style={s.statLabel}>{tr('الزبناء')}</Text></View><View style={s.stat}><Text style={s.statNum}>{salesTotal.toFixed(0)} DH</Text><Text style={s.statLabel}>{tr('مجموع المبيعات')}</Text></View></View>
        <View style={s.summary}>
          <Text style={s.panelTitle}>{tr('ملخص النشاط')}</Text>
          <Text style={s.summaryText}>{tr('قيمة المخزون بسعر البيع:')} {stockValue.toFixed(2)} DH</Text><Text style={s.summaryText}>{tr('الربح المحتمل إذا تباع المخزون كامل:')} {potentialStockProfit.toFixed(2)} DH</Text>
          <Text style={s.summaryText}>{tr('المبيعات المسجلة:')} {salesTotal.toFixed(2)} DH • {sales.length} عملية</Text>
          <Text style={s.summaryText}>{tr('المشتريات:')} {purchaseTotal.toFixed(2)} DH</Text>
          <Text style={s.summaryText}>{tr('المصاريف:')} {expenseTotal.toFixed(2)} DH</Text>
          <Text style={s.summaryText}>{tr('هامش الربح من المبيعات ذات التكلفة المسجلة:')} {profitLoss.grossProfitOnCostedSales.toFixed(2)} DH</Text>
          {profitLoss.uncostedRevenue>0&&<Text style={s.note}>{tr('قيمة المبيعات بلا تكلفة محفوظة:')} {profitLoss.uncostedRevenue.toFixed(2)} DH</Text>}
        </View>
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
        <View style={s.grid}>{modules.filter(m=>m.ar.includes(search)||m.en.toLowerCase().includes(search.toLowerCase())).map(m=><Pressable key={m.en} onPress={()=>go(m.ar)} style={s.tile}><Text style={s.tileIcon}>{m.icon}</Text><Text style={s.tileTitle}>{tr(m.ar)}</Text><Text style={s.tileSub}>{language==='FR'?({'Produits':'Produits','Point of Sale':'Point de vente','Customers':'Clients','Suppliers':'Fournisseurs','Sales':'Ventes','Purchases':'Achats','Stock':'Stock','Quotes / Devis':'Devis','Invoices':'Factures','Delivery notes':'Bons de sortie','Expenses':'Dépenses','Backup & Restore':'Sauvegarde','Payments':'Paiements','Reports':'Rapports','Settings':'Paramètres'} as Record<string,string>)[m.en]||m.en:m.en}</Text></Pressable>)}</View>
      </>:screen==='المنتجات'?<>
        <View style={s.panel}><Text style={s.panelTitle}>{editingProductId!==null?tr('تعديل المنتج'):tr('إضافة منتج جديد')}</Text><TextInput value={name} onChangeText={setName} placeholder={tr("اسم المنتج")} placeholderTextColor="#888" style={s.input}/><View style={s.row}><TextInput value={productReference} onChangeText={setProductReference} placeholder={tr("مرجع المنتج (اختياري)")} placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={productBarcode} onChangeText={setProductBarcode} placeholder={tr("الباركود (اختياري)")} placeholderTextColor="#888" style={[s.input,s.half]}/></View><TextInput value={productCategory} onChangeText={setProductCategory} placeholder={tr("الصنف / الفئة (اختياري)")} placeholderTextColor="#888" style={s.input}/><View style={s.row}><TextInput value={productBrand} onChangeText={setProductBrand} placeholder={tr("العلامة التجارية (اختياري)")} placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={productUnit} onChangeText={setProductUnit} placeholder={tr("الوحدة (اختياري)")} placeholderTextColor="#888" style={[s.input,s.half]}/></View><TextInput value={productVariant} onChangeText={setProductVariant} placeholder={tr("الموديل / النسخة (اختياري)")} placeholderTextColor="#888" style={s.input}/><View style={s.row}><TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder={tr("ثمن البيع (DH)")} placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={qty} onChangeText={setQty} keyboardType="number-pad" placeholder={tr("الكمية")} placeholderTextColor="#888" style={[s.input,s.half]}/></View><TextInput value={costPrice} onChangeText={setCostPrice} keyboardType="decimal-pad" placeholder={tr("ثمن الشراء / التكلفة (DH)")} placeholderTextColor="#888" style={s.input}/>{photoData?<Pressable onPress={()=>setPhotoPreview(photoData)}><Image source={{uri:photoData}} style={{width:92,height:92,borderRadius:10,alignSelf:'center',marginBottom:10}}/></Pressable>:null}<View style={s.row}><Pressable style={[s.choice,{flex:1,borderColor:GOLD}]} onPress={pickProductPhoto}><Text style={s.gold}>{photoData?tr('تغيير صورة المنتج'):tr('إضافة صورة المنتج')}</Text></Pressable>{photoData?<Pressable style={[s.choice,{flex:1}]} onPress={()=>setPhotoData('')}><Text style={s.delete}>{tr("حذف الصورة")}</Text></Pressable>:null}</View><Pressable style={s.action} onPress={addProduct}><Text style={s.actionText}>{editingProductId!==null?tr('حفظ التعديلات'):tr('+ إضافة المنتج')}</Text></Pressable></View>
        <View style={[s.panel,{marginTop:12}]}>
          <Text style={s.panelTitle}>{tr('إدخال جماعي للمنتجات')}</Text>
          <Text style={s.panelText}>{tr('كل سطر منتج واحد، والفاصل هو ; أو Tab. الترتيب: الاسم؛ المرجع؛ الباركود؛ الصنف؛ ثمن الشراء؛ ثمن البيع؛ الكمية؛ العلامة التجارية؛ الوحدة؛ الموديل. الحقول الإضافية اختيارية.')}</Text>
          <TextInput value={productBulkText} onChangeText={setProductBulkText} multiline numberOfLines={6} textAlignVertical="top" placeholder={tr('الاسم;المرجع;الباركود;الصنف;ثمن الشراء;ثمن البيع;الكمية;العلامة التجارية;الوحدة;الموديل\nRouteur;R-01;61100001;Réseau;150;220;5;TP-Link;Pièce;Archer C6')} placeholderTextColor="#888" style={[s.input,{minHeight:135,textAlign:'left',marginTop:10}]}/>
          <Pressable style={s.action} onPress={importProductsBulk}><Text style={s.actionText}>{tr("استيراد اللائحة وإضافة المنتجات")}</Text></Pressable>
          <Pressable style={[s.choice,{marginTop:8,borderColor:GOLD,alignItems:'center'}]} onPress={exportProductsCsv}><Text style={s.gold}>{tr("تصدير لائحة المنتجات CSV")}</Text></Pressable>
        </View>
        <Text style={s.section}>{tr("لائحة المنتجات")} ({products.length})</Text><TextInput value={productSearch} onChangeText={setProductSearch} placeholder={tr("بحث بالاسم أو المرجع أو الباركود أو الصنف...")} placeholderTextColor="#888" style={s.search}/>{products.length===0?<Text style={s.empty}>{tr("مازال ما زدتي حتى منتج.")}</Text> :products.filter(p=>[p.name,p.reference||'',p.barcode||'',p.category||'',p.brand||'',p.unit||'',p.variant||''].some(value=>value.toLowerCase().includes(productSearch.trim().toLowerCase()))).map(p=><View key={p.id} style={s.listItem}>{p.photoData?<Pressable onPress={()=>setPhotoPreview(p.photoData||null)}><Image source={{uri:p.photoData}} style={{width:48,height:48,borderRadius:8}}/></Pressable>:null}<View style={{flex:1}}><Text style={s.itemTitle}>{p.name}</Text><Text style={s.itemSub}>{[p.reference?tr('مرجع: ')+p.reference:'',p.barcode?tr('باركود: ')+p.barcode:'',p.category?tr('الصنف: ')+p.category:'',p.brand?tr('العلامة: ')+p.brand:'',p.unit?tr('الوحدة: ')+p.unit:'',p.variant?tr('الموديل: ')+p.variant:''].filter(Boolean).join(' • ')}</Text><Text style={s.itemSub}>{tr("الكمية:")} {p.qty} • {tr("الشراء:")} {(p.costPrice||0).toFixed(2)} DH • ربح الوحدة: {(p.price-(p.costPrice||0)).toFixed(2)} DH</Text></View><Text style={s.itemPrice}>{p.price.toFixed(2)} DH</Text><Pressable onPress={()=>startEditProduct(p)}><Text style={s.gold}>{tr("تعديل")}</Text></Pressable><Pressable onPress={()=>Alert.alert(tr('حذف المنتج؟'),p.name,[{text:'إلغاء'},{text:tr('حذف'),style:'destructive',onPress:()=>{setProducts(v=>v.filter(x=>x.id!==p.id));if(editingProductId===p.id)resetProductForm();}}])}><Text style={s.delete}>{tr("حذف")}</Text></Pressable></View>)}
      </>:screen==='الإعدادات'?<>
        <View style={s.panel}>
          <Text style={s.panelTitle}>{tr('اختار اللغة')}</Text>
          <Pressable style={[s.action,{marginBottom:10,backgroundColor:language==='AR'?GOLD:'#292929'}]} onPress={()=>setLanguage('AR')}><Text style={[s.actionText,{color:language==='AR'?'#151515':'#FFF'}]}>العربية {language==='AR'?'✓':''}</Text></Pressable>
          <Pressable style={[s.action,{backgroundColor:language==='FR'?GOLD:'#292929'}]} onPress={()=>setLanguage('FR')}><Text style={[s.actionText,{color:language==='FR'?'#151515':'#FFF'}]}>Français {language==='FR'?'✓':''}</Text></Pressable>
          <Text style={[s.panelText,{marginTop:14}]}>{tr('اللغة المختارة كتتحفظ فالهاتف وكتبقى حتى من بعد ما تسد التطبيق.')}</Text>
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
              const lines=products.map(p=>({productId:String(p.id),countedQuantity:Number((stockCountInputs[activeWarehouseId+':'+String(p.id)]??String(warehouseStock(stockMovements,String(p.id),activeWarehouseId))).replace(',','.'))}));
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
      </>:screen==='الموردون'?<><View style={s.panel}><Text style={s.panelTitle}>{tr('إضافة مورد')}</Text><TextInput value={supplierName} onChangeText={setSupplierName} placeholder={tr("اسم المورد")} placeholderTextColor="#888" style={s.input}/><TextInput value={supplierPhone} onChangeText={setSupplierPhone} keyboardType="phone-pad" placeholder={tr("الهاتف (اختياري)")} placeholderTextColor="#888" style={s.input}/><TextInput value={supplierAddress} onChangeText={setSupplierAddress} placeholder={tr("العنوان (اختياري)")} placeholderTextColor="#888" style={s.input}/><TextInput value={supplierIce} onChangeText={setSupplierIce} placeholder={tr("ICE (اختياري)")} placeholderTextColor="#888" style={s.input}/><Pressable style={s.action} onPress={addSupplier}><Text style={s.actionText}>{tr("+ إضافة المورد")}</Text></Pressable></View><Text style={s.section}>{tr("لائحة الموردين")} ({suppliers.length})</Text>{suppliers.map(x=><View key={x.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{x.name}</Text><Text style={s.itemSub}>{[x.phone,x.address,x.ice?tr('ICE: ')+x.ice:''].filter(Boolean).join(' • ')||tr("لا توجد معلومات إضافية")}</Text></View><Pressable onPress={()=>Alert.alert(tr('حذف المورد؟'),x.name,[{text:tr('إلغاء'),style:'cancel'},{text:tr('حذف'),style:'destructive',onPress:()=>setSuppliers(v=>v.filter(y=>y.id!==x.id))}])}><Text style={s.delete}>{tr("حذف")}</Text></Pressable></View>)}</>
      :screen==='الزبناء'?<><View style={s.panel}><Text style={s.panelTitle}>{tr('إضافة زبون')}</Text><TextInput value={customer} onChangeText={setCustomer} placeholder={tr("اسم الزبون")} placeholderTextColor="#888" style={s.input}/><TextInput value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" placeholder={tr("الهاتف / WhatsApp (اختياري)")} placeholderTextColor="#888" style={s.input}/><TextInput value={customerAddress} onChangeText={setCustomerAddress} placeholder={tr("العنوان (اختياري)")} placeholderTextColor="#888" style={s.input}/><TextInput value={customerIce} onChangeText={setCustomerIce} placeholder={tr("ICE (اختياري)")} placeholderTextColor="#888" style={s.input}/><Pressable style={s.action} onPress={addCustomer}><Text style={s.actionText}>{tr("+ إضافة الزبون")}</Text></Pressable></View><Text style={s.section}>{tr("لائحة الزبناء")} ({customers.length})</Text><View style={[s.summary,{marginTop:10}]}><Text style={s.summaryText}>{tr("إجمالي ديون الزبناء:")} {(customerBalances.reduce((sum,x)=>sum+x.outstandingCentimes,0)/100).toFixed(2)} DH</Text><Text style={s.summaryText}>{tr("الفواتير المفتوحة:")} {customerBalances.filter(x=>x.outstandingCentimes>0).length}</Text></View>{customers.map(c=>{const balance=balanceFor(c.name);return <View key={c.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{c.name}</Text><Text style={s.itemSub}>{[c.phone,c.address,c.ice?'ICE: '+c.ice:''].filter(Boolean).join(' • ')}</Text><Text style={s.itemSub}>{tr("الفواتير:")} {balance?.invoiceCount||0} • {tr("المتبقي:")} {((balance?.outstandingCentimes||0)/100).toFixed(2)} DH</Text></View><Pressable onPress={()=>Alert.alert(tr('حذف الزبون؟'),c.name,[{text:tr('إلغاء'),style:'cancel'},{text:tr('حذف'),style:'destructive',onPress:()=>setCustomers(v=>v.filter(x=>x.id!==c.id))}])}><Text style={s.delete}>{tr('حذف')}</Text></Pressable></View>;})}{customers.length===0&&<Text style={s.empty}>{tr("مازال ما زدتي حتى زبون.")}</Text>}</>
      :screen==='نقطة البيع'?<PosWorkspace language={language} products={products.map(p=>({...p,qty:warehouseStock(stockMovements,String(p.id),activeWarehouseId)}))} customers={customers} onCheckout={checkoutPos}/>
      :screen==='المبيعات'?<><View style={s.panel}><Text style={s.panelTitle}>{tr('تسجيل عملية بيع')}</Text><Text style={s.fieldLabel}>{tr('اختار المنتج (ضغط عليه)')}</Text>{products.map(p=><Pressable key={p.id} onPress={()=>setSaleProduct(String(p.id))} style={[s.choice,saleProduct===String(p.id)&&s.choiceActive]}><Text style={s.itemTitle}>{p.name} — {p.price.toFixed(2)} DH ({tr('متوفر:')} {p.qty})</Text></Pressable>)}{products.length===0&&<Text style={s.empty}>{tr('زيد منتجات أولاً.')}</Text>}<Text style={s.fieldLabel}>{tr('اختار الزبون')}</Text>{customers.map(c=><Pressable key={c.id} onPress={()=>setSaleCustomer(String(c.id))} style={[s.choice,saleCustomer===String(c.id)&&s.choiceActive]}><Text style={s.itemTitle}>{c.name}</Text></Pressable>)}{customers.length===0&&<Text style={s.empty}>{tr('زيد زبناء أولاً.')}</Text>}<TextInput value={saleQty} onChangeText={setSaleQty} keyboardType="number-pad" placeholder={tr('الكمية')} placeholderTextColor="#888" style={s.input}/><Pressable style={s.action} onPress={addSale}><Text style={s.actionText}>{tr('تأكيد البيع وتحديث المخزون')}</Text></Pressable></View><Text style={s.section}>{tr('سجل المبيعات')} ({sales.length})</Text><Pressable style={[s.choice,{marginBottom:10,borderColor:GOLD,alignItems:'center'}]} onPress={exportSalesCsv}><Text style={s.gold}>{tr('تصدير سجل المبيعات CSV')}</Text></Pressable>{sales.map(x=><View key={x.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{x.productName} × {x.qty}</Text><Text style={s.itemSub}>{x.customerName} • {x.date}</Text></View><Text style={s.itemPrice}>{x.total.toFixed(2)} DH</Text></View>)}{sales.length===0&&<Text style={s.empty}>{tr('مازال ما تسجلات حتى عملية بيع.')}</Text>}</>
      :screen==='المشتريات'?<><View style={s.panel}><Text style={s.panelTitle}>{tr('تسجيل شراء وإضافة للمخزون')}</Text><Text style={s.fieldLabel}>{tr('المنتج')}</Text>{products.map(p=><Pressable key={p.id} onPress={()=>setPurchaseProduct(String(p.id))} style={[s.choice,purchaseProduct===String(p.id)&&s.choiceActive]}><Text style={s.itemTitle}>{p.name}</Text></Pressable>)}<Text style={s.fieldLabel}>{tr('المورد')}</Text>{suppliers.map(x=><Pressable key={x.id} onPress={()=>setPurchaseSupplier(String(x.id))} style={[s.choice,purchaseSupplier===String(x.id)&&s.choiceActive]}><Text style={s.itemTitle}>{x.name}</Text></Pressable>)}<View style={s.row}><TextInput value={purchaseQty} onChangeText={setPurchaseQty} keyboardType="number-pad" placeholder={tr("الكمية")} placeholderTextColor="#888" style={[s.input,s.half]}/><TextInput value={purchaseCost} onChangeText={setPurchaseCost} keyboardType="decimal-pad" placeholder={tr('ثمن الوحدة')} placeholderTextColor="#888" style={[s.input,s.half]}/></View><Pressable style={s.action} onPress={addPurchase}><Text style={s.actionText}>{tr('تأكيد الشراء')}</Text></Pressable></View><Text style={s.section}>{tr('سجل المشتريات')} ({purchases.length})</Text>{purchases.map(x=><View key={x.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{x.productName} × {x.qty}</Text><Text style={s.itemSub}>{x.supplierName} • {x.date}</Text></View><Text style={s.itemPrice}>{x.total.toFixed(2)} DH</Text><Pressable onPress={()=>exportPdf('Bon d’achat',x.supplierName,[`${x.productName} × ${x.qty} — ${x.unitCost.toFixed(2)} DH / unité`],x.total)}><Text style={s.gold}>PDF</Text></Pressable></View>)}</>
      :screen==='المصاريف'?<><View style={s.panel}><Text style={s.panelTitle}>{tr('إضافة مصروف')}</Text><TextInput value={expenseTitle} onChangeText={setExpenseTitle} placeholder={tr('وصف المصروف')} placeholderTextColor="#888" style={s.input}/><TextInput value={expenseAmount} onChangeText={setExpenseAmount} keyboardType="decimal-pad" placeholder={tr('المبلغ DH')} placeholderTextColor="#888" style={s.input}/><Pressable style={s.action} onPress={addExpense}><Text style={s.actionText}>{tr('+ تسجيل المصروف')}</Text></Pressable></View><Text style={s.section}>{tr('سجل المصاريف')} — {expenseTotal.toFixed(2)} DH</Text>{expenses.map(x=><View key={x.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{x.title}</Text><Text style={s.itemSub}>{x.projectId?tr('مشروع')+': '+(projects.find(project=>project.id===x.projectId)?.name||'—')+' • ':''}{x.date}</Text></View><Text style={s.itemPrice}>{x.amount.toFixed(2)} DH</Text><Pressable onPress={()=>exportPdf('Reçu de dépense','',[`${x.title} — ${x.amount.toFixed(2)} DH`],x.amount)}><Text style={s.gold}>PDF</Text></Pressable><Pressable onPress={()=>setExpenses(v=>v.filter(y=>y.id!==x.id))}><Text style={s.delete}>{tr('حذف')}</Text></Pressable></View>)}</>
       :screen==='المشاريع'?<ProjectsWorkspace language={language} projects={projects} expenses={expenses} onCreate={addProject} onStatusChange={changeProjectStatus} onAddTask={addTaskToProject} onToggleTask={toggleProjectTask} onAddExpense={addProjectExpense}/>
       :screen==='الإشعارات الدائنة'?<SalesReturnWorkspace language={language} sales={sales} returns={salesReturns} onCreate={addSalesReturn} onPdf={exportSalesReturnPdf}/>
       :screen==='عروض الأسعار'?<QuoteWorkspace language={language} products={products} customers={customers} quotes={quotes} onSave={(quote)=>setQuotes(v=>[quote,...v])} onPdf={exportPdf} onConvert={convertQuote}/>
       :screen==='الفواتير'||screen==='Bon de sortie'||screen==='فاتورة أولية'?<>
         <Text style={s.section}>{screen==='الفواتير'?tr('الفواتير'):screen==='فاتورة أولية'?tr('فاتورة أولية'):tr('سندات الخروج')}</Text>
         {documents.filter(d=>d.type===(screen==='الفواتير'?'invoice':screen==='فاتورة أولية'?'proforma':'delivery')).map(d=><View key={d.id} style={s.listItem}>
           <View style={{flex:1}}><Text style={s.itemTitle}>{d.number} • {d.customerName}</Text><Text style={s.itemSub}>{d.date} • {tr(d.status)} • {d.lines.length} {tr('سطر')}</Text>{d.type==='proforma'&&d.validUntil&&<Text style={s.itemSub}>{tr('صالحة إلى غاية:')} {d.validUntil}</Text>}</View>
          <Text style={s.itemPrice}>{d.total.toFixed(2)} DH</Text>
           <Pressable onPress={()=>exportPdf(d.type==='invoice'?'Facture':d.type==='proforma'?tr('فاتورة أولية'):'Bon de sortie',d.customerName,[...d.lines.map(line=>line.productName+' × '+line.qty+' — '+line.total.toFixed(2)+' DH'),...(d.type==='proforma'&&d.validUntil?[tr('صالحة إلى غاية:')+' '+d.validUntil]:[])],d.total)}><Text style={s.gold}>PDF</Text></Pressable>
        </View>)}
         {documents.filter(d=>d.type===(screen==='الفواتير'?'invoice':screen==='فاتورة أولية'?'proforma':'delivery')).length===0&&<Text style={s.empty}>{tr('مازال ما تسجلات حتى وثيقة من هاد النوع.')}</Text>}
        {sales.length>0&&<Text style={s.note}>{tr('سجل المبيعات القديم باقي محفوظ كما هو.')}</Text>}
      </>
      :screen==='الأداءات'?<><View style={s.panel}><Text style={s.panelTitle}>{tr('تسجيل أداء زبون')}</Text>{customers.map(c=><Pressable key={c.id} onPress={()=>{setPaymentCustomer(String(c.id));setPaymentDocument('');}} style={[s.choice,paymentCustomer===String(c.id)&&s.choiceActive]}><Text style={s.itemTitle}>{c.name}</Text></Pressable>)}
        <Text style={s.fieldLabel}>{tr('اختار الفاتورة (اختياري)')}</Text>
        {documents.filter(d=>d.type==='invoice'&&(!paymentCustomer||d.customerName===customers.find(c=>String(c.id)===paymentCustomer)?.name)&&d.paidCentimes!==Math.round(d.total*100)).map(d=><Pressable key={d.id} onPress={()=>setPaymentDocument(String(d.id))} style={[s.choice,paymentDocument===String(d.id)&&s.choiceActive]}><Text style={s.itemTitle}>{d.number} — {tr('باقي')} {((d.total*100-(d.paidCentimes||0))/100).toFixed(2)} DH</Text></Pressable>)}
        <TextInput value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" placeholder={tr("المبلغ DH")} placeholderTextColor="#888" style={s.input}/><View style={s.row}>{['نقداً','تحويل','شيك'].map(m=><Pressable key={m} onPress={()=>setPaymentMethod(m)} style={[s.choice,{flex:1},paymentMethod===m&&s.choiceActive]}><Text style={s.itemTitle}>{tr(m)}</Text></Pressable>)}</View><TextInput value={paymentNote} onChangeText={setPaymentNote} placeholder={tr('ملاحظات (اختياري)')} placeholderTextColor="#888" style={s.input}/><Pressable style={s.action} onPress={addPayment}><Text style={s.actionText}>{tr('تسجيل الأداء')}</Text></Pressable></View><Text style={s.section}>{tr('سجل الأداءات')} ({payments.length})</Text>{payments.map(x=><View key={x.id} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{x.customerName} • {tr(x.method)}</Text><Text style={s.itemSub}>{x.date} {x.note}</Text></View><Text style={s.itemPrice}>{x.amount.toFixed(2)} DH</Text><Pressable onPress={()=>exportPdf('Reçu de paiement',x.customerName,[`Mode: ${x.method}`,`Montant: ${x.amount.toFixed(2)} DH`,x.note],x.amount)}><Text style={s.gold}>PDF</Text></Pressable></View>)}</>
      :screen==='النسخ الاحتياطي'?<><View style={s.panel}><Text style={s.panelTitle}>{tr('حماية بياناتك')}</Text><Text style={s.panelText}>{tr('صدر نسخة JSON فيها المنتجات والزبناء والموردين والمبيعات والمرتجعات والمشتريات والمصاريف والمشاريع والمهام والعروض والأداءات. خزن الملف فمكان آمن.')}</Text><Pressable style={[s.action,{marginTop:14}]} disabled={backupBusy} onPress={exportBackup}><Text style={s.actionText}>{backupBusy?tr('جاري التحضير...'):tr('تصدير نسخة احتياطية')}</Text></Pressable></View><View style={[s.panel,{marginTop:14}]}><Text style={s.panelTitle}>{tr('استرجاع نسخة')}</Text><Text style={s.panelText}>{tr('حل ملف النسخة الاحتياطية، نسخ المحتوى كامل، ولصقو هنا. الاسترجاع كيعوض البيانات الحالية.')}</Text><TextInput value={backupText} onChangeText={setBackupText} multiline numberOfLines={8} textAlignVertical="top" placeholder={tr('لصق محتوى ملف JSON هنا...')} placeholderTextColor="#888" style={[s.input,{minHeight:150,textAlign:'left'}]}/><Pressable style={s.action} disabled={backupBusy||!backupText.trim()} onPress={importBackup}><Text style={s.actionText}>{tr('استرجاع البيانات')}</Text></Pressable></View></>
      :screen==='التقارير'?<>
        <View style={s.panel}>
          <Text style={s.panelTitle}>{tr('تقرير النشاط التجاري')}</Text>
          <Text style={s.panelText}>{tr('إجمالي المبيعات:')} {salesTotal.toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('إجمالي المشتريات:')} {purchaseTotal.toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('إجمالي المصاريف:')} {expenseTotal.toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('تكلفة البضاعة المباعة (حسب تكلفة البيع المحفوظة):')} {profitLoss.costOfGoodsSold.toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('هامش الربح من المبيعات ذات التكلفة المسجلة:')} {profitLoss.grossProfitOnCostedSales.toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('النتيجة بعد المصاريف على البيانات المحتسبة:')} {profitLoss.netProfitOnCostedSales.toFixed(2)} DH</Text>
          {profitLoss.uncostedRevenue>0&&<Text style={s.note}>{tr('قيمة المبيعات بلا تكلفة محفوظة:')} {profitLoss.uncostedRevenue.toFixed(2)} DH</Text>}
          <Pressable style={s.action} onPress={()=>exportPdf('Rapport d’activité','',['Ventes nettes: '+salesTotal.toFixed(2)+' DH','Achats (stock): '+purchaseTotal.toFixed(2)+' DH','Dépenses: '+expenseTotal.toFixed(2)+' DH','Coût de revient enregistré: '+profitLoss.costOfGoodsSold.toFixed(2)+' DH','Marge brute calculable: '+profitLoss.grossProfitOnCostedSales.toFixed(2)+' DH','Résultat après dépenses (données comptabilisées): '+profitLoss.netProfitOnCostedSales.toFixed(2)+' DH','Ventes sans coût enregistré: '+profitLoss.uncostedRevenue.toFixed(2)+' DH'],profitLoss.netProfitOnCostedSales)}><Text style={s.actionText}>{tr('تصدير تقرير النشاط PDF')}</Text></Pressable>
          <Pressable style={[s.choice,{marginTop:8,borderColor:GOLD,alignItems:'center'}]} onPress={exportBusinessLedger}><Text style={s.gold}>{tr('تصدير السجل الكامل CSV')}</Text></Pressable>
        </View>
        <View style={[s.panel,{marginTop:12}]}>
          <Text style={s.panelTitle}>{tr('تقرير ديون الزبناء')}</Text>
          <Text style={s.panelText}>{tr('إجمالي المبالغ المتبقية:')} {receivablesTotal.toFixed(2)} DH</Text>
          <Text style={s.panelText}>{tr('عدد الفواتير المفتوحة:')} {openInvoiceCount}</Text>
          {customerBalances.filter(x=>x.outstandingCentimes>0).map(x=><View key={x.customerName} style={s.listItem}><View style={{flex:1}}><Text style={s.itemTitle}>{x.customerName}</Text><Text style={s.itemSub}>{x.invoiceCount} {tr('فاتورة')}</Text></View><Text style={s.itemPrice}>{(x.outstandingCentimes/100).toFixed(2)} DH</Text></View>)}
          {receivablesTotal===0&&<Text style={s.note}>{tr('ما كايناش ديون مسجلة حالياً.')}</Text>}
          <Pressable style={s.action} onPress={()=>exportPdf('Situation des clients','',customerBalances.filter(x=>x.outstandingCentimes>0).map(x=>x.customerName+' — '+(x.outstandingCentimes/100).toFixed(2)+' DH'),receivablesTotal)}><Text style={s.actionText}>{tr('تصدير تقرير الديون PDF')}</Text></Pressable>
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
