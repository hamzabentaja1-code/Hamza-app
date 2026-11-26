export const PDF_TEMPLATE_STYLES = ['classic', 'compact', 'framed'] as const;
export const PDF_DOCUMENT_KINDS = ['quote', 'invoice', 'delivery', 'proforma', 'creditNote', 'customer_order'] as const;
export type PdfTemplateStyle = typeof PDF_TEMPLATE_STYLES[number];
export type PdfDocumentKind = typeof PDF_DOCUMENT_KINDS[number];
export type PdfDocumentTemplate = {style?: PdfTemplateStyle; customFields?: string};

export function isPdfTemplateStyle(value: unknown): value is PdfTemplateStyle {
  return PDF_TEMPLATE_STYLES.some(style => style === value);
}

function normalizePdfDocumentTemplates(value: unknown): Partial<Record<PdfDocumentKind,PdfDocumentTemplate>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const templates: Partial<Record<PdfDocumentKind,PdfDocumentTemplate>> = {};
  for (const kind of PDF_DOCUMENT_KINDS) {
    if (!Object.prototype.hasOwnProperty.call(source, kind)) continue;
    const candidate = source[kind];
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) continue;
    const fields = candidate as Record<string, unknown>;
    const style = isPdfTemplateStyle(fields.style) ? fields.style : undefined;
    const customFields = typeof fields.customFields === 'string' ? fields.customFields.slice(0,2000) : undefined;
    if (style !== undefined || customFields !== undefined) {
      templates[kind] = {...(style ? {style} : {}), ...(customFields !== undefined ? {customFields} : {})};
    }
  }
  return templates;
}

export type CompanyProfile = {
  name: string; phone: string; email: string; address: string;
  ice: string; rc: string; taxId: string; bank: string; rib: string; logoData: string;
  paymentTerms:string; documentNote:string;
  pdfTemplateStyle:string; pdfAccentColor:string; pdfCustomFields:string;
  pdfDocumentTemplates?:Partial<Record<PdfDocumentKind,PdfDocumentTemplate>>;
};
export const EMPTY_COMPANY_PROFILE: Omit<CompanyProfile,'pdfDocumentTemplates'> = {
  name: '', phone: '', email: '', address: '', ice: '', rc: '', taxId: '', bank: '', rib: '', logoData: '', paymentTerms:'', documentNote:'',
  pdfTemplateStyle:'classic', pdfAccentColor:'#9A762D', pdfCustomFields:'',
};
export function normalizeCompanyProfile(value: unknown): CompanyProfile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { ...EMPTY_COMPANY_PROFILE };
  const source = value as Record<string, unknown>;
  const keys = Object.keys(EMPTY_COMPANY_PROFILE) as (keyof typeof EMPTY_COMPANY_PROFILE)[];
  const profile=keys.reduce((profile, key) => {
    profile[key] = typeof source[key] === 'string' ? source[key] as string : '';
    const templates=normalizePdfDocumentTemplates(source.pdfDocumentTemplates);
  return Object.keys(templates).length ? {...profile,pdfDocumentTemplates:templates} : profile;
  }, { ...EMPTY_COMPANY_PROFILE });
  if(!isPdfTemplateStyle(profile.pdfTemplateStyle))profile.pdfTemplateStyle='classic';
  if(!/^#[0-9a-f]{6}$/i.test(profile.pdfAccentColor))profile.pdfAccentColor='#9A762D';
  profile.pdfCustomFields=profile.pdfCustomFields.slice(0,2000);
  const templates=normalizePdfDocumentTemplates(source.pdfDocumentTemplates);
  return Object.keys(templates).length ? {...profile,pdfDocumentTemplates:templates} : profile;
}

export function resolvePdfDocumentTemplate(profile: CompanyProfile, kind?: PdfDocumentKind) {
  const override = kind ? profile.pdfDocumentTemplates?.[kind] : undefined;
  const chosenStyle = override?.style ?? profile.pdfTemplateStyle;
  return {
    style: isPdfTemplateStyle(chosenStyle) ? chosenStyle : 'classic',
    customFields: override?.customFields ?? profile.pdfCustomFields,
  };
}
