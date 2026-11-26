import {CompanyProfile} from './company-profile';
import {AppLanguage} from './i18n';

export type PdfDocumentInput={
  language:AppLanguage;
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

export function buildPdfDocumentHtml(input:PdfDocumentInput):string{
  const rtl=input.language==='AR';
  const direction=rtl?'rtl':'ltr';
  const labels=rtl
    ?{client:'الزبون',date:'التاريخ',total:'المجموع',thanks:'شكراً على ثقتكم',terms:'شروط الأداء'}
    :{client:'Client',date:'Date',total:'Total',thanks:'Merci pour votre confiance',terms:'Conditions de paiement'};
  const profile=input.companyProfile;
  const template=['classic','compact','framed'].includes(profile.pdfTemplateStyle)?profile.pdfTemplateStyle:'classic';
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
  const customFields=profile.pdfCustomFields.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).slice(0,12).map(line=>`<p class="custom-field" dir="auto">${escapePdfHtml(line)}</p>`).join('');
  return `<!doctype html><html lang="${rtl?'ar':'fr'}" dir="${direction}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:${font};padding:28px;color:#222;direction:${direction};text-align:${rtl?'right':'left'};line-height:1.7}body.compact{padding:16px;line-height:1.45}body.framed{border:2px solid ${accent};margin:12px;padding:22px}h1,h2{color:${accent};margin:12px 0}p{margin:7px 0}.line{white-space:pre-wrap;unicode-bidi:plaintext}.image-row{display:flex;align-items:center;gap:12px;border-bottom:1px solid #ddd;padding:8px 0;break-inside:avoid}.image-row img{width:104px;height:88px;object-fit:contain}.total{border-top:1px solid #aaa;padding-top:10px;margin-top:16px}.terms,.document-note,.custom-field{white-space:pre-wrap;unicode-bidi:plaintext;color:#555;font-size:12px}body.framed .total{border-top:2px solid ${accent}}body.compact .image-row{padding:4px 0}</style></head><body class="${template}">${logo}<h1>${escapePdfHtml(profile.name.trim()||'HamZa')}</h1><p>${escapePdfHtml(profile.address)} ${escapePdfHtml(profile.phone)} ${escapePdfHtml(profile.email)}</p><p>${escapePdfHtml(companyIds)}</p><h2>${escapePdfHtml(input.title)}</h2><p>${labels.client}: ${escapePdfHtml(input.customerName||'—')}</p><p>${labels.date}: ${escapePdfHtml(input.date)}</p><hr/>${bodyLines}<hr/><h2 class="total">${labels.total}: ${input.total.toFixed(2)} DH</h2>${paymentTerms}${documentNote}${customFields}<p>${labels.thanks}</p></body></html>`;
}
