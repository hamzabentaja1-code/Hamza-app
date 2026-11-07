import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {TText as Text, TTextInput as TextInput} from './i18n';
import AccessiblePressable from './AccessiblePressable';
import {BankAccount} from './domain/banking';
import {ChequeRecord, ChequeEvent, ChequeStatus} from './domain/cheques';

type NewCheque = Omit<ChequeRecord, 'status' | 'updatedAt'>;
type Props = {
  cheques: ChequeRecord[];
  events: ChequeEvent[];
  bankAccounts: BankAccount[];
  onAdd: (input: NewCheque) => boolean;
  onTransition: (cheque: ChequeRecord, next: ChequeStatus, event: Omit<ChequeEvent, 'chequeId'|'from'|'to'>) => boolean;
};

const money = (centimes:number) => (centimes/100).toFixed(2)+' DH';
const labels:Record<ChequeStatus,string> = {
  recorded:'مسجل', deposited:'مودع', cleared:'مقبوض / مؤدى', bounced:'مرفوض', cancelled:'ملغى',
};

export default function ChequeWorkspace({cheques,events,bankAccounts,onAdd,onTransition}:Props) {
  const [direction,setDirection]=useState<'incoming'|'outgoing'>('incoming');
  const [number,setNumber]=useState('');
  const [counterparty,setCounterparty]=useState('');
  const [amount,setAmount]=useState('');
  const [issueDate,setIssueDate]=useState(new Date().toISOString().slice(0,10));
  const [dueDate,setDueDate]=useState('');
  const [bankAccountId,setBankAccountId]=useState(bankAccounts[0]?.id||'');
  const [notes,setNotes]=useState('');
  const submit=()=>{
    const value=Number(amount.replace(',','.'));
    if(!number.trim()||!counterparty.trim()||!amount.trim()||!Number.isFinite(value)||value<=0)return;
    const now=new Date().toISOString();
    const ok=onAdd({
      id:'cheque-'+Date.now(),direction,number:number.trim(),counterparty:counterparty.trim(),
      amountCentimes:Math.round(value*100),issueDate,dueDate:dueDate.trim()||undefined,
      bankAccountId:bankAccountId||undefined,notes:notes.trim()||undefined,createdAt:now,
    });
    if(ok){setNumber('');setCounterparty('');setAmount('');setDueDate('');setNotes('');}
  };
  const actions=(cheque:ChequeRecord):ChequeStatus[]=>{
    if(cheque.status==='recorded')return ['deposited','cleared','bounced','cancelled'];
    if(cheque.status==='deposited')return ['cleared','bounced','cancelled'];
    if(cheque.status==='bounced')return ['deposited','cancelled'];
    return [];
  };
  const transition=(cheque:ChequeRecord,next:ChequeStatus)=>{
    onTransition(cheque,next,{id:'cheque-event-'+cheque.id+'-'+events.length+'-'+Date.now(),date:new Date().toISOString().slice(0,10),note:''});
  };
  const incoming=cheques.filter(x=>x.direction==='incoming');
  const outgoing=cheques.filter(x=>x.direction==='outgoing');
  const pending=cheques.filter(x=>!['cleared','cancelled'].includes(x.status));
  return <View>
    <View style={s.summary}>
      <Text style={s.summaryText}>الشيكات الواردة: {incoming.length} • الصادرة: {outgoing.length}</Text>
      <Text style={s.summaryText}>قيد المعالجة: {pending.length} • الحركات المسجلة: {events.length}</Text>
      <Text style={s.summaryText}>الواردة غير المحصلة: {money(incoming.filter(x=>!['cleared','cancelled'].includes(x.status)).reduce((a,x)=>a+x.amountCentimes,0))}</Text>
      <Text style={s.summaryText}>الصادرة غير المؤداة: {money(outgoing.filter(x=>!['cleared','cancelled'].includes(x.status)).reduce((a,x)=>a+x.amountCentimes,0))}</Text>
    </View>
    <View style={s.panel}>
      <Text style={s.title}>إضافة شيك</Text>
      <View style={s.row}>
        <AccessiblePressable accessibilityState={{selected:direction==='incoming'}} onPress={()=>setDirection('incoming')} style={[s.choice,direction==='incoming'&&s.active]}><Text style={s.choiceText}>شيك وارد من زبون</Text></AccessiblePressable>
        <AccessiblePressable accessibilityState={{selected:direction==='outgoing'}} onPress={()=>setDirection('outgoing')} style={[s.choice,direction==='outgoing'&&s.active]}><Text style={s.choiceText}>شيك صادر لمورد</Text></AccessiblePressable>
      </View>
      <TextInput value={number} onChangeText={setNumber} placeholder="رقم الشيك" style={s.input}/>
      <TextInput value={counterparty} onChangeText={setCounterparty} placeholder="اسم الزبون أو المورد" style={s.input}/>
      <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="المبلغ بالدرهم" style={s.input}/>
      <TextInput value={issueDate} onChangeText={setIssueDate} placeholder="تاريخ الشيك YYYY-MM-DD" style={s.input}/>
      <TextInput value={dueDate} onChangeText={setDueDate} placeholder="تاريخ الاستحقاق (اختياري)" style={s.input}/>
      <Text style={s.label}>الحساب البنكي المرتبط</Text>
      {bankAccounts.length===0?<Text style={s.empty}>خاصك تضيف حساب بنكي قبل إيداع الشيك أو تسويته.</Text>:null}
      {bankAccounts.map(account=><AccessiblePressable key={account.id} accessibilityState={{selected:bankAccountId===account.id}} onPress={()=>setBankAccountId(account.id)} style={[s.choice,bankAccountId===account.id&&s.active]}><Text style={s.choiceText}>{account.name} {account.bankName||''}</Text></AccessiblePressable>)}
      <TextInput value={notes} onChangeText={setNotes} placeholder="ملاحظات (اختياري)" style={s.input}/>
      <AccessiblePressable style={s.submit} onPress={submit}><Text style={s.submitText}>حفظ الشيك</Text></AccessiblePressable>
    </View>
    <Text style={s.section}>سجل الشيكات ({cheques.length})</Text>
    {cheques.map(cheque=><View key={cheque.id} style={s.item}>
      <View style={{flex:1}}>
        <Text style={s.itemTitle}>{cheque.number} • {cheque.counterparty}</Text>
        <Text style={s.meta}>{cheque.direction==='incoming'?'وارد':'صادر'} • {labels[cheque.status]} • {money(cheque.amountCentimes)}</Text>
        <Text style={s.meta}>تاريخ الشيك: {cheque.issueDate}{cheque.dueDate?' • الاستحقاق: '+cheque.dueDate:''}</Text>
        {cheque.notes?<Text style={s.meta}>{cheque.notes}</Text>:null}
        {actions(cheque).map(next=><AccessiblePressable key={next} onPress={()=>transition(cheque,next)} style={s.action}><Text style={s.actionText}>{next==='deposited'?(cheque.direction==='incoming'?'إيداع الشيك':'تقديم الشيك للبنك'):next==='cleared'?'تأكيد التحصيل / الأداء':next==='bounced'?'تسجيل رفض الشيك':'إلغاء الشيك'}</Text></AccessiblePressable>)}
      </View>
    </View>)}
    {cheques.length===0?<Text style={s.empty}>مازال ما تسجل حتى شيك.</Text>:null}
    <Text style={s.section}>سجل حركات الشيكات ({events.length})</Text>
    {events.map(event=>{const cheque=cheques.find(item=>item.id===event.chequeId);return <View key={event.id} style={s.item}>
      <Text style={s.itemTitle}>{cheque?.number||event.chequeId}</Text>
      <Text style={s.meta}>{event.date} • {event.from?labels[event.from]:'إنشاء'} → {labels[event.to]}</Text>
      {event.note?<Text style={s.meta}>{event.note}</Text>:null}
    </View>;})}
    {events.length===0?<Text style={s.empty}>مازال ما تسجلات حتى حركة شيك.</Text>:null}
  </View>;
}

