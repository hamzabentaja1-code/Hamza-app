export type CompanyProfile = {
  name: string; phone: string; email: string; address: string;
  ice: string; rc: string; taxId: string; bank: string; rib: string; logoData: string;
  paymentTerms:string; documentNote:string;
  pdfTemplateStyle:string; pdfAccentColor:string; pdfCustomFields:string;
};
export const EMPTY_COMPANY_PROFILE: CompanyProfile = {
  name: '', phone: '', email: '', address: '', ice: '', rc: '', taxId: '', bank: '', rib: '', logoData: '', paymentTerms:'', documentNote:'',
  pdfTemplateStyle:'classic', pdfAccentColor:'#9A762D', pdfCustomFields:'',
};
export function normalizeCompanyProfile(value: unknown): CompanyProfile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { ...EMPTY_COMPANY_PROFILE };
  const source = value as Record<string, unknown>;
  const keys = Object.keys(EMPTY_COMPANY_PROFILE) as (keyof CompanyProfile)[];
  const profile=keys.reduce((profile, key) => {
    profile[key] = typeof source[key] === 'string' ? source[key] as string : '';
    return profile;
  }, { ...EMPTY_COMPANY_PROFILE });
  if(!['classic','compact','framed'].includes(profile.pdfTemplateStyle))profile.pdfTemplateStyle='classic';
  if(!/^#[0-9a-f]{6}$/i.test(profile.pdfAccentColor))profile.pdfAccentColor='#9A762D';
  profile.pdfCustomFields=profile.pdfCustomFields.slice(0,2000);
  return profile;
}
