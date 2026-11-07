const test=require('node:test');const assert=require('node:assert/strict');
const {buildCommercialPdfHtml}=require('../.test-build/commercial-pdf.js');
const profile={name:'HamZa',address:'Casablanca',showTaxFields:false,taxRate:20};
test('commercial PDF renders Arabic right-to-left labels and TTC total by default',()=>{
 const html=buildCommercialPdfHtml({language:'AR',title:'فاتورة',customerName:'زبون',lines:['منتج × 2'],total:240,companyProfile:profile,dateLabel:'07/11/2026'});
 assert.match(html,/<html lang="ar" dir="rtl">/);assert.match(html,/الزبون: زبون/);assert.match(html,/TTC: 240\.00 DH/);assert.doesNotMatch(html,/TVA \(/);
});
test('commercial PDF renders French left-to-right and optional HT/TVA breakdown',()=>{
 const html=buildCommercialPdfHtml({language:'FR',title:'Facture',customerName:'Client',lines:['Produit'],total:120,companyProfile:{...profile,showTaxFields:true,taxRate:20},dateLabel:'07/11/2026'});
 assert.match(html,/<html lang="fr" dir="ltr">/);assert.match(html,/Client: Client/);assert.match(html,/HT: 100\.00 DH/);assert.match(html,/TVA \(20%\): 20\.00 DH/);assert.match(html,/TTC: 120\.00 DH/);
});
test('commercial PDF escapes user content and accepts only local or data image logos',()=>{
 const html=buildCommercialPdfHtml({language:'FR',title:'<script>alert(1)</script>',customerName:'A&B',lines:['<b>unsafe</b>'],total:10,companyProfile:{...profile,logoData:'javascript:alert(1)'},dateLabel:'today'});
 assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);assert.match(html,/A&amp;B/);assert.match(html,/&lt;b&gt;unsafe&lt;\/b&gt;/);assert.doesNotMatch(html,/javascript:/);
});
test('summary PDF can omit total block',()=>{
 const html=buildCommercialPdfHtml({language:'FR',title:'Rapport',customerName:'',lines:['Ventes'],total:99,showTotal:false,companyProfile:profile,dateLabel:'today'});
 assert.doesNotMatch(html,/TTC:/);
});
