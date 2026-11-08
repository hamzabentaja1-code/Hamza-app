import React, {useMemo, useState} from 'react';
import {Alert, Modal, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import {calculateQuote} from './domain/quote-calculator';
import {translate, getLayoutDirection} from './i18n';
import {DeliveryRequestLine, ExistingDocument, remainingDeliveryLines} from './domain/document-conversion';

type Product = {id:number; name:string; price:number; qty:number};
type Customer = {id:number; name:string};
export type QuoteLine = {productId:number; productName:string; qty:number; unitPrice:number; total:number};
export type QuoteRecord = {
  id:number; productName:string; customerName:string; qty:number;
  unitPrice:number; total:number; date:string; status:string;
  lines?:QuoteLine[]; notes?:string;
};
export type QuoteConversionType = 'invoice' | 'delivery' | 'proforma' | 'customer_order';
type Props = {
  language:'AR'|'FR';
  products:Product[];
  customers:Customer[];
  quotes:QuoteRecord[];
  onSave:(quote:QuoteRecord)=>void;
  onPdf:(title:string, customerName:string, lines:string[], total:number)=>void;
  deliveryDocuments:ExistingDocument[];
  onConvert:(quote:QuoteRecord,type:QuoteConversionType,deliveryLines?:DeliveryRequestLine[])=>void;
};

const gold='#D6AE55';
const panel={backgroundColor:'#1B1B1B',padding:15,borderRadius:13,borderWidth:1,borderColor:'#444'} as const;
const input={backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:11,color:'#FFF',marginBottom:9,textAlign:'auto' as const};
const button={backgroundColor:gold,borderRadius:9,padding:12,alignItems:'center' as const,marginTop:5};
const choice={borderWidth:1,borderColor:'#393939',borderRadius:8,padding:10,marginBottom:6};
const active={borderColor:gold,backgroundColor:'#302819'};
const money=(n:number)=>(n/100).toFixed(2)+' DH';

export default function QuoteWorkspace({language,products,customers,quotes,deliveryDocuments,onSave,onPdf,onConvert}:Props) {
  const tr=(value:string)=>translate(language,value);
  const [customerId,setCustomerId]=useState('');
  const [productId,setProductId]=useState('');
  const [customerSearch,setCustomerSearch]=useState('');
  const [productSearch,setProductSearch]=useState('');
  const [customPrice,setCustomPrice]=useState('');
  const [quantity,setQuantity]=useState('1');
  const [discount,setDiscount]=useState('0');
  const [lines,setLines]=useState<QuoteLine[]>([]);
  const [notes,setNotes]=useState('');
  const [deliveryQuote,setDeliveryQuote]=useState<QuoteRecord|null>(null);
  const [deliveryQuantities,setDeliveryQuantities]=useState<Record<string,string>>({});
  const selectedCustomer=customers.find(c=>String(c.id)===customerId);
  const selectedProduct=products.find(p=>String(p.id)===productId);
  const filteredCustomers=customers.filter(c=>c.name.toLocaleLowerCase().includes(customerSearch.trim().toLocaleLowerCase()));
  const filteredProducts=products.filter(p=>p.name.toLocaleLowerCase().includes(productSearch.trim().toLocaleLowerCase()));
  const remainingFor=(quote:QuoteRecord)=>remainingDeliveryLines(quote.lines||[],deliveryDocuments.filter(document=>document.sourceQuoteId===quote.id));
  const requestDelivery=(quote:QuoteRecord)=>{
    if(!quote.lines?.length){onConvert(quote,'delivery');return;}
    const remaining=remainingFor(quote).filter(line=>line.remainingQty>0);
    if(!remaining.length){Alert.alert(tr('سند خروج'),tr('ما بقا حتى منتج للتسليم فهاد العرض.'));return;}
    setDeliveryQuantities(Object.fromEntries(remaining.map(line=>[String(line.lineIndex),String(line.remainingQty)])));
    setDeliveryQuote(quote);
  };
  const confirmDelivery=()=>{
    if(!deliveryQuote)return;
    const remaining=remainingFor(deliveryQuote).filter(line=>line.remainingQty>0);
    const request:DeliveryRequestLine[]=[];
    for(const line of remaining){
      const raw=(deliveryQuantities[String(line.lineIndex)]??String(line.remainingQty)).replace(',','.');
      const quantity=Number(raw);
      if(!Number.isFinite(quantity)||quantity<0||quantity>line.remainingQty){Alert.alert(tr('كمية غير صحيحة'),tr('دخل كمية صحيحة بين صفر والكمية المتبقية.'));return;}
      if(quantity>0)request.push({productId:line.productId,qty:quantity,lineIndex:line.lineIndex});
    }
    if(!request.length){Alert.alert(tr('راجع الكمية'),tr('اختار كمية واحدة على الأقل.'));return;}
    onConvert(deliveryQuote,'delivery',request);
    setDeliveryQuote(null);
    setDeliveryQuantities({});
  };

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

  const updateLine=(index:number, patch:Partial<Pick<QuoteLine,'qty'|'unitPrice'>>)=>{
    setLines(current=>current.map((line,i)=>{
      if(i!==index) return line;
      const next={...line,...patch};
      return {...next,total:next.qty*next.unitPrice};
    }));
  };
  const addLine=()=>{
    const qty=Number(quantity.replace(',','.'));
    if(!selectedProduct){Alert.alert(tr('اختار المنتج'),tr('حدد المنتج اللي بغيتي تزيد.'));return;}
    if(!Number.isFinite(qty)||qty<=0){Alert.alert(tr('كمية غير صحيحة'),tr('دخل كمية أكبر من صفر.'));return;}
    const unitPrice=customPrice.trim()?Number(customPrice.replace(',','.')):selectedProduct.price;
    if(!Number.isFinite(unitPrice)||unitPrice<0){Alert.alert(tr('ثمن غير صحيح'),tr('دخل ثمن بيع صحيح أو خليه بالثمن الأصلي.'));return;}
    const line:QuoteLine={productId:selectedProduct.id,productName:selectedProduct.name,qty,unitPrice,total:qty*unitPrice};
    setLines(current=>[...current,line]);
    setProductId('');
    setProductSearch('');
    setCustomPrice('');
    setQuantity('1');
  };
  const save=()=>{
    if(!selectedCustomer){Alert.alert(tr('اختار الزبون'),tr('خاصك تحدد الزبون قبل الحفظ.'));return;}
    if(!calculation){Alert.alert(tr('راجع العرض'),tr('زيد منتج واحد على الأقل وتأكد من التخفيض.'));return;}
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
    Alert.alert(tr('تم حفظ عرض السعر'),tr('تقدر دابا تصدره PDF.'));
  };
  const quoteLines=(quote:QuoteRecord)=>quote.lines?.length
    ? quote.lines.map(line=>`${line.productName} × ${line.qty} — ${line.total.toFixed(2)} DH`)
    : [`${quote.productName} × ${quote.qty} — ${quote.total.toFixed(2)} DH`];

  return <><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom:20}}>
    <View style={panel}>
      <Text style={{color:gold,fontSize:19,fontWeight:'800',marginBottom:12}}>{tr('إنشاء عرض سعر متعدد المنتجات')}</Text>
      <Text style={{color:'#CCC',marginBottom:7}}>{tr('الزبون')}</Text>
      <TextInput value={customerSearch} onChangeText={setCustomerSearch} placeholder={tr('بحث عن الزبون بالاسم')} placeholderTextColor="#888" style={input}/>
      {filteredCustomers.map(c=><Pressable key={c.id} onPress={()=>setCustomerId(String(c.id))} style={[choice,customerId===String(c.id)&&active]}><Text style={{color:'#FFF',fontWeight:'700'}}>{c.name}</Text></Pressable>)}
      {customers.length===0&&<Text style={{color:'#999',padding:8}}>{tr('زيد زبون أولاً من قسم الزبناء.')}</Text>}
      <Text style={{color:'#CCC',marginVertical:8}}>{tr('المنتج')}</Text>
      <TextInput value={productSearch} onChangeText={setProductSearch} placeholder={tr('بحث عن المنتج بالاسم')} placeholderTextColor="#888" style={input}/>
      {filteredProducts.map(p=><Pressable key={p.id} onPress={()=>{setProductId(String(p.id));setCustomPrice(p.price.toFixed(2));}} style={[choice,productId===String(p.id)&&active]}><Text style={{color:'#FFF'}}>{p.name} — {p.price.toFixed(2)} DH</Text></Pressable>)}
      {products.length===0&&<Text style={{color:'#999',padding:8}}>{tr('زيد المنتجات أولاً.')}</Text>}
      {selectedProduct&&<TextInput value={customPrice} onChangeText={setCustomPrice} keyboardType="decimal-pad" placeholder={tr('ثمن البيع لهذا العرض (DH)')} placeholderTextColor="#888" style={input}/>}
      <View style={{flexDirection:'row',gap:8}}>
        <TextInput value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder={tr('الكمية')} placeholderTextColor="#888" style={[input,{flex:1}]}/>
        <Pressable onPress={addLine} style={[button,{flex:1,marginTop:0}]}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('+ إضافة للسطر')}</Text></Pressable>
      </View>
      <Text style={{color:gold,fontWeight:'800',marginVertical:8}}>{tr('المنتجات المضافة')} ({lines.length})</Text>
      {lines.map((line,index)=><View key={index} style={{flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:1,borderColor:'#333',paddingVertical:9}}>
        <View style={{flex:1}}>
          <Text style={{color:'#FFF',fontWeight:'700'}}>{line.productName}</Text>
          <View style={{flexDirection:'row',gap:6,marginTop:6}}>
            <TextInput value={String(line.qty)} onChangeText={v=>updateLine(index,{qty:v.trim()===''?0:Number(v.replace(',','.'))})} keyboardType="decimal-pad" placeholder={tr("الكمية")} placeholderTextColor="#888" style={[input,{flex:1,marginBottom:0,padding:7}]}/>
            <TextInput value={String(line.unitPrice)} onChangeText={v=>updateLine(index,{unitPrice:v.trim()===''?0:Number(v.replace(',','.'))})} keyboardType="decimal-pad" placeholder={tr("الثمن")} placeholderTextColor="#888" style={[input,{flex:1,marginBottom:0,padding:7}]}/>
          </View>
        </View>
        <Text style={{color:gold,fontWeight:'800'}}>{Number.isFinite(line.total)?line.total.toFixed(2):'—'} DH</Text>
        <Pressable onPress={()=>setLines(v=>v.filter((_,i)=>i!==index))}><Text style={{color:'#E28A78'}}>{tr('حذف')}</Text></Pressable>
      </View>)}
      <TextInput value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholder={tr('تخفيض إجمالي (DH)')} placeholderTextColor="#888" style={[input,{marginTop:12}]}/>
      <TextInput value={notes} onChangeText={setNotes} placeholder={tr('ملاحظات (اختياري)')} placeholderTextColor="#888" style={input}/>
      <View style={{backgroundColor:'#111',borderRadius:9,padding:12,marginVertical:8}}>
        <Text style={{color:'#DDD'}}>{tr('المجموع قبل التخفيض:')} {calculation?money(calculation.subtotalCentimes):'0.00 DH'}</Text>
        <Text style={{color:'#DDD',marginTop:5}}>{tr('التخفيض:')} {calculation?money(calculation.discountCentimes):'0.00 DH'}</Text>
        <Text style={{color:gold,fontSize:20,fontWeight:'900',marginTop:7}}>{tr('المجموع النهائي:')} {calculation?money(calculation.totalCentimes):'0.00 DH'}</Text>
      </View>
      <Pressable onPress={save} style={button}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('حفظ عرض السعر')}</Text></Pressable>
    </View>
    <Text style={{color:'#FFF',fontWeight:'800',fontSize:17,marginTop:18,marginBottom:10}}>{tr('عروض الأسعار السابقة')} ({quotes.length})</Text>
    {quotes.map(q=><View key={q.id} style={[panel,{marginBottom:8}]}>
      <Text style={{color:'#FFF',fontWeight:'800'}}>{q.customerName}</Text>
      <Text style={{color:'#AAA',fontSize:12,marginTop:4}}>{q.date} • {tr(q.status)}</Text>
      {quoteLines(q).map((line,i)=><Text key={i} style={{color:'#DDD',marginTop:5}}>{line}</Text>)}
      <Text style={{color:gold,fontWeight:'900',fontSize:16,marginTop:8}}>{q.total.toFixed(2)} DH</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8}}>
        <Pressable onPress={()=>onPdf('Devis',q.customerName,[...quoteLines(q),...(q.notes?[q.notes]:[])],q.total)} style={{padding:9,borderWidth:1,borderColor:gold,borderRadius:8}}><Text style={{color:gold,fontWeight:'800'}}>PDF</Text></Pressable>
        <Pressable onPress={()=>requestDelivery(q)} style={{padding:9,borderWidth:1,borderColor:gold,borderRadius:8}}><Text style={{color:gold,fontWeight:'800'}}>{tr('سند خروج')}</Text></Pressable>
        <Pressable onPress={()=>onConvert(q,'invoice')} style={{padding:9,borderWidth:1,borderColor:gold,borderRadius:8}}><Text style={{color:gold,fontWeight:'800'}}>{tr('فاتورة')}</Text></Pressable>
        <Pressable onPress={()=>onConvert(q,'proforma')} style={{padding:9,borderWidth:1,borderColor:gold,borderRadius:8}}><Text style={{color:gold,fontWeight:'800'}}>{tr('فاتورة أولية')}</Text></Pressable>
        <Pressable onPress={()=>onConvert(q,'customer_order')} style={{padding:9,borderWidth:1,borderColor:gold,borderRadius:8}}><Text style={{color:gold,fontWeight:'800'}}>{tr('طلب زبون')}</Text></Pressable>
      </View>
    </View>)}
    {quotes.length===0&&<Text style={{color:'#999',textAlign:'center',padding:12}}>{tr('مازال ما كاين حتى عرض سعر.')}</Text>}
  </ScrollView><Modal visible={!!deliveryQuote} transparent animationType="slide" onRequestClose={()=>setDeliveryQuote(null)}><View style={{flex:1,backgroundColor:'rgba(0,0,0,0.82)',justifyContent:'center',padding:18}}><View style={{backgroundColor:'#1B1B1B',borderColor:'#5D4A25',borderWidth:1,borderRadius:14,padding:16,maxHeight:'85%'}}><Text style={{color:gold,fontSize:18,fontWeight:'900',marginBottom:12}}>{tr('تحديد كمية التسليم')}</Text><ScrollView keyboardShouldPersistTaps="handled">{deliveryQuote&&remainingFor(deliveryQuote).filter(line=>line.remainingQty>0).map(line=><View key={line.lineIndex} style={{borderBottomWidth:1,borderBottomColor:'#333',paddingVertical:9}}><Text style={{color:'#FFF',fontWeight:'700'}}>{line.productName}</Text><Text style={{color:'#AAA',fontSize:12,marginVertical:5}}>{tr('المتبقي للتسليم')}: {line.remainingQty}</Text><TextInput value={deliveryQuantities[String(line.lineIndex)]??String(line.remainingQty)} onChangeText={value=>setDeliveryQuantities(current=>({...current,[String(line.lineIndex)]:value}))} keyboardType="decimal-pad" placeholder={tr('الكمية في هذا التسليم')} placeholderTextColor="#888" style={{backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:8,padding:10,color:'#FFF'}}/></View>)}</ScrollView><View style={{flexDirection:'row',gap:8,marginTop:12}}><Pressable onPress={()=>setDeliveryQuote(null)} style={{flex:1,padding:12,borderWidth:1,borderColor:'#555',borderRadius:8,alignItems:'center'}}><Text style={{color:'#DDD'}}>{tr('إلغاء')}</Text></Pressable><Pressable onPress={confirmDelivery} style={{flex:1,padding:12,backgroundColor:gold,borderRadius:8,alignItems:'center'}}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('تأكيد سند الخروج')}</Text></Pressable></View></View></View></Modal></>;

}
