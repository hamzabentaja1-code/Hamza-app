import React,{useMemo,useState} from 'react';
import {ScrollView,View} from 'react-native';
import {TText as Text,TTextInput as TextInput} from './i18n';
import AccessiblePressable from './AccessiblePressable';
import {CustomerOrder,CustomerOrderStatus} from './domain/customer-orders';
import {QuoteRecord} from './QuoteWorkspace';
const Pressable = AccessiblePressable;
const panel={backgroundColor:'#1B1B1B',padding:14,borderRadius:12,borderWidth:1,borderColor:'#444'} as const;
const input={backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:10,color:'#FFF',marginBottom:8,textAlign:'right' as const};
const gold='#D6AE55';
type Props={quotes:QuoteRecord[];orders:CustomerOrder[];onCreate:(quote:QuoteRecord)=>void;onStatus:(id:number,status:CustomerOrderStatus)=>void;onDeliver:(order:CustomerOrder,quantities:Record<string,number>)=>void;onInvoice:(order:CustomerOrder)=>void;};
export default function CustomerOrdersWorkspace({quotes,orders,onCreate,onStatus,onDeliver,onInvoice}:Props){
 const [selectedQuote,setSelectedQuote]=useState('');
 const [quantities,setQuantities]=useState<Record<number,Record<string,string>>>({});
 const eligibleQuotes=useMemo(()=>quotes.filter(q=>q.status==='مقبول'&&!orders.some(o=>o.sourceQuoteId===q.id)),[quotes,orders]);
 return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom:24}}>
  <View style={panel}>
   <Text style={{color:gold,fontSize:18,fontWeight:'900',marginBottom:10}}>إنشاء طلب من عرض سعر مقبول</Text>
   {eligibleQuotes.map(q=><Pressable key={q.id} accessibilityState={{selected:selectedQuote===String(q.id)}} onPress={()=>setSelectedQuote(String(q.id))} style={{borderWidth:1,borderColor:selectedQuote===String(q.id)?gold:'#444',borderRadius:8,padding:10,marginBottom:7}}>
    <Text style={{color:'#FFF',fontWeight:'800'}}>{q.number||('DEV-'+q.id)} • {q.customerName}</Text><Text style={{color:'#AAA',marginTop:4}}>{q.total.toFixed(2)} DH • {q.lines?.length||1} سطر</Text>
   </Pressable>)}
   {eligibleQuotes.length===0?<Text style={{color:'#AAA'}}>ما كاين حتى عرض مقبول وجاهز يتحول لطلب جديد.</Text>:null}
   <Pressable disabled={!selectedQuote} onPress={()=>{const q=quotes.find(x=>String(x.id)===selectedQuote);if(q){onCreate(q);setSelectedQuote('');}}} style={{backgroundColor:gold,padding:12,borderRadius:9,alignItems:'center',opacity:selectedQuote?1:0.45,marginTop:8}}><Text style={{color:'#151515',fontWeight:'900'}}>إنشاء طلب الزبون</Text></Pressable>
  </View>
  <Text style={{color:'#FFF',fontSize:17,fontWeight:'900',marginVertical:12}}>طلبات الزبناء ({orders.length})</Text>
  {orders.map(order=><View key={order.id} style={[panel,{marginBottom:9}]}>
   <Text style={{color:'#FFF',fontWeight:'900',fontSize:16}}>{order.number} • {order.customerName}</Text>
   <Text style={{color:'#AAA',marginTop:4}}>{order.date} • {order.status==='draft'?'مسودة':order.status==='confirmed'?'مؤكد':order.status==='partially_fulfilled'?'تسليم جزئي':order.status==='fulfilled'?'تم التسليم':'ملغى'} • {order.total.toFixed(2)} DH</Text>
   {order.lines.map((line,index)=>{const remaining=Math.max(0,line.qty-line.fulfilledQty);return <View key={index} style={{borderTopWidth:1,borderColor:'#333',paddingTop:8,marginTop:8}}>
    <Text style={{color:'#EEE',fontWeight:'700'}}>{line.productName}{line.variantLabel?' • '+line.variantLabel:''}</Text>
    <Text style={{color:'#AAA',fontSize:12}}>الكمية: {line.qty} • تسلمات: {line.fulfilledQty} • باقي: {remaining}</Text>
    {order.status==='confirmed'||order.status==='partially_fulfilled'?<TextInput value={quantities[order.id]?.[String(index)]??String(remaining)} onChangeText={value=>setQuantities(current=>({...current,[order.id]:{...(current[order.id]||{}),[String(index)]:value}}))} keyboardType="decimal-pad" placeholder="كمية التسليم الآن" placeholderTextColor="#888" style={[input,{marginTop:7,marginBottom:0}]}/>:null}
   </View>})}
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:12}}>
    {order.status==='draft'?<Pressable onPress={()=>onStatus(order.id,'confirmed')} style={{borderWidth:1,borderColor:'#4D9D82',padding:9,borderRadius:8}}><Text style={{color:'#4D9D82',fontWeight:'800'}}>تأكيد الطلب</Text></Pressable>:null}
    {order.status==='confirmed'||order.status==='partially_fulfilled'?<Pressable onPress={()=>{const values:Record<string,number>={};order.lines.forEach((line,index)=>{const raw=quantities[order.id]?.[String(index)];values[String(index)]=raw===undefined?Math.max(0,line.qty-line.fulfilledQty):Number(raw.replace(',','.'));});onDeliver(order,values);}} style={{borderWidth:1,borderColor:gold,padding:9,borderRadius:8}}><Text style={{color:gold,fontWeight:'800'}}>تسجيل التسليم</Text></Pressable>:null}
    {order.status==='draft'||order.status==='confirmed'?<Pressable onPress={()=>onStatus(order.id,'cancelled')} style={{borderWidth:1,borderColor:'#B76C5A',padding:9,borderRadius:8}}><Text style={{color:'#B76C5A',fontWeight:'800'}}>إلغاء الطلب</Text></Pressable>:null}
    {order.status==='fulfilled'?<Pressable onPress={()=>onInvoice(order)} style={{borderWidth:1,borderColor:'#777',padding:9,borderRadius:8}}><Text style={{color:'#DDD',fontWeight:'800'}}>إنشاء فاتورة</Text></Pressable>:null}
   </View>
   <Text style={{color:'#777',fontSize:11,marginTop:8}}>سندات التسليم: {order.deliveryDocumentIds.join(', ')||'—'} • الفواتير: {order.invoiceDocumentIds.join(', ')||'—'}</Text>
  </View>)}
  {orders.length===0?<Text style={{color:'#999',textAlign:'center',padding:14}}>مازال ما تسجلو طلبات.</Text>:null}
 </ScrollView>;
}
