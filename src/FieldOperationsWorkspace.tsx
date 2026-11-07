import React,{useContext,useState} from 'react';
import {Alert,View,StyleSheet} from 'react-native';
import {TText as Text,TTextInput as TextInput,LanguageContext,translateText} from './i18n';
import AccessiblePressable from './AccessiblePressable';
import {Technician,Equipment,WorkOrder,WorkTimeEntry,WorkOrderCategory,WORK_ORDER_CATEGORIES,technicianCanPerform,createWorkOrder,createWorkTimeEntry,transitionWorkOrderStatus,workOrderHours,workOrderTimeCost,summarizeWorkOrderSettlement,addWorkOrderSettlementPayment,WorkOrderSettlement,WorkOrderSettlementPayment} from './domain/field-operations';

type Props={
 technicians:Technician[];equipment:Equipment[];equipmentCategories:string[];orders:WorkOrder[];timeEntries:WorkTimeEntry[];
 customers:{id:number;name:string}[];projects:{id:number;name:string}[];
 onAddTechnician:(item:Technician)=>void;onAddEquipment:(item:Equipment)=>void;onAddEquipmentCategory:(name:string)=>void;onDeleteEquipmentCategory:(name:string)=>void;
 onCreateOrder:(item:WorkOrder)=>void;onChangeOrder:(item:WorkOrder)=>void;onAddTimeEntry:(item:WorkTimeEntry)=>void;
};
const GOLD='#D6AE55';
const statusLabel=(s:WorkOrder['status'])=>s==='requested'?'طلب جديد':s==='scheduled'?'مبرمج':s==='in_progress'?'قيد الإنجاز':s==='completed'?'مكتمل':'ملغى';
export default function FieldOperationsWorkspace({technicians,equipment,equipmentCategories,orders,timeEntries,customers,projects,onAddTechnician,onAddEquipment,onAddEquipmentCategory,onDeleteEquipmentCategory,onCreateOrder,onChangeOrder,onAddTimeEntry}:Props){
 const language=useContext(LanguageContext);const t=(v:string)=>translateText(v,language)||v;
 const showAlert = (...args: Parameters<typeof Alert.alert>) => {
  const [title, message, buttons, options] = args;
  const translatedButtons = buttons?.map(button => ({
   ...button,
   text: button.text ? (translateText(button.text, language) || button.text) : button.text,
  }));
  Alert.alert(translateText(title, language) || title, translateText(message, language) || message, translatedButtons, options);
 };

 const [techName,setTechName]=useState('');const [techPhone,setTechPhone]=useState('');const [techSpecialty,setTechSpecialty]=useState('');const [techRate,setTechRate]=useState('0');const [techPermissions,setTechPermissions]=useState<WorkOrderCategory[]>([...WORK_ORDER_CATEGORIES]);
 const [equipmentName,setEquipmentName]=useState('');const [equipmentRef,setEquipmentRef]=useState('');const [equipmentSerial,setEquipmentSerial]=useState('');const [equipmentCategory,setEquipmentCategory]=useState('');const [equipmentCategoryDraft,setEquipmentCategoryDraft]=useState('');
 const [orderTitle,setOrderTitle]=useState('');const [orderCustomer,setOrderCustomer]=useState('');const [orderProject,setOrderProject]=useState('');const [orderTechnician,setOrderTechnician]=useState('');const [orderDate,setOrderDate]=useState('');const [orderDescription,setOrderDescription]=useState('');const [orderCategory,setOrderCategory]=useState<WorkOrderCategory>('installation');
 const [selectedEquipment,setSelectedEquipment]=useState<string[]>([]);
 const [settlementOrder,setSettlementOrder]=useState('');const [settlementQuote,setSettlementQuote]=useState('');const [settlementPayment,setSettlementPayment]=useState('');const [settlementMethod,setSettlementMethod]=useState<WorkOrderSettlementPayment['method']>('cash');\n const [timeOrder,setTimeOrder]=useState('');const [timeTechnician,setTimeTechnician]=useState('');const [timeHours,setTimeHours]=useState('');const [timeDate,setTimeDate]=useState(new Date().toISOString().slice(0,10));const [timeNote,setTimeNote]=useState('');
 const addTech=()=>{const rate=Number(techRate.replace(',','.'));if(!techName.trim()||!Number.isFinite(rate)||rate<0){showAlert(t('معلومات ناقصة'),t('دخل اسم التقني وسعر ساعة صحيح.'));return;}
  onAddTechnician({id:'tech-'+Date.now(),name:techName.trim(),phone:techPhone.trim()||undefined,specialty:techSpecialty.trim()||undefined,hourlyRate:rate,active:true,permissions:[...techPermissions]});setTechName('');setTechPhone('');setTechSpecialty('');setTechRate('0');setTechPermissions([...WORK_ORDER_CATEGORIES]);
 };
 const addEquipmentCategory=()=>{try{if(!equipmentCategoryDraft.trim())throw new Error('اسم فئة المعدات مطلوب');onAddEquipmentCategory(equipmentCategoryDraft);setEquipmentCategoryDraft('');}catch(error){showAlert(t('فئات المعدات'),error instanceof Error?(t(error.message)||error.message):t('تعذر إضافة الفئة.'));}};
 const addEquip=()=>{if(!equipmentName.trim()){showAlert(t('معلومات ناقصة'),t('دخل اسم المعدة.'));return;}
  onAddEquipment({id:'equipment-'+Date.now(),name:equipmentName.trim(),category:equipmentCategory||undefined,reference:equipmentRef.trim()||undefined,serialNumber:equipmentSerial.trim()||undefined,status:'available'});setEquipmentName('');setEquipmentRef('');setEquipmentSerial('');setEquipmentCategory('');
 };
 const createOrder=()=>{const customer=customers.find(x=>String(x.id)===orderCustomer);if(!customer||!orderTitle.trim()){showAlert(t('معلومات ناقصة'),t('اختار الزبون ودخل عنوان أمر العمل.'));return;}
  if(orderDate.trim()&&!Number.isFinite(Date.parse(orderDate))){showAlert(t('تاريخ غير صالح'),t('تاريخ أمر العمل غير صالح'));return;}const now=new Date().toISOString();const scheduledAt=orderDate.trim()?new Date(orderDate).toISOString():undefined;
  try{const order=createWorkOrder({id:'work-order-'+Date.now(),number:'WO-'+Date.now(),title:orderTitle.trim(),customerName:customer.name,projectId:orderProject?Number(orderProject):undefined,description:orderDescription.trim(),category:orderCategory,status:scheduledAt?'scheduled':'requested',priority:'normal',scheduledAt,technicianId:orderTechnician||undefined,equipmentIds:selectedEquipment,createdAt:now},technicians,equipment);onCreateOrder(order);setOrderTitle('');setOrderCustomer('');setOrderProject('');setOrderTechnician('');setOrderDate('');setOrderDescription('');setSelectedEquipment([]);}
  catch(error){showAlert(t('أمر العمل'),error instanceof Error?(t(error.message)||error.message):t('تعذر إنشاء أمر العمل.'));}
 };
 const chooseOrderCategory=(category:WorkOrderCategory)=>{setOrderCategory(category);const selected=technicians.find(item=>item.id===orderTechnician);if(selected&&!technicianCanPerform(selected,category))setOrderTechnician('');};
 const changeStatus=(order:WorkOrder,next:WorkOrder['status'])=>{try{onChangeOrder(transitionWorkOrderStatus(order,next));}catch(error){showAlert(t('حالة أمر العمل'),error instanceof Error?(t(error.message)||error.message):t('انتقال الحالة غير مسموح.'));}};
 const saveSettlementQuote=()=>{const order=orders.find(x=>x.id===settlementOrder);const amount=Number(settlementQuote.replace(',','.'));if(!order){showAlert(t('معلومات ناقصة'),t('اختار أمر العمل.'));return;}if(!Number.isFinite(amount)||amount<0){showAlert(t('مبلغ غير صالح'),t('دخل مبلغاً صحيحاً.'));return;}try{const current=order.settlement;const settlement=summarizeWorkOrderSettlement(Math.round(amount*100),current?.payments||[]);onChangeOrder({...order,settlement});setSettlementQuote('');}catch(error){showAlert(t('تسوية أمر العمل'),error instanceof Error?(t(error.message)||error.message):t('تعذر حفظ المبلغ.'));}};
 const addSettlementPayment=()=>{const order=orders.find(x=>x.id===settlementOrder);const amount=Number(settlementPayment.replace(',','.'));if(!order){showAlert(t('معلومات ناقصة'),t('اختار أمر العمل.'));return;}if(!Number.isFinite(amount)||amount<=0){showAlert(t('مبلغ غير صالح'),t('دخل مبلغ أداء أكبر من صفر.'));return;}try{const current=order.settlement||summarizeWorkOrderSettlement(0,[]);const payment:WorkOrderSettlementPayment={id:'work-payment-'+Date.now(),amountCentimes:Math.round(amount*100),date:new Date().toISOString(),method:settlementMethod};const settlement=addWorkOrderSettlementPayment(current,payment);onChangeOrder({...order,settlement});setSettlementPayment('');}catch(error){showAlert(t('أداء أمر العمل'),error instanceof Error?(t(error.message)||error.message):t('تعذر تسجيل الأداء.'));}};
 const addTime=()=>{const order=orders.find(x=>x.id===timeOrder);const technician=technicians.find(x=>x.id===timeTechnician);const hours=Number(timeHours.replace(',','.'));if(!order||!technician){showAlert(t('معلومات ناقصة'),t('اختار أمر العمل والتقني.'));return;}
  if(!Number.isFinite(Date.parse(timeDate))){showAlert(t('تاريخ غير صالح'),t('تاريخ وساعات العمل غير صالحة'));return;}try{const entry=createWorkTimeEntry({id:'work-time-'+Date.now(),workOrderId:order.id,technicianId:technician.id,date:new Date(timeDate).toISOString(),hours,hourlyRate:technician.hourlyRate,notes:timeNote.trim()||undefined},order,technician);onAddTimeEntry(entry);setTimeHours('');setTimeNote('');}
  catch(error){showAlert(t('ساعات العمل'),error instanceof Error?(t(error.message)||error.message):t('تعذر تسجيل ساعات العمل.'));}
 };
 return <View>
  <View style={styles.panel}><Text style={styles.title}>التقنيون</Text>
   <TextInput value={techName} onChangeText={setTechName} placeholder="اسم التقني" placeholderTextColor="#888" style={styles.input}/>
   <TextInput value={techPhone} onChangeText={setTechPhone} placeholder="الهاتف (اختياري)" placeholderTextColor="#888" style={styles.input}/>
   <TextInput value={techSpecialty} onChangeText={setTechSpecialty} placeholder="التخصص" placeholderTextColor="#888" style={styles.input}/>
   <TextInput value={techRate} onChangeText={setTechRate} keyboardType="decimal-pad" placeholder="ثمن ساعة العمل DH" placeholderTextColor="#888" style={styles.input}/>
   <Text style={styles.note}>صلاحيات أنواع العمل</Text>
   <View style={styles.row}>{WORK_ORDER_CATEGORIES.map(category=><AccessiblePressable key={category} accessibilityState={{checked:techPermissions.includes(category)}} onPress={()=>setTechPermissions(current=>current.includes(category)?current.filter(item=>item!==category):[...current,category])} style={[styles.choice,techPermissions.includes(category)&&styles.selected]}><Text style={styles.label}>{category==='installation'?'تركيب':category==='maintenance'?'صيانة':category==='repair'?'إصلاح':'فحص'}</Text></AccessiblePressable>)}</View>
   <AccessiblePressable style={styles.action} onPress={addTech}><Text style={styles.actionText}>إضافة تقني</Text></AccessiblePressable>
   {technicians.map(x=><Text key={x.id} style={styles.note}>{x.name} • {x.specialty||'بدون تخصص'} • {x.hourlyRate.toFixed(2)} DH/ساعة {x.active?'':'• غير نشط'}</Text>)}
  </View>
  <View style={[styles.panel,{marginTop:12}]}><Text style={styles.title}>فئات المعدات</Text>
   <TextInput value={equipmentCategoryDraft} onChangeText={setEquipmentCategoryDraft} placeholder="اسم فئة جديدة" placeholderTextColor="#888" style={styles.input}/>
   <AccessiblePressable style={styles.action} onPress={addEquipmentCategory}><Text style={styles.actionText}>إضافة فئة</Text></AccessiblePressable>
   {equipmentCategories.map(category=><View key={category} style={styles.row}><AccessiblePressable accessibilityState={{selected:equipmentCategory===category}} onPress={()=>setEquipmentCategory(current=>current===category?'':category)} style={[styles.choice,{flex:1},equipmentCategory===category&&styles.selected]}><Text style={styles.label}>{category}</Text></AccessiblePressable><AccessiblePressable accessibilityRole="button" accessibilityLabel={'حذف فئة '+category} onPress={()=>showAlert('حذف الفئة؟',category,[{text:'إلغاء',style:'cancel'},{text:'حذف',style:'destructive',onPress:()=>onDeleteEquipmentCategory(category)}])}><Text style={styles.delete}>حذف</Text></AccessiblePressable></View>)}
   <Text style={styles.note}>الفئة المختارة للمعدة الجديدة: {equipmentCategory||'بدون فئة'}</Text>
   <Text style={styles.title}>المعدات</Text>
   <TextInput value={equipmentName} onChangeText={setEquipmentName} placeholder="اسم المعدة" placeholderTextColor="#888" style={styles.input}/>
   <TextInput value={equipmentRef} onChangeText={setEquipmentRef} placeholder="المرجع (اختياري)" placeholderTextColor="#888" style={styles.input}/>
   <TextInput value={equipmentSerial} onChangeText={setEquipmentSerial} placeholder="الرقم التسلسلي (اختياري)" placeholderTextColor="#888" style={styles.input}/>
   <AccessiblePressable style={styles.action} onPress={addEquip}><Text style={styles.actionText}>إضافة معدة</Text></AccessiblePressable>
   {equipment.map(x=><Text key={x.id} style={styles.note}>{x.name} • {x.category||'بدون فئة'} • {x.reference||x.serialNumber||'بدون مرجع'} • {x.status==='available'?'متاحة':x.status==='assigned'?'مخصصة':'صيانة'}</Text>)}
  </View>
  <View style={[styles.panel,{marginTop:12}]}><Text style={styles.title}>طلبات وأوامر التركيب</Text>
   <TextInput value={orderTitle} onChangeText={setOrderTitle} placeholder="عنوان أمر العمل" placeholderTextColor="#888" style={styles.input}/>
   <Text style={styles.note}>نوع العمل</Text>
   <View style={styles.row}>{WORK_ORDER_CATEGORIES.map(category=><AccessiblePressable key={category} accessibilityState={{selected:orderCategory===category}} onPress={()=>chooseOrderCategory(category)} style={[styles.choice,orderCategory===category&&styles.selected]}><Text style={styles.label}>{category==='installation'?'تركيب':category==='maintenance'?'صيانة':category==='repair'?'إصلاح':'فحص'}</Text></AccessiblePressable>)}</View>
   <Text style={styles.note}>الزبون</Text>
   {customers.map(x=><AccessiblePressable key={x.id} accessibilityState={{selected:orderCustomer===String(x.id)}} onPress={()=>setOrderCustomer(String(x.id))} style={[styles.choice,orderCustomer===String(x.id)&&styles.selected]}><Text style={styles.label}>{x.name}</Text></AccessiblePressable>)}
   <Text style={styles.note}>المشروع (اختياري)</Text>
   {projects.map(x=><AccessiblePressable key={x.id} accessibilityState={{selected:orderProject===String(x.id)}} onPress={()=>setOrderProject(String(x.id))} style={[styles.choice,orderProject===String(x.id)&&styles.selected]}><Text style={styles.label}>{x.name}</Text></AccessiblePressable>)}
   <Text style={styles.note}>التقني المسؤول</Text>
   {technicians.filter(x=>x.active&&technicianCanPerform(x,orderCategory)).map(x=><AccessiblePressable key={x.id} accessibilityState={{selected:orderTechnician===x.id}} onPress={()=>setOrderTechnician(x.id)} style={[styles.choice,orderTechnician===x.id&&styles.selected]}><Text style={styles.label}>{x.name}</Text></AccessiblePressable>)}{technicians.some(x=>x.active&&technicianCanPerform(x,orderCategory))?null:<Text style={styles.note}>ما كاين حتى تقني عندو صلاحية لهذا النوع من العمل.</Text>}
   <TextInput value={orderDate} onChangeText={setOrderDate} placeholder="موعد التركيب (YYYY-MM-DD) اختياري" placeholderTextColor="#888" style={styles.input}/>
   <TextInput value={orderDescription} onChangeText={setOrderDescription} placeholder="تفاصيل وملاحظات" placeholderTextColor="#888" style={styles.input}/>
   <Text style={styles.note}>المعدات المتاحة</Text>
   {equipment.filter(x=>x.status==='available').map(x=><AccessiblePressable key={x.id} accessibilityState={{checked:selectedEquipment.includes(x.id)}} onPress={()=>setSelectedEquipment(current=>current.includes(x.id)?current.filter(id=>id!==x.id):[...current,x.id])} style={[styles.choice,selectedEquipment.includes(x.id)&&styles.selected]}><Text style={styles.label}>{x.name}</Text></AccessiblePressable>)}
   <AccessiblePressable style={styles.action} onPress={createOrder}><Text style={styles.actionText}>إنشاء أمر العمل</Text></AccessiblePressable>
  </View>
  <View style={[styles.panel,{marginTop:12}]}><Text style={styles.title}>تسوية وأداءات أوامر العمل</Text>
   {orders.map(order=><AccessiblePressable key={order.id} accessibilityState={{selected:settlementOrder===order.id}} onPress={()=>{setSettlementOrder(order.id);setSettlementQuote(order.settlement?(order.settlement.quotedAmountCentimes/100).toFixed(2):'');}} style={[styles.choice,settlementOrder===order.id&&styles.selected]}><Text style={styles.label}>{order.number} • {order.title}</Text><Text style={styles.note}>{order.settlement?((order.settlement.paidCentimes/100).toFixed(2)+' DH مؤدى • '+(order.settlement.balanceCentimes/100).toFixed(2)+' DH باقي'):'لم تحدد القيمة بعد'}</Text></AccessiblePressable>)}
   <TextInput value={settlementQuote} onChangeText={setSettlementQuote} keyboardType="decimal-pad" placeholder="المبلغ المتفق عليه DH" placeholderTextColor="#888" style={styles.input}/>
   <AccessiblePressable style={styles.action} onPress={saveSettlementQuote}><Text style={styles.actionText}>حفظ المبلغ المتفق عليه</Text></AccessiblePressable>
   <TextInput value={settlementPayment} onChangeText={setSettlementPayment} keyboardType="decimal-pad" placeholder="مبلغ الأداء DH" placeholderTextColor="#888" style={styles.input}/>
   <View style={styles.row}>{(['cash','transfer','card','cheque'] as const).map(method=><AccessiblePressable key={method} accessibilityState={{selected:settlementMethod===method}} onPress={()=>setSettlementMethod(method)} style={[styles.choice,{flex:1},settlementMethod===method&&styles.selected]}><Text style={styles.label}>{method==='cash'?'نقداً':method==='transfer'?'تحويل':method==='card'?'بطاقة':'شيك'}</Text></AccessiblePressable>)}</View>
   <AccessiblePressable style={styles.action} onPress={addSettlementPayment}><Text style={styles.actionText}>تسجيل الأداء الجزئي أو الكامل</Text></AccessiblePressable>
   {orders.filter(order=>order.settlement).map(order=><Text key={'settlement-'+order.id} style={styles.note}>{order.number}: {order.settlement!.status==='settled'?'مخلص بالكامل':order.settlement!.status==='partial'?'أداء جزئي':'غير مؤدى'} • المجموع {(order.settlement!.quotedAmountCentimes/100).toFixed(2)} DH • المؤدى {(order.settlement!.paidCentimes/100).toFixed(2)} DH • الباقي {(order.settlement!.balanceCentimes/100).toFixed(2)} DH</Text>)}
  </View>
  <View style={[styles.panel,{marginTop:12}]}><Text style={styles.title}>ساعات العمل والتكلفة</Text>
   {orders.filter(x=>['in_progress','completed'].includes(x.status)).map(x=><AccessiblePressable key={x.id} accessibilityState={{selected:timeOrder===x.id}} onPress={()=>setTimeOrder(x.id)} style={[styles.choice,timeOrder===x.id&&styles.selected]}><Text style={styles.label}>{x.number} • {x.title}</Text></AccessiblePressable>)}
   {technicians.filter(x=>x.active).map(x=><AccessiblePressable key={x.id} accessibilityState={{selected:timeTechnician===x.id}} onPress={()=>setTimeTechnician(x.id)} style={[styles.choice,timeTechnician===x.id&&styles.selected]}><Text style={styles.label}>{x.name}</Text></AccessiblePressable>)}
   <TextInput value={timeHours} onChangeText={setTimeHours} keyboardType="decimal-pad" placeholder="عدد الساعات" placeholderTextColor="#888" style={styles.input}/>
   <TextInput value={timeDate} onChangeText={setTimeDate} placeholder="تاريخ العمل YYYY-MM-DD" placeholderTextColor="#888" style={styles.input}/>
   <TextInput value={timeNote} onChangeText={setTimeNote} placeholder="ملاحظات" placeholderTextColor="#888" style={styles.input}/>
   <AccessiblePressable style={styles.action} onPress={addTime}><Text style={styles.actionText}>تسجيل ساعات العمل</Text></AccessiblePressable>
  </View>
  <Text style={styles.section}>سجل أوامر العمل</Text>
  {orders.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(order=><View key={order.id} style={styles.order}>
   <Text style={styles.label}>{order.number} • {order.title}</Text><Text style={styles.note}>{order.customerName} • {statusLabel(order.status)} • {order.scheduledAt||'غير مبرمج'}</Text><Text style={styles.note}>نوع العمل: {order.category==='installation'?'تركيب':order.category==='maintenance'?'صيانة':order.category==='repair'?'إصلاح':order.category==='inspection'?'فحص':'غير محدد'}</Text>
   <Text style={styles.note}>التقني: {technicians.find(x=>x.id===order.technicianId)?.name||'غير محدد'} • المعدات: {order.equipmentIds.length}</Text>
   <Text style={styles.note}>الوقت: {workOrderHours(timeEntries,order.id).toFixed(2)} ساعة • التكلفة: {(workOrderTimeCost(timeEntries,order.id)/100).toFixed(2)} DH</Text>
   <View style={styles.row}>
    {order.status==='requested'&&<AccessiblePressable style={styles.smallAction} onPress={()=>changeStatus(order,'scheduled')}><Text style={styles.actionText}>برمجة</Text></AccessiblePressable>}
    {order.status==='scheduled'&&<AccessiblePressable style={styles.smallAction} onPress={()=>changeStatus(order,'in_progress')}><Text style={styles.actionText}>بدء العمل</Text></AccessiblePressable>}
    {order.status==='in_progress'&&<AccessiblePressable style={styles.smallAction} onPress={()=>changeStatus(order,'completed')}><Text style={styles.actionText}>إكمال</Text></AccessiblePressable>}
    {!['completed','cancelled'].includes(order.status)&&<AccessiblePressable style={styles.smallDanger} onPress={()=>changeStatus(order,'cancelled')}><Text style={styles.actionText}>إلغاء</Text></AccessiblePressable>}
   </View>
  </View>)}
 </View>;
}
const styles=StyleSheet.create({
 panel:{backgroundColor:'#1B1B1B',padding:16,borderRadius:14,borderWidth:1,borderColor:'#444'},
 title:{color:GOLD,fontSize:18,fontWeight:'800',marginBottom:12},note:{color:'#BBB',fontSize:12,marginVertical:4},label:{color:'#FFF',fontWeight:'700'},
 input:{backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:12,color:'#FFF',marginBottom:10,textAlign:'right'},
 action:{marginTop:4,backgroundColor:GOLD,borderRadius:9,padding:13,alignItems:'center'},actionText:{color:'#151515',fontWeight:'900'},
 choice:{borderWidth:1,borderColor:'#393939',borderRadius:8,padding:10,marginBottom:6},selected:{borderColor:GOLD,backgroundColor:'#302819'},
 section:{color:'#FFF',fontWeight:'800',fontSize:17,marginTop:20,marginBottom:10},order:{backgroundColor:'#1B1B1B',borderRadius:10,padding:13,marginBottom:8,borderWidth:1,borderColor:'#333'},
 row:{flexDirection:'row',gap:8,marginTop:8},delete:{color:'#E28A78',fontWeight:'700',padding:8},smallAction:{backgroundColor:GOLD,borderRadius:7,padding:9,flex:1,alignItems:'center'},smallDanger:{backgroundColor:'#8B3A31',borderRadius:7,padding:9,flex:1,alignItems:'center'},
});
