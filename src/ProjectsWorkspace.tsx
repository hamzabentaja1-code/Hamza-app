import React,{useState} from 'react';
import {Alert,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {translate} from './i18n';
import {ProjectRecord,ProjectStatus,projectFinancials} from './projects';
import {isValidIsoDate} from './domain/document-conversion';

type Props={
  language:'AR'|'FR';
  projects:ProjectRecord[];
  expenses:{id:number;projectId?:number;amount:number}[];
  onCreate:(input:{name:string;customerName:string;budget:number;targetDate:string})=>void;
  onStatusChange:(projectId:number,status:ProjectStatus)=>void;
  onAddTask:(projectId:number,title:string)=>void;
  onToggleTask:(projectId:number,taskId:number,done:boolean)=>void;
  onAddExpense:(projectId:number,title:string,amount:number)=>void;
};

const gold='#D6AE55';
const panel={backgroundColor:'#1B1B1B',padding:15,borderRadius:13,borderWidth:1,borderColor:'#444'} as const;
const input={backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:11,color:'#FFF',marginBottom:9,textAlign:'auto' as const};
const button={backgroundColor:gold,borderRadius:9,padding:11,alignItems:'center' as const,marginTop:5};
const statuses:ProjectStatus[]=['مخطط','جارٍ','مكتمل','متوقف'];

export default function ProjectsWorkspace({language,projects,expenses,onCreate,onStatusChange,onAddTask,onToggleTask,onAddExpense}:Props){
  const tr=(value:string)=>translate(language,value);
  const [name,setName]=useState('');
  const [customerName,setCustomerName]=useState('');
  const [budget,setBudget]=useState('');
  const [targetDate,setTargetDate]=useState('');
  const [taskDrafts,setTaskDrafts]=useState<Record<number,string>>({});
  const [expenseDrafts,setExpenseDrafts]=useState<Record<number,{title:string;amount:string}>>({});
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
      const expense=expenseDrafts[project.id]||{title:'',amount:''};
      return <View key={project.id} style={[panel,{marginBottom:10}]}>
        <Text style={{color:'#FFF',fontWeight:'800',fontSize:17}}>{project.name}</Text>
        {!!project.customerName&&<Text style={{color:'#AAA',marginTop:4}}>{tr('الزبون')}: {project.customerName}</Text>}
        {!!project.targetDate&&<Text style={{color:'#AAA',marginTop:4}}>{tr('تاريخ التسليم')}: {project.targetDate}</Text>}
        <View style={{backgroundColor:'#111',borderRadius:9,padding:10,marginTop:9}}>
          <Text style={{color:'#DDD'}}>{tr('الميزانية')}: {project.budget.toFixed(2)} DH</Text>
          <Text style={{color:'#DDD',marginTop:4}}>{tr('المصاريف المسجلة')}: {totals.spent.toFixed(2)} DH</Text>
          <Text style={{color:totals.overBudget?'#F08C78':gold,fontWeight:'800',marginTop:4}}>{tr(totals.overBudget?'تجاوز الميزانية':'المتبقي')}: {totals.remaining.toFixed(2)} DH</Text>
        </View>
        <Text style={{color:gold,fontWeight:'800',marginTop:12,marginBottom:6}}>{tr('حالة المشروع')}</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{statuses.map(status=><Pressable key={status} onPress={()=>onStatusChange(project.id,status)} style={{borderColor:project.status===status?gold:'#444',borderWidth:1,borderRadius:8,padding:7}}><Text style={{color:project.status===status?gold:'#DDD'}}>{tr(status)}</Text></Pressable>)}</View>
        <Text style={{color:gold,fontWeight:'800',marginTop:12}}>{tr('المهام')} ({project.tasks.filter(task=>task.done).length}/{project.tasks.length})</Text>
        {project.tasks.map(task=><Pressable key={task.id} onPress={()=>onToggleTask(project.id,task.id,!task.done)} style={{paddingVertical:6}}><Text style={{color:task.done?'#777':'#EEE'}}>{task.done?'☑':'☐'} {task.title}</Text></Pressable>)}
        <View style={{flexDirection:'row',gap:7,marginTop:6}}><TextInput value={taskTitle} onChangeText={value=>setTaskDrafts(current=>({...current,[project.id]:value}))} placeholder={tr('مهمة جديدة')} placeholderTextColor="#888" style={[input,{flex:1,marginBottom:0}]}/><Pressable onPress={()=>{if(!taskTitle.trim()){Alert.alert(tr('معلومات ناقصة'),tr('دخل اسم المهمة.'));return;}onAddTask(project.id,taskTitle);setTaskDrafts(current=>({...current,[project.id]:''}));}} style={[button,{marginTop:0,paddingHorizontal:12}]}><Text style={{color:'#151515',fontWeight:'900'}}>+</Text></Pressable></View>
        <Text style={{color:gold,fontWeight:'800',marginTop:14,marginBottom:6}}>{tr('إضافة مصروف للمشروع')}</Text>
        <TextInput value={expense.title} onChangeText={value=>setExpenseDrafts(current=>({...current,[project.id]:{...expense,title:value}}))} placeholder={tr('وصف المصروف')} placeholderTextColor="#888" style={input}/>
        <TextInput value={expense.amount} onChangeText={value=>setExpenseDrafts(current=>({...current,[project.id]:{...expense,amount:value}}))} keyboardType="decimal-pad" placeholder={tr('المبلغ DH')} placeholderTextColor="#888" style={input}/>
        <Pressable onPress={()=>{const amount=Number(expense.amount.replace(',','.'));if(!expense.title.trim()||!Number.isFinite(amount)||amount<=0){Alert.alert(tr('معلومات ناقصة'),tr('دخل وصف المصروف ومبلغ صحيح.'));return;}onAddExpense(project.id,expense.title,amount);setExpenseDrafts(current=>({...current,[project.id]:{title:'',amount:''}}));}} style={button}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('تسجيل مصروف المشروع')}</Text></Pressable>
      </View>;
    })}
    {projects.length===0&&<Text style={{color:'#999',textAlign:'center',padding:12}}>{tr('مازال ما كاين حتى مشروع.')}</Text>}
  </ScrollView>;
}
