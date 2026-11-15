import React,{useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {translate} from './i18n';
import {RecurringExpenseInput,RecurringExpenseRule} from './recurring-expenses';
import {BankAccount} from './domain/bank-accounts';

type Props={language:'AR'|'FR';rules:RecurringExpenseRule[];bankAccounts:BankAccount[];occurrences:{recurringRuleId?:number;recurringOccurrenceDate?:string}[];onCreate:(input:RecurringExpenseInput)=>boolean;onToggle:(id:number)=>void;onDelete:(id:number)=>void;onRecord:(id:number,method:'نقداً'|'بطاقة'|'تحويل',bankId?:string)=>boolean};
const gold='#D6AE55';
const panel={backgroundColor:'#1B1B1B',padding:14,borderRadius:12,borderWidth:1,borderColor:'#444'} as const;
const input={backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:10,color:'#FFF',marginBottom:8,textAlign:'auto' as const};
const button={backgroundColor:gold,borderRadius:9,padding:10,alignItems:'center' as const,marginTop:5};
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

export default function RecurringExpensesWorkspace({language,rules,bankAccounts,occurrences,onCreate,onToggle,onDelete,onRecord}:Props){
 const tr=(value:string)=>translate(language,value);
 const [title,setTitle]=useState(''),[category,setCategory]=useState(''),[amount,setAmount]=useState(''),[frequency,setFrequency]=useState<'أسبوعي'|'شهري'>('شهري'),[nextDueDate,setNextDueDate]=useState(today());
 const [methods,setMethods]=useState<Record<number,'نقداً'|'بطاقة'|'تحويل'>>({}),[bankIds,setBankIds]=useState<Record<number,string>>({});
 return <View style={{paddingBottom:18}}>
  <View style={panel}>
   <Text style={{color:gold,fontSize:18,fontWeight:'800',marginBottom:10}}>{tr('مصروف دوري جديد')}</Text>
   <TextInput value={title} onChangeText={setTitle} placeholder={tr('وصف المصروف')} placeholderTextColor="#888" style={input}/>
   <TextInput value={category} onChangeText={setCategory} placeholder={tr('تصنيف المصروف')} placeholderTextColor="#888" style={input}/>
   {Array.from(new Set(rules.map(rule=>rule.category))).map(value=><Pressable key={value} onPress={()=>setCategory(value)} style={{alignSelf:'flex-start',borderWidth:1,borderColor:category===value?gold:'#444',borderRadius:8,padding:7,marginBottom:5}}><Text style={{color:category===value?gold:'#DDD'}}>{value}</Text></Pressable>)}
   <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={tr('المبلغ DH')} placeholderTextColor="#888" style={input}/>
   <View style={{flexDirection:'row',gap:7,marginBottom:7}}>{(['أسبوعي','شهري'] as const).map(value=><Pressable key={value} onPress={()=>setFrequency(value)} style={{flex:1,alignItems:'center',borderWidth:1,borderColor:frequency===value?gold:'#444',borderRadius:8,padding:8}}><Text style={{color:frequency===value?gold:'#DDD'}}>{tr(value)}</Text></Pressable>)}</View>
   <TextInput value={nextDueDate} onChangeText={setNextDueDate} placeholder={tr('الموعد القادم YYYY-MM-DD')} placeholderTextColor="#888" style={input}/>
   <Pressable onPress={()=>{const value=Number(amount.replace(',','.'));if(onCreate({title,category,amount:value,frequency,nextDueDate})){setTitle('');setCategory('');setAmount('');setNextDueDate(today());}}} style={button}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('حفظ المصروف الدوري')}</Text></Pressable>
  </View>
  <Text style={{color:'#FFF',fontWeight:'800',fontSize:17,marginTop:16,marginBottom:8}}>{tr('المصاريف الدورية')} ({rules.length})</Text>
  {rules.map(rule=>{const method=methods[rule.id]||'نقداً',bankId=bankIds[rule.id]||'',isDue=rule.nextDueDate<=today(),paid=occurrences.some(item=>item.recurringRuleId===rule.id&&item.recurringOccurrenceDate===rule.nextDueDate);return <View key={rule.id} style={[panel,{marginBottom:8,opacity:rule.active?1:0.65}]}>
   <View style={{flexDirection:'row',alignItems:'center',gap:8}}><View style={{flex:1}}><Text style={{color:'#FFF',fontWeight:'800'}}>{rule.title} · {rule.category}</Text><Text style={{color:'#CCC',marginTop:4}}>{rule.amount.toFixed(2)} DH · {tr(rule.frequency)} · {tr('الموعد القادم')}: {rule.nextDueDate}</Text><Text style={{color:isDue?'#F0C76A':'#80C98C',marginTop:4}}>{!rule.active?tr('متوقف'):isDue?tr('مستحق، سجل الأداء لتحديث الموعد'):tr('غير مستحق بعد')}</Text></View><Pressable onPress={()=>onToggle(rule.id)}><Text style={{color:gold}}>{tr(rule.active?'إيقاف':'تفعيل')}</Text></Pressable><Pressable onPress={()=>onDelete(rule.id)}><Text style={{color:'#E58B83'}}>{tr('حذف')}</Text></Pressable></View>
   {rule.active&&isDue&&!paid&&<><View style={{flexDirection:'row',gap:6,marginTop:8}}>{(['نقداً','بطاقة','تحويل'] as const).map(value=><Pressable key={value} onPress={()=>setMethods(current=>({...current,[rule.id]:value}))} style={{flex:1,alignItems:'center',borderWidth:1,borderColor:method===value?gold:'#444',borderRadius:8,padding:7}}><Text style={{color:method===value?gold:'#DDD'}}>{tr(value)}</Text></Pressable>)}</View>{method!=='نقداً'&&<View style={{marginTop:7}}>{bankAccounts.map(account=><Pressable key={account.id} onPress={()=>setBankIds(current=>({...current,[rule.id]:account.id}))} style={{borderWidth:1,borderColor:bankId===account.id?gold:'#444',borderRadius:8,padding:8,marginBottom:5}}><Text style={{color:bankId===account.id?gold:'#DDD'}}>{account.name}</Text></Pressable>)}</View>}<Pressable onPress={()=>onRecord(rule.id,method,bankId||undefined)} style={button}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('تسجيل الأداء وموعد جديد')}</Text></Pressable></>}
   {paid&&<Text style={{color:'#80C98C',marginTop:8}}>{tr('تسجل أداء هاد الموعد')}</Text>}
   {occurrences.filter(item=>item.recurringRuleId===rule.id).length>0&&<Text style={{color:'#888',marginTop:6}}>{tr('عدد الأداءات المسجلة')}: {occurrences.filter(item=>item.recurringRuleId===rule.id).length}</Text>}
  </View>;})}
  {rules.length===0&&<Text style={{color:'#999',textAlign:'center',padding:12}}>{tr('مازال ما كاين حتى مصروف دوري.')}</Text>}
 </View>;
}
