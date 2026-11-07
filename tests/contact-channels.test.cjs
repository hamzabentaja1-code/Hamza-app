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

test('customer and supplier cards expose real phone and WhatsApp actions',()=>{
 const fs=require('node:fs');const path=require('node:path');const app=fs.readFileSync(path.join(__dirname,'..','App.tsx'),'utf8');
 assert.match(app,/Linking\.openURL\(contactChannelUrl\(raw,channel\)\)/);
 assert.match(app,/openContactChannel\(c\.phone\|\|'','whatsapp'\)/);
 assert.match(app,/openContactChannel\(x\.phone\|\|'','call'\)/);
 assert.match(app,/openContactChannel\(value:string,channel:'whatsapp'\|'call'\|'email'\)/);
});
