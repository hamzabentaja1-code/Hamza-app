import React,{useState} from 'react';
import {Alert,Pressable,Text,TextInput,View} from 'react-native';
import {AgendaTask,WorkLog,workLogCostCentimes} from './agenda';
import {translate} from './i18n';

const gold='#D6AE55';
const input={backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:8,padding:10,color:'#FFF',marginBottom:8} as const;
type Props={language:'AR'|'FR';tasks:AgendaTask[];projects:{id:number;name:string}[];logs:WorkLog[];onSave:(log:WorkLog)=>void;onDelete:(id:string)=>void};

export default function WorkLogWorkspace({language,tasks,projects,logs,onSave,onDelete}:Props){
  const tr=(value:string)=>translate(language,value);
  const [taskId,setTaskId]=useState('');const [technician,setTechnician]=useState('');const [date,setDate]=useState(new Date().toISOString().slice(0,10));const [minutes,setMinutes]=useState('60');const [rate,setRate]=useState('0');const [notes,setNotes]=useState('');
  const save=()=>{const task=tasks.find(item=>item.id===taskId);const log:WorkLog={id:'work-'+Date.now(),taskId,projectId:task?.projectId,technician:technician.trim(),date,durationMinutes:Number(minutes),hourlyRateCentimes:Math.round(Number(rate.replace(',','.'))*100),notes:notes.trim()||undefined};onSave(log);};
  const totalMinutes=logs.reduce((sum,log)=>sum+log.durationMinutes,0);const totalCost=logs.reduce((sum,log)=>sum+workLogCostCentimes(log),0);
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
    <Text style={{color:'#FFF',fontWeight:'900',fontSize:17}}>{tr('سجل ساعات العمل')} ({logs.length})</Text>
    {logs.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(log=>{const task=tasks.find(item=>item.id===log.taskId);const project=projects.find(item=>String(item.id)===log.projectId);return <View key={log.id} style={{backgroundColor:'#1B1B1B',padding:12,borderRadius:10,borderWidth:1,borderColor:'#333',flexDirection:'row',gap:8}}><View style={{flex:1,gap:5}}><Text style={{color:'#FFF',fontWeight:'800'}}>{task?.title||tr('مهمة محذوفة')} · {log.technician}</Text><Text style={{color:'#AAA'}}>{log.date} · {log.durationMinutes} {tr('دقيقة')}{project?' · '+project.name:''}</Text><Text style={{color:gold}}>{(workLogCostCentimes(log)/100).toFixed(2)} DH · {tr('الأجرة بالساعة')}: {(log.hourlyRateCentimes/100).toFixed(2)} DH</Text>{!!log.notes&&<Text style={{color:'#AAA'}}>{log.notes}</Text>}</View><Pressable onPress={()=>Alert.alert(tr('حذف سجل الوقت؟'),task?.title||'',[{text:tr('إلغاء'),style:'cancel'},{text:tr('حذف'),style:'destructive',onPress:()=>onDelete(log.id)}])}><Text style={{color:'#E28A78'}}>{tr('حذف')}</Text></Pressable></View>;})}
    {!logs.length&&<Text style={{color:'#888',textAlign:'center'}}>{tr('مازال ما تسجل حتى وقت عمل.')}</Text>}
  </View>;
}
