import React,{useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {DetailReport} from './domain/report-details';

export const detailModes=['sales','purchases','stock','cash','receivables','payables'] as const;
export type DetailMode=typeof detailModes[number];
const pageSize=25;
const GOLD='#E2B84D';

export default function ReportDetailsWorkspace({tr,mode,setMode,report,warehouse,setWarehouse,warehouses,
  cashDirection,setCashDirection,onShare,onPrint}:{
  tr:(key:string)=>string;
  mode:DetailMode;setMode:(mode:DetailMode)=>void;report:DetailReport;
  warehouse:string;setWarehouse:(warehouse:string)=>void;warehouses:readonly {id:string;name:string}[];
  cashDirection:'all'|'in'|'out';setCashDirection:(direction:'all'|'in'|'out')=>void;
  onShare:(format:'CSV'|'XLSX'|'PDF')=>void;onPrint:()=>void;
}){
  const [page,setPage]=useState(0);
  const labels={sales:tr('المبيعات'),purchases:tr('المشتريات'),stock:tr('المخزون'),cash:tr('الصندوق'),
    receivables:tr('ديون الزبناء'),payables:tr('ديون الموردين')};
  const directions={all:tr('الكل'),in:tr('داخل'),out:tr('خارج')};
  const last=Math.max(0,Math.ceil(report.rows.length/pageSize)-1);
  const shown=Math.min(page,last);
  const button=(key:string,label:string,active:boolean,onPress:()=>void)=><Pressable key={key} style={[s.button,active&&s.active]}
    accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress}><Text style={s.text}>{label}</Text></Pressable>;
  return <View style={s.panel}>
    <Text style={s.title}>{tr('تفاصيل التقارير')}</Text>
    <View style={s.row}>{detailModes.map(value=>button(value,labels[value],mode===value,()=>{setMode(value);setPage(0);} ))}</View>
    {mode==='stock'&&<><Text style={s.text}>{tr('المخزن')}</Text><View style={s.row}>{[{id:'',name:tr('كل المخازن')},...warehouses].map(item=>
      button(item.id,item.name,warehouse===item.id,()=>{setWarehouse(item.id);setPage(0);}))}</View></>}
    {mode==='cash'&&<View style={s.row}>{(['all','in','out'] as const).map(item=>button(item,directions[item],cashDirection===item,
      ()=>{setCashDirection(item);setPage(0);} ))}</View>}
    <Text style={s.title}>{report.title}</Text><Text style={s.muted}>{report.context}</Text>
    {report.summary.map(([label,value])=><Text style={s.text} key={label}>{label}: {value}</Text>)}
    <View style={s.row}>
      {(['PDF','CSV','XLSX'] as const).map(format=>button(format,format==='XLSX'?'Excel':format,false,()=>onShare(format)))}
      {button('print',tr('طباعة'),false,onPrint)}
    </View>
    {report.rows.length===0?<Text style={s.muted}>{tr('ما كايناش بيانات بهاد الاختيار.')}</Text>:
      report.rows.slice(shown*pageSize,(shown+1)*pageSize).map((row,index)=><View key={shown*pageSize+index} style={s.item}>
        {row.map((value,column)=>value===null||value===undefined||value===''?null:
          <Text key={column} style={s.text}>{report.headers[column]}: {String(value)}</Text>)}
      </View>)}
    {last>0&&<View style={s.row}>
      {shown>0&&button('prev',tr('السابق'),false,()=>setPage(shown-1))}
      <Text style={s.text}>{shown+1} / {last+1}</Text>
      {shown<last&&button('next',tr('التالي'),false,()=>setPage(shown+1))}
    </View>}
  </View>;
}
const s=StyleSheet.create({
  panel:{marginTop:14,padding:14,borderRadius:12,borderWidth:1,borderColor:'#38332A',backgroundColor:'#171717',gap:8},
  title:{color:'#fff',fontSize:17,fontWeight:'800'},text:{color:'#eee',fontSize:14},muted:{color:'#aaa',fontSize:13},
  row:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:6},
  button:{borderColor:'#444',borderWidth:1,borderRadius:8,paddingHorizontal:10,paddingVertical:8},
  active:{borderColor:GOLD,backgroundColor:'#332A16'},item:{borderTopWidth:1,borderColor:'#333',paddingVertical:8,gap:3},
});
