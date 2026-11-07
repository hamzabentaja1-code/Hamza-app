import React, {useMemo, useState} from 'react';
import {Alert, Image, Pressable, Text, TextInput, View} from 'react-native';
import {addPosLine, emptyPosCart, PosCart, PosProduct, posTotals, validateCheckout} from './pos';

type Product = {id:number; name:string; price:number; qty:number; photoData?:string};
type Customer = {id:number; name:string};
type CheckoutLine = {productId:number; name:string; quantity:number; unitPrice:number; discount:number};
type Props = {
  products: Product[];
  customers: Customer[];
  onCheckout: (data:{customerName:string; lines:CheckoutLine[]; paymentMethod:'cash'|'card'|'transfer'; total:number})=>boolean|void;
};
const GOLD='#D6AE55';
const money=(value:number)=>value.toFixed(2)+' DH';

export default function PosWorkspace({products,customers,onCheckout}:Props){
  const [term,setTerm]=useState('');
  const [customerId,setCustomerId]=useState('');
  const [method,setMethod]=useState<'cash'|'card'|'transfer'>('cash');
  const [discountText,setDiscountText]=useState('0');
  const [cart,setCart]=useState<PosCart>(emptyPosCart());
  const mapped:PosProduct[]=useMemo(()=>products.map(p=>({id:String(p.id),name:p.name,salePrice:p.price,stock:p.qty,trackStock:true})),[products]);
  const matches=useMemo(()=>{const q=term.trim().toLocaleLowerCase();if(!q)return [];return mapped.filter(p=>p.name.toLocaleLowerCase().includes(q)).slice(0,8);},[mapped,term]);
  const discount=Number(discountText.replace(',','.'));
  const currentCart:PosCart={...cart,customerId:customerId||undefined,paymentMethod:method,globalDiscount:Number.isFinite(discount)?Math.max(0,discount):0,paidAmount:0};
  const totals=posTotals(currentCart);
  const add=(p:PosProduct)=>{try{setCart(old=>addPosLine(old,p));setTerm('');}catch(e){Alert.alert('المخزون غير كافٍ',e instanceof Error?e.message:'تعذر إضافة المنتج');}};
  const changeQty=(productId:string,delta:number)=>{setCart(old=>({...old,lines:old.lines.map(line=>line.productId===productId?{...line,quantity:line.quantity+delta}:line).filter(line=>line.quantity>0)}));};
  const remove=(productId:string)=>setCart(old=>({...old,lines:old.lines.filter(line=>line.productId!==productId)}));
  const checkout=()=>{
    if(!Number.isFinite(discount)||discount<0){Alert.alert('تخفيض غير صالح','دخل تخفيض صحيح.');return;}
    const validation=validateCheckout({...currentCart,paidAmount:totals.total});
    if(validation.length){Alert.alert('راجع السلة',validation.join('\n'));return;}
    const lines:CheckoutLine[]=currentCart.lines.map(line=>({productId:Number(line.productId),name:line.name,quantity:line.quantity,unitPrice:line.unitPrice,discount:line.discount}));
    const name=customers.find(c=>String(c.id)===customerId)?.name||'زبون عابر';
    Alert.alert('تأكيد البيع',`المجموع ${money(totals.total)}\nالزبون: ${name}\nطريقة الأداء: ${method==='cash'?'نقداً':method==='card'?'بطاقة':'تحويل'}`,[
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
      <TextInput value={term} onChangeText={setTerm} placeholder="اسم المنتج..." placeholderTextColor="#888" style={{backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:9,padding:12,color:'#FFF',textAlign:'right'}}/>
      {matches.map(p=><Pressable key={p.id} onPress={()=>add(p)} style={{padding:11,borderBottomWidth:1,borderBottomColor:'#333',flexDirection:'row',alignItems:'center',gap:10}}>
        <View style={{flex:1}}><Text style={{color:'#FFF',fontWeight:'700'}}>{p.name}</Text><Text style={{color:'#AAA',fontSize:12}}>المتوفر: {p.stock} • {money(p.salePrice)}</Text></View>
        <Text style={{color:GOLD,fontWeight:'900'}}>+ أضف</Text>
      </Pressable>)}
      {!!term.trim()&&matches.length===0&&<Text style={{color:'#999',padding:10}}>ما لقيناش منتج بهاد الاسم.</Text>}
      {products.length===0&&<Text style={{color:'#999',padding:10}}>زيد المنتجات أولاً من قسم المنتجات.</Text>}
    </View>
    <View style={{backgroundColor:'#1B1B1B',padding:14,borderRadius:12,borderWidth:1,borderColor:'#444'}}>
      <Text style={{color:GOLD,fontSize:17,fontWeight:'800',marginBottom:10}}>سلة البيع ({cart.lines.length})</Text>
      {cart.lines.length===0?<Text style={{color:'#999',textAlign:'center',padding:14}}>السلة فارغة. قلب على منتج وزيدو.</Text>:cart.lines.map(line=>{
        const product=products.find(p=>String(p.id)===line.productId);
        return <View key={line.productId} style={{paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#333',flexDirection:'row',alignItems:'center',gap:8}}>
          {product?.photoData?<Image source={{uri:product.photoData}} style={{width:42,height:42,borderRadius:7}}/>:null}
          <View style={{flex:1}}><Text style={{color:'#FFF',fontWeight:'700'}}>{line.name}</Text><Text style={{color:'#AAA',fontSize:12}}>{money(line.unitPrice)} × {line.quantity}</Text></View>
          <Pressable onPress={()=>changeQty(line.productId,-1)} style={{padding:7}}><Text style={{color:GOLD,fontSize:18}}>−</Text></Pressable>
          <Text style={{color:'#FFF'}}>{line.quantity}</Text>
          <Pressable onPress={()=>{const p=mapped.find(x=>x.id===line.productId);if(p)add(p);}} style={{padding:7}}><Text style={{color:GOLD,fontSize:18}}>+</Text></Pressable>
          <Pressable onPress={()=>remove(line.productId)} style={{padding:5}}><Text style={{color:'#E28A78'}}>حذف</Text></Pressable>
        </View>;
      })}
      <Text style={{color:'#CCC',marginTop:12,marginBottom:6}}>الزبون</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
        <Pressable onPress={()=>setCustomerId('')} style={{borderWidth:1,borderColor:customerId===''?GOLD:'#444',borderRadius:8,padding:9}}><Text style={{color:'#FFF'}}>زبون عابر</Text></Pressable>
        {customers.map(c=><Pressable key={c.id} onPress={()=>setCustomerId(String(c.id))} style={{borderWidth:1,borderColor:customerId===String(c.id)?GOLD:'#444',borderRadius:8,padding:9}}><Text style={{color:'#FFF'}}>{c.name}</Text></Pressable>)}
      </View>
      <Text style={{color:'#CCC',marginTop:12,marginBottom:6}}>طريقة الأداء</Text>
      <View style={{flexDirection:'row',gap:7}}>
        {([{id:'cash',label:'نقداً'},{id:'card',label:'بطاقة'},{id:'transfer',label:'تحويل'}] as const).map(m=><Pressable key={m.id} onPress={()=>setMethod(m.id)} style={{flex:1,borderWidth:1,borderColor:method===m.id?GOLD:'#444',borderRadius:8,padding:10,alignItems:'center'}}><Text style={{color:'#FFF'}}>{m.label}</Text></Pressable>)}
      </View>
      <TextInput value={discountText} onChangeText={setDiscountText} keyboardType="decimal-pad" placeholder="تخفيض عام (DH)" placeholderTextColor="#888" style={{backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:9,padding:12,color:'#FFF',marginTop:12,textAlign:'right'}}/>
      <View style={{backgroundColor:'#111',borderRadius:9,padding:12,marginTop:10,gap:6}}>
        <Text style={{color:'#DDD'}}>المجموع قبل التخفيض: {money(totals.subtotal)}</Text>
        <Text style={{color:'#DDD'}}>التخفيض: {money(totals.discount)}</Text>
        <Text style={{color:GOLD,fontWeight:'900',fontSize:21}}>المجموع النهائي: {money(totals.total)}</Text>
      </View>
      <Pressable onPress={checkout} disabled={!cart.lines.length} style={{backgroundColor:cart.lines.length?GOLD:'#555',borderRadius:9,padding:14,alignItems:'center',marginTop:12}}><Text style={{color:'#151515',fontWeight:'900'}}>تأكيد البيع</Text></Pressable>
    </View>
  </View>;
}
