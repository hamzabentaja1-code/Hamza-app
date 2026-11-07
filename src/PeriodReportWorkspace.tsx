import React,{useMemo,useState} from 'react';
import {View,StyleSheet} from 'react-native';
import {TText as Text,TTextInput as TextInput} from './i18n';
import {buildPeriodReport,DatedAmount} from './domain/period-report';
const GOLD='#D6AE55';
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const monthStart=()=>today().slice(0,8)+'01';
const money=(v:number)=>(Number.isFinite(v)?v:0).toFixed(2)+' DH';
export default function PeriodReportWorkspace({sales,salesReturns,purchases,supplierReturns,expenses}:{sales:DatedAmount[];salesReturns:DatedAmount[];purchases:DatedAmount[];supplierReturns:DatedAmount[];expenses:DatedAmount[]}){
 const [fromDate,setFromDate]=useState(monthStart());const [toDate,setToDate]=useState(today());
 const report=useMemo(()=>{try{return {data:buildPeriodReport({sales,salesReturns,purchases,supplierReturns,expenses,fromDate,toDate}),error:''};}catch(error){return {data:null,error:error instanceof Error?error.message:'فترة غير صالحة'};}},[sales,salesReturns,purchases,supplierReturns,expenses,fromDate,toDate]);
 const metrics=report.data?[
  {label:'المبيعات الإجمالية',key:'salesGross' as const},
  {label:'مرتجعات الزبناء',key:'salesReturns' as const},
  {label:'صافي المبيعات',key:'netSales' as const},
  {label:'المشتريات الإجمالية',key:'purchasesGross' as const},
  {label:'مرتجعات الموردين',key:'supplierReturns' as const},
  {label:'صافي المشتريات',key:'netPurchases' as const},
  {label:'المصاريف',key:'expenses' as const},
  {label:'مؤشر تشغيلي أولي',key:'operatingIndicator' as const},
 ]:[];
 return <View>
  <View style={styles.panel}><Text style={styles.title}>تحليل مالي حسب الفترة</Text>
   <TextInput value={fromDate} onChangeText={setFromDate} placeholder="من تاريخ YYYY-MM-DD" placeholderTextColor="#888" style={styles.input}/>
   <TextInput value={toDate} onChangeText={setToDate} placeholder="إلى تاريخ YYYY-MM-DD" placeholderTextColor="#888" style={styles.input}/>
   {report.error?<Text style={styles.error}>{report.error}</Text>:report.data&&<Text style={styles.note}>الفترة: {report.data.fromDate} إلى {report.data.toDate} • المقارنة: {report.data.previousFromDate} إلى {report.data.previousToDate}</Text>}
  </View>
  {report.data&&<>
   <Text style={styles.section}>الفترة الحالية مقابل الفترة السابقة</Text>
   {metrics.map(item=>{const current=report.data!.current[item.key],previous=report.data!.previous[item.key],difference=current-previous;return <View key={item.key} style={styles.metric}>
    <Text style={styles.label}>{item.label}</Text>
    <View style={styles.row}><View style={{flex:1}}><Text style={styles.value}>{money(current)}</Text><Text style={styles.note}>الحالية</Text></View><View style={{flex:1}}><Text style={styles.previous}>{money(previous)}</Text><Text style={styles.note}>السابقة</Text></View><View style={{flex:1}}><Text style={[styles.value,{color:difference>=0?'#73C99A':'#E28A78'}]}>{difference>=0?'+':''}{money(difference)}</Text><Text style={styles.note}>الفرق</Text></View></View>
   </View>})}
   <Text style={styles.note}>المؤشر التشغيلي الأولي = صافي المبيعات − صافي المشتريات − المصاريف. ليس ربحاً محاسبياً نهائياً ولا يشمل كل التكاليف والضرائب.</Text>
   {report.data.unparsedDates>0&&<Text style={styles.warning}>تعذر تحليل تاريخ {report.data.unparsedDates} حركة قديمة؛ لم تدخل في الفترة.</Text>}
  </>}
 </View>;
}
const styles=StyleSheet.create({panel:{backgroundColor:'#1B1B1B',padding:16,borderRadius:14,borderWidth:1,borderColor:'#444'},title:{color:GOLD,fontSize:19,fontWeight:'800',marginBottom:12},input:{backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:12,color:'#FFF',marginBottom:9,textAlign:'right'},note:{color:'#BBB',fontSize:12,marginVertical:4},section:{color:'#FFF',fontWeight:'800',fontSize:17,marginTop:18,marginBottom:9},metric:{backgroundColor:'#1B1B1B',borderWidth:1,borderColor:'#333',borderRadius:10,padding:12,marginBottom:8},label:{color:'#FFF',fontWeight:'700'},row:{flexDirection:'row',gap:8,marginTop:8},value:{color:GOLD,fontSize:15,fontWeight:'900'},previous:{color:'#BBB',fontSize:14,fontWeight:'800'},error:{color:'#E28A78'},warning:{color:'#E7B66A',marginTop:8}});
