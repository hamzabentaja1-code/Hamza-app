import React, {useState} from 'react';
import {Alert, Pressable, Text, TextInput, View} from 'react-native';
import {ProjectRecord, ProjectStatus, projectBalance, validateProject} from './projects';
import {AppLanguage} from './i18n';

const GOLD='#D6AE55';
const statuses:ProjectStatus[]=['planned','in_progress','completed','cancelled'];
const statusText:Record<AppLanguage,Record<ProjectStatus,string>>={
  AR:{planned:'مخطط',in_progress:'قيد الإنجاز',completed:'مكتمل',cancelled:'ملغى'},
  FR:{planned:'Planifié',in_progress:'En cours',completed:'Terminé',cancelled:'Annulé'},
};

export default function ProjectsWorkspace({language,customers,projects,onSave,onDelete}:{language:AppLanguage;customers:{id:number;name:string}[];projects:ProjectRecord[];onSave:(project:ProjectRecord)=>void;onDelete:(id:number)=>void}){
  const ar=language==='AR';
  const [editingId,setEditingId]=useState<number|null>(null);
  const [name,setName]=useState(''); const [customerName,setCustomerName]=useState(''); const [budget,setBudget]=useState('');
  const [paid,setPaid]=useState('0'); const [startDate,setStartDate]=useState(new Date().toISOString().slice(0,10)); const [dueDate,setDueDate]=useState(''); const [notes,setNotes]=useState(''); const [status,setStatus]=useState<ProjectStatus>('planned');
  const tr=(a:string,f:string)=>ar?a:f;
  const clear=()=>{setEditingId(null);setName('');setCustomerName('');setBudget('');setPaid('0');setStartDate(new Date().toISOString().slice(0,10));setDueDate('');setNotes('');setStatus('planned');};
  const save=()=>{
    const input={name,customerName,status,budgetCentimes:Math.round(Number(budget.replace(',','.'))*100),paidCentimes:Math.round(Number(paid.replace(',','.'))*100),startDate,dueDate,notes:notes.trim()};
    const errors=validateProject(input);
    if(errors.length){Alert.alert(tr('معلومات ناقصة','Informations manquantes'),tr(errors[0],({
      'دخل اسم المشروع.':'Saisissez le nom du projet.','اختار الزبون.':'Choisissez un client.','الميزانية غير صحيحة.':'Le budget est invalide.','المبلغ المؤدى غير صحيح.':'Le montant payé est invalide.','دخل تاريخ البداية.':'Saisissez la date de début.','تاريخ النهاية خاصو يكون من بعد البداية.':'La date de fin doit être après le début.'} as Record<string,string>)[errors[0]]||errors[0]));return;}
    onSave({id:editingId??Date.now(),...input});clear();
  };
  const edit=(p:ProjectRecord)=>{setEditingId(p.id);setName(p.name);setCustomerName(p.customerName);setStatus(p.status);setBudget((p.budgetCentimes/100).toFixed(2));setPaid((p.paidCentimes/100).toFixed(2));setStartDate(p.startDate);setDueDate(p.dueDate);setNotes(p.notes);};
  const amount=(centimes:number)=>(centimes/100).toFixed(2)+' DH';
  return <>
    <View style={{backgroundColor:'#151515',borderColor:'#343434',borderWidth:1,borderRadius:14,padding:14,gap:10}}>
      <Text style={{color:GOLD,fontSize:18,fontWeight:'800'}}>{editingId===null?tr('إضافة مشروع','Nouveau projet'):tr('تعديل المشروع','Modifier le projet')}</Text>
      <TextInput value={name} onChangeText={setName} placeholder={tr('اسم المشروع','Nom du projet')} placeholderTextColor="#888" style={input}/>
      <Text style={{color:'#ddd',fontWeight:'700'}}>{tr('الزبون','Client')}</Text>
      {customers.map(c=><Pressable key={c.id} onPress={()=>setCustomerName(c.name)} style={[choice,customerName===c.name&&{borderColor:GOLD}]}><Text style={{color:'#fff'}}>{c.name}</Text></Pressable>)}
      {customers.length===0&&<Text style={{color:'#aaa'}}>{tr('زيد زبوناً من قسم الزبناء أولاً.','Ajoutez d’abord un client dans la rubrique Clients.')}</Text>}
      <View style={{flexDirection:'row',gap:8}}><TextInput value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder={tr('الميزانية DH','Budget DH')} placeholderTextColor="#888" style={[input,{flex:1}]}/><TextInput value={paid} onChangeText={setPaid} keyboardType="decimal-pad" placeholder={tr('المؤدى DH','Payé DH')} placeholderTextColor="#888" style={[input,{flex:1}]}/></View>
      <View style={{flexDirection:'row',gap:8}}><TextInput value={startDate} onChangeText={setStartDate} placeholder={tr('تاريخ البداية YYYY-MM-DD','Début AAAA-MM-JJ')} placeholderTextColor="#888" style={[input,{flex:1}]}/><TextInput value={dueDate} onChangeText={setDueDate} placeholder={tr('النهاية YYYY-MM-DD','Fin AAAA-MM-JJ')} placeholderTextColor="#888" style={[input,{flex:1}]}/></View>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{statuses.map(value=><Pressable key={value} onPress={()=>setStatus(value)} style={[choice,status===value&&{borderColor:GOLD}]}><Text style={{color:status===value?GOLD:'#ddd'}}>{statusText[language][value]}</Text></Pressable>)}</View>
      <TextInput value={notes} onChangeText={setNotes} multiline placeholder={tr('ملاحظات (اختياري)','Notes (facultatif)')} placeholderTextColor="#888" style={[input,{minHeight:72,textAlignVertical:'top'}]}/>
      <Pressable onPress={save} style={{backgroundColor:GOLD,borderRadius:10,padding:13,alignItems:'center'}}><Text style={{color:'#111',fontWeight:'800'}}>{editingId===null?tr('حفظ المشروع','Enregistrer le projet'):tr('حفظ التعديلات','Enregistrer les modifications')}</Text></Pressable>
      {editingId!==null&&<Pressable onPress={clear} style={{padding:10,alignItems:'center'}}><Text style={{color:'#ddd'}}>{tr('إلغاء التعديل','Annuler la modification')}</Text></Pressable>}
    </View>
    <Text style={{color:GOLD,fontSize:18,fontWeight:'800',marginTop:18,marginBottom:8}}>{tr('المشاريع','Projets')} ({projects.length})</Text>
    {projects.map(p=><View key={p.id} style={listItem}><View style={{flex:1,gap:4}}><Text style={{color:'#fff',fontWeight:'800'}}>{p.name}</Text><Text style={{color:'#bbb'}}>{p.customerName} • {statusText[language][p.status]}</Text><Text style={{color:'#bbb'}}>{p.startDate}{p.dueDate?' → '+p.dueDate:''}</Text><Text style={{color:'#ddd'}}>{tr('الميزانية','Budget')}: {amount(p.budgetCentimes)} • {tr('المؤدى','Payé')}: {amount(p.paidCentimes)} • {tr('الباقي','Solde')}: {amount(projectBalance(p))}</Text>{!!p.notes&&<Text style={{color:'#aaa'}}>{p.notes}</Text>}<Pressable onPress={()=>edit(p)}><Text style={{color:GOLD,fontWeight:'700'}}>{tr('تعديل','Modifier')}</Text></Pressable></View><Pressable onPress={()=>Alert.alert(tr('حذف المشروع؟','Supprimer le projet ?'),p.name,[{text:tr('إلغاء','Annuler'),style:'cancel'},{text:tr('حذف','Supprimer'),style:'destructive',onPress:()=>onDelete(p.id)}])}><Text style={{color:'#ff7777',fontWeight:'700'}}>{tr('حذف','Supprimer')}</Text></Pressable></View>)}
    {projects.length===0&&<Text style={{color:'#aaa',paddingVertical:10}}>{tr('مازال ما تسجل حتى مشروع.','Aucun projet enregistré.')}</Text>}
  </>;
}

const input={backgroundColor:'#202020',borderWidth:1,borderColor:'#3a3a3a',borderRadius:9,color:'#fff',padding:11} as const;
const choice={backgroundColor:'#202020',borderWidth:1,borderColor:'#3a3a3a',borderRadius:8,padding:9} as const;
const listItem={backgroundColor:'#151515',borderWidth:1,borderColor:'#333',borderRadius:12,padding:13,marginBottom:9,flexDirection:'row',alignItems:'flex-start',gap:10} as const;
