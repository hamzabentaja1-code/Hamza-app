import React, {useContext, useEffect, useMemo, useState} from 'react';
import {Alert, Image, Text as NativeText, TextInput as NativeTextInput, View} from 'react-native';
import {addPosLine, emptyPosCart, findPosProduct, PosCart, PosProduct, posTotals, validateCheckout} from './pos';
import {AppLanguage, LanguageContext, TText as Text, TTextInput as TextInput, translateText} from './i18n';
import AccessiblePressable from './AccessiblePressable';
const Pressable = AccessiblePressable;

type Product = {id:number; name:string; price:number; qty:number; photoData?:string; kind?:'product'|'service';reference?:string;barcode?:string};
type ProductVariant = {id:string;productId:number;attributes:Record<string,string>;stockQty:number;costPriceCentimes?:number;salePriceCentimes?:number;active:boolean};
type Customer = {id:number; name:string};
type ParkedCart = {id:string;createdAt:string;cart:PosCart};
type CheckoutLine = {productId:number; variantId?:string; name:string; quantity:number; unitPrice:number; discount:number};
type Props = {
  products: Product[];
  customers: Customer[];
  variants: ProductVariant[];
  bankAccountName?: string;
  parkedCarts: ParkedCart[];
  onPark: (cart:PosCart)=>void;
  onResume: (id:string)=>PosCart|undefined;
  onDeleteParked: (id:string)=>void;
  onCheckout: (data:{customerName:string; lines:CheckoutLine[]; paymentMethod:'cash'|'card'|'transfer'; total:number})=>boolean|void;
  onScanBarcode:()=>void;
  scannedBarcode:string;
  onBarcodeConsumed:()=>void;
};
const GOLD='#D6AE55';
const money=(value:number)=>value.toFixed(2)+' DH';

