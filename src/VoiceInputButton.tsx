import React, {useContext, useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, View} from 'react-native';
import AccessiblePressable from './AccessiblePressable';
import {AppLanguage, LanguageContext, TText as Text, translateText} from './i18n';
import {recognizeSpeech} from './voice-recognition';
const GOLD = '#D6AE55';
type Props = {purpose:'productName'|'search';onTranscript:(text:string)=>void;language?:AppLanguage};
export default function VoiceInputButton({purpose,onTranscript,language:explicitLanguage}:Props) {
 const contextLanguage=useContext(LanguageContext);const language=explicitLanguage||contextLanguage;const [busy,setBusy]=useState(false);
 const prompt=purpose==='productName'?'الإدخال الصوتي':'البحث بالصوت';const label=translateText(prompt,language)||prompt;
 const start=async()=>{if(busy)return;setBusy(true);try{const transcript=await recognizeSpeech(language,label);if(transcript)onTranscript(transcript);}catch{Alert.alert(translateText('تعذر تشغيل التعرف الصوتي',language)||'تعذر تشغيل التعرف الصوتي',translateText('خدمة التعرف الصوتي غير متاحة على هذا الجهاز',language)||'خدمة التعرف الصوتي غير متاحة على هذا الجهاز');}finally{setBusy(false);}};
 return <AccessiblePressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:busy}} disabled={busy} onPress={start} style={styles.button}>{busy?<ActivityIndicator size="small" color={GOLD}/>:<View><Text style={styles.icon}>🎙</Text></View>}</AccessiblePressable>;
}
const styles=StyleSheet.create({button:{width:44,height:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:GOLD,borderRadius:9,backgroundColor:'#302819'},icon:{color:GOLD,fontSize:18}});
