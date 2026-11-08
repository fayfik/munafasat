// Scope of Work → "Technical standards": the EA / Cybersecurity / PMO requirements
// library, built from a few Yes/No questions about the project. Required standards can't be
// removed — only marked Not applicable with a reason.
import { useState } from 'react';
import type { TenderFormData } from '../types/tender';
import { useTender } from '../context/TenderContext';
import { useT, useLanguage } from '../context/LanguageContext';
import { SectionCard } from './ui';
import { SparklesIcon, ChevronDownIcon, CheckIcon } from './Icons';
import { toast } from './Toast';
import { PROJECTS, ALL_COST_CENTERS } from '../data/mockData';
import {
  eaScope, suggestStandards, stdById, stdBecause, questionsFor, deploymentFrom, STD_LIBRARY, STD_GROUPS, STD_VERSION, STD_QUESTIONS,
  type Deployment, type StdGroup, type StdSelection, type EaScope, type Answers, type QuestionId, type StdQuestion,
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

/** Review & Confirm — what the questions built, read-only. */
export function TechStandardsReview() {
  const { formData } = useTender();
  const t = useT();
  const { isAr } = useLanguage();
  const scope = eaScopeForForm(formData);
  const [openG, setOpenG] = useState<StdGroup | null>(null);
  if (!scope.required) return null;
  const answers = (formData.techAnswers ?? {}) as Answers;
  const sel = formData.techStandards ?? [];
  const pending = stdQuestionsOpen(formData);
  if (pending > 0 || !sel.length) {
    return <p className="text-[12.5px] text-warning-800" data-std-review-pending>{t(`${pending || 'Some'} project question${pending === 1 ? '' : 's'} still to answer in Scope of Work — the technical standards are built from them.`, `ما زال هناك ${pending || 'بعض'} أسئلة عن المشروع في نطاق العمل — تُبنى المعايير التقنية منها.`)}</p>;
  }
  const deployment: Deployment = formData.deploymentModel ?? deploymentFrom(scope, answers);
  const groups = (Object.keys(STD_GROUPS) as StdGroup[]).map((g) => ({ g, rows: sel.filter((x) => stdById(x.id)?.group === g) })).filter((x) => x.rows.length);
  const na = sel.filter((x) => x.status === 'na').length;
  return (
    <div className="space-y-4" data-std-review>
      <DeploymentHero deployment={deployment} answers={answers} isAr={isAr} t={t} />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5">{t('About this project', 'عن هذا المشروع')}</p>
        <ProjectProfile answers={answers} isAr={isAr} t={t} />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5">{t(`${sel.length} standards · ${groups.length} sections${na ? ` · ${na} not applicable` : ''}`, `${sel.length} معياراً · ${groups.length} أقسام${na ? ` · ${na} غير منطبقة` : ''}`)}</p>
        <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
          {groups.map(({ g, rows }) => (
            <div key={g} data-std-review-group={g}>
              <button type="button" onClick={() => setOpenG(openG === g ? null : g)} aria-expanded={openG === g} className="w-full flex items-center gap-3 px-4 py-2.5 text-start hover:bg-neutral-50">
                <span className="flex-1 text-[13px] font-semibold text-neutral-800">{isAr ? STD_GROUPS[g].ar : STD_GROUPS[g].en}</span>
                {rows.some((r) => r.status === 'na') && <span className="px-1.5 py-0.5 rounded bg-warning-50 text-warning-800 text-[10.5px] font-semibold">{t(`${rows.filter((r) => r.status === 'na').length} N/A`, `${rows.filter((r) => r.status === 'na').length} غ/م`)}</span>}
                <span className="text-[12px] text-neutral-500 tabular-nums">{rows.length}</span>
                <ChevronDownIcon className={`w-4 h-4 text-neutral-400 transition-transform ${openG === g ? 'rotate-180' : ''}`} />
              </button>
              {openG === g && <div className="px-4 pb-3"><StandardsList rows={rows} isAr={isAr} t={t} /></div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Texts the questions read their suggestions from. */
function textsFor(f: TenderFormData) {
  const proj = PROJECTS.find((p) => p.id === f.projectId);
  const budgeted = (proj?.items ?? []).filter((it) => (f.selectedProjectItemIds ?? []).includes(it.id)).map((it) => it.name);
  return [...budgeted, ...f.boqItems.map((b) => `${b.itemName} ${b.itemDescription}`.trim())].filter(Boolean);
}

/** Questions the requester still has to answer (step validation). */
export function stdQuestionsOpen(f: TenderFormData) {
  const scope = eaScopeForForm(f);
  if (!scope.required) return 0;
  const answers = (f.techAnswers ?? {}) as Answers;
  return questionsFor({ scope, texts: textsFor(f), answers }).filter((q) => answers[q.id] === undefined).length;
}

export default function TechStandards() {
  const { formData, updateField } = useTender();
  const t = useT();
  const { isAr } = useLanguage();
  const scope = eaScopeForForm(formData);
  const texts = textsFor(formData);
  const answers = (formData.techAnswers ?? {}) as Answers;
  const deployment: Deployment = formData.deploymentModel ?? deploymentFrom(scope, answers);
  const sel = formData.techStandards ?? [];
  const [open, setOpen] = useState<StdGroup | null>(null);
  const [editing, setEditing] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const L = (o: { en: string; ar: string }) => (isAr ? o.ar : o.en);

  if (!scope.required) return null;

  const qs = questionsFor({ scope, texts, answers });
  const current = qs.find((q) => answers[q.id] === undefined);
  const answered = qs.filter((q) => answers[q.id] !== undefined);
  const built = !current && !!formData.techStandards;
  const qById = (id: QuestionId) => STD_QUESTIONS.find((q) => q.id === id)!;

  const get = (id: string) => sel.find((s) => s.id === id);
  const put = (next: StdSelection[]) => updateField('techStandards', next);
  const toggle = (id: string) => put(get(id) ? sel.filter((s) => s.id !== id) : [...sel, { id, status: 'included' }]);
  const setNa = (id: string, na: boolean) => put(sel.map((s) => (s.id === id ? { ...s, status: na ? 'na' : 'included', naReason: na ? s.naReason ?? '' : undefined } : s)));
  const setReason = (id: string, naReason: string) => put(sel.map((s) => (s.id === id ? { ...s, naReason } : s)));

  /** Rebuild from the answers: keep the user's own picks and N/A notes, replace the AI ones. */
  function build(a: Answers) {
    const d = deploymentFrom(scope, a);
    const want = suggestStandards(d, a);
    const keptUser = sel.filter((s) => !s.ai && !stdById(s.id)?.required && !want.some((w) => w.id === s.id));
    const next = [...want.map((w) => { const prev = get(w.id); return prev ? { ...prev, ai: w.ai } : w; }), ...keptUser];
    updateField('deploymentModel', d);
    put(next);
    const groups = new Set(next.map((x) => stdById(x.id)?.group)).size;
    toast(t(`Deployment model and ${next.length} standards in ${groups} sections built from your answers.`, `تم بناء نموذج النشر و${next.length} معياراً في ${groups} أقسام من إجاباتك.`));
  }
  function answer(q: StdQuestion, yes: boolean) {
    let a: Answers = { ...answers, [q.id]: yes };
    // Drop answers to questions that no longer apply (e.g. "own servers" after "not SaaS").
    const asked = new Set(questionsFor({ scope, texts, answers: a }).map((x) => x.id));
    a = Object.fromEntries(Object.entries(a).filter(([k]) => asked.has(k as QuestionId))) as Answers;
    updateField('techAnswers', a);
    const left = questionsFor({ scope, texts, answers: a }).some((x) => a[x.id] === undefined);
    if (!left) { build(a); setEditing(false); }
  }
  function change(q: StdQuestion) {
    const a = { ...answers }; delete a[q.id];
    updateField('techAnswers', a);
  }

  const included = sel.filter((s) => s.status === 'included').length;
  const na = sel.filter((s) => s.status === 'na').length;
  const allGroups = Object.keys(STD_GROUPS) as StdGroup[];
  const groups = showLibrary ? allGroups : allGroups.filter((g) => sel.some((s) => stdById(s.id)?.group === g));
  const hiddenGroups = allGroups.length - allGroups.filter((g) => sel.some((s) => stdById(s.id)?.group === g)).length;

  const AnsweredRow = ({ q }: { q: StdQuestion }) => (
    <li data-q-done={q.id} className="flex items-center gap-3 px-3.5 py-2.5">
      <QIcon q={q} size="sm" />
      <span className="flex-1 min-w-0 text-[13px] text-neutral-700">{L({ en: q.en, ar: q.ar })}</span>
      <span className={`px-2 py-0.5 rounded-full text-[11.5px] font-semibold ${answers[q.id] ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-600'}`}>{answers[q.id] ? t('Yes', 'نعم') : t('No', 'لا')}</span>
      <button type="button" data-q-change={q.id} onClick={() => change(q)} className="text-[12px] font-semibold text-brand-700 hover:underline">{t('Change', 'تغيير')}</button>
    </li>
  );

  return (
    <SectionCard
      title="Technical standards"
      titleAr="المعايير التقنية"
      description={`Built from the EA, Cybersecurity and PMO library for this project · v${STD_VERSION}`}
      descriptionAr={`مبنية من مكتبة البنية المؤسسية والأمن السيبراني ومكتب إدارة المشاريع لهذا المشروع · ${STD_VERSION}`}
      action={built && !editing ? <button type="button" data-q-edit onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-neutral-300 bg-white text-neutral-700 text-[12px] font-semibold hover:bg-neutral-50">{t('Edit answers', 'تعديل الإجابات')}</button> : undefined}
    >
      <div className="space-y-4 @container" data-tech-standards data-std-phase={current ? 'questions' : built ? 'built' : 'questions'}>
        {/* Why EA */}
        <div className="rounded-lg border border-[#C9DBEC] bg-[#F3F8FC] px-3.5 py-2.5 text-[12.5px] text-[#21507A]" data-ea-why>
          <span className="font-semibold">{t('Enterprise Architecture will review this request', 'ستراجع البنية المؤسسية هذا الطلب')}</span>
          {' — '}{scope.reasons.map((r) => L(r)).join(' · ')}
        </div>

        {/* Questions — one at a time */}
        {(current || editing) && (
          <div data-std-questions>
            <div className="flex items-center gap-3 mb-2.5">
              <p className="flex-1 text-[13px] text-neutral-700">
                {current
                  ? t('A few questions about this project — your answers build the deployment model and the standards.', 'بعض الأسئلة عن هذا المشروع — إجاباتك تبني نموذج النشر والمعايير.')
                  : t('Change any answer — the standards are rebuilt when you finish.', 'غيّر أي إجابة — يُعاد بناء المعايير عند الانتهاء.')}
              </p>
              <span className="text-[12px] font-semibold text-neutral-500 tabular-nums" data-q-progress={`${answered.length}/${qs.length}`}>{t(`${answered.length} of ${qs.length}`, `${answered.length} من ${qs.length}`)}</span>
            </div>
            <div className="h-1 rounded-full bg-neutral-100 overflow-hidden mb-3"><div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${(answered.length / Math.max(1, qs.length)) * 100}%` }} /></div>

            {answered.length > 0 && (
              <ul className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 mb-3">
                {answered.map((q) => <AnsweredRow key={q.id} q={q} />)}
              </ul>
            )}

            {current && (() => {
              const g = current.guess?.({ scope, texts, answers }) ?? null;
              const btn = (yes: boolean) => {
                const sug = g && g.yes === yes;
                return (
                  <button type="button" data-q-answer={yes ? 'yes' : 'no'} data-suggested={sug || undefined} onClick={() => answer(current, yes)}
                    className={`h-10 min-w-[84px] px-4 rounded-lg text-[13px] font-semibold border transition-colors ${sug ? 'border-brand-600 bg-brand-600 text-white hover:bg-brand-700' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'}`}>
                    {yes ? t('Yes', 'نعم') : t('No', 'لا')}
                  </button>
                );
              };
              const next = qs[qs.indexOf(current) + 1];
              return (
                <div className="relative">
                  {next && <div aria-hidden className="absolute inset-x-4 -bottom-2 h-full rounded-xl border border-neutral-200 bg-neutral-50" />}
                  <div key={current.id} data-q={current.id} className="rise-in relative rounded-xl border border-neutral-200 bg-white px-4 py-4 shadow-[0_6px_20px_-12px_rgba(16,24,40,0.25)] flex flex-col gap-3 @[560px]:flex-row @[560px]:items-center">
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <QIcon q={current} />
                      <div className="min-w-0">
                        <p className="text-[14.5px] font-semibold text-neutral-900">{L({ en: current.en, ar: current.ar })}</p>
                        <p className="text-[12.5px] text-neutral-600 mt-0.5 leading-relaxed">{L({ en: current.descEn, ar: current.descAr })}</p>
                        {g && g.basis && (
                          <p className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-ai-700" data-q-suggest>
                            <SparklesIcon className="w-3 h-3" />{t(`Suggested ${g.yes ? 'Yes' : 'No'} — from “${g.basis}”`, `مقترح: ${g.yes ? 'نعم' : 'لا'} — من «${g.basis}»`)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ps-[58px] @[560px]:ps-0">{btn(true)}{btn(false)}</div>
                  </div>
                </div>
              );
            })()}

            {!current && editing && (
              <div className="flex justify-end"><button type="button" data-q-done-edit onClick={() => { build(answers); setEditing(false); }} className="h-9 px-4 rounded-lg bg-brand-600 text-white text-[12.5px] font-semibold hover:bg-brand-700">{t('Rebuild standards', 'إعادة بناء المعايير')}</button></div>
            )}
          </div>
        )}

        {built && !editing && (
          <>
            {/* Deployment model — built from the answers */}
            <div className="rise-in"><DeploymentHero deployment={deployment} answers={answers} isAr={isAr} t={t} /></div>
            {deployment !== 'saas' && <p className="-mt-2 text-[12px] text-warning-800">{t('EA direction is SaaS first — add the reason for this choice in the Scope of Work.', 'توجه البنية المؤسسية هو SaaS أولاً — أضف سبب هذا الاختيار في نطاق العمل.')}</p>}

            <p className="text-[12px] text-neutral-500" data-std-summary>{t(`${included} included · ${na} not applicable · required items can’t be removed, only marked not applicable with a reason.`, `${included} مضمّنة · ${na} غير منطبقة · لا يمكن حذف البنود الإلزامية، يمكن فقط تحديدها كغير منطبقة مع ذكر السبب.`)}</p>

            {/* Sections built from the library */}
            <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
              {groups.map((g, gi) => {
                const items = STD_LIBRARY.filter((s) => s.group === g);
                const n = items.filter((s) => get(s.id)).length;
                const missing = items.filter((s) => get(s.id)?.status === 'na' && s.required && !get(s.id)?.naReason?.trim()).length;
                const isOpen = open === g;
                return (
                  <div key={g} data-std-group={g} className="rise-in" style={{ animationDelay: `${gi * 40}ms` }}>
                    <button type="button" onClick={() => setOpen(isOpen ? null : g)} aria-expanded={isOpen}
                      className="w-full flex items-center gap-3 px-4 py-3 text-start hover:bg-neutral-50">
                      <span className="flex-1 text-[13px] font-semibold text-neutral-800">{L(STD_GROUPS[g])}</span>
                      {missing > 0 && <span className="w-1.5 h-1.5 rounded-full bg-error-500" />}
                      <span className="text-[12px] text-neutral-500 tabular-nums">{t(`${n} of ${items.length} added`, `${n} من ${items.length} مضافة`)}</span>
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
                                        {because === 'deployment'
                                          ? t(`Because: ${DEPLOY_LABEL[deployment][0]}`, `بسبب: ${DEPLOY_LABEL[deployment][1]}`)
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
    </SectionCard>
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
