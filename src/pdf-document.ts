import {CompanyProfile,PdfDocumentKind,resolvePdfDocumentTemplate} from './company-profile';
import {AppLanguage,translate} from './i18n';

export type PdfDocumentInput={
  language:AppLanguage;
  documentKind?:PdfDocumentKind;
  companyProfile:CompanyProfile;
  title:string;
  customerName:string;
  date:string;
  lines:string[];
  total:number;
  imageRows?:Array<{text:string;imageData?:string}>;
  includeImages?:boolean;
};

export const escapePdfHtml=(value:string)=>value
  .replace(/&/g,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;')
  .replace(/\"/g,'&quot;')
  .replace(/'/g,'&#39;');

/** Display only: document math continues to use the stored numeric totals. */
export function formatPdfAmount(amount:number,language:AppLanguage):string{
  const fixed=amount.toFixed(2);
  if(language!=='FR')return fixed;
  const [whole,decimals]=fixed.split('.');
  return decimals===undefined?fixed:whole.replace(/\B(?=(\d{3})+(?!\d))/g,'\u202f')+','+decimals;
}
export function formatPdfProductLine(line:{productName:string;qty:number;unitPrice:number;total:number},language:AppLanguage):string{
  return `${line.productName} • ${line.qty} × ${formatPdfAmount(line.unitPrice,language)} DH = ${formatPdfAmount(line.total,language)} DH`;
}

/** A legacy document does not get an invented discount or a changed total. */
export function formatPdfDiscountLines(total:number,discountCentimes:number|undefined,language:AppLanguage):string[]{
  const totalCentimes=Math.round(total*100);
  if(discountCentimes===undefined||!Number.isSafeInteger(discountCentimes)||discountCentimes<=0||
     !Number.isSafeInteger(totalCentimes)||totalCentimes<0||!Number.isSafeInteger(totalCentimes+discountCentimes))return [];
  const subtotal=formatPdfAmount((totalCentimes+discountCentimes)/100,language);
  const discount=formatPdfAmount(discountCentimes/100,language);
  return [translate(language,'المجموع قبل التخفيض:')+' '+subtotal+' DH',translate(language,'التخفيض:')+' '+discount+' DH'];
}

export function buildPdfDocumentHtml(input:PdfDocumentInput):string{
  const rtl=input.language==='AR';
  const direction=rtl?'rtl':'ltr';
  const labels=rtl
    ?{client:'الزبون',date:'التاريخ',total:'المجموع',thanks:'شكراً على ثقتكم',terms:'شروط الأداء'}
    :{client:'Client',date:'Date',total:'Total',thanks:'Merci pour votre confiance',terms:'Conditions de paiement'};
  const profile=input.companyProfile;
  const {style:template,customFields:customFieldInput}=resolvePdfDocumentTemplate(profile,input.documentKind);
  const accent=/^#[0-9a-f]{6}$/i.test(profile.pdfAccentColor)?profile.pdfAccentColor:'#9A762D';
  const logo=profile.logoData
    ?`<img alt="Logo" src="${escapePdfHtml(profile.logoData)}" style="max-width:110px;max-height:80px;object-fit:contain"/>`
    :'';
  const companyIds=[
    profile.ice?`ICE: ${profile.ice}`:'',
    profile.rc?`RC: ${profile.rc}`:'',
    profile.taxId?`IF: ${profile.taxId}`:'',
  ].filter(Boolean).join(' • ');
  const font=rtl?'"Noto Naskh Arabic", "Noto Sans Arabic", Arial, sans-serif':'Arial, sans-serif';
  const lines=input.lines.map(line=>`<p class="line" dir="auto">${escapePdfHtml(line)}</p>`).join('');
  const imageRows=input.includeImages?(input.imageRows||[]).map(row=>{
    const image=row.imageData&&/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(row.imageData)
      ?`<img alt="" src="${escapePdfHtml(row.imageData)}"/>`
      :'';
    return `<div class="image-row${image?' has-photo':''}" dir="auto">${image}<p class="line">${escapePdfHtml(row.text)}</p></div>`;
  }).join(''):'';
  const bodyLines=input.includeImages&&input.imageRows?.length?imageRows:lines;
  const paymentTerms=profile.paymentTerms.trim()?`<p class="terms"><strong>${labels.terms}:</strong> ${escapePdfHtml(profile.paymentTerms)}</p>`:'';
  const documentNote=profile.documentNote.trim()?`<p class="document-note">${escapePdfHtml(profile.documentNote)}</p>`:'';
  const customFields=customFieldInput.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).slice(0,12).map(line=>`<p class="custom-field" dir="auto">${escapePdfHtml(line)}</p>`).join('');
  return `<!doctype html><html lang="${rtl?'ar':'fr'}" dir="${direction}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:${font};padding:28px;color:#222;direction:${direction};text-align:${rtl?'right':'left'};font-size:13pt;line-height:1.5}body.compact{padding:16px;line-height:1.4}body.framed{border:2px solid ${accent};margin:12px;padding:22px}h1,h2{color:${accent};margin:12px 0}p{margin:7px 0}.line{white-space:pre-wrap;unicode-bidi:plaintext;overflow-wrap:anywhere;break-inside:avoid}.image-row{display:flex;align-items:center;gap:12px;border-bottom:1px solid #ddd;padding:8px 0;break-inside:avoid}.image-row img{width:104px;height:88px;object-fit:contain}.total{border-top:1px solid #aaa;padding-top:10px;margin-top:16px}.terms,.document-note,.custom-field{white-space:pre-wrap;unicode-bidi:plaintext;color:#555;font-size:12px}body.framed .total{border-top:2px solid ${accent}}body.compact .image-row{padding:4px 0}</style></head><body class="${template}">${logo}<h1>${escapePdfHtml(profile.name.trim()||'HamZa')}</h1><p>${escapePdfHtml(profile.address)} ${escapePdfHtml(profile.phone)} ${escapePdfHtml(profile.email)}</p><p>${escapePdfHtml(companyIds)}</p><h2>${escapePdfHtml(input.title)}</h2><p>${labels.client}: ${escapePdfHtml(input.customerName||'—')}</p><p>${labels.date}: ${escapePdfHtml(input.date)}</p><hr/>${bodyLines}<hr/><h2 class="total">${labels.total}: ${formatPdfAmount(input.total,input.language)} DH</h2>${paymentTerms}${documentNote}${customFields}<p>${labels.thanks}</p></body></html>`;
}
