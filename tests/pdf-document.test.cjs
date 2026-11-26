const test = require('node:test');
const assert = require('node:assert/strict');
const {buildPdfDocumentHtml,escapePdfHtml} = require('../.test-build/pdf-document.js');
const {EMPTY_COMPANY_PROFILE} = require('../.test-build/company-profile.js');

const input = (changes={}) => ({
  language:'AR',
  companyProfile:{...EMPTY_COMPANY_PROFILE},
  title:'فاتورة',
  customerName:'زبون',
  date:'15/11/2026',
  lines:['قاطع كهربائي × 2 — 120.00 DH'],
  total:120,
  ...changes,
});

test('Arabic PDF output declares RTL Arabic text and readable line direction', () => {
  const html=buildPdfDocumentHtml(input());
  assert.match(html,/<html lang="ar" dir="rtl">/);
  assert.match(html,/font-family:"Noto Naskh Arabic", "Noto Sans Arabic", Arial, sans-serif/);
  assert.match(html,/<p class="line" dir="auto">قاطع كهربائي/);
  assert.match(html,/الزبون: زبون/);
  assert.match(html,/المجموع: 120\.00 DH/);
});

test('French PDF output declares LTR and uses French labels', () => {
  const html=buildPdfDocumentHtml(input({language:'FR',title:'Facture',customerName:'Client'}));
  assert.match(html,/<html lang="fr" dir="ltr">/);
  assert.match(html,/text-align:left/);
  assert.match(html,/Client: Client/);
  assert.match(html,/Total: 120\.00 DH/);
  assert.match(html,/Merci pour votre confiance/);
});

test('PDF text and company metadata are escaped instead of interpreted as HTML', () => {
  const html=buildPdfDocumentHtml(input({
    title:'<script>alert("x")</script>',
    customerName:'A&B',
    lines:['<img src=x onerror=alert(1)>'],
    companyProfile:{...EMPTY_COMPANY_PROFILE,name:'<HamZa>',phone:'"onclick="bad"'},
  }));
  assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(html.includes('A&amp;B'));
  assert.ok(html.includes('&lt;HamZa&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x'));
});

test('logo is optional and escaped as an attribute when supplied', () => {
  const withoutLogo=buildPdfDocumentHtml(input());
  const withLogo=buildPdfDocumentHtml(input({companyProfile:{...EMPTY_COMPANY_PROFILE,logoData:'data:image/png;base64,AA" onerror="x'}}));
  assert.ok(!withoutLogo.includes('<img'));
  assert.ok(withLogo.includes('src="data:image/png;base64,AA&quot; onerror=&quot;x"'));
});

test('HTML escaping covers ampersands, quotes, apostrophes, and angle brackets', () => {
  assert.equal(escapePdfHtml(`&<>"'`),'&amp;&lt;&gt;&quot;&#39;');
});

test('product catalog PDF can include saved photos and escapes product text', () => {
  const html=buildPdfDocumentHtml(input({
    title:'لائحة المنتجات',
    imageRows:[{text:'قاطع <A> • 2 DH',imageData:'data:image/jpeg;base64,AA=='},{text:'بدون صورة',imageData:'file:///private/photo.jpg'}],
    includeImages:true,
  }));
  assert.match(html,/data:image\/jpeg;base64,AA==/);
  assert.match(html,/قاطع &lt;A&gt; • 2 DH/);
  assert.match(html,/بدون صورة/);
  assert.doesNotMatch(html,/file:\/\/\/private/);
  assert.match(html,/class="image-row has-photo"/);
});

test('catalog PDF without photos omits photo markup', () => {
  const html=buildPdfDocumentHtml(input({
    imageRows:[{text:'Produit',imageData:'data:image/jpeg;base64,AA=='}],
    includeImages:false,
  }));
  assert.doesNotMatch(html,/class="image-row"/);
  assert.doesNotMatch(html,/data:image\/jpeg/);
});
test('shared PDF styles apply a validated accent and append escaped custom fields',()=>{
  const html=buildPdfDocumentHtml(input({companyProfile:{...EMPTY_COMPANY_PROFILE,pdfTemplateStyle:'framed',pdfAccentColor:'#123ABC',pdfCustomFields:'Référence: <ABC>\nGarantie: 1 an'}}));
  assert.match(html,/<body class="framed">/);assert.match(html,/border:2px solid #123ABC/);
  assert.match(html,/Référence: &lt;ABC&gt;/);assert.match(html,/Garantie: 1 an/);assert.doesNotMatch(html,/Référence: <ABC>/);
  const compact=buildPdfDocumentHtml(input({companyProfile:{...EMPTY_COMPANY_PROFILE,pdfTemplateStyle:'compact'}}));
  assert.match(compact,/<body class="compact">/);
});

test('PDF includes optional payment terms and document note as safely escaped footer text',()=>{
  const html=buildPdfDocumentHtml(input({language:'FR',companyProfile:{...EMPTY_COMPANY_PROFILE,paymentTerms:'Paiement sous 15 jours',documentNote:'Garantie < 1 an & accessoires'}}));
  assert.match(html,/Conditions de paiement:<\/strong> Paiement sous 15 jours/);
  assert.match(html,/Garantie &lt; 1 an &amp; accessoires/);
  assert.doesNotMatch(html,/Garantie < 1 an/);
});

test('document photos keep non-photo rows and an empty photo selection keeps the original text',()=>{
  const text='Solde restant : 20 DH';
  const html=buildPdfDocumentHtml(input({lines:['Article',text],imageRows:[{text:'Article',imageData:'data:image/png;base64,AA=='},{text}],includeImages:true}));
  assert.match(html,/class="image-row has-photo"/);
  assert.match(html,/Solde restant : 20 DH/);
  assert.match(buildPdfDocumentHtml(input({lines:[text],imageRows:[],includeImages:true})),/Solde restant : 20 DH/);
});

test('applies overrides to the selected document kind in both photo and plain exports', () => {
  const companyProfile = {
    ...EMPTY_COMPANY_PROFILE, pdfTemplateStyle: 'compact', pdfCustomFields: 'Champ général',
    pdfDocumentTemplates: {
      quote: {style: 'framed', customFields: 'ضمان < سنة'},
      invoice: {customFields: ''},
      delivery: {style: 'classic'},
    },
  };
  const args = {companyProfile, documentKind: 'quote', imageRows: [{text: 'Article', imageData: 'data:image/png;base64,AA=='}]};
  for (const includeImages of [true, false]) {
    const html = buildPdfDocumentHtml(input({...args, includeImages}));
    assert.match(html, /<body class="framed">/);
    assert.match(html, /ضمان &lt; سنة/);
    assert.doesNotMatch(html, /Champ général/);
    assert.equal(html.includes('data:image/png;base64,AA=='), includeImages);
  }
  const invoice = buildPdfDocumentHtml(input({companyProfile, documentKind: 'invoice', language: 'FR'}));
  assert.match(invoice, /<body class="compact">/);
  assert.doesNotMatch(invoice, /<p class="custom-field"/);
  const delivery = buildPdfDocumentHtml(input({companyProfile, documentKind: 'delivery'}));
  assert.match(delivery, /<body class="classic">/);
  assert.match(delivery, /Champ général/);
  const other = buildPdfDocumentHtml(input({companyProfile}));
  assert.match(other, /<body class="compact">/);
  assert.match(other, /Champ général/);
});
