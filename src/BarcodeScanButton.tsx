import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, AppState, Linking, Modal, Pressable, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {BarcodeScanningResult, BarcodeType, CameraView, useCameraPermissions} from 'expo-camera';

type Props = {language: 'AR' | 'FR'; onCode: (value: string) => void};
const barcodeTypes: BarcodeType[] = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'codabar', 'datamatrix', 'pdf417', 'aztec', 'qr'];

export default function BarcodeScanButton({language, onCode}: Props) {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [visible, setVisible] = useState(false);
  const [opening, setOpening] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [torch, setTorch] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [ready, setReady] = useState(false);
  const consumed = useRef(true);
  const foregroundRef = useRef(AppState.currentState === 'active');
  const generationRef = useRef(0);
  const [generation, setGeneration] = useState(0);
  const openingRef = useRef(false);
  const mounted = useRef(true);
  const ar = language === 'AR';
  const title = ar ? 'قراءة الباركود بالكاميرا' : 'Scanner un code-barres';
  const errorMessage = ar ? 'تعذر تشغيل الكاميرا. تقدر تدخل الباركود بالكتابة.' : 'Caméra indisponible. Vous pouvez saisir le code manuellement.';

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; consumed.current = true; };
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      foregroundRef.current = state === 'active';
      setForeground(foregroundRef.current);
      if (!foregroundRef.current) {
        consumed.current = true;
        generationRef.current++;
      } else if (visible) {
        getPermission().then(result => {
          if (mounted.current && foregroundRef.current && result.granted) {
            consumed.current = false;
            setGeneration(++generationRef.current);
            setReady(false);
          }
        }).catch(() => { if (mounted.current) setCameraError(true); });
      }
    });
    return () => subscription.remove();
  }, [visible, getPermission]);

  const close = () => {
    consumed.current = true;
    generationRef.current++;
    setVisible(false);
    setTorch(false);
    setReady(false);
  };
  const open = async () => {
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(true);
    try {
      if (!await CameraView.isAvailableAsync()) {
        if (mounted.current) Alert.alert(title, errorMessage);
        return;
      }
      if (!permission?.granted) await requestPermission();
      if (!mounted.current) return;
      consumed.current = false;
      setGeneration(++generationRef.current);
      setCameraError(false);
      setReady(false);
      setTorch(false);
      setVisible(true);
    } catch {
      if (mounted.current) Alert.alert(title, errorMessage);
    } finally {
      openingRef.current = false;
      if (mounted.current) setOpening(false);
    }
  };
  const scan = ({data}: BarcodeScanningResult) => {
    if (consumed.current || !visible || !foregroundRef.current || generation !== generationRef.current || !permission?.granted || !data.trim()) return;
    const value = data.trim();
    close();
    onCode(value);
  };
  const allowCamera = async () => {
    try {
      if (permission?.canAskAgain === false) await Linking.openSettings();
      else {
        const result = await requestPermission();
        if (mounted.current && result.granted) {
          consumed.current = false;
          setGeneration(++generationRef.current);
          setCameraError(false);
          setReady(false);
        }
      }
    } catch { Alert.alert(title, errorMessage); }
  };

  return <>
    <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{busy: opening}} style={styles.trigger}>
      <Text style={styles.gold}>{opening ? '…' : '▥'} {ar ? 'باركود' : 'Code'}</Text>
    </Pressable>
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      {visible && <SafeAreaView style={[styles.page, {direction: ar ? 'rtl' : 'ltr'}]}>
        <View style={styles.toolbar}><Text style={styles.title}>{title}</Text><Pressable onPress={close} accessibilityRole="button" style={styles.control}><Text style={styles.gold}>{ar ? 'إغلاق' : 'Fermer'}</Text></Pressable></View>
        {!permission?.granted ? <View style={styles.message}>
          <Text style={styles.text}>{ar ? 'خاص السماح بالكاميرا لقراءة الباركود. تقدر ترجع وتكتبو يدوياً.' : 'Autorisez la caméra pour scanner, ou revenez à la saisie manuelle.'}</Text>
          <Pressable onPress={allowCamera} accessibilityRole="button" style={styles.control}><Text style={styles.gold}>{permission?.canAskAgain === false ? (ar ? 'فتح الإعدادات' : 'Ouvrir les paramètres') : (ar ? 'السماح بالكاميرا' : 'Autoriser la caméra')}</Text></Pressable>
        </View> : cameraError ? <View style={styles.message}>
          <Text style={styles.text}>{errorMessage}</Text><Pressable onPress={open} accessibilityRole="button" style={styles.control}><Text style={styles.gold}>{ar ? 'إعادة المحاولة' : 'Réessayer'}</Text></Pressable>
        </View> : foreground ? <View style={styles.preview}>
          <CameraView key={generation} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} barcodeScannerSettings={{barcodeTypes}} onBarcodeScanned={scan} onCameraReady={() => setReady(true)} onMountError={() => {consumed.current = true; generationRef.current++; setCameraError(true); setTorch(false);}} />
          <View pointerEvents="none" style={styles.guide}><View style={styles.frame}/>{!ready && <ActivityIndicator color="#D6AE55"/>}<Text style={styles.instruction}>{ar ? 'وجّه الكاميرا للباركود. القراءة كتتسجل مرة واحدة.' : 'Cadrez le code. Une seule lecture sera retenue.'}</Text></View>
          <Pressable onPress={() => setTorch(value => !value)} accessibilityRole="button" accessibilityState={{selected: torch}} style={[styles.control, styles.torch]}><Text style={styles.gold}>{ar ? (torch ? 'إطفاء الضوء' : 'تشغيل الضوء') : (torch ? 'Éteindre la lampe' : 'Allumer la lampe')}</Text></Pressable>
        </View> : <View style={styles.message}><ActivityIndicator color="#D6AE55"/></View>}
      </SafeAreaView>}
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  trigger: {minWidth: 70, minHeight: 48, paddingHorizontal: 8, borderWidth: 1, borderColor: '#D6AE55', borderRadius: 9, backgroundColor: '#211D14', alignItems: 'center', justifyContent: 'center'},
  gold: {color: '#D6AE55', fontSize: 14, fontWeight: '800'},
  page: {flex: 1, backgroundColor: '#111'},
  toolbar: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16},
  title: {flex: 1, color: '#FFF', fontSize: 18, fontWeight: '800'},
  control: {minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#D6AE55', borderRadius: 9, backgroundColor: '#211D14', alignItems: 'center', justifyContent: 'center'},
  message: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20},
  text: {color: '#FFF', fontSize: 17, textAlign: 'center', lineHeight: 26},
  preview: {flex: 1},
  guide: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22, padding: 28},
  frame: {width: '100%', height: 180, borderWidth: 3, borderColor: '#D6AE55', borderRadius: 16},
  instruction: {color: '#FFF', fontSize: 16, textAlign: 'center', backgroundColor: '#111C', padding: 12, borderRadius: 8},
  torch: {position: 'absolute', bottom: 32, alignSelf: 'center'},
});
