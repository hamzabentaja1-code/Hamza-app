import React, {useMemo, useState} from 'react';
import {Alert, Image, Pressable, Text, TextInput, View} from 'react-native';
import {addPosLine, emptyPosCart, PosCart, PosProduct, posTotals, validateCheckout} from './pos';
import {translate, getLayoutDirection} from './i18n';
import VoiceInputButton from './VoiceInputButton';

type Product = {id:number; name:string; price:number; qty:number; reference?:string; barcode?:string; category?:string; photoData?:string};
type Customer = {id:number; name:string};
type CheckoutLine = {productId:number; name:string; quantity:number; unitPrice:number; discount:number};
export type ParkedPosSale = {id:string;cart:PosCart;customerId:string;method:'cash'|'card'|'transfer';discountText:string;createdAt:string};
type Props = {
  language: 'AR'|'FR';
  products: Product[];
  customers: Customer[];
  parkedSales: ParkedPosSale[];
  onParkedSalesChange: (sales:ParkedPosSale[])=>void;
  onCheckout: (data:{customerName:string; lines:CheckoutLine[]; paymentMethod:'cash'|'card'|'transfer'; total:number})=>boolean|void;
};
const GOLD='#D6AE55';
const money=(value:number)=>value.toFixed(2)+' DH';

