import React,{useMemo,useState} from 'react';
import {ScrollView,View,Alert} from 'react-native';
import {TText as Text,TTextInput as TextInput} from './i18n';
import AccessiblePressable from './AccessiblePressable';
import {SupplierPriceRequest,SupplierInvoice,createSupplierPriceRequest,transitionSupplierPriceRequest,recordSupplierPriceOffer,compareSupplierOffers,createSupplierInvoice} from './domain/supplier-procurement';
import {SupplierInvoicePayment,summarizeSupplierInvoicePayments} from './domain/supplier-invoice-payments';
type Supplier={id:number;name:string};
type Product={id:number;name:string;reference?:string;barcode?:string;kind?:string};
type Variant={id:string;productId:number;attributes:Record<string,string>;active:boolean};
type PurchaseOrder={id:number;supplierName:string;supplierId?:string;status:'ordered'|'partially_received'|'received'|'cancelled';lines:Array<{productId:number;productName:string;quantity:number;receivedQuantity:number;unitCost:number;variantId?:string;variantLabel?:string}>};
type Props={suppliers:Supplier[];products:Product[];variants:Variant[];requests:SupplierPriceRequest[];purchaseOrders:PurchaseOrder[];invoices:SupplierInvoice[];invoicePayments:SupplierInvoicePayment[];activeBankAccountName?:string;onAddInvoicePayment:(invoice:SupplierInvoice,payment:Omit<SupplierInvoicePayment,'invoiceId'|'supplierId'>)=>void;onReverseInvoicePayment:(paymentId:string)=>void;onSave:(item:SupplierPriceRequest)=>void;onUpdate:(item:SupplierPriceRequest)=>void;onSaveInvoice:(item:SupplierInvoice)=>void;onPdf:(title:string,customer:string,lines:string[],total:number)=>void};
const gold='#D4AF62',panel={backgroundColor:'#1B1B1B',borderRadius:12,borderWidth:1,borderColor:'#383838',padding:13,marginBottom:12} as const;
const input={backgroundColor:'#111',borderWidth:1,borderColor:'#3A3A3A',borderRadius:8,padding:10,color:'#FFF',marginBottom:8} as const;
export default function SupplierProcurementWorkspace({suppliers,products,variants,requests,purchaseOrders,invoices,invoicePayments,activeBankAccountName,onAddInvoicePayment,onReverseInvoicePayment,onSave,onUpdate,onSaveInvoice,onPdf}:Props){
 const [supplierId,setSupplierId]=useState('');
 const [productId,setProductId]=useState('');
 const [variantId,setVariantId]=useState('');
 const [quantity,setQuantity]=useState('1');
 const [lines,setLines]=useState<Array<{productId:number;variantId?:string;productName:string;quantity:number}>>([]);
 const [selectedId,setSelectedId]=useState('');
 const [prices,setPrices]=useState<Record<string,string>>({});
 const [validUntil,setValidUntil]=useState('');
 const [selectedOrderId,setSelectedOrderId]=useState('');
 const [invoiceNumber,setInvoiceNumber]=useState('');
 const [invoiceDueDate,setInvoiceDueDate]=useState('');
 const [invoiceUnitCosts,setInvoiceUnitCosts]=useState<Record<string,string>>({});
 const [paymentInvoiceId,setPaymentInvoiceId]=useState('');const [paymentAmount,setPaymentAmount]=useState('');const [paymentMethod,setPaymentMethod]=useState<SupplierInvoicePayment['method']>('cash');const [paymentReference,setPaymentReference]=useState('');
 const selected=requests.find(item=>item.id===selectedId);
 const comparisons=useMemo(()=>compareSupplierOffers(requests),[requests]);
 const addLine=()=>{
  const product=products.find(item=>String(item.id)===productId),qty=Number(quantity);
  if(!product||product.kind==='service'||!Number.isSafeInteger(qty)||qty<=0)return;
  const availableVariants=variants.filter(item=>item.productId===product.id&&item.active);
  const variant=availableVariants.find(item=>item.id===variantId);
  if(availableVariants.length&&!variant)return;
  const uniqueKey=product.id+'::'+(variant?.id||'');
  if(lines.some(line=>line.productId+'::'+(line.variantId||'')===uniqueKey))return;
  const label=variant?Object.values(variant.attributes).join(' / '):'';
  setLines(current=>[...current,{productId:product.id,variantId:variant?.id,productName:product.name+(label?' • '+label:''),quantity:qty}]);
  setProductId('');setVariantId('');setQuantity('1');
 };
 const createRequest=()=>{
  const supplier=suppliers.find(item=>String(item.id)===supplierId);
  if(!supplier||!lines.length)return;
  try{
   const item=createSupplierPriceRequest({id:String(Date.now()),number:'DR-'+Date.now(),supplierId:String(supplier.id),supplierName:supplier.name,
    createdAt:new Date().toISOString(),validUntil:validUntil.trim()||undefined,lines});
   onSave(item);setLines([]);setSupplierId('');setValidUntil('');
  }catch{}
 };
 const send=()=>{if(!selected)return;try{onUpdate(transitionSupplierPriceRequest(selected,'sent'));}catch{}};
 const saveOffer=()=>{
  if(!selected)return;
  try{
   const offerLines=selected.lines.map(line=>{const raw=(prices[String(line.productId)+'::'+(line.variantId||'')]||'').trim().replace(',','.');const value=Number(raw);if(!raw||!Number.isFinite(value)||value<0)throw new Error('دخل ثمن صحيح لكل منتج.');return {productId:line.productId,variantId:line.variantId,unitCostCentimes:Math.round(value*100)};});
   onUpdate(recordSupplierPriceOffer(selected,{id:selected.id+'-'+Date.now(),receivedAt:new Date().toISOString(),lines:offerLines}));setPrices({});
  }catch(error){Alert.alert('تعذر حفظ عرض المورد',error instanceof Error?error.message:'راجع أثمان المنتجات.');}
 };
 const action=(label:string,onPress:()=>void,color=gold)=> <AccessiblePressable accessibilityRole="button" onPress={onPress} style={{borderWidth:1,borderColor:color,borderRadius:8,padding:10,marginTop:6,alignItems:'center'}}><Text style={{color,fontWeight:'800'}}>{label}</Text></AccessiblePressable>;
 return <ScrollView keyboardShouldPersistTaps="handled">
  <View style={panel}>
   <Text style={{color:gold,fontSize:18,fontWeight:'900',marginBottom:10}}>طلب عرض أثمان من الموردين</Text>
   <Text style={{color:'#CCC',marginBottom:7}}>اختار المورد</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{suppliers.map(item=><AccessiblePressable key={item.id} accessibilityState={{selected:supplierId===String(item.id)}} onPress={()=>setSupplierId(String(item.id))} style={{padding:9,borderRadius:8,borderWidth:1,borderColor:supplierId===String(item.id)?gold:'#444'}}><Text style={{color:'#FFF'}}>{item.name}</Text></AccessiblePressable>)}</View>
   <Text style={{color:'#CCC',marginTop:12,marginBottom:7}}>المنتج والكمية المطلوبة</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{products.filter(item=>item.kind!=='service').map(item=><AccessiblePressable key={item.id} accessibilityState={{selected:productId===String(item.id)}} onPress={()=>{setProductId(String(item.id));setVariantId('');}} style={{padding:8,borderRadius:8,borderWidth:1,borderColor:productId===String(item.id)?gold:'#444'}}><Text style={{color:'#FFF'}}>{item.name}</Text></AccessiblePressable>)}</View>
   {productId&&variants.some(item=>item.productId===Number(productId)&&item.active)?<View style={{marginTop:8}}><Text style={{color:'#CCC',marginBottom:6}}>اختار النسخة</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{variants.filter(item=>item.productId===Number(productId)&&item.active).map(item=><AccessiblePressable key={item.id} accessibilityState={{selected:variantId===item.id}} onPress={()=>setVariantId(item.id)} style={{padding:8,borderRadius:8,borderWidth:1,borderColor:variantId===item.id?gold:'#444'}}><Text style={{color:'#FFF'}}>{Object.values(item.attributes).join(' / ')}</Text></AccessiblePressable>)}</View></View>:null}
   <View style={{flexDirection:'row',gap:8,marginTop:8}}><TextInput value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder="الكمية" placeholderTextColor="#888" style={[input,{flex:1}]}/><AccessiblePressable onPress={addLine} style={{padding:11,backgroundColor:gold,borderRadius:8,justifyContent:'center'}}><Text style={{color:'#111',fontWeight:'900'}}>إضافة</Text></AccessiblePressable></View>
   {lines.map(line=><View key={line.productId+'::'+(line.variantId||'')} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:6}}><Text style={{color:'#FFF'}}>{line.productName} × {line.quantity}</Text><AccessiblePressable onPress={()=>setLines(current=>current.filter(item=>item.productId!==line.productId||(item.variantId||'')!==(line.variantId||'')))}><Text style={{color:'#E28A78'}}>حذف</Text></AccessiblePressable></View>)}
   <TextInput value={validUntil} onChangeText={setValidUntil} placeholder="آخر أجل للرد YYYY-MM-DD (اختياري)" placeholderTextColor="#888" style={input}/>
   {action('إنشاء طلب عرض الثمن',createRequest)}
  </View>
  <Text style={{color:gold,fontWeight:'900',fontSize:17,marginBottom:9}}>طلبات الأثمان ({requests.length})</Text>
  {requests.map(item=><View key={item.id} style={panel}>
   <AccessiblePressable onPress={()=>setSelectedId(selectedId===item.id?'':item.id)}><Text style={{color:'#FFF',fontWeight:'900'}}>{item.number} • {item.supplierName}</Text><Text style={{color:'#AAA',marginTop:4}}>{item.createdAt.slice(0,10)} • {item.status==='draft'?'مسودة':item.status==='sent'?'مرسل':item.status==='quoted'?'توصلنا بالثمن':item.status==='accepted'?'مقبول':item.status==='rejected'?'مرفوض':'ملغى'}</Text><Text style={{color:'#CCC',marginTop:5}}>{item.lines.map(line=>line.productName+' × '+line.quantity).join(' • ')}</Text></AccessiblePressable>
   {item.status==='draft'?action('تأكيد إرسال الطلب',()=>{try{onUpdate(transitionSupplierPriceRequest(item,'sent'));}catch{}}):null}
   {(item.status==='sent'||item.status==='quoted')&&<AccessiblePressable onPress={()=>setSelectedId(selectedId===item.id?'':item.id)} style={{padding:8,marginTop:5}}><Text style={{color:gold}}>تسجيل أو تعديل عرض المورد</Text></AccessiblePressable>}
   {selectedId===item.id&&(item.status==='sent'||item.status==='quoted')?<View style={{marginTop:8}}>{item.lines.map(line=><View key={line.productId+'::'+(line.variantId||'')}><Text style={{color:'#DDD'}}>{line.productName} × {line.quantity} — ثمن الوحدة DH</Text><TextInput value={prices[String(line.productId)+'::'+(line.variantId||'')]||''} onChangeText={value=>setPrices(current=>({...current,[String(line.productId)+'::'+(line.variantId||'')]:value}))} keyboardType="decimal-pad" placeholder="ثمن المورد بالدرهم" placeholderTextColor="#888" style={input}/></View>)}{action('حفظ عرض الأثمان',saveOffer)}</View>:null}
   {item.status==='quoted'?<View style={{flexDirection:'row',gap:8}}>{action('قبول العرض',()=>{try{onUpdate(transitionSupplierPriceRequest(item,'accepted'));}catch{}},'#4D9D82')}{action('رفض العرض',()=>{try{onUpdate(transitionSupplierPriceRequest(item,'rejected'));}catch{}},'#E28A78')}</View>:null}
  </View>)}
  {requests.length===0?<Text style={{color:'#888',padding:12}}>مازال ما كاين حتى طلب أثمان.</Text>:null}
  <Text style={{color:gold,fontWeight:'900',fontSize:17,marginVertical:10}}>مقارنة أثمان الموردين</Text>
  {comparisons.map((row,index)=><View key={row.requestId+'-'+row.productId+'-'+(row.variantId||'')} style={[panel,{flexDirection:'row',alignItems:'center'}]}><View style={{flex:1}}><Text style={{color:'#FFF',fontWeight:'800'}}>{row.productName}</Text><Text style={{color:'#AAA',marginTop:3}}>{row.supplierName} • كمية {row.quantity}{row.leadTimeDays===undefined?'':' • التسليم '+row.leadTimeDays+' يوم'}</Text></View><Text style={{color:index===0?gold:'#FFF',fontWeight:'900'}}>{(row.unitCostCentimes/100).toFixed(2)} DH</Text></View>)}
  {comparisons.length===0?<Text style={{color:'#888',padding:12}}>سجل عروض الموردين باش تبان المقارنة.</Text>:null}

  <View style={panel}>
   <Text style={{color:gold,fontSize:18,fontWeight:'900',marginBottom:8}}>تسجيل فاتورة المورد</Text>
   <Text style={{color:'#AAA',marginBottom:8}}>الفاتورة كتترابط بالكميات المستلمة من أمر الشراء، وما كتزيدش المخزون مرة ثانية.</Text>
   {purchaseOrders.filter(order=>order.status==='partially_received'||order.status==='received').map(order=><AccessiblePressable key={order.id} accessibilityState={{selected:selectedOrderId===String(order.id)}} onPress={()=>{setSelectedOrderId(String(order.id));setInvoiceUnitCosts(Object.fromEntries(order.lines.map(line=>[line.productId+'::'+(line.variantId||''),String(line.unitCost)])));}} style={{padding:10,borderRadius:8,borderWidth:1,borderColor:selectedOrderId===String(order.id)?gold:'#444',marginBottom:6}}><Text style={{color:'#FFF',fontWeight:'800'}}>BC-{order.id} • {order.supplierName}</Text><Text style={{color:'#AAA',marginTop:3}}>{order.status==='received'?'مستلم بالكامل':'استلام جزئي'} • {order.lines.reduce((sum,line)=>sum+line.receivedQuantity,0)} وحدة مستلمة</Text></AccessiblePressable>)}
   <TextInput value={invoiceNumber} onChangeText={setInvoiceNumber} placeholder="رقم فاتورة المورد" placeholderTextColor="#888" style={input}/>
   <TextInput value={invoiceDueDate} onChangeText={setInvoiceDueDate} placeholder="تاريخ الاستحقاق YYYY-MM-DD (اختياري)" placeholderTextColor="#888" style={input}/>
   {purchaseOrders.find(order=>String(order.id)===selectedOrderId)?.lines.map(line=>{
    const key=line.productId+'::'+(line.variantId||'');
    const billed=invoices.filter(invoice=>invoice.purchaseOrderId===Number(selectedOrderId)).flatMap(invoice=>invoice.lines).filter(item=>item.productId===line.productId&&(item.variantId||'')===(line.variantId||'')).reduce((sum,item)=>sum+item.quantity,0);
    const remaining=line.receivedQuantity-billed;
    return remaining>0?<View key={key} style={{marginBottom:8}}><Text style={{color:'#DDD',marginBottom:4}}>{line.productName} • باقي للفوترة {remaining} • ثمن الوحدة DH</Text><TextInput value={invoiceUnitCosts[key]??String(line.unitCost)} onChangeText={value=>setInvoiceUnitCosts(current=>({...current,[key]:value}))} keyboardType="decimal-pad" placeholder="ثمن الفاتورة بالدرهم" placeholderTextColor="#888" style={input}/></View>:null;
   })}
   {selectedOrderId?action('تسجيل فاتورة الكميات المستلمة',()=>{
    const order=purchaseOrders.find(item=>String(item.id)===selectedOrderId);
    const supplier=order&&(order.supplierId?suppliers.find(item=>String(item.id)===order.supplierId):suppliers.find(item=>item.name===order.supplierName));
    if(!order||!supplier){Alert.alert('المورد غير موجود','راجع المورد المرتبط بأمر الشراء.');return;}
    const receivedOrder={id:order.id,supplierId:String(supplier.id),status:order.status,lines:order.lines.map(line=>({productId:line.productId,variantId:line.variantId,productName:line.productName,quantity:line.quantity,receivedQuantity:line.receivedQuantity}))};
    const already=invoices.filter(invoice=>invoice.purchaseOrderId===order.id);
    const billed=new Map<string,number>();
    for(const invoice of already)for(const line of invoice.lines){const key=line.productId+'::'+(line.variantId||'');billed.set(key,(billed.get(key)||0)+line.quantity);}
    const invoiceLines=order.lines.map(line=>{const key=line.productId+'::'+(line.variantId||'');const quantity=line.receivedQuantity-(billed.get(key)||0);return quantity>0?{productId:line.productId,variantId:line.variantId,description:line.productName+(line.variantLabel?' • '+line.variantLabel:''),quantity,unitCostCentimes:(()=>{const raw=(invoiceUnitCosts[key]??String(line.unitCost)).trim().replace(',','.');const cost=Number(raw);if(!raw||!Number.isFinite(cost)||cost<0)throw new Error('دخل ثمن فاتورة صحيح لكل منتج.');return Math.round(cost*100);})()}:null;}).filter((line):line is NonNullable<typeof line>=>line!==null);
    try{
     const invoice=createSupplierInvoice({id:'supplier-invoice-'+Date.now(),number:invoiceNumber.trim()||'FA-'+Date.now(),supplierId:String(supplier.id),purchaseOrder:receivedOrder,issuedAt:new Date().toISOString(),dueDate:invoiceDueDate.trim()||undefined,lines:invoiceLines,previousInvoices:invoices});
     onSaveInvoice(invoice);setInvoiceNumber('');setInvoiceDueDate('');Alert.alert('تم تسجيل فاتورة المورد','تسجلات الفاتورة بلا ما يتعاود تحديث المخزون.');
    }catch(error){Alert.alert('تعذر تسجيل فاتورة المورد',error instanceof Error?error.message:'راجع بيانات الفاتورة.');}
   }):null}
  </View>
  <Text style={{color:gold,fontWeight:'900',fontSize:17,marginVertical:10}}>فواتير الموردين ({invoices.length})</Text>
