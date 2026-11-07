import React,{useMemo,useState} from 'react';
import {View,StyleSheet} from 'react-native';
import AccessiblePressable from './AccessiblePressable';
const Pressable=AccessiblePressable;
import {TText as Text,TTextInput as TextInput} from './i18n';
import {buildPeriodReport,DatedAmount} from './domain/period-report';
import {buildMonthlyTrend,buildSupplierPurchaseComparison} from './domain/report-analytics';
const GOLD='#D6AE55';
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const monthStart=()=>today().slice(0,8)+'01';
const money=(v:number)=>(Number.isFinite(v)?v:0).toFixed(2)+' DH';
export default function PeriodReportWorkspace({sales,salesReturns,purchases,supplierReturns,expenses,purchaseRows,supplierReturnRows,onExportPdf,onExportCsv}:{sales:DatedAmount[];salesReturns:DatedAmount[];purchases:DatedAmount[];supplierReturns:DatedAmount[];expenses:DatedAmount[];purchaseRows:{date:string;supplierName:string;amount:number}[];supplierReturnRows:{date:string;supplierName:string;amount:number}[];onExportPdf:(title:string,lines:string[])=>void;onExportCsv:(title:string,rows:string[][])=>void}){
 const [fromDate,setFromDate]=useState(monthStart());const [toDate,setToDate]=useState(today());
 const report=useMemo(()=>{try{return {data:buildPeriodReport({sales,salesReturns,purchases,supplierReturns,expenses,fromDate,toDate}),error:''};}catch(error){return {data:null,error:error instanceof Error?error.message:'فترة غير صالحة'};}},[sales,salesReturns,purchases,supplierReturns,expenses,fromDate,toDate]);
 const analytics=useMemo(()=>{try{return {trend:buildMonthlyTrend({sales,salesReturns,purchases,supplierReturns,expenses,fromDate,toDate}),suppliers:buildSupplierPurchaseComparison(purchaseRows,supplierReturnRows,fromDate,toDate),error:''};}catch(error){return {trend:[],suppliers:[],error:error instanceof Error?error.message:'تعذر تحليل الموردين'};}},[sales,salesReturns,purchases,supplierReturns,expenses,purchaseRows,supplierReturnRows,fromDate,toDate]);
 const maxMonthly=Math.max(1,...analytics.trend.flatMap(row=>[row.sales,row.purchases]));
 const maxSupplier=Math.max(1,...analytics.suppliers.map(row=>row.netPurchases));
 const exportReport=()=>{
  if(!report.data)return;
  const lines=[
   'Période : '+report.data.fromDate+' — '+report.data.toDate,
   'Période précédente : '+report.data.previousFromDate+' — '+report.data.previousToDate,
   ...metrics.map(item=>item.label+' : '+money(report.data!.current[item.key])+' | précédent : '+money(report.data!.previous[item.key])),
   'Indicateur opérationnel : '+money(report.data.current.operatingIndicator),
   ...analytics.trend.map(row=>row.month+' • ventes '+money(row.sales)+' • achats '+money(row.purchases)+' • retours ventes '+money(row.salesReturns)+' • retours fournisseurs '+money(row.supplierReturns)+' • dépenses '+money(row.expenses)),
   ...analytics.suppliers.map(row=>'Fournisseur '+row.supplierName+' • net '+money(row.netPurchases)+' • brut '+money(row.grossPurchases)+' • retours '+money(row.returns)),
  ];
  onExportPdf('Rapport de période '+report.data.fromDate+' - '+report.data.toDate,lines);
 };
 const exportCsv=()=>{
  if(!report.data)return;
  const rows:string[][]=[
   ['Type','Label','Période début','Période fin','Valeur actuelle DH','Valeur de comparaison DH','Détails'],
   ...metrics.map(item=>['Résumé',item.label,report.data!.fromDate,report.data!.toDate,String(report.data!.current[item.key]),String(report.data!.previous[item.key]),'']),
   ['Résumé','Indicateur opérationnel',report.data.fromDate,report.data.toDate,String(report.data.current.operatingIndicator),'','Indicateur préliminaire, pas un bénéfice comptable final'],
   ...analytics.trend.map(row=>['Tendance mensuelle',row.month,row.month,row.month,String(row.sales),String(row.purchases),'Retours ventes '+row.salesReturns+'; retours fournisseurs '+row.supplierReturns+'; dépenses '+row.expenses]),
   ...analytics.suppliers.map(row=>['Fournisseur',row.supplierName,report.data!.fromDate,report.data!.toDate,String(row.netPurchases),String(row.grossPurchases),'Retours '+row.returns+'; achats '+row.purchaseCount]),
  ];  onExportCsv('HamZa - Rapport '+report.data.fromDate+' - '+report.data.toDate,rows);
 };
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
   <Pressable accessibilityRole="button" onPress={exportReport} style={styles.export}><Text style={styles.exportText}>تصدير التقرير PDF</Text></Pressable>
   <Pressable accessibilityRole="button" onPress={exportCsv} style={[styles.export,{backgroundColor:'#242424',borderWidth:1,borderColor:GOLD}]}><Text style={[styles.exportText,{color:GOLD}]}>تصدير التقرير CSV</Text></Pressable>
   <Text style={styles.section}>الاتجاه الشهري</Text>
   {analytics.trend.map(row=><View key={row.month} style={styles.metric}>
    <Text style={styles.label}>{row.month}</Text>
    <Text style={styles.note}>المبيعات: {money(row.sales)} • المشتريات: {money(row.purchases)}</Text>
    <View style={styles.track}><View style={[styles.bar,{width:((row.sales/maxMonthly*100)+'%') as `${number}%`}]}/></View>
    <View style={styles.track}><View style={[styles.purchaseBar,{width:((row.purchases/maxMonthly*100)+'%') as `${number}%`}]}/></View>
    <Text style={styles.note}>مرتجعات المبيعات: {money(row.salesReturns)} • مرتجعات الموردين: {money(row.supplierReturns)} • المصاريف: {money(row.expenses)}</Text>
   </View>)}
   <Text style={styles.section}>مقارنة الموردين حسب صافي المشتريات</Text>
   {analytics.suppliers.map(row=><View key={row.supplierName} style={styles.metric}>
    <Text style={styles.label}>{row.supplierName}</Text>
    <Text style={styles.value}>{money(row.netPurchases)}</Text>
    <View style={styles.track}><View style={[styles.purchaseBar,{width:((Math.max(0,row.netPurchases)/maxSupplier*100)+'%') as `${number}%`}]}/></View>
    <Text style={styles.note}>عدد المشتريات: {row.purchaseCount} • الإجمالي: {money(row.grossPurchases)} • المرتجعات: {money(row.returns)}</Text>
   </View>)}
   {analytics.suppliers.length===0?<Text style={styles.note}>لا توجد مشتريات موردين في الفترة المحددة.</Text>:null}
   {report.data.unparsedDates>0&&<Text style={styles.warning}>تعذر تحليل تاريخ {report.data.unparsedDates} حركة قديمة؛ لم تدخل في الفترة.</Text>}
  </>}
 </View>;
}
const styles=StyleSheet.create({panel:{backgroundColor:'#1B1B1B',padding:16,borderRadius:14,borderWidth:1,borderColor:'#444'},title:{color:GOLD,fontSize:19,fontWeight:'800',marginBottom:12},input:{backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:12,color:'#FFF',marginBottom:9,textAlign:'right'},note:{color:'#BBB',fontSize:12,marginVertical:4},section:{color:'#FFF',fontWeight:'800',fontSize:17,marginTop:18,marginBottom:9},metric:{backgroundColor:'#1B1B1B',borderWidth:1,borderColor:'#333',borderRadius:10,padding:12,marginBottom:8},label:{color:'#FFF',fontWeight:'700'},row:{flexDirection:'row',gap:8,marginTop:8},value:{color:GOLD,fontSize:15,fontWeight:'900'},previous:{color:'#BBB',fontSize:14,fontWeight:'800'},error:{color:'#E28A78'},warning:{color:'#E7B66A',marginTop:8},track:{height:7,backgroundColor:'#333',borderRadius:5,overflow:'hidden',marginTop:5},bar:{height:7,backgroundColor:GOLD,borderRadius:5},purchaseBar:{height:7,backgroundColor:'#4D9D82',borderRadius:5},export:{backgroundColor:GOLD,padding:12,borderRadius:9,marginTop:12,alignItems:'center'},exportText:{color:'#151515',fontWeight:'900'}});
