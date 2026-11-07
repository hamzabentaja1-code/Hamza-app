export type UserRole = 'owner' | 'admin' | 'sales' | 'warehouse' | 'accountant' | 'viewer' | 'custom';

export type UserAccount = {
  id: string;
  name: string;
  role: UserRole;
  allowedModules: string[];
  canWrite: boolean;
  active: boolean;
  createdAt: string;
};

export type UserModule = { id: string; label: string };

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'المالك',
  admin: 'مدير',
  sales: 'المبيعات',
  warehouse: 'المخزون',
  accountant: 'المحاسبة',
  viewer: 'مشاهدة فقط',
  custom: 'مخصص',
};

export function defaultModulesForRole(role: UserRole, moduleIds: string[]): string[] {
  const common = ['الرئيسية', 'المنتجات', 'الزبناء', 'الموردون', 'عروض الأسعار', 'الفواتير', 'التقارير'];
  const roleModules: Record<Exclude<UserRole, 'owner' | 'admin' | 'custom'>, string[]> = {
    sales: ['الرئيسية', 'المنتجات', 'الزبناء', 'المبيعات', 'المرتجعات', 'نقطة البيع', 'عروض الأسعار', 'الفواتير', 'Bon de sortie', 'الأداءات'],
    warehouse: ['الرئيسية', 'المنتجات', 'تنويعات المنتجات', 'المخزون', 'جرد وحركات المخزون', 'المخازن', 'أوامر الشراء'],
    accountant: ['الرئيسية', 'الزبناء', 'الموردون', 'المبيعات', 'المشتريات', 'المرتجعات', 'الأداءات', 'المصاريف', 'الصندوق', 'الحسابات البنكية', 'الشيكات', 'التقارير', 'تحليل الفترة'],
    viewer: common,
  };
  if (role === 'owner' || role === 'admin') return [...moduleIds];
  if (role === 'custom') return [];
  return moduleIds.filter(id => roleModules[role].includes(id));
}

export function createDefaultOwner(moduleIds: string[], now = new Date().toISOString()): UserAccount {
  return { id: 'hamza-owner', name: 'المدير الرئيسي', role: 'owner', allowedModules: [...moduleIds], canWrite: true, active: true, createdAt: now };
}

export function normalizeUserAccounts(value: unknown, moduleIds: string[]): UserAccount[] {
  if (!Array.isArray(value)) return [createDefaultOwner(moduleIds)];
  const users = value.filter((item): item is UserAccount => !!item && typeof item === 'object' &&
    typeof (item as UserAccount).id === 'string' && typeof (item as UserAccount).name === 'string' &&
    !!(item as UserAccount).name.trim() && ['owner','admin','sales','warehouse','accountant','viewer','custom'].includes((item as UserAccount).role));
  if (!users.length) return [createDefaultOwner(moduleIds)];
  const normalized = users.map(user => ({
    ...user,
    name: user.name.trim(),
    allowedModules: Array.isArray(user.allowedModules) ? [...new Set(user.allowedModules.filter(id => moduleIds.includes(id)))] : defaultModulesForRole(user.role, moduleIds),
    canWrite: user.role === 'viewer' ? false : user.canWrite !== false,
    active: user.active !== false,
    createdAt: typeof user.createdAt === 'string' ? user.createdAt : new Date(0).toISOString(),
  }));
  if (!normalized.some(user => user.role === 'owner')) normalized.unshift(createDefaultOwner(moduleIds));
  return normalized;
}

export function hasModuleAccess(user: UserAccount | undefined, moduleId: string): boolean {
  if (!user || !user.active) return false;
  if (user.role === 'owner') return true;
  if (user.role === 'admin' && moduleId !== 'المستخدمون والصلاحيات') return true;
  return user.allowedModules.includes(moduleId);
}

export function canManageUsers(user: UserAccount | undefined): boolean {
  return !!user && user.active && user.role === 'owner';
}

export function canWriteModule(user: UserAccount | undefined, moduleId: string): boolean {
  return hasModuleAccess(user, moduleId) && user?.canWrite === true;
}

export function createUserAccount(input: { name: string; role: UserRole; moduleIds: string[]; id?: string; now?: string }): UserAccount {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) throw new Error('اسم المستخدم خاصو يكون بين جوج و60 حرف.');
  if (input.role === 'owner') throw new Error('ما يمكنش إنشاء مالك إضافي من هاد الشاشة.');
  const id = input.id || 'user-' + Date.now().toString(36);
  return { id, name, role: input.role, allowedModules: defaultModulesForRole(input.role, input.moduleIds), canWrite: input.role !== 'viewer', active: true, createdAt: input.now || new Date().toISOString() };
}

export function setUserModuleAccess(user: UserAccount, moduleId: string, allowed: boolean): UserAccount {
  if (user.role === 'owner') return user;
  const modules = new Set(user.allowedModules);
  if (allowed) modules.add(moduleId); else modules.delete(moduleId);
  return { ...user, role: 'custom', allowedModules: [...modules] };
}
