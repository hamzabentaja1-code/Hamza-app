import React,{useState} from 'react';
import {Alert,Pressable,Text,TextInput,View} from 'react-native';
import {InstallationRequest,InstallationRequestStatus,InstallationType} from './installation-requests';
import {Technician} from './technicians';
import {EquipmentItem} from './equipment';
import {translate} from './i18n';

const gold='#D6AE55';
const input={backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:8,padding:10,color:'#FFF',marginBottom:8} as const;
type Props={language:'AR'|'FR';customers:{id:number;name:string;phone?:string}[];projects:{id:number;name:string}[];technicians:Technician[];equipment:EquipmentItem[];requests:InstallationRequest[];onSave:(request:InstallationRequest)=>void;onStatus:(id:string,status:InstallationRequestStatus)=>void;onDelete:(id:string)=>void};
const types:InstallationType[]=['cctv','intercom','electrical','network','maintenance','other'];
const nextStatuses:Record<InstallationRequestStatus,InstallationRequestStatus[]>={new:['scheduled','cancelled'],scheduled:['in_progress','cancelled'],in_progress:['completed','cancelled'],completed:[],cancelled:[]};
const typeAr:Record<InstallationType,string>={cctv:'كاميرات المراقبة',intercom:'إنترفون',electrical:'كهرباء',network:'شبكة',maintenance:'صيانة',other:'أخرى'};
const statusAr:Record<InstallationRequestStatus,string>={new:'جديد',scheduled:'مبرمج',in_progress:'قيد الإنجاز',completed:'مكتمل',cancelled:'ملغى'};