undefined
  {invoices.length===0?<Text style={{color:'#888',padding:12}}>مازال ما تسجلات حتى فاتورة مورد.</Text>:null}
  {invoices.length>0?<View style={panel}><Text style={{color:gold,fontSize:17,fontWeight:'900',marginBottom:8}}>أداءات فواتير الموردين</Text>
   {invoices.map(invoice=>{const payments=invoicePayments.filter(item=>item.invoiceId===invoice.id);const summary=summarizeSupplierInvoicePayments(invoice,payments);return <View key={'pay-'+invoice.id} style={{paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#333'}}><AccessiblePressable accessibilityState={{selected:paymentInvoiceId===invoice.id}} onPress={()=>setPaymentInvoiceId(invoice.id)}><Text style={{color:'#FFF',fontWeight:'800'}}>{invoice.number} • {summary.status==='paid'?'مخلصة':summary.status==='partial'?'أداء جزئي':'غير مخلصة'}</Text><Text style={{color:'#AAA'}}>المجموع {(summary.totalCentimes/100).toFixed(2)} DH • المؤدى {(summary.paidCentimes/100).toFixed(2)} DH • الباقي {(summary.outstandingCentimes/100).toFixed(2)} DH</Text></AccessiblePressable>{payments.map(payment=><View key={payment.id} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:4}}><Text style={{color:'#BBB'}}>{(payment.amountCentimes/100).toFixed(2)} DH • {payment.date.slice(0,10)} • {payment.method}</Text><AccessiblePressable onPress={()=>onReverseInvoicePayment(payment.id)}><Text style={{color:'#E28A78'}}>عكس الأداء</Text></AccessiblePressable></View>)}</View>;})}
   <TextInput value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" placeholder="مبلغ الأداء DH" placeholderTextColor="#888" style={input}/>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{(['cash','bank','cheque'] as const).map(method=><AccessiblePressable key={method} accessibilityState={{selected:paymentMethod===method}} onPress={()=>setPaymentMethod(method)} style={{padding:9,borderWidth:1,borderColor:paymentMethod===method?gold:'#444',borderRadius:8}}><Text style={{color:'#FFF'}}>{method==='cash'?'نقداً':method==='bank'?'تحويل بنكي':'شيك'}</Text></AccessiblePressable>)}</View>
   {paymentMethod==='bank'?<Text style={{color:'#AAA',marginTop:6}}>الحساب البنكي النشط: {activeBankAccountName||'ما محددش'}</Text>:null}
   {paymentMethod==='cheque'?<TextInput value={paymentReference} onChangeText={setPaymentReference} placeholder="مرجع الشيك" placeholderTextColor="#888" style={input}/>:null}
   {action('تسجيل الأداء على الفاتورة المختارة',()=>{const invoice=invoices.find(item=>item.id===paymentInvoiceId);const raw=paymentAmount.trim().replace(',','.');const amount=Number(raw);if(!invoice||!raw||!Number.isFinite(amount)||amount<=0){Alert.alert('معلومات ناقصة','اختار فاتورة ودخل مبلغ أداء صحيح.');return;}onAddInvoicePayment(invoice,{id:'supplier-invoice-payment-'+Date.now(),amountCentimes:Math.round(amount*100),date:new Date().toISOString(),method:paymentMethod,reference:paymentReference.trim()||undefined});setPaymentAmount('');setPaymentReference('');})}
  </View>:null}

 </ScrollView>;
}