export default function PosWorkspace({products,customers,variants,bankAccountName,parkedCarts,onPark,onResume,onDeleteParked,onCheckout,onScanBarcode,scannedBarcode,onBarcodeConsumed}:Props){
  const language:AppLanguage=useContext(LanguageContext);
 const showAlert = (...args: Parameters<typeof Alert.alert>) => {
  const [title, message, buttons, options] = args;
  const translatedButtons = buttons?.map(button => ({
   ...button,
   text: button.text ? (translateText(button.text, language) || button.text) : button.text,
  }));
  Alert.alert(translateText(title, language) || title, translateText(message, language) || message, translatedButtons, options);
 };

  const [term,setTerm]=useState('');
  const [customerId,setCustomerId]=useState('');
  const [method,setMethod]=useState<'cash'|'card'|'transfer'>('cash');
  const [discountText,setDiscountText]=useState('0');
  const [cart,setCart]=useState<PosCart>(emptyPosCart());
  const mapped:PosProduct[]=useMemo(()=>products.flatMap(p=>{const allVariants=variants.filter(v=>v.productId===p.id);const variantsForProduct=allVariants.filter(v=>v.active);if(!allVariants.length)return [{id:String(p.id),productId:p.id,name:p.name,reference:p.reference,barcode:p.barcode,salePrice:p.price,stock:p.qty,trackStock:p.kind!=='service'}];if(!variantsForProduct.length)return [];return variantsForProduct.map(v=>({id:String(p.id)+'::'+v.id,productId:p.id,variantId:v.id,variantLabel:Object.values(v.attributes).join(' / '),name:p.name+' • '+Object.values(v.attributes).join(' / '),reference:p.reference,barcode:p.barcode,salePrice:v.salePriceCentimes===undefined?p.price:v.salePriceCentimes/100,stock:v.stockQty,trackStock:true}));}),[products,variants]);
  const matches=useMemo(()=>{const q=term.trim().toLocaleLowerCase();if(!q)return [];return mapped.filter(p=>p.name.toLocaleLowerCase().includes(q)||p.barcode?.toLocaleLowerCase()===q||p.reference?.toLocaleLowerCase()===q).slice(0,8);},[mapped,term]);
  const discount=Number(discountText.replace(',','.'));
  const currentCart:PosCart={...cart,customerId:customerId||undefined,paymentMethod:method,globalDiscount:Number.isFinite(discount)?Math.max(0,discount):0,paidAmount:0};
  const totals=posTotals(currentCart);
  const add=(p:PosProduct)=>{try{setCart(old=>addPosLine(old,p));setTerm('');}catch(e){showAlert('المخزون غير كافٍ',e instanceof Error?e.message:'تعذر إضافة المنتج');}};
  useEffect(()=>{if(!scannedBarcode)return;const found=findPosProduct(mapped,scannedBarcode);if(found)add(found);else setTerm(scannedBarcode);onBarcodeConsumed();},[scannedBarcode,mapped]);
  const changeQty=(productId:string,delta:number)=>{setCart(old=>({...old,lines:old.lines.map(line=>line.productId===productId?{...line,quantity:line.quantity+delta}:line).filter(line=>line.quantity>0)}));};
  const remove=(productId:string)=>setCart(old=>({...old,lines:old.lines.filter(line=>line.productId!==productId)}));
  const park=()=>{if(!currentCart.lines.length){showAlert('السلة فارغة','زيد منتجاً واحداً على الأقل قبل تعليق البيع.');return;}onPark(currentCart);setCart(emptyPosCart());setDiscountText('0');setCustomerId('');setMethod('cash');};
  const resume=(id:string)=>{const saved=onResume(id);if(!saved)return;setCart(saved);setCustomerId(saved.customerId||'');setMethod(saved.paymentMethod==='card'||saved.paymentMethod==='transfer'?saved.paymentMethod:'cash');setDiscountText(String(saved.globalDiscount||0));};
  const checkout=()=>{
    if(!Number.isFinite(discount)||discount<0){showAlert('تخفيض غير صالح','دخل تخفيض صحيح.');return;}
    const validation=validateCheckout({...currentCart,paidAmount:totals.total});
    if(validation.length){showAlert('راجع السلة',validation.join('\n'));return;}
    const lines:CheckoutLine[]=currentCart.lines.map(line=>({productId:line.sourceProductId??Number(line.productId),variantId:line.variantId,name:line.name,quantity:line.quantity,unitPrice:line.unitPrice,discount:line.discount}));
    const name=customers.find(c=>String(c.id)===customerId)?.name||'زبون عابر';
    showAlert('تأكيد البيع',`المجموع ${money(totals.total)}\nالزبون: ${name}\nطريقة الأداء: ${method==='cash'?'نقداً':method==='card'?'بطاقة':'تحويل'}`,[
      {text:'رجوع',style:'cancel'},
      {text:'تأكيد',onPress:()=>{const accepted=onCheckout({customerName:name,lines,paymentMethod:method,total:totals.total});if(accepted===false)return;setCart(emptyPosCart());setDiscountText('0');setCustomerId('');}}
    ]);
  };
  return <View style={{gap:12}}>
    <View style={{backgroundColor:'#211D14',borderColor:'#5D4A25',borderWidth:1,borderRadius:14,padding:14}}>
      <Text style={{color:GOLD,fontSize:19,fontWeight:'900'}}>نقطة البيع POS</Text>
      <Text style={{color:'#DDD',marginTop:5}}>قلب على المنتج بالاسم، زيدو للسلة، وكمّل البيع.</Text>
    </View>
    <View style={{backgroundColor:'#1B1B1B',padding:14,borderRadius:12,borderWidth:1,borderColor:'#444'}}>
      <Text style={{color:'#FFF',fontWeight:'800',marginBottom:8}}>البحث عن منتج</Text>
      <View style={{flexDirection:'row',gap:8,alignItems:'center'}}><TextInput value={term} onChangeText={setTerm} placeholder="اسم المنتج أو الباركود..." placeholderTextColor="#888" style={{flex:1,backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:9,padding:12,color:'#FFF',textAlign:'right'}}/><Pressable accessibilityLabel="مسح باركود المنتج" onPress={onScanBarcode} style={{backgroundColor:'#302819',borderWidth:1,borderColor:GOLD,borderRadius:9,padding:12}}><Text style={{color:GOLD,fontWeight:'900'}}>▦ مسح</Text></Pressable></View>
      {matches.map(p=><Pressable key={p.id} onPress={()=>add(p)} style={{padding:11,borderBottomWidth:1,borderBottomColor:'#333',flexDirection:'row',alignItems:'center',gap:10}}>
        <View style={{flex:1}}><Text style={{color:'#FFF',fontWeight:'700'}}>{p.name}</Text><Text style={{color:'#AAA',fontSize:12}}>{p.trackStock?'المتوفر: '+p.stock:'خدمة بدون مخزون'} • {money(p.salePrice)}</Text></View>
        <Text style={{color:GOLD,fontWeight:'900'}}>+ أضف</Text>
      </Pressable>)}
      {!!term.trim()&&matches.length===0&&<Text style={{color:'#999',padding:10}}>ما لقيناش منتج بهاد الاسم.</Text>}
      {products.length===0&&<Text style={{color:'#999',padding:10}}>زيد المنتجات أولاً من قسم المنتجات.</Text>}{products.length>0&&mapped.length===0&&<Text style={{color:'#999',padding:10}}>ما كايناش منتجات أو نسخ نشطة للبيع.</Text>}
    </View>
    {parkedCarts.length>0?<View style={{backgroundColor:'#1B1B1B',padding:14,borderRadius:12,borderWidth:1,borderColor:'#6A542A'}}>
      <Text style={{color:GOLD,fontSize:16,fontWeight:'800',marginBottom:8}}>المبيعات المعلقة ({parkedCarts.length})</Text>
      {parkedCarts.map(item=>{const total=posTotals({...item.cart,paidAmount:0}).total;const customer=customers.find(c=>String(c.id)===item.cart.customerId)?.name||'زبون عابر';return <View key={item.id} style={{paddingVertical:9,borderBottomWidth:1,borderBottomColor:'#333',gap:6}}>
        <Text style={{color:'#FFF',fontWeight:'700'}}>{customer} • {item.cart.lines.length} منتجات • {money(total)}</Text>
        <Text style={{color:'#999',fontSize:12}}>{new Date(item.createdAt).toLocaleString(language==='FR'?'fr-MA':'ar-MA')}</Text>
        <View style={{flexDirection:'row',gap:8}}><Pressable onPress={()=>resume(item.id)} style={{backgroundColor:GOLD,padding:9,borderRadius:7,flex:1,alignItems:'center'}}><Text style={{color:'#151515',fontWeight:'800'}}>استرجاع البيع</Text></Pressable><Pressable onPress={()=>showAlert('حذف البيع المعلق؟','غادي يتحذف هاد البيع المعلق فقط.',[{text:'رجوع',style:'cancel'},{text:'حذف',style:'destructive',onPress:()=>onDeleteParked(item.id)}])} style={{borderWidth:1,borderColor:'#A44',padding:9,borderRadius:7}}><Text style={{color:'#E28A78'}}>حذف</Text></Pressable></View>
      </View>;})}
    </View>:null}
    <View style={{backgroundColor:'#1B1B1B',padding:14,borderRadius:12,borderWidth:1,borderColor:'#444'}}>
      <Text style={{color:GOLD,fontSize:17,fontWeight:'800',marginBottom:10}}>سلة البيع ({cart.lines.length})</Text>
      {cart.lines.length===0?<Text style={{color:'#999',textAlign:'center',padding:14}}>السلة فارغة. قلب على منتج وزيدو.</Text>:cart.lines.map(line=>{
        const product=products.find(p=>p.id===line.sourceProductId)||products.find(p=>String(p.id)===line.productId);
        return <View key={line.productId} style={{paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#333',flexDirection:'row',alignItems:'center',gap:8}}>
          {product?.photoData?<Image source={{uri:product.photoData}} style={{width:42,height:42,borderRadius:7}}/>:null}
          <View style={{flex:1}}><Text style={{color:'#FFF',fontWeight:'700'}}>{line.name}</Text><Text style={{color:'#AAA',fontSize:12}}>{money(line.unitPrice)} × {line.quantity}</Text></View>
          <Pressable accessibilityLabel={language==='AR'?'إنقاص كمية '+line.name:'Diminuer la quantité de '+line.name} onPress={()=>changeQty(line.productId,-1)} style={{padding:7}}><Text style={{color:GOLD,fontSize:18}}>−</Text></Pressable>
          <Text style={{color:'#FFF'}}>{line.quantity}</Text>
          <Pressable accessibilityLabel={language==='AR'?'زيادة كمية '+line.name:'Augmenter la quantité de '+line.name} onPress={()=>{const p=mapped.find(x=>x.id===line.productId);if(p)add(p);}} style={{padding:7}}><Text style={{color:GOLD,fontSize:18}}>+</Text></Pressable>
          <Pressable accessibilityLabel={language==='AR'?'حذف '+line.name:'Supprimer '+line.name} accessibilityHint={language==='AR'?'إزالة هذا المنتج من سلة البيع':'Retirer ce produit du panier'} onPress={()=>remove(line.productId)} style={{padding:5}}><Text style={{color:'#E28A78'}}>حذف</Text></Pressable>
        </View>;
      })}
      <Text style={{color:'#CCC',marginTop:12,marginBottom:6}}>الزبون</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
        <Pressable accessibilityState={{selected:customerId===''}} onPress={()=>setCustomerId('')} style={{borderWidth:1,borderColor:customerId===''?GOLD:'#444',borderRadius:8,padding:9}}><Text style={{color:'#FFF'}}>زبون عابر</Text></Pressable>
        {customers.map(c=><Pressable key={c.id} accessibilityState={{selected:customerId===String(c.id)}} onPress={()=>setCustomerId(String(c.id))} style={{borderWidth:1,borderColor:customerId===String(c.id)?GOLD:'#444',borderRadius:8,padding:9}}><Text style={{color:'#FFF'}}>{c.name}</Text></Pressable>)}
      </View>
      <Text style={{color:'#CCC',marginTop:12,marginBottom:6}}>طريقة الأداء</Text>
      <View style={{flexDirection:'row',gap:7}}>
        {([{id:'cash',label:'نقداً'},{id:'card',label:'بطاقة'},{id:'transfer',label:'تحويل'}] as const).map(m=><Pressable key={m.id} accessibilityState={{selected:method===m.id}} onPress={()=>setMethod(m.id)} style={{flex:1,borderWidth:1,borderColor:method===m.id?GOLD:'#444',borderRadius:8,padding:10,alignItems:'center'}}><Text style={{color:'#FFF'}}>{m.label}</Text></Pressable>)}
      </View>
      {method!=='cash'&&<Text style={{color:bankAccountName?'#D6AE55':'#E28A78',fontSize:12,marginTop:6}}>{bankAccountName?'الحساب البنكي الذي سيستقبل الأداء: '+bankAccountName:'ما تختارش حساب بنكي. دخل لقسم الحسابات البنكية واختار الحساب أولاً.'}</Text>}
      <TextInput value={discountText} onChangeText={setDiscountText} keyboardType="decimal-pad" placeholder="تخفيض عام (DH)" placeholderTextColor="#888" style={{backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:9,padding:12,color:'#FFF',marginTop:12,textAlign:'right'}}/>
      <View style={{backgroundColor:'#111',borderRadius:9,padding:12,marginTop:10,gap:6}}>
        <Text style={{color:'#DDD'}}>المجموع قبل التخفيض: {money(totals.subtotal)}</Text>
        <Text style={{color:'#DDD'}}>التخفيض: {money(totals.discount)}</Text>
        <Text style={{color:GOLD,fontWeight:'900',fontSize:21}}>المجموع النهائي: {money(totals.total)}</Text>
      </View>
      <Pressable onPress={park} disabled={!cart.lines.length} style={{backgroundColor:cart.lines.length?'#302819':'#333',borderWidth:1,borderColor:'#8B6D31',borderRadius:9,padding:12,alignItems:'center',marginTop:10}}><Text style={{color:GOLD,fontWeight:'900'}}>تعليق البيع والرجوع لاحقاً</Text></Pressable>
      <Pressable onPress={checkout} disabled={!cart.lines.length} style={{backgroundColor:cart.lines.length?GOLD:'#555',borderRadius:9,padding:14,alignItems:'center',marginTop:12}}><Text style={{color:'#151515',fontWeight:'900'}}>تأكيد البيع</Text></Pressable>
    </View>
  </View>;
}
