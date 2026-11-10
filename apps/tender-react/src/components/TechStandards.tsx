// Review & Confirm → "Technical standards": the EA / Cybersecurity / PMO requirements
// library, worked out from what the earlier steps captured (scope, BOQ, items…). Only what the
// request doesn't say is asked, as Yes/No. Required standards can't be removed — only marked
// Not applicable with a reason.
import { useEffect, useState } from 'react';
import type { TenderFormData } from '../types/tender';
import { useTender } from '../context/TenderContext';
import { useT, useLanguage } from '../context/LanguageContext';
import { SparklesIcon, ChevronDownIcon, CheckIcon } from './Icons';
import { PROJECTS, ALL_COST_CENTERS } from '../data/mockData';
import {
  eaScope, suggestStandards, stdById, stdBecause, questionsFor, deploymentFrom, STD_LIBRARY, STD_GROUPS, STD_VERSION, STD_QUESTIONS,
  type Deployment, type StdGroup, type StdSelection, type EaScope, type Answers, type QuestionId, type StdQuestion, type SrcText, type Guess,
} from '../lib/eaStandards';

/** EA scope for the request being created. */
export function eaScopeForForm(f: TenderFormData): EaScope {
  const proj = PROJECTS.find((p) => p.id === f.projectId);
  const budgeted = (proj?.items ?? []).filter((it) => (f.selectedProjectItemIds ?? []).includes(it.id)).map((it) => it.name);
  const cc = ALL_COST_CENTERS.find((c) => c.id === f.costCenterId);
  return eaScope({
    texts: [...budgeted, ...f.boqItems.map((b) => `${b.itemName} ${b.itemDescription}`)],
    department: cc?.name ?? '',
  });
}

/** Missing N/A reasons on required standards — used for step validation. */
export function stdIssues(f: TenderFormData) {
  return (f.techStandards ?? []).filter((s) => s.status === 'na' && stdById(s.id)?.required && !s.naReason?.trim()).length;
}

const LockGlyph = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
);

const TONE: Record<StdQuestion['tone'], string> = {
  brand: 'bg-brand-50 text-brand-600', ai: 'bg-ai-50 text-ai-600', warning: 'bg-warning-50 text-warning-600',
  success: 'bg-success-50 text-success-600', error: 'bg-error-50 text-error-600', info: 'bg-[#EAF2FA] text-[#2B6CB0]',
};
const QPATH: Record<QuestionId, string> = {
  saas: 'M7 18a4.5 4.5 0 01-.6-8.96A6 6 0 0118 9a4 4 0 01-1 9H7z',
  'own-servers': 'M4 5h16v5H4zM4 14h16v5H4zM8 7.5h.01M8 16.5h.01',
  build: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z',
  integrates: 'M9 7H6a3 3 0 000 6h3M15 7h3a3 3 0 010 6h-3M8 10h8M9 17v3M15 17v3',
  migration: 'M4 7h12l-3-3M20 17H8l3 3',
  'personal-data': 'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3zM9.5 12l1.8 1.8L15 10',
  'external-users': 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
  critical: 'M13 2L4.5 13.5H12L11 22l8.5-11.5H12z',
  ai: 'M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2M12 9a3 3 0 100 6 3 3 0 000-6z',
};
export const QIcon = ({ q, size = 'lg' }: { q: StdQuestion; size?: 'lg' | 'sm' }) => (
  <span className={`${size === 'lg' ? 'w-11 h-11 rounded-xl' : 'w-7 h-7 rounded-lg'} flex items-center justify-center flex-shrink-0 ${TONE[q.tone]}`}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'}><path d={QPATH[q.id]} /></svg>
  </span>
);
const DEPLOY_LABEL: Record<Deployment, [string, string]> = { saas: ['SaaS', 'SaaS'], 'on-prem': ['On-premises', 'محلي'], hybrid: ['Hybrid', 'هجين'] };

type TT = (en: string, ar: string) => string;
type StdRow = { id: string; status: 'included' | 'na'; naReason?: string; naReasonAr?: string };

