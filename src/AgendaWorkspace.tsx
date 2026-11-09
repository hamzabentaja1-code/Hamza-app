import React,{useContext,useMemo,useState} from 'react';
import {View,StyleSheet} from 'react-native';
import {TText as Text,TTextInput as TextInput,LanguageContext,translateText} from './i18n';
import AccessiblePressable from './AccessiblePressable';
import {buildAgendaEvents,buildAgendaMonthGrid,AgendaTask,AgendaWorkOrder,AgendaRecurringExpense,AgendaInvoice,AgendaEvent,AgendaEventType,filterAgendaEvents} from './domain/agenda';
type Props={tasks:AgendaTask[];workOrders:AgendaWorkOrder[];recurringExpenses:AgendaRecurringExpense[];invoices:AgendaInvoice[];onNavigate:(type:AgendaEvent['type'])=>void};
const GOLD='#D6AE55';
const localToday=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const addDays=(value:string,n:number)=>{const d=new Date(value+'T00:00:00.000Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const monthBounds=(month:string)=>{const [year,number]=month.split('-').map(Number);const first=month+'-01';const last=new Date(Date.UTC(year,number,0)).toISOString().slice(0,10);return {first,last};};
const shiftMonth=(month:string,delta:number)=>{const [year,number]=month.split('-').map(Number);const date=new Date(Date.UTC(year,number-1+delta,1));return date.getUTCFullYear()+'-'+String(date.getUTCMonth()+1).padStart(2,'0');};
const typeLabel=(type:AgendaEvent['type'])=>type==='task'?'مهمة':type==='work_order'?'أمر تركيب':type==='recurring_expense'?'مصروف متكرر':'استحقاق فاتورة';
export default function AgendaWorkspace({tasks,workOrders,recurringExpenses,invoices,onNavigate}:Props){
 const language=useContext(LanguageContext);const t=(value:string)=>translateText(value,language)||value;
 const today=localToday();const [fromDate,setFromDate]=useState(today);const [toDate,setToDate]=useState(addDays(today,30));const [calendarMonth,setCalendarMonth]=useState(today.slice(0,7));
 const [eventType,setEventType]=useState<AgendaEventType|'all'>('all');const [overdueOnly,setOverdueOnly]=useState(false);const [eventSearch,setEventSearch]=useState('');
 const calendar=useMemo(()=>{try{const bounds=monthBounds(calendarMonth);const events=buildAgendaEvents({tasks,workOrders,recurringExpenses,invoices,fromDate:bounds.first,toDate:bounds.last,today});const [year,month]=calendarMonth.split('-').map(Number);return {days:buildAgendaMonthGrid(year,month,events),error:''};}catch(error){return {days:[],error:error instanceof Error?error.message:'التقويم غير صالح'};}},[tasks,workOrders,recurringExpenses,invoices,calendarMonth,today]);
 const result=useMemo(()=>{try{return {events:buildAgendaEvents({tasks,workOrders,recurringExpenses,invoices,fromDate,toDate,today}),error:''};}catch(error){return {events:[],error:error instanceof Error?error.message:'نطاق تاريخ غير صالح'};}},[tasks,workOrders,recurringExpenses,invoices,fromDate,toDate,today]);
 const monthTitle=useMemo(()=>{const [year,month]=calendarMonth.split('-').map(Number);return new Intl.DateTimeFormat(language==='AR'?'ar-MA':'fr-FR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1)));},[calendarMonth,language]);
 const weekDays=['الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','الأحد'];
 const filteredEvents=useMemo(()=>filterAgendaEvents(result.events,{type:eventType,overdueOnly,query:eventSearch}),[result.events,eventType,overdueOnly,eventSearch]);
 const overdue=filteredEvents.filter(e=>e.overdue).length;
 const types: Array<{value:AgendaEventType|'all';label:string}>=[{value:'all',label:'جميع الأنواع'},{value:'task',label:'المهام'},{value:'work_order',label:'أوامر التركيب'},{value:'recurring_expense',label:'المصاريف المتكررة'},{value:'invoice_due',label:'استحقاقات الفواتير'}];
 return <View>
  <View style={styles.panel}><Text style={styles.title}>الأجندة والمواعيد</Text><Text style={styles.note}>كتجمع المهام وأوامر التركيب واستحقاقات المصاريف والفواتير فترتيب زمني واحد.</Text>
   <View style={styles.monthHeader}>
    <AccessiblePressable accessibilityLabel={t('الشهر السابق')} accessibilityHint={t('عرض الشهر السابق في التقويم')} onPress={()=>setCalendarMonth(v=>shiftMonth(v,-1))} style={styles.monthButton}><Text style={styles.monthArrow}>‹</Text></AccessiblePressable>
    <Text style={styles.monthTitle}>{monthTitle}</Text>
    <AccessiblePressable accessibilityLabel={t('الشهر التالي')} accessibilityHint={t('عرض الشهر التالي في التقويم')} onPress={()=>setCalendarMonth(v=>shiftMonth(v,1))} style={styles.monthButton}><Text style={styles.monthArrow}>›</Text></AccessiblePressable>
   </View>
   <View style={styles.calendarGrid}>
    {weekDays.map(day=><View key={day} style={styles.weekday}><Text style={styles.weekdayText}>{t(day)}</Text></View>)}
    {calendar.days.map(day=><AccessiblePressable key={day.date} accessibilityLabel={t(day.inMonth?'يوم من الشهر':'يوم من شهر مجاور')+' '+day.date+'، '+day.events.length+' '+t('مواعيد')} accessibilityHint={t('اضغط لعرض مواعيد هذا اليوم')} accessibilityState={{selected:fromDate===day.date&&toDate===day.date}} onPress={()=>{setFromDate(day.date);setToDate(day.date);}} style={[styles.dayCell,!day.inMonth&&styles.outsideDay,fromDate===day.date&&toDate===day.date&&styles.selectedDay]}>
      <Text style={[styles.dayNumber,!day.inMonth&&styles.outsideDayText]}>{day.day}</Text>
      {day.events.length>0&&<Text style={styles.eventCount}>{day.events.length}</Text>}
    </AccessiblePressable>)}
   </View>
   {!!calendar.error&&<Text style={styles.error}>{calendar.error}</Text>}
   <Text style={styles.calendarHint}>{t('اختار نهار باش تشوف المواعيد ديالو')}</Text>
   <TextInput value={fromDate} onChangeText={setFromDate} placeholder="من تاريخ YYYY-MM-DD" placeholderTextColor="#888" style={styles.input}/>
   <TextInput value={toDate} onChangeText={setToDate} placeholder="إلى تاريخ YYYY-MM-DD" placeholderTextColor="#888" style={styles.input}/>
   <TextInput value={eventSearch} onChangeText={setEventSearch} placeholder={t('البحث في المواعيد')} accessibilityLabel={t('البحث في المواعيد')} placeholderTextColor="#888" style={styles.input}/>
   <View style={styles.filterRow}>{types.map(option=><AccessiblePressable key={option.value} accessibilityLabel={t(option.label)} accessibilityState={{selected:eventType===option.value}} onPress={()=>setEventType(option.value)} style={[styles.filterButton,eventType===option.value&&styles.selectedFilter]}><Text style={styles.filterText}>{t(option.label)}</Text></AccessiblePressable>)}</View>
   <AccessiblePressable accessibilityRole="button" accessibilityLabel={t('المتأخرة فقط')} accessibilityState={{selected:overdueOnly}} onPress={()=>setOverdueOnly(value=>!value)} style={[styles.filterButton,overdueOnly&&styles.selectedFilter,{alignSelf:'flex-start',marginVertical:8}]}><Text style={styles.filterText}>{t('المتأخرة فقط')}</Text></AccessiblePressable>
   <View style={styles.row}><View style={styles.metric}><Text style={styles.metricValue}>{filteredEvents.length}</Text><Text style={styles.note}>المواعيد</Text></View><View style={styles.metric}><Text style={[styles.metricValue,{color:'#E28A78'}]}>{overdue}</Text><Text style={styles.note}>متأخرة</Text></View></View>
  </View>
  {!!result.error&&<Text style={styles.error}>{result.error}</Text>}
  <Text style={styles.section}>المواعيد حسب التاريخ</Text>
  {filteredEvents.map(event=><AccessiblePressable key={event.id} accessibilityLabel={event.title+'، '+t(typeLabel(event.type))+'، '+event.date} accessibilityHint={t('فتح القسم المرتبط بهذا الموعد')} onPress={()=>onNavigate(event.type)} style={styles.event}>
   <View style={{flex:1}}><Text style={styles.label}>{event.title}</Text><Text style={styles.note}>{typeLabel(event.type)} • {event.date}</Text>{!!event.subtitle&&<Text style={styles.note}>{event.subtitle}</Text>}</View>
   <Text style={[styles.status,event.overdue&&styles.overdue]}>{event.overdue?'متأخر':event.status}</Text>
  </AccessiblePressable>)}
  {filteredEvents.length===0&&!result.error&&<Text style={styles.note}>ما كاين حتى موعد فهاد الفترة.</Text>}
 </View>;
}
const styles=StyleSheet.create({panel:{backgroundColor:'#1B1B1B',padding:16,borderRadius:14,borderWidth:1,borderColor:'#444'},title:{color:GOLD,fontSize:19,fontWeight:'800',marginBottom:8},note:{color:'#BBB',fontSize:12,marginVertical:3},input:{backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:12,color:'#FFF',marginBottom:9,textAlign:'right'},row:{flexDirection:'row',gap:8,marginTop:6},metric:{flex:1,backgroundColor:'#111',borderRadius:9,padding:10,alignItems:'center'},metricValue:{color:GOLD,fontSize:22,fontWeight:'900'},section:{color:'#FFF',fontWeight:'800',fontSize:17,marginTop:18,marginBottom:9},event:{backgroundColor:'#1B1B1B',borderWidth:1,borderColor:'#333',borderRadius:10,padding:12,marginBottom:8,flexDirection:'row',alignItems:'center',gap:8},label:{color:'#FFF',fontWeight:'700'},status:{color:GOLD,fontSize:11,fontWeight:'800'},overdue:{color:'#E28A78'},error:{color:'#E28A78',marginTop:8},filterRow:{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:6},filterButton:{minHeight:44,paddingHorizontal:11,paddingVertical:10,borderRadius:8,borderWidth:1,borderColor:'#444',backgroundColor:'#111',justifyContent:'center'},selectedFilter:{borderColor:GOLD,backgroundColor:'#302817'},filterText:{color:'#FFF',fontSize:12,fontWeight:'700'},monthHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginVertical:10},monthTitle:{color:'#FFF',fontSize:16,fontWeight:'800'},monthButton:{width:40,height:40,borderRadius:10,backgroundColor:'#111',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#444'},monthArrow:{color:GOLD,fontSize:28,lineHeight:32},calendarGrid:{flexDirection:'row',flexWrap:'wrap',gap:3},weekday:{width:'13.7%',minHeight:26,alignItems:'center',justifyContent:'center'},weekdayText:{color:'#BBB',fontSize:10,fontWeight:'700'},dayCell:{width:'13.7%',minHeight:44,marginBottom:2,backgroundColor:'#111',borderRadius:7,borderWidth:1,borderColor:'#333',alignItems:'center',justifyContent:'center',gap:1},outsideDay:{opacity:0.45},selectedDay:{borderColor:GOLD,backgroundColor:'#302817'},dayNumber:{color:'#FFF',fontSize:13,fontWeight:'800'},outsideDayText:{color:'#888'},eventCount:{color:GOLD,fontSize:9,fontWeight:'900'},calendarHint:{color:'#AAA',fontSize:11,marginBottom:8}});
