import React,{useMemo,useState} from 'react';
import {ScrollView,View,Alert} from 'react-native';
import {TText as Text,TTextInput as TextInput} from './i18n';
import AccessiblePressable from './AccessiblePressable';
import {SupplierPriceRequest,createSupplierPriceRequest,transitionSupplierPriceRequest,recordSupplierPriceOffer,compareSupplierOffers} from './domain/supplier-procurement';
type Supplier={id:number;name:string};
type Product={id:number;name:string;reference?:string;barcode?:string;kind?:string};
type Variant={id:string;productId:number;attributes:Record<string,string>;active:boolean};
type Props={suppliers:Supplier[];products:Product[];variants:Variant[];requests:SupplierPriceRequest[];onSave:(item:SupplierPriceRequest)=>void;onUpdate:(item:SupplierPriceRequest)=>void};
const gold='#D4AF62',panel={backgroundColor:'#1B1B1B',borderRadius:12,borderWidth:1,borderColor:'#383838',padding:13,marginBottom:12} as const;
const input={backgroundColor:'#111',borderWidth:1,borderColor:'#3A3A3A',borderRadius:8,padding:10,color:'#FFF',marginBottom:8} as const;
export default function SupplierProcurementWorkspace({suppliers,products,variants,requests,onSave,onUpdate}:Props){
 const [supplierId,setSupplierId]=useState('');
 const [productId,setProductId]=useState('');
 const [variantId,setVariantId]=useState('');
 const [quantity,setQuantity]=useState('1');
 const [lines,setLines]=useState<Array<{productId:number;variantId?:string;productName:string;quantity:number}>>([]);
 const [selectedId,setSelectedId]=useState('');
 const [prices,setPrices]=useState<Record<string,string>>({});
 const [validUntil,setValidUntil]=useState('');
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
   const offerLines=selected.lines.map(line=>{const raw=(prices[String(line.productId)]||'').trim().replace(',','.');const value=Number(raw);if(!raw||!Number.isFinite(value)||value<0)throw new Error('دخل ثمن صحيح لكل منتج.');return {productId:line.productId,variantId:line.variantId,unitCostCentimes:Math.round(value*100)};});
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
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{products.filter(item=>item.kind!=='service').map(item=><AccessiblePressable key={item.id} accessibilityState={{selected:productId===String(item.id)}} onPress={()=>setProductId(String(item.id))} style={{padding:8,borderRadius:8,borderWidth:1,borderColor:productId===String(item.id)?gold:'#444'}}><Text style={{color:'#FFF'}}>{item.name}</Text></AccessiblePressable>)}</View>
   {productId&&variants.some(item=>item.productId===Number(productId)&&item.active)?<View style={{marginTop:8}}><Text style={{color:'#CCC',marginBottom:6}}>اختار النسخة</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{variants.filter(item=>item.productId===Number(productId)&&item.active).map(item=><AccessiblePressable key={item.id} accessibilityState={{selected:variantId===item.id}} onPress={()=>setVariantId(item.id)} style={{padding:8,borderRadius:8,borderWidth:1,borderColor:variantId===item.id?gold:'#444'}}><Text style={{color:'#FFF'}}>{Object.values(item.attributes).join(' / ')}</Text></AccessiblePressable>)}</View></View>:null}
   <View style={{flexDirection:'row',gap:8,marginTop:8}}><TextInput value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder="الكمية" placeholderTextColor="#888" style={[input,{flex:1}]}/><AccessiblePressable onPress={addLine} style={{padding:11,backgroundColor:gold,borderRadius:8,justifyContent:'center'}}><Text style={{color:'#111',fontWeight:'900'}}>إضافة</Text></AccessiblePressable></View>
   {lines.map(line=><View key={line.productId} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:6}}><Text style={{color:'#FFF'}}>{line.productName} × {line.quantity}</Text><AccessiblePressable onPress={()=>setLines(current=>current.filter(item=>item.productId!==line.productId||(item.variantId||'')!==(line.variantId||'')))}><Text style={{color:'#E28A78'}}>حذف</Text></AccessiblePressable></View>)}
   <TextInput value={validUntil} onChangeText={setValidUntil} placeholder="آخر أجل للرد YYYY-MM-DD (اختياري)" placeholderTextColor="#888" style={input}/>
   {action('إنشاء طلب عرض الثمن',createRequest)}
  </View>
  <Text style={{color:gold,fontWeight:'900',fontSize:17,marginBottom:9}}>طلبات الأثمان ({requests.length})</Text>
  {requests.map(item=><View key={item.id} style={panel}>
   <AccessiblePressable onPress={()=>setSelectedId(selectedId===item.id?'':item.id)}><Text style={{color:'#FFF',fontWeight:'900'}}>{item.number} • {item.supplierName}</Text><Text style={{color:'#AAA',marginTop:4}}>{item.createdAt.slice(0,10)} • {item.status==='draft'?'مسودة':item.status==='sent'?'مرسل':item.status==='quoted'?'توصلنا بالثمن':item.status==='accepted'?'مقبول':item.status==='rejected'?'مرفوض':'ملغى'}</Text><Text style={{color:'#CCC',marginTop:5}}>{item.lines.map(line=>line.productName+' × '+line.quantity).join(' • ')}</Text></AccessiblePressable>
   {item.status==='draft'?action('تأكيد إرسال الطلب',()=>{try{onUpdate(transitionSupplierPriceRequest(item,'sent'));}catch{}}):null}
   {(item.status==='sent'||item.status==='quoted')&&<AccessiblePressable onPress={()=>setSelectedId(selectedId===item.id?'':item.id)} style={{padding:8,marginTop:5}}><Text style={{color:gold}}>تسجيل أو تعديل عرض المورد</Text></AccessiblePressable>}
   {selectedId===item.id&&(item.status==='sent'||item.status==='quoted')?<View style={{marginTop:8}}>{item.lines.map(line=><View key={line.productId+'::'+(line.variantId||'')}><Text style={{color:'#DDD'}}>{line.productName} × {line.quantity} — ثمن الوحدة DH</Text><TextInput value={prices[String(line.productId)]||''} onChangeText={value=>setPrices(current=>({...current,[String(line.productId)]:value}))} keyboardType="decimal-pad" placeholder="ثمن المورد بالدرهم" placeholderTextColor="#888" style={input}/></View>)}{action('حفظ عرض الأثمان',saveOffer)}</View>:null}
   {item.status==='quoted'?<View style={{flexDirection:'row',gap:8}}>{action('قبول العرض',()=>{try{onUpdate(transitionSupplierPriceRequest(item,'accepted'));}catch{}},'#4D9D82')}{action('رفض العرض',()=>{try{onUpdate(transitionSupplierPriceRequest(item,'rejected'));}catch{}},'#E28A78')}</View>:null}
  </View>)}
  {requests.length===0?<Text style={{color:'#888',padding:12}}>مازال ما كاين حتى طلب أثمان.</Text>:null}
  <Text style={{color:gold,fontWeight:'900',fontSize:17,marginVertical:10}}>مقارنة أثمان الموردين</Text>
  {comparisons.map((row,index)=><View key={row.requestId+'-'+row.productId+'-'+(row.variantId||'')} style={[panel,{flexDirection:'row',alignItems:'center'}]}><View style={{flex:1}}><Text style={{color:'#FFF',fontWeight:'800'}}>{row.productName}</Text><Text style={{color:'#AAA',marginTop:3}}>{row.supplierName} • كمية {row.quantity}{row.leadTimeDays===undefined?'':' • التسليم '+row.leadTimeDays+' يوم'}</Text></View><Text style={{color:index===0?gold:'#FFF',fontWeight:'900'}}>{(row.unitCostCentimes/100).toFixed(2)} DH</Text></View>)}
  {comparisons.length===0?<Text style={{color:'#888',padding:12}}>سجل عروض الموردين باش تبان المقارنة.</Text>:null}
 </ScrollView>;
}
