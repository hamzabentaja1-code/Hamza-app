import React, {useContext, useMemo, useState} from 'react';
import {Alert, View, StyleSheet} from 'react-native';
import {TText as Text, TTextInput as TextInput, LanguageContext, translateText} from './i18n';
import AccessiblePressable from './AccessiblePressable';
import {ProductVariant, VariantStockMovement, totalVariantStock} from './domain/variant-stock';

type Product={id:number;name:string;kind?:'product'|'service'};
type Props={products:Product[];variants:ProductVariant[];movements:VariantStockMovement[];onAdd:(variant:ProductVariant)=>boolean;onMovement:(movement:VariantStockMovement)=>boolean;onToggle:(id:string,active:boolean)=>void};
const gold='#D6AE55';
export default function VariantWorkspace({products,variants,movements,onAdd,onMovement,onToggle}:Props){
 const lang=useContext(LanguageContext);const t=(v:string)=>translateText(v,lang)||v;
 const [productId,setProductId]=useState('');const [size,setSize]=useState('');const [color,setColor]=useState('');const [sku,setSku]=useState('');const [barcode,setBarcode]=useState('');const [qty,setQty]=useState('0');const [cost,setCost]=useState('');const [price,setPrice]=useState('');
 const [selected,setSelected]=useState('');const [delta,setDelta]=useState('1');const [countedQty,setCountedQty]=useState('');const [kind,setKind]=useState<VariantStockMovement['kind']>('adjustment');const [note,setNote]=useState('');
 const goods=products.filter(p=>p.kind!=='service');const active=variants.filter(v=>v.active);const selectedVariant=variants.find(v=>v.id===selected);
 const create=()=>{const product=products.find(p=>String(p.id)===productId);const stock=Number(qty),c=cost===''?undefined:Math.round(Number(cost.replace(',','.'))*100),p=price===''?undefined:Math.round(Number(price.replace(',','.'))*100);
  if(!product||!size.trim()&&!color.trim()||!Number.isSafeInteger(stock)||stock<0||c!==undefined&&(!Number.isSafeInteger(c)||c<0)||p!==undefined&&(!Number.isSafeInteger(p)||p<0)){Alert.alert(t('بيانات النسخة غير صالحة'),t('اختار المنتج وأدخل خاصية واحدة على الأقل وأرقام صحيحة.'));return;}
  const ok=onAdd({id:'variant-'+Date.now(),productId:product.id,sku:sku.trim()||undefined,barcode:barcode.trim()||undefined,attributes:{...(size.trim()?{المقاس:size.trim()}:{}),...(color.trim()?{اللون:color.trim()}:{})},stockQty:stock,costPriceCentimes:c,salePriceCentimes:p,active:true});
  if(ok){setSize('');setColor('');setSku('');setBarcode('');setQty('0');setCost('');setPrice('');}
 };
 const move=()=>{const amount=Number(delta);if(!selectedVariant||!Number.isSafeInteger(amount)||amount===0){Alert.alert(t('حركة غير صالحة'),t('اختار النسخة وأدخل كمية صحيحة غير صفرية.'));return;}
  const quantityDelta=['sale','return_out'].includes(kind)?-Math.abs(amount):kind==='adjustment'?amount:Math.abs(amount);
  if(onMovement({id:'variant-move-'+Date.now(),variantId:selectedVariant.id,kind,quantityDelta,date:new Date().toISOString().slice(0,10),note:note.trim()||undefined})){setDelta('1');setNote('');}
 };
 const count=()=>{const counted=Number(countedQty);if(!selectedVariant||!countedQty.trim()||!Number.isSafeInteger(counted)||counted<0){Alert.alert(t('جرد النسخة'),t('دخل الكمية الفعلية كعدد صحيح موجب أو صفر.'));return;}const difference=counted-selectedVariant.stockQty;if(difference===0){Alert.alert(t('الجرد مطابق'),t('الكمية الفعلية مطابقة للمخزون المسجل.'));setCountedQty('');return;}if(onMovement({id:'variant-stock-count-'+Date.now(),variantId:selectedVariant.id,kind:'stock_count',quantityDelta:difference,date:new Date().toISOString().slice(0,10),note:(note.trim()||'جرد النسخة')+' • الكمية الفعلية: '+counted})){setCountedQty('');setNote('');}};\n const money=(c?:number)=>c===undefined?'—':(c/100).toFixed(2)+' DH';
 return <View style={s.wrap}>
  <View style={s.panel}><Text style={s.title}>تنويعات المنتجات والمخزون</Text><Text style={s.muted}>سجل المقاسات والألوان والمرجع والباركود ومخزون كل نسخة بشكل مستقل.</Text>
   <Text style={s.label}>المنتج</Text><View style={s.choices}>{goods.map(p=><AccessiblePressable key={p.id} accessibilityRole="button" accessibilityState={{selected:productId===String(p.id)}} onPress={()=>setProductId(String(p.id))} style={[s.choice,productId===String(p.id)&&s.active]}><Text style={s.txt}>{p.name}</Text></AccessiblePressable>)}</View>
   <TextInput value={size} onChangeText={setSize} placeholder="المقاس (مثال: XL)" style={s.input}/>
   <TextInput value={color} onChangeText={setColor} placeholder="اللون (مثال: أسود)" style={s.input}/>
   <TextInput value={sku} onChangeText={setSku} placeholder="مرجع النسخة SKU (اختياري)" style={s.input}/>
   <TextInput value={barcode} onChangeText={setBarcode} placeholder="باركود النسخة (اختياري)" style={s.input}/>
   <TextInput value={qty} onChangeText={setQty} keyboardType="number-pad" placeholder="المخزون الافتتاحي" style={s.input}/>
   <TextInput value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="ثمن الشراء DH (اختياري)" style={s.input}/>
   <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="ثمن البيع DH (اختياري)" style={s.input}/>
   <AccessiblePressable accessibilityRole="button" onPress={create} style={s.action}><Text style={s.actionText}>إضافة النسخة</Text></AccessiblePressable>
  </View>
  <View style={s.panel}><Text style={s.title}>تعديل حركات المخزون</Text><View style={s.choices}>{(['adjustment','purchase','sale','return_in','return_out'] as VariantStockMovement['kind'][]).map(k=><AccessiblePressable key={k} accessibilityState={{selected:kind===k}} onPress={()=>setKind(k)} style={[s.choice,kind===k&&s.active]}><Text style={s.txt}>{({adjustment:'تسوية',purchase:'شراء',sale:'بيع',return_in:'مرتجع وارد',return_out:'مرتجع صادر',stock_count:'جرد'})[k]}</Text></AccessiblePressable>)}</View>
   <View style={s.choices}>{active.map(v=><AccessiblePressable key={v.id} accessibilityRole="button" accessibilityState={{selected:selected===v.id}} onPress={()=>setSelected(v.id)} style={[s.choice,selected===v.id&&s.active]}><Text style={s.txt}>{products.find(p=>p.id===v.productId)?.name||'منتج'} • {Object.values(v.attributes).join(' / ')} • {v.stockQty}</Text></AccessiblePressable>)}</View>
   <TextInput value={delta} onChangeText={setDelta} keyboardType="number-pad" placeholder="الكمية" style={s.input}/><TextInput value={note} onChangeText={setNote} placeholder="ملاحظة (اختياري)" style={s.input}/>
   <AccessiblePressable accessibilityRole="button" onPress={move} style={s.action}><Text style={s.actionText}>تسجيل حركة المخزون</Text></AccessiblePressable>\n   {selectedVariant?<View style={{borderTopWidth:1,borderTopColor:'#444',paddingTop:10,gap:7}}><Text style={s.label}>جرد النسخة</Text><Text style={s.muted}>المخزون الحالي: {selectedVariant.stockQty}</Text><TextInput value={countedQty} onChangeText={setCountedQty} keyboardType="number-pad" placeholder="الكمية الفعلية للنسخة" style={s.input}/><AccessiblePressable accessibilityRole="button" onPress={count} style={s.action}><Text style={s.actionText}>تسجيل الجرد وتحديث المخزون</Text></AccessiblePressable></View>:null>
  </View>
  <View style={s.panel}><Text style={s.title}>لائحة النسخ ({variants.length})</Text>
   {products.filter(p=>p.kind!=='service').map(p=>{const list=variants.filter(v=>v.productId===p.id);if(!list.length)return null;return <View key={p.id} style={s.product}><Text style={s.productTitle}>{p.name} — مجموع المخزون: {totalVariantStock(variants,p.id)}</Text>{list.map(v=><View key={v.id} style={s.line}><View style={{flex:1}}><Text style={s.txt}>{Object.entries(v.attributes).map(([k,val])=>k+': '+val).join(' • ')}</Text><Text style={s.muted}>SKU: {v.sku||'—'} • Barcode: {v.barcode||'—'} • المخزون: {v.stockQty}</Text><Text style={s.muted}>شراء: {money(v.costPriceCentimes)} • بيع: {money(v.salePriceCentimes)}</Text></View><AccessiblePressable accessibilityRole="button" onPress={()=>onToggle(v.id,!v.active)} style={s.small}><Text style={s.smallText}>{v.active?'تعطيل':'تفعيل'}</Text></AccessiblePressable></View>)}</View>})}
   <Text style={s.muted}>عدد حركات المخزون المسجلة: {movements.length}</Text>
   <Text style={s.productTitle}>سجل حركات النسخ</Text>
   {movements.slice(0,30).map(m=>{const v=variants.find(item=>item.id===m.variantId);const p=products.find(item=>item.id===v?.productId);return <View key={m.id} style={s.line}><View style={{flex:1}}><Text style={s.txt}>{p?.name||'منتج'} • {v?Object.values(v.attributes).join(' / '):m.variantId}</Text><Text style={s.muted}>{m.date} • {({opening:'رصيد افتتاحي',purchase:'شراء',sale:'بيع',return_in:'مرتجع وارد',return_out:'مرتجع صادر',adjustment:'تسوية',stock_count:'جرد'})[m.kind]} • {m.quantityDelta>0?'+':''}{m.quantityDelta}</Text>{m.note?<Text style={s.muted}>{m.note}</Text>:null}</View></View>;})}
   {movements.length===0?<Text style={s.muted}>مازال ما تسجلات حتى حركة للنسخ.</Text>:null}
  </View>
 </View>;
}
const s=StyleSheet.create({wrap:{gap:12},panel:{backgroundColor:'#1B1B1B',borderColor:'#444',borderWidth:1,borderRadius:13,padding:13,gap:9},title:{color:gold,fontSize:18,fontWeight:'900'},muted:{color:'#AAA',fontSize:12},label:{color:'#DDD',fontWeight:'700'},input:{backgroundColor:'#111',borderColor:'#444',borderWidth:1,borderRadius:8,padding:11,color:'#FFF',textAlign:'right'},choices:{flexDirection:'row',flexWrap:'wrap',gap:7},choice:{borderWidth:1,borderColor:'#555',borderRadius:8,padding:9},active:{borderColor:gold,backgroundColor:'#302817'},txt:{color:'#FFF'},action:{backgroundColor:gold,borderRadius:9,padding:13,alignItems:'center'},actionText:{color:'#151515',fontWeight:'900'},product:{borderTopWidth:1,borderTopColor:'#444',paddingTop:9,gap:7},productTitle:{color:'#FFF',fontWeight:'800'},line:{flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:1,borderBottomColor:'#333',paddingVertical:8},small:{borderWidth:1,borderColor:gold,borderRadius:7,padding:7},smallText:{color:gold,fontWeight:'700'}});
