import React,{useState} from 'react';
import {Alert,View,StyleSheet} from 'react-native';
import {TText as Text,TTextInput as TextInput} from './i18n';
import AccessiblePressable from './AccessiblePressable';
import {RecurringExpenseRule,RecurrenceFrequency} from './domain/recurring-expenses';

type Props={rules:RecurringExpenseRule[];projects:{id:number;name:string}[];onAdd:(rule:RecurringExpenseRule)=>void;onToggle:(id:string)=>void;onGenerate:(today:string)=>void};
const GOLD='#D6AE55';
export default function RecurringExpensesWorkspace({rules,projects,onAdd,onToggle,onGenerate}:Props){
 const [title,setTitle]=useState('');const [amount,setAmount]=useState('');const [category,setCategory]=useState('');const [frequency,setFrequency]=useState<RecurrenceFrequency>('monthly');const [nextDate,setNextDate]=useState(new Date().toISOString().slice(0,10));const [projectId,setProjectId]=useState('');
 const add=()=>{const value=Number(amount.replace(',','.'));if(!title.trim()||!Number.isFinite(value)||value<=0||!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)){Alert.alert('معلومات ناقصة','دخل الوصف والمبلغ والتاريخ بشكل صحيح.');return;}
  const date=new Date(nextDate+'T00:00:00.000Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==nextDate){Alert.alert('تاريخ غير صالح','تاريخ الاستحقاق غير صالح.');return;}
  onAdd({id:'rec-expense-'+Date.now(),title:title.trim(),amount:value,category:category.trim()||undefined,frequency,nextDueDate:nextDate,active:true,projectId:projectId?Number(projectId):undefined});
  setTitle('');setAmount('');setCategory('');setProjectId('');
 };
 return <View>
  <View style={styles.panel}><Text style={styles.title}>إضافة مصروف متكرر</Text>
   <TextInput value={title} onChangeText={setTitle} placeholder="وصف المصروف (كراء، إنترنت...)" placeholderTextColor="#888" style={styles.input}/>
   <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="المبلغ DH" placeholderTextColor="#888" style={styles.input}/>
   <TextInput value={category} onChangeText={setCategory} placeholder="الصنف (اختياري)" placeholderTextColor="#888" style={styles.input}/>
   <Text style={styles.note}>الدورية</Text>
   <View style={styles.row}>{([{id:'weekly',label:'أسبوعي'},{id:'monthly',label:'شهري'},{id:'yearly',label:'سنوي'}] as const).map(x=><AccessiblePressable key={x.id} accessibilityState={{selected:frequency===x.id}} onPress={()=>setFrequency(x.id)} style={[styles.choice,{flex:1},frequency===x.id&&styles.selected]}><Text style={styles.label}>{x.label}</Text></AccessiblePressable>)}</View>
   <TextInput value={nextDate} onChangeText={setNextDate} placeholder="أول تاريخ استحقاق YYYY-MM-DD" placeholderTextColor="#888" style={styles.input}/>
   <Text style={styles.note}>المشروع (اختياري)</Text>
   {projects.map(x=><AccessiblePressable key={x.id} accessibilityState={{selected:projectId===String(x.id)}} onPress={()=>setProjectId(projectId===String(x.id)?'':String(x.id))} style={[styles.choice,projectId===String(x.id)&&styles.selected]}><Text style={styles.label}>{x.name}</Text></AccessiblePressable>)}
   <AccessiblePressable style={styles.action} onPress={add}><Text style={styles.actionText}>حفظ المصروف المتكرر</Text></AccessiblePressable>
  </View>
  <View style={[styles.panel,{marginTop:12}]}><Text style={styles.title}>المصاريف المتكررة</Text>
   {rules.map(rule=><View key={rule.id} style={styles.rule}><View style={{flex:1}}><Text style={styles.label}>{rule.title} • {rule.amount.toFixed(2)} DH</Text><Text style={styles.note}>{rule.frequency==='weekly'?'أسبوعي':rule.frequency==='monthly'?'شهري':'سنوي'} • الاستحقاق القادم: {rule.nextDueDate}</Text><Text style={styles.note}>{rule.active?'نشط':'متوقف'}</Text></View><AccessiblePressable onPress={()=>onToggle(rule.id)} style={[styles.small,rule.active?styles.stop:styles.start]}><Text style={styles.actionText}>{rule.active?'إيقاف':'تفعيل'}</Text></AccessiblePressable></View>)}
   {rules.length===0&&<Text style={styles.note}>مازال ما ضفتي حتى مصروف متكرر.</Text>}
   <AccessiblePressable style={styles.action} onPress={()=>onGenerate(new Date().toISOString().slice(0,10))}><Text style={styles.actionText}>تسجيل المصاريف المستحقة حتى اليوم</Text></AccessiblePressable>
   <Text style={styles.note}>التسجيل اليدوي يولد كل الاستحقاقات الفائتة مرة واحدة فقط، ويمنع تكرار نفس الاستحقاق.</Text>
  </View>
 </View>;
}
const styles=StyleSheet.create({panel:{backgroundColor:'#1B1B1B',padding:16,borderRadius:14,borderWidth:1,borderColor:'#444'},title:{color:GOLD,fontSize:18,fontWeight:'800',marginBottom:12},note:{color:'#BBB',fontSize:12,marginVertical:4},label:{color:'#FFF',fontWeight:'700'},input:{backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:12,color:'#FFF',marginBottom:10,textAlign:'right'},row:{flexDirection:'row',gap:8},choice:{borderWidth:1,borderColor:'#393939',borderRadius:8,padding:10,marginBottom:7},selected:{borderColor:GOLD,backgroundColor:'#302819'},action:{marginTop:8,backgroundColor:GOLD,borderRadius:9,padding:13,alignItems:'center'},actionText:{color:'#151515',fontWeight:'900'},rule:{flexDirection:'row',alignItems:'center',gap:8,padding:10,borderBottomWidth:1,borderBottomColor:'#333'},small:{padding:9,borderRadius:7},stop:{backgroundColor:'#8B3A31'},start:{backgroundColor:'#35684B'}});
