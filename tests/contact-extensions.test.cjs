const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const ext=require('../.test-build/contact-extensions.js');
test('custom contact fields are trimmed, unique and bounded',()=>{
 const fields=ext.addContactCustomField([],'  ICE secondaire ','123','f1');
 assert.deepEqual(fields,[{id:'f1',name:'ICE secondaire',value:'123'}]);
 assert.throws(()=>ext.addContactCustomField(fields,'ice SECONDAIRE','x','f2'),/موجود من قبل/);
 assert.throws(()=>ext.addContactCustomField(fields,'','x','f2'),/اسم الحقل/);
 assert.equal(ext.normalizeContactCustomFields([{id:'x',name:'A',value:'1'},{id:'y',name:'a',value:'2'}]).length,1);
});
test('multiple custom fields parse one name=value pair per line',()=>{
 const fields=ext.parseContactCustomFieldsText('ICE=123\\nSecteur=Installation\\nCode=AB-7','contact');
 assert.deepEqual(fields.map(x=>[x.name,x.value]),[['ICE','123'],['Secteur','Installation'],['Code','AB-7']]);
 assert.throws(()=>ext.parseContactCustomFieldsText('ICE=123\\nSans valeur','c'),/الاسم=القيمة/);
 assert.throws(()=>ext.parseContactCustomFieldsText('ICE=1\\nice=2','c'),/موجود من قبل/);
});
test('contact image attachments accept only bounded base64 images and can be removed',()=>{
 const file={id:'a1',name:'photo.png',mimeType:'image/png',dataUri:'data:image/png;base64,AA==',createdAt:'2026-01-01'};
 const saved=ext.addContactAttachment([],file);
 assert.equal(saved.length,1);
 assert.equal(ext.removeContactAttachment(saved,'a1').length,0);
 assert.equal(ext.normalizeContactAttachments([{...file,dataUri:'file:///secret'}]).length,0);
 assert.equal(ext.normalizeContactAttachments([{...file,mimeType:'application/pdf'}]).length,0);
});
test('price groups validate names and apply centime-safe discounts',()=>{
 const group={id:'retail',name:'Retail',discountPercent:12.5,active:true};
 assert.deepEqual(ext.validateContactPriceGroups([group]),[group]);
 assert.equal(ext.priceForContactGroup(99.99,group),87.49);
 assert.equal(ext.priceForContactGroup(99.99,{...group,active:false}),99.99);
 assert.throws(()=>ext.validateContactPriceGroups([{...group},{...group,id:'other',name:' retail '}]),/غير صالحة/);
 assert.throws(()=>ext.priceForContactGroup(-1),/غير صالح/);
});

test('contact custom fields and saved image gallery are integrated for customers and suppliers',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','App.tsx'),'utf8');
 assert.ok(app.includes('parseContactCustomFieldsText(customerCustomFieldsText'));
 assert.ok(app.includes('parseContactCustomFieldsText(supplierCustomFieldsText'));
 assert.ok(app.includes('x.attachments.map(file'));
 assert.ok(app.includes('c.attachments.map(file'));
 assert.ok(app.includes('removeContactAttachment'));
 assert.ok(app.includes('Image source={{uri:file.dataUri}}'));
});
test('customer price groups persist through the app and flow from contact selection into quotes and invoices',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','App.tsx'),'utf8');
 const quote=fs.readFileSync(path.join(__dirname,'..','src','QuoteWorkspace.tsx'),'utf8');
 const pricing=fs.readFileSync(path.join(__dirname,'..','src','domain','document-pricing.ts'),'utf8');
 assert.match(app,/priceGroups,setPriceGroups/);
 assert.match(app,/priceGroupName,setPriceGroupName/);
 assert.match(app,/priceGroupDiscount,setPriceGroupDiscount/);
 assert.match(app,/priceGroupId:customerPriceGroupId/);
 assert.match(app,/writeAppData\(\{[\s\S]*?priceGroups\}/);
 assert.match(app,/<QuoteWorkspace[^>]*priceGroups=\{priceGroups\}/);
 assert.match(quote,/priceForContactGroup\(basePrice,selectedPriceGroup\)/);
 assert.match(quote,/priceGroupDiscountPercent:selectedPriceGroup\?\.discountPercent/);
 assert.match(pricing,/quote\.priceGroupDiscountPercent/);
});
