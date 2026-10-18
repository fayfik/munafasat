import { createContext, useContext, useState, type ReactNode } from 'react';

/** Prototype role switch: the same request is worked on by a Requester and by Procurement. */
export type Role = 'requester' | 'procurement';

interface RoleCtx { role: Role; setRole: (r: Role) => void }
const Ctx = createContext<RoleCtx | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(() => {
    try { return new URLSearchParams(window.location.search).get('role') === 'procurement' ? 'procurement' : 'requester'; } catch { return 'requester'; }
  });
  return <Ctx.Provider value={{ role, setRole }}>{children}</Ctx.Provider>;
}

export function useRole() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useRole must be used inside RoleProvider');
  return c;
}

export const PERSONAS: Record<Role, { name: string; initials: string; titleEn: string; titleAr: string }> = {
  requester:   { name: 'Mohammed H.', initials: 'MH', titleEn: 'Requester · IT & Digital', titleAr: 'مقدم الطلب · التقنية والتحول الرقمي' },
  procurement: { name: 'Reem A.',     initials: 'RA', titleEn: 'Procurement specialist',   titleAr: 'أخصائية مشتريات' },
};
