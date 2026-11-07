import React, {useContext, useState} from 'react';
import {Alert, View, StyleSheet} from 'react-native';
import {TText as Text, TTextInput as TextInput, LanguageContext, translateText} from './i18n';
import AccessiblePressable from './AccessiblePressable';
import {Warehouse, InventoryMovement, inventoryBalance, inventoryBalanceForWarehouse} from './domain/inventory-ledger';

type ProductChoice = {id:number;name:string;costPrice?:number;qty:number};
type TransferInput = {id:string;productId:number;quantity:number;fromWarehouseId:string;toWarehouseId:string;date:string;note?:string;unitCost?:number};

type Props = {
  warehouses:Warehouse[];
  movements:InventoryMovement[];
  products:ProductChoice[];
  activeWarehouseId:string;
  onSelectWarehouse:(id:string)=>void;
  onAddWarehouse:(warehouse:Warehouse)=>void;
  onTransfer:(input:TransferInput)=>boolean;
};

const GOLD='#D6AE55';
export default function WarehouseWorkspace({warehouses,movements,products,activeWarehouseId,onSelectWarehouse,onAddWarehouse,onTransfer}:Props){
  const language=useContext(LanguageContext);
 const showAlert = (...args: Parameters<typeof Alert.alert>) => {
  const [title, message, buttons, options] = args;
  const translatedButtons = buttons?.map(button => ({
   ...button,
   text: button.text ? (translateText(button.text, language) || button.text) : button.text,
  }));
  Alert.alert(translateText(title, language) || title, translateText(message, language) || message, translatedButtons, options);
 };

  const t=(value:string)=>translateText(value,language)||value;
  const [name,setName]=useState('');
  const [productId,setProductId]=useState('');
  const [destinationId,setDestinationId]=useState('');
  const [quantity,setQuantity]=useState('1');
  const [note,setNote]=useState('');
  const active=warehouses.find(w=>w.id===activeWarehouseId);
  const addWarehouse=()=>{
    const clean=name.trim();
    if(!clean){showAlert(t('معلومات ناقصة'),t('دخل اسم المخزن.'));return;}
    if(warehouses.some(w=>w.name.trim().toLocaleLowerCase()===clean.toLocaleLowerCase())){showAlert(t('مخزن موجود'),t('هاد الاسم مستعمل من قبل.'));return;}
    onAddWarehouse({id:'warehouse-'+Date.now(),name:clean});
    setName('');
  };
  const submitTransfer=()=>{
    const product=products.find(p=>String(p.id)===productId);
    const amount=Number(quantity);
    if(!product||!destinationId){showAlert(t('معلومات ناقصة'),t('اختار المنتج ومخزن الوجهة.'));return;}
    if(!Number.isSafeInteger(amount)||amount<1){showAlert(t('كمية غير صالحة'),t('دخل كمية صحيحة أكبر من صفر.'));return;}
    const saved=onTransfer({id:'transfer-'+Date.now(),productId:product.id,quantity:amount,fromWarehouseId:activeWarehouseId,toWarehouseId:destinationId,date:new Date().toISOString(),note:note.trim()||undefined,unitCost:product.costPrice});
    if(saved){setProductId('');setDestinationId('');setQuantity('1');setNote('');}
  };
  return <View>
    <View style={styles.panel}>
      <Text style={styles.title}>إدارة المخازن</Text>
      <Text style={styles.note}>المخزن النشط: {active?.name||'غير محدد'}. الحركات القديمة التي لا تحمل مخزناً تبقى في المخزن الرئيسي.</Text>
      {warehouses.map(w=><AccessiblePressable key={w.id} accessibilityRole="button" accessibilityState={{selected:activeWarehouseId===w.id}} onPress={()=>onSelectWarehouse(w.id)} style={[styles.choice,activeWarehouseId===w.id&&styles.selected]}>
        <Text style={styles.label}>{w.name}{w.isDefault?' • افتراضي':''}{activeWarehouseId===w.id?' • نشط':''}</Text>
      </AccessiblePressable>)}
      <TextInput value={name} onChangeText={setName} placeholder="اسم المخزن الجديد" placeholderTextColor="#888" style={styles.input}/>
      <AccessiblePressable style={styles.action} onPress={addWarehouse}><Text style={styles.actionText}>إضافة مخزن</Text></AccessiblePressable>
    </View>
    <View style={[styles.panel,{marginTop:12}]}>
      <Text style={styles.title}>تحويل بين المخازن</Text>
      {products.map(p=><AccessiblePressable key={p.id} accessibilityRole="button" accessibilityState={{selected:productId===String(p.id)}} onPress={()=>setProductId(String(p.id))} style={[styles.choice,productId===String(p.id)&&styles.selected]}>
        <Text style={styles.label}>{p.name}</Text>
        <Text style={styles.note}>الإجمالي: {inventoryBalance(movements,p.id)} • في {active?.name||'المخزن'}: {inventoryBalanceForWarehouse(movements,p.id,activeWarehouseId)}</Text>
      </AccessiblePressable>)}
      <Text style={styles.note}>مخزن الوجهة</Text>
      {warehouses.filter(w=>w.id!==activeWarehouseId).map(w=><AccessiblePressable key={w.id} accessibilityRole="button" accessibilityState={{selected:destinationId===w.id}} onPress={()=>setDestinationId(w.id)} style={[styles.choice,destinationId===w.id&&styles.selected]}>
        <Text style={styles.label}>{w.name}</Text>
      </AccessiblePressable>)}
      <TextInput value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder="الكمية" placeholderTextColor="#888" style={styles.input}/>
      <TextInput value={note} onChangeText={setNote} placeholder="ملاحظة اختيارية" placeholderTextColor="#888" style={styles.input}/>
      <AccessiblePressable style={styles.action} onPress={submitTransfer}><Text style={styles.actionText}>تأكيد التحويل</Text></AccessiblePressable>
      <Text style={styles.note}>التحويل كيسجل خروج من المصدر ودخول للوجهة، بلا ما يتبدل مجموع المخزون العام.</Text>
    </View>
    <Text style={styles.section}>المخزون حسب المخزن</Text>
    {products.map(p=><View key={p.id} style={styles.stockRow}>
      <Text style={styles.label}>{p.name} • الإجمالي {inventoryBalance(movements,p.id)}</Text>
      {warehouses.map(w=><Text key={w.id} style={styles.note}>{w.name}: {inventoryBalanceForWarehouse(movements,p.id,w.id)}</Text>)}
    </View>)}
  </View>;
}
const styles=StyleSheet.create({
  panel:{backgroundColor:'#1B1B1B',padding:16,borderRadius:14,borderWidth:1,borderColor:'#444'},
  title:{color:GOLD,fontSize:19,fontWeight:'800',marginBottom:12},
  note:{color:'#BBB',fontSize:12,marginVertical:4},
  choice:{borderWidth:1,borderColor:'#393939',borderRadius:8,padding:11,marginBottom:7},
  selected:{borderColor:GOLD,backgroundColor:'#302819'},
  label:{color:'#FFF',fontWeight:'700'},
  input:{backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:12,color:'#FFF',marginBottom:10,textAlign:'right'},
  action:{marginTop:3,backgroundColor:GOLD,borderRadius:9,padding:13,alignItems:'center'},
  actionText:{color:'#151515',fontWeight:'900'},
  section:{color:'#FFF',fontWeight:'800',fontSize:17,marginTop:20,marginBottom:10},
  stockRow:{backgroundColor:'#1B1B1B',borderRadius:10,padding:13,marginBottom:8,borderWidth:1,borderColor:'#333'},
});
