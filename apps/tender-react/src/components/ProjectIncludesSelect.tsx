import { useEffect, useRef, useState } from 'react';
import { useT, useLanguage } from '../context/LanguageContext';
import { CheckIcon, ChevronDownIcon } from './Icons';
import DrawerClose from './DrawerClose';

/* ─────────────────────────────────────────────────────────────────────────────
   Three request categories. Each routes the request through a specific set of
   review departments, which in turn defines the approval workflow.
   ───────────────────────────────────────────────────────────────────────────── */

export type CategoryId = 'technology' | 'consultancy' | 'general';
export type DeptId = 'requester' | 'manager' | 'finance' | 'cyber' | 'ea' | 'bcm' | 'procurement';

export interface IncludeCategory {
  id: CategoryId;
  en: string; ar: string;
  descEn: string; descAr: string;
  review: DeptId[];           // review departments this category adds to the workflow
}

export const PROJECT_CATEGORIES: IncludeCategory[] = [
  {
    id: 'technology',
    en: 'Technology', ar: 'تقنية',
    descEn: 'Software, hardware, networks, security and system implementation.',
    descAr: 'البرمجيات والأجهزة والشبكات والأمن وتنفيذ الأنظمة.',
    review: ['ea', 'cyber', 'bcm'],
  },
  {
    id: 'consultancy',
    en: 'Consultancy', ar: 'استشارات',
    descEn: 'Advisory, assessments, studies and professional services.',
    descAr: 'الاستشارات والتقييم والدراسات والخدمات المهنية.',
    review: ['cyber', 'bcm'],
  },
  {
    id: 'general',
    en: 'General request', ar: 'طلب عام',
    descEn: 'General goods or services outside technology and consultancy.',
    descAr: 'سلع أو خدمات عامة خارج نطاق التقنية والاستشارات.',
    review: ['bcm'],
  },
];

/* Department reference — labels, descriptions and accent colours for the workflow. */
export const DEPARTMENTS: Record<DeptId, { en: string; ar: string; descEn: string; descAr: string; color: string; icon: DeptIconKind }> = {
  requester:   { en: 'Requester',              ar: 'مُقدّم الطلب',        descEn: 'Raises the request and defines the scope.',            descAr: 'يرفع الطلب ويحدد النطاق.',                      color: '#64748b', icon: 'user' },
  manager:     { en: 'Line Manager',           ar: 'المدير المباشر',      descEn: 'Approves the need, scope and budget request.',         descAr: 'يعتمد الحاجة والنطاق وطلب الميزانية.',          color: '#0ea5e9', icon: 'check' },
  finance:     { en: 'Finance',                ar: 'الإدارة المالية',     descEn: 'Confirms budget availability and funding.',            descAr: 'يؤكد توفر الميزانية والتمويل.',                 color: '#16a34a', icon: 'coins' },
  cyber:       { en: 'Cybersecurity',          ar: 'الأمن السيبراني',     descEn: 'Reviews security controls and compliance.',            descAr: 'يراجع ضوابط الأمن والامتثال.',                  color: '#7c3aed', icon: 'shield' },
  ea:          { en: 'Enterprise Architecture', ar: 'هندسة المؤسسة',      descEn: 'Reviews architecture fit and technology standards.',   descAr: 'يراجع التوافق المعماري ومعايير التقنية.',       color: '#2563eb', icon: 'blocks' },
  bcm:         { en: 'Business Continuity (BCM)', ar: 'استمرارية الأعمال (BCM)', descEn: 'Reviews operational continuity and risk.',       descAr: 'يراجع استمرارية التشغيل والمخاطر.',             color: '#d97706', icon: 'refresh' },
  procurement: { en: 'Procurement',            ar: 'المشتريات',           descEn: 'Runs the procurement process on Etimad.',              descAr: 'ينفّذ عملية الشراء عبر منصة اعتماد.',           color: '#1a6b38', icon: 'cart' },
};

