import { useEffect, useRef, useState } from 'react';
import { useT, useLanguage } from '../context/LanguageContext';
import { SearchIcon, CheckIcon, ChevronDownIcon } from './Icons';
import { classifyItem, type RouteKey } from '../lib/triage';

export interface IncludeCategory {
  id: string;
  en: string; ar: string;
  descEn: string; descAr: string;
  route: RouteKey; // where this category typically lands
}

// Catalogue-style items (software/hardware/network) → eSouq; engagements → tendering.
export const PROJECT_CATEGORIES: IncludeCategory[] = [
  { id: 'software-licenses', en: 'Software licenses', ar: 'تراخيص البرمجيات', descEn: 'Procurement of software from third-party vendors like Google, Oracle & SAP.', descAr: 'شراء برمجيات من موردين خارجيين مثل Google و Oracle و SAP.', route: 'souq-etimad' },
  { id: 'hardware-equipment', en: 'Hardware & equipment', ar: 'الأجهزة والمعدات', descEn: 'Servers, devices, appliances and other physical equipment.', descAr: 'الخوادم والأجهزة والمعدات المادية الأخرى.', route: 'souq-etimad' },
  { id: 'network-infra', en: 'Network infrastructure', ar: 'البنية التحتية للشبكات', descEn: 'Switches, cabling, wireless, or other networking/connectivity components.', descAr: 'المحولات والكابلات والشبكات اللاسلكية ومكونات الاتصال الأخرى.', route: 'souq-etimad' },
  { id: 'cybersecurity', en: 'Cybersecurity infrastructure', ar: 'البنية التحتية للأمن السيبراني', descEn: "Security controls, monitoring, or protective systems for the organization's infrastructure.", descAr: 'ضوابط الأمن والمراقبة والأنظمة الوقائية للبنية التحتية للمنظمة.', route: 'tendering' },
  { id: 'consulting', en: 'Consulting services', ar: 'الخدمات الاستشارية', descEn: 'Advisory, legal, or compliance engagements delivered by an external consultant.', descAr: 'خدمات استشارية أو قانونية أو امتثال يقدمها مستشار خارجي.', route: 'tendering' },
  { id: 'managed-services', en: 'Managed services', ar: 'الخدمات المُدارة', descEn: 'Ongoing third-party operation, support, or maintenance of a system or service.', descAr: 'تشغيل أو دعم أو صيانة مستمرة لنظام أو خدمة من طرف ثالث.', route: 'tendering' },
  { id: 'implementation', en: 'Implementation & configuration', ar: 'التنفيذ والتهيئة', descEn: 'System setup, configuration, integration and deployment work.', descAr: 'إعداد النظام وتهيئته وتكامله ونشره.', route: 'tendering' },
  { id: 'data-migration', en: 'Data migration', ar: 'ترحيل البيانات', descEn: 'Moving, cleansing and validating data from legacy systems.', descAr: 'نقل البيانات وتنظيفها والتحقق منها من الأنظمة القديمة.', route: 'tendering' },
  { id: 'training', en: 'Training & enablement', ar: 'التدريب والتمكين', descEn: 'User training and change-management programmes.', descAr: 'برامج تدريب المستخدمين وإدارة التغيير.', route: 'tendering' },
  { id: 'maintenance', en: 'Maintenance & support', ar: 'الصيانة والدعم', descEn: 'Warranty, technical support and maintenance contracts.', descAr: 'عقود الضمان والدعم الفني والصيانة.', route: 'tendering' },
];

const KEYWORDS: [string, RegExp][] = [
  ['software-licenses', /licen|software|subscription|erp|sap|oracle/i],
  ['data-migration', /migrat|cleans/i],
  ['training', /train|enablement|e-learning|change management/i],
  ['implementation', /implement|configur|integrat|deploy|setup|build/i],
  ['maintenance', /support|maintenance|warranty|helpdesk/i],
  ['managed-services', /managed/i],
  ['consulting', /consult|advisory|legal|compliance|assessment/i],
  ['cybersecurity', /security|cyber|siem|soc\b/i],
  ['network-infra', /network|switch|router|cabling|wireless/i],
  ['hardware-equipment', /hardware|server|device|appliance|equipment|laptop|printer|storage/i],
];

/** Best-guess category ids auto-derived from the request's item names. */
export function deriveIncludesFromItems(names: string[]): string[] {
  const out: string[] = [];
  for (const name of names) {
    const hit = KEYWORDS.find(([, re]) => re.test(name));
    const id = hit ? hit[0] : classifyItem({ id: 'x', name }).route === 'souq-etimad' ? 'hardware-equipment' : 'implementation';
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

export function routeForInclude(val: string): RouteKey {
  const c = PROJECT_CATEGORIES.find((x) => x.id === val);
  if (c) return c.route;
  return classifyItem({ id: 'x', name: val }).route; // custom label → classify
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
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const labelFor = (val: string) => { const c = PROJECT_CATEGORIES.find((x) => x.id === val); return c ? (isAr ? c.ar : c.en) : val; };
  const isLocked = (id: string) => locked.includes(id);
  const has = (id: string) => isLocked(id) || value.includes(id);
  const toggle = (id: string) => { if (isLocked(id)) return; onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]); };
  const remove = (id: string) => { if (isLocked(id)) return; onChange(value.filter((v) => v !== id)); };

  const displayed = [...locked, ...value.filter((v) => !locked.includes(v))];
  const query = q.trim().toLowerCase();
  const filtered = PROJECT_CATEGORIES.filter((c) => !query || (isAr ? c.ar : c.en).toLowerCase().includes(query) || c.descEn.toLowerCase().includes(query));
  const canAddCustom = query.length > 1
    && !PROJECT_CATEGORIES.some((c) => (isAr ? c.ar : c.en).toLowerCase() === query)
    && !displayed.some((v) => labelFor(v).toLowerCase() === query);
  const addCustom = () => { onChange([...value, q.trim()]); setQ(''); };

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
          <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-100">
            <SearchIcon className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search categories', 'ابحث عن الفئات')}
              className="flex-1 bg-transparent outline-none text-[13px] text-neutral-900 placeholder:text-neutral-400" />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.map((c) => {
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
                      <span className="text-[13px] font-medium text-neutral-900">{isAr ? c.ar : c.en}</span>
                      {lock && <LockIcon className="w-3 h-3 text-neutral-400" />}
                    </span>
                    <span className="block text-[12px] text-neutral-500 leading-snug">{isAr ? c.descAr : c.descEn}</span>
                  </span>
                </button>
              );
            })}
            {canAddCustom && (
              <button type="button" onClick={addCustom} className="w-full text-start px-3 py-2.5 hover:bg-brand-50 transition-colors text-[13px] font-semibold text-brand-700">
                + {t(`Add “${q.trim()}”`, `إضافة "${q.trim()}"`)}
              </button>
            )}
            {filtered.length === 0 && !canAddCustom && (
              <p className="px-3 py-3 text-[12px] text-neutral-400">{t('No categories found.', 'لا توجد فئات.')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
