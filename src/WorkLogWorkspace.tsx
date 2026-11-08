import React,{useState} from 'react';
import {Alert,Pressable,Text,TextInput,View} from 'react-native';
import {AgendaTask,WorkLog,WorkLogSettlement,workLogCostCentimes,workLogEarnedCentimes,workLogOutstandingCentimes,workLogPaidCentimes} from './agenda';
import {translate} from './i18n';

const gold='#D6AE55';
const input={backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:8,padding:10,color:'#FFF',marginBottom:8} as const;
type Props={language:'AR'|'FR';tasks:AgendaTask[];projects:{id:number;name:string}[];logs:WorkLog[];settlements:WorkLogSettlement[];onSave:(log:WorkLog)=>void;onDelete:(id:string)=>void;onSettle:(settlement:WorkLogSettlement)=>void};

export default function WorkLogWorkspace({language,tasks,projects,logs,settlements,onSave,onDelete,onSettle}:Props){
  const tr=(value:string)=>translate(language,value);
  const [taskId,setTaskId]=useState('');const [technician,setTechnician]=useState('');const [date,setDate]=useState(new Date().toISOString().slice(0,10));const [minutes,setMinutes]=useState('60');const [rate,setRate]=useState('0');const [notes,setNotes]=useState('');
  const [settlementTechnician,setSettlementTechnician]=useState('');const [settlementDate,setSettlementDate]=useState(new Date().toISOString().slice(0,10));const [settlementAmount,setSettlementAmount]=useState('');const [settlementMethod,setSettlementMethod]=useState<WorkLogSettlement['method']>('cash');const [settlementReference,setSettlementReference]=useState('');const [settlementNotes,setSettlementNotes]=useState('');
  const save=()=>{const task=tasks.find(item=>item.id===taskId);const log:WorkLog={id:'work-'+Date.now(),taskId,projectId:task?.projectId,technician:technician.trim(),date,durationMinutes:Number(minutes),hourlyRateCentimes:Math.round(Number(rate.replace(',','.'))*100),notes:notes.trim()||undefined};onSave(log);};
  const settle=()=>{const item:WorkLogSettlement={id:'settlement-'+Date.now(),technician:settlementTechnician,date:settlementDate,amountCentimes:Math.round(Number(settlementAmount.replace(',','.'))*100),method:settlementMethod,reference:settlementReference.trim()||undefined,notes:settlementNotes.trim()||undefined};onSettle(item);};
  const totalMinutes=logs.reduce((sum,log)=>sum+log.durationMinutes,0);const totalCost=logs.reduce((sum,log)=>sum+workLogCostCentimes(log),0);const technicianNames=new Map<string,string>();for(const log of logs){const name=log.technician.trim();const key=name.toLowerCase();if(key&&!technicianNames.has(key))technicianNames.set(key,name);}const technicians=Array.from(technicianNames.values());
  return <View style={{gap:10,direction:language==='AR'?'rtl':'ltr'}}>
    <View style={{backgroundColor:'#1B1B1B',padding:14,borderRadius:12,borderWidth:1,borderColor:'#444'}}><Text style={{color:gold,fontSize:19,fontWeight:'900',marginBottom:10}}>{tr('تسجيل ساعات العمل')}</Text>
      <Text style={{color:'#CCC',marginBottom:6}}>{tr('اختار المهمة')}</Text>{tasks.filter(task=>task.status!=='done').map(task=><Pressable key={task.id} onPress={()=>setTaskId(task.id)} style={{borderWidth:1,borderColor:taskId===task.id?gold:'#444',borderRadius:8,padding:9,marginBottom:5}}><Text style={{color:'#FFF'}}>{task.title}</Text></Pressable>)}
      <TextInput value={technician} onChangeText={setTechnician} placeholder={tr('اسم الفني')} placeholderTextColor="#888" style={input}/>
      <View style={{flexDirection:'row',gap:8}}><TextInput value={date} onChangeText={setDate} placeholder={tr('التاريخ YYYY-MM-DD')} placeholderTextColor="#888" style={[input,{flex:1}]}/><TextInput value={minutes} onChangeText={setMinutes} keyboardType="number-pad" placeholder={tr('الدقائق')} placeholderTextColor="#888" style={[input,{flex:1}]}/></View>
      <TextInput value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder={tr('الأجرة بالساعة DH')} placeholderTextColor="#888" style={input}/>
      <TextInput value={notes} onChangeText={setNotes} placeholder={tr('ملاحظات (اختياري)')} placeholderTextColor="#888" style={input}/>
      <Pressable onPress={save} style={{backgroundColor:gold,borderRadius:8,padding:11,alignItems:'center'}}><Text style={{color:'#111',fontWeight:'900'}}>{tr('حفظ سجل الوقت')}</Text></Pressable>
    </View>
    <View style={{backgroundColor:'#1B1B1B',padding:12,borderRadius:10,borderWidth:1,borderColor:'#333'}}><Text style={{color:'#FFF'}}>{tr('إجمالي الساعات')}: {(totalMinutes/60).toFixed(2)} · {tr('إجمالي كلفة العمل')}: {(totalCost/100).toFixed(2)} DH</Text></View>
    <View style={{backgroundColor:'#1B1B1B',padding:14,borderRadius:12,borderWidth:1,borderColor:'#444',gap:8}}>
      <Text style={{color:gold,fontSize:18,fontWeight:'900'}}>{tr('تسديد أجور الفنيين')}</Text>
      {technicians.map(name=><Pressable key={name} onPress={()=>setSettlementTechnician(name)} style={{borderWidth:1,borderColor:settlementTechnician===name?gold:'#444',borderRadius:8,padding:9}}><Text style={{color:'#FFF'}}>{name} · {tr('المستحق')}: {(workLogOutstandingCentimes(logs,settlements,name)/100).toFixed(2)} DH · {tr('المؤدى')}: {(workLogPaidCentimes(settlements,name)/100).toFixed(2)} DH</Text></Pressable>)}
      {!technicians.length&&<Text style={{color:'#888'}}>{tr('سجل ساعات العمل أولاً باش يبان المستحق.')}</Text>}
      <View style={{flexDirection:'row',gap:8}}><TextInput value={settlementDate} onChangeText={setSettlementDate} placeholder={tr('التاريخ YYYY-MM-DD')} placeholderTextColor="#888" style={[input,{flex:1}]}/><TextInput value={settlementAmount} onChangeText={setSettlementAmount} keyboardType="decimal-pad" placeholder={tr('مبلغ الأداء DH')} placeholderTextColor="#888" style={[input,{flex:1}]}/></View>
      <View style={{flexDirection:'row',gap:7}}>{(['cash','bank','cheque'] as const).map(method=><Pressable key={method} onPress={()=>setSettlementMethod(method)} style={{flex:1,borderWidth:1,borderColor:settlementMethod===method?gold:'#444',borderRadius:8,padding:9,alignItems:'center'}}><Text style={{color:'#FFF'}}>{tr(method==='cash'?'نقداً':method==='bank'?'تحويل بنكي':'شيك')}</Text></Pressable>)}</View>
      {settlementMethod==='cheque'&&<TextInput value={settlementReference} onChangeText={setSettlementReference} placeholder={tr('مرجع الشيك')} placeholderTextColor="#888" style={input}/>}
      <TextInput value={settlementNotes} onChangeText={setSettlementNotes} placeholder={tr('ملاحظات (اختياري)')} placeholderTextColor="#888" style={input}/>
      <Pressable onPress={settle} style={{backgroundColor:gold,borderRadius:8,padding:11,alignItems:'center'}}><Text style={{color:'#111',fontWeight:'900'}}>{tr('تسجيل تسوية الأجرة')}</Text></Pressable>
    </View>
    <Text style={{color:'#FFF',fontWeight:'900',fontSize:17}}>{tr('سجل ساعات العمل')} ({logs.length})</Text>
    {logs.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(log=>{const task=tasks.find(item=>item.id===log.taskId);const project=projects.find(item=>String(item.id)===log.projectId);return <View key={log.id} style={{backgroundColor:'#1B1B1B',padding:12,borderRadius:10,borderWidth:1,borderColor:'#333',flexDirection:'row',gap:8}}><View style={{flex:1,gap:5}}><Text style={{color:'#FFF',fontWeight:'800'}}>{task?.title||tr('مهمة محذوفة')} · {log.technician}</Text><Text style={{color:'#AAA'}}>{log.date} · {log.durationMinutes} {tr('دقيقة')}{project?' · '+project.name:''}</Text><Text style={{color:gold}}>{(workLogCostCentimes(log)/100).toFixed(2)} DH · {tr('الأجرة بالساعة')}: {(log.hourlyRateCentimes/100).toFixed(2)} DH</Text>{!!log.notes&&<Text style={{color:'#AAA'}}>{log.notes}</Text>}</View><Pressable onPress={()=>Alert.alert(tr('حذف سجل الوقت؟'),task?.title||'',[{text:tr('إلغاء'),style:'cancel'},{text:tr('حذف'),style:'destructive',onPress:()=>onDelete(log.id)}])}><Text style={{color:'#E28A78'}}>{tr('حذف')}</Text></Pressable></View>;})}
    {!logs.length&&<Text style={{color:'#888',textAlign:'center'}}>{tr('مازال ما تسجل حتى وقت عمل.')}</Text>}
    <Text style={{color:'#FFF',fontWeight:'900',fontSize:17}}>{tr('سجل تسويات الأجرة')} ({settlements.length})</Text>
    {settlements.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(item=><View key={item.id} style={{backgroundColor:'#1B1B1B',padding:12,borderRadius:10,borderWidth:1,borderColor:'#333'}}><Text style={{color:'#FFF',fontWeight:'800'}}>{item.technician} · {(item.amountCentimes/100).toFixed(2)} DH · {tr(item.method==='cash'?'نقداً':item.method==='bank'?'تحويل بنكي':'شيك')}</Text><Text style={{color:'#AAA'}}>{item.date}{item.reference?' · '+item.reference:''}{item.notes?' · '+item.notes:''}</Text></View>)}
  </View>;
}