const REVIEW_ORDER: DeptId[] = ['cyber', 'ea', 'bcm'];

/** The ordered, de-duplicated approval chain for a set of selected categories. */
export function workflowStages(categoryIds: string[]): DeptId[] {
  const review = new Set<DeptId>();
  for (const id of categoryIds) {
    const c = PROJECT_CATEGORIES.find((x) => x.id === id);
    c?.review.forEach((d) => review.add(d));
  }
  const ordered = REVIEW_ORDER.filter((d) => review.has(d));
  return ['requester', 'manager', 'finance', ...ordered, 'procurement'];
}

/** Review departments only (for the compact "approvers" line). */
export function reviewDepartments(categoryIds: string[]): DeptId[] {
  const review = new Set<DeptId>();
  for (const id of categoryIds) PROJECT_CATEGORIES.find((x) => x.id === id)?.review.forEach((d) => review.add(d));
  return REVIEW_ORDER.filter((d) => review.has(d));
}

const KEYWORDS: [CategoryId, RegExp][] = [
  ['consultancy', /consult|advisor|advis|assess|audit|study|studies|train|enablement|change management|managed service|pmo|strategy|legal|complian/i],
  ['technology', /software|licen|erp|sap|oracle|hardware|server|network|switch|router|cabl|wireless|security|cyber|siem|soc\b|implement|configur|integrat|deploy|migrat|data|system|infrastructure|cloud|applic|device|laptop|printer|storage|platform|portal|website|web|mobile|app\b/i],
];

/** Best-guess category ids auto-derived from the request's item names. */
export function deriveIncludesFromItems(names: string[]): CategoryId[] {
  const found = new Set<CategoryId>();
  for (const name of names) {
    const hit = KEYWORDS.find(([, re]) => re.test(name));
    found.add(hit ? hit[0] : 'general');
  }
  return PROJECT_CATEGORIES.map((c) => c.id).filter((id) => found.has(id));
}

function LockIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
  );
}

