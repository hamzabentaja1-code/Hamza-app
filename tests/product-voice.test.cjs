const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ProductVoiceSession,productVoiceLocale,productVoiceValue}=require('../.test-build/domain/product-voice.js');

test('pending permission and listen callbacks cannot switch draft targets',()=>{
  const voice=new ProductVoiceSession();
  const search=voice.begin('search');
  assert.equal(voice.begin('name'),undefined);
  assert.equal(voice.resultTarget(),undefined);
  assert.equal(voice.start(search),true);
  assert.equal(voice.stop('name'),false);
  assert.equal(voice.resultTarget(),'search');
  assert.equal(voice.stop('search'),true);
  assert.equal(voice.resultTarget(),'search');
  assert.equal(voice.finish(search),true);
  const name=voice.begin('name');
  assert.equal(voice.finish(search),false);
  assert.equal(voice.start(name),true);
  assert.equal(voice.resultTarget(),'name');
});

test('cancelling permission and native recognition prevents stale writes',()=>{
  const voice=new ProductVoiceSession();
  const stale=voice.begin('name');
  assert.equal(voice.cancel('search'),false);
  assert.equal(voice.cancel('name'),false);
  const price=voice.begin('price');
  assert.equal(voice.start(stale),false);
  assert.equal(voice.start(price),true);
  assert.equal(voice.cancel(),true);
  assert.equal(voice.resultTarget(),undefined);
  assert.equal(voice.begin('quantity'),undefined);
  voice.finish(price);
  assert.ok(voice.begin('quantity'));
});

test('offline language preference takes exact or same-language installed models only',()=>{
  assert.equal(productVoiceLocale('AR',['en-US','ar_EG','ar-MA']),'ar-MA');
  assert.equal(productVoiceLocale('AR',['fr-FR','ar_EG']),'ar-EG');
  assert.equal(productVoiceLocale('FR',['ar-MA','fr-FR','fr-CA']),'fr-FR');
  assert.equal(productVoiceLocale('FR',['en-US']),'fr-MA');
});

test('number dictation accepts decimal and Arabic digits but rejects ambiguous speech',()=>{
  assert.equal(productVoiceValue('price',' ۱۲٫۵۰ '),'12.50');
  assert.equal(productVoiceValue('price','٠,٥'),'0.5');
  assert.equal(productVoiceValue('quantity','١٢٣'),'123');
  assert.equal(productVoiceValue('quantity','3,2'),undefined);
  for(const bad of ['2 3','1,234','-2','3e4','صافي 5','six','1.2.3']){
    assert.equal(productVoiceValue('price',bad),undefined);
  }
  assert.equal(productVoiceValue('name','  كاميرا  '),'كاميرا');
  assert.equal(productVoiceValue('search',' '),undefined);
});

test('POS voice produces a bounded search string, without interpreting it as quantity or price',()=>{
  const {productVoiceTargetMatchesScreen}=require('../.test-build/domain/product-voice.js');
  assert.equal(productVoiceValue('pos-search','  caméra 5  '),'caméra 5');
  assert.equal(productVoiceValue('pos-search',' كاميرا  '),'كاميرا');
  assert.equal(productVoiceValue('pos-search',' '.repeat(20)),undefined);
  assert.equal(productVoiceValue('pos-search','a'.repeat(241)).length,240);
  assert.equal(productVoiceTargetMatchesScreen('pos-search','نقطة البيع'),true);
  assert.equal(productVoiceTargetMatchesScreen('pos-search','المنتجات'),false);
  assert.equal(productVoiceTargetMatchesScreen('search','نقطة البيع'),false);
});

test('cancelling POS dictation cannot route its result to the catalogue or a later draft',()=>{
  const voice=new ProductVoiceSession();
  const pending=voice.begin('pos-search');
  assert.equal(voice.cancel('pos-search'),false);
  assert.equal(voice.start(pending),false);
  const live=voice.begin('pos-search');
  assert.equal(voice.start(live),true);
  assert.equal(voice.resultTarget(),'pos-search');
  assert.equal(voice.cancel('pos-search'),true);
  assert.equal(voice.resultTarget(),undefined);
  assert.equal(voice.begin('search'),undefined);
  assert.equal(voice.finish(live),true);
  const catalogue=voice.begin('search');
  assert.equal(voice.start(catalogue),true);
  assert.equal(voice.resultTarget(),'search');
});