export default function PosWorkspace({language,products,customers,parkedSales,onParkedSalesChange,onCheckout}:Props){
  const tr=(value:string)=>translate(language,value);
  const [term,setTerm]=useState('');
  const [category,setCategory]=useState('');
  const [availableOnly,setAvailableOnly]=useState(false);
  const [customerId,setCustomerId]=useState('');
  const [method,setMethod]=useState<'cash'|'card'|'transfer'>('cash');
  const [discountText,setDiscountText]=useState('0');
  const [cart,setCart]=useState<PosCart>(emptyPosCart());
  const mapped:PosProduct[]=useMemo(()=>products.map(p=>({id:String(p.id),name:p.name,reference:p.reference,barcode:p.barcode,salePrice:p.price,stock:p.qty,trackStock:true})),[products]);
  const categories=useMemo(()=>Array.from(new Set(products.map(p=>p.category?.trim()).filter((item):item is string=>!!item))),[products]);
  const matches=useMemo(()=>{const q=term.trim().toLocaleLowerCase();if(!q)return [];return products.filter(p=>(!category||p.category===category)&&(!availableOnly||p.qty>0)&&[p.name,p.reference||'',p.barcode||''].some(value=>value.toLocaleLowerCase().includes(q))).slice().sort((a,b)=>Number(b.barcode?.toLocaleLowerCase()===q||b.reference?.toLocaleLowerCase()===q)-Number(a.barcode?.toLocaleLowerCase()===q||a.reference?.toLocaleLowerCase()===q)).slice(0,8);},[products,term,category,availableOnly]);
  const discount=Number(discountText.replace(',','.'));
  const currentCart:PosCart={...cart,customerId:customerId||undefined,paymentMethod:method,globalDiscount:Number.isFinite(discount)?Math.max(0,discount):0,paidAmount:0};
  const totals=posTotals(currentCart);
  const add=(p:PosProduct)=>{try{setCart(old=>addPosLine(old,p));setTerm('');}catch(e){Alert.alert(tr('المخزون غير كافٍ'),e instanceof Error?e.message:tr('تعذر إضافة المنتج'));}};
  const changeQty=(productId:string,delta:number)=>{setCart(old=>({...old,lines:old.lines.map(line=>line.productId===productId?{...line,quantity:line.quantity+delta}:line).filter(line=>line.quantity>0)}));};
  const remove=(productId:string)=>setCart(old=>({...old,lines:old.lines.filter(line=>line.productId!==productId)}));
  const checkout=()=>{
    if(!Number.isFinite(discount)||discount<0){Alert.alert(tr('تخفيض غير صالح'),tr('دخل تخفيض صحيح.'));return;}
    const validation=validateCheckout({...currentCart,paidAmount:totals.total});
    if(validation.length){Alert.alert(tr('راجع السلة'),validation.join('\n'));return;}
    const lines:CheckoutLine[]=currentCart.lines.map(line=>({productId:Number(line.productId),name:line.name,quantity:line.quantity,unitPrice:line.unitPrice,discount:line.discount}));
    const name=customers.find(c=>String(c.id)===customerId)?.name||'زبون عابر';
    Alert.alert(tr('تأكيد البيع'),`${tr('المجموع النهائي:')} ${money(totals.total)}\n${tr('الزبون')}: ${name}\n${tr('طريقة الأداء')}: ${tr(method==='cash'?'نقداً':method==='card'?'بطاقة':'تحويل')}`,[
      {text:tr('رجوع'),style:'cancel'},
      {text:tr('تأكيد'),onPress:()=>{const accepted=onCheckout({customerName:name,lines,paymentMethod:method,total:totals.total});if(accepted===false)return;setCart(emptyPosCart());setDiscountText('0');setCustomerId('');}}
    ]);
  };
  const park=()=>{
    if(!cart.lines.length){Alert.alert(tr('راجع السلة'),tr('السلة فارغة'));return;}
    const parked:ParkedPosSale={id:'park-'+Date.now(),cart:{...currentCart},customerId,method,discountText,createdAt:new Date().toISOString()};
    onParkedSalesChange([parked,...parkedSales]);
    setCart(emptyPosCart());setDiscountText('0');setCustomerId('');setTerm('');
    Alert.alert(tr('تم تعليق البيع'),tr('تقدر ترجع ليه من لائحة المبيعات المعلقة.'));
  };
  const resume=(sale:ParkedPosSale)=>{
    setCart(sale.cart);setCustomerId(sale.customerId);setMethod(sale.method);setDiscountText(sale.discountText);
    onParkedSalesChange(parkedSales.filter(item=>item.id!==sale.id));
  };
  return <View style={{gap:12,direction:getLayoutDirection(language)}}>
    <View style={{backgroundColor:'#211D14',borderColor:'#5D4A25',borderWidth:1,borderRadius:14,padding:14}}>
      <Text style={{color:GOLD,fontSize:19,fontWeight:'900'}}>{tr('نقطة البيع POS')}</Text>
      <Text style={{color:'#DDD',marginTop:5}}>{tr('قلب على المنتج بالاسم، زيدو للسلة، وكمّل البيع.')}</Text>
    </View>
    <View style={{backgroundColor:'#1B1B1B',padding:14,borderRadius:12,borderWidth:1,borderColor:'#444'}}>
      <Text style={{color:'#FFF',fontWeight:'800',marginBottom:8}}>{tr('البحث عن منتج')}</Text>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}><TextInput value={term} onChangeText={setTerm} placeholder={tr('الاسم أو المرجع أو الباركود')} placeholderTextColor="#888" style={{flex:1,backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:9,padding:12,color:'#FFF',textAlign:'auto'}}/><VoiceInputButton language={language} onText={setTerm}/></View>
      {(categories.length>0||availableOnly)&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:9}}><Pressable onPress={()=>setCategory('')} style={{borderWidth:1,borderColor:category===''?GOLD:'#444',borderRadius:8,padding:8}}><Text style={{color:'#FFF'}}>{tr('كل الأصناف')}</Text></Pressable>{categories.map(item=><Pressable key={item} onPress={()=>setCategory(item)} style={{borderWidth:1,borderColor:category===item?GOLD:'#444',borderRadius:8,padding:8}}><Text style={{color:'#FFF'}}>{item}</Text></Pressable>)}</View>}
      <Pressable onPress={()=>setAvailableOnly(value=>!value)} style={{alignSelf:'flex-start',borderWidth:1,borderColor:availableOnly?GOLD:'#444',borderRadius:8,padding:8,marginTop:8}}><Text style={{color:'#FFF'}}>{availableOnly?tr('كل المنتجات'):tr('المخزون المتوفر فقط')}</Text></Pressable>
      {matches.map(p=><Pressable key={p.id} onPress={()=>add({id:String(p.id),name:p.name,reference:p.reference,barcode:p.barcode,salePrice:p.price,stock:p.qty,trackStock:true})} style={{padding:11,borderBottomWidth:1,borderBottomColor:'#333',flexDirection:'row',alignItems:'center',gap:10}}>
        <View style={{flex:1}}><Text style={{color:'#FFF',fontWeight:'700'}}>{p.name}</Text><Text style={{color:'#AAA',fontSize:12}}>{tr('المتوفر:')} {p.qty} • {money(p.price)}{p.reference?` • ${p.reference}`:''}{p.barcode?` • ${p.barcode}`:''}</Text></View>
        <Text style={{color:GOLD,fontWeight:'900'}}>{tr('+ أضف')}</Text>
      </Pressable>)}
      {!!term.trim()&&matches.length===0&&<Text style={{color:'#999',padding:10}}>{tr('ما لقيناش منتج بهاد الاسم.')}</Text>}
      {products.length===0&&<Text style={{color:'#999',padding:10}}>{tr('زيد المنتجات أولاً من قسم المنتجات.')}</Text>}
    </View>
    <View style={{backgroundColor:'#1B1B1B',padding:14,borderRadius:12,borderWidth:1,borderColor:'#444'}}>
      <Text style={{color:GOLD,fontSize:17,fontWeight:'800',marginBottom:10}}>{tr('سلة البيع')} ({cart.lines.length})</Text>
      {cart.lines.length===0?<Text style={{color:'#999',textAlign:'center',padding:14}}>{tr('السلة فارغة. قلب على منتج وزيدو.')}</Text>:cart.lines.map(line=>{
        const product=products.find(p=>String(p.id)===line.productId);
        return <View key={line.productId} style={{paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#333',flexDirection:'row',alignItems:'center',gap:8}}>
          {product?.photoData?<Image source={{uri:product.photoData}} style={{width:42,height:42,borderRadius:7}}/>:null}
          <View style={{flex:1}}><Text style={{color:'#FFF',fontWeight:'700'}}>{line.name}</Text><Text style={{color:'#AAA',fontSize:12}}>{money(line.unitPrice)} × {line.quantity}</Text></View>
          <Pressable onPress={()=>changeQty(line.productId,-1)} style={{padding:7}}><Text style={{color:GOLD,fontSize:18}}>−</Text></Pressable>
          <Text style={{color:'#FFF'}}>{line.quantity}</Text>
          <Pressable onPress={()=>{const p=mapped.find(x=>x.id===line.productId);if(p)add(p);}} style={{padding:7}}><Text style={{color:GOLD,fontSize:18}}>+</Text></Pressable>
          <Pressable onPress={()=>remove(line.productId)} style={{padding:5}}><Text style={{color:'#E28A78'}}>{tr('حذف')}</Text></Pressable>
        </View>;
      })}
      <Text style={{color:'#CCC',marginTop:12,marginBottom:6}}>{tr('الزبون')}</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
        <Pressable onPress={()=>setCustomerId('')} style={{borderWidth:1,borderColor:customerId===''?GOLD:'#444',borderRadius:8,padding:9}}><Text style={{color:'#FFF'}}>{tr('زبون عابر')}</Text></Pressable>
        {customers.map(c=><Pressable key={c.id} onPress={()=>setCustomerId(String(c.id))} style={{borderWidth:1,borderColor:customerId===String(c.id)?GOLD:'#444',borderRadius:8,padding:9}}><Text style={{color:'#FFF'}}>{c.name}</Text></Pressable>)}
      </View>
      <Text style={{color:'#CCC',marginTop:12,marginBottom:6}}>{tr('طريقة الأداء')}</Text>
      <View style={{flexDirection:'row',gap:7}}>
        {([{id:'cash',label:'نقداً'},{id:'card',label:'بطاقة'},{id:'transfer',label:'تحويل'}] as const).map(m=><Pressable key={m.id} onPress={()=>setMethod(m.id)} style={{flex:1,borderWidth:1,borderColor:method===m.id?GOLD:'#444',borderRadius:8,padding:10,alignItems:'center'}}><Text style={{color:'#FFF'}}>{tr(m.label)}</Text></Pressable>)}
      </View>
      <TextInput value={discountText} onChangeText={setDiscountText} keyboardType="decimal-pad" placeholder={tr('تخفيض عام (DH)')} placeholderTextColor="#888" style={{backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:9,padding:12,color:'#FFF',marginTop:12,textAlign:'right'}}/>
      <View style={{backgroundColor:'#111',borderRadius:9,padding:12,marginTop:10,gap:6}}>
        <Text style={{color:'#DDD'}}>{tr('المجموع قبل التخفيض:')} {money(totals.subtotal)}</Text>
        <Text style={{color:'#DDD'}}>{tr('التخفيض:')} {money(totals.discount)}</Text>
        <Text style={{color:GOLD,fontWeight:'900',fontSize:21}}>{tr('المجموع النهائي:')} {money(totals.total)}</Text>
      </View>
      <Pressable onPress={checkout} disabled={!cart.lines.length} style={{backgroundColor:cart.lines.length?GOLD:'#555',borderRadius:9,padding:14,alignItems:'center',marginTop:12}}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('تأكيد البيع')}</Text></Pressable>
      <Pressable onPress={park} disabled={!cart.lines.length} style={{borderWidth:1,borderColor:cart.lines.length?GOLD:'#555',borderRadius:9,padding:12,alignItems:'center',marginTop:8}}><Text style={{color:GOLD,fontWeight:'900'}}>{tr('تعليق البيع')}</Text></Pressable>
    </View>
    {parkedSales.length>0&&<View style={{backgroundColor:'#1B1B1B',padding:14,borderRadius:12,borderWidth:1,borderColor:'#444'}}><Text style={{color:GOLD,fontWeight:'900',fontSize:17,marginBottom:8}}>{tr('المبيعات المعلقة')} ({parkedSales.length})</Text>{parkedSales.map(sale=><View key={sale.id} style={{paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#333',flexDirection:'row',alignItems:'center',gap:8}}><View style={{flex:1}}><Text style={{color:'#FFF',fontWeight:'700'}}>{sale.cart.lines.length} {tr('منتج')} · {money(posTotals(sale.cart).total)}</Text><Text style={{color:'#AAA',fontSize:12}}>{new Date(sale.createdAt).toLocaleString(language==='AR'?'ar-MA':'fr-MA')}</Text></View><Pressable onPress={()=>resume(sale)}><Text style={{color:GOLD,fontWeight:'800'}}>{tr('استرجاع')}</Text></Pressable><Pressable onPress={()=>onParkedSalesChange(parkedSales.filter(item=>item.id!==sale.id))}><Text style={{color:'#E28A78'}}>{tr('حذف')}</Text></Pressable></View>)}</View>}
  </View>;
}
