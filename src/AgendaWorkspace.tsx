import React,{useMemo,useState} from 'react';
import {View,StyleSheet} from 'react-native';
import {TText as Text,TTextInput as TextInput} from './i18n';
import AccessiblePressable from './AccessiblePressable';
import {buildAgendaEvents,AgendaTask,AgendaWorkOrder,AgendaRecurringExpense,AgendaInvoice,AgendaEvent} from './domain/agenda';
type Props={tasks:AgendaTask[];workOrders:AgendaWorkOrder[];recurringExpenses:AgendaRecurringExpense[];invoices:AgendaInvoice[];onNavigate:(type:AgendaEvent['type'])=>void};
const GOLD='#D6AE55';
const localToday=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const addDays=(value:string,n:number)=>{const d=new Date(value+'T00:00:00.000Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const typeLabel=(type:AgendaEvent['type'])=>type==='task'?'مهمة':type==='work_order'?'أمر تركيب':type==='recurring_expense'?'مصروف متكرر':'استحقاق فاتورة';
export default function AgendaWorkspace({tasks,workOrders,recurringExpenses,invoices,onNavigate}:Props){
 const today=localToday();const [fromDate,setFromDate]=useState(today);const [toDate,setToDate]=useState(addDays(today,30));
 const result=useMemo(()=>{try{return {events:buildAgendaEvents({tasks,workOrders,recurringExpenses,invoices,fromDate,toDate,today}),error:''};}catch(error){return {events:[],error:error instanceof Error?error.message:'نطاق تاريخ غير صالح'};}},[tasks,workOrders,recurringExpenses,invoices,fromDate,toDate,today]);
 const overdue=result.events.filter(e=>e.overdue).length;
 return <View>
  <View style={styles.panel}><Text style={styles.title}>الأجندة والمواعيد</Text><Text style={styles.note}>كتجمع المهام وأوامر التركيب واستحقاقات المصاريف والفواتير فترتيب زمني واحد.</Text>
   <TextInput value={fromDate} onChangeText={setFromDate} placeholder="من تاريخ YYYY-MM-DD" placeholderTextColor="#888" style={styles.input}/>
   <TextInput value={toDate} onChangeText={setToDate} placeholder="إلى تاريخ YYYY-MM-DD" placeholderTextColor="#888" style={styles.input}/>
   <View style={styles.row}><View style={styles.metric}><Text style={styles.metricValue}>{result.events.length}</Text><Text style={styles.note}>المواعيد</Text></View><View style={styles.metric}><Text style={[styles.metricValue,{color:'#E28A78'}]}>{overdue}</Text><Text style={styles.note}>متأخرة</Text></View></View>
  </View>
  {!!result.error&&<Text style={styles.error}>{result.error}</Text>}
  <Text style={styles.section}>المواعيد حسب التاريخ</Text>
  {result.events.map(event=><AccessiblePressable key={event.id} onPress={()=>onNavigate(event.type)} style={styles.event}>
   <View style={{flex:1}}><Text style={styles.label}>{event.title}</Text><Text style={styles.note}>{typeLabel(event.type)} • {event.date}</Text>{!!event.subtitle&&<Text style={styles.note}>{event.subtitle}</Text>}</View>
   <Text style={[styles.status,event.overdue&&styles.overdue]}>{event.overdue?'متأخر':event.status}</Text>
  </AccessiblePressable>)}
  {result.events.length===0&&!result.error&&<Text style={styles.note}>ما كاين حتى موعد فهاد الفترة.</Text>}
 </View>;
}
const styles=StyleSheet.create({panel:{backgroundColor:'#1B1B1B',padding:16,borderRadius:14,borderWidth:1,borderColor:'#444'},title:{color:GOLD,fontSize:19,fontWeight:'800',marginBottom:8},note:{color:'#BBB',fontSize:12,marginVertical:3},input:{backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:12,color:'#FFF',marginBottom:9,textAlign:'right'},row:{flexDirection:'row',gap:8,marginTop:6},metric:{flex:1,backgroundColor:'#111',borderRadius:9,padding:10,alignItems:'center'},metricValue:{color:GOLD,fontSize:22,fontWeight:'900'},section:{color:'#FFF',fontWeight:'800',fontSize:17,marginTop:18,marginBottom:9},event:{backgroundColor:'#1B1B1B',borderWidth:1,borderColor:'#333',borderRadius:10,padding:12,marginBottom:8,flexDirection:'row',alignItems:'center',gap:8},label:{color:'#FFF',fontWeight:'700'},status:{color:GOLD,fontSize:11,fontWeight:'800'},overdue:{color:'#E28A78'},error:{color:'#E28A78',marginTop:8}});
