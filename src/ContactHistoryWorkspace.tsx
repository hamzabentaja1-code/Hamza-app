import React, {useContext, useMemo, useState} from 'react';
import {View, ScrollView, StyleSheet, Alert} from 'react-native';
import {TText as Text, TTextInput as TextInput, LanguageContext, translateText} from './i18n';
import AccessiblePressable from './AccessiblePressable';
import {ContactInteraction, ContactInteractionKind, ContactType, filterContactInteractions} from './domain/contact-history';

const Pressable=AccessiblePressable;
type Contact={id:number;name:string};
type Props={customers:Contact[];suppliers:Contact[];entries:ContactInteraction[];onAdd:(input:{contactType:ContactType;contactId:number;contactName:string;kind:ContactInteractionKind;summary:string})=>void;onDelete:(id:number)=>void};
const labels:Record<ContactInteractionKind,string>={call:'مكالمة',message:'رسالة',meeting:'اجتماع',note:'ملاحظة'};
export default function ContactHistoryWorkspace({customers,suppliers,entries,onAdd,onDelete}:Props){
 const language=useContext(LanguageContext);const [contactType,setContactType]=useState<ContactType>('customer');const [contactId,setContactId]=useState('');const [kind,setKind]=useState<ContactInteractionKind>('note');const [summary,setSummary]=useState('');
 const contacts=contactType==='customer'?customers:suppliers;const selected=contacts.find(x=>String(x.id)===contactId);
 const visible=useMemo(()=>contactId?filterContactInteractions(entries,contactType,Number(contactId)):filterContactInteractions(entries),[entries,contactId,contactType]);
 const add=()=>{if(!selected){Alert.alert(translateText('اختار جهة الاتصال',language)||'اختار جهة الاتصال');return;}try{onAdd({contactType,contactId:selected.id,contactName:selected.name,kind,summary});setSummary('');}catch(e){Alert.alert(translateText('تعذر حفظ المتابعة',language)||'تعذر حفظ المتابعة',translateText(e instanceof Error?e.message:'راجع المعلومات.',language)||'راجع المعلومات.');}};
 const remove=(entry:ContactInteraction)=>Alert.alert(translateText('حذف المتابعة؟',language)||'حذف المتابعة؟',entry.contactName+' • '+entry.summary,[{text:translateText('إلغاء',language)||'إلغاء',style:'cancel'},{text:translateText('حذف',language)||'حذف',style:'destructive',onPress:()=>onDelete(entry.id)}]);
 return <ScrollView contentContainerStyle={s.body}>
  <View style={s.panel}><Text style={s.title}>سجل التواصل مع الزبناء والموردين</Text>
   <View style={s.row}><Pressable accessibilityState={{selected:contactType==='customer'}} onPress={()=>{setContactType('customer');setContactId('');}} style={[s.choice,contactType==='customer'&&s.active]}><Text style={s.choiceText}>الزبناء</Text></Pressable><Pressable accessibilityState={{selected:contactType==='supplier'}} onPress={()=>{setContactType('supplier');setContactId('');}} style={[s.choice,contactType==='supplier'&&s.active]}><Text style={s.choiceText}>الموردون</Text></Pressable></View>
   <Text style={s.label}>اختار جهة الاتصال</Text><View style={s.row}>{contacts.map(contact=><Pressable key={contact.id} accessibilityState={{selected:contactId===String(contact.id)}} onPress={()=>setContactId(String(contact.id))} style={[s.choice,contactId===String(contact.id)&&s.active]}><Text style={s.choiceText}>{contact.name}</Text></Pressable>)}</View>
   {contacts.length===0?<Text style={s.note}>ما كاين حتى جهة اتصال. زيد زبوناً أو مورداً أولاً.</Text>:null}
   <Text style={s.label}>نوع التواصل</Text><View style={s.row}>{(['call','message','meeting','note'] as ContactInteractionKind[]).map(value=><Pressable key={value} accessibilityState={{selected:kind===value}} onPress={()=>setKind(value)} style={[s.choice,kind===value&&s.active]}><Text style={s.choiceText}>{labels[value]}</Text></Pressable>)}</View>
   <TextInput value={summary} onChangeText={setSummary} placeholder="ملخص المكالمة أو الرسالة أو الملاحظة" placeholderTextColor="#888" multiline style={[s.input,{minHeight:90,textAlignVertical:'top'}]}/>
   <Pressable accessibilityRole="button" onPress={add} style={s.action}><Text style={s.actionText}>حفظ المتابعة</Text></Pressable>
  </View>
  <View style={s.panel}><Text style={s.title}>سجل المتابعات ({visible.length})</Text>
   {visible.map(entry=><View key={entry.id} style={s.entry}><View style={{flex:1}}><Text style={s.entryTitle}>{entry.contactName} • {entry.contactType==='customer'?'زبون':'مورد'} • {labels[entry.kind]}</Text><Text style={s.note}>{entry.summary}</Text><Text style={s.date}>{new Date(entry.createdAt).toLocaleString(language==='FR'?'fr-MA':'ar-MA')}</Text></View><Pressable onPress={()=>remove(entry)}><Text style={s.delete}>حذف</Text></Pressable></View>)}
   {visible.length===0?<Text style={s.note}>ما كايناش متابعات مسجلة دابا.</Text>:null}
  </View>
 </ScrollView>;
}
const s=StyleSheet.create({body:{paddingBottom:28,gap:12},panel:{backgroundColor:'#1B1B1B',padding:14,borderRadius:14,borderWidth:1,borderColor:'#444'},title:{fontSize:18,fontWeight:'800',color:'#D6AE55',marginBottom:12},row:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:10},choice:{padding:10,borderWidth:1,borderColor:'#444',borderRadius:9},active:{borderColor:'#D6AE55',backgroundColor:'#302819'},choiceText:{color:'#EEE',fontSize:13},label:{color:'#CCC',fontWeight:'700',marginVertical:8},input:{backgroundColor:'#111',borderColor:'#444',borderWidth:1,borderRadius:9,padding:12,color:'#FFF',marginBottom:10},action:{backgroundColor:'#D6AE55',padding:13,borderRadius:9,alignItems:'center'},actionText:{color:'#151515',fontWeight:'900'},entry:{flexDirection:'row',gap:10,paddingVertical:12,borderBottomWidth:1,borderColor:'#333'},entryTitle:{color:'#FFF',fontWeight:'800',marginBottom:5},note:{color:'#BBB',lineHeight:20},date:{color:'#888',fontSize:12,marginTop:5},delete:{color:'#E28A78',fontWeight:'800'}});
