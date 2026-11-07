import React, {useMemo, useState} from 'react';
import {View, ScrollView, StyleSheet, Alert, Text, TextInput, Pressable} from 'react-native';
import {ContactInteraction, ContactInteractionKind, ContactType, filterContactInteractions} from './domain/contact-history';
import {getLayoutDirection} from './i18n';

type Contact={id:number;name:string};
type Props={
  customers:Contact[];
  suppliers:Contact[];
  entries:ContactInteraction[];
  onAdd:(input:{contactType:ContactType;contactId:number;contactName:string;kind:ContactInteractionKind;summary:string})=>void;
  onDelete:(id:number)=>void;
  language?:'AR'|'FR';
};
const copy={
  AR:{title:'سجل التواصل مع الزبناء والموردين',customers:'الزبناء',suppliers:'الموردون',choose:'اختار جهة الاتصال',emptyContacts:'ما كاين حتى جهة اتصال. زيد زبوناً أو مورداً أولاً.',kind:'نوع التواصل',call:'مكالمة',message:'رسالة',meeting:'اجتماع',note:'ملاحظة',placeholder:'ملخص المكالمة أو الرسالة أو الملاحظة',save:'حفظ المتابعة',history:'سجل المتابعات',none:'ما كايناش متابعات مسجلة دابا.',customer:'زبون',supplier:'مورد',delete:'حذف',confirm:'حذف المتابعة؟',cancel:'إلغاء',failed:'تعذر حفظ المتابعة',invalid:'راجع المعلومات.'},
  FR:{title:'Historique des contacts clients et fournisseurs',customers:'Clients',suppliers:'Fournisseurs',choose:'Choisir un contact',emptyContacts:'Aucun contact. Ajoutez d’abord un client ou un fournisseur.',kind:'Type de contact',call:'Appel',message:'Message',meeting:'Réunion',note:'Note',placeholder:'Résumé de l’appel, du message ou de la note',save:'Enregistrer le suivi',history:'Historique des suivis',none:'Aucun suivi enregistré.',customer:'Client',supplier:'Fournisseur',delete:'Supprimer',confirm:'Supprimer ce suivi ?',cancel:'Annuler',failed:'Impossible d’enregistrer',invalid:'Vérifiez les informations.'}
};
export default function ContactHistoryWorkspace({customers,suppliers,entries,onAdd,onDelete,language='AR'}:Props){
 const t=copy[language];
 const [contactType,setContactType]=useState<ContactType>('customer');
 const [contactId,setContactId]=useState('');
 const [kind,setKind]=useState<ContactInteractionKind>('note');
 const [summary,setSummary]=useState('');
 const contacts=contactType==='customer'?customers:suppliers;
 const selected=contacts.find(x=>String(x.id)===contactId);
 const visible=useMemo(()=>contactId?filterContactInteractions(entries,contactType,Number(contactId)):filterContactInteractions(entries),[entries,contactId,contactType]);
 const labels:Record<ContactInteractionKind,string>={call:t.call,message:t.message,meeting:t.meeting,note:t.note};
 const add=()=>{
  if(!selected){Alert.alert(t.choose);return;}
  try{onAdd({contactType,contactId:selected.id,contactName:selected.name,kind,summary});setSummary('');}
  catch(e){Alert.alert(t.failed,e instanceof Error?e.message:t.invalid);}
 };
 const remove=(entry:ContactInteraction)=>Alert.alert(t.confirm,entry.contactName+' • '+entry.summary,[
  {text:t.cancel,style:'cancel'},
  {text:t.delete,style:'destructive',onPress:()=>onDelete(entry.id)}
 ]);
 return <ScrollView style={{direction:getLayoutDirection(language)}} contentContainerStyle={[s.body,{direction:getLayoutDirection(language)}]}>
  <View style={s.panel}>
   <Text style={s.title}>{t.title}</Text>
   <View style={s.row}>
    <Pressable accessibilityRole="button" accessibilityState={{selected:contactType==='customer'}} onPress={()=>{setContactType('customer');setContactId('');}} style={[s.choice,contactType==='customer'&&s.active]}><Text style={s.choiceText}>{t.customers}</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityState={{selected:contactType==='supplier'}} onPress={()=>{setContactType('supplier');setContactId('');}} style={[s.choice,contactType==='supplier'&&s.active]}><Text style={s.choiceText}>{t.suppliers}</Text></Pressable>
   </View>
   <Text style={s.label}>{t.choose}</Text>
   <View style={s.row}>{contacts.map(contact=><Pressable key={contact.id} accessibilityRole="button" accessibilityState={{selected:contactId===String(contact.id)}} onPress={()=>setContactId(String(contact.id))} style={[s.choice,contactId===String(contact.id)&&s.active]}><Text style={s.choiceText}>{contact.name}</Text></Pressable>)}</View>
   {contacts.length===0?<Text style={s.note}>{t.emptyContacts}</Text>:null}
   <Text style={s.label}>{t.kind}</Text>
   <View style={s.row}>{(['call','message','meeting','note'] as ContactInteractionKind[]).map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:kind===value}} onPress={()=>setKind(value)} style={[s.choice,kind===value&&s.active]}><Text style={s.choiceText}>{labels[value]}</Text></Pressable>)}</View>
   <TextInput accessibilityLabel={t.placeholder} value={summary} onChangeText={setSummary} placeholder={t.placeholder} placeholderTextColor="#888" multiline style={[s.input,{minHeight:90,textAlignVertical:'top'}]}/>
   <Pressable accessibilityRole="button" accessibilityLabel={t.save} onPress={add} style={s.action}><Text style={s.actionText}>{t.save}</Text></Pressable>
  </View>
  <View style={s.panel}>
   <Text style={s.title}>{t.history} ({visible.length})</Text>
   {visible.map(entry=><View key={entry.id} style={s.entry}>
    <View style={{flex:1}}><Text style={s.entryTitle}>{entry.contactName} • {entry.contactType==='customer'?t.customer:t.supplier} • {labels[entry.kind]}</Text><Text style={s.note}>{entry.summary}</Text><Text style={s.date}>{new Date(entry.createdAt).toLocaleString(language==='FR'?'fr-MA':'ar-MA')}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel={t.delete+' '+entry.contactName} onPress={()=>remove(entry)}><Text style={s.delete}>{t.delete}</Text></Pressable>
   </View>)}
   {visible.length===0?<Text style={s.note}>{t.none}</Text>:null}
  </View>
 </ScrollView>;
}
const s=StyleSheet.create({
 body:{paddingBottom:28,gap:12},
 panel:{backgroundColor:'#1B1B1B',padding:14,borderRadius:14,borderWidth:1,borderColor:'#444'},
 title:{fontSize:18,fontWeight:'800',color:'#D6AE55',marginBottom:12},
 row:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:10},
 choice:{padding:10,borderWidth:1,borderColor:'#444',borderRadius:9},
 active:{borderColor:'#D6AE55',backgroundColor:'#302819'},
 choiceText:{color:'#EEE',fontSize:13},
 label:{color:'#CCC',fontWeight:'700',marginVertical:8},
 input:{backgroundColor:'#111',borderColor:'#444',borderWidth:1,borderRadius:9,padding:12,color:'#FFF',marginBottom:10},
 action:{backgroundColor:'#D6AE55',padding:13,borderRadius:9,alignItems:'center'},
 actionText:{color:'#151515',fontWeight:'900'},
 entry:{flexDirection:'row',gap:10,paddingVertical:12,borderBottomWidth:1,borderColor:'#333'},
 entryTitle:{color:'#FFF',fontWeight:'800',marginBottom:5},
 note:{color:'#BBB',lineHeight:20},
 date:{color:'#888',fontSize:12,marginTop:5},
 delete:{color:'#E28A78',fontWeight:'800'}
});