const s=StyleSheet.create({
  panel:{backgroundColor:'#1B1B1B',padding:15,borderRadius:13,borderWidth:1,borderColor:'#444',marginBottom:12},
  title:{color:'#D6AE55',fontSize:19,fontWeight:'800',marginBottom:10},
  row:{flexDirection:'row',gap:8},
  choice:{flex:1,borderWidth:1,borderColor:'#444',borderRadius:8,padding:10,marginBottom:8},
  active:{borderColor:'#D6AE55',backgroundColor:'#302819'},
  choiceText:{color:'#EEE',textAlign:'center',fontWeight:'700'},
  input:{backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:12,color:'#FFF',marginBottom:9,textAlign:'right'},
  label:{color:'#CCC',marginBottom:7},
  submit:{backgroundColor:'#D6AE55',borderRadius:9,padding:13,alignItems:'center'},
  submitText:{color:'#151515',fontWeight:'900'},
  summary:{backgroundColor:'#1B1B1B',padding:13,borderRadius:11,marginBottom:12},
  summaryText:{color:'#DDD',marginVertical:3},
  section:{color:'#FFF',fontWeight:'800',fontSize:17,marginTop:8,marginBottom:10},
  item:{backgroundColor:'#1B1B1B',padding:13,borderRadius:10,borderWidth:1,borderColor:'#333',marginBottom:8},
  itemTitle:{color:'#FFF',fontWeight:'800'},
  meta:{color:'#AAA',fontSize:12,marginTop:5},
  action:{borderWidth:1,borderColor:'#D6AE55',borderRadius:7,padding:9,marginTop:8,alignItems:'center'},
  actionText:{color:'#D6AE55',fontWeight:'800'},
  empty:{color:'#888',textAlign:'center',padding:14},
});