export default function InstallationRequestWorkspace({language,customers,projects,requests,technicians,equipment,onSave,onStatus,onDelete}:Props){
 const tr=(value:string)=>translate(language,value);
 const [customerId,setCustomerId]=useState<number|undefined>();const [projectId,setProjectId]=useState<number|undefined>();const [technicianIds,setTechnicianIds]=useState<string[]>([]);const [equipmentIds,setEquipmentIds]=useState<string[]>([]);const [type,setType]=useState<InstallationType>('cctv');const [siteAddress,setSiteAddress]=useState('');const [requestedDate,setRequestedDate]=useState(new Date().toISOString().slice(0,10));const [notes,setNotes]=useState('');
 const save=()=>{const request:InstallationRequest={id:'install-'+Date.now(),customerId:customerId||0,projectId,technicianIds,equipmentIds,type,siteAddress:siteAddress.trim(),requestedDate,status:'new',notes:notes.trim()||undefined,createdAt:new Date().toISOString()};onSave(request);};
 const amountLabel=(value:string)=>typeAr[value as InstallationType]||statusAr[value as InstallationRequestStatus]||value;
 return <View style={{gap:10,direction:language==='AR'?'rtl':'ltr'}}>
   <View style={{backgroundColor:'#1B1B1B',padding:14,borderRadius:12,borderWidth:1,borderColor:'#444',gap:7}}>
    <Text style={{color:gold,fontSize:19,fontWeight:'900'}}>{tr('طلب تركيب جديد')}</Text>
    <Text style={{color:'#CCC'}}>{tr('اختار الزبون')}</Text>
    {customers.map(customer=><Pressable key={customer.id} onPress={()=>setCustomerId(customer.id)} style={{borderWidth:1,borderColor:customerId===customer.id?gold:'#444',borderRadius:8,padding:9}}><Text style={{color:'#FFF'}}>{customer.name}{customer.phone?' · '+customer.phone:''}</Text></Pressable>)}
    {!customers.length&&<Text style={{color:'#888'}}>{tr('زيد الزبون من قسم الزبناء أولاً.')}</Text>}
    <Text style={{color:'#CCC'}}>{tr('نوع الخدمة')}</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{types.map(value=><Pressable key={value} onPress={()=>setType(value)} style={{borderWidth:1,borderColor:type===value?gold:'#444',borderRadius:8,padding:8}}><Text style={{color:'#FFF'}}>{tr(typeAr[value])}</Text></Pressable>)}</View>
    <Text style={{color:'#CCC'}}>{tr('المشروع المرتبط (اختياري)')}</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{projects.map(project=><Pressable key={project.id} onPress={()=>setProjectId(current=>current===project.id?undefined:project.id)} style={{borderWidth:1,borderColor:projectId===project.id?gold:'#444',borderRadius:8,padding:8}}><Text style={{color:'#FFF'}}>{project.name}</Text></Pressable>)}</View>
    <Text style={{color:'#CCC'}}>{tr('الفنيون المكلفون (اختياري)')}</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{technicians.filter(item=>item.active).map(item=><Pressable key={item.id} onPress={()=>setTechnicianIds(current=>current.includes(item.id)?current.filter(id=>id!==item.id):[...current,item.id])} style={{borderWidth:1,borderColor:technicianIds.includes(item.id)?gold:'#444',borderRadius:8,padding:8}}><Text style={{color:'#FFF'}}>{item.name}</Text></Pressable>)}</View>
    <Text style={{color:'#CCC'}}>{tr('المعدات المستخدمة (اختياري)')}</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{equipment.filter(item=>item.status==='available').map(item=><Pressable key={item.id} onPress={()=>setEquipmentIds(current=>current.includes(item.id)?current.filter(id=>id!==item.id):[...current,item.id])} style={{borderWidth:1,borderColor:equipmentIds.includes(item.id)?gold:'#444',borderRadius:8,padding:8}}><Text style={{color:'#FFF'}}>{item.name} · {item.category}</Text></Pressable>)}</View>
    <TextInput value={siteAddress} onChangeText={setSiteAddress} placeholder={tr('عنوان موقع التركيب')} placeholderTextColor="#888" style={input}/>
    <TextInput value={requestedDate} onChangeText={setRequestedDate} placeholder={tr('التاريخ YYYY-MM-DD')} placeholderTextColor="#888" style={input}/>
    <TextInput value={notes} onChangeText={setNotes} placeholder={tr('ملاحظات (اختياري)')} placeholderTextColor="#888" style={input}/>
    <Pressable onPress={save} style={{backgroundColor:gold,borderRadius:8,padding:11,alignItems:'center'}}><Text style={{color:'#111',fontWeight:'900'}}>{tr('حفظ طلب التركيب')}</Text></Pressable>
   </View>
   <Text style={{color:'#FFF',fontSize:18,fontWeight:'900'}}>{tr('طلبات التركيب')} ({requests.length})</Text>
   {requests.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(request=>{const customer=customers.find(item=>item.id===request.customerId);const project=projects.find(item=>item.id===request.projectId);const assignedTechs=technicians.filter(item=>request.technicianIds?.includes(item.id)).map(item=>item.name);const assignedEquipment=equipment.filter(item=>request.equipmentIds?.includes(item.id)).map(item=>item.name);return <View key={request.id} style={{backgroundColor:'#1B1B1B',padding:12,borderRadius:10,borderWidth:1,borderColor:'#333',gap:7}}>
     <Text style={{color:gold,fontWeight:'900'}}>{tr(amountLabel(request.type))} · {customer?.name||tr('زبون محذوف')}</Text>
     <Text style={{color:'#DDD'}}>{request.siteAddress} · {request.requestedDate}</Text>
     <Text style={{color:'#AAA'}}>{tr('الحالة')}: {tr(amountLabel(request.status))}{project?' · '+project.name:''}</Text>{!!assignedTechs.length&&<Text style={{color:'#AAA'}}>{tr('الفنيون')}: {assignedTechs.join('، ')}</Text>}{!!assignedEquipment.length&&<Text style={{color:'#AAA'}}>{tr('المعدات')}: {assignedEquipment.join('، ')}</Text>}
     {!!request.notes&&<Text style={{color:'#AAA'}}>{request.notes}</Text>}
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{nextStatuses[request.status].map(status=><Pressable key={status} onPress={()=>onStatus(request.id,status)} style={{borderWidth:1,borderColor:status==='cancelled'?'#89534A':gold,borderRadius:8,padding:8}}><Text style={{color:status==='cancelled'?'#E28A78':gold}}>{tr(amountLabel(status))}</Text></Pressable>)}
       <Pressable onPress={()=>Alert.alert(tr('حذف طلب التركيب؟'),request.siteAddress,[{text:tr('إلغاء'),style:'cancel'},{text:tr('حذف'),style:'destructive',onPress:()=>onDelete(request.id)}])}><Text style={{color:'#E28A78',padding:8}}>{tr('حذف')}</Text></Pressable>
     </View>
   </View>;})}
   {!requests.length&&<Text style={{color:'#888',textAlign:'center'}}>{tr('مازال ما تسجل حتى طلب تركيب.')}</Text>}
 </View>;
}
