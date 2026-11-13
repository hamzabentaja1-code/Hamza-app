import React, {useMemo, useState} from 'react';
import {Alert, Image, Pressable, Text, TextInput, View} from 'react-native';
import {addPosLine, emptyPosCart, findPosProduct, PosCart, PosProduct, posTotals, validateCheckout} from './pos';
import {translate, getLayoutDirection} from './i18n';
import {canExtendCredit} from './domain/contact-credit';

type Product = {id:number; name:string; price:number; qty:number; reference?:string; barcode?:string; photoData?:string};
type Customer = {id:number; name:string; creditLimitCentimes?:number};
type BankAccountOption={id:string;name:string;balance:number};
type CheckoutLine = {productId:number; name:string; quantity:number; unitPrice:number; discount:number};
type Props = {
  language: 'AR'|'FR';
  products: Product[];
  customers: Customer[];
  bankAccounts:BankAccountOption[];
  creditByCustomer: Record<string,number>;
  outstandingByCustomer: Record<string,number>;
  onCheckout: (data:{customerId?:number;customerName:string; lines:CheckoutLine[]; paymentMethod:'cash'|'card'|'transfer'|'credit'; total:number;paidAmount:number;bankAccountId?:string;creditPaymentMethod?:'cash'|'card'|'transfer'})=>boolean|void;
};
const GOLD='#D6AE55';
const money=(value:number)=>value.toFixed(2)+' DH';

