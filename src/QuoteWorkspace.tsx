import React, {useMemo, useState} from 'react';
import {Alert, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import {calculateQuote} from './domain/quote-calculator';

type Product = {id:number; name:string; price:number; qty:number};
type Customer = {id:number; name:string};
export type QuoteLine = {productId:number; productName:string; qty:number; unitPrice:number; total:number};
export type QuoteRecord = {
  id:number; productName:string; customerName:string; qty:number;
  unitPrice:number; total:number; date:string; status:string;
  lines?:QuoteLine[]; notes?:string;
};
export type QuoteConversionType = 'invoice' | 'delivery';
type Props = {
  products:Product[];
  customers:Customer[];
  quotes:QuoteRecord[];
  onSave:(quote:QuoteRecord)=>void;
  onPdf:(title:string, customerName:string, lines:string[], total:number)=>void;
  onConvert:(quote:QuoteRecord,type:QuoteConversionType)=>void;
};

const gold='#D6AE55';
const panel={backgroundColor:'#1B1B1B',padding:15,borderRadius:13,borderWidth:1,borderColor:'#444'} as const;
const input={backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:11,color:'#FFF',marginBottom:9,textAlign:'right' as const};
const button={backgroundColor:gold,borderRadius:9,padding:12,alignItems:'center' as const,marginTop:5};
const choice={borderWidth:1,borderColor:'#393939',borderRadius:8,padding:10,marginBottom:6};
const active={borderColor:gold,backgroundColor:'#302819'};
const money=(n:number)=>(n/100).toFixed(2)+' DH';

export default function QuoteWorkspace({products,customers,quotes,onSave,onPdf,onConvert}:Props) {
  const [customerId,setCustomerId]=useState('');
  const [productId,setProductId]=useState('');
  const [quantity,setQuantity]=useState('1');
  const [discount,setDiscount]=useState('0');
  const [lines,setLines]=useState<QuoteLine[]>([]);
  const [notes,setNotes]=useState('');
  const selectedCustomer=customers.find(c=>String(c.id)===customerId);
  const selectedProduct=products.find(p=>String(p.id)===productId);

  const calculation=useMemo(()=>{
    if(!lines.length) return null;
    try {
      const discountValue=Number(discount.replace(',','.'));
      if(!Number.isFinite(discountValue)||discountValue<0) return null;
      return calculateQuote(lines.map(line=>({
        productId:String(line.productId),
        description:line.productName,
        quantity:line.qty,
        unitPriceCentimes:Math.round(line.unitPrice*100),
      })),Math.round(Math.max(0,Number(discount.replace(',','.'))||0)*100));
    } catch { return null; }
  },[lines,discount]);

  const addLine=()=>{
    const qty=Number(quantity.replace(',','.'));
    if(!selectedProduct){Alert.alert('اختار المنتج','حدد المنتج اللي بغيتي تزيد.');return;}
    if(!Number.isFinite(qty)||qty<=0){Alert.alert('كمية غير صحيحة','دخل كمية أكبر من صفر.');return;}
    const line:QuoteLine={productId:selectedProduct.id,productName:selectedProduct.name,qty,unitPrice:selectedProduct.price,total:qty*selectedProduct.price};
    setLines(current=>[...current,line]);
    setProductId('');
    setQuantity('1');
  };
  const save=()=>{
    if(!selectedCustomer){Alert.alert('اختار الزبون','خاصك تحدد الزبون قبل الحفظ.');return;}
    if(!calculation){Alert.alert('راجع العرض','زيد منتج واحد على الأقل وتأكد من التخفيض.');return;}
    const now=Date.now();
    const record:QuoteRecord={
      id:now,productName:lines.map(x=>x.productName).join(', '),
      customerName:selectedCustomer.name,qty:lines.reduce((n,x)=>n+x.qty,0),
      unitPrice:0,total:calculation.totalCentimes/100,
      date:new Date().toLocaleDateString('fr-MA'),status:'معلق',
      notes:notes.trim(),
      lines:lines.map((line,index)=>({...line,total:calculation.lines[index].lineTotalCentimes/100})),
    };
    onSave(record);
    setLines([]);setDiscount('0');setNotes('');
    Alert.alert('تم حفظ عرض السعر','تقدر دابا تصدره PDF.');
  };
  const quoteLines=(quote:QuoteRecord)=>quote.lines?.length
    ? quote.lines.map(line=>`${line.productName} × ${line.qty} — ${line.total.toFixed(2)} DH`)
    : [`${quote.productName} × ${quote.qty} — ${quote.total.toFixed(2)} DH`];

  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom:20}}>
    <View style={panel}>
      <Text style={{color:gold,fontSize:19,fontWeight:'800',marginBottom:12}}>إنشاء عرض سعر متعدد المنتجات</Text>
      <Text style={{color:'#CCC',marginBottom:7}}>الزبون</Text>
      {customers.map(c=><Pressable key={c.id} onPress={()=>setCustomerId(String(c.id))} style={[choice,customerId===String(c.id)&&active]}><Text style={{color:'#FFF',fontWeight:'700'}}>{c.name}</Text></Pressable>)}
      {customers.length===0&&<Text style={{color:'#999',padding:8}}>زيد زبون أولاً من قسم الزبناء.</Text>}
      <Text style={{color:'#CCC',marginVertical:8}}>المنتج</Text>
      {products.map(p=><Pressable key={p.id} onPress={()=>setProductId(String(p.id))} style={[choice,productId===String(p.id)&&active]}><Text style={{color:'#FFF'}}>{p.name} — {p.price.toFixed(2)} DH</Text></Pressable>)}
      {products.length===0&&<Text style={{color:'#999',padding:8}}>زيد المنتجات أولاً.</Text>}
      <View style={{flexDirection:'row',gap:8}}>
        <TextInput value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="الكمية" placeholderTextColor="#888" style={[input,{flex:1}]}/>
        <Pressable onPress={addLine} style={[button,{flex:1,marginTop:0}]}><Text style={{color:'#151515',fontWeight:'900'}}>+ إضافة للسطر</Text></Pressable>
      </View>
      <Text style={{color:gold,fontWeight:'800',marginVertical:8}}>المنتجات المضافة ({lines.length})</Text>
      {lines.map((line,index)=><View key={index} style={{flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:1,borderColor:'#333',paddingVertical:9}}>
        <View style={{flex:1}}><Text style={{color:'#FFF',fontWeight:'700'}}>{line.productName}</Text><Text style={{color:'#999',fontSize:12}}>{line.qty} × {line.unitPrice.toFixed(2)} DH</Text></View>
        <Text style={{color:gold,fontWeight:'800'}}>{line.total.toFixed(2)} DH</Text>
        <Pressable onPress={()=>setLines(v=>v.filter((_,i)=>i!==index))}><Text style={{color:'#E28A78'}}>حذف</Text></Pressable>
      </View>)}
      <TextInput value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholder="تخفيض إجمالي (DH)" placeholderTextColor="#888" style={[input,{marginTop:12}]}/>
      <TextInput value={notes} onChangeText={setNotes} placeholder="ملاحظات (اختياري)" placeholderTextColor="#888" style={input}/>
      <View style={{backgroundColor:'#111',borderRadius:9,padding:12,marginVertical:8}}>
        <Text style={{color:'#DDD'}}>المجموع قبل التخفيض: {calculation?money(calculation.subtotalCentimes):'0.00 DH'}</Text>
        <Text style={{color:'#DDD',marginTop:5}}>التخفيض: {calculation?money(calculation.discountCentimes):'0.00 DH'}</Text>
        <Text style={{color:gold,fontSize:20,fontWeight:'900',marginTop:7}}>المجموع النهائي: {calculation?money(calculation.totalCentimes):'0.00 DH'}</Text>
      </View>
      <Pressable onPress={save} style={button}><Text style={{color:'#151515',fontWeight:'900'}}>حفظ عرض السعر</Text></Pressable>
    </View>
    <Text style={{color:'#FFF',fontWeight:'800',fontSize:17,marginTop:18,marginBottom:10}}>عروض الأسعار السابقة ({quotes.length})</Text>
    {quotes.map(q=><View key={q.id} style={[panel,{marginBottom:8}]}>
      <Text style={{color:'#FFF',fontWeight:'800'}}>{q.customerName}</Text>
      <Text style={{color:'#AAA',fontSize:12,marginTop:4}}>{q.date} • {q.status}</Text>
      {quoteLines(q).map((line,i)=><Text key={i} style={{color:'#DDD',marginTop:5}}>{line}</Text>)}
      <Text style={{color:gold,fontWeight:'900',fontSize:16,marginTop:8}}>{q.total.toFixed(2)} DH</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8}}>
        <Pressable onPress={()=>onPdf('Devis',q.customerName,[...quoteLines(q),...(q.notes?[q.notes]:[])],q.total)} style={{padding:9,borderWidth:1,borderColor:gold,borderRadius:8}}><Text style={{color:gold,fontWeight:'800'}}>PDF</Text></Pressable>
        <Pressable onPress={()=>onConvert(q,'delivery')} style={{padding:9,borderWidth:1,borderColor:gold,borderRadius:8}}><Text style={{color:gold,fontWeight:'800'}}>سند خروج</Text></Pressable>
        <Pressable onPress={()=>onConvert(q,'invoice')} style={{padding:9,borderWidth:1,borderColor:gold,borderRadius:8}}><Text style={{color:gold,fontWeight:'800'}}>فاتورة</Text></Pressable>
      </View>
    </View>)}
    {quotes.length===0&&<Text style={{color:'#999',textAlign:'center',padding:12}}>مازال ما كاين حتى عرض سعر.</Text>}
  </ScrollView>;
}
