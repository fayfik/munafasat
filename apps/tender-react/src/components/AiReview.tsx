// Review & Confirm → AI pre-review. Four reviewers (Finance, EA, Cybersecurity,
// Procurement) read the request; the result is a tab per department with its
// recommendations. "Fix it" opens the step and shows the suggestion in its own panel;
// "Apply it" writes it into the request.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAiReview } from '../context/AiReviewContext';
import { useTender, SECTIONS } from '../context/TenderContext';
import { useLanguage, useT } from '../context/LanguageContext';
import { DEPTS, type AiRec, type Dept, type Severity } from '../lib/aiReview';
import { focusField } from './QualityGate';
import { toast } from './Toast';
import { SparklesIcon, CheckIcon } from './Icons';
import TechStandards, { eaScopeForForm, stdQuestionsOpen, stdIssues } from './TechStandards';
import { qualityIssues } from '../lib/quality';
import type { TabId } from '../context/AiReviewContext';

/** The checks that roll through the loader, one per reviewer, and how long each stays in the centre (≈ 6.9 s). */
const WHEEL: { key: string; dept: Dept; en: string; ar: string; ms: number }[] = [
  { key: 'manager-0', dept: 'manager', en: 'Purpose, dates and supporting quotes', ar: 'الغرض والتواريخ وعروض الأسعار', ms: 600 },
  { key: 'risk-0', dept: 'risk', en: 'Continuity, service levels and exit', ar: 'الاستمرارية ومستويات الخدمة والخروج', ms: 600 },
  { key: 'ea-0', dept: 'ea', en: 'Scope of Work clarity', ar: 'وضوح نطاق العمل', ms: 700 },
  { key: 'ea-1', dept: 'ea', en: 'Technical standards from the EA library', ar: 'المعايير التقنية من مكتبة البنية المؤسسية', ms: 2200 },
  { key: 'cyber-0', dept: 'cyber', en: 'Security testing and personal data', ar: 'الاختبارات الأمنية والبيانات الشخصية', ms: 700 },
  { key: 'finance-0', dept: 'finance', en: 'Payment schedule and budget', ar: 'جدول الدفعات والميزانية', ms: 800 },
  { key: 'finqual-0', dept: 'finqual', en: 'Qualification weights and ranges', ar: 'أوزان التأهيل ونطاقاته', ms: 600 },
  { key: 'procurement-0', dept: 'procurement', en: 'Evaluation criteria and committee', ar: 'معايير التقييم واللجنة', ms: 700 },
];

