const test=require('node:test');const assert=require('node:assert/strict');
const {buildCommercialPdfHtml,localizeCommercialPdfTitle}=require('../.test-build/commercial-pdf.js');
const profile={name:'HamZa',address:'Casablanca',showTaxFields:false,taxRate:20};
test('commercial PDF renders Arabic right-to-left labels and TTC total by default',()=>{
 const html=buildCommercialPdfHtml({language:'AR',title:'فاتورة',customerName:'زبون',lines:['منتج × 2'],total:240,companyProfile:profile,dateLabel:'07/11/2026'});
 assert.match(html,/<html lang="ar" dir="rtl"(?: data-hamza-template="[^"]+")?>/);assert.match(html,/الزبون: زبون/);assert.match(html,/TTC: 240\.00 DH/);assert.doesNotMatch(html,/TVA \(/);
});
test('commercial PDF renders French left-to-right and optional HT/TVA breakdown',()=>{
 const html=buildCommercialPdfHtml({language:'FR',title:'Facture',customerName:'Client',lines:['Produit'],total:120,companyProfile:{...profile,showTaxFields:true,taxRate:20},dateLabel:'07/11/2026'});
 assert.match(html,/<html lang="fr" dir="ltr"(?: data-hamza-template="[^"]+")?>/);assert.match(html,/Client: Client/);assert.match(html,/HT: 100\.00 DH/);assert.match(html,/TVA \(20%\): 20\.00 DH/);assert.match(html,/TTC: 120\.00 DH/);
});
test('commercial PDF escapes user content and accepts only local or data image logos',()=>{
 const html=buildCommercialPdfHtml({language:'FR',title:'<script>alert(1)</script>',customerName:'A&B',lines:['<b>unsafe</b>'],total:10,companyProfile:{...profile,logoData:'javascript:alert(1)'},dateLabel:'today'});
 assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);assert.match(html,/A&amp;B/);assert.match(html,/&lt;b&gt;unsafe&lt;\/b&gt;/);assert.doesNotMatch(html,/javascript:/);
});
test('summary PDF can omit total block',()=>{
 const html=buildCommercialPdfHtml({language:'FR',title:'Rapport',customerName:'',lines:['Ventes'],total:99,showTotal:false,companyProfile:profile,dateLabel:'today'});
 assert.doesNotMatch(html,/TTC:/);
});

test('commercial PDF titles use Arabic document names and preserve generated numbering',()=>{
 assert.equal(localizeCommercialPdfTitle('Facture FAC-2026-0003','AR'),'فاتورة FAC-2026-0003');
 assert.equal(localizeCommercialPdfTitle('Bon de commande BC-2026-0004','AR'),'أمر شراء BC-2026-0004');
 assert.equal(localizeCommercialPdfTitle('عنوان مخصص','AR'),'عنوان مخصص');
});

test('commercial PDFs select compact layout while preserving TTC-only AR/FR behavior',()=>{
 const fields='Référence=DEV-42\nÀ payer=À réception';
 const html=buildCommercialPdfHtml({language:'FR',title:'Devis',customerName:'Client',lines:['Main d’œuvre'],total:300,companyProfile:{...profile,pdfTemplate:'compact',pdfCustomFields:fields,pdfFooter:'Validité: 30 jours'},dateLabel:'09/11/2026'});
 assert.match(html,/data-hamza-template="compact"/);
 assert.match(html,/padding:14px/);
 assert.match(html,/Référence/);
 assert.match(html,/DEV-42/);
 assert.match(html,/Validité: 30 jours/);
 assert.match(html,/Merci pour votre confiance/);
 assert.match(html,/TTC: 300\.00 DH/);
 assert.doesNotMatch(html,/TVA \(/);
 const ar=buildCommercialPdfHtml({language:'AR',title:'عرض سعر',customerName:'زبون',lines:['تركيب'],total:150,companyProfile:{...profile,pdfTemplate:'classic'},dateLabel:'09/11/2026'});
 assert.match(ar,/dir="rtl"/);
 assert.match(ar,/data-hamza-template="classic"/);
 assert.match(ar,/padding:28px/);
});
test('custom PDF fields reject invalid, duplicate and over-limit entries',()=>{
 const {parseCommercialPdfFields}=require('../.test-build/commercial-pdf.js');
 assert.deepEqual(parseCommercialPdfFields(''),[]);
 assert.equal(parseCommercialPdfFields('ICE=123\nRéférence=ABC').length,2);
 assert.throws(()=>parseCommercialPdfFields('missing separator'),/الشكل/);
 assert.throws(()=>parseCommercialPdfFields('ICE=123\nice=456'),/مكرر/);
 assert.throws(()=>parseCommercialPdfFields(Array.from({length:7},(_,i)=>'a'+i+'=b').join('\n')),/ستة/);
 assert.throws(()=>parseCommercialPdfFields('a='+'z'.repeat(161)),/غير صالح/);
 assert.throws(()=>parseCommercialPdfFields('z'.repeat(701)),/طويل/);
});
test('custom PDF fields and footer cannot inject HTML, and invalid totals are rejected',()=>{
 const html=buildCommercialPdfHtml({language:'FR',title:'Facture',customerName:'Test',lines:['Line'],total:15,companyProfile:{...profile,pdfCustomFields:'<img src=x onerror=alert(1)>=<script>alert(1)</script>',pdfFooter:'<svg/onload=alert(1)>'},dateLabel:'today'});
 assert.doesNotMatch(html,/<script>|<svg\/onload/);
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,/&lt;svg\/onload=alert\(1\)&gt;/);
 assert.throws(()=>buildCommercialPdfHtml({language:'FR',title:'F',customerName:'',lines:[],total:NaN,companyProfile:profile,dateLabel:'today'}),/غير صالح/);
});
test('company settings expose template and document fields that feed the real PDF generator',()=>{
 const source=require('node:fs').readFileSync('App.tsx','utf8');
 assert.match(source,/pdfTemplate:field\('pdfTemplate'\)/);
 assert.match(source,/pdfCustomFields:field\('pdfCustomFields'\)/);
 assert.match(source,/value=\{companyProfile\.pdfCustomFields\}/);
 assert.match(source,/accessibilityState=\{\{selected:companyProfile\.pdfTemplate===option\.value\}\}/);
 assert.match(source,/buildCommercialPdfHtml\(\{language,title:pdfTitle,customerName,lines,total,showTotal,companyProfile/);
});

test('commercial PDF uses print-safe A4 spacing, wrapped rows and Arabic-capable font fallbacks',()=>{
 const html=buildCommercialPdfHtml({language:'AR',title:'فاتورة رقم 2026-001',customerName:'شركة الدار البيضاء',lines:['كابل كهربائي طويل جداً '.repeat(12)],total:1234.5,companyProfile:{...profile,name:'شركة حمزة',address:'الدار البيضاء',logoData:'data:image/png;base64,aGVsbG8='},dateLabel:'09/11/2026'});
 assert.ok(html.includes('@page{size:A4;margin:14mm}'));
 assert.ok(html.includes("font-family:'Noto Naskh Arabic','Noto Sans Arabic',Tahoma,Arial,sans-serif"));
 assert.ok(html.includes('class="line-item"'));
 assert.ok(html.includes('overflow-wrap:anywhere'));
 assert.ok(html.includes('break-inside:avoid;page-break-inside:avoid'));
 assert.ok(html.includes('alt="شركة حمزة"'));
 assert.ok(html.includes('TTC: 1234.50 DH'));
});
