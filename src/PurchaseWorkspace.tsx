import React,{useState} from 'react';
import {Alert,Pressable,Text,TextInput,View} from 'react-native';
import {PurchaseDocument,PurchaseKind,PurchaseLine,purchaseTotals} from './purchases';
import {Warehouse} from './inventory';
import {translate} from './i18n';

type Supplier={id:number;name:string};
type Product={id:number;name:string;costPrice?:number};
type Props={
  language:'AR'|'FR';
  suppliers:Supplier[];
  products:Product[];
  warehouses:Warehouse[];
  documents:PurchaseDocument[];
  onCreate:(input:{kind:'request'|'order';supplierId:string;warehouseId:string;lines:PurchaseLine[];globalDiscount:number})=>void;
  onChangeStatus:(document:PurchaseDocument,status:'confirmed'|'cancelled')=>void;
  onConvert:(document:PurchaseDocument,target:'order'|'receipt'|'supplier_invoice')=>void;
  onSupplierReturn:(invoice:PurchaseDocument,quantities:Record<string,number>)=>void;
  onPdf?:(document:PurchaseDocument,total:number)=>void;
};
const gold='#D6AE55';
const money=(value:number)=>value.toFixed(2)+' DH';

export default function PurchaseWorkspace({language,suppliers,products,warehouses,documents,onCreate,onChangeStatus,onConvert,onSupplierReturn,onPdf}:Props){
  const tr=(value:string)=>translate(language,value);
  const [kind,setKind]=useState<'request'|'order'>('order');
  const [supplierId,setSupplierId]=useState('');
  const [warehouseId,setWarehouseId]=useState(warehouses.find(item=>item.active)?.id||'');
  const [productId,setProductId]=useState('');
  const [quantity,setQuantity]=useState('1');
  const [unitCost,setUnitCost]=useState('');
  const [globalDiscount,setGlobalDiscount]=useState('0');
  const [lines,setLines]=useState<PurchaseLine[]>([]);
  const [returnQuantities,setReturnQuantities]=useState<Record<string,Record<string,string>>>({});
  const addLine=()=>{
    const product=products.find(item=>String(item.id)===productId);
    const qty=Number(quantity.replace(',','.'));
    const cost=Number(unitCost.replace(',','.'));
    if(!product||!Number.isFinite(qty)||qty<=0||!Number.isFinite(cost)||cost<0){Alert.alert(tr('معلومات ناقصة'),tr('اختار المنتج ودخل الكمية وثمن الشراء.'));return;}
    setLines(current=>[...current,{productId:String(product.id),description:product.name,quantity:qty,unitCost:cost,discount:0}]);
    setQuantity('1');setUnitCost('');setProductId('');
  };
  const create=()=>{
    const discount=Number(globalDiscount.replace(',','.'));
    if(!supplierId||!lines.length||!Number.isFinite(discount)||discount<0){Alert.alert(tr('معلومات ناقصة'),tr('اختار المورد وزيد منتوج واحد على الأقل.'));return;}
    onCreate({kind,supplierId,warehouseId,lines,globalDiscount:discount});
    setLines([]);setGlobalDiscount('0');
  };
  const labelForKind=(kind:PurchaseKind)=>tr(kind==='request'?'طلب شراء':kind==='order'?'أمر شراء':kind==='receipt'?'استلام بضاعة':kind==='supplier_invoice'?'فاتورة مورد':'إشعار دائن للمورد');
  const labelForStatus=(status:PurchaseDocument['status'])=>tr(status==='draft'?'مسودة':status==='confirmed'?'مؤكد':status==='received'?'مستلم':'ملغى');
  return <View style={{gap:12,direction:language==='AR'?'rtl':'ltr'}}>
    <View style={{backgroundColor:'#1B1B1B',padding:15,borderRadius:13,borderWidth:1,borderColor:'#444'}}>
      <Text style={{color:gold,fontSize:19,fontWeight:'900',marginBottom:10}}>{tr('دورة الشراء')}</Text>
      <View style={{flexDirection:'row',gap:7}}>{(['request','order'] as const).map(value=><Pressable key={value} onPress={()=>setKind(value)} style={{flex:1,borderWidth:1,borderColor:kind===value?gold:'#444',borderRadius:8,padding:10,alignItems:'center'}}><Text style={{color:'#FFF'}}>{labelForKind(value)}</Text></Pressable>)}</View>
      <Text style={{color:'#CCC',fontWeight:'700',marginTop:12,marginBottom:6}}>{tr('المورد')}</Text>
      {suppliers.map(item=><Pressable key={item.id} onPress={()=>setSupplierId(String(item.id))} style={{borderWidth:1,borderColor:supplierId===String(item.id)?gold:'#444',borderRadius:8,padding:9,marginBottom:5}}><Text style={{color:'#FFF'}}>{item.name}</Text></Pressable>)}
      {kind==='order'&&<><Text style={{color:'#CCC',fontWeight:'700',marginTop:7,marginBottom:6}}>{tr('المخزن المستهدف')}</Text>{warehouses.filter(item=>item.active).map(item=><Pressable key={item.id} onPress={()=>setWarehouseId(item.id)} style={{borderWidth:1,borderColor:warehouseId===item.id?gold:'#444',borderRadius:8,padding:9,marginBottom:5}}><Text style={{color:'#FFF'}}>{item.name}</Text></Pressable>)}</>}
      <Text style={{color:'#CCC',fontWeight:'700',marginTop:7,marginBottom:6}}>{tr('المنتوج')}</Text>
      {products.map(product=><Pressable key={product.id} onPress={()=>{setProductId(String(product.id));setUnitCost(String(product.costPrice||0));}} style={{borderWidth:1,borderColor:productId===String(product.id)?gold:'#444',borderRadius:8,padding:9,marginBottom:5}}><Text style={{color:'#FFF'}}>{product.name} · {tr('الشراء:')} {(product.costPrice||0).toFixed(2)} DH</Text></Pressable>)}
      <View style={{flexDirection:'row',gap:8}}><TextInput value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder={tr('الكمية')} placeholderTextColor="#888" style={{flex:1,backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:8,padding:10,color:'#FFF'}}/><TextInput value={unitCost} onChangeText={setUnitCost} keyboardType="decimal-pad" placeholder={tr('ثمن الشراء')} placeholderTextColor="#888" style={{flex:1,backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:8,padding:10,color:'#FFF'}}/></View>
      <Pressable onPress={addLine} style={{borderWidth:1,borderColor:gold,borderRadius:8,padding:10,alignItems:'center',marginTop:8}}><Text style={{color:gold,fontWeight:'800'}}>{tr('إضافة للسند')}</Text></Pressable>
      <Text style={{color:gold,fontWeight:'800',marginTop:12}}>{tr('سطور الشراء')} ({lines.length})</Text>
      {lines.map((line,index)=><View key={`${line.productId}-${index}`} style={{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#333'}}><Text style={{color:'#FFF',flex:1}}>{line.description} × {line.quantity}</Text><Text style={{color:gold}}>{money(line.quantity*line.unitCost)}</Text><Pressable onPress={()=>setLines(current=>current.filter((_,lineIndex)=>lineIndex!==index))}><Text style={{color:'#E28A78'}}>{tr('حذف')}</Text></Pressable></View>)}
      <TextInput value={globalDiscount} onChangeText={setGlobalDiscount} keyboardType="decimal-pad" placeholder={tr('التخفيض الإجمالي (DH)')} placeholderTextColor="#888" style={{backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:8,padding:10,color:'#FFF',marginTop:9}}/>
      <Text style={{color:gold,fontWeight:'900',fontSize:18,marginVertical:8}}>{tr('المجموع:')} {money(purchaseTotals({id:'draft',number:'DRAFT',kind,status:'draft',supplierId,warehouseId,lines,globalDiscount:Number(globalDiscount.replace(',','.'))||0,createdAt:''}).total)}</Text>
      <Pressable onPress={create} style={{backgroundColor:gold,borderRadius:9,padding:13,alignItems:'center'}}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('حفظ مسودة الشراء')}</Text></Pressable>
    </View>
    <Text style={{color:'#FFF',fontSize:17,fontWeight:'900'}}>{tr('وثائق الشراء')} ({documents.length})</Text>
    {documents.map(document=>{
      const supplier=suppliers.find(item=>String(item.id)===document.supplierId);
      const total=purchaseTotals(document).total;
      return <View key={document.id} style={{backgroundColor:'#1B1B1B',borderRadius:10,padding:12,borderWidth:1,borderColor:'#333',gap:7}}>
        <Text style={{color:'#FFF',fontWeight:'800'}}>{document.number} · {labelForKind(document.kind)} · {labelForStatus(document.status)}</Text>
        <Text style={{color:'#AAA'}}>{supplier?.name||tr('مورد محذوف')} · {document.createdAt.slice(0,10)} · {document.lines.length} {tr('سطر')}</Text>
        <Text style={{color:gold,fontWeight:'800'}}>{money(total)}</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
          {document.status==='draft'&&(document.kind==='request'||document.kind==='order'||document.kind==='supplier_invoice')&&<Pressable onPress={()=>onChangeStatus(document,'confirmed')} style={{borderWidth:1,borderColor:gold,borderRadius:7,padding:8}}><Text style={{color:gold}}>{tr('تأكيد الوثيقة')}</Text></Pressable>}
          {document.status==='confirmed'&&document.kind==='request'&&<Pressable onPress={()=>onConvert(document,'order')} style={{borderWidth:1,borderColor:gold,borderRadius:7,padding:8}}><Text style={{color:gold}}>{tr('تحويل لأمر شراء')}</Text></Pressable>}
          {document.status==='confirmed'&&document.kind==='order'&&<Pressable onPress={()=>onConvert(document,'receipt')} style={{borderWidth:1,borderColor:gold,borderRadius:7,padding:8}}><Text style={{color:gold}}>{tr('استلام وتحديث المخزون')}</Text></Pressable>}
          {document.status==='received'&&document.kind==='receipt'&&<Pressable onPress={()=>onConvert(document,'supplier_invoice')} style={{borderWidth:1,borderColor:gold,borderRadius:7,padding:8}}><Text style={{color:gold}}>{tr('إنشاء فاتورة المورد')}</Text></Pressable>}
          {(document.status==='draft'||document.status==='confirmed')&&document.kind!=='receipt'&&<Pressable onPress={()=>onChangeStatus(document,'cancelled')} style={{borderWidth:1,borderColor:'#8a5448',borderRadius:7,padding:8}}><Text style={{color:'#E28A78'}}>{tr('إلغاء الوثيقة')}</Text></Pressable>}
          {onPdf&&<Pressable onPress={()=>onPdf(document,total)} style={{borderWidth:1,borderColor:'#444',borderRadius:7,padding:8}}><Text style={{color:'#DDD'}}>PDF</Text></Pressable>}
        </View>
      </View>;
    })}
    {documents.filter(document=>document.kind==='supplier_invoice'&&document.status==='confirmed').map(invoice=>{
      const productIds=[...new Set(invoice.lines.map(line=>line.productId))];
      const available=(productId:string)=>invoice.lines.filter(line=>line.productId===productId).reduce((sum,line)=>sum+line.quantity,0)-documents.filter(document=>document.kind==='supplier_credit'&&document.sourceDocumentId===invoice.id&&document.status!=='cancelled').reduce((sum,credit)=>sum+credit.lines.filter(line=>line.productId===productId).reduce((lineSum,line)=>lineSum+line.quantity,0),0);
      return <View key={'return-'+invoice.id} style={{backgroundColor:'#1B1B1B',padding:12,borderRadius:10,borderWidth:1,borderColor:'#444',gap:8}}>
        <Text style={{color:gold,fontWeight:'900'}}>{tr('إرجاع من فاتورة المورد')} · {invoice.number}</Text>
        {productIds.map(productId=>{
          const line=invoice.lines.find(item=>item.productId===productId)!;
          return <View key={productId} style={{flexDirection:'row',alignItems:'center',gap:8}}><Text style={{color:'#FFF',flex:1}}>{line.description} · {tr('المتبقي للإرجاع:')} {available(productId)}</Text><TextInput value={returnQuantities[invoice.id]?.[productId]||''} onChangeText={value=>setReturnQuantities(current=>({...current,[invoice.id]:{...current[invoice.id],[productId]:value}}))} keyboardType="decimal-pad" placeholder={tr('الكمية')} placeholderTextColor="#888" style={{width:82,backgroundColor:'#111',borderWidth:1,borderColor:'#444',borderRadius:8,padding:8,color:'#FFF'}}/></View>;
        })}
        <Pressable onPress={()=>{const quantities:Record<string,number>={};for(const [productId,raw] of Object.entries(returnQuantities[invoice.id]||{})){const value=Number(raw.replace(',','.'));if(Number.isFinite(value)&&value>0)quantities[productId]=value;}onSupplierReturn(invoice,quantities);}} style={{backgroundColor:gold,borderRadius:8,padding:11,alignItems:'center'}}><Text style={{color:'#151515',fontWeight:'900'}}>{tr('تسجيل الإرجاع وإنشاء رصيد دائن')}</Text></Pressable>
      </View>;
    })}
    {documents.filter(document=>document.kind==='supplier_credit').map(credit=><View key={credit.id} style={{backgroundColor:'#1B1B1B',padding:10,borderRadius:9,borderWidth:1,borderColor:'#333'}}><Text style={{color:'#FFF',fontWeight:'800'}}>{tr('إشعار دائن للمورد')} · {credit.number}</Text><Text style={{color:gold}}>{money(purchaseTotals(credit).total)} · {tr('فاتورة الأصل')}: {documents.find(item=>item.id===credit.sourceDocumentId)?.number||''}</Text></View>)}
    {documents.length===0&&<Text style={{color:'#888',textAlign:'center',padding:12}}>{tr('مازال ما كايناش وثائق شراء.')}</Text>}
  </View>;
}
