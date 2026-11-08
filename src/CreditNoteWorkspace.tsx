import React, {useMemo, useState} from 'react';
import {Alert, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import {translate,getLayoutDirection} from './i18n';
import {CreditInvoice,CreditNote} from './domain/credit-note';

type Props={language:'AR'|'FR';invoices:CreditInvoice[];creditNotes:CreditNote[];onCreate:(invoice:CreditInvoice,quantities:Record<string,number>)=>void;onPdf:(title:string,customer:string,lines:string[],total:number)=>void};
const gold='#D6AE55';
export default function CreditNoteWorkspace({language,invoices,creditNotes,onCreate,onPdf}:Props){
  const tr=(value:string)=>translate(language,value);const rtl=getLayoutDirection(language)==='rtl';
  const [invoiceId,setInvoiceId]=useState('');const [quantities,setQuantities]=useState<Record<string,string>>({});
  const invoice=invoices.find(item=>String(item.id)===invoiceId);
  const returned=useMemo(()=>{const result:Record<string,number>={};for(const note of creditNotes.filter(item=>item.sourceInvoiceId===invoice?.id))for(const line of note.lines)result[String(line.productId)]=(result[String(line.productId)]||0)+line.qty;return result;},[creditNotes,invoice?.id]);
  const remaining=invoice?Array.from(invoice.lines.reduce((groups,line)=>{const current=groups.get(line.productId)||{...line,qty:0,total:0};current.qty+=line.qty;current.total+=line.total;groups.set(line.productId,current);return groups;},new Map<number,{productId:number;productName:string;qty:number;unitPrice:number;total:number}>()).values()).map(line=>({...line,remaining:Math.max(0,line.qty-(returned[String(line.productId)]||0))})):[];
  const amount=remaining.reduce((sum,line)=>{const qty=Number((quantities[String(line.productId)]||'0').replace(',','.'));return sum+(Number.isFinite(qty)&&line.qty?line.total*qty/line.qty:0);},0);
  const submit=()=>{if(!invoice){Alert.alert(tr('اختار الفاتورة'),tr('اختار فاتورة أولاً.'));return;}const parsed=Object.fromEntries(Object.entries(quantities).map(([key,value])=>[key,Number(value.replace(',','.'))]));try{onCreate(invoice,parsed);setQuantities({});setInvoiceId('');}catch(error){Alert.alert(tr('تعذر إنشاء سند الإرجاع'),error instanceof Error?tr(error.message):tr('راجع الكميات.'));}};
  return <ScrollView contentContainerStyle={{paddingBottom:20}}>
    <View style={{backgroundColor:'#1B1B1B',padding:14,borderRadius:12,borderWidth:1,borderColor:'#444'}}>
      <Text style={{color:gold,fontSize:18,fontWeight:'800',marginBottom:10}}>{tr('إنشاء أفوار / سند إرجاع')}</Text>
      {invoices.length===0?<Text style={{color:'#aaa'}}>{tr('ما كايناش فاتورة قابلة للإرجاع.')}</Text>:invoices.map(item=><Pressable key={item.id} onPress={()=>{setInvoiceId(String(item.id));setQuantities({});}} style={{padding:10,marginBottom:6,borderWidth:1,borderColor:invoiceId===String(item.id)?gold:'#393939',borderRadius:8}}><Text style={{color:'#fff',textAlign:rtl?'right':'left'}}>{item.number} • {item.customerName} • {item.total.toFixed(2)} DH</Text></Pressable>)}
      {invoice&&remaining.map((line,index)=><View key={invoice.id+'-'+line.productId+'-'+index} style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:8}}><Text style={{color:'#eee',flex:1,textAlign:rtl?'right':'left'}}>{line.productName} ({tr('باقي للإرجاع')}: {line.remaining})</Text><TextInput value={quantities[String(line.productId)]||''} onChangeText={value=>setQuantities(current=>({...current,[String(line.productId)]:value}))} keyboardType="decimal-pad" placeholder={tr('الكمية')} placeholderTextColor="#888" style={{width:86,backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:8,padding:9,color:'#fff',textAlign:'center'}}/></View>)}
      {invoice&&<><Text style={{color:gold,fontWeight:'800',marginTop:12}}>{tr('قيمة الإرجاع')}: {amount.toFixed(2)} DH</Text><Pressable onPress={submit} style={{backgroundColor:gold,padding:12,borderRadius:9,alignItems:'center',marginTop:10}}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('تأكيد الإرجاع وإضافة للمخزون')}</Text></Pressable></>}
    </View>
    <Text style={{color:gold,fontSize:17,fontWeight:'800',marginVertical:12}}>{tr('سجل الأفوارات')} ({creditNotes.length})</Text>
    {creditNotes.map(note=><View key={note.id} style={{backgroundColor:'#1B1B1B',padding:12,borderRadius:10,marginBottom:8}}><Text style={{color:'#fff',fontWeight:'800'}}>{note.number} • {note.customerName}</Text><Text style={{color:'#aaa',marginTop:4}}>{note.date} • {tr('فاتورة الأصل')}: {note.sourceInvoiceId}</Text><Text style={{color:gold,fontWeight:'800',marginTop:5}}>{note.total.toFixed(2)} DH</Text><Pressable onPress={()=>onPdf('Avoir',note.customerName,note.lines.map(line=>`${line.productName} × ${line.qty} — ${line.total.toFixed(2)} DH`),note.total)} style={{alignSelf:rtl?'flex-end':'flex-start',padding:8,borderWidth:1,borderColor:gold,borderRadius:7,marginTop:7}}><Text style={{color:gold,fontWeight:'800'}}>PDF</Text></Pressable></View>)}
  </ScrollView>;
}
