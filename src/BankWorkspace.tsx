import React,{useContext,useState} from 'react';
import {Alert,View,StyleSheet} from 'react-native';
import {TText as Text,TTextInput as TextInput,LanguageContext,translateText} from './i18n';
import AccessiblePressable from './AccessiblePressable';
import {BankAccount,BankMovement,BankReconciliation,bankBalance} from './domain/banking';

type Props={
 accounts:BankAccount[];movements:BankMovement[];reconciliations:BankReconciliation[];activeAccountId:string;cashBalanceCentimes:number;
 onSelectAccount:(id:string)=>void;
 onAddAccount:(account:BankAccount,openingBalanceCentimes:number)=>void;
 onMovement:(movement:BankMovement)=>boolean;
 onTransfer:(input:{id:string;fromAccountId:string;toAccountId:string;amountCentimes:number;date:string;description:string})=>boolean;
 onReconcile:(input:{id:string;accountId:string;statementBalanceCentimes:number;date:string;note?:string})=>boolean;
 onCashTransfer:(input:{direction:'cash_to_bank'|'bank_to_cash';accountId:string;amountCentimes:number;date:string;description:string})=>boolean;
};
const GOLD='#D6AE55';
export default function BankWorkspace({accounts,movements,reconciliations,activeAccountId,cashBalanceCentimes,onSelectAccount,onAddAccount,onMovement,onTransfer,onReconcile,onCashTransfer}:Props){
 const language=useContext(LanguageContext);const t=(v:string)=>translateText(v,language)||v;
 const [name,setName]=useState('');const [bankName,setBankName]=useState('');const [reference,setReference]=useState('');const [opening,setOpening]=useState('0');
 const [amount,setAmount]=useState('');const [description,setDescription]=useState('');const [kind,setKind]=useState<'deposit'|'withdrawal'>('deposit');
 const [destination,setDestination]=useState('');const [transferAmount,setTransferAmount]=useState('');const [transferDescription,setTransferDescription]=useState('');
 const [cashTransferDirection,setCashTransferDirection]=useState<'cash_to_bank'|'bank_to_cash'>('cash_to_bank');const [cashTransferAmount,setCashTransferAmount]=useState('');const [cashTransferDescription,setCashTransferDescription]=useState('تحويل بين الصندوق والبنك');
 const [statement,setStatement]=useState('');const [reconcileNote,setReconcileNote]=useState('تسوية مع كشف الحساب');
 const active=accounts.find(a=>a.id===activeAccountId);
 const balance=active?bankBalance(movements,active.id):0;
 const add=()=>{const value=Number(opening.replace(',','.'));if(!name.trim()||!Number.isFinite(value)||value<0||!/^\d{0,4}$/.test(reference.trim())){Alert.alert(t('معلومات ناقصة'),t('دخل اسم الحساب ورصيد افتتاحي صحيح، وآخر 4 أرقام فقط للحساب.'));return;}
  if(accounts.some(a=>a.name.trim().toLowerCase()===name.trim().toLowerCase())){Alert.alert(t('حساب موجود'),t('اسم الحساب مستعمل من قبل.'));return;}
  onAddAccount({id:'bank-'+Date.now(),name:name.trim(),bankName:bankName.trim()||undefined,accountNumberMasked:reference.trim()?('•••• '+reference.trim()):undefined,currency:'MAD',active:true} as BankAccount,Math.round(value*100));
  setName('');setBankName('');setReference('');setOpening('0');
 };
 const saveMovement=()=>{const value=Number(amount.replace(',','.'));if(!active||!Number.isFinite(value)||value<=0||!description.trim()){Alert.alert(t('معلومات ناقصة'),t('دخل مبلغ ووصف صحيحين.'));return;}
  const ok=onMovement({id:'bank-move-'+Date.now(),accountId:active.id,kind,amountCentimes:Math.round(value*100),date:new Date().toISOString(),description:description.trim()});
  if(ok){setAmount('');setDescription('');}
 };
 const transfer=()=>{const value=Number(transferAmount.replace(',','.'));if(!active||!destination||!Number.isFinite(value)||value<=0||!transferDescription.trim()){Alert.alert(t('معلومات ناقصة'),t('حدد الحساب الوجهة والمبلغ والوصف.'));return;}
  const ok=onTransfer({id:'bank-transfer-'+Date.now(),fromAccountId:active.id,toAccountId:destination,amountCentimes:Math.round(value*100),date:new Date().toISOString(),description:transferDescription.trim()});
  if(ok){setTransferAmount('');setTransferDescription('');setDestination('');}
 };
 const cashTransfer=()=>{const value=Number(cashTransferAmount.replace(',','.'));if(!active||!Number.isFinite(value)||value<=0||!cashTransferDescription.trim()){Alert.alert(t('معلومات ناقصة'),t('دخل مبلغ ووصف صحيحين.'));return;}
  const ok=onCashTransfer({direction:cashTransferDirection,accountId:active.id,amountCentimes:Math.round(value*100),date:new Date().toISOString(),description:cashTransferDescription.trim()});
  if(ok)setCashTransferAmount('');
 };
 const reconcile=()=>{const value=Number(statement.replace(',','.'));if(!active||!Number.isFinite(value)||value<0){Alert.alert(t('معلومات ناقصة'),t('دخل الرصيد الموجود في كشف البنك بشكل صحيح.'));return;}
  const ok=onReconcile({id:'bank-reconcile-'+Date.now(),accountId:active.id,statementBalanceCentimes:Math.round(value*100),date:new Date().toISOString(),note:reconcileNote.trim()});
  if(ok)setStatement('');
 };
 return <View>
  <View style={styles.panel}><Text style={styles.title}>الحسابات البنكية</Text>
   {accounts.map(a=><AccessiblePressable key={a.id} onPress={()=>onSelectAccount(a.id)} accessibilityState={{selected:activeAccountId===a.id}} style={[styles.choice,activeAccountId===a.id&&styles.selected]}>
    <Text style={styles.label}>{a.name}{a.bankName?' • '+a.bankName:''}</Text><Text style={styles.note}>{a.accountNumberMasked||' '} • {(bankBalance(movements,a.id)/100).toFixed(2)} DH</Text>
   </AccessiblePressable>)}
   <TextInput value={name} onChangeText={setName} placeholder="اسم الحساب" placeholderTextColor="#888" style={styles.input}/>
   <TextInput value={bankName} onChangeText={setBankName} placeholder="اسم البنك (اختياري)" placeholderTextColor="#888" style={styles.input}/>
   <TextInput value={reference} onChangeText={setReference} keyboardType="number-pad" maxLength={4} placeholder="آخر 4 أرقام فقط (اختياري)" placeholderTextColor="#888" style={styles.input}/>
   <TextInput value={opening} onChangeText={setOpening} keyboardType="decimal-pad" placeholder="الرصيد الافتتاحي DH" placeholderTextColor="#888" style={styles.input}/>
   <AccessiblePressable style={styles.action} onPress={add}><Text style={styles.actionText}>إضافة حساب بنكي</Text></AccessiblePressable>
  </View>
  {active&&<>
   <View style={[styles.hero,{marginTop:12}]}><Text style={styles.note}>الرصيد الحالي • {active.name}</Text><Text style={styles.balance}>{(balance/100).toFixed(2)} DH</Text></View>
   <View style={[styles.panel,{marginTop:12}]}><Text style={styles.title}>حركة الحساب</Text>
    <View style={styles.row}>{(['deposit','withdrawal'] as const).map(v=><AccessiblePressable key={v} accessibilityState={{selected:kind===v}} onPress={()=>setKind(v)} style={[styles.choice,{flex:1},kind===v&&styles.selected]}><Text style={styles.label}>{v==='deposit'?'إيداع':'سحب'}</Text></AccessiblePressable>)}</View>
    <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="المبلغ DH" placeholderTextColor="#888" style={styles.input}/>
    <TextInput value={description} onChangeText={setDescription} placeholder="وصف الحركة" placeholderTextColor="#888" style={styles.input}/>
    <AccessiblePressable style={styles.action} onPress={saveMovement}><Text style={styles.actionText}>تسجيل الحركة</Text></AccessiblePressable>
   </View>
   <View style={[styles.panel,{marginTop:12}]}><Text style={styles.title}>تحويل بين الحسابات</Text>
    {accounts.filter(a=>a.id!==active.id).map(a=><AccessiblePressable key={a.id} accessibilityState={{selected:destination===a.id}} onPress={()=>setDestination(a.id)} style={[styles.choice,destination===a.id&&styles.selected]}><Text style={styles.label}>{a.name}</Text></AccessiblePressable>)}
    <TextInput value={transferAmount} onChangeText={setTransferAmount} keyboardType="decimal-pad" placeholder="المبلغ DH" placeholderTextColor="#888" style={styles.input}/>
    <TextInput value={transferDescription} onChangeText={setTransferDescription} placeholder="سبب التحويل" placeholderTextColor="#888" style={styles.input}/>
    <AccessiblePressable style={styles.action} onPress={transfer}><Text style={styles.actionText}>تأكيد التحويل</Text></AccessiblePressable>
   </View>
   <View style={[styles.panel,{marginTop:12}]}><Text style={styles.title}>تحويل بين الصندوق والبنك</Text>
    <Text style={styles.note}>رصيد الصندوق المتوفر: {(cashBalanceCentimes/100).toFixed(2)} DH</Text>
    <View style={styles.row}>
     {([{id:'cash_to_bank',label:'من الصندوق إلى البنك'},{id:'bank_to_cash',label:'من البنك إلى الصندوق'}] as const).map(v=><AccessiblePressable key={v.id} accessibilityState={{selected:cashTransferDirection===v.id}} onPress={()=>setCashTransferDirection(v.id)} style={[styles.choice,{flex:1},cashTransferDirection===v.id&&styles.selected]}><Text style={styles.label}>{v.label}</Text></AccessiblePressable>)}
    </View>
    <TextInput value={cashTransferAmount} onChangeText={setCashTransferAmount} keyboardType="decimal-pad" placeholder="المبلغ DH" placeholderTextColor="#888" style={styles.input}/>
    <TextInput value={cashTransferDescription} onChangeText={setCashTransferDescription} placeholder="وصف التحويل" placeholderTextColor="#888" style={styles.input}/>
    <AccessiblePressable style={styles.action} onPress={cashTransfer}><Text style={styles.actionText}>تأكيد تحويل الصندوق والبنك</Text></AccessiblePressable>
   </View>
   <View style={[styles.panel,{marginTop:12}]}><Text style={styles.title}>التسوية مع كشف البنك</Text>
    <Text style={styles.note}>دخل الرصيد النهائي الظاهر في كشف الحساب؛ التطبيق يسجل فرق التسوية ولا يغير الحركات السابقة.</Text>
    <TextInput value={statement} onChangeText={setStatement} keyboardType="decimal-pad" placeholder="الرصيد في كشف البنك DH" placeholderTextColor="#888" style={styles.input}/>
    <TextInput value={reconcileNote} onChangeText={setReconcileNote} placeholder="ملاحظة التسوية" placeholderTextColor="#888" style={styles.input}/>
    <AccessiblePressable style={styles.action} onPress={reconcile}><Text style={styles.actionText}>مطابقة كشف الحساب</Text></AccessiblePressable>
   </View>
   <Text style={styles.section}>سجل الحركات</Text>
   {movements.filter(m=>m.accountId===active.id).slice().sort((a,b)=>b.date.localeCompare(a.date)).map(m=><View key={m.id} style={styles.rowItem}><View style={{flex:1}}><Text style={styles.label}>{m.description}</Text><Text style={styles.note}>{new Date(m.date).toLocaleString(language==='AR'?'ar-MA':'fr-MA')} • {m.kind}</Text></View><Text style={styles.label}>{['opening','deposit','pos_card','pos_transfer','customer_payment','bank_transfer_in','cash_transfer_in','adjustment_in'].includes(m.kind)?'+':'-'}{(m.amountCentimes/100).toFixed(2)} DH</Text></View>)}
   {reconciliations.filter(r=>r.accountId===active.id).map(r=><Text key={r.id} style={styles.note}>تسوية {r.date}: الفرق {(r.differenceCentimes/100).toFixed(2)} DH</Text>)}
  </>}
 </View>;
}
const styles=StyleSheet.create({
 panel:{backgroundColor:'#1B1B1B',padding:16,borderRadius:14,borderWidth:1,borderColor:'#444'},
 hero:{backgroundColor:'#262116',padding:18,borderRadius:14,borderWidth:1,borderColor:GOLD},
 title:{color:GOLD,fontSize:18,fontWeight:'800',marginBottom:12},balance:{color:'#FFF',fontSize:28,fontWeight:'900'},
 note:{color:'#BBB',fontSize:12,marginVertical:4},label:{color:'#FFF',fontWeight:'700'},
 choice:{borderWidth:1,borderColor:'#393939',borderRadius:8,padding:11,marginBottom:7},
 selected:{borderColor:GOLD,backgroundColor:'#302819'},
 input:{backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:12,color:'#FFF',marginBottom:10,textAlign:'right'},
 action:{marginTop:3,backgroundColor:GOLD,borderRadius:9,padding:13,alignItems:'center'},actionText:{color:'#151515',fontWeight:'900'},
 row:{flexDirection:'row',gap:8},rowItem:{backgroundColor:'#1B1B1B',borderRadius:10,padding:13,marginBottom:8,flexDirection:'row',alignItems:'center'},section:{color:'#FFF',fontWeight:'800',fontSize:17,marginTop:20,marginBottom:10},
});