/* ── Department look ─────────────────────────────────────────────────────── */
export const DEPT_TONE: Record<Dept, { tile: string; text: string; bar: string; ring: string }> = {
  manager: { tile: 'bg-neutral-100 text-neutral-700', text: 'text-neutral-700', bar: 'bg-neutral-500', ring: 'ring-neutral-200' },
  risk: { tile: 'bg-[#FDF1E8] text-[#B4501A]', text: 'text-[#B4501A]', bar: 'bg-[#E07B39]', ring: 'ring-[#F5D5BE]' },
  finqual: { tile: 'bg-[#E6F4F1] text-[#1F7A6B]', text: 'text-[#1F7A6B]', bar: 'bg-[#2A9D8F]', ring: 'ring-[#BFE3DC]' },
  finance: { tile: 'bg-success-50 text-success-700', text: 'text-success-700', bar: 'bg-success-500', ring: 'ring-success-200' },
  ea: { tile: 'bg-[#EAF2FA] text-[#2B6CB0]', text: 'text-[#2B6CB0]', bar: 'bg-[#2B6CB0]', ring: 'ring-[#C9DBEC]' },
  cyber: { tile: 'bg-error-50 text-error-600', text: 'text-error-600', bar: 'bg-error-500', ring: 'ring-error-200' },
  procurement: { tile: 'bg-warning-50 text-warning-700', text: 'text-warning-700', bar: 'bg-warning-500', ring: 'ring-warning-200' },
};
const DEPT_PATH: Record<Dept, string> = {
  manager: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  risk: 'M12 3l9.5 17h-19L12 3zM12 10v4M12 17h.01',
  finqual: 'M12 3l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 21l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2L12 3zM9 12l2 2 4-4',
  finance: 'M3 7h18v10H3zM3 10h18M7 14h3M16 14h1',
  ea: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  cyber: 'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3zM10 11.5V10a2 2 0 114 0v1.5M9 11.5h6v4H9z',
  procurement: 'M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1zM6 6h12v15H6zM9 11h6M9 15h4',
};
export function DeptIcon({ dept, size = 'md' }: { dept: Dept; size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'lg' ? 'w-10 h-10 rounded-xl' : size === 'md' ? 'w-8 h-8 rounded-lg' : 'w-6 h-6 rounded-md';
  const ic = size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  return (
    <span className={`${box} flex items-center justify-center flex-shrink-0 ${DEPT_TONE[dept].tile}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={ic}><path d={DEPT_PATH[dept]} /></svg>
    </span>
  );
}
const SEV: Record<Severity, { en: string; ar: string; cls: string }> = {
  return: { en: 'Would be returned', ar: 'سيُعاد الطلب', cls: 'bg-error-50 text-error-700 border-error-200' },
  improve: { en: 'Should fix', ar: 'يُستحسن الإصلاح', cls: 'bg-warning-50 text-warning-800 border-warning-200' },
  tip: { en: 'Suggestion', ar: 'اقتراح', cls: 'bg-neutral-50 text-neutral-600 border-neutral-200' },
};
const sectionTitle = (id: string, isAr: boolean) => { const s = SECTIONS.find((x) => x.id === id); return s ? (isAr ? s.titleAr : s.title) : id; };

/* ── Review & Confirm panel ──────────────────────────────────────────────── */
export default function AiReviewPanel() {
  const { phase, recs, state, stale, start, finish, ensureFresh, open, dismiss, reopen, tab: savedTab, setTab } = useAiReview();
  const { formData, sectionStatuses, goToSection } = useTender();
  const t = useT();
  const { isAr } = useLanguage();
  const [tick, setTick] = useState(0); // loader clock
  const ran = useRef(false);

  useEffect(() => { if (!ran.current) { ran.current = true; ensureFresh(); } }, [ensureFresh]);

  // Loader timeline: every check scrolls through the centre of a "watch wheel", one at a time.
  const wheel = WHEEL;
  const total = wheel.length;
  useEffect(() => {
    if (phase !== 'running') return;
    setTick(0);
    // Each check stays for its own time (some 1 s, the standards 3 s), then the wheel rolls on.
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 0;
    wheel.forEach((w, i) => { at += w.ms; timers.push(setTimeout(() => setTick((x) => Math.max(x, i + 1)), at)); });
    timers.push(setTimeout(() => setTick((x) => Math.max(x, total + 1)), at + 250));
    return () => timers.forEach(clearTimeout);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'running' || tick < total + 1) return;
    finish(); // opens on General when something is missing, else the first department with findings
  }, [tick, phase, total, finish, recs]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = (d: Dept) => recs.filter((r) => r.dept === d).length;
  const stdOpen = eaScopeForForm(formData).required ? stdQuestionsOpen(formData) + stdIssues(formData) : 0;
  const openCount = (d: Dept) => recs.filter((r) => r.dept === d && !state[r.id]).length + (d === 'ea' ? stdOpen : 0);

  if (phase === 'idle') return null;

  if (phase === 'running') {
    const cur = Math.min(total - 1, tick);
    const curDept = DEPTS.find((d) => d.id === wheel[cur].dept)!;
    const pct = Math.min(100, Math.round((tick / total) * 100));
    const ROW = 64;
    return (
      <div className="rounded-2xl border border-neutral-200 overflow-hidden relative" style={{ background: 'linear-gradient(180deg, #FCFDFE 0%, #F2F5F9 100%)' }} data-ai-review data-ai-loader>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(55% 50% at 50% 50%, rgba(255,255,255,0.95), rgba(255,255,255,0) 72%)' }} />
        <div className="relative px-6 pt-5 flex items-start gap-3.5">
          <span className="relative w-10 h-10 rounded-xl bg-ai-600 text-white flex items-center justify-center flex-shrink-0 ai-orb"><SparklesIcon className="w-5 h-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[15.5px] font-bold text-neutral-900">{t('Reviewing your request before it goes out', 'مراجعة طلبك قبل إرساله')}</p>
            <p key={curDept.id} className="text-[12.5px] text-neutral-500 ticker-in">{t(`Reading it as the ${curDept.role.en} would…`, `قراءته كما سيقرؤه ${curDept.role.ar}…`)}</p>
          </div>
          <button type="button" onClick={() => setTick(total + 1)} className="text-[12px] font-semibold text-neutral-500 hover:text-neutral-800" data-ai-skip>{t('Skip', 'تخطي')}</button>
        </div>

        {/* Watch-style wheel: the check being run sits large in the centre; done ones roll up, the next ones wait below */}
        <div className="relative h-[330px] mt-1" style={{ maskImage: 'linear-gradient(to bottom, transparent 0, #000 22%, #000 78%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 22%, #000 78%, transparent 100%)' }} data-ai-wheel>
          {wheel.map((w, i) => {
            const off = i - cur;
            const a = Math.abs(off);
            if (a > 3) return null;
            const done = i < cur || tick >= total;
            const center = off === 0 && tick < total;
            const scale = center ? 1.06 : 1 - a * 0.07;
            const nf = DEPTS.find((d) => d.id === w.dept)!;
            return (
              <div key={w.key} data-ai-wheel-item={w.key} data-state={center ? 'active' : done ? 'done' : 'queued'}
                className="absolute left-1/2 top-1/2 w-[min(440px,86%)] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: `translate(-50%, calc(-50% + ${off * ROW}px)) scale(${scale})`, opacity: center ? 1 : Math.max(0, 1 - a * 0.28), zIndex: 10 - a }}>
                <div className={`flex items-center gap-3.5 rounded-2xl px-4 ${center ? 'py-4 bg-white shadow-[0_18px_40px_-16px_rgba(16,24,40,0.35)]' : 'py-3 bg-white/80 border border-neutral-200/70'}`}>
                  <span className={done && !center ? 'opacity-70' : ''}><DeptIcon dept={w.dept} size={center ? 'lg' : 'md'} /></span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${center ? 'text-[17px] font-semibold text-neutral-900' : 'text-[14.5px] text-neutral-600'}`}>{t(w.en, w.ar)}</span>
                    {center && <span className="block text-[11.5px] text-neutral-400">{t(`${nf.en} perspective`, `منظور ${nf.ar}`)}</span>}
                  </span>
                  {center && <span className="w-4 h-4 rounded-full border-2 border-neutral-200 border-t-ai-600 animate-spin" />}
                  {done && !center && <span className="w-5 h-5 rounded-full bg-success-500 text-white flex items-center justify-center"><CheckIcon className="w-3 h-3" /></span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Departments finish one after another */}
        <div className="relative px-6 pb-5">
          <div className="h-1 rounded-full bg-neutral-200/70 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-ai-500 to-brand-500 transition-all duration-500 ease-out" style={{ width: `${pct}%` }} /></div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {DEPTS.map((d, i) => {
              const idx = wheel.map((w, k) => (w.dept === d.id ? k : -1)).filter((k) => k >= 0);
              const st = tick > idx[idx.length - 1] ? 'done' : tick >= idx[0] ? 'active' : 'queued';
              const n = count(d.id);
              return (
                <div key={d.id} data-ai-dept-row={d.id} data-state={st} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 transition-all duration-300 ${st === 'active' ? 'bg-white shadow-sm' : st === 'done' ? 'bg-white/70' : 'bg-white/30 opacity-60'}`}>
                  <DeptIcon dept={d.id} size="sm" />
                  <span className="flex-1 min-w-0 text-[12px] font-medium text-neutral-700 truncate">{t(d.short.en, d.short.ar)}</span>
                  {st === 'done'
                    ? <span className="pop-in text-[11px] font-semibold text-neutral-600 tabular-nums">{n ? t(`${n} found`, `${n}`) : '✓'}</span>
                    : st === 'active' ? <span className="w-3 h-3 rounded-full border-2 border-neutral-200 border-t-ai-600 animate-spin" /> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Results
  const reqIdxs = SECTIONS.map((_, i) => i).filter((i) => !['review', 'attachments'].includes(SECTIONS[i].id));
  const general: { id: string; title: string; why: string; meta?: string; go: () => void; label: string }[] = [
    ...reqIdxs.filter((i) => sectionStatuses[i] === 'missing' || sectionStatuses[i] === 'not-started').map((i) => ({
      id: `incomplete-${SECTIONS[i].id}`,
      title: t(`${SECTIONS[i].title} is incomplete`, `${SECTIONS[i].titleAr} غير مكتمل`),
      why: t('Required fields are still empty. Your manager returns incomplete requests.', 'ما زالت هناك حقول مطلوبة فارغة. يعيد مديرك الطلبات غير المكتملة.'),
      go: () => goToSection(i), label: t('Complete', 'إكمال'),
    })),
    ...SECTIONS.flatMap((sec, i) => qualityIssues(sec.id, formData).map((q) => ({
      id: q.id, title: isAr ? q.ar : q.en, why: isAr ? q.whyAr : q.whyEn, meta: isAr ? q.metaAr : q.metaEn,
      go: () => { goToSection(i); setTimeout(() => focusField(q.field), 450); }, label: t('Fix', 'إصلاح'),
    }))),
    ...(eaScopeForForm(formData).required && stdQuestionsOpen(formData) > 0 ? [{
      id: 'tech-questions', title: t(`Answer ${stdQuestionsOpen(formData)} question${stdQuestionsOpen(formData) === 1 ? '' : 's'} for the technical standards`, `أجب عن ${stdQuestionsOpen(formData)} من أسئلة المعايير التقنية`),
      why: t('A few things your request doesn’t say yet — EA needs them to pick the standards.', 'أمور لم يذكرها طلبك بعد — تحتاجها البنية المؤسسية لاختيار المعايير.'),
      go: () => { setTab('ea'); setTimeout(() => focusField('q-techStandards'), 120); }, label: t('Answer', 'إجابة'),
    }] : []),
    ...(stdIssues(formData) > 0 ? [{
      id: 'na-reason', title: t('Give a reason for each required standard marked not applicable', 'اذكر سبب كل معيار إلزامي محدد كغير منطبق'),
      why: t('EA only accepts "not applicable" with a reason.', 'لا تقبل البنية المؤسسية "غير منطبق" دون سبب.'),
      go: () => { setTab('ea'); setTimeout(() => focusField('q-techStandards'), 120); }, label: t('Fix', 'إصلاح'),
    }] : []),
  ];
  const totalRecs = recs.length + general.length;
  const returns = recs.filter((r) => r.severity === 'return' && !state[r.id]).length + general.length;
  const tab: TabId = savedTab ?? (general.length ? 'general' : DEPTS.find((d) => recs.some((r) => r.dept === d.id && !state[r.id]))?.id ?? 'finance');
  const list = tab === 'general' ? [] : recs.filter((r) => r.dept === tab);
  const dept = DEPTS.find((d) => d.id === tab);
  const tabs: { id: TabId; label: string; n: number; total: number }[] = [
    { id: 'general', label: t('General', 'عام'), n: general.length, total: general.length },
    ...DEPTS.map((d) => ({ id: d.id as TabId, label: t(d.role.en, d.role.ar), n: openCount(d.id), total: count(d.id) })),
  ];
  const DOT: Record<Severity, string> = { return: 'bg-error-500', improve: 'bg-warning-500', tip: 'bg-neutral-300' };

  const Row = ({ id, title, why, meta, sev, section, action, state: st, attrs, delay = 0 }: { id: string; title: string; why: string; meta?: ReactNode; sev: Severity; section?: string; action: ReactNode; state?: string; attrs?: Record<string, string>; delay?: number }) => (
    <li key={id} {...attrs} data-state={st ?? 'open'} className="rise-in py-4 flex items-start gap-4" style={{ animationDelay: `${delay}ms` }}>
      <span className={`mt-[7px] w-2 h-2 rounded-full flex-shrink-0 ${st === 'applied' ? 'bg-success-500' : st === 'dismissed' ? 'bg-neutral-200' : DOT[sev]}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-[14px] font-semibold leading-snug ${st === 'dismissed' ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>{title}</p>
        <p className="mt-1 text-[13px] text-neutral-500 leading-relaxed">{why}</p>
        <p className="mt-1.5 text-[12px] text-neutral-400">{t(SEV[sev].en, SEV[sev].ar)}{section ? ` · ${section}` : ''}{meta ? <> · {meta}</> : null}</p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-1.5 pt-0.5">{action}</div>
    </li>
  );
  const FixBtn = ({ onClick, children, attrs }: { onClick: () => void; children: ReactNode; attrs?: Record<string, string> }) => (
    <button type="button" onClick={onClick} {...attrs} className="h-8 px-3.5 rounded-full border border-brand-200 bg-white text-brand-700 text-[12.5px] font-semibold hover:bg-brand-50 inline-flex items-center gap-1.5 transition-colors">{children}</button>
  );

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]" data-ai-review data-ai-results>
      <div className="px-6 pt-5 pb-4 flex items-start gap-3">
        <span className="w-8 h-8 rounded-lg bg-ai-50 text-ai-600 flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-4 h-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-neutral-900">{t('AI pre-review', 'المراجعة المسبقة بالذكاء الاصطناعي')}</p>
          <p className="mt-0.5 text-[13px] text-neutral-500" data-ai-summary>
            {totalRecs === 0 ? t('Nothing to fix — every reviewer would accept this request.', 'لا شيء لإصلاحه — سيقبل كل مراجِع هذا الطلب.')
              : returns > 0 ? t(`${totalRecs} recommendations · ${returns} to fix before you submit`, `${totalRecs} توصية · ${returns} للإصلاح قبل التقديم`)
                : t(`${totalRecs} recommendations · nothing blocking`, `${totalRecs} توصية · لا شيء يمنع التقديم`)}
          </p>
        </div>
        <button type="button" onClick={start} data-ai-rerun className="text-[12.5px] font-semibold text-neutral-500 hover:text-neutral-800 inline-flex items-center gap-1.5 pt-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7" /></svg>
          {t('Review again', 'مراجعة مجدداً')}
        </button>
      </div>
      {stale && (
        <div className="mx-6 mb-3 rounded-lg bg-neutral-50 px-3.5 py-2 text-[12.5px] text-neutral-600 flex items-center gap-2" data-ai-stale>
          <span className="flex-1">{t('The request changed since this review.', 'تغيّر الطلب منذ هذه المراجعة.')}</span>
          <button type="button" onClick={start} className="font-semibold text-brand-700 hover:underline">{t('Review again', 'مراجعة مجدداً')}</button>
        </div>
      )}

      {/* Reviewers — a side rail that scales to any number of reviewers (becomes a scrolling row when narrow) */}
      <div className="@container border-t border-neutral-100">
      <div className="flex flex-col @[760px]:flex-row">
        <div role="tablist" aria-orientation="vertical" data-ai-rail
          className="flex @[760px]:flex-col gap-1 overflow-x-auto @[760px]:overflow-visible p-3 @[760px]:w-60 shrink-0 @[760px]:border-e border-neutral-100 @[760px]:bg-neutral-50/50">
          {tabs.map((x, i) => {
            const on = x.id === tab;
            return (
              <div key={x.id} className="contents">
                {i === 1 && <p className="hidden @[760px]:block px-2.5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{t('Reviewers', 'المراجِعون')}</p>}
                <button role="tab" aria-selected={on} data-ai-tab={x.id} onClick={() => setTab(x.id)} title={x.label}
                  className={`flex items-center gap-2.5 min-h-10 py-1.5 px-2.5 rounded-lg text-[13px] whitespace-nowrap @[760px]:whitespace-normal text-start transition-colors flex-shrink-0 ${on ? 'bg-white shadow-sm ring-1 ring-neutral-200 text-neutral-900 font-semibold' : 'text-neutral-600 hover:bg-white/70 hover:text-neutral-900'}`}>
                  {x.id === 'general'
                    ? <span className="w-6 h-6 rounded-md bg-neutral-200 text-neutral-600 flex items-center justify-center flex-shrink-0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" /></svg></span>
                    : <DeptIcon dept={x.id as Dept} size="sm" />}
                  <span className="flex-1 min-w-0 leading-tight">{x.label}</span>
                  <span className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-[11.5px] font-semibold tabular-nums flex items-center justify-center ${x.n ? (on ? 'bg-neutral-900 text-white' : 'bg-neutral-200/80 text-neutral-700') : 'text-success-600'}`} data-ai-tab-count={x.n}>{x.n || '✓'}</span>
                </button>
              </div>
            );
          })}
        </div>

      <div className="flex-1 min-w-0 px-6 pt-2 pb-4" role="tabpanel" key={tab}>
        <p className="pt-3 text-[15px] font-semibold text-neutral-900" data-ai-pane-title>{tabs.find((x) => x.id === tab)?.label}</p>
        {tab === 'general' ? (
          general.length === 0 ? (
            <div className="py-8 text-center fade-in" data-ai-empty>
              <span className="mx-auto w-10 h-10 rounded-full bg-success-50 text-success-600 flex items-center justify-center pop-in"><CheckIcon className="w-5 h-5" /></span>
              <p className="mt-2 text-[14px] font-semibold text-neutral-800">{t('Every step is complete', 'جميع الخطوات مكتملة')}</p>
              <p className="text-[12.5px] text-neutral-500">{t('Nothing your manager would send back.', 'لا شيء سيعيده مديرك.')}</p>
            </div>
          ) : (
            <>
              <p className="pt-3 text-[12.5px] text-neutral-500">{t('Missing or thin details your manager would send back. Submit unlocks once these are done.', 'تفاصيل ناقصة أو مختصرة سيعيدها مديرك. يُتاح التقديم بعد إكمالها.')}</p>
              <ul className="divide-y divide-neutral-100" data-before-submit>
                {general.map((g, i) => (
                  <Row key={g.id} id={g.id} title={g.title} why={g.why} meta={g.meta} sev="return" attrs={{ 'data-before-item': g.id, 'data-ai-general-item': g.id }} delay={i * 60}
                    action={<FixBtn onClick={g.go}>{g.label}</FixBtn>} />
                ))}
              </ul>
            </>
          )
        ) : (
          <>
            {list.length === 0 && !(tab === 'ea' && eaScopeForForm(formData).required) && (
              <div className="py-8 text-center fade-in" data-ai-empty>
                <span className="mx-auto w-10 h-10 rounded-full bg-success-50 text-success-600 flex items-center justify-center pop-in"><CheckIcon className="w-5 h-5" /></span>
                <p className="mt-2 text-[14px] font-semibold text-neutral-800">{t(`No concerns from ${dept?.en}`, `لا ملاحظات من ${dept?.ar}`)}</p>
                <p className="text-[12.5px] text-neutral-500">{t('This part of the request looks ready for their review.', 'هذا الجزء من الطلب يبدو جاهزاً لمراجعتهم.')}</p>
              </div>
            )}
            {list.length > 0 && (
              <ul className="divide-y divide-neutral-100">
                {list.map((r, i) => {
                  const st = state[r.id];
                  return (
                    <Row key={r.id} delay={i * 60} id={r.id} title={isAr ? r.title.ar : r.title.en} why={isAr ? r.why.ar : r.why.en} sev={r.severity} section={sectionTitle(r.section, isAr)} state={st}
                      attrs={{ 'data-ai-rec': r.id }}
                      action={!st ? (<>
                        <FixBtn onClick={() => open(r.id)} attrs={{ 'data-ai-fix': r.id }}>{r.apply && <SparklesIcon className="w-3.5 h-3.5" />}{r.apply ? t('Fix it', 'إصلاح') : t('Show me', 'أرني')}</FixBtn>
                        <button type="button" onClick={() => dismiss(r.id)} title={t('Dismiss', 'تجاهل')} aria-label={t('Dismiss', 'تجاهل')} className="w-8 h-8 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 flex items-center justify-center">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                        </button>
                      </>) : st === 'applied'
                        ? <span className="pop-in inline-flex items-center gap-1 text-[12.5px] font-semibold text-success-700"><CheckIcon className="w-3.5 h-3.5" />{t('Applied', 'تم التطبيق')}</span>
                        : <button type="button" onClick={() => reopen(r.id)} className="text-[12.5px] font-semibold text-neutral-500 hover:text-neutral-800">{t('Undo dismiss', 'تراجع')}</button>} />
                  );
                })}
              </ul>
            )}
            {tab === 'ea' && eaScopeForForm(formData).required && (
              <section id="q-techStandards" className={`rise-in ${list.length ? 'mt-2 pt-5 border-t border-neutral-100' : 'pt-4'}`} data-ai-standards>
                <div className="flex items-center gap-2.5 mb-3">
                  <p className="flex-1 text-[14px] font-semibold text-neutral-900">{t('Technical standards', 'المعايير التقنية')}</p>
                  {stdOpen > 0
                    ? <span className="text-[12px] text-warning-700">{t(`${stdOpen} to complete`, `${stdOpen} للإكمال`)}</span>
                    : <span className="text-[12px] text-success-700">{t('Ready for EA', 'جاهزة للبنية المؤسسية')}</span>}
                </div>
                <TechStandards />
              </section>
            )}
          </>
        )}
      </div>
      </div>
      </div>
    </div>
  );
}

/* ── In-step panel: the recommendation, the suggested change, Apply it ──── */
export function AiFixPanel() {
  const { activeId, recs, state, apply, dismiss, close } = useAiReview();
  const { goToSection, currentSection } = useTender();
  const t = useT();
  const { isAr } = useLanguage();
  const r = recs.find((x) => x.id === activeId);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (r) setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80); }, [r?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!r || SECTIONS[currentSection]?.id !== r.section) return null;
  const st = state[r.id];
  const dept = DEPTS.find((d) => d.id === r.dept)!;
  const back = () => { close(); goToSection(SECTIONS.findIndex((s) => s.id === 'review')); };
  const doApply = () => {
    apply(r.id);
    toast(t('AI recommendation applied.', 'تم تطبيق توصية الذكاء الاصطناعي.'));
    if (r.field) setTimeout(() => focusField(r.field!), 250);
  };
  const p = r.proposal;
  const block = (label: string, body: ReactNode, tone: 'muted' | 'ai') => (
    <div className={`rounded-xl border px-4 py-3 ${tone === 'ai' ? 'border-ai-200 bg-ai-50/50' : 'border-neutral-200 bg-neutral-50/70'}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${tone === 'ai' ? 'text-ai-700' : 'text-neutral-400'}`}>{label}</p>
      {body}
    </div>
  );
  return (
    <div ref={ref} className="rise-in scroll-mt-4" data-ai-fix-panel={r.id}>
    <div className="ai-review-card rounded-2xl p-[1.5px]">
      <div className="rounded-[15px] bg-white px-5 py-4">
        <div className="flex items-start gap-3.5">
          <DeptIcon dept={r.dept} size="lg" />
          <div className="min-w-0 flex-1">
            <p className={`text-[11.5px] font-semibold ${DEPT_TONE[r.dept].text}`}>{t(`${dept.role.en} recommendation`, `توصية ${dept.role.ar}`)} · <span className="text-neutral-400 font-medium">{t('AI pre-review', 'المراجعة المسبقة')}</span></p>
            <p className="mt-0.5 text-[15px] font-bold text-neutral-900 leading-snug">{isAr ? r.title.ar : r.title.en}</p>
            <p className="mt-0.5 text-[12.5px] text-neutral-600 leading-relaxed">{isAr ? r.why.ar : r.why.en}</p>
          </div>
          <button type="button" onClick={close} aria-label={t('Close', 'إغلاق')} className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {p?.kind === 'text' && <>
            {!p.append && p.current.trim() && block(t('Current', 'الحالي'), <p className="text-[12.5px] text-neutral-500 whitespace-pre-line">{p.current}</p>, 'muted')}
            {block(isAr ? p.label.ar : p.label.en, <p className="text-[13px] text-neutral-800 leading-relaxed whitespace-pre-line" data-ai-proposal>{p.value}</p>, 'ai')}
            {p.append && <p className="text-[11.5px] text-neutral-500">{t('Added after your current terms — nothing you wrote is removed.', 'يُضاف بعد شروطك الحالية — لا يُحذف شيء مما كتبته.')}</p>}
          </>}
          {p?.kind === 'rows' && block(isAr ? p.label.ar : p.label.en, (
            <ul className="space-y-1.5" data-ai-proposal>
              {p.rows.map((x, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-lg bg-white border border-ai-100 px-3 py-2 rise-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-ai-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">+</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-neutral-900">{x.title}</p>
                    {x.sub && <p className="text-[12px] text-neutral-600 leading-snug">{x.sub}</p>}
                  </div>
                  {x.badge && <span className="text-[11.5px] font-bold text-ai-700 tabular-nums" dir="ltr">{x.badge}</span>}
                </li>
              ))}
              {!!p.replaces && <li className="text-[11.5px] text-neutral-500 pt-1">{t(`Replaces the ${p.replaces} current row${p.replaces === 1 ? '' : 's'}.`, `يستبدل الصفوف الحالية (${p.replaces}).`)}</li>}
            </ul>
          ), 'ai')}
          {p?.kind === 'value' && (
            <div className="flex items-center gap-3">
              <div className="flex-1">{block(t('Current', 'الحالي'), <p className="text-[18px] font-bold text-neutral-400">{p.current}</p>, 'muted')}</div>
              <span className="text-neutral-300 text-xl rtl:rotate-180">→</span>
              <div className="flex-1">{block(isAr ? p.label.ar : p.label.en, <p className="text-[18px] font-bold text-ai-700" data-ai-proposal>{p.value}</p>, 'ai')}</div>
            </div>
          )}
          {!p && r.manual && block(t('What to do', 'ما المطلوب'), <p className="text-[13px] text-neutral-800">{isAr ? r.manual.ar : r.manual.en}</p>, 'ai')}
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {st === 'applied' ? (
            <>
              <span className="pop-in inline-flex items-center gap-1.5 text-[13px] font-semibold text-success-700 me-auto" data-ai-applied><span className="w-5 h-5 rounded-full bg-success-500 text-white flex items-center justify-center"><CheckIcon className="w-3 h-3" /></span>{t('Applied to your request', 'تم التطبيق على طلبك')}</span>
              <button type="button" data-ai-back onClick={back} className="h-9 px-4 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700">{t('Back to Review & Confirm', 'العودة إلى المراجعة والتأكيد')}</button>
            </>
          ) : (
            <>
              {r.apply
                ? <button type="button" data-ai-apply onClick={doApply} className="h-9 px-4 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700 inline-flex items-center gap-1.5 shadow-sm"><SparklesIcon className="w-3.5 h-3.5" />{t('Apply it', 'تطبيق')}</button>
                : <button type="button" onClick={() => { if (r.field) focusField(r.field); }} className="h-9 px-4 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700">{t('Take me to the field', 'انتقل إلى الحقل')}</button>}
              <button type="button" data-ai-back onClick={back} className="h-9 px-3.5 rounded-lg border border-neutral-300 text-[13px] font-semibold text-neutral-700 hover:bg-neutral-50">{t('Back to review', 'العودة للمراجعة')}</button>
              <button type="button" onClick={() => { dismiss(r.id); back(); }} className="h-9 px-3.5 rounded-lg text-[13px] font-semibold text-neutral-600 hover:bg-neutral-100">{t('Dismiss', 'تجاهل')}</button>
            </>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
