export type PdfLanguage = 'AR' | 'FR';
export type PdfCompanyProfile = {
 name?:string;logoData?:string;address?:string;phone?:string;email?:string;ice?:string;rc?:string;taxId?:string;
 bankName?:string;bankAccount?:string;bankRib?:string;bankIban?:string;showTaxFields?:boolean;taxRate?:number;
};
export type CommercialPdfInput = {
 language:PdfLanguage;title:string;customerName:string;lines:string[];total:number;showTotal?:boolean;
 companyProfile:PdfCompanyProfile;dateLabel:string;
};
const escapeHtml=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function buildCommercialPdfHtml(input:CommercialPdfInput):string {
 const rtl=input.language==='AR';
 const labels=rtl?{client:'الزبون',date:'التاريخ',total:'TTC',ht:'HT',vat:'TVA',thanks:'شكراً على ثقتكم'}:{client:'Client',date:'Date',total:'TTC',ht:'HT',vat:'TVA',thanks:'Thank you for your trust'};
 const profile=input.companyProfile;
 const logo=profile.logoData&&(profile.logoData.startsWith('file://')||profile.logoData.startsWith('data:image/'))?'<img src="'+escapeHtml(profile.logoData)+'" style="max-width:110px;max-height:90px;object-fit:contain"/>':'';
 const details=[profile.address,profile.phone,profile.email,profile.ice?'ICE: '+profile.ice:'',profile.rc?'RC: '+profile.rc:'',profile.taxId?'IF: '+profile.taxId:'',profile.bankName?(rtl?'البنك: ':'Banque : ')+profile.bankName:'',profile.bankAccount?(rtl?'الحساب: ':'Compte : ')+profile.bankAccount:'',profile.bankRib?(rtl?'RIB: ':'RIB : ')+profile.bankRib:'',profile.bankIban?(rtl?'IBAN: ':'IBAN : ')+profile.bankIban:''].filter(Boolean).map(value=>escapeHtml(String(value))).join(' • ');
 const taxRate=Number.isFinite(profile.taxRate)&&Number(profile.taxRate)>-100?Number(profile.taxRate):0;
 const totals=input.showTotal===false?'':profile.showTaxFields?'<hr/><p>'+labels.ht+': '+(input.total/(1+taxRate/100)).toFixed(2)+' DH</p><p>'+labels.vat+' ('+taxRate+'%): '+(input.total-input.total/(1+taxRate/100)).toFixed(2)+' DH</p><h2>'+labels.total+': '+input.total.toFixed(2)+' DH</h2>':'<hr/><h2>'+labels.total+': '+input.total.toFixed(2)+' DH</h2>';
 return '<html lang="'+(rtl?'ar':'fr')+'" dir="'+(rtl?'rtl':'ltr')+'"><meta charset="utf-8"><body style="font-family:Arial,sans-serif;padding:28px;color:#222;direction:'+(rtl?'rtl':'ltr')+';text-align:'+(rtl?'right':'left')+'">'+logo+'<h1 style="color:#9A762D">'+escapeHtml(profile.name||'HamZa')+'</h1><p>'+details+'</p><h2>'+escapeHtml(input.title)+'</h2><p>'+labels.client+': '+escapeHtml(input.customerName||'—')+'</p><p>'+labels.date+': '+escapeHtml(input.dateLabel)+'</p><hr/>'+input.lines.map(line=>'<p>'+escapeHtml(line)+'</p>').join('')+totals+'<p>'+labels.thanks+'</p></body></html>';
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
