import {CompanyProfile} from './company-profile';
import {AppLanguage} from './i18n';

type PdfTemplateInput={
  language:AppLanguage;
  profile:CompanyProfile;
  title:string;
  customerName:string;
  lines:string[];
  total:number;
  date:string;
};

const titlesAr:Record<string,string>={
  'Reçu de vente':'وصل البيع',
  'Facture fournisseur':'فاتورة المورد',
  'Avoir fournisseur':'إشعار دائن للمورد',
  'Bon de réception':'وصل استلام',
  'Demande d’achat':'طلب شراء',
  'Bon de commande':'أمر شراء',
  'Relevé de compte':'كشف حساب',
  'Bon d’achat':'وصل شراء',
  'Reçu de dépense':'وصل مصروف',
  'Facture proforma':'فاتورة أولية',
  'Commande client':'طلب زبون',
  'Facture':'فاتورة',
  'Bon de sortie':'بون خروج',
  'Reçu de paiement':'وصل أداء',
  'Rapport d’activité':'تقرير النشاط',
  'Situation des clients':'وضعية الزبناء',
  'Etat du stock':'حالة المخزون',
};
const lineLabelsAr:Record<string,string>={
  'Solde d’ouverture':'الرصيد الافتتاحي',
  'Mode':'طريقة الأداء',
  'Montant':'المبلغ',
  'Ventes':'المبيعات',
  'Achats':'المشتريات',
  'Dépenses':'المصاريف',
  'Coût du travail':'تكلفة العمل',
  'Résultat initial':'الصافي الأولي',
};
const companyLabels={
  AR:{address:'العنوان',phone:'الهاتف',email:'البريد الإلكتروني',ice:'ICE',rc:'RC',taxId:'IF',bank:'البنك',rib:'RIB'},
  FR:{address:'Adresse',phone:'Téléphone',email:'E-mail',ice:'ICE',rc:'RC',taxId:'IF',bank:'Banque',rib:'RIB'},
};
const escapeHtml=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

function localizeLine(language:AppLanguage,line:string):string{
  if(language==='FR')return line;
  const colon=line.indexOf(':');
  const prefix=colon>=0?line.slice(0,colon).trim():'';
  const localizedPrefix=lineLabelsAr[prefix];
  const result=localizedPrefix&&colon>=0?localizedPrefix+':'+line.slice(colon+1):line;
  return result.replace(/\bPaiement\b/g,'أداء').replace(/\binvoice\b/g,'فاتورة').replace(/\bcredit_note\b/g,'إشعار دائن').replace(/\bdelivery\b/g,'بون خروج').replace(/\bproforma\b/g,'فاتورة أولية');
}

export function buildPdfHtml(input:PdfTemplateInput):string{
  const {language,profile,title,customerName,lines,total,date}=input;
  if(!Number.isFinite(total)||total<0)throw new Error('PDF total must be a non-negative number.');
  const ar=language==='AR',direction=ar?'rtl':'ltr',labels=companyLabels[language];
  const companyName=profile.name.trim()||'HamZa';
  const fields:[string,string][]=[
    [labels.address,profile.address],[labels.phone,profile.phone],[labels.email,profile.email],
    ['ICE',profile.ice],['RC',profile.rc],['IF',profile.taxId],[labels.bank,profile.bank],['RIB',profile.rib],
  ].filter(([,value])=>!!value.trim()) as [string,string][];
  const companyLogo=profile.logoData?`<img class="logo" src="${escapeHtml(profile.logoData)}" alt="Logo"/>`:'';
  const companyDetails=fields.map(([label,value])=>`<span><b>${escapeHtml(label)}:</b> ${escapeHtml(value)}</span>`).join('');
  const localizedTitle=ar?(titlesAr[title]||title):title;
  const customerLabel=ar?'الزبون':'Client',dateLabel=ar?'التاريخ':'Date',totalLabel=ar?'المجموع':'Total',thanks=ar?'شكراً على ثقتكم':'Merci pour votre confiance';
  return `<!doctype html><html lang="${ar?'ar':'fr'}" dir="${direction}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(localizedTitle)}</title><style>@page{size:A4;margin:18mm}*{box-sizing:border-box}body{font-family:Arial,"Noto Naskh Arabic",sans-serif;color:#222;direction:${direction};text-align:${ar?'right':'left'};font-size:12pt;line-height:1.65}.head{border-bottom:2px solid #9A762D;padding-bottom:14px;margin-bottom:18px}.logo{max-width:110px;max-height:80px;object-fit:contain;display:block;margin-bottom:8px}h1{color:#9A762D;font-size:23pt;margin:0 0 6px}.company{display:flex;flex-wrap:wrap;gap:4px 18px;font-size:10pt;color:#555}.doc-title{margin:22px 0 12px;font-size:18pt}.meta{display:flex;justify-content:space-between;gap:14px;margin-bottom:18px}.line{padding:8px 0;border-bottom:1px solid #ddd;white-space:pre-wrap;overflow-wrap:anywhere}.total{margin-top:18px;border-top:2px solid #9A762D;padding-top:12px;font-size:17pt;color:#76571d}.thanks{margin-top:28px;color:#666}</style></head><body><header class="head">${companyLogo}<h1>${escapeHtml(companyName)}</h1><div class="company">${companyDetails}</div></header><h2 class="doc-title">${escapeHtml(localizedTitle)}</h2><div class="meta"><span>${customerLabel}: ${escapeHtml(customerName||'—')}</span><span>${dateLabel}: ${escapeHtml(date)}</span></div><main>${lines.map(line=>`<div class="line" dir="auto">${escapeHtml(localizeLine(language,line))}</div>`).join('')}</main><h2 class="total">${totalLabel}: ${total.toFixed(2)} DH</h2><p class="thanks">${thanks}</p></body></html>`;
}
