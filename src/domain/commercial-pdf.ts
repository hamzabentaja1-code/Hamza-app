export type PdfLanguage = 'AR' | 'FR';
export type PdfDocumentSummaryInput={number:string;type:'invoice'|'delivery'|'proforma';lines:{productName:string;qty:number;total:number;variantLabel?:string;lineType?:'section'}[];validUntil?:string;dueDate?:string};
export type PdfDocumentSummary={title:string;lines:string[]};
/** Build localized title and rows for a converted commercial document. */
export function describeConvertedDocumentForPdf(document:PdfDocumentSummaryInput,language:PdfLanguage):PdfDocumentSummary {
 const fr=language==='FR';
 const title=(document.type==='invoice'?(fr?'Facture ':'فاتورة '):document.type==='delivery'?(fr?'Bon de sortie ':'سند خروج '):(fr?'Facture pro forma ':'فاتورة أولية '))+document.number;
 const lines:string[]=[];
 if(document.type==='invoice'&&document.dueDate)lines.push((fr?"Date d’échéance : ":'تاريخ الاستحقاق: ')+document.dueDate);
 if(document.type==='proforma'&&document.validUntil)lines.push((fr?'Valable jusqu’au : ':'صالحة إلى غاية: ')+document.validUntil);
 for(const line of document.lines){
  if(line.lineType==='section'){lines.push('── '+line.productName+' ──');continue;}
  lines.push(line.productName+(line.variantLabel?' • '+line.variantLabel:'')+' × '+line.qty+' — '+line.total.toFixed(2)+' DH');
 }
 return {title,lines};
}
export type PdfCompanyProfile = {
 name?:string;logoData?:string;address?:string;phone?:string;email?:string;ice?:string;rc?:string;taxId?:string;
 bankName?:string;bankAccount?:string;bankRib?:string;bankIban?:string;showTaxFields?:boolean;taxRate?:number;
 pdfTemplate?:'classic'|'compact';pdfFooter?:string;pdfCustomFields?:string;
};
export type CommercialPdfInput = {
 language:PdfLanguage;title:string;customerName:string;lines:string[];total:number;showTotal?:boolean;
 companyProfile:PdfCompanyProfile;dateLabel:string;
};
const escapeHtml=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export type CommercialPdfField={label:string;value:string};

