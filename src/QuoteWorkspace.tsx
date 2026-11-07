import React, {useContext, useMemo, useState} from 'react';
import {Alert, ScrollView, Text as NativeText, TextInput as NativeTextInput, View} from 'react-native';
import {calculateQuote} from './domain/quote-calculator';
import {nextDocumentNumber} from './domain/document-numbering';
import {ContactPriceGroup, priceForContactGroup} from './domain/contact-extensions';
import {TText as Text, TTextInput as TextInput, LanguageContext, translateText} from './i18n';
import AccessiblePressable from './AccessiblePressable';
const Pressable = AccessiblePressable;

type Product = {id:number; name:string; price:number; qty:number; kind?:'product'|'service'; quotePrice?:number; invoicePrice?:number;reference?:string;barcode?:string};
type ProductVariant = {id:string;productId:number;attributes:Record<string,string>;stockQty:number;salePriceCentimes?:number;active:boolean};
type Customer = {id:number; name:string; priceGroupId?:string};
export type QuoteLine = {productId:number; productName:string; qty:number; unitPrice:number; total:number; trackStock?:boolean; variantId?:string; variantLabel?:string;lineType?:'section'};
export type QuoteRecord = {
  id:number; number?:string; productName:string; customerName:string; qty:number;
  unitPrice:number; total:number; date:string; status:string;
  lines?:QuoteLine[]; notes?:string; documentDiscount?:number; validUntil?:string; priceGroupDiscountPercent?:number;
};
export type QuoteConversionType = 'invoice' | 'delivery' | 'proforma';
type Props = {
  products:Product[];
  variants:ProductVariant[];
  customers:Customer[];
  priceGroups:ContactPriceGroup[];
  quotes:QuoteRecord[];
  quotePrefix:string;
  onSave:(quote:QuoteRecord)=>void;
  onUpdate:(quote:QuoteRecord)=>void;
  onDelete:(id:number)=>void;
  onPdf:(title:string, customerName:string, lines:string[], total:number)=>void;
  onConvert:(quote:QuoteRecord,type:QuoteConversionType)=>void;
};

const gold='#D6AE55';
const panel={backgroundColor:'#1B1B1B',padding:15,borderRadius:13,borderWidth:1,borderColor:'#444'} as const;
const input={backgroundColor:'#111',borderColor:'#3A3A3A',borderWidth:1,borderRadius:9,padding:11,color:'#FFF',marginBottom:9,textAlign:'right' as const};
const button={backgroundColor:gold,borderRadius:9,padding:12,alignItems:'center' as const,marginTop:5};
const choice={borderWidth:1,borderColor:'#393939',borderRadius:8,padding:10,marginBottom:6};
const active={borderColor:gold,backgroundColor:'#302819'};
const money=(n:number)=>(n/100).toFixed(2)+' DH';

