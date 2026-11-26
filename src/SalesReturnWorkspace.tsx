import React,{useMemo,useState} from 'react';
import {Alert,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {translate} from './i18n';
import {quantityAvailableForReturn,saleReturnKey,SaleForReturn,SalesReturnRecord} from './domain/sales-returns';

type Props={language:'AR'|'FR';sales:SaleForReturn[];returns:SalesReturnRecord[];onCreate:(input:{sale:SaleForReturn;quantity:number;reason:string;restock:boolean})=>boolean;onPdf:(item:SalesReturnRecord)=>void;onRefund:(item:SalesReturnRecord,amount:number)=>void};
const gold='#D6AE55';
const panel={backgroundColor:'#1B1B1B',padding:15,borderRadius:13,borderWidth:1,borderColor:'#444'} as const;
const input={backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:11,color:'#FFF',marginBottom:9,textAlign:'auto' as const};
const button={backgroundColor:gold,borderRadius:9,padding:12,alignItems:'center' as const,marginTop:5};

export default function SalesReturnWorkspace({language,sales,returns,onCreate,onPdf,onRefund}:Props){
  const tr=(value:string)=>translate(language,value);
  const [selectedSaleId,setSelectedSaleId]=useState('');
  const [quantity,setQuantity]=useState('1');
  const [reason,setReason]=useState('');
  const [restock,setRestock]=useState(true);
  const [refundAmounts,setRefundAmounts]=useState<Record<number,string>>({});
  const options=useMemo(()=>sales.map(sale=>({sale,key:saleReturnKey(sale),available:quantityAvailableForReturn(sale,returns)})).filter(item=>item.available>0),[sales,returns]);
  const selected=options.find(item=>item.key===selectedSaleId);
  const selectedSale=selected?.sale;
  const remaining=selected?.available??0;
  const save=()=>{
    const amount=Number(quantity.replace(',','.'));
    if(!selectedSale||!Number.isFinite(amount)||amount<=0||amount>remaining){Alert.alert(tr('تعذر تسجيل المرتجع'),tr('اختار بيعاً وكمية لا تتجاوز المتبقي.'));return;}
    if(onCreate({sale:selectedSale,quantity:amount,reason,restock:restock&&selectedSale.canRestock!==false})){setSelectedSaleId('');setQuantity('1');setReason('');setRestock(true);}
  };
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom:20}}>
    <View style={panel}>
      <Text style={{color:gold,fontSize:19,fontWeight:'800',marginBottom:12}}>{tr('تسجيل مرتجع وإشعار دائن')}</Text>
      <Text style={{color:'#CCC',marginBottom:7}}>{tr('اختار البيع')}</Text>
      {options.map(({sale,key,available})=><Pressable key={key} accessibilityRole="button" accessibilityState={{selected:selectedSaleId===key}} onPress={()=>{setSelectedSaleId(key);setRestock(sale.canRestock!==false);}} style={{borderWidth:1,borderColor:selectedSaleId===key?gold:'#393939',borderRadius:8,padding:10,marginBottom:6}}>
        <Text style={{color:'#FFF',fontWeight:'700'}}>{sale.productName} • {sale.customerName}</Text>
        <Text style={{color:'#CCC',marginTop:4}}>{[sale.reference,sale.date].filter(Boolean).join(' • ')}</Text>
        <Text style={{color:'#AAA',marginTop:4}}>{tr('الكمية المباعة')}: {sale.qty} • {tr('المتبقي للمرتجع')}: {available} • {sale.total.toFixed(2)} DH</Text>
      </Pressable>)}
      {options.length===0&&<Text style={{color:'#999',padding:8}}>{tr('ما كاين حتى سطر بيع باقي قابل للمرتجع.')}</Text>}
      {selectedSale&&<>
        <TextInput value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder={tr('كمية المرتجع')} placeholderTextColor="#888" style={input}/>
        <Text style={{color:'#AAA',marginBottom:8}}>{tr('المتوفر للمرتجع')}: {remaining}</Text>
        <TextInput value={reason} onChangeText={setReason} placeholder={tr('سبب المرتجع (اختياري)')} placeholderTextColor="#888" style={input}/>
        {selectedSale.canRestock===false?<Text style={{color:'#CCC',marginBottom:7}}>{tr('يمكن تسجّل إشعار دائن فقط. مصدر المخزون أو تكلفة الخروج ما مؤكداش.')}</Text>:<>
        <Text style={{color:'#CCC',marginBottom:7}}>{tr('إرجاع المنتج للمخزون؟')}</Text>
        <View style={{flexDirection:'row',gap:8}}>{[true,false].map(value=><Pressable key={String(value)} onPress={()=>setRestock(value)} style={{borderWidth:1,borderColor:restock===value?gold:'#444',borderRadius:8,padding:9}}><Text style={{color:restock===value?gold:'#DDD'}}>{tr(value?'نعم':'لا')}</Text></Pressable>)}</View>
        </>}
        <Pressable onPress={save} style={button}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('تأكيد المرتجع')}</Text></Pressable>
      </>}
    </View>
    <Text style={{color:'#FFF',fontWeight:'800',fontSize:17,marginTop:18,marginBottom:10}}>{tr('سجل المرتجعات')} ({returns.length})</Text>
    {returns.map(item=><View key={item.id} style={[panel,{marginBottom:8}]}><Text style={{color:'#FFF',fontWeight:'800'}}>{item.number} • {item.productName} • {item.customerName}</Text><Text style={{color:'#AAA',marginTop:4}}>{item.date} • {tr('الكمية')}: {item.qty} • {tr(item.restocked?'عاد للمخزون':'لم يعد للمخزون')}</Text>{!!item.reason&&<Text style={{color:'#AAA',marginTop:4}}>{tr('السبب')}: {item.reason}</Text>}{!!item.invoiceAllocations?.length&&<Text style={{color:'#AAA',marginTop:4}}>{tr('المخصوم من دين الفاتورة:')} {(item.invoiceAllocations.reduce((sum,allocation)=>sum+allocation.allocatedCentimes,0)/100).toFixed(2)} DH</Text>}<Text style={{color:gold,marginTop:4}}>{tr('رصيد لصالح الزبون:')} {((item.unappliedCentimes||0)/100).toFixed(2)} DH</Text>{(item.refunds||[]).map(refund=><Text key={refund.id} style={{color:'#AAA',marginTop:4}}>{tr('رد نقدي')}: {(refund.amountCentimes/100).toFixed(2)} DH • {refund.date}</Text>)}{(item.unappliedCentimes||0)>0&&<View style={{marginTop:8}}><TextInput value={refundAmounts[item.id]||''} onChangeText={value=>setRefundAmounts(current=>({...current,[item.id]:value}))} keyboardType="decimal-pad" placeholder={tr('مبلغ الرد DH')} placeholderTextColor="#888" style={input}/><Pressable onPress={()=>{const amount=Number((refundAmounts[item.id]||'').replace(',','.'));if(!Number.isFinite(amount)||amount<=0){Alert.alert(tr('تعذر تسجيل المرتجع'),tr('مبلغ الرد خاصو يكون أكبر من صفر.'));return;}if(Math.round(amount*100)>(item.unappliedCentimes||0)){Alert.alert(tr('تعذر تسجيل المرتجع'),tr('مبلغ الرد أكبر من رصيد الزبون المتاح.'));return;}onRefund(item,amount);setRefundAmounts(current=>({...current,[item.id]:''}));}} style={button}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('رد نقدي')}</Text></Pressable></View>}<Text style={{color:gold,fontWeight:'900',fontSize:16,marginTop:7}}>{item.total.toFixed(2)} DH</Text><Pressable onPress={()=>onPdf(item)} style={{alignSelf:'flex-start',padding:8,borderWidth:1,borderColor:gold,borderRadius:8,marginTop:7}}><Text style={{color:gold,fontWeight:'800'}}>PDF</Text></Pressable></View>)}
    {returns.length===0&&<Text style={{color:'#999',textAlign:'center',padding:12}}>{tr('مازال ما تسجل حتى مرتجع.')}</Text>}
  </ScrollView>;
}
