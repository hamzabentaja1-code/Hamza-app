import React, {useMemo, useState} from 'react';
import {Alert, ScrollView, StyleSheet, View} from 'react-native';
import {TText as Text, TTextInput as TextInput} from './i18n';
import AccessiblePressable from './AccessiblePressable';
import {ContactInteraction, ContactType, ContactInteractionKind, filterContactInteractions} from './domain/contact-history';

type Contact = {id:number; name:string};
type NewInteraction = Omit<ContactInteraction, 'id' | 'createdAt'>;
type Props = {
  customers: Contact[];
  suppliers: Contact[];
  entries: ContactInteraction[];
  onAdd: (input: NewInteraction) => void;
  onDelete: (id:number) => void;
};

const GOLD = '#D6AE55';
const kinds: Array<{id:ContactInteractionKind; label:string}> = [
  {id:'call',label:'مكالمة'},
  {id:'message',label:'رسالة'},
  {id:'meeting',label:'اجتماع'},
  {id:'note',label:'ملاحظة'},
];

export default function ContactHistoryWorkspace({customers,suppliers,entries,onAdd,onDelete}:Props) {
  const [contactType,setContactType] = useState<ContactType>('customer');
  const [contactId,setContactId] = useState('');
  const [kind,setKind] = useState<ContactInteractionKind>('call');
  const [summary,setSummary] = useState('');
  const contacts = contactType === 'customer' ? customers : suppliers;
  const selectedContact = contacts.find(contact => String(contact.id) === contactId);
  const visibleEntries = useMemo(
    () => filterContactInteractions(entries, contactType, contactId ? Number(contactId) : undefined),
    [entries,contactType,contactId],
  );
  const add = () => {
    if (!selectedContact || summary.trim().length < 2) {
      Alert.alert('معلومات غير مكتملة','اختار جهة الاتصال وكتب ملخصاً من حرفين على الأقل.');
      return;
    }
    onAdd({
      contactType,
      contactId:selectedContact.id,
      contactName:selectedContact.name,
      kind,
      summary:summary.trim(),
    });
    setSummary('');
  };
  const confirmDelete = (entry:ContactInteraction) => {
    Alert.alert('حذف المتابعة؟','غادي يتحذف هاد السجل فقط.',[
      {text:'إلغاء',style:'cancel'},
      {text:'حذف',style:'destructive',onPress:()=>onDelete(entry.id)},
    ]);
  };
  return <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
    <View style={s.panel}>
      <Text style={s.title}>سجل التواصل مع الزبناء والموردين</Text>
      <View style={s.row}>
        <AccessiblePressable accessibilityState={{selected:contactType==='customer'}} onPress={()=>{setContactType('customer');setContactId('');}} style={[s.choice,contactType==='customer'&&s.selected]}>
          <Text style={s.choiceText}>زبون</Text>
        </AccessiblePressable>
        <AccessiblePressable accessibilityState={{selected:contactType==='supplier'}} onPress={()=>{setContactType('supplier');setContactId('');}} style={[s.choice,contactType==='supplier'&&s.selected]}>
          <Text style={s.choiceText}>مورد</Text>
        </AccessiblePressable>
      </View>
      <Text style={s.label}>اختار جهة الاتصال</Text>
      {contacts.length ? <View style={s.wrap}>
        {contacts.map(contact=><AccessiblePressable key={contact.id} accessibilityState={{selected:contactId===String(contact.id)}} onPress={()=>setContactId(String(contact.id))} style={[s.choice,contactId===String(contact.id)&&s.selected]}>
          <Text style={s.choiceText}>{contact.name}</Text>
        </AccessiblePressable>)}
      </View> : <Text style={s.empty}>ما كاين حتى جهة اتصال. زيد زبوناً أو مورداً أولاً.</Text>}
      <Text style={s.label}>نوع التواصل</Text>
      <View style={s.wrap}>
        {kinds.map(item=><AccessiblePressable key={item.id} accessibilityState={{selected:kind===item.id}} onPress={()=>setKind(item.id)} style={[s.choice,kind===item.id&&s.selected]}>
          <Text style={s.choiceText}>{item.label}</Text>
        </AccessiblePressable>)}
      </View>
      <TextInput value={summary} onChangeText={setSummary} placeholder="ملخص المكالمة أو الرسالة أو الملاحظة" multiline style={s.input}/>
      <AccessiblePressable disabled={!selectedContact||summary.trim().length<2} onPress={add} style={[s.action,(!selectedContact||summary.trim().length<2)&&s.disabled]}>
        <Text style={s.actionText}>حفظ المتابعة</Text>
      </AccessiblePressable>
    </View>
    <View style={s.panel}>
      <Text style={s.title}>سجل المتابعات ({visibleEntries.length})</Text>
      {visibleEntries.map(entry=><View key={entry.id} style={s.entry}>
        <View style={{flex:1}}>
          <Text style={s.entryTitle}>{entry.contactName} • {kinds.find(item=>item.id===entry.kind)?.label||entry.kind}</Text>
          <Text style={s.entryText}>{entry.summary}</Text>
          <Text style={s.date}>{new Date(entry.createdAt).toLocaleString()}</Text>
        </View>
        <AccessiblePressable accessibilityLabel="حذف المتابعة" onPress={()=>confirmDelete(entry)} style={s.delete}>
          <Text style={s.deleteText}>حذف</Text>
        </AccessiblePressable>
      </View>)}
      {visibleEntries.length===0?<Text style={s.empty}>ما كايناش متابعات مسجلة دابا.</Text>:null}
    </View>
  </ScrollView>;
}

const s=StyleSheet.create({
  body:{paddingBottom:28,gap:12},
  panel:{backgroundColor:'#1B1B1B',padding:14,borderRadius:14,borderWidth:1,borderColor:'#444'},
  title:{fontSize:18,fontWeight:'800',color:GOLD,marginBottom:12},
  row:{flexDirection:'row',gap:8},
  wrap:{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:8},
  choice:{paddingVertical:9,paddingHorizontal:12,borderRadius:8,borderWidth:1,borderColor:'#444',marginBottom:5},
  selected:{borderColor:GOLD,backgroundColor:'#302819'},
  choiceText:{color:'#FFF',fontWeight:'700'},
  label:{color:'#CCC',fontWeight:'700',marginTop:12,marginBottom:7},
  input:{backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:12,color:'#FFF',minHeight:90,textAlignVertical:'top',marginTop:10},
  action:{marginTop:10,backgroundColor:GOLD,borderRadius:9,padding:13,alignItems:'center'},
  disabled:{opacity:0.45},
  actionText:{color:'#151515',fontWeight:'900'},
  entry:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#111',borderRadius:10,padding:12,marginBottom:8,borderWidth:1,borderColor:'#333'},
  entryTitle:{color:'#FFF',fontWeight:'800'},
  entryText:{color:'#DDD',marginTop:5,lineHeight:21},
  date:{color:'#888',fontSize:11,marginTop:5},
  delete:{padding:8,borderRadius:7,borderWidth:1,borderColor:'#8B4B43'},
  deleteText:{color:'#E28A78',fontWeight:'700'},
  empty:{color:'#888',paddingVertical:12,textAlign:'center'},
});