/** Parse up to six safe, document-wide field pairs in "label=value" format. */
export function parseCommercialPdfFields(value:string):CommercialPdfField[]{
 if(value.length>700)throw new Error('النص ديال الحقول المخصصة طويل بزاف');
 const rows=value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
 if(rows.length>6)throw new Error('الحد الأقصى ستة حقول للوثائق');
 const names=new Set<string>();
 return rows.map(line=>{
  const separator=line.indexOf('=');
  if(separator<1||separator===line.length-1)throw new Error('اكتب الحقول بالشكل: الاسم=القيمة');
  const label=line.slice(0,separator).trim(),fieldValue=line.slice(separator+1).trim();
  if(!label||!fieldValue||label.length>40||fieldValue.length>160)throw new Error('اسم الحقل أو القيمة غير صالح');
  const key=label.toLocaleLowerCase();
  if(names.has(key))throw new Error('اسم الحقل مكرر');
  names.add(key);
  return {label,value:fieldValue};
 });
}
export function buildCommercialPdfHtml(input:CommercialPdfInput):string {
 const rtl=input.language==='AR';
 const labels=rtl?{client:'الزبون',date:'التاريخ',total:'TTC',ht:'HT',vat:'TVA',thanks:'شكراً على ثقتكم'}:{client:'Client',date:'Date',total:'TTC',ht:'HT',vat:'TVA',thanks:'Merci pour votre confiance'};
 const profile=input.companyProfile;
 if(!Number.isFinite(input.total)||input.total<0)throw new Error('مجموع الوثيقة غير صالح');
 const template=profile.pdfTemplate==='compact'?'compact':'classic';
 const fields=parseCommercialPdfFields(profile.pdfCustomFields||'').map(field=>'<p><strong>'+escapeHtml(field.label)+':</strong> '+escapeHtml(field.value)+'</p>').join('');
 const footer=(profile.pdfFooter||'').trim();
 const footerHtml=footer?'<p style="margin-top:24px">'+escapeHtml(footer)+'</p>':'';
 const safeName=escapeHtml(profile.name||'HamZa');
 const logo=profile.logoData&&(profile.logoData.startsWith('file://')||profile.logoData.startsWith('data:image/'))?'<img class="company-logo" src="'+escapeHtml(profile.logoData)+'" alt="'+safeName+'"/>':'';
 const details=[profile.address,profile.phone,profile.email,profile.ice?'ICE: '+profile.ice:'',profile.rc?'RC: '+profile.rc:'',profile.taxId?'IF: '+profile.taxId:'',profile.bankName?(rtl?'البنك: ':'Banque : ')+profile.bankName:'',profile.bankAccount?(rtl?'الحساب: ':'Compte : ')+profile.bankAccount:'',profile.bankRib?(rtl?'RIB: ':'RIB : ')+profile.bankRib:'',profile.bankIban?(rtl?'IBAN: ':'IBAN : ')+profile.bankIban:''].filter(Boolean).map(value=>escapeHtml(String(value))).join(' • ');
 const taxRate=Number.isFinite(profile.taxRate)&&Number(profile.taxRate)>-100?Number(profile.taxRate):0;
 const totals=input.showTotal===false?'':profile.showTaxFields?'<section class="totals"><p>'+labels.ht+': '+(input.total/(1+taxRate/100)).toFixed(2)+' DH</p><p>'+labels.vat+' ('+taxRate+'%): '+(input.total-input.total/(1+taxRate/100)).toFixed(2)+' DH</p><h2>'+labels.total+': '+input.total.toFixed(2)+' DH</h2></section>':'<section class="totals"><h2>'+labels.total+': '+input.total.toFixed(2)+' DH</h2></section>';
 const direction=rtl?'rtl':'ltr';
 const language=rtl?'ar':'fr';
 const lines=input.lines.map(line=>'<p class="line-item">'+escapeHtml(line)+'</p>').join('');
 const styles=`@page{size:A4;margin:14mm}*{box-sizing:border-box}html{font-family:'Noto Naskh Arabic','Noto Sans Arabic',Tahoma,Arial,sans-serif;color:#222;font-size:12pt;line-height:1.55}body{margin:0;padding:0}main{width:100%;padding:${template==='compact'?'14px':'28px'};line-height:${template==='compact'?'1.25':'1.5'};direction:${direction};text-align:${rtl?'right':'left'};unicode-bidi:plaintext}.company-header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #9A762D;padding-bottom:12px;margin-bottom:20px;break-inside:avoid;page-break-inside:avoid}.company-logo{max-width:110px;max-height:90px;object-fit:contain}.company-name{margin:0;color:#9A762D;font-size:22pt}.company-details{margin:6px 0 0;overflow-wrap:anywhere}.document-title{margin:18px 0 12px;font-size:18pt;break-after:avoid-page;page-break-after:avoid}.metadata{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;margin:14px 0;padding:10px 0;border-top:1px solid #ddd;border-bottom:1px solid #ddd;break-inside:avoid;page-break-inside:avoid}.metadata p,.line-item,.totals p{margin:0}.line-item{padding:7px 0;border-bottom:1px solid #eee;overflow-wrap:anywhere;break-inside:avoid;page-break-inside:avoid}.totals{margin-top:16px;padding-top:8px;border-top:1px solid #999;break-inside:avoid;page-break-inside:avoid}.totals h2{color:#9A762D;margin:8px 0 0;font-size:16pt}.thanks{margin-top:26px;color:#666;break-inside:avoid;page-break-inside:avoid}@media print{html,body{print-color-adjust:exact;-webkit-print-color-adjust:exact}main{padding:0}}`;
 return `<html lang="${language}" dir="${direction}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles}</style></head><body><main dir="${direction}" data-hamza-template="${template}"><header class="company-header">${logo}<div><h1 class="company-name">${safeName}</h1><p class="company-details">${details}</p></div></header><h2 class="document-title">${escapeHtml(input.title)}</h2><section class="metadata"><p>${labels.client}: ${escapeHtml(input.customerName||'—')}</p><p>${labels.date}: ${escapeHtml(input.dateLabel)}</p></section><section class="document-lines">${fields}${lines}</section>${totals}${footerHtml}<footer class="thanks">${labels.thanks}</footer></main></body></html>`;
}

export function localizeCommercialPdfTitle(title:string,language:PdfLanguage):string {
 if(language==='FR')return title;
 const translations:[string,string][]=[
  ['Reçu de paiement fournisseur','وصل أداء المورد'],
  ['Facture pro forma ','فاتورة أولية '],
  ['Bon de commande ','أمر شراء '],
  ['Bon de sortie ','سند خروج '],
  ['Reçu de paiement','وصل الأداء'],
  ['Reçu de dépense','وصل المصروف'],
  ['Reçu de vente','وصل البيع'],
  ['Bon d’achat','وصل الشراء'],
  ['Rapport de période','تقرير الفترة'],
  ['Rapport d’activité','تقرير النشاط'],
  ['Situation des clients','وضعية الزبناء'],
  ['Situation des fournisseurs','وضعية الموردين'],
  ['Journal de caisse','سجل الصندوق'],
  ['Etat du stock','حالة المخزون'],
  ['Retour fournisseur','مرتجع المورد'],
  ['Facture ','فاتورة '],
 ];
 const match=translations.find(([source])=>title.startsWith(source));
 return match?match[1]+title.slice(match[0].length):title;
}
