import React,{useState} from 'react';
import {Alert,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {translate} from './i18n';
import {ProjectRecord,ProjectStatus,ProjectTaskPriority,ProjectTimeEntry,projectFinancials} from './projects';
import {Technician} from './technicians';
import {EquipmentStatus,TechnicianEquipment} from './technician-equipment';
import {isValidIsoDate} from './domain/document-conversion';

type Props={
  language:'AR'|'FR';
  projects:ProjectRecord[];
  expenses:{id:number;projectId?:number;amount:number}[];
  technicians:Technician[];
  onAddTechnician:(input:{name:string;phone?:string;specialty?:string;hourlyRate:number})=>boolean;
  onUpdateTechnician:(id:number,input:{name:string;phone?:string;specialty?:string;hourlyRate:number})=>boolean;
  onDeleteTechnician:(id:number)=>void;
  technicianEquipment:TechnicianEquipment[];
  onAddEquipment:(input:{name:string;category:string;serialNumber?:string;technicianId?:number;status:EquipmentStatus;note?:string})=>boolean;
  onUpdateEquipment:(id:number,input:{name:string;category:string;serialNumber?:string;technicianId?:number;status:EquipmentStatus;note?:string})=>boolean;
  onDeleteEquipment:(id:number)=>void;
  onCreate:(input:{name:string;customerName:string;budget:number;targetDate:string})=>void;
  onUpdate:(projectId:number,input:{name:string;customerName:string;budget:number;targetDate:string})=>boolean;
  onDelete:(projectId:number)=>void;
  onStatusChange:(projectId:number,status:ProjectStatus)=>void;
  onAddTask:(projectId:number,task:{title:string;dueDate?:string;priority:ProjectTaskPriority;assignee?:string})=>void;
  onUpdateTask:(projectId:number,taskId:number,task:{title:string;dueDate?:string;priority:ProjectTaskPriority;assignee?:string})=>boolean;
  onToggleTask:(projectId:number,taskId:number,done:boolean)=>void;
  onDeleteTask:(projectId:number,taskId:number)=>void;
  onAddExpense:(projectId:number,title:string,amount:number)=>void;
  onAddTime:(projectId:number,input:{technician:string;date:string;hours:number;hourlyRate:number;note?:string})=>boolean;
  onDeleteTime:(projectId:number,entryId:number)=>void;
};

const gold='#D6AE55';
const panel={backgroundColor:'#1B1B1B',padding:15,borderRadius:13,borderWidth:1,borderColor:'#444'} as const;
const input={backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:11,color:'#FFF',marginBottom:9,textAlign:'auto' as const};
const button={backgroundColor:gold,borderRadius:9,padding:11,alignItems:'center' as const,marginTop:5};
const statuses:ProjectStatus[]=['مخطط','جارٍ','مكتمل','متوقف'];

export default function ProjectsWorkspace({language,projects,expenses,technicians,technicianEquipment,onAddEquipment,onUpdateEquipment,onDeleteEquipment,onAddTechnician,onUpdateTechnician,onDeleteTechnician,onCreate,onUpdate,onDelete,onStatusChange,onAddTask,onUpdateTask,onToggleTask,onDeleteTask,onAddExpense,onAddTime,onDeleteTime}:Props){
  const tr=(value:string)=>translate(language,value);
  const [name,setName]=useState('');
  const [customerName,setCustomerName]=useState('');
  const [budget,setBudget]=useState('');
  const [targetDate,setTargetDate]=useState('');
  const [techName,setTechName]=useState('');
  const [techPhone,setTechPhone]=useState('');
  const [techSpecialty,setTechSpecialty]=useState('');
  const [techRate,setTechRate]=useState('');
  const [editingTechnicianId,setEditingTechnicianId]=useState<number|null>(null);
  const [equipmentName,setEquipmentName]=useState('');
  const [equipmentCategory,setEquipmentCategory]=useState('');
  const [equipmentSerial,setEquipmentSerial]=useState('');
  const [equipmentTechnicianId,setEquipmentTechnicianId]=useState<number|undefined>();
  const [equipmentStatus,setEquipmentStatus]=useState<EquipmentStatus>('متاح');
  const [equipmentNote,setEquipmentNote]=useState('');
  const [editingEquipmentId,setEditingEquipmentId]=useState<number|null>(null);
  const [taskDrafts,setTaskDrafts]=useState<Record<number,string>>({});
  const [taskDates,setTaskDates]=useState<Record<number,string>>({});
  const [taskPriorities,setTaskPriorities]=useState<Record<number,ProjectTaskPriority>>({});
  const [taskAssignees,setTaskAssignees]=useState<Record<number,string>>({});
  const [expenseDrafts,setExpenseDrafts]=useState<Record<number,{title:string;amount:string}>>({});
  const [timeDrafts,setTimeDrafts]=useState<Record<number,{technician:string;date:string;hours:string;rate:string;note:string}>>({});
  const [editingProjectId,setEditingProjectId]=useState<number|null>(null);
  const [projectEditDraft,setProjectEditDraft]=useState<{name:string;customerName:string;budget:string;targetDate:string}>({name:'',customerName:'',budget:'',targetDate:''});
  const [editingTaskKey,setEditingTaskKey]=useState<string|null>(null);
  const [taskEditDraft,setTaskEditDraft]=useState<{title:string;dueDate:string;priority:ProjectTaskPriority;assignee:string}>({title:'',dueDate:'',priority:'عادي',assignee:''});
  const saveProject=()=>{
    const amount=Number(budget.replace(',','.'));
    if(!name.trim()||!budget.trim()||!Number.isFinite(amount)||amount<0){Alert.alert(tr('معلومات ناقصة'),tr('دخل اسم المشروع وميزانية صحيحة.'));return;}
    if(targetDate.trim()&&!isValidIsoDate(targetDate.trim())){Alert.alert(tr('تاريخ غير صالح'),tr('دخل تاريخاً صحيحاً بصيغة YYYY-MM-DD.'));return;}
    onCreate({name,customerName,budget:amount,targetDate});
    setName('');setCustomerName('');setBudget('');setTargetDate('');
  };
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom:20}}>
    <View style={panel}>
      <Text style={{color:gold,fontSize:19,fontWeight:'800',marginBottom:12}}>{tr('مشروع جديد')}</Text>
      <TextInput value={name} onChangeText={setName} placeholder={tr('اسم المشروع')} placeholderTextColor="#888" style={input}/>
      <TextInput value={customerName} onChangeText={setCustomerName} placeholder={tr('الزبون (اختياري)')} placeholderTextColor="#888" style={input}/>
      <TextInput value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder={tr('الميزانية (DH)')} placeholderTextColor="#888" style={input}/>
      <TextInput value={targetDate} onChangeText={setTargetDate} placeholder={tr('تاريخ التسليم (اختياري) YYYY-MM-DD')} placeholderTextColor="#888" style={input}/>
      <Pressable onPress={saveProject} style={button}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('إضافة المشروع')}</Text></Pressable>
    </View>
    <View style={[panel,{marginTop:12}]}>
      <Text style={{color:gold,fontSize:18,fontWeight:'800',marginBottom:10}}>{tr('دليل التقنيين')}</Text>
      <TextInput value={techName} onChangeText={setTechName} placeholder={tr('اسم التقني')} placeholderTextColor="#888" style={input}/>
      <TextInput value={techPhone} onChangeText={setTechPhone} keyboardType="phone-pad" placeholder={tr('الهاتف (اختياري)')} placeholderTextColor="#888" style={input}/>
      <TextInput value={techSpecialty} onChangeText={setTechSpecialty} placeholder={tr('التخصص (اختياري)')} placeholderTextColor="#888" style={input}/>
      <TextInput value={techRate} onChangeText={setTechRate} keyboardType="decimal-pad" placeholder={tr('أجرة الساعة DH')} placeholderTextColor="#888" style={input}/>
      <Pressable onPress={()=>{const rate=Number(techRate.replace(',','.'));if(!techName.trim()||!techRate.trim()||!Number.isFinite(rate)||rate<0){Alert.alert(tr('معلومات ناقصة'),tr('دخل اسم التقني وأجرة صحيحة.'));return;}const input={name:techName,phone:techPhone,specialty:techSpecialty,hourlyRate:rate};const saved=editingTechnicianId===null?onAddTechnician(input):onUpdateTechnician(editingTechnicianId,input);if(saved){setTechName('');setTechPhone('');setTechSpecialty('');setTechRate('');setEditingTechnicianId(null);}}} style={button}><Text style={{color:'#151515',fontWeight:'900'}}>{tr(editingTechnicianId===null?'حفظ التقني':'حفظ تعديل التقني')}</Text></Pressable>
      {editingTechnicianId!==null&&<Pressable onPress={()=>{setEditingTechnicianId(null);setTechName('');setTechPhone('');setTechSpecialty('');setTechRate('');}} style={{borderColor:'#555',borderWidth:1,borderRadius:9,padding:10,alignItems:'center',marginTop:6}}><Text style={{color:'#EEE'}}>{tr('إلغاء')}</Text></Pressable>}
      <Text style={{color:'#DDD',fontWeight:'700',marginTop:12,marginBottom:5}}>{tr('التقنيون')} ({technicians.length})</Text>
      {technicians.map(technician=><View key={technician.id} style={{flexDirection:'row',alignItems:'center',paddingVertical:7,borderBottomWidth:1,borderBottomColor:'#333'}}><View style={{flex:1}}><Text style={{color:'#FFF',fontWeight:'700'}}>{technician.name}{technician.specialty?` · ${technician.specialty}`:''}</Text><Text style={{color:'#AAA'}}>{technician.hourlyRate.toFixed(2)} DH{technician.phone?` · ${technician.phone}`:''}</Text></View><Pressable onPress={()=>{setEditingTechnicianId(technician.id);setTechName(technician.name);setTechPhone(technician.phone||'');setTechSpecialty(technician.specialty||'');setTechRate(String(technician.hourlyRate));}} style={{paddingHorizontal:7}}><Text style={{color:gold}}>{tr('تعديل')}</Text></Pressable><Pressable onPress={()=>onDeleteTechnician(technician.id)}><Text style={{color:'#E58B83'}}>{tr('حذف')}</Text></Pressable></View>)}
      {technicians.length===0&&<Text style={{color:'#888'}}>{tr('مازال ما كاين حتى تقني.')}</Text>}
    </View>
    <View style={[panel,{marginTop:12}]}>
      <Text style={{color:gold,fontSize:18,fontWeight:'800',marginBottom:10}}>{tr('معدات التقنيين')}</Text>
      <TextInput value={equipmentName} onChangeText={setEquipmentName} placeholder={tr('اسم المعدة')} placeholderTextColor="#888" style={input}/>
      <TextInput value={equipmentCategory} onChangeText={setEquipmentCategory} placeholder={tr('تصنيف المعدة')} placeholderTextColor="#888" style={input}/>
      {Array.from(new Set(technicianEquipment.map(item=>item.category))).map(category=><Pressable key={category} onPress={()=>setEquipmentCategory(category)} style={{alignSelf:'flex-start',borderWidth:1,borderColor:equipmentCategory===category?gold:'#444',borderRadius:8,padding:7,marginBottom:5}}><Text style={{color:equipmentCategory===category?gold:'#DDD'}}>{category}</Text></Pressable>)}
      <TextInput value={equipmentSerial} onChangeText={setEquipmentSerial} placeholder={tr('الرقم التسلسلي (اختياري)')} placeholderTextColor="#888" style={input}/>
      <Text style={{color:'#AAA',marginBottom:5}}>{tr('التقني المسؤول (اختياري)')}</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:8}}>
        <Pressable onPress={()=>setEquipmentTechnicianId(undefined)} style={{borderColor:equipmentTechnicianId===undefined?gold:'#444',borderWidth:1,borderRadius:8,padding:7}}><Text style={{color:equipmentTechnicianId===undefined?gold:'#DDD'}}>{tr('غير مسندة')}</Text></Pressable>
        {technicians.map(technician=><Pressable key={technician.id} onPress={()=>setEquipmentTechnicianId(technician.id)} style={{borderColor:equipmentTechnicianId===technician.id?gold:'#444',borderWidth:1,borderRadius:8,padding:7}}><Text style={{color:equipmentTechnicianId===technician.id?gold:'#DDD'}}>{technician.name}</Text></Pressable>)}
      </View>
      <Text style={{color:'#AAA',marginBottom:5}}>{tr('الحالة')}</Text>
      <View style={{flexDirection:'row',gap:6,marginBottom:8}}>{(['متاح','مستعمل','صيانة'] as EquipmentStatus[]).map(status=><Pressable key={status} onPress={()=>setEquipmentStatus(status)} style={{borderColor:equipmentStatus===status?gold:'#444',borderWidth:1,borderRadius:8,padding:7}}><Text style={{color:equipmentStatus===status?gold:'#DDD'}}>{tr(status)}</Text></Pressable>)}</View>
      <TextInput value={equipmentNote} onChangeText={setEquipmentNote} placeholder={tr('ملاحظة (اختياري)')} placeholderTextColor="#888" style={input}/>
      <Pressable onPress={()=>{if(!equipmentName.trim()||!equipmentCategory.trim()){Alert.alert(tr('معلومات ناقصة'),tr('دخل اسم المعدة وتصنيفها.'));return;}const item={name:equipmentName,category:equipmentCategory,serialNumber:equipmentSerial,technicianId:equipmentTechnicianId,status:equipmentStatus,note:equipmentNote};const saved=editingEquipmentId===null?onAddEquipment(item):onUpdateEquipment(editingEquipmentId,item);if(saved){setEquipmentName('');setEquipmentCategory('');setEquipmentSerial('');setEquipmentTechnicianId(undefined);setEquipmentStatus('متاح');setEquipmentNote('');setEditingEquipmentId(null);}}} style={button}><Text style={{color:'#151515',fontWeight:'900'}}>{tr(editingEquipmentId===null?'حفظ المعدة':'حفظ تعديل المعدة')}</Text></Pressable>
      {editingEquipmentId!==null&&<Pressable onPress={()=>{setEditingEquipmentId(null);setEquipmentName('');setEquipmentCategory('');setEquipmentSerial('');setEquipmentTechnicianId(undefined);setEquipmentStatus('متاح');setEquipmentNote('');}} style={{borderColor:'#555',borderWidth:1,borderRadius:9,padding:10,alignItems:'center',marginTop:6}}><Text style={{color:'#EEE'}}>{tr('إلغاء')}</Text></Pressable>}
      <Text style={{color:'#DDD',fontWeight:'700',marginTop:12,marginBottom:5}}>{tr('سجل المعدات')} ({technicianEquipment.length})</Text>
      {technicianEquipment.map(item=><View key={item.id} style={{flexDirection:'row',alignItems:'center',paddingVertical:7,borderBottomWidth:1,borderBottomColor:'#333'}}><View style={{flex:1}}><Text style={{color:'#FFF',fontWeight:'700'}}>{item.name} · {item.category}</Text><Text style={{color:'#AAA'}}>{tr(item.status)}{item.serialNumber?` · ${item.serialNumber}`:''}{item.technicianId?` · ${technicians.find(tech=>tech.id===item.technicianId)?.name||''}`:''}</Text>{!!item.note&&<Text style={{color:'#888'}}>{item.note}</Text>}</View><Pressable onPress={()=>{setEditingEquipmentId(item.id);setEquipmentName(item.name);setEquipmentCategory(item.category);setEquipmentSerial(item.serialNumber||'');setEquipmentTechnicianId(item.technicianId);setEquipmentStatus(item.status);setEquipmentNote(item.note||'');}} style={{paddingHorizontal:7}}><Text style={{color:gold}}>{tr('تعديل')}</Text></Pressable><Pressable onPress={()=>onDeleteEquipment(item.id)}><Text style={{color:'#E58B83'}}>{tr('حذف')}</Text></Pressable></View>)}
      {technicianEquipment.length===0&&<Text style={{color:'#888'}}>{tr('مازال ما كايناش معدات.')}</Text>}
    </View>
    <Text style={{color:'#FFF',fontWeight:'800',fontSize:17,marginTop:18,marginBottom:10}}>{tr('المشاريع')} ({projects.length})</Text>
    {projects.map(project=>{
      const totals=projectFinancials(project,expenses);
      const taskTitle=taskDrafts[project.id]||'';
      const taskDate=taskDates[project.id]||'';
      const taskPriority=taskPriorities[project.id]||'عادي';
      const taskAssignee=taskAssignees[project.id]||'';
      const expense=expenseDrafts[project.id]||{title:'',amount:''};
      const time=timeDrafts[project.id]||{technician:'',date:new Date().toISOString().slice(0,10),hours:'',rate:'',note:''};
      const editing=editingProjectId===project.id;
      return <View key={project.id} style={[panel,{marginBottom:10}]}>
        {editing?<><TextInput value={projectEditDraft.name} onChangeText={value=>setProjectEditDraft(current=>({...current,name:value}))} placeholder={tr('اسم المشروع')} placeholderTextColor="#888" style={input}/><TextInput value={projectEditDraft.customerName} onChangeText={value=>setProjectEditDraft(current=>({...current,customerName:value}))} placeholder={tr('الزبون (اختياري)')} placeholderTextColor="#888" style={input}/><TextInput value={projectEditDraft.budget} onChangeText={value=>setProjectEditDraft(current=>({...current,budget:value}))} keyboardType="decimal-pad" placeholder={tr('الميزانية (DH)')} placeholderTextColor="#888" style={input}/><TextInput value={projectEditDraft.targetDate} onChangeText={value=>setProjectEditDraft(current=>({...current,targetDate:value}))} placeholder={tr('تاريخ التسليم (اختياري) YYYY-MM-DD')} placeholderTextColor="#888" style={input}/><View style={{flexDirection:'row',gap:7}}><Pressable onPress={()=>{const amount=Number(projectEditDraft.budget.replace(',','.'));if(!projectEditDraft.name.trim()||!Number.isFinite(amount)||amount<0){Alert.alert(tr('معلومات ناقصة'),tr('دخل اسم المشروع وميزانية صحيحة.'));return;}if(projectEditDraft.targetDate.trim()&&!isValidIsoDate(projectEditDraft.targetDate.trim())){Alert.alert(tr('تاريخ غير صالح'),tr('دخل تاريخاً صحيحاً بصيغة YYYY-MM-DD.'));return;}if(onUpdate(project.id,{...projectEditDraft,budget:amount}))setEditingProjectId(null);}} style={[button,{flex:1}]}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('حفظ التعديل')}</Text></Pressable><Pressable onPress={()=>setEditingProjectId(null)} style={{borderColor:'#555',borderWidth:1,borderRadius:9,padding:11,marginTop:5}}><Text style={{color:'#EEE'}}>{tr('إلغاء')}</Text></Pressable></View></>:<><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Text style={{color:'#FFF',fontWeight:'800',fontSize:17,flex:1}}>{project.name}</Text><Pressable onPress={()=>{setEditingProjectId(project.id);setProjectEditDraft({name:project.name,customerName:project.customerName,budget:String(project.budget),targetDate:project.targetDate||''});}}><Text style={{color:gold}}>{tr('تعديل')}</Text></Pressable><Pressable onPress={()=>onDelete(project.id)}><Text style={{color:'#E58B83'}}>{tr('حذف')}</Text></Pressable></View>{!!project.customerName&&<Text style={{color:'#AAA',marginTop:4}}>{tr('الزبون')}: {project.customerName}</Text>}{!!project.targetDate&&<Text style={{color:'#AAA',marginTop:4}}>{tr('تاريخ التسليم')}: {project.targetDate}</Text>}</>}
        <View style={{backgroundColor:'#111',borderRadius:9,padding:10,marginTop:9}}>
          <Text style={{color:'#DDD'}}>{tr('الميزانية')}: {project.budget.toFixed(2)} DH</Text>
          <Text style={{color:'#DDD',marginTop:4}}>{tr('المصاريف المسجلة')}: {totals.spent.toFixed(2)} DH</Text>
          <Text style={{color:'#DDD',marginTop:4}}>{tr('تكلفة الأجور')}: {totals.laborCost.toFixed(2)} DH</Text>
          <Text style={{color:totals.overBudget?'#F08C78':gold,fontWeight:'800',marginTop:4}}>{tr(totals.overBudget?'تجاوز الميزانية':'المتبقي')}: {totals.remaining.toFixed(2)} DH</Text>
        </View>
        <Text style={{color:gold,fontWeight:'800',marginTop:12,marginBottom:6}}>{tr('حالة المشروع')}</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{statuses.map(status=><Pressable key={status} onPress={()=>onStatusChange(project.id,status)} style={{borderColor:project.status===status?gold:'#444',borderWidth:1,borderRadius:8,padding:7}}><Text style={{color:project.status===status?gold:'#DDD'}}>{tr(status)}</Text></Pressable>)}</View>
        <Text style={{color:gold,fontWeight:'800',marginTop:12}}>{tr('المهام')} ({project.tasks.filter(task=>task.done).length}/{project.tasks.length})</Text>
        {project.tasks.map(task=>{const taskKey=`${project.id}:${task.id}`;return editingTaskKey===taskKey?<View key={task.id} style={{backgroundColor:'#111',borderRadius:9,padding:9,marginVertical:5}}><TextInput value={taskEditDraft.title} onChangeText={value=>setTaskEditDraft(current=>({...current,title:value}))} placeholder={tr('مهمة جديدة')} placeholderTextColor="#888" style={input}/><TextInput value={taskEditDraft.dueDate} onChangeText={value=>setTaskEditDraft(current=>({...current,dueDate:value}))} placeholder={tr('آخر أجل (اختياري) YYYY-MM-DD')} placeholderTextColor="#888" style={input}/><TextInput value={taskEditDraft.assignee} onChangeText={value=>setTaskEditDraft(current=>({...current,assignee:value}))} placeholder={tr('اسم المكلف بالمهمة (اختياري)')} placeholderTextColor="#888" style={input}/>{technicians.length>0&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:6}}>{technicians.map(technician=><Pressable key={technician.id} onPress={()=>setTaskEditDraft(current=>({...current,assignee:technician.name}))} style={{borderColor:taskEditDraft.assignee===technician.name?gold:'#444',borderWidth:1,borderRadius:8,padding:7}}><Text style={{color:taskEditDraft.assignee===technician.name?gold:'#DDD'}}>{technician.name}</Text></Pressable>)}</View>}<View style={{flexDirection:'row',gap:6,marginBottom:6}}>{(['عادي','مهم','عاجل'] as ProjectTaskPriority[]).map(priority=><Pressable key={priority} onPress={()=>setTaskEditDraft(current=>({...current,priority}))} style={{borderColor:taskEditDraft.priority===priority?gold:'#444',borderWidth:1,borderRadius:8,padding:7}}><Text style={{color:taskEditDraft.priority===priority?gold:'#DDD'}}>{tr(priority)}</Text></Pressable>)}</View><View style={{flexDirection:'row',gap:7}}><Pressable onPress={()=>{if(!taskEditDraft.title.trim()){Alert.alert(tr('معلومات ناقصة'),tr('دخل اسم المهمة.'));return;}if(taskEditDraft.dueDate.trim()&&!isValidIsoDate(taskEditDraft.dueDate.trim())){Alert.alert(tr('تاريخ غير صالح'),tr('دخل تاريخاً صحيحاً بصيغة YYYY-MM-DD.'));return;}if(onUpdateTask(project.id,task.id,{...taskEditDraft,dueDate:taskEditDraft.dueDate.trim()}))setEditingTaskKey(null);}} style={[button,{flex:1}]}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('حفظ التعديل')}</Text></Pressable><Pressable onPress={()=>setEditingTaskKey(null)} style={{borderColor:'#555',borderWidth:1,borderRadius:9,padding:11,marginTop:5}}><Text style={{color:'#EEE'}}>{tr('إلغاء')}</Text></Pressable></View></View>:<View key={task.id} style={{flexDirection:'row',alignItems:'center',paddingVertical:6}}><Pressable onPress={()=>onToggleTask(project.id,task.id,!task.done)} style={{flex:1}}><Text style={{color:task.done?'#777':'#EEE'}}>{task.done?'☑':'☐'} {task.title}{task.assignee?` · ${tr('المكلف')}: ${task.assignee}`:''}{task.priority?` · ${tr(task.priority)}`:''}{task.dueDate?` · ${tr('الأجل')}: ${task.dueDate}`:''}</Text></Pressable><Pressable onPress={()=>{setEditingTaskKey(taskKey);setTaskEditDraft({title:task.title,dueDate:task.dueDate||'',priority:task.priority||'عادي',assignee:task.assignee||''});}} style={{paddingHorizontal:7}}><Text style={{color:gold}}>{tr('تعديل')}</Text></Pressable><Pressable onPress={()=>onDeleteTask(project.id,task.id)} style={{paddingHorizontal:7}}><Text style={{color:'#E58B83'}}>{tr('حذف')}</Text></Pressable></View>;})}
        <TextInput value={taskDate} onChangeText={value=>setTaskDates(current=>({...current,[project.id]:value}))} placeholder={tr('آخر أجل (اختياري) YYYY-MM-DD')} placeholderTextColor="#888" style={[input,{marginTop:7}]}/>
        <Text style={{color:'#AAA',marginBottom:6}}>{tr('أولوية المهمة')}</Text><View style={{flexDirection:'row',gap:6,marginBottom:7}}>{(['عادي','مهم','عاجل'] as ProjectTaskPriority[]).map(priority=><Pressable key={priority} onPress={()=>setTaskPriorities(current=>({...current,[project.id]:priority}))} style={{borderColor:taskPriority===priority?gold:'#444',borderWidth:1,borderRadius:8,padding:7}}><Text style={{color:taskPriority===priority?gold:'#DDD'}}>{tr(priority)}</Text></Pressable>)}</View>
        <TextInput value={taskAssignee} onChangeText={value=>setTaskAssignees(current=>({...current,[project.id]:value}))} placeholder={tr('اسم المكلف بالمهمة (اختياري)')} placeholderTextColor="#888" style={[input,{marginTop:7}]}/>
        {technicians.length>0&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:5}}>{technicians.map(technician=><Pressable key={technician.id} onPress={()=>setTaskAssignees(current=>({...current,[project.id]:technician.name}))} style={{borderColor:taskAssignee===technician.name?gold:'#444',borderWidth:1,borderRadius:8,padding:7}}><Text style={{color:taskAssignee===technician.name?gold:'#DDD'}}>{technician.name}</Text></Pressable>)}</View>}
        <View style={{flexDirection:'row',gap:7,marginTop:6}}><TextInput value={taskTitle} onChangeText={value=>setTaskDrafts(current=>({...current,[project.id]:value}))} placeholder={tr('مهمة جديدة')} placeholderTextColor="#888" style={[input,{flex:1,marginBottom:0}]}/><Pressable onPress={()=>{if(!taskTitle.trim()){Alert.alert(tr('معلومات ناقصة'),tr('دخل اسم المهمة.'));return;}if(taskDate.trim()&&!isValidIsoDate(taskDate.trim())){Alert.alert(tr('تاريخ غير صالح'),tr('دخل تاريخاً صحيحاً بصيغة YYYY-MM-DD.'));return;}onAddTask(project.id,{title:taskTitle,dueDate:taskDate,priority:taskPriority,assignee:taskAssignee});setTaskDrafts(current=>({...current,[project.id]:''}));setTaskDates(current=>({...current,[project.id]:''}));setTaskAssignees(current=>({...current,[project.id]:''}));}} style={[button,{marginTop:0,paddingHorizontal:12}]}><Text style={{color:'#151515',fontWeight:'900'}}>+</Text></Pressable></View>
        <Text style={{color:gold,fontWeight:'800',marginTop:14,marginBottom:6}}>{tr('إضافة مصروف للمشروع')}</Text>
        <TextInput value={expense.title} onChangeText={value=>setExpenseDrafts(current=>({...current,[project.id]:{...expense,title:value}}))} placeholder={tr('وصف المصروف')} placeholderTextColor="#888" style={input}/>
        <TextInput value={expense.amount} onChangeText={value=>setExpenseDrafts(current=>({...current,[project.id]:{...expense,amount:value}}))} keyboardType="decimal-pad" placeholder={tr('المبلغ DH')} placeholderTextColor="#888" style={input}/>
        <Pressable onPress={()=>{const amount=Number(expense.amount.replace(',','.'));if(!expense.title.trim()||!Number.isFinite(amount)||amount<=0){Alert.alert(tr('معلومات ناقصة'),tr('دخل وصف المصروف ومبلغ صحيح.'));return;}onAddExpense(project.id,expense.title,amount);setExpenseDrafts(current=>({...current,[project.id]:{title:'',amount:''}}));}} style={button}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('تسجيل مصروف المشروع')}</Text></Pressable>
        <Text style={{color:gold,fontWeight:'800',marginTop:14,marginBottom:6}}>{tr('ساعات العمل')}: {project.timeEntries.reduce((sum,entry)=>sum+entry.hours,0).toFixed(2)} {tr('ساعة')}</Text>
        {project.timeEntries.map((entry:ProjectTimeEntry)=><View key={entry.id} style={{flexDirection:'row',alignItems:'center',paddingVertical:5,borderBottomWidth:1,borderBottomColor:'#333'}}><View style={{flex:1}}><Text style={{color:'#EEE'}}>{entry.technician} · {entry.date}</Text><Text style={{color:'#AAA'}}>{entry.hours} {tr('ساعة')} × {entry.hourlyRate.toFixed(2)} DH = {(entry.hours*entry.hourlyRate).toFixed(2)} DH{entry.note?` · ${entry.note}`:''}</Text></View><Pressable onPress={()=>onDeleteTime(project.id,entry.id)}><Text style={{color:'#E58B83'}}>{tr('حذف')}</Text></Pressable></View>)}
        <TextInput value={time.technician} onChangeText={value=>setTimeDrafts(current=>({...current,[project.id]:{...time,technician:value}}))} placeholder={tr('اسم التقني')} placeholderTextColor="#888" style={[input,{marginTop:8}]}/>
        {technicians.length>0&&<><Text style={{color:'#AAA',marginBottom:5}}>{tr('اختر تقنياً محفوظاً لساعات العمل')}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{technicians.map(technician=><Pressable key={technician.id} onPress={()=>setTimeDrafts(current=>({...current,[project.id]:{...time,technician:technician.name,rate:String(technician.hourlyRate)}}))} style={{borderColor:time.technician===technician.name?gold:'#444',borderWidth:1,borderRadius:8,padding:7}}><Text style={{color:time.technician===technician.name?gold:'#DDD'}}>{technician.name} · {technician.hourlyRate.toFixed(2)} DH</Text></Pressable>)}</View></>}
        <View style={{flexDirection:'row',gap:7}}><TextInput value={time.date} onChangeText={value=>setTimeDrafts(current=>({...current,[project.id]:{...time,date:value}}))} placeholder="YYYY-MM-DD" placeholderTextColor="#888" style={[input,{flex:1}]}/><TextInput value={time.hours} onChangeText={value=>setTimeDrafts(current=>({...current,[project.id]:{...time,hours:value}}))} keyboardType="decimal-pad" placeholder={tr('عدد الساعات')} placeholderTextColor="#888" style={[input,{flex:1}]}/></View>
        <View style={{flexDirection:'row',gap:7}}><TextInput value={time.rate} onChangeText={value=>setTimeDrafts(current=>({...current,[project.id]:{...time,rate:value}}))} keyboardType="decimal-pad" placeholder={tr('أجرة الساعة DH')} placeholderTextColor="#888" style={[input,{flex:1}]}/><TextInput value={time.note} onChangeText={value=>setTimeDrafts(current=>({...current,[project.id]:{...time,note:value}}))} placeholder={tr('ملاحظة')} placeholderTextColor="#888" style={[input,{flex:1}]}/></View>
        <Pressable onPress={()=>{const hours=Number(time.hours.replace(',','.')),rate=Number(time.rate.replace(',','.'));if(!time.technician.trim()||!Number.isFinite(hours)||!Number.isFinite(rate)){Alert.alert(tr('معلومات ناقصة'),tr('دخل اسم التقني والساعات والأجرة.'));return;}if(hours<=0||hours>24||rate<0){Alert.alert(tr('معلومات غير صالحة'),tr('دخل ساعات بين 0 و24 وأجرة صفر أو أكثر.'));return;}if(!isValidIsoDate(time.date.trim())){Alert.alert(tr('تاريخ غير صالح'),tr('دخل تاريخاً صحيحاً بصيغة YYYY-MM-DD.'));return;}if(onAddTime(project.id,{technician:time.technician,date:time.date,hours,hourlyRate:rate,note:time.note}))setTimeDrafts(current=>({...current,[project.id]:{...time,technician:'',hours:'',rate:'',note:''}}));}} style={button}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('تسجيل ساعات العمل')}</Text></Pressable>
      </View>;
    })}
    {projects.length===0&&<Text style={{color:'#999',textAlign:'center',padding:12}}>{tr('مازال ما كاين حتى مشروع.')}</Text>}
  </ScrollView>;
}
