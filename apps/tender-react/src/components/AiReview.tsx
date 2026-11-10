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

/** The checks that roll through the loader, and how long each stays in the centre (≈ 6.8 s in all). */
const WHEEL: { key: string; dept: Dept; en: string; ar: string; ms: number }[] = [
  { key: 'finance-0', dept: 'finance', en: 'Payment schedule and budget', ar: 'جدول الدفعات والميزانية', ms: 1000 },
  { key: 'ea-0', dept: 'ea', en: 'Scope of Work clarity', ar: 'وضوح نطاق العمل', ms: 1000 },
  { key: 'ea-1', dept: 'ea', en: 'Technical standards from the EA library', ar: 'المعايير التقنية من مكتبة البنية المؤسسية', ms: 3000 },
  { key: 'cyber-0', dept: 'cyber', en: 'Security testing and personal data', ar: 'الاختبارات الأمنية والبيانات الشخصية', ms: 1000 },
  { key: 'procurement-0', dept: 'procurement', en: 'Evaluation criteria and committee', ar: 'معايير التقييم واللجنة', ms: 800 },
];

/* ── Department look ─────────────────────────────────────────────────────── */
export const DEPT_TONE: Record<Dept, { tile: string; text: string; bar: string; ring: string }> = {
  finance: { tile: 'bg-success-50 text-success-700', text: 'text-success-700', bar: 'bg-success-500', ring: 'ring-success-200' },
  ea: { tile: 'bg-[#EAF2FA] text-[#2B6CB0]', text: 'text-[#2B6CB0]', bar: 'bg-[#2B6CB0]', ring: 'ring-[#C9DBEC]' },
  cyber: { tile: 'bg-error-50 text-error-600', text: 'text-error-600', bar: 'bg-error-500', ring: 'ring-error-200' },
  procurement: { tile: 'bg-warning-50 text-warning-700', text: 'text-warning-700', bar: 'bg-warning-500', ring: 'ring-warning-200' },
};
const DEPT_PATH: Record<Dept, string> = {
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
  const { formData } = useTender();
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
    finish();
    if (!savedTab) {
      const first = DEPTS.find((d) => recs.some((r) => r.dept === d.id && r.severity === 'return')) ?? DEPTS.find((d) => recs.some((r) => r.dept === d.id));
      if (first) setTab(first.id);
    }
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
      <div className="rounded-2xl bg-[#EFEDE8] overflow-hidden relative" data-ai-review data-ai-loader>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(60% 55% at 50% 52%, rgba(255,255,255,0.9), rgba(255,255,255,0) 70%)' }} />
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
                <div className={`flex items-center gap-3.5 rounded-2xl px-4 ${center ? 'py-4 bg-white shadow-[0_18px_40px_-16px_rgba(16,24,40,0.35)]' : 'py-3 bg-white/70 backdrop-blur-sm'}`}>
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
          <div className="h-1 rounded-full bg-black/5 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-ai-500 to-brand-500 transition-all duration-500 ease-out" style={{ width: `${pct}%` }} /></div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DEPTS.map((d, i) => {
              const idx = wheel.map((w, k) => (w.dept === d.id ? k : -1)).filter((k) => k >= 0);
              const st = tick > idx[idx.length - 1] ? 'done' : tick >= idx[0] ? 'active' : 'queued';
              const n = count(d.id);
              return (
                <div key={d.id} data-ai-dept-row={d.id} data-state={st} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 transition-all duration-300 ${st === 'active' ? 'bg-white shadow-sm' : st === 'done' ? 'bg-white/70' : 'bg-white/30 opacity-60'}`}>
                  <DeptIcon dept={d.id} size="sm" />
                  <span className="flex-1 min-w-0 text-[12px] font-medium text-neutral-700 truncate">{t(d.en, d.ar)}</span>
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
  const totalRecs = recs.length;
  const returns = recs.filter((r) => r.severity === 'return' && !state[r.id]).length;
  const resolved = recs.filter((r) => state[r.id]).length;
  const tab: Dept = savedTab ?? (DEPTS.find((d) => recs.some((r) => r.dept === d.id && !state[r.id]))?.id ?? 'finance');
  const list = recs.filter((r) => r.dept === tab);
  const dept = DEPTS.find((d) => d.id === tab)!;
  return (
    <div className="ai-review-card rounded-2xl p-[1.5px]" data-ai-review data-ai-results>
      <div className="rounded-[15px] bg-white overflow-hidden">
        <div className="px-5 pt-4 pb-3 flex items-center gap-3.5 flex-wrap">
          <span className="w-10 h-10 rounded-xl bg-ai-600 text-white flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-neutral-900">{t('AI pre-review', 'المراجعة المسبقة بالذكاء الاصطناعي')}</p>
            <p className="text-[12.5px] text-neutral-500" data-ai-summary>
              {totalRecs === 0 ? t('No concerns from any department — ready to submit.', 'لا ملاحظات من أي إدارة — جاهز للتقديم.')
                : <>{t(`${totalRecs} recommendations from 4 departments`, `${totalRecs} توصية من 4 إدارات`)}{returns > 0 && <span className="text-error-700 font-semibold"> · {t(`${returns} would get the request returned`, `${returns} قد تؤدي إلى إعادة الطلب`)}</span>}{resolved > 0 && <span className="text-success-700"> · {t(`${resolved} resolved`, `${resolved} تمت معالجتها`)}</span>}</>}
            </p>
          </div>
          <button type="button" onClick={start} data-ai-rerun className="h-8 px-3 rounded-lg border border-neutral-300 text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50 inline-flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7" /></svg>
            {t('Review again', 'مراجعة مجدداً')}
          </button>
        </div>
        {stale && (
          <div className="mx-5 mb-3 rounded-lg bg-warning-50 border border-warning-200 px-3 py-2 text-[12px] text-warning-900 flex items-center gap-2" data-ai-stale>
            <span className="flex-1">{t('The request changed since this review.', 'تغيّر الطلب منذ هذه المراجعة.')}</span>
            <button type="button" onClick={start} className="font-semibold underline">{t('Review again', 'مراجعة مجدداً')}</button>
          </div>
        )}

        {/* Tabs — one per reviewing department */}
        <p className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{t('Recommendations by reviewer', 'التوصيات حسب المراجِع')}</p>
        <div role="tablist" className="px-3 flex gap-1 border-b border-neutral-200 overflow-x-auto">
          {DEPTS.map((d) => {
            const on = d.id === tab;
            const n = count(d.id), o = openCount(d.id);
            return (
              <button key={d.id} role="tab" aria-selected={on} data-ai-tab={d.id} onClick={() => setTab(d.id)}
                className={`relative flex items-center gap-2 px-3 py-2.5 text-[13px] whitespace-nowrap transition-colors ${on ? 'text-neutral-900 font-semibold' : 'text-neutral-500 hover:text-neutral-800'}`}>
                <DeptIcon dept={d.id} size="sm" />
                {t(d.role.en, d.role.ar)}
                <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums ${o ? 'bg-neutral-900 text-white' : n ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-500'}`} data-ai-tab-count={o}>
                  {o || (n ? '✓' : 0)}
                </span>
                {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600 tab-ink" />}
              </button>
            );
          })}
        </div>

        <div className="px-5 py-4" role="tabpanel" key={tab}>
          {list.length === 0 && tab === 'ea' && eaScopeForForm(formData).required ? null : list.length === 0 ? (
            <div className="py-6 flex flex-col items-center text-center fade-in" data-ai-empty>
              <span className="w-10 h-10 rounded-full bg-success-50 text-success-600 flex items-center justify-center pop-in"><CheckIcon className="w-5 h-5" /></span>
              <p className="mt-2 text-[13.5px] font-semibold text-neutral-800">{t(`No concerns from ${dept.en}`, `لا ملاحظات من ${dept.ar}`)}</p>
              <p className="text-[12px] text-neutral-500">{t('This part of the request looks ready for their review.', 'هذا الجزء من الطلب يبدو جاهزاً لمراجعتهم.')}</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {list.map((r, i) => {
                const s = state[r.id];
                return (
                  <li key={r.id} data-ai-rec={r.id} data-state={s ?? 'open'} className={`rise-in rounded-xl border px-4 py-3.5 transition-colors ${s === 'applied' ? 'border-success-200 bg-success-50/40' : s === 'dismissed' ? 'border-neutral-200 bg-neutral-50/60 opacity-70' : 'border-neutral-200 bg-white hover:border-neutral-300'}`} style={{ animationDelay: `${i * 55}ms` }}>
                    <div className="flex items-start gap-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded border text-[10.5px] font-semibold ${SEV[r.severity].cls}`}>{t(SEV[r.severity].en, SEV[r.severity].ar)}</span>
                          <span className="text-[11px] text-neutral-400">{sectionTitle(r.section, isAr)}</span>
                        </div>
                        <p className={`mt-1 text-[13.5px] font-semibold leading-snug ${s === 'dismissed' ? 'text-neutral-500 line-through' : 'text-neutral-900'}`}>{isAr ? r.title.ar : r.title.en}</p>
                        <p className="mt-0.5 text-[12.5px] text-neutral-600 leading-relaxed">{isAr ? r.why.ar : r.why.en}</p>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1">
                        {!s && (
                          <button type="button" data-ai-fix={r.id} onClick={() => open(r.id)}
                            className="h-8 px-3.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-semibold hover:bg-brand-700 inline-flex items-center gap-1.5 shadow-sm">
                            {r.apply ? <SparklesIcon className="w-3.5 h-3.5" /> : null}{r.apply ? t('Fix it', 'إصلاح') : t('Show me', 'أرني')}
                          </button>
                        )}
                        {s === 'applied' && <span className="pop-in inline-flex items-center gap-1 text-[12px] font-semibold text-success-700"><CheckIcon className="w-3.5 h-3.5" />{t('Applied', 'تم التطبيق')}</span>}
                        {s === 'dismissed' && <span className="text-[12px] text-neutral-500">{t('Dismissed', 'تم التجاهل')} · <button type="button" onClick={() => reopen(r.id)} className="font-semibold text-brand-700 hover:underline">{t('Undo', 'تراجع')}</button></span>}
                        {!s && <button type="button" onClick={() => dismiss(r.id)} className="text-[11.5px] text-neutral-400 hover:text-neutral-700">{t('Dismiss', 'تجاهل')}</button>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {tab === 'ea' && eaScopeForForm(formData).required && (
            <section id="q-techStandards" className={`rise-in rounded-xl border border-neutral-200 px-4 py-4 ${list.length ? 'mt-4' : ''}`} style={{ animationDelay: `${list.length * 55 + 60}ms` }} data-ai-standards>
              <div className="flex items-center gap-2.5 mb-3">
                <DeptIcon dept="ea" size="sm" />
                <p className="flex-1 text-[14px] font-bold text-neutral-900">{t('Technical standards', 'المعايير التقنية')}</p>
                {stdOpen > 0
                  ? <span className="px-2 py-0.5 rounded-full bg-warning-50 text-warning-800 text-[11px] font-semibold">{t(`${stdOpen} to complete`, `${stdOpen} للإكمال`)}</span>
                  : <span className="px-2 py-0.5 rounded-full bg-success-50 text-success-700 text-[11px] font-semibold">{t('Ready for EA', 'جاهزة للبنية المؤسسية')}</span>}
              </div>
              <TechStandards />
            </section>
          )}
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
              <button type="button" onClick={() => { dismiss(r.id); back(); }} className="h-9 px-3.5 rounded-lg text-[13px] font-semibold text-neutral-600 hover:bg-neutral-100">{t('Dismiss', 'تجاهل')}</button>
              <button type="button" data-ai-back onClick={back} className="ms-auto h-9 px-3.5 rounded-lg border border-neutral-300 text-[13px] font-semibold text-neutral-700 hover:bg-neutral-50">{t('Back to review', 'العودة للمراجعة')}</button>
            </>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