export default function QuoteWorkspace({products,variants,customers,priceGroups,quotes,quotePrefix,onSave,onUpdate,onDelete,onPdf,onConvert}:Props) {
  const language=useContext(LanguageContext);
 const showAlert = (...args: Parameters<typeof Alert.alert>) => {
  const [title, message, buttons, options] = args;
  const translatedButtons = buttons?.map(button => ({
   ...button,
   text: button.text ? (translateText(button.text, language) || button.text) : button.text,
  }));
  Alert.alert(translateText(title, language) || title, translateText(message, language) || message, translatedButtons, options);
 };

  const [customerId,setCustomerId]=useState('');
  const [productId,setProductId]=useState('');
  const [variantId,setVariantId]=useState('');
  const [customerSearch,setCustomerSearch]=useState('');
  const [productSearch,setProductSearch]=useState('');
  const [customPrice,setCustomPrice]=useState('');
  const [quantity,setQuantity]=useState('1');
  const [discount,setDiscount]=useState('0');
  const [lines,setLines]=useState<QuoteLine[]>([]);
  const [notes,setNotes]=useState('');
  const [validUntil,setValidUntil]=useState('');
  const [feeDescription,setFeeDescription]=useState('');
  const [feeAmount,setFeeAmount]=useState('');
  const [sectionTitle,setSectionTitle]=useState('');
  const selectedCustomer=customers.find(c=>String(c.id)===customerId);
  const selectedPriceGroup=priceGroups.find(group=>group.id===selectedCustomer?.priceGroupId&&group.active);
  const selectedProduct=products.find(p=>String(p.id)===productId);
  const hasVariants=selectedProduct?variants.some(v=>v.productId===selectedProduct.id):false;
  const selectedVariants=selectedProduct?variants.filter(v=>v.productId===selectedProduct.id&&v.active):[];
  const selectedVariant=selectedVariants.find(v=>v.id===variantId);
  const filteredCustomers=customers.filter(c=>c.name.toLocaleLowerCase().includes(customerSearch.trim().toLocaleLowerCase()));
  const productQuery=productSearch.trim().toLocaleLowerCase();
  const filteredProducts=products.filter(p=>[p.name,p.reference||'',p.barcode||''].some(value=>value.toLocaleLowerCase().includes(productQuery)));

  const calculation=useMemo(()=>{
    if(!lines.length) return null;
    try {
      const discountValue=Number(discount.replace(',','.'));
      if(!Number.isFinite(discountValue)||discountValue<0) return null;
      return calculateQuote(lines.map(line=>({
        productId:String(line.productId),
        description:line.productName,
        quantity:line.qty,
        unitPriceCentimes:Math.round(line.unitPrice*100),
      })),Math.round(Math.max(0,Number(discount.replace(',','.'))||0)*100));
    } catch { return null; }
  },[lines,discount]);

  const updateLine=(index:number, patch:Partial<Pick<QuoteLine,'qty'|'unitPrice'>>)=>{
    setLines(current=>current.map((line,i)=>{
      if(i!==index) return line;
      const next={...line,...patch};
      return {...next,total:next.qty*next.unitPrice};
    }));
  };
  const addLine=()=>{
    const qty=Number(quantity.replace(',','.'));
    if(!selectedProduct){showAlert('اختار المنتج','حدد المنتج اللي بغيتي تزيد.');return;}
    if(!Number.isFinite(qty)||qty<=0){showAlert('كمية غير صحيحة','دخل كمية أكبر من صفر.');return;}
    if(hasVariants&&!selectedVariant){showAlert('اختار النسخة','هاد المنتج عندو تنويعات. اختار المقاس أو اللون قبل إضافته لعرض السعر.');return;}
    const basePrice=selectedVariant?.salePriceCentimes===undefined?(selectedProduct.quotePrice??selectedProduct.price):selectedVariant.salePriceCentimes/100;
    const defaultPrice=priceForContactGroup(basePrice,selectedPriceGroup);
    const unitPrice=customPrice.trim()?Number(customPrice.replace(',','.')):defaultPrice;
    if(!Number.isFinite(unitPrice)||unitPrice<0){showAlert('ثمن غير صحيح','دخل ثمن بيع صحيح أو خليه بالثمن الأصلي.');return;}
    const line:QuoteLine={productId:selectedProduct.id,productName:selectedProduct.name,variantId:selectedVariant?.id,variantLabel:selectedVariant?Object.values(selectedVariant.attributes).join(' / '):undefined,qty,unitPrice,total:qty*unitPrice,trackStock:selectedProduct.kind!=='service'};
    setLines(current=>[...current,line]);
    setProductId('');
    setVariantId('');
    setProductSearch('');
    setCustomPrice('');
    setQuantity('1');
  };
  const addSection=()=>{
    const title=sectionTitle.trim();
    if(!title){showAlert('عنوان القسم مطلوب','كتب عنواناً للقسم قبل إضافته.');return;}
    setLines(current=>[...current,{productId:0,productName:title,qty:1,unitPrice:0,total:0,trackStock:false,lineType:'section'}]);
    setSectionTitle('');
  };
  const addAdditionalFee=()=>{
    const description=feeDescription.trim();
    const amount=Number(feeAmount.replace(',','.'));
    if(!description){showAlert('وصف الرسوم مطلوب','كتب وصف الخدمة أو الرسوم الإضافية.');return;}
    if(!Number.isFinite(amount)||amount<=0){showAlert('مبلغ غير صالح','دخل مبلغاً أكبر من صفر.');return;}
    const line:QuoteLine={productId:0,productName:'رسوم إضافية: '+description,qty:1,unitPrice:amount,total:amount,trackStock:false};
    setLines(current=>[...current,line]);
    setFeeDescription('');setFeeAmount('');
  };
  const save=()=>{
    if(!selectedCustomer){showAlert('اختار الزبون','خاصك تحدد الزبون قبل الحفظ.');return;}
    if(!lines.some(line=>line.lineType!=='section')){showAlert('العرض فارغ','زيد منتجاً أو رسماً إضافياً قبل حفظ العرض.');return;}
    if(!calculation){showAlert('راجع العرض','زيد منتج واحد على الأقل وتأكد من التخفيض.');return;}
    if(validUntil&&!/^\d{4}-\d{2}-\d{2}$/.test(validUntil)){showAlert('تاريخ غير صالح','استعمل صيغة YYYY-MM-DD لتاريخ انتهاء العرض.');return;}
    if(validUntil&&validUntil<new Date().toISOString().slice(0,10)){showAlert('تاريخ غير صالح','تاريخ انتهاء العرض خاصو يكون اليوم أو تاريخ فالمستقبل.');return;}
    const now=Date.now();
    const record:QuoteRecord={
      id:now,number:nextDocumentNumber(quotePrefix,quotes),productName:lines.map(x=>x.productName).join(', '),
      customerName:selectedCustomer.name,qty:lines.reduce((n,x)=>n+x.qty,0),
      unitPrice:0,total:calculation.totalCentimes/100,
      date:new Date().toLocaleDateString('fr-MA'),status:'معلق',
      notes:notes.trim(),documentDiscount:calculation.discountCentimes/100,validUntil:validUntil||undefined,priceGroupDiscountPercent:selectedPriceGroup?.discountPercent,
      lines:lines.map((line,index)=>({...line,total:calculation.lines[index].lineTotalCentimes/100})),
    };
    onSave(record);
    setLines([]);setDiscount('0');setNotes('');setValidUntil('');
    showAlert('تم حفظ عرض السعر','تقدر دابا تصدره PDF.');
  };
  const quoteLines=(quote:QuoteRecord)=>quote.lines?.length
    ? quote.lines.map(line=>line.lineType==='section'?`── ${line.productName} ──`:`${line.productName}${line.variantLabel?' • '+line.variantLabel:''} × ${line.qty} — ${line.total.toFixed(2)} DH`)
    : [`${quote.productName} × ${quote.qty} — ${quote.total.toFixed(2)} DH`];

  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom:20}}>
    <View style={panel}>
      <Text style={{color:gold,fontSize:19,fontWeight:'800',marginBottom:12}}>إنشاء عرض سعر متعدد المنتجات</Text>
      <Text style={{color:'#CCC',marginBottom:7}}>الزبون</Text>
      <TextInput value={customerSearch} onChangeText={setCustomerSearch} placeholder="بحث عن الزبون بالاسم" placeholderTextColor="#888" style={input}/>
      {filteredCustomers.map(c=><Pressable key={c.id} accessibilityState={{selected:customerId===String(c.id)}} onPress={()=>{setCustomerId(String(c.id));const group=priceGroups.find(item=>item.id===c.priceGroupId&&item.active);if(selectedProduct){const base=selectedVariant?.salePriceCentimes===undefined?(selectedProduct.quotePrice??selectedProduct.price):selectedVariant.salePriceCentimes/100;setCustomPrice(priceForContactGroup(base,group).toFixed(2));}}} style={[choice,customerId===String(c.id)&&active]}><Text style={{color:'#FFF',fontWeight:'700'}}>{c.name}{c.priceGroupId?' • '+(priceGroups.find(group=>group.id===c.priceGroupId)?.name||'مجموعة'):''}</Text></Pressable>)}
      {customers.length===0&&<Text style={{color:'#999',padding:8}}>زيد زبون أولاً من قسم الزبناء.</Text>}
      <Text style={{color:'#CCC',marginVertical:8}}>المنتج</Text>
      <TextInput value={productSearch} onChangeText={setProductSearch} placeholder="بحث عن المنتج بالاسم أو المرجع أو الباركود" placeholderTextColor="#888" style={input}/>
      {filteredProducts.map(p=><Pressable key={p.id} accessibilityState={{selected:productId===String(p.id)}} onPress={()=>{setProductId(String(p.id));setVariantId('');setCustomPrice(priceForContactGroup(p.quotePrice??p.price,selectedPriceGroup).toFixed(2));}} style={[choice,productId===String(p.id)&&active]}><Text style={{color:'#FFF'}}>{p.name} — {p.price.toFixed(2)} DH</Text>{p.reference||p.barcode?<Text style={{color:'#AAA',fontSize:12,marginTop:3}}>{[p.reference?'مرجع: '+p.reference:'',p.barcode?'باركود: '+p.barcode:''].filter(Boolean).join(' • ')}</Text>:null}</Pressable>)}
      {products.length===0&&<Text style={{color:'#999',padding:8}}>زيد المنتجات أولاً.</Text>}
      {selectedVariants.length>0&&<><Text style={{color:'#CCC',marginVertical:7}}>اختار النسخة (المقاس / اللون)</Text>{selectedVariants.map(v=><Pressable key={v.id} accessibilityState={{selected:variantId===v.id}} onPress={()=>{setVariantId(v.id);setCustomPrice(priceForContactGroup(v.salePriceCentimes===undefined?(selectedProduct?.quotePrice??selectedProduct?.price??0):v.salePriceCentimes/100,selectedPriceGroup).toFixed(2));}} style={[choice,variantId===v.id&&active]}><Text style={{color:'#FFF'}}>{Object.values(v.attributes).join(' / ')} • المخزون: {v.stockQty} • {v.salePriceCentimes===undefined?(selectedProduct?.price??0).toFixed(2):(v.salePriceCentimes/100).toFixed(2)} DH</Text></Pressable>)}</>}
      {selectedProduct&&hasVariants&&selectedVariants.length===0?<Text style={{color:'#E28A78',padding:8}}>ما كايناش نسخ نشطة لهذا المنتج.</Text>:null}
      {selectedProduct&&selectedCustomer&&selectedPriceGroup?<Text style={{color:gold,marginBottom:7}}>مجموعة {selectedPriceGroup.name}: تخفيض {selectedPriceGroup.discountPercent}% يطبق تلقائياً</Text>:null}{selectedProduct&&<TextInput value={customPrice} onChangeText={setCustomPrice} keyboardType="decimal-pad" placeholder="ثمن البيع لهذا العرض (DH)" placeholderTextColor="#888" style={input}/>}
      <View style={{flexDirection:'row',gap:8}}>
        <TextInput value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="الكمية" placeholderTextColor="#888" style={[input,{flex:1}]}/>
        <Pressable onPress={addLine} style={[button,{flex:1,marginTop:0}]}><Text style={{color:'#151515',fontWeight:'900'}}>+ إضافة للسطر</Text></Pressable>
      </View>
      <View style={{borderTopWidth:1,borderColor:'#444',paddingTop:12,marginTop:8}}>
        <Text style={{color:'#CCC',fontWeight:'800',marginBottom:7}}>إضافة رسوم أو خدمة خارج كتالوج المنتجات</Text>
        <TextInput value={feeDescription} onChangeText={setFeeDescription} placeholder="وصف الرسوم أو الخدمة" placeholderTextColor="#888" style={input}/>
        <View style={{flexDirection:'row',gap:8}}>
          <TextInput value={feeAmount} onChangeText={setFeeAmount} keyboardType="decimal-pad" placeholder="المبلغ DH" placeholderTextColor="#888" style={[input,{flex:1}]}/>
          <Pressable onPress={addAdditionalFee} style={[button,{flex:1,marginTop:0}]}><Text style={{color:'#151515',fontWeight:'900'}}>+ إضافة رسوم</Text></Pressable>
        </View>
      </View>
      <View style={{borderTopWidth:1,borderColor:'#444',paddingTop:12,marginTop:8}}>
        <Text style={{color:'#CCC',fontWeight:'800',marginBottom:7}}>إضافة عنوان قسم داخل العرض</Text>
        <View style={{flexDirection:'row',gap:8}}>
          <TextInput value={sectionTitle} onChangeText={setSectionTitle} placeholder="عنوان القسم" placeholderTextColor="#888" style={[input,{flex:1}]}/>
          <Pressable onPress={addSection} style={[button,{flex:1,marginTop:0}]}><Text style={{color:'#151515',fontWeight:'900'}}>+ إضافة قسم</Text></Pressable>
        </View>
      </View>
      <Text style={{color:gold,fontWeight:'800',marginVertical:8}}>المنتجات المضافة ({lines.length})</Text>
      {lines.map((line,index)=><View key={index} style={{flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:1,borderColor:'#333',paddingVertical:9}}>
        <View style={{flex:1}}>
          {line.lineType==='section'?<Text style={{color:gold,fontWeight:'900',fontSize:16,paddingVertical:8}}>▰ {line.productName}</Text>:<>
            <Text style={{color:'#FFF',fontWeight:'700'}}>{line.productName}{line.variantLabel?' • '+line.variantLabel:''}</Text>
            <View style={{flexDirection:'row',gap:6,marginTop:6}}>
              <TextInput value={String(line.qty)} onChangeText={v=>updateLine(index,{qty:v.trim()===''?0:Number(v.replace(',','.'))})} keyboardType="decimal-pad" placeholder="الكمية" placeholderTextColor="#888" style={[input,{flex:1,marginBottom:0,padding:7}]}/>
              <TextInput value={String(line.unitPrice)} onChangeText={v=>updateLine(index,{unitPrice:v.trim()===''?0:Number(v.replace(',','.'))})} keyboardType="decimal-pad" placeholder="الثمن" placeholderTextColor="#888" style={[input,{flex:1,marginBottom:0,padding:7}]}/>
            </View>
          </>}
        </View>
        {line.lineType==='section'?null:<Text style={{color:gold,fontWeight:'800'}}>{Number.isFinite(line.total)?line.total.toFixed(2):'—'} DH</Text>}
        <Pressable accessibilityLabel={language==='AR'?'حذف '+line.productName:'Supprimer '+line.productName} accessibilityHint={language==='AR'?'إزالة هذا المنتج من عرض السعر':'Retirer ce produit du devis'} onPress={()=>setLines(v=>v.filter((_,i)=>i!==index))}><Text style={{color:'#E28A78'}}>حذف</Text></Pressable>
      </View>)}
      <TextInput value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholder="تخفيض إجمالي (DH)" placeholderTextColor="#888" style={[input,{marginTop:12}]}/>
      <TextInput value={validUntil} onChangeText={setValidUntil} placeholder="تاريخ انتهاء العرض YYYY-MM-DD (اختياري)" placeholderTextColor="#888" style={input}/>
      <TextInput value={notes} onChangeText={setNotes} placeholder="ملاحظات (اختياري)" placeholderTextColor="#888" style={input}/>
      <View style={{backgroundColor:'#111',borderRadius:9,padding:12,marginVertical:8}}>
        <Text style={{color:'#DDD'}}>المجموع قبل التخفيض: {calculation?money(calculation.subtotalCentimes):'0.00 DH'}</Text>
        <Text style={{color:'#DDD',marginTop:5}}>التخفيض: {calculation?money(calculation.discountCentimes):'0.00 DH'}</Text>
        <Text style={{color:gold,fontSize:20,fontWeight:'900',marginTop:7}}>المجموع النهائي: {calculation?money(calculation.totalCentimes):'0.00 DH'}</Text>
      </View>
      <Pressable onPress={save} style={button}><Text style={{color:'#151515',fontWeight:'900'}}>حفظ عرض السعر</Text></Pressable>
    </View>
    <Text style={{color:'#FFF',fontWeight:'800',fontSize:17,marginTop:18,marginBottom:10}}>عروض الأسعار السابقة ({quotes.length})</Text>
    {quotes.map(q=><View key={q.id} style={[panel,{marginBottom:8}]}>
      <Text style={{color:'#FFF',fontWeight:'800'}}>{q.number||('DEV-'+q.id)} • {q.customerName}</Text>
      <Text style={{color:'#AAA',fontSize:12,marginTop:4}}>{q.date} • {q.validUntil&&q.validUntil<new Date().toISOString().slice(0,10)&&q.status==='معلق'?'منتهي':q.status}{q.validUntil?' • صالح حتى '+q.validUntil:''}</Text>
      {quoteLines(q).map((line,i)=><Text key={i} style={{color:'#DDD',marginTop:5}}>{line}</Text>)}
      <Text style={{color:gold,fontWeight:'900',fontSize:16,marginTop:8}}>{q.total.toFixed(2)} DH</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8}}>
        <Pressable onPress={()=>onPdf('Devis '+(q.number||('DEV-'+q.id)),q.customerName,[...quoteLines(q),...(q.notes?[q.notes]:[])],q.total)} style={{padding:9,borderWidth:1,borderColor:gold,borderRadius:8}}><Text style={{color:gold,fontWeight:'800'}}>PDF</Text></Pressable>
        <Pressable onPress={()=>{if(q.status==='مرفوض'||(q.status!=='مقبول'&&q.validUntil&&q.validUntil<new Date().toISOString().slice(0,10))){showAlert('العرض غير صالح','ما يمكنش تحويل عرض مرفوض أو منتهي.');return;}onConvert(q,'delivery');}} style={{padding:9,borderWidth:1,borderColor:gold,borderRadius:8}}><Text style={{color:gold,fontWeight:'800'}}>سند خروج</Text></Pressable>
        <Pressable onPress={()=>{if(q.status==='مرفوض'||(q.status!=='مقبول'&&q.validUntil&&q.validUntil<new Date().toISOString().slice(0,10))){showAlert('العرض غير صالح','ما يمكنش تحويل عرض مرفوض أو منتهي.');return;}onConvert(q,'invoice');}} style={{padding:9,borderWidth:1,borderColor:gold,borderRadius:8}}><Text style={{color:gold,fontWeight:'800'}}>فاتورة</Text></Pressable><Pressable onPress={()=>{if(q.status==='مرفوض'||(q.status!=='مقبول'&&q.validUntil&&q.validUntil<new Date().toISOString().slice(0,10))){showAlert('العرض غير صالح','ما يمكنش تحويل عرض مرفوض أو منتهي.');return;}onConvert(q,'proforma');}} style={{padding:9,borderWidth:1,borderColor:gold,borderRadius:8}}><Text style={{color:gold,fontWeight:'800'}}>Proforma</Text></Pressable>
        {q.status!=='مقبول'?<Pressable onPress={()=>onUpdate({...q,status:'مقبول'})} style={{padding:9,borderWidth:1,borderColor:'#4D9D82',borderRadius:8}}><Text style={{color:'#4D9D82',fontWeight:'800'}}>قبول العرض</Text></Pressable>:null}
        {q.status!=='مرفوض'?<Pressable onPress={()=>onUpdate({...q,status:'مرفوض'})} style={{padding:9,borderWidth:1,borderColor:'#B76C5A',borderRadius:8}}><Text style={{color:'#B76C5A',fontWeight:'800'}}>رفض العرض</Text></Pressable>:null}
        <Pressable onPress={()=>showAlert('حذف عرض السعر؟',q.number||q.customerName,[{text:'إلغاء',style:'cancel'},{text:'حذف',style:'destructive',onPress:()=>onDelete(q.id)}])} style={{padding:9,borderWidth:1,borderColor:'#B76C5A',borderRadius:8}}><Text style={{color:'#B76C5A',fontWeight:'800'}}>حذف</Text></Pressable>
      </View>
    </View>)}
    {quotes.length===0&&<Text style={{color:'#999',textAlign:'center',padding:12}}>مازال ما كاين حتى عرض سعر.</Text>}
  </ScrollView>;
}
