const test = require('node:test');
const assert = require('node:assert/strict');
const {buildPdfHtml}=require('../.test-build/pdf-template.js');
const profile={name:'شركة حمزة',phone:'0600000000',email:'hamza@example.test',address:'الدار البيضاء',ice:'ICE-1',rc:'RC-2',taxId:'IF-3',bank:'CIH',rib:'123456',logoData:'data:image/png;base64,abc'};

test('Arabic PDF template localizes the title and includes the company details safely',()=>{
  const html=buildPdfHtml({language:'AR',profile,title:'Facture',customerName:'<زبون & واحد>',lines:['Ventes: 40 DH'],total:40,date:'08/11/2026'});
  assert.match(html,/<html lang="ar" dir="rtl">/);
  assert.match(html,/<h2 class="doc-title">فاتورة<\/h2>/);
  assert.match(html,/شركة حمزة/);
  assert.match(html,/البنك/);
  assert.match(html,/RIB/);
  assert.match(html,/المبيعات: 40 DH/);
  assert.match(html,/&lt;زبون &amp; واحد&gt;/);
  assert.doesNotMatch(html,/<زبون/);
});

test('French PDF template keeps French title and labels',()=>{
  const html=buildPdfHtml({language:'FR',profile,title:'Facture fournisseur',customerName:'Client',lines:['Montant: 20 DH'],total:20,date:'08/11/2026'});
  assert.match(html,/<html lang="fr" dir="ltr">/);
  assert.match(html,/<h2 class="doc-title">Facture fournisseur<\/h2>/);
  assert.match(html,/Banque/);
  assert.match(html,/Montant: 20 DH/);
  assert.match(html,/Total: 20\.00 DH/);
});

test('PDF template rejects invalid totals and safely omits empty company fields',()=>{
  const html=buildPdfHtml({language:'AR',profile:{...profile,name:'',phone:'',email:'',address:'',ice:'',rc:'',taxId:'',bank:'',rib:'',logoData:''},title:'Custom title',customerName:'',lines:[],total:0,date:'08/11/2026'});
  assert.doesNotMatch(html,/الهاتف|البريد الإلكتروني|RIB|<img/);
  assert.match(html,/HamZa/);
  assert.throws(()=>buildPdfHtml({language:'FR',profile,title:'Facture',customerName:'',lines:[],total:-1,date:''}),/non-negative/);
});
