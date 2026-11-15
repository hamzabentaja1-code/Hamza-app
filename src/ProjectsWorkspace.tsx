import React,{useState} from 'react';
import {Alert,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {translate} from './i18n';
import {ProjectRecord,ProjectStatus,ProjectTaskPriority,ProjectTimeEntry,projectFinancials} from './projects';
import {isValidIsoDate} from './domain/document-conversion';

type Props={
  language:'AR'|'FR';
  projects:ProjectRecord[];
  expenses:{id:number;projectId?:number;amount:number}[];
  onCreate:(input:{name:string;customerName:string;budget:number;targetDate:string})=>void;
  onStatusChange:(projectId:number,status:ProjectStatus)=>void;
  onAddTask:(projectId:number,task:{title:string;dueDate?:string;priority:ProjectTaskPriority;assignee?:string})=>void;
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

export default function ProjectsWorkspace({language,projects,expenses,onCreate,onStatusChange,onAddTask,onToggleTask,onDeleteTask,onAddExpense,onAddTime,onDeleteTime}:Props){
  const tr=(value:string)=>translate(language,value);
  const [name,setName]=useState('');
  const [customerName,setCustomerName]=useState('');
  const [budget,setBudget]=useState('');
  const [targetDate,setTargetDate]=useState('');
  const [taskDrafts,setTaskDrafts]=useState<Record<number,string>>({});
  const [taskDates,setTaskDates]=useState<Record<number,string>>({});
  const [taskPriorities,setTaskPriorities]=useState<Record<number,ProjectTaskPriority>>({});
  const [taskAssignees,setTaskAssignees]=useState<Record<number,string>>({});
  const [expenseDrafts,setExpenseDrafts]=useState<Record<number,{title:string;amount:string}>>({});
  const [timeDrafts,setTimeDrafts]=useState<Record<number,{technician:string;date:string;hours:string;rate:string;note:string}>>({});
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
    <Text style={{color:'#FFF',fontWeight:'800',fontSize:17,marginTop:18,marginBottom:10}}>{tr('المشاريع')} ({projects.length})</Text>
    {projects.map(project=>{
      const totals=projectFinancials(project,expenses);
      const taskTitle=taskDrafts[project.id]||'';
      const taskDate=taskDates[project.id]||'';
      const taskPriority=taskPriorities[project.id]||'عادي';
      const taskAssignee=taskAssignees[project.id]||'';
      const expense=expenseDrafts[project.id]||{title:'',amount:''};
      const time=timeDrafts[project.id]||{technician:'',date:new Date().toISOString().slice(0,10),hours:'',rate:'',note:''};
      return <View key={project.id} style={[panel,{marginBottom:10}]}>
        <Text style={{color:'#FFF',fontWeight:'800',fontSize:17}}>{project.name}</Text>
        {!!project.customerName&&<Text style={{color:'#AAA',marginTop:4}}>{tr('الزبون')}: {project.customerName}</Text>}
        {!!project.targetDate&&<Text style={{color:'#AAA',marginTop:4}}>{tr('تاريخ التسليم')}: {project.targetDate}</Text>}
        <View style={{backgroundColor:'#111',borderRadius:9,padding:10,marginTop:9}}>
          <Text style={{color:'#DDD'}}>{tr('الميزانية')}: {project.budget.toFixed(2)} DH</Text>
          <Text style={{color:'#DDD',marginTop:4}}>{tr('المصاريف المسجلة')}: {totals.spent.toFixed(2)} DH</Text>
          <Text style={{color:'#DDD',marginTop:4}}>{tr('تكلفة الأجور')}: {totals.laborCost.toFixed(2)} DH</Text>
          <Text style={{color:totals.overBudget?'#F08C78':gold,fontWeight:'800',marginTop:4}}>{tr(totals.overBudget?'تجاوز الميزانية':'المتبقي')}: {totals.remaining.toFixed(2)} DH</Text>
        </View>
        <Text style={{color:gold,fontWeight:'800',marginTop:12,marginBottom:6}}>{tr('حالة المشروع')}</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{statuses.map(status=><Pressable key={status} onPress={()=>onStatusChange(project.id,status)} style={{borderColor:project.status===status?gold:'#444',borderWidth:1,borderRadius:8,padding:7}}><Text style={{color:project.status===status?gold:'#DDD'}}>{tr(status)}</Text></Pressable>)}</View>
        <Text style={{color:gold,fontWeight:'800',marginTop:12}}>{tr('المهام')} ({project.tasks.filter(task=>task.done).length}/{project.tasks.length})</Text>
        {project.tasks.map(task=><View key={task.id} style={{flexDirection:'row',alignItems:'center',paddingVertical:6}}><Pressable onPress={()=>onToggleTask(project.id,task.id,!task.done)} style={{flex:1}}><Text style={{color:task.done?'#777':'#EEE'}}>{task.done?'☑':'☐'} {task.title}{task.assignee?` · ${tr('المكلف')}: ${task.assignee}`:''}{task.priority?` · ${tr(task.priority)}`:''}{task.dueDate?` · ${tr('الأجل')}: ${task.dueDate}`:''}</Text></Pressable><Pressable onPress={()=>onDeleteTask(project.id,task.id)} style={{paddingHorizontal:8}}><Text style={{color:'#E58B83'}}>{tr('حذف')}</Text></Pressable></View>)}
        <TextInput value={taskDate} onChangeText={value=>setTaskDates(current=>({...current,[project.id]:value}))} placeholder={tr('آخر أجل (اختياري) YYYY-MM-DD')} placeholderTextColor="#888" style={[input,{marginTop:7}]}/>
        <Text style={{color:'#AAA',marginBottom:6}}>{tr('أولوية المهمة')}</Text><View style={{flexDirection:'row',gap:6,marginBottom:7}}>{(['عادي','مهم','عاجل'] as ProjectTaskPriority[]).map(priority=><Pressable key={priority} onPress={()=>setTaskPriorities(current=>({...current,[project.id]:priority}))} style={{borderColor:taskPriority===priority?gold:'#444',borderWidth:1,borderRadius:8,padding:7}}><Text style={{color:taskPriority===priority?gold:'#DDD'}}>{tr(priority)}</Text></Pressable>)}</View>
        <TextInput value={taskAssignee} onChangeText={value=>setTaskAssignees(current=>({...current,[project.id]:value}))} placeholder={tr('اسم المكلف بالمهمة (اختياري)')} placeholderTextColor="#888" style={[input,{marginTop:7}]}/>
        <View style={{flexDirection:'row',gap:7,marginTop:6}}><TextInput value={taskTitle} onChangeText={value=>setTaskDrafts(current=>({...current,[project.id]:value}))} placeholder={tr('مهمة جديدة')} placeholderTextColor="#888" style={[input,{flex:1,marginBottom:0}]}/><Pressable onPress={()=>{if(!taskTitle.trim()){Alert.alert(tr('معلومات ناقصة'),tr('دخل اسم المهمة.'));return;}if(taskDate.trim()&&!isValidIsoDate(taskDate.trim())){Alert.alert(tr('تاريخ غير صالح'),tr('دخل تاريخاً صحيحاً بصيغة YYYY-MM-DD.'));return;}onAddTask(project.id,{title:taskTitle,dueDate:taskDate,priority:taskPriority,assignee:taskAssignee});setTaskDrafts(current=>({...current,[project.id]:''}));setTaskDates(current=>({...current,[project.id]:''}));setTaskAssignees(current=>({...current,[project.id]:''}));}} style={[button,{marginTop:0,paddingHorizontal:12}]}><Text style={{color:'#151515',fontWeight:'900'}}>+</Text></Pressable></View>
        <Text style={{color:gold,fontWeight:'800',marginTop:14,marginBottom:6}}>{tr('إضافة مصروف للمشروع')}</Text>
        <TextInput value={expense.title} onChangeText={value=>setExpenseDrafts(current=>({...current,[project.id]:{...expense,title:value}}))} placeholder={tr('وصف المصروف')} placeholderTextColor="#888" style={input}/>
        <TextInput value={expense.amount} onChangeText={value=>setExpenseDrafts(current=>({...current,[project.id]:{...expense,amount:value}}))} keyboardType="decimal-pad" placeholder={tr('المبلغ DH')} placeholderTextColor="#888" style={input}/>
        <Pressable onPress={()=>{const amount=Number(expense.amount.replace(',','.'));if(!expense.title.trim()||!Number.isFinite(amount)||amount<=0){Alert.alert(tr('معلومات ناقصة'),tr('دخل وصف المصروف ومبلغ صحيح.'));return;}onAddExpense(project.id,expense.title,amount);setExpenseDrafts(current=>({...current,[project.id]:{title:'',amount:''}}));}} style={button}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('تسجيل مصروف المشروع')}</Text></Pressable>
        <Text style={{color:gold,fontWeight:'800',marginTop:14,marginBottom:6}}>{tr('ساعات العمل')}: {project.timeEntries.reduce((sum,entry)=>sum+entry.hours,0).toFixed(2)} {tr('ساعة')}</Text>
        {project.timeEntries.map((entry:ProjectTimeEntry)=><View key={entry.id} style={{flexDirection:'row',alignItems:'center',paddingVertical:5,borderBottomWidth:1,borderBottomColor:'#333'}}><View style={{flex:1}}><Text style={{color:'#EEE'}}>{entry.technician} · {entry.date}</Text><Text style={{color:'#AAA'}}>{entry.hours} {tr('ساعة')} × {entry.hourlyRate.toFixed(2)} DH = {(entry.hours*entry.hourlyRate).toFixed(2)} DH{entry.note?` · ${entry.note}`:''}</Text></View><Pressable onPress={()=>onDeleteTime(project.id,entry.id)}><Text style={{color:'#E58B83'}}>{tr('حذف')}</Text></Pressable></View>)}
        <TextInput value={time.technician} onChangeText={value=>setTimeDrafts(current=>({...current,[project.id]:{...time,technician:value}}))} placeholder={tr('اسم التقني')} placeholderTextColor="#888" style={[input,{marginTop:8}]}/>
        <View style={{flexDirection:'row',gap:7}}><TextInput value={time.date} onChangeText={value=>setTimeDrafts(current=>({...current,[project.id]:{...time,date:value}}))} placeholder="YYYY-MM-DD" placeholderTextColor="#888" style={[input,{flex:1}]}/><TextInput value={time.hours} onChangeText={value=>setTimeDrafts(current=>({...current,[project.id]:{...time,hours:value}}))} keyboardType="decimal-pad" placeholder={tr('عدد الساعات')} placeholderTextColor="#888" style={[input,{flex:1}]}/></View>
        <View style={{flexDirection:'row',gap:7}}><TextInput value={time.rate} onChangeText={value=>setTimeDrafts(current=>({...current,[project.id]:{...time,rate:value}}))} keyboardType="decimal-pad" placeholder={tr('أجرة الساعة DH')} placeholderTextColor="#888" style={[input,{flex:1}]}/><TextInput value={time.note} onChangeText={value=>setTimeDrafts(current=>({...current,[project.id]:{...time,note:value}}))} placeholder={tr('ملاحظة')} placeholderTextColor="#888" style={[input,{flex:1}]}/></View>
        <Pressable onPress={()=>{const hours=Number(time.hours.replace(',','.')),rate=Number(time.rate.replace(',','.'));if(!time.technician.trim()||!Number.isFinite(hours)||!Number.isFinite(rate)){Alert.alert(tr('معلومات ناقصة'),tr('دخل اسم التقني والساعات والأجرة.'));return;}if(hours<=0||hours>24||rate<0){Alert.alert(tr('معلومات غير صالحة'),tr('دخل ساعات بين 0 و24 وأجرة صفر أو أكثر.'));return;}if(!isValidIsoDate(time.date.trim())){Alert.alert(tr('تاريخ غير صالح'),tr('دخل تاريخاً صحيحاً بصيغة YYYY-MM-DD.'));return;}if(onAddTime(project.id,{technician:time.technician,date:time.date,hours,hourlyRate:rate,note:time.note}))setTimeDrafts(current=>({...current,[project.id]:{...time,technician:'',hours:'',rate:'',note:''}}));}} style={button}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('تسجيل ساعات العمل')}</Text></Pressable>
      </View>;
    })}
    {projects.length===0&&<Text style={{color:'#999',textAlign:'center',padding:12}}>{tr('مازال ما كاين حتى مشروع.')}</Text>}
  </ScrollView>;
}
