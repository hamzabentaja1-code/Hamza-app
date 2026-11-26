import React,{useMemo,useState} from 'react';
import {Alert,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {translate,AppLanguage} from './i18n';
import type {ProjectRecord} from './projects';
import type {Technician} from './technicians';
import {buildFieldAgenda,FieldVisit,VisitInput,VisitStatus,visitKindLabels,visitStatusLabels} from './domain/field-agenda';

type Props={language:AppLanguage;projects:ProjectRecord[];technicians:Technician[];visits:FieldVisit[];onSave:(input:VisitInput,id?:number)=>boolean;onStatus:(id:number,status:VisitStatus)=>void};
const blank=():VisitInput=>({title:'',customer:'',address:'',kind:'installation'});
const kinds={delivery:'تاريخ التسليم',task:'مهمة المشروع',visit:'موعد التدخل'} as const;
function localToday() {
  const now=new Date();
  return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
}
export default function FieldAgendaWorkspace({language,projects,technicians,visits,onSave,onStatus}:Props) {
  const tr=(s:string)=>translate(language,s);
  const [visible,setVisible]=useState(false);
  const [draft,setDraft]=useState<VisitInput|null>(null);
  const [editing,setEditing]=useState<number>();
  const [filter,setFilter]=useState<'open'|'closed'|'all'>('open');
  const [query,setQuery]=useState('');
  const rtl=language==='AR',align={textAlign:rtl?'right' as const:'left' as const};
  const rows=useMemo(()=>buildFieldAgenda(projects,visits,filter!=='open').filter(row=>filter!=='closed'||row.closed),[projects,visits,filter]);
  const needle=query.trim().normalize('NFKC').toLocaleLowerCase();
  const matches=(...parts:(string|undefined)[])=>!needle||parts.join(' ').normalize('NFKC').toLocaleLowerCase().includes(needle);
  const shown=rows.filter(row=>matches(row.title,row.detail,row.date,row.time));
  const records=visits.filter(v=>(filter==='all'||(v.status==='completed'||v.status==='cancelled')===(filter==='closed'))&&matches(v.title,v.customer,v.address,v.date,v.time,technicians.find(t=>t.id===v.technicianId)?.name));
  const change=(patch:Partial<VisitInput>)=>setDraft(v=>v?{...v,...patch}:null);
  const start=(v?:FieldVisit)=>{setEditing(v?.id);setDraft(v??blank());};
  const select=(name:string,active:boolean,onPress:()=>void,key?:string)=><Pressable key={key||name} style={[s.chip,active&&s.active]} accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress}><Text style={s.text}>{name}</Text></Pressable>;
  const field=(value:string|undefined,onChange:(text:string)=>void,name:string,maxLength:number)=><TextInput value={value||''} onChangeText={onChange} placeholder={name} placeholderTextColor="#AAA" maxLength={maxLength} style={[s.input,align]}/>;
  const askStatus=(v:FieldVisit,status:VisitStatus)=>status==='cancelled'||status==='completed'?Alert.alert(tr(visitStatusLabels[status]),v.title,[{text:tr('إلغاء'),style:'cancel'},{text:tr('تأكيد'),onPress:()=>onStatus(v.id,status)}]):onStatus(v.id,status);
  return <View style={s.panel}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:visible}} onPress={()=>setVisible(!visible)}><Text style={[s.heading,align]}>{tr('الأجندة وطلبات التدخل')} {visible?'−':'+'}</Text></Pressable>
    {visible&&<>
      {select(tr('طلب تدخل جديد'),draft!==null,()=>start())}
      {draft&&<View style={s.form}>
        <View style={s.row}>{(['installation','service'] as const).map(kind=>select(tr(visitKindLabels[kind]),draft.kind===kind,()=>change({kind}),kind))}</View>
        {field(draft.title,title=>change({title}),tr('عنوان الطلب'),120)}
        {field(draft.customer,customer=>change({customer}),tr('الزبون'),120)}
        {field(draft.address,address=>change({address}),tr('مكان التدخل'),240)}
        {field(draft.date,date=>change({date}),tr('تاريخ الموعد YYYY-MM-DD'),10)}
        {field(draft.time,time=>change({time}),tr('ساعة الموعد HH:MM'),5)}
        {field(draft.note,note=>change({note}),tr('ملاحظة (اختياري)'),500)}
        <Text style={[s.muted,align]}>{tr('المشروع المرتبط (اختياري)')}</Text>
        <View style={s.row}>{select(tr('بدون مشروع'),!draft.projectId,()=>change({projectId:undefined}))}{projects.map(p=>select(p.name,draft.projectId===p.id,()=>change({projectId:p.id,customer:draft.customer||p.customerName}),'p'+p.id))}</View>
        <Text style={[s.muted,align]}>{tr('التقني المسؤول (اختياري)')}</Text>
        <View style={s.row}>{select(tr('بدون تقني'),!draft.technicianId,()=>change({technicianId:undefined}))}{technicians.map(t=>select(t.name,draft.technicianId===t.id,()=>change({technicianId:t.id}),'t'+t.id))}</View>
        <View style={s.row}>{select(tr('حفظ'),true,()=>{if(onSave(draft,editing))setDraft(null);})}{select(tr('إلغاء'),false,()=>setDraft(null))}</View>
      </View>}
      {field(query,setQuery,tr('قلب فالأجندة'),120)}
      <View style={s.row}>{select(tr('مفتوحة'),filter==='open',()=>setFilter('open'))}{select(tr('مسدودة'),filter==='closed',()=>setFilter('closed'))}{select(tr('الكل'),filter==='all',()=>setFilter('all'))}</View>
      <Text style={[s.heading,align]}>{tr('مواعيد ومهام المشاريع')}</Text>
      {!shown.length&&<Text style={[s.muted,align]}>{tr('ما كاين حتى موعد أو مهمة بهاد الاختيار.')}</Text>}
      {shown.map(row=><View key={row.key} style={s.item}><Text style={[s.text,align]}>{row.date}{row.time?' · '+row.time:''} · {row.title}</Text><Text style={[s.muted,align]}>{tr(kinds[row.kind])}{row.detail?' · '+row.detail:''}{!row.closed&&row.date<localToday()?' · '+tr('فات الموعد'):''}</Text></View>)}
      <Text style={[s.heading,align]}>{tr('سجل طلبات التدخل')}</Text>
      {!records.length&&<Text style={[s.muted,align]}>{tr('ما كاين حتى طلب تدخل بهاد الاختيار.')}</Text>}
      {records.map(v=><View key={v.id} style={s.item}>
        <Text style={[s.text,align]}>{v.title} · {tr(visitKindLabels[v.kind])}</Text>
        <Text style={[s.muted,align]}>{v.customer} · {v.address}</Text>
        <Text style={[s.muted,align]}>{tr(visitStatusLabels[v.status])}{v.date?' · '+v.date:''}{v.time?' · '+v.time:''}{v.technicianId?' · '+(technicians.find(t=>t.id===v.technicianId)?.name||tr('تقني غير متوفر')):''}</Text>
        {!!v.note&&<Text style={[s.muted,align]}>{v.note}</Text>}
        {(v.status==='requested'||v.status==='scheduled')&&<View style={s.row}>
          {select(tr('تعديل'),editing===v.id&&draft!==null,()=>start(v))}
          {v.status==='requested'?select(tr('برمج الموعد'),false,()=>askStatus(v,'scheduled')):<>{select(tr('تم التدخل'),false,()=>askStatus(v,'completed'))}{select(tr('حيد البرمجة'),false,()=>askStatus(v,'requested'))}</>}
          {select(tr('إلغاء الطلب'),false,()=>askStatus(v,'cancelled'))}
        </View>}
      </View>)}
    </>}
  </View>;
}
const s=StyleSheet.create({panel:{backgroundColor:'#222',padding:13,borderRadius:12,marginBottom:12},heading:{color:'#E8C46D',fontWeight:'800',fontSize:17,marginVertical:8},input:{color:'#FFF',borderColor:'#555',borderWidth:1,padding:9,borderRadius:8,marginVertical:4},row:{flexDirection:'row',flexWrap:'wrap',gap:6,marginVertical:6},chip:{borderColor:'#555',borderWidth:1,padding:8,borderRadius:8,alignSelf:'flex-start',maxWidth:'100%'},active:{borderColor:'#DCBC63',backgroundColor:'#3A3221'},form:{marginVertical:8,padding:7,borderColor:'#484848',borderWidth:1,borderRadius:7},item:{borderTopColor:'#555',borderTopWidth:1,paddingVertical:8},text:{color:'#FFF',fontWeight:'600'},muted:{color:'#C6C6C6',marginVertical:3}});
