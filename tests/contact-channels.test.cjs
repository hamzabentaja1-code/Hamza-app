const test=require('node:test');
const assert=require('node:assert/strict');
const {contactChannelUrl}=require('../.test-build/contact-channels.js');
test('Moroccan phone numbers normalize to international WhatsApp and call URLs',()=>{
 assert.equal(contactChannelUrl('0612345678','whatsapp'),'https://wa.me/212612345678');
 assert.equal(contactChannelUrl('+212 6 12 34 56 78','call'),'tel:+212612345678');
 assert.equal(contactChannelUrl('00212612345678','whatsapp'),'https://wa.me/212612345678');
});
test('email contact URLs validate and produce mailto links',()=>{
 assert.equal(contactChannelUrl('  hamza@example.com ','email'),'mailto:hamza@example.com');
 assert.throws(()=>contactChannelUrl('bad-email','email'),/البريد الإلكتروني غير صالح/);
});
test('contact channel URL generation rejects short or oversized phone numbers',()=>{
 assert.throws(()=>contactChannelUrl('123','whatsapp'),/رقم الهاتف غير صالح/);
 assert.throws(()=>contactChannelUrl('1'.repeat(16),'call'),/رقم الهاتف غير صالح/);
});

test('customer and supplier cards expose phone, WhatsApp and email actions',()=>{
 const fs=require('node:fs');const path=require('node:path');const app=fs.readFileSync(path.join(__dirname,'..','App.tsx'),'utf8');
 assert.match(app,/Linking\.openURL\(contactChannelUrl\(value,channel\)\)/);
 assert.match(app,/openContactChannel=async\(value:string,channel:ContactChannel\)/);
 assert.match(app,/openContactChannel\(c\.phone\|\|'','whatsapp'\)/);
 assert.match(app,/openContactChannel\(x\.phone\|\|'','call'\)/);
 assert.match(app,/c\.phone\?\.trim\(\)\|\|c\.email\?\.trim\(\)/);
 assert.match(app,/x\.phone\?\.trim\(\)\|\|x\.email\?\.trim\(\)/);
 assert.match(app,/openContactChannel\(c\.email\|\|'','email'\)/);
 assert.match(app,/openContactChannel\(x\.email\|\|'','email'\)/);
});
test('customer and supplier extended identifiers and email fields persist through create and edit flows',()=>{
 const fs=require('node:fs');const path=require('node:path');const app=fs.readFileSync(path.join(__dirname,'..','App.tsx'),'utf8');
 assert.match(app,/type Customer = \{[^}]*email\?:string;[^}]*rc\?:string;[^}]*taxId\?:string/);
 assert.match(app,/type Supplier = \{[^}]*email\?:string;[^}]*rc\?:string;[^}]*taxId\?:string/);
 assert.match(app,/email:customerEmail\.trim\(\),address:customerAddress\.trim\(\),ice:customerIce\.trim\(\),rc:customerRc\.trim\(\),taxId:customerTaxId\.trim\(\)/);
 assert.match(app,/email:supplierEmail\.trim\(\),address:supplierAddress\.trim\(\),ice:supplierIce\.trim\(\),rc:supplierRc\.trim\(\),taxId:supplierTaxId\.trim\(\)/);
 assert.match(app,/email:contactDraftEmail\.trim\(\),address:contactDraftAddress\.trim\(\),ice:contactDraftIce\.trim\(\),rc:contactDraftRc\.trim\(\),taxId:contactDraftTaxId\.trim\(\)/);
 assert.match(app,/isValidContactEmail\(customerEmail\)/);
 assert.match(app,/isValidContactEmail\(supplierEmail\)/);
 assert.match(app,/isValidContactEmail\(contactDraftEmail\)/);
 assert.match(app,/createBackup\(\{[\\s\\S]*?customers[\\s\\S]*?suppliers/);
});
