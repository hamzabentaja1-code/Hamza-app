const test=require('node:test');
const assert=require('node:assert/strict');
const {buildWhatsAppChatUrl}=require('../.test-build/whatsapp.js');

test('normalizes Moroccan local and international WhatsApp numbers',()=>{
  assert.equal(buildWhatsAppChatUrl('06 12-34-56-78'),'https://wa.me/212612345678');
  assert.equal(buildWhatsAppChatUrl('+212 612 345 678'),'https://wa.me/212612345678');
  assert.equal(buildWhatsAppChatUrl('0044 20 1234 5678'),'https://wa.me/442012345678');
});

test('rejects empty or implausibly short and long WhatsApp numbers',()=>{
  assert.equal(buildWhatsAppChatUrl(undefined),null);
  assert.equal(buildWhatsAppChatUrl(''),null);
  assert.equal(buildWhatsAppChatUrl('12345'),null);
  assert.equal(buildWhatsAppChatUrl('1234567890123456'),null);
});