/** Deployment model as a result card (creation, Review & Confirm, EA task). */
export function DeploymentHero({ deployment, answers, isAr, t, compact }: { deployment: Deployment; answers?: Answers; isAr: boolean; t: TT; compact?: boolean }) {
  const q = STD_QUESTIONS.find((x) => x.id === (deployment === 'on-prem' ? 'own-servers' : 'saas'))!;
  const basis = (['saas', 'own-servers'] as QuestionId[]).filter((id) => answers?.[id] !== undefined)
    .map((id) => { const x = STD_QUESTIONS.find((y) => y.id === id)!; return `${isAr ? x.shortAr : x.short}: ${answers![id] ? t('Yes', 'نعم') : t('No', 'لا')}`; });
  return (
    <div className={`rounded-xl border border-neutral-200 bg-gradient-to-br from-white to-neutral-50/70 ${compact ? 'px-3.5 py-3' : 'px-4 py-3.5'} flex items-center gap-3.5`} data-deploy-result={deployment}>
      <QIcon q={q} />
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-medium text-neutral-500">{t('Deployment model', 'نموذج النشر')}</p>
        <p className="text-[15px] font-semibold text-neutral-900 leading-tight flex items-center gap-2 flex-wrap">
          {t(DEPLOY_LABEL[deployment][0], DEPLOY_LABEL[deployment][1])}
          {deployment === 'saas'
            ? <span className="px-1.5 py-0.5 rounded bg-success-50 text-success-700 text-[10.5px] font-semibold">{t('EA preferred', 'المفضل لدى البنية المؤسسية')}</span>
            : <span className="px-1.5 py-0.5 rounded bg-warning-50 text-warning-800 text-[10.5px] font-semibold">{t('Needs justification — SaaS first', 'يتطلب مبرراً — SaaS أولاً')}</span>}
        </p>
        {basis.length > 0 && <p className="text-[12px] text-neutral-500 mt-0.5">{basis.join(' · ')}</p>}
      </div>
    </div>
  );
}

