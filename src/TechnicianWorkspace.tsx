import React,{useState} from 'react';
import {Alert,Pressable,Text,TextInput,View} from 'react-native';
import {Technician,validateTechnician} from './technicians';
import {translate} from './i18n';
const gold='#D6AE55';
const input={backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:8,padding:10,color:'#FFF',marginBottom:8} as const;
type Props={language:'AR'|'FR';technicians:Technician[];onSave:(technician:Technician)=>void;onDelete:(id:string)=>void;onToggle:(id:string)=>void};
export default function TechnicianWorkspace({language,technicians,onSave,onDelete,onToggle}:Props){
 const tr=(value:string)=>translate(language,value);const [editing,setEditing]=useState<string|null>(null);const [name,setName]=useState('');const [phone,setPhone]=useState('');const [specialty,setSpecialty]=useState('');const [rate,setRate]=useState('0');
 const clear=()=>{setEditing(null);setName('');setPhone('');setSpecialty('');setRate('0');};
 const edit=(item:Technician)=>{setEditing(item.id);setName(item.name);setPhone(item.phone||'');setSpecialty(item.specialty);setRate((item.hourlyRateCentimes/100).toFixed(2));};
 const save=()=>{const item:Technician={id:editing||'technician-'+Date.now(),name:name.trim(),phone:phone.trim()||undefined,specialty:specialty.trim(),hourlyRateCentimes:Math.round(Number(rate.replace(',','.'))*100),active:editing?technicians.find(item=>item.id===editing)?.active??true:true};const errors=validateTechnician(item,technicians.filter(existing=>existing.id!==editing));if(errors.length){Alert.alert(tr('معلومات ناقصة'),tr(errors[0]));return;}onSave(item);clear();};
 return <View style={{gap:9,direction:language==='AR'?'rtl':'ltr'}}>
  <View style={{backgroundColor:'#1B1B1B',padding:14,borderRadius:12,borderWidth:1,borderColor:'#444',gap:7}}><Text style={{color:gold,fontSize:19,fontWeight:'900'}}>{tr(editing?'تعديل الفني':'إضافة فني')}</Text>
   <TextInput value={name} onChangeText={setName} placeholder={tr('اسم الفني')} placeholderTextColor="#888" style={input}/><TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={tr('الهاتف (اختياري)')} placeholderTextColor="#888" style={input}/><TextInput value={specialty} onChangeText={setSpecialty} placeholder={tr('التخصص')} placeholderTextColor="#888" style={input}/><TextInput value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder={tr('الأجرة بالساعة DH')} placeholderTextColor="#888" style={input}/>
   <Pressable onPress={save} style={{backgroundColor:gold,borderRadius:8,padding:11,alignItems:'center'}}><Text style={{color:'#111',fontWeight:'900'}}>{tr(editing?'حفظ التعديلات':'حفظ الفني')}</Text></Pressable>{!!editing&&<Pressable onPress={clear} style={{padding:8,alignItems:'center'}}><Text style={{color:'#DDD'}}>{tr('إلغاء التعديل')}</Text></Pressable>}
  </View>
  <Text style={{color:'#FFF',fontSize:18,fontWeight:'900'}}>{tr('الفنيون')} ({technicians.length})</Text>
  {technicians.map(item=><View key={item.id} style={{backgroundColor:'#1B1B1B',padding:12,borderRadius:10,borderWidth:1,borderColor:'#333',flexDirection:'row',gap:8}}><View style={{flex:1,gap:4}}><Text style={{color:gold,fontWeight:'900'}}>{item.name} · {item.specialty}</Text><Text style={{color:'#AAA'}}>{item.phone||tr('بدون هاتف')} · {(item.hourlyRateCentimes/100).toFixed(2)} DH/{tr('ساعة')} · {tr(item.active?'نشط':'متوقف')}</Text><View style={{flexDirection:'row',gap:12}}><Pressable onPress={()=>edit(item)}><Text style={{color:gold}}>{tr('تعديل')}</Text></Pressable><Pressable onPress={()=>onToggle(item.id)}><Text style={{color:gold}}>{tr(item.active?'إيقاف':'تفعيل')}</Text></Pressable><Pressable onPress={()=>Alert.alert(tr('حذف الفني؟'),item.name,[{text:tr('إلغاء'),style:'cancel'},{text:tr('حذف'),style:'destructive',onPress:()=>onDelete(item.id)}])}><Text style={{color:'#E28A78'}}>{tr('حذف')}</Text></Pressable></View></View></View>)}
  {!technicians.length&&<Text style={{color:'#888',textAlign:'center'}}>{tr('مازال ما تسجل حتى فني.')}</Text>}
 </View>;
}
