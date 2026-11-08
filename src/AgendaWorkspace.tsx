import React,{useState} from 'react';
import {Alert,Pressable,Text,TextInput,View} from 'react-native';
import {AgendaTask,changeTaskStatus,sortTasks,TaskPriority,TaskStatus,validateTask} from './agenda';
import {translate} from './i18n';

const gold='#D6AE55';
const input={backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:8,padding:10,color:'#FFF',marginBottom:8} as const;
const priorityText:Record<TaskPriority,string>={low:'منخفضة',normal:'عادية',high:'عالية'};
const statusText:Record<TaskStatus,string>={open:'مفتوحة',in_progress:'قيد الإنجاز',done:'مكتملة'};
type Props={language:'AR'|'FR';customers:{id:number;name:string}[];projects:{id:number;name:string}[];tasks:AgendaTask[];onSave:(task:AgendaTask)=>void;onUpdate:(task:AgendaTask)=>void;onDelete:(id:string)=>void};

export default function AgendaWorkspace({language,customers,projects,tasks,onSave,onUpdate,onDelete}:Props){
  const tr=(value:string)=>translate(language,value);
  const [title,setTitle]=useState('');const [assignee,setAssignee]=useState('');const [dueDate,setDueDate]=useState('');const [duration,setDuration]=useState('');const [notes,setNotes]=useState('');const [priority,setPriority]=useState<TaskPriority>('normal');const [projectId,setProjectId]=useState('');const [customerId,setCustomerId]=useState('');const [editingId,setEditingId]=useState<string|null>(null);
  const clear=()=>{setTitle('');setAssignee('');setDueDate('');setDuration('');setNotes('');setProjectId('');setCustomerId('');setPriority('normal');setEditingId(null);};
  const edit=(task:AgendaTask)=>{setEditingId(task.id);setTitle(task.title);setAssignee(task.assignee||'');setDueDate(task.dueDate||'');setDuration(task.durationMinutes?String(task.durationMinutes):'');setNotes(task.notes||'');setPriority(task.priority);setProjectId(task.projectId||'');setCustomerId(task.customerId||'');};
  const save=()=>{const task:AgendaTask={id:editingId||'task-'+Date.now(),title:title.trim(),assignee:assignee.trim()||undefined,dueDate:dueDate.trim()||undefined,durationMinutes:duration.trim()?Number(duration):undefined,notes:notes.trim()||undefined,priority,status:editingId?(tasks.find(item=>item.id===editingId)?.status||'open'):'open',projectId:projectId||undefined,customerId:customerId||undefined,createdAt:editingId?(tasks.find(item=>item.id===editingId)?.createdAt||new Date().toISOString()):new Date().toISOString()};const errors=validateTask(task,tasks.filter(item=>item.id!==editingId));if(errors.length){Alert.alert(tr('معلومات ناقصة'),tr(errors[0]));return;}if(editingId)onUpdate(task);else onSave(task);clear();};
  return <View style={{gap:10,direction:language==='AR'?'rtl':'ltr'}}>
    <View style={{backgroundColor:'#1B1B1B',padding:14,borderRadius:12,borderWidth:1,borderColor:'#444'}}>
      <Text style={{color:gold,fontSize:19,fontWeight:'900',marginBottom:10}}>{tr('إضافة مهمة')}</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder={tr('عنوان المهمة')} placeholderTextColor="#888" style={input}/>
      <TextInput value={assignee} onChangeText={setAssignee} placeholder={tr('المكلف بالمهمة (اختياري)')} placeholderTextColor="#888" style={input}/>
      <Text style={{color:'#CCC',marginBottom:6}}>{tr('المشروع (اختياري)')}</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:8}}>{projects.map(project=><Pressable key={project.id} onPress={()=>setProjectId(current=>current===String(project.id)?'':String(project.id))} style={{borderWidth:1,borderColor:projectId===String(project.id)?gold:'#444',borderRadius:8,padding:8}}><Text style={{color:'#FFF'}}>{project.name}</Text></Pressable>)}</View>
      <Text style={{color:'#CCC',marginBottom:6}}>{tr('الزبون (اختياري)')}</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:8}}>{customers.map(customer=><Pressable key={customer.id} onPress={()=>setCustomerId(current=>current===String(customer.id)?'':String(customer.id))} style={{borderWidth:1,borderColor:customerId===String(customer.id)?gold:'#444',borderRadius:8,padding:8}}><Text style={{color:'#FFF'}}>{customer.name}</Text></Pressable>)}</View>
      <View style={{flexDirection:'row',gap:8}}><TextInput value={dueDate} onChangeText={setDueDate} placeholder={tr('تاريخ الاستحقاق YYYY-MM-DD')} placeholderTextColor="#888" style={[input,{flex:1}]}/><TextInput value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholder={tr('المدة بالدقائق')} placeholderTextColor="#888" style={[input,{flex:1}]}/></View>
      <View style={{flexDirection:'row',gap:7,marginBottom:8}}>{(['low','normal','high'] as TaskPriority[]).map(value=><Pressable key={value} onPress={()=>setPriority(value)} style={{flex:1,borderWidth:1,borderColor:priority===value?gold:'#444',borderRadius:8,padding:9,alignItems:'center'}}><Text style={{color:'#FFF'}}>{tr(priorityText[value])}</Text></Pressable>)}</View>
      <TextInput value={notes} onChangeText={setNotes} multiline placeholder={tr('ملاحظات المهمة')} placeholderTextColor="#888" style={[input,{minHeight:64,textAlignVertical:'top'}]}/>
      <Pressable onPress={save} style={{backgroundColor:gold,borderRadius:8,padding:12,alignItems:'center'}}><Text style={{color:'#111',fontWeight:'900'}}>{tr(editingId?'حفظ التعديلات':'حفظ المهمة')}</Text></Pressable>
      {editingId&&<Pressable onPress={clear} style={{padding:8,alignItems:'center'}}><Text style={{color:'#DDD'}}>{tr('إلغاء التعديل')}</Text></Pressable>}
    </View>
    <Text style={{color:'#FFF',fontSize:17,fontWeight:'900'}}>{tr('المهام')} ({tasks.length})</Text>
    {sortTasks(tasks).map(task=><View key={task.id} style={{backgroundColor:'#1B1B1B',padding:12,borderRadius:10,borderWidth:1,borderColor:'#333',gap:6}}>
      <Text style={{color:'#FFF',fontWeight:'900'}}>{task.title} · {tr(statusText[task.status])}</Text>
      <Text style={{color:'#AAA'}}>{tr(priorityText[task.priority])}{task.assignee?' · '+task.assignee:''}{task.dueDate?' · '+task.dueDate:''}{task.durationMinutes?' · '+task.durationMinutes+' '+tr('دقيقة'):''}</Text>
      {!!task.projectId&&<Text style={{color:'#AAA'}}>{tr('المشروع:')} {projects.find(item=>String(item.id)===task.projectId)?.name||tr('مشروع محذوف')}</Text>}
      {!!task.customerId&&<Text style={{color:'#AAA'}}>{tr('الزبون:')} {customers.find(item=>String(item.id)===task.customerId)?.name||tr('زبون محذوف')}</Text>}
      {!!task.notes&&<Text style={{color:'#CCC'}}>{task.notes}</Text>}
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}><Pressable onPress={()=>edit(task)} style={{borderWidth:1,borderColor:'#444',borderRadius:7,padding:8}}><Text style={{color:'#DDD'}}>{tr('تعديل المهمة')}</Text></Pressable>{task.status!=='done'&&<Pressable onPress={()=>onUpdate(changeTaskStatus(task,task.status==='open'?'in_progress':'done'))} style={{borderWidth:1,borderColor:gold,borderRadius:7,padding:8}}><Text style={{color:gold}}>{tr(task.status==='open'?'بدء المهمة':'إكمال المهمة')}</Text></Pressable>}<Pressable onPress={()=>Alert.alert(tr('حذف المهمة؟'),task.title,[{text:tr('إلغاء'),style:'cancel'},{text:tr('حذف'),style:'destructive',onPress:()=>onDelete(task.id)}])} style={{borderWidth:1,borderColor:'#8a5448',borderRadius:7,padding:8}}><Text style={{color:'#E28A78'}}>{tr('حذف')}</Text></Pressable></View>
    </View>)}
    {!tasks.length&&<Text style={{color:'#888',textAlign:'center',padding:12}}>{tr('مازال ما كايناش مهام.')}</Text>}
  </View>;
}
