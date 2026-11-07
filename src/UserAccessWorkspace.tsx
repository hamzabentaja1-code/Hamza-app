import React, {useContext, useState} from 'react';
import {View, ScrollView, StyleSheet, Alert} from 'react-native';
import {TText as Text, TTextInput as TextInput, LanguageContext, translateText} from './i18n';
import AccessiblePressable from './AccessiblePressable';
import {UserAccount, UserModule, UserRole, ROLE_LABELS, createUserAccount, setUserModuleAccess, canManageUsers} from './domain/user-access';
import {translateUserAccessMessage} from './user-access-i18n';

const Pressable=AccessiblePressable;
const GOLD='#D6AE55';
type Props={users:UserAccount[];activeUserId:string;modules:UserModule[];onChange:(users:UserAccount[])=>void;onSelect:(id:string)=>void;onLog:(action:string,details:string)=>void};
const roles:UserRole[]=['admin','sales','warehouse','accountant','viewer','custom'];
export default function UserAccessWorkspace({users,activeUserId,modules,onChange,onSelect,onLog}:Props){
 const language=useContext(LanguageContext);
 const t=(value:string)=>translateUserAccessMessage(translateText(value,language),language)??value;
 const showAlert=(title:string,message:string,buttons?:Parameters<typeof Alert.alert>[2])=>Alert.alert(t(title),t(message),buttons?.map(button=>({...button,text:button.text?t(button.text):button.text})));
 const [name,setName]=useState('');const [role,setRole]=useState<UserRole>('sales');const [selectedId,setSelectedId]=useState(activeUserId);
 const fallback:UserAccount={id:'',name:'',role:'owner',allowedModules:[],canWrite:true,active:true,createdAt:''};const active:UserAccount=users.find(x=>x.id===activeUserId)||users[0]||fallback;const selected:UserAccount=users.find(x=>x.id===selectedId)||active;
 const owner=canManageUsers(active);
 const add=()=>{try{const user=createUserAccount({name,role,moduleIds:modules.map(x=>x.id)});if(users.some(x=>x.name.toLocaleLowerCase()===user.name.toLocaleLowerCase()))throw new Error('كاين مستخدم بنفس الاسم.');onChange([user,...users]);setName('');setSelectedId(user.id);onLog('إضافة مستخدم',user.name+' • '+ROLE_LABELS[user.role]);}catch(e){showAlert('تعذر إنشاء المستخدم',e instanceof Error?e.message:'راجع المعلومات.');}};
 const toggleModule=(moduleId:string,allowed:boolean)=>{if(!owner||selected.role==='owner')return;onChange(users.map(x=>x.id===selected.id?setUserModuleAccess(x,moduleId,allowed):x));onLog('تعديل صلاحيات',selected.name+' • '+moduleId+' • '+(allowed?'سماح':'منع'));};
 const setWrite=(value:boolean)=>{if(!owner||selected.role==='owner'||selected.role==='viewer')return;onChange(users.map(x=>x.id===selected.id?{...x,canWrite:value}:x));};
 const remove=()=>{if(!owner||selected.role==='owner')return;showAlert('حذف المستخدم؟','غادي يتحذف الحساب المحلي ديال '+selected.name+' فقط.',[{text:'إلغاء',style:'cancel'},{text:'حذف',style:'destructive',onPress:()=>{onChange(users.filter(x=>x.id!==selected.id));onLog('حذف مستخدم',selected.name);setSelectedId(activeUserId);}}]);};
 return <ScrollView contentContainerStyle={s.body}>
  <View style={s.panel}><Text style={s.title}>المستخدم النشط</Text><Text style={s.note}>اختار الملف الشخصي اللي غادي يستعمل التطبيق دابا. تبديل المستخدم ماشي تسجيل دخول آمن وما كيحميش البيانات من شخص عندو وصول للهاتف.</Text>
   {users.filter(x=>x.active).map(user=><Pressable key={user.id} accessibilityState={{selected:user.id===activeUserId}} onPress={()=>onSelect(user.id)} style={[s.item,user.id===activeUserId&&s.selected]}><View style={{flex:1}}><Text style={s.userName}>{user.name}</Text><Text style={s.sub}>{ROLE_LABELS[user.role]} • {user.canWrite?'قراءة وكتابة':'مشاهدة فقط'}</Text></View><Text style={s.mark}>{user.id===activeUserId?'✓':'›'}</Text></Pressable>)}
  </View>
  {owner?<>
   <View style={s.panel}><Text style={s.title}>إضافة مستخدم جديد</Text><TextInput value={name} onChangeText={setName} placeholder="اسم المستخدم" placeholderTextColor="#888" style={s.input}/><Text style={s.label}>الدور الأساسي</Text><View style={s.wrap}>{roles.filter(x=>x!=='custom').map(item=><Pressable key={item} accessibilityState={{selected:role===item}} onPress={()=>setRole(item)} style={[s.choice,role===item&&s.selected]}><Text style={s.choiceText}>{ROLE_LABELS[item]}</Text></Pressable>)}</View><Pressable style={s.action} onPress={add}><Text style={s.actionText}>إنشاء المستخدم</Text></Pressable></View>
   <View style={s.panel}><Text style={s.title}>تعديل الصلاحيات</Text><View style={s.wrap}>{users.map(user=><Pressable key={user.id} onPress={()=>setSelectedId(user.id)} style={[s.choice,selected.id===user.id&&s.selected]}><Text style={s.choiceText}>{user.name}</Text></Pressable>)}</View><Text style={s.userName}>{selected.name} • {ROLE_LABELS[selected.role]}</Text>
    <Pressable accessibilityState={{selected:selected.canWrite}} disabled={selected.role==='owner'||selected.role==='viewer'} onPress={()=>setWrite(!selected.canWrite)} style={[s.item,selected.canWrite&&s.selected]}><Text style={s.choiceText}>السماح بالإضافة والتعديل والحذف</Text><Text style={s.mark}>{selected.canWrite?'✓':'—'}</Text></Pressable>
    <Text style={s.label}>الوحدات المسموح بها</Text>{modules.map(module=><Pressable key={module.id} accessibilityState={{selected:selected.role==='owner'||selected.allowedModules.includes(module.id)}} disabled={selected.role==='owner'} onPress={()=>toggleModule(module.id,!selected.allowedModules.includes(module.id))} style={s.permission}><Text style={s.choiceText}>{module.label}</Text><Text style={s.mark}>{selected.role==='owner'||selected.allowedModules.includes(module.id)?'✓':'○'}</Text></Pressable>)}
    {selected.role!=='owner'?<Pressable style={s.danger} onPress={remove}><Text style={s.dangerText}>حذف المستخدم</Text></Pressable>:<Text style={s.note}>صلاحيات المالك كاملة ولا يمكن حذف حساب المالك من هنا.</Text>}
   </View>
  </>:<View style={s.panel}><Text style={s.note}>إدارة المستخدمين والصلاحيات متاحة للمالك فقط.</Text></View>}
 </ScrollView>;
}
const s=StyleSheet.create({body:{paddingBottom:28,gap:12},panel:{backgroundColor:'#1B1B1B',padding:14,borderRadius:14,borderWidth:1,borderColor:'#444'},title:{fontSize:18,fontWeight:'800',color:GOLD,marginBottom:10},note:{color:'#D6C49B',lineHeight:21,marginBottom:10},item:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:12,borderWidth:1,borderColor:'#383838',borderRadius:9,marginBottom:7},selected:{borderColor:GOLD,backgroundColor:'#302819'},userName:{color:'#FFF',fontWeight:'800',marginBottom:4},sub:{color:'#999',fontSize:12},mark:{color:GOLD,fontWeight:'900',fontSize:18},input:{backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:12,color:'#FFF',marginBottom:10,textAlign:'right'},label:{color:'#CCC',fontWeight:'700',marginVertical:9},wrap:{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:9},choice:{padding:9,borderRadius:8,borderWidth:1,borderColor:'#444'},choiceText:{color:'#DDD',fontSize:13},action:{backgroundColor:GOLD,padding:13,borderRadius:9,alignItems:'center'},actionText:{color:'#151515',fontWeight:'900'},permission:{flexDirection:'row',justifyContent:'space-between',paddingVertical:10,borderBottomWidth:1,borderColor:'#333'},danger:{padding:12,marginTop:12,borderWidth:1,borderColor:'#A44',borderRadius:9,alignItems:'center'},dangerText:{color:'#E28A78',fontWeight:'800'}});
