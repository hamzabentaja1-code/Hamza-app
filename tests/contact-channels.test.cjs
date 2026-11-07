const test=require('node:test');
const assert=require('node:assert/strict');
const {contactChannelUrl}=require('../.test-build/contact-channels.js');
test('Moroccan phone numbers normalize to international WhatsApp and call URLs',()=>{
 assert.equal(contactChannelUrl('0612345678','whatsapp'),'https://wa.me/212612345678');
 assert.equal(contactChannelUrl('+212 6 12 34 56 78','call'),'tel:+212612345678');
 assert.equal(contactChannelUrl('00212612345678','whatsapp'),'https://wa.me/212612345678');
});
test('contact channel URL generation rejects short or oversized phone numbers',()=>{
 assert.throws(()=>contactChannelUrl('123','whatsapp'),/رقم الهاتف غير صالح/);
 assert.throws(()=>contactChannelUrl('1'.repeat(16),'call'),/رقم الهاتف غير صالح/);
});