export default function ProjectIncludesSelect({ value, onChange, locked = [] }: { value: string[]; onChange: (v: string[]) => void; locked?: string[] }) {
  const t = useT();
  const { isAr } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const cat = (id: string) => PROJECT_CATEGORIES.find((x) => x.id === id);
  const labelFor = (id: string) => { const c = cat(id); return c ? (isAr ? c.ar : c.en) : id; };
  const isLocked = (id: string) => locked.includes(id);
  const has = (id: string) => isLocked(id) || value.includes(id);
  const toggle = (id: string) => { if (isLocked(id)) return; onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]); };
  const remove = (id: string) => { if (isLocked(id)) return; onChange(value.filter((v) => v !== id)); };

  const displayed = [...locked, ...value.filter((v) => !locked.includes(v))];
  const deptLine = (c: IncludeCategory) => c.review.map((d) => (isAr ? DEPARTMENTS[d].ar : DEPARTMENTS[d].en)).join(isAr ? ' · ' : ' · ');

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-body-md shadow-sm transition-colors hover:border-neutral-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20">
        <span className={displayed.length ? 'text-neutral-900' : 'text-neutral-400'}>
          {displayed.length ? t(`${displayed.length} categor${displayed.length > 1 ? 'ies' : 'y'} selected`, `${displayed.length} فئة محددة`) : t('Select categories…', 'اختر الفئات…')}
        </span>
        <ChevronDownIcon className={`w-4 h-4 text-neutral-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {displayed.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {displayed.map((v) => {
            const lock = isLocked(v);
            return (
              <span key={v} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${lock ? 'bg-neutral-100 text-neutral-600 border-neutral-200' : 'bg-white text-neutral-700 border-neutral-200'}`}>
                {lock && <LockIcon className="w-3 h-3 text-neutral-400" />}
                {labelFor(v)}
                {lock ? null : <button type="button" onClick={() => remove(v)} className="text-neutral-400 hover:text-error-500" aria-label={t('Remove', 'إزالة')}>×</button>}
              </span>
            );
          })}
        </div>
      )}

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-neutral-200 bg-white shadow-lg overflow-hidden slide-up">
          <div className="py-1">
            {PROJECT_CATEGORIES.map((c) => {
              const sel = has(c.id);
              const lock = isLocked(c.id);
              return (
                <button key={c.id} type="button" onClick={() => toggle(c.id)} disabled={lock}
                  className={`w-full text-start px-3 py-2.5 transition-colors flex items-start gap-2.5 ${lock ? 'cursor-default opacity-90' : 'hover:bg-neutral-50'}`}>
                  <span className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 ${sel ? 'bg-brand-600 border-brand-600' : 'border-neutral-300'}`}>
                    {sel && <CheckIcon className="w-3 h-3 text-white" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-neutral-900">{isAr ? c.ar : c.en}</span>
                      {lock && <LockIcon className="w-3 h-3 text-neutral-400" />}
                    </span>
                    <span className="block text-[12px] text-neutral-500 leading-snug mt-0.5">{isAr ? c.descAr : c.descEn}</span>
                    <span className="mt-1 flex items-center gap-1 flex-wrap">
                      <span className="text-[10.5px] font-medium text-neutral-400">{t('Approvers', 'جهات الاعتماد')}:</span>
                      <span className="text-[10.5px] font-medium text-neutral-600">{deptLine(c)}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="px-3 py-2 border-t border-neutral-100 bg-neutral-50/60">
            <p className="text-[11px] text-neutral-500 leading-snug">
              {t('Auto-filled categories are locked. Add others manually — each adds its departments to the approval workflow.',
                 'الفئات المُعبّأة تلقائياً مقفلة. أضف غيرها يدوياً — كل فئة تضيف جهاتها إلى مسار الاعتماد.')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Workflow drawer — end-to-end approval chain as presented nodes.
   ───────────────────────────────────────────────────────────────────────────── */

type DeptIconKind = 'user' | 'check' | 'coins' | 'shield' | 'blocks' | 'refresh' | 'cart';

function DeptGlyph({ kind, className = '' }: { kind: DeptIconKind; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'user':    return <svg viewBox="0 0 24 24" className={className} {...common}><circle cx="12" cy="8" r="3.4" /><path d="M5.5 19c.6-3.3 3.2-5 6.5-5s5.9 1.7 6.5 5" /></svg>;
    case 'check':   return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M5 12.5l4.2 4.2L19 7" /></svg>;
    case 'coins':   return <svg viewBox="0 0 24 24" className={className} {...common}><ellipse cx="12" cy="7" rx="7" ry="3" /><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /></svg>;
    case 'shield':  return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M12 3l7 3v5c0 4.4-3 8-7 10-4-2-7-5.6-7-10V6z" /><path d="M9 12l2 2 4-4" /></svg>;
    case 'blocks':  return <svg viewBox="0 0 24 24" className={className} {...common}><rect x="4" y="4" width="7" height="7" rx="1.3" /><rect x="13" y="4" width="7" height="7" rx="1.3" /><rect x="8.5" y="13" width="7" height="7" rx="1.3" /></svg>;
    case 'refresh': return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M20 11a8 8 0 00-14.5-4.5M4 5v4h4M4 13a8 8 0 0014.5 4.5M20 19v-4h-4" /></svg>;
    case 'cart':    return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M4 5h2l2.2 10.2a1.5 1.5 0 001.5 1.2h7.1a1.5 1.5 0 001.5-1.1L21 8H7" /><circle cx="10" cy="20" r="1.2" /><circle cx="18" cy="20" r="1.2" /></svg>;
  }
}

export function WorkflowDrawer({ open, onClose, categories, isAr, t }: {
  open: boolean; onClose: () => void; categories: string[];
  isAr: boolean; t: (en: string, ar: string) => string;
}) {
  if (!open) return null;
  const stages = workflowStages(categories);
  const catChips = categories.map((id) => PROJECT_CATEGORIES.find((c) => c.id === id)).filter(Boolean) as IncludeCategory[];
  const reviewIds = reviewDepartments(categories);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[2px]" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="wf-drawer-title" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="relative w-full max-w-[400px] h-full bg-white rounded-s-[12px] overflow-hidden shadow-2xl flex flex-col drawer-in" onClick={(e) => e.stopPropagation()}>
        {/* Header (Figma 135:4009) */}
        <div className="shrink-0 p-5 bg-white border-b border-[#dae1eb]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] leading-[16.5px] font-semibold uppercase tracking-[0.275px] text-ai-700">{t('Approval workflow', 'مسار الاعتماد')}</p>
              <h3 id="wf-drawer-title" className="mt-[1.75px] text-[22px] leading-[24px] font-bold text-neutral-900">{t('How this request is approved', 'كيف يُعتمد هذا الطلب')}</h3>
            </div>
            <DrawerClose onClose={onClose} label={t('Close', 'إغلاق')} />
          </div>
          {catChips.length > 0 && (
            <div className="pt-2 flex items-center gap-1 flex-wrap">
              <span className="text-[11px] leading-[16.5px] text-black/70">{t('Based on', 'بناءً على')}:</span>
              {catChips.map((c) => (
                <span key={c.id} className="text-[11px] leading-[16.5px] font-semibold text-brand-600 bg-brand-600/15 rounded-full px-[7px] py-[1.75px]">{isAr ? c.ar : c.en}</span>
              ))}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-5">
          <ol className="relative">
            {stages.map((d, i) => {
              const dep = DEPARTMENTS[d];
              const isReview = reviewIds.includes(d);
              const last = i === stages.length - 1;
              // Approvers share the brand green (Figma 135:4039); reviewers keep their department colour.
              const approver = !isReview && d !== 'requester';
              return (
                <li key={d} className="relative flex items-start gap-[10.5px] pb-[17.5px] last:pb-0">
                  {/* connector */}
                  {!last && <span className="absolute top-[31.5px] bottom-0 w-[2px] bg-neutral-200" style={{ insetInlineStart: '14.75px' }} />}
                  {/* node */}
                  <span className="relative z-10 w-[31.5px] h-[31.5px] rounded-full flex items-center justify-center flex-shrink-0 shadow-[0_0_0_4px_white]"
                        style={approver ? { backgroundColor: 'rgba(22,163,74,0.1)', color: '#517632' } : { backgroundColor: `${dep.color}1a`, color: dep.color }}>
                    <DeptGlyph kind={dep.icon} className="w-[18px] h-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1 pt-[1.75px]">
                    <div className="flex items-center gap-[7px] flex-wrap">
                      <p className="text-[13.5px] leading-[20.25px] font-semibold text-neutral-900">{isAr ? dep.ar : dep.en}</p>
                      {isReview && (
                        <span className="text-[10px] leading-[15px] font-semibold rounded-full px-[5.25px] py-[1.75px]" style={{ backgroundColor: `${dep.color}14`, color: dep.color }}>
                          {t('Review', 'مراجعة')}
                        </span>
                      )}
                    </div>
                    <p className="pt-[1.75px] text-[12px] leading-[16.5px] text-neutral-500">{isAr ? dep.descAr : dep.descEn}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          {categories.length === 0 && (
            <p className="mt-2 text-[12px] text-neutral-400 italic">
              {t('Select at least one category to see the full workflow.', 'اختر فئة واحدة على الأقل لعرض المسار كاملاً.')}
            </p>
          )}
        </div>

        <div className="shrink-0 px-[17.5px] py-[10.5px] border-t border-neutral-100 flex justify-end">
          <button type="button" onClick={onClose}
            className="px-[14px] py-[7px] rounded-[7px] bg-brand-600 text-white text-[13px] leading-[19.5px] font-semibold hover:bg-brand-700 transition-colors">
            {t('Got it', 'تمام')}
          </button>
        </div>
      </div>
    </div>
  );
}
