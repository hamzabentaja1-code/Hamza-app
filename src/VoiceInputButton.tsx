import React, {useRef, useState} from 'react';
import {Alert, Pressable, Text} from 'react-native';
import {ExpoSpeechRecognitionModule, useSpeechRecognitionEvent} from 'expo-speech-recognition';

type Props = {language:'AR'|'FR'; onText:(value:string)=>void};

export default function VoiceInputButton({language,onText}:Props){
  const [listening,setListening]=useState(false);
  const active=useRef(false);
  const ar=language==='AR';
  useSpeechRecognitionEvent('result',event=>{
    if(!active.current)return;
    const transcript=event.results?.[0]?.transcript?.trim();
    if(transcript)onText(transcript);
  });
  useSpeechRecognitionEvent('end',()=>{
    active.current=false;
    setListening(false);
  });
  useSpeechRecognitionEvent('error',event=>{
    if(!active.current)return;
    active.current=false;
    setListening(false);
    Alert.alert(ar?'تعذر التعرف على الصوت':'Reconnaissance vocale impossible',event.message|| (ar?'تأكد من صلاحية الميكروفون وخدمة التعرف على الصوت.':'Vérifiez l’accès au micro et le service de reconnaissance vocale.'));
  });
  const toggle=async()=>{
    if(active.current){ExpoSpeechRecognitionModule.stop();return;}
    if(!ExpoSpeechRecognitionModule.isRecognitionAvailable()){
      Alert.alert(ar?'التعرف على الصوت غير متوفر':'Reconnaissance vocale indisponible',ar?'فعّل خدمة التعرف على الصوت في الهاتف ثم حاول مرة أخرى.':'Activez le service de reconnaissance vocale du téléphone puis réessayez.');
      return;
    }
    try{
      const permission=await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if(!permission.granted){
        Alert.alert(ar?'خاص إذن الميكروفون':'Autorisation du micro requise',ar?'سمح لـ HamZa باستعمال الميكروفون باش تدخل النص بالصوت.':'Autorisez HamZa à utiliser le micro pour saisir le texte à la voix.');
        return;
      }
      active.current=true;
      setListening(true);
      ExpoSpeechRecognitionModule.start({lang:ar?'ar-MA':'fr-MA',interimResults:false,continuous:false});
    }catch(error){
      active.current=false;
      setListening(false);
      Alert.alert(ar?'تعذر تشغيل الميكروفون':'Impossible de démarrer le micro',error instanceof Error?error.message:'');
    }
  };
  return <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={ar?(listening?'إيقاف الإدخال الصوتي':'إدخال بالصوت'):(listening?'Arrêter la saisie vocale':'Saisie vocale')} style={{minWidth:62,minHeight:48,paddingHorizontal:8,borderRadius:9,borderWidth:1,borderColor:listening?'#E28A78':'#D6AE55',backgroundColor:'#211D14',alignItems:'center',justifyContent:'center'}}>
    <Text style={{color:listening?'#E28A78':'#D6AE55',fontWeight:'900',fontSize:13}}>{listening?'■':'🎙'} {ar?'صوت':'Voix'}</Text>
  </Pressable>;
}
