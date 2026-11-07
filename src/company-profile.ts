export type CompanyProfile = {
  name: string; phone: string; email: string; address: string;
  ice: string; rc: string; taxId: string; bank: string; rib: string;
};
export const EMPTY_COMPANY_PROFILE: CompanyProfile = {
  name: '', phone: '', email: '', address: '', ice: '', rc: '', taxId: '', bank: '', rib: '',
};
export function normalizeCompanyProfile(value: unknown): CompanyProfile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { ...EMPTY_COMPANY_PROFILE };
  const source = value as Record<string, unknown>;
  const keys = Object.keys(EMPTY_COMPANY_PROFILE) as (keyof CompanyProfile)[];
  return keys.reduce((profile, key) => {
    profile[key] = typeof source[key] === 'string' ? source[key] as string : '';
    return profile;
  }, { ...EMPTY_COMPANY_PROFILE });
}
