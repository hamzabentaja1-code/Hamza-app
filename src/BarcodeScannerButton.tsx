import React, {useRef, useState} from 'react';
import {CameraView, useCameraPermissions} from 'expo-camera';
import {Alert, Modal, Pressable, Text, View} from 'react-native';
import {translate} from './i18n';

type Props={language:'AR'|'FR';onScanned:(value:string)=>void;onStart?:()=>void};
const GOLD='#D6AE55';

export default function BarcodeScannerButton({language,onScanned,onStart}:Props){
  const tr=(value:string)=>translate(language,value);
  const [open,setOpen]=useState(false);
  const [permission,requestPermission]=useCameraPermissions();
  const handled=useRef(false);

  const start=async()=>{
    onStart?.();
    const current=permission?.granted?permission:await requestPermission();
    if(!current.granted){
      Alert.alert(tr('صلاحية الكاميرا مطلوبة'),tr('سمح لـ HamZa باستعمال الكاميرا باش يمسح الباركود.'));
      return;
    }
    handled.current=false;
    setOpen(true);
  };

  const scan=(value:string)=>{
    if(handled.current)return;
    const code=value.trim();
    if(!code)return;
    handled.current=true;
    setOpen(false);
    onScanned(code);
  };

  return <>
    <Pressable onPress={start} accessibilityRole="button" accessibilityLabel={tr('مسح الباركود بالكاميرا')} style={{backgroundColor:'#211D14',borderWidth:1,borderColor:GOLD,borderRadius:9,padding:12,alignItems:'center',marginTop:8}}>
      <Text style={{color:GOLD,fontWeight:'800'}}>{tr('مسح الباركود بالكاميرا')}</Text>
    </Pressable>
    <Modal visible={open} animationType="slide" onRequestClose={()=>setOpen(false)}>
      <View style={{flex:1,backgroundColor:'#000'}}>
        <CameraView
          style={{flex:1}}
          facing="back"
          autofocus="on"
          barcodeScannerSettings={{barcodeTypes:['ean13','ean8','upc_a','upc_e','code128','code39','code93','qr']}}
          onBarcodeScanned={({data})=>scan(data)}
        />
        <View pointerEvents="none" style={{position:'absolute',left:'10%',right:'10%',top:'38%',height:120,borderWidth:2,borderColor:GOLD,borderRadius:12}}/>
        <View style={{position:'absolute',top:44,left:16,right:16,alignItems:'center'}}>
          <Text style={{color:'#FFF',fontWeight:'800',fontSize:18,textAlign:'center'}}>{tr('وجه الباركود داخل الإطار')}</Text>
        </View>
        <Pressable onPress={()=>setOpen(false)} accessibilityRole="button" style={{position:'absolute',bottom:36,alignSelf:'center',backgroundColor:GOLD,borderRadius:10,paddingHorizontal:28,paddingVertical:13}}>
          <Text style={{color:'#151515',fontWeight:'900'}}>{tr('إغلاق الكاميرا')}</Text>
        </Pressable>
      </View>
    </Modal>
  </>;
}