/** The requester's answers as a tidy grid of tiles. */
export function ProjectProfile({ answers, isAr, t }: { answers: Answers; isAr: boolean; t: TT }) {
  const qs = STD_QUESTIONS.filter((q) => answers[q.id] !== undefined);
  if (!qs.length) return null;
  return (
    <div className="@container" data-ea-answers>
      <div className="grid grid-cols-1 @[420px]:grid-cols-2 @[680px]:grid-cols-3 gap-2">
        {qs.map((q) => {
          const yes = !!answers[q.id];
          return (
            <div key={q.id} data-answer={q.id} data-yes={yes || undefined}
              className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 ${yes ? 'border-neutral-200 bg-white' : 'border-dashed border-neutral-200 bg-neutral-50/60'}`}>
              <span className={yes ? '' : 'opacity-50 grayscale'}><QIcon q={q} size="sm" /></span>
              <span className={`flex-1 min-w-0 text-[12.5px] leading-snug ${yes ? 'text-neutral-800 font-medium' : 'text-neutral-500'}`}>{isAr ? q.shortAr : q.short}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold ${yes ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-500'}`}>{yes ? t('Yes', 'نعم') : t('No', 'لا')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Standards as a clean list: check / N/A, text, owner + required chips aligned right. */
export function StandardsList({ rows, isAr, t }: { rows: StdRow[]; isAr: boolean; t: TT }) {
  return (
    <ul className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 bg-white">
      {rows.map((x) => {
        const d = stdById(x.id); if (!d) return null;
        const na = x.status === 'na';
        return (
          <li key={x.id} data-std-row={x.id} className="flex items-start gap-3 px-3.5 py-2.5">
            {na
              ? <span className="mt-0.5 px-1.5 rounded bg-warning-50 text-warning-800 text-[10px] font-bold flex-shrink-0">{t('N/A', 'غ/م')}</span>
              : <span className="mt-0.5 w-4 h-4 rounded-full bg-success-50 text-success-600 flex items-center justify-center flex-shrink-0"><CheckIcon className="w-2.5 h-2.5" /></span>}
            <div className="min-w-0 flex-1">
              <p className={`text-[12.5px] leading-snug ${na ? 'text-neutral-500' : 'text-neutral-800'}`}>{isAr ? d.ar : d.en}</p>
              {na && (x.naReason || x.naReasonAr) && <p className="mt-1 text-[11.5px] text-warning-800"><span className="font-semibold">{t('Reason', 'السبب')}:</span> {isAr ? x.naReasonAr ?? x.naReason : x.naReason}</p>}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 text-[10.5px] font-semibold">
              {d.required && <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">{t('Required', 'إلزامي')}</span>}
              <span className="px-1.5 py-0.5 rounded border border-neutral-200 text-neutral-500">{d.owner}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Everything the earlier steps captured, with where it came from — the answers are read from this. */
function textsFor(f: TenderFormData): SrcText[] {
  const proj = PROJECTS.find((p) => p.id === f.projectId);
  const out: SrcText[] = [];
  const add = (en: string, ar: string, text?: string) => { if (text?.trim()) out.push({ src: { en, ar }, text: text.trim() }); };
  for (const it of (proj?.items ?? []).filter((x) => (f.selectedProjectItemIds ?? []).includes(x.id))) add('Project items', 'بنود المشروع', it.name);
  for (const b of f.boqItems) add('BOQ', 'جدول الكميات', `${b.itemName} — ${b.itemDescription}`.replace(/ — $/, ''));
  add('Scope of Work', 'نطاق العمل', f.scopeOfWork);
  add('Purpose', 'الغرض', f.tenderingPurpose);
  add('Project includes', 'يشمل المشروع', (f.scopeIncludes ?? []).join(', '));
  add('Terms', 'الشروط', f.scopeTerms);
  for (const r of f.technicalRequirements) add('Technical requirements', 'المتطلبات الفنية', `${r.requirement} — ${r.description}`);
  for (const d of f.deliverables) add('Deliverables', 'المخرجات', `${d.deliverableName} ${d.description}`);
  return out;
}

/** Answers for this request: the requester's own, else read from the earlier steps. */
export function resolveAnswers(f: TenderFormData) {
  const scope = eaScopeForForm(f);
  const texts = textsFor(f);
  const user = (f.techAnswers ?? {}) as Answers;
  const a: Answers = {};
  const derived: Partial<Record<QuestionId, Guess>> = {};
  const qs: StdQuestion[] = [];
  for (const q of STD_QUESTIONS) {
    if (q.ask && !q.ask({ scope, texts, answers: a })) continue;
    qs.push(q);
    if (user[q.id] !== undefined) { a[q.id] = user[q.id]; continue; }
    const g = q.guess?.({ scope, texts, answers: a });
    if (g) { a[q.id] = g.yes; derived[q.id] = g; }
  }
  return { scope, texts, answers: a, derived, qs, user };
}

/** Questions the earlier steps couldn't answer — asked in Review & Confirm. */
export function stdQuestionsOpen(f: TenderFormData) {
  const r = resolveAnswers(f);
  if (!r.scope.required) return 0;
  return r.qs.filter((q) => r.answers[q.id] === undefined).length;
}

/** Keeps the standards built from the answers (Review & Confirm) — rebuilds when the answers change,
 *  keeping the requester's N/A notes and own picks. */
export function useAutoBuildStandards() {
  const { formData, updateField } = useTender();
  const { scope, answers, qs } = resolveAnswers(formData);
  const complete = scope.required && qs.every((q) => answers[q.id] !== undefined);
  const deployment: Deployment = deploymentFrom(scope, answers);
  const key = JSON.stringify([deployment, answers]);
  useEffect(() => {
    if (!complete || formData.techStdKey === key) return;
    const sel = formData.techStandards ?? [];
    const want = suggestStandards(deployment, answers);
    const keptUser = sel.filter((s) => !s.ai && !stdById(s.id)?.required && !want.some((w) => w.id === s.id));
    const next = [...want.map((w) => { const prev = sel.find((x) => x.id === w.id); return prev ? { ...prev, ai: w.ai } : w; }), ...keptUser];
    updateField('techStandards', next);
    updateField('deploymentModel', deployment);
    updateField('techStdKey', key);
  }, [complete, key]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Review & Confirm → Technical standards. Built automatically from the request; asks only what's missing. */
export default function TechStandards() {
  const { formData, updateField } = useTender();
  const t = useT();
  const { isAr } = useLanguage();
  const [open, setOpen] = useState<StdGroup | null>(null);
  const [asking, setAsking] = useState<QuestionId | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const L = (o: { en: string; ar: string }) => (isAr ? o.ar : o.en);
  const { scope, answers, derived, qs, user } = resolveAnswers(formData);
  const missing = qs.filter((q) => answers[q.id] === undefined);
  const complete = scope.required && missing.length === 0;
  const deployment: Deployment = deploymentFrom(scope, answers);
  const sel = formData.techStandards ?? [];
  const key = JSON.stringify([deployment, answers]);


  if (!scope.required) return null;

  const qById = (id: QuestionId) => STD_QUESTIONS.find((q) => q.id === id)!;
  const current = asking ? qById(asking) : missing[0];
  const get = (id: string) => sel.find((s) => s.id === id);
  const put = (next: StdSelection[]) => updateField('techStandards', next);
  const toggle = (id: string) => put(get(id) ? sel.filter((s) => s.id !== id) : [...sel, { id, status: 'included' }]);
  const setNa = (id: string, na: boolean) => put(sel.map((s) => (s.id === id ? { ...s, status: na ? 'na' : 'included', naReason: na ? s.naReason ?? '' : undefined } : s)));
  const setReason = (id: string, naReason: string) => put(sel.map((s) => (s.id === id ? { ...s, naReason } : s)));
  const answer = (q: StdQuestion, yes: boolean) => { updateField('techAnswers', { ...user, [q.id]: yes }); setAsking(null); };

  const built = complete && sel.length > 0 && formData.techStdKey === key;
  const included = sel.filter((s) => s.status === 'included').length;
  const na = sel.filter((s) => s.status === 'na').length;
  const allGroups = Object.keys(STD_GROUPS) as StdGroup[];
  const usedGroups = allGroups.filter((g) => sel.some((s) => stdById(s.id)?.group === g));
  const groups = showLibrary ? allGroups : usedGroups;
  const hiddenGroups = allGroups.length - usedGroups.length;

  return (
    <div className="space-y-4 @container" data-tech-standards data-std-phase={built ? 'built' : 'questions'}>
      <p className="flex items-start gap-2 text-[12.5px] text-neutral-600">
        <SparklesIcon className="w-3.5 h-3.5 text-ai-600 mt-0.5 flex-shrink-0" />
        <span>{t('Worked out from your Scope of Work, BOQ and project items. Enterprise Architecture reviews these with your request.', 'تم تحديدها من نطاق العمل وجدول الكميات وبنود المشروع. تراجعها البنية المؤسسية مع طلبك.')} <span className="text-neutral-400">· {t(`Library v${STD_VERSION}`, `المكتبة ${STD_VERSION}`)}</span></span>
      </p>

      {/* Only what the request doesn't already say — one question at a time */}
      {current && (
        <div data-std-questions>
          <div className="flex items-center gap-3 mb-2">
            <p className="flex-1 text-[13px] font-semibold text-neutral-800">
              {asking ? t('Change this answer', 'تغيير هذه الإجابة') : t(`${missing.length} thing${missing.length === 1 ? '' : 's'} your request doesn’t say yet`, `${missing.length} أمور لم يذكرها طلبك بعد`)}
            </p>
            {!asking && <span className="text-[12px] font-semibold text-neutral-500 tabular-nums" data-q-progress={`${qs.length - missing.length}/${qs.length}`}>{t(`${qs.length - missing.length} of ${qs.length} known`, `${qs.length - missing.length} من ${qs.length} معروفة`)}</span>}
          </div>
          <div className="relative">
            {!asking && missing.length > 1 && <div aria-hidden className="absolute inset-x-4 -bottom-2 h-full rounded-xl border border-neutral-200 bg-neutral-50" />}
            <div key={current.id} data-q={current.id} className="rise-in relative rounded-xl border border-neutral-200 bg-white px-4 py-4 shadow-[0_6px_20px_-12px_rgba(16,24,40,0.25)] flex flex-col gap-3 @[560px]:flex-row @[560px]:items-center">
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <QIcon q={current} />
                <div className="min-w-0">
                  <p className="text-[14.5px] font-semibold text-neutral-900">{L({ en: current.en, ar: current.ar })}</p>
                  <p className="text-[12.5px] text-neutral-600 mt-0.5 leading-relaxed">{L({ en: current.descEn, ar: current.descAr })}</p>
                </div>
              </div>
              <div className="flex gap-2 ps-[58px] @[560px]:ps-0">
                {[true, false].map((yes) => (
                  <button key={String(yes)} type="button" data-q-answer={yes ? 'yes' : 'no'} onClick={() => answer(current, yes)}
                    className={`h-10 min-w-[84px] px-4 rounded-lg text-[13px] font-semibold border transition-colors ${answers[current.id] === yes ? 'border-brand-600 bg-brand-600 text-white hover:bg-brand-700' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'}`}>
                    {yes ? t('Yes', 'نعم') : t('No', 'لا')}
                  </button>
                ))}
                {asking && <button type="button" onClick={() => setAsking(null)} className="h-10 px-3 rounded-lg text-[12.5px] font-semibold text-neutral-500 hover:bg-neutral-100">{t('Cancel', 'إلغاء')}</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {complete && <DeploymentHero deployment={deployment} answers={answers} isAr={isAr} t={t} />}

      {/* What we know about the project, and where it came from */}
      {Object.keys(answers).length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5">{t('About this project', 'عن هذا المشروع')}</p>
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 @[760px]:grid-cols-3 gap-2" data-ea-answers>
            {qs.filter((q) => answers[q.id] !== undefined).map((q) => {
              const yes = !!answers[q.id];
              const d = user[q.id] === undefined ? derived[q.id] : undefined;
              return (
                <button key={q.id} type="button" data-answer={q.id} data-yes={yes || undefined} data-source={d ? 'derived' : 'user'} onClick={() => setAsking(q.id)}
                  title={d ? `${L(d.src ?? { en: '', ar: '' })}: ${d.basis}` : undefined}
                  className={`group text-start flex items-start gap-2.5 rounded-lg border px-2.5 py-2 transition-colors hover:border-brand-300 ${asking === q.id ? 'border-brand-500 ring-2 ring-brand-100' : yes ? 'border-neutral-200 bg-white' : 'border-dashed border-neutral-200 bg-neutral-50/60'}`}>
                  <span className={yes ? '' : 'opacity-50 grayscale'}><QIcon q={q} size="sm" /></span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className={`flex-1 min-w-0 text-[12.5px] leading-snug ${yes ? 'text-neutral-800 font-medium' : 'text-neutral-500'}`}>{isAr ? q.shortAr : q.short}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold ${yes ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-500'}`}>{yes ? t('Yes', 'نعم') : t('No', 'لا')}</span>
                    </span>
                    <span className="block mt-0.5 text-[11px] text-neutral-400 truncate">
                      {d ? t(`From ${d.src?.en ?? 'your request'}`, `من ${d.src?.ar ?? 'طلبك'}`) : t('Your answer', 'إجابتك')}
                      <span className="ms-1 text-brand-700 font-semibold opacity-0 group-hover:opacity-100">· {t('Change', 'تغيير')}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {built && (
        <>
          <p className="text-[12px] text-neutral-500" data-std-summary>{t(`${included} standards apply${na ? ` · ${na} not applicable` : ''} · required items can only be marked not applicable, with a reason.`, `${included} معياراً منطبقاً${na ? ` · ${na} غير منطبقة` : ''} · البنود الإلزامية يمكن تحديدها كغير منطبقة فقط مع ذكر السبب.`)}</p>
          <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden" data-std-review>
            {groups.map((g) => {
              const items = STD_LIBRARY.filter((s) => s.group === g);
              const n = items.filter((s) => get(s.id)).length;
              const missingReason = items.some((s) => get(s.id)?.status === 'na' && s.required && !get(s.id)?.naReason?.trim());
              const isOpen = open === g;
              return (
                <div key={g} data-std-group={g}>
                  <button type="button" onClick={() => setOpen(isOpen ? null : g)} aria-expanded={isOpen} className="w-full flex items-center gap-3 px-4 py-3 text-start hover:bg-neutral-50">
                    <span className="flex-1 text-[13px] font-semibold text-neutral-800">{L(STD_GROUPS[g])}</span>
                    {missingReason && <span className="w-1.5 h-1.5 rounded-full bg-error-500" />}
                    <span className="text-[12px] text-neutral-500 tabular-nums">{t(`${n} of ${items.length}`, `${n} من ${items.length}`)}</span>
                    <ChevronDownIcon className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <ul className="px-4 pb-3 space-y-2">
                      {items.map((s) => {
                        const cur = get(s.id);
                        const isNa = cur?.status === 'na';
                        const because = cur?.ai ? stdBecause(s, answers, deployment) : null;
                        return (
                          <li key={s.id} data-std={s.id} data-std-state={cur ? cur.status : 'off'} className={`rounded-lg border px-3 py-2.5 ${cur ? (isNa ? 'border-neutral-200 bg-neutral-50' : 'border-neutral-200 bg-white') : 'border-dashed border-neutral-200 bg-white'}`}>
                            <div className="flex items-start gap-3">
                              {s.required
                                ? <span className="mt-0.5 w-4 h-4 rounded flex items-center justify-center bg-neutral-200 text-neutral-500 flex-shrink-0" title={t('Required — cannot be removed', 'إلزامي — لا يمكن حذفه')}><LockGlyph className="w-2.5 h-2.5" /></span>
                                : <input type="checkbox" className="mt-0.5 w-4 h-4 accent-brand-600 flex-shrink-0" checked={!!cur} onChange={() => toggle(s.id)} aria-label={L(s)} data-std-toggle={s.id} />}
                              <div className="min-w-0 flex-1">
                                <p className={`text-[13px] leading-snug ${isNa ? 'text-neutral-400 line-through' : cur ? 'text-neutral-800' : 'text-neutral-500'}`}>{L(s)}</p>
                                <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10.5px] font-semibold">
                                  <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">{s.owner}</span>
                                  {s.required && <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">{t('Required', 'إلزامي')}</span>}
                                  {because && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-ai-50 text-ai-700" data-std-because={s.id}>
                                      <SparklesIcon className="w-3 h-3" />
                                      {because === 'deployment' ? t(`Because: ${DEPLOY_LABEL[deployment][0]}`, `بسبب: ${DEPLOY_LABEL[deployment][1]}`)
                                        : t(`Because: ${because.map((q) => qById(q).short).join(' · ')}`, `بسبب: ${because.map((q) => qById(q).shortAr).join(' · ')}`)}
                                    </span>
                                  )}
                                </div>
                                {isNa && (
                                  <input value={cur?.naReason ?? ''} onChange={(e) => setReason(s.id, e.target.value)} data-std-reason={s.id}
                                    placeholder={t('Why doesn’t this apply? (required)', 'لماذا لا ينطبق؟ (إلزامي)')}
                                    className={`mt-2 h-9 w-full rounded-lg border bg-white px-3 text-[12.5px] ${s.required && !cur?.naReason?.trim() ? 'border-error-300' : 'border-neutral-300'}`} />
                                )}
                              </div>
                              {cur && s.required && (
                                <button type="button" data-std-na={s.id} onClick={() => setNa(s.id, !isNa)} className="text-[11.5px] font-semibold text-neutral-500 hover:text-neutral-800 whitespace-nowrap">
                                  {isNa ? <span className="inline-flex items-center gap-1"><CheckIcon className="w-3 h-3" />{t('Applies', 'ينطبق')}</span> : t('Not applicable', 'غير منطبق')}
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
          {(hiddenGroups > 0 || showLibrary) && (
            <button type="button" data-std-library onClick={() => setShowLibrary((v) => !v)} className="text-[12.5px] font-semibold text-brand-700 hover:underline">
              {showLibrary ? t('Show only the sections for this project', 'عرض أقسام هذا المشروع فقط') : t(`Browse the full library (${hiddenGroups} more section${hiddenGroups === 1 ? '' : 's'})`, `تصفح المكتبة كاملة (${hiddenGroups} أقسام أخرى)`)}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** Review & Confirm — does Enterprise Architecture review this request, and why. */
export function EaRouteCard() {
  const { formData } = useTender();
  const t = useT();
  const { isAr } = useLanguage();
  const scope = eaScopeForForm(formData);
  const L = (o: { en: string; ar: string }) => (isAr ? o.ar : o.en);
  const sel = formData.techStandards ?? [];
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4" data-ea-route={scope.required ? 'required' : 'not-required'}>
      <p className="text-[13px] font-semibold text-neutral-800">{t('Enterprise Architecture review', 'مراجعة البنية المؤسسية')}</p>
      <p className="mt-0.5 text-[13px] text-neutral-600" data-ea-sentence>
        {scope.required
          ? t(`Required — ${scope.reasons.map((r) => r.en.toLowerCase()).join(', ')}.`, `مطلوبة — ${scope.reasons.map((r) => r.ar).join('، ')}.`)
          : scope.excluded.length
            ? t(`Not required — ${scope.excluded.map((r) => r.en.toLowerCase()).join(', ')}.`, `غير مطلوبة — ${scope.excluded.map((r) => L(r)).join('، ')}.`)
            : t('Not required — no technology items in this request.', 'غير مطلوبة — لا توجد بنود تقنية في هذا الطلب.')}
      </p>
      {scope.required && sel.length > 0 && (
        <p className="mt-1 text-[12px] text-neutral-500">{t(`${sel.filter((s) => s.status === 'included').length} technical standards included · ${sel.filter((s) => s.status === 'na').length} not applicable · target review time 3 days.`, `${sel.filter((s) => s.status === 'included').length} معايير مضمّنة · ${sel.filter((s) => s.status === 'na').length} غير منطبقة · مدة المراجعة المستهدفة 3 أيام.`)}</p>
      )}
    </div>
  );
}
