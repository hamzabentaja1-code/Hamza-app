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
    ?{client:'الزبون',date:'التاريخ',total:'المجموع',thanks:'شكراً على ثقتكم'}
    :{client:'Client',date:'Date',total:'Total',thanks:'Thank you for your trust'};
  const profile=input.companyProfile;
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
  return `<!doctype html><html lang="${rtl?'ar':'fr'}" dir="${direction}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:${font};padding:28px;color:#222;direction:${direction};text-align:${rtl?'right':'left'};line-height:1.7}h1,h2{color:#9A762D;margin:12px 0}p{margin:7px 0}.line{white-space:pre-wrap;unicode-bidi:plaintext}.total{border-top:1px solid #aaa;padding-top:10px;margin-top:16px}</style></head><body>${logo}<h1>${escapePdfHtml(profile.name.trim()||'HamZa')}</h1><p>${escapePdfHtml(profile.address)} ${escapePdfHtml(profile.phone)} ${escapePdfHtml(profile.email)}</p><p>${escapePdfHtml(companyIds)}</p><h2>${escapePdfHtml(input.title)}</h2><p>${labels.client}: ${escapePdfHtml(input.customerName||'—')}</p><p>${labels.date}: ${escapePdfHtml(input.date)}</p><hr/>${lines}<hr/><h2 class="total">${labels.total}: ${input.total.toFixed(2)} DH</h2><p>${labels.thanks}</p></body></html>`;
}