export default function PosWorkspace({language,products,customers,bankAccounts,creditByCustomer,outstandingByCustomer,onCheckout}:Props){
  const tr=(value:string)=>translate(language,value);
  const [term,setTerm]=useState('');
  const [customerId,setCustomerId]=useState('');
  const [method,setMethod]=useState<'cash'|'card'|'transfer'|'credit'>('cash');
  const [bankAccountId,setBankAccountId]=useState('');
  const [creditPaymentMethod,setCreditPaymentMethod]=useState<'cash'|'card'|'transfer'>('cash');
  const [creditPaidText,setCreditPaidText]=useState('0');
  const [discountText,setDiscountText]=useState('0');
  const [cart,setCart]=useState<PosCart>(emptyPosCart());
  const mapped:PosProduct[]=useMemo(()=>products.map(p=>({id:String(p.id),name:p.name,reference:p.reference,barcode:p.barcode,salePrice:p.price,stock:p.qty,trackStock:true})),[products]);
  const matches=useMemo(()=>{const q=term.trim().toLocaleLowerCase();if(!q)return [];return mapped.filter(p=>[p.name,p.reference||'',p.barcode||''].some(value=>value.toLocaleLowerCase().includes(q))).slice(0,8);},[mapped,term]);
  const discount=Number(discountText.replace(',','.'));
  const creditPaid=Number(creditPaidText.replace(',','.'));
  const currentCart:PosCart={...cart,customerId:customerId||undefined,paymentMethod:method,globalDiscount:Number.isFinite(discount)?Math.max(0,discount):0,paidAmount:method==='credit'&&Number.isFinite(creditPaid)?Math.max(0,creditPaid):0};
  const totals=posTotals(currentCart);
  const add=(p:PosProduct)=>{try{setCart(old=>addPosLine(old,p));setTerm('');}catch(e){Alert.alert(tr('المخزون غير كافٍ'),e instanceof Error?e.message:tr('تعذر إضافة المنتج'));}};
  const changeQty=(productId:string,delta:number)=>{setCart(old=>({...old,lines:old.lines.map(line=>line.productId===productId?{...line,quantity:line.quantity+delta}:line).filter(line=>line.quantity>0)}));};
  const remove=(productId:string)=>setCart(old=>({...old,lines:old.lines.filter(line=>line.productId!==productId)}));
  const checkout=()=>{
    if(!Number.isFinite(discount)||discount<0){Alert.alert(tr('تخفيض غير صالح'),tr('دخل تخفيض صحيح.'));return;}
    if(method==='credit'&&(!customerId||!Number.isFinite(creditPaid)||creditPaid<0||creditPaid>totals.total)){Alert.alert(tr('معلومات ناقصة'),tr('اختار زبوناً مسجلاً ومبلغاً مؤدى لا يتجاوز المجموع.'));return;}
    const bankRequired=method==='card'||method==='transfer'||(method==='credit'&&creditPaid>0&&creditPaymentMethod!=='cash');
    if(bankRequired&&!bankAccounts.some(account=>account.id===bankAccountId)){Alert.alert(tr('معلومات ناقصة'),tr('اختار الحساب البنكي للتحويل.'));return;}
    const paidAmount=method==='credit'?creditPaid:totals.total;
    const validation=validateCheckout({...currentCart,paidAmount});
    if(validation.length){Alert.alert(tr('راجع السلة'),validation.map(message=>tr(message)).join('\n'));return;}
    const lines:CheckoutLine[]=currentCart.lines.map(line=>({productId:Number(line.productId),name:line.name,quantity:line.quantity,unitPrice:line.unitPrice,discount:line.discount}));
    const name=customers.find(c=>String(c.id)===customerId)?.name||'زبون عابر';
    const remaining=Math.max(0,totals.total-paidAmount);
    const creditApplied=method==='credit'?Math.min(Math.max(0,creditByCustomer[name]||0),remaining):0;
    const selectedCustomer=customers.find(c=>String(c.id)===customerId);
    if(method==='credit'&&selectedCustomer&&!canExtendCredit({creditLimitCentimes:selectedCustomer.creditLimitCentimes},Math.round((outstandingByCustomer[name]||0)*100),Math.round((remaining-creditApplied)*100))){Alert.alert(tr('تجاوز سقف الدين'),tr('هاد البيع غادي يفوت سقف الدين المحدد للزبون.'));return;}
    Alert.alert(tr('تأكيد البيع'),`${tr('المجموع النهائي:')} ${money(totals.total)}\n${tr('الزبون')}: ${name}\n${tr('طريقة الأداء')}: ${tr(method==='cash'?'نقداً':method==='card'?'بطاقة':method==='credit'?'دين':'تحويل')}${method==='credit'?`\n${tr('المؤدى الآن:')} ${money(paidAmount)}${creditApplied>0?`\n${tr('رصيد سابق مستعمل:')} ${money(creditApplied)}`:''}\n${tr('الباقي:')} ${money(remaining-creditApplied)}`:''}`,[
      {text:tr('رجوع'),style:'cancel'},
      {text:tr('تأكيد'),onPress:()=>{const accepted=onCheckout({customerId:customerId?Number(customerId):undefined,customerName:name,lines,paymentMethod:method,total:totals.total,paidAmount,...(bankRequired?{bankAccountId}:{}),...(method==='credit'?{creditPaymentMethod}:{})});if(accepted===false)return;setCart(emptyPosCart());setDiscountText('0');setCustomerId('');setCreditPaidText('0');}}
    ]);
  };
  return <View style={{gap:12,direction:getLayoutDirection(language)}}>
    <View style={{backgroundColor:'#211D14',borderColor:'#5D4A25',borderWidth:1,borderRadius:14,padding:14}}>
      <Text style={{color:GOLD,fontSize:19,fontWeight:'900'}}>{tr('نقطة البيع POS')}</Text>
      <Text style={{color:'#DDD',marginTop:5}}>{tr('قلب على المنتج بالاسم، زيدو للسلة، وكمّل البيع.')}</Text>
    </View>
    <View style={{backgroundColor:'#1B1B1B',padding:14,borderRadius:12,borderWidth:1,borderColor:'#444'}}>
      <Text style={{color:'#FFF',fontWeight:'800',marginBottom:8}}>{tr('البحث عن منتج')}</Text>
      <TextInput value={term} onChangeText={setTerm} onSubmitEditing={()=>{const product=findPosProduct(mapped,term);if(product){add(product);}}} returnKeyType="search" placeholder={tr('اسم المنتج أو المرجع أو الباركود...')} placeholderTextColor="#888" style={{backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:9,padding:12,color:'#FFF',textAlign:'auto'}}/>
      {matches.map(p=><Pressable key={p.id} onPress={()=>add(p)} style={{padding:11,borderBottomWidth:1,borderBottomColor:'#333',flexDirection:'row',alignItems:'center',gap:10}}>
        <View style={{flex:1}}><Text style={{color:'#FFF',fontWeight:'700'}}>{p.name}</Text><Text style={{color:'#AAA',fontSize:12}}>{p.reference?tr('مرجع:')+' '+p.reference+' • ':''}{p.barcode?tr('باركود:')+' '+p.barcode+' • ':''}{tr('المتوفر:')} {p.stock} • {money(p.salePrice)}</Text></View>
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
        {([{id:'cash',label:'نقداً'},{id:'card',label:'بطاقة'},{id:'transfer',label:'تحويل'},{id:'credit',label:'دين'}] as const).map(m=><Pressable key={m.id} onPress={()=>setMethod(m.id)} style={{flex:1,borderWidth:1,borderColor:method===m.id?GOLD:'#444',borderRadius:8,padding:10,alignItems:'center'}}><Text style={{color:'#FFF'}}>{tr(m.label)}</Text></Pressable>)}
      </View>
      {method==='credit'&&<><TextInput value={creditPaidText} onChangeText={setCreditPaidText} keyboardType="decimal-pad" placeholder={tr('المؤدى الآن (DH)')} placeholderTextColor="#888" style={{backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:9,padding:12,color:'#FFF',marginTop:8,textAlign:'auto'}}/><Text style={{color:'#AAA'}}>{tr('اختار زبوناً مسجلاً ومبلغاً مؤدى لا يتجاوز المجموع.')}</Text><Text style={{color:'#CCC',marginTop:10}}>{tr('طريقة أداء التسبيق')}</Text><View style={{flexDirection:'row',gap:7}}>{([{id:'cash',label:'نقداً'},{id:'card',label:'بطاقة'},{id:'transfer',label:'تحويل'}] as const).map(item=><Pressable key={item.id} onPress={()=>setCreditPaymentMethod(item.id)} style={{flex:1,borderWidth:1,borderColor:creditPaymentMethod===item.id?GOLD:'#444',borderRadius:8,padding:9,alignItems:'center'}}><Text style={{color:'#FFF'}}>{tr(item.label)}</Text></Pressable>)}</View></>}
      {(method==='card'||method==='transfer'||(method==='credit'&&creditPaid>0&&creditPaymentMethod!=='cash'))&&<View><Text style={{color:'#CCC',marginTop:10,marginBottom:5}}>{tr('الحساب البنكي')}</Text>{bankAccounts.map(account=><Pressable key={account.id} onPress={()=>setBankAccountId(account.id)} style={{borderWidth:1,borderColor:bankAccountId===account.id?GOLD:'#444',borderRadius:8,padding:9,marginBottom:5}}><Text style={{color:'#FFF'}}>{account.name} • {money(account.balance)}</Text></Pressable>)}{bankAccounts.length===0&&<Text style={{color:'#AAA'}}>{tr('أضف حساباً بنكياً من شاشة الصندوق أولاً.')}</Text>}</View>}
      <TextInput value={discountText} onChangeText={setDiscountText} keyboardType="decimal-pad" placeholder={tr('تخفيض عام (DH)')} placeholderTextColor="#888" style={{backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:9,padding:12,color:'#FFF',marginTop:12,textAlign:'right'}}/>
      <View style={{backgroundColor:'#111',borderRadius:9,padding:12,marginTop:10,gap:6}}>
        <Text style={{color:'#DDD'}}>{tr('المجموع قبل التخفيض:')} {money(totals.subtotal)}</Text>
        <Text style={{color:'#DDD'}}>{tr('التخفيض:')} {money(totals.discount)}</Text>
        <Text style={{color:GOLD,fontWeight:'900',fontSize:21}}>{tr('المجموع النهائي:')} {money(totals.total)}</Text>
      </View>
      <Pressable onPress={checkout} disabled={!cart.lines.length} style={{backgroundColor:cart.lines.length?GOLD:'#555',borderRadius:9,padding:14,alignItems:'center',marginTop:12}}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('تأكيد البيع')}</Text></Pressable>
    </View>
  </View>;
}
