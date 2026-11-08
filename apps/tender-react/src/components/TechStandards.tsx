// Scope of Work → "Technical standards": the EA / Cybersecurity / PMO requirements
// library, pre-selected by AI for technology requests. Required standards can't be
// removed — only marked Not applicable with a reason.
import { useEffect, useState } from 'react';
import type { TenderFormData } from '../types/tender';
import { useTender } from '../context/TenderContext';
import { useT, useLanguage } from '../context/LanguageContext';
import { SectionCard } from './ui';
import { SparklesIcon, ChevronDownIcon, CheckIcon } from './Icons';
import { toast } from './Toast';
import { PROJECTS, ALL_COST_CENTERS } from '../data/mockData';
import {
  eaScope, suggestStandards, stdById, STD_LIBRARY, STD_GROUPS, STD_VERSION,
  type Deployment, type StdGroup, type StdSelection, type EaScope,
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

export default function TechStandards() {
  const { formData, updateField } = useTender();
  const t = useT();
  const { isAr } = useLanguage();
  const scope = eaScopeForForm(formData);
  const deployment: Deployment = formData.deploymentModel ?? 'saas';
  const sel = formData.techStandards ?? [];
  const [open, setOpen] = useState<StdGroup | null>(null);
  const L = (o: { en: string; ar: string }) => (isAr ? o.ar : o.en);

  // AI pre-selection on first visit for an in-scope request.
  useEffect(() => {
    if (!scope.required || formData.techStandards) return;
    const s = suggestStandards(scope, deployment);
    updateField('techStandards', s);
    toast(t(`${s.length} technical standards added for this request.`, `تمت إضافة ${s.length} من المعايير التقنية لهذا الطلب.`));
  }, [scope.required]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!scope.required) return null;

  const get = (id: string) => sel.find((s) => s.id === id);
  const put = (next: StdSelection[]) => updateField('techStandards', next);
  const toggle = (id: string) => put(get(id) ? sel.filter((s) => s.id !== id) : [...sel, { id, status: 'included' }]);
  const setNa = (id: string, na: boolean) => put(sel.map((s) => (s.id === id ? { ...s, status: na ? 'na' : 'included', naReason: na ? s.naReason ?? '' : undefined } : s)));
  const setReason = (id: string, naReason: string) => put(sel.map((s) => (s.id === id ? { ...s, naReason } : s)));
  function changeDeployment(d: Deployment) {
    updateField('deploymentModel', d);
    // Keep the user's choices; add / drop only deployment-specific AI suggestions.
    const want = new Set(suggestStandards(scope, d).map((s) => s.id));
    const depIds = STD_LIBRARY.filter((s) => s.when?.deployment).map((s) => s.id);
    const kept = sel.filter((s) => !(depIds.includes(s.id) && s.ai && !want.has(s.id)));
    const add = depIds.filter((id) => want.has(id) && !kept.some((s) => s.id === id)).map((id) => ({ id, status: 'included' as const, ai: true }));
    put([...kept, ...add]);
  }
  function resuggest() {
    const s = suggestStandards(scope, deployment);
    const merged = [...sel, ...s.filter((x) => !get(x.id))];
    put(merged);
    toast(t('Standards refreshed for this request.', 'تم تحديث المعايير لهذا الطلب.'));
  }

  const included = sel.filter((s) => s.status === 'included').length;
  const na = sel.filter((s) => s.status === 'na').length;
  const groups = Object.keys(STD_GROUPS) as StdGroup[];

  return (
    <SectionCard
      title="Technical standards"
      titleAr="المعايير التقنية"
      description={`Standard requirements from Enterprise Architecture, Cybersecurity and PMO · library v${STD_VERSION}`}
      descriptionAr={`المتطلبات القياسية من البنية المؤسسية والأمن السيبراني ومكتب إدارة المشاريع · المكتبة ${STD_VERSION}`}
      action={<button type="button" onClick={resuggest} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-ai-200 bg-ai-50 text-ai-700 text-[12px] font-semibold hover:bg-ai-100"><SparklesIcon className="w-3.5 h-3.5" />{t('Suggest for this request', 'اقترح لهذا الطلب')}</button>}
    >
      <div className="space-y-4" data-tech-standards>
        {/* Why EA */}
        <div className="rounded-lg border border-[#C9DBEC] bg-[#F3F8FC] px-3.5 py-2.5 text-[12.5px] text-[#21507A]" data-ea-why>
          <span className="font-semibold">{t('Enterprise Architecture will review this request', 'ستراجع البنية المؤسسية هذا الطلب')}</span>
          {' — '}{scope.reasons.map((r) => L(r)).join(' · ')}
        </div>

        {/* Deployment model */}
        <div>
          <p className="text-[12.5px] font-medium text-neutral-700 mb-1.5">{t('Deployment model', 'نموذج النشر')}</p>
          <div className="inline-flex rounded-lg border border-neutral-300 overflow-hidden" role="radiogroup">
            {(['saas', 'on-prem', 'hybrid'] as Deployment[]).map((d, i) => (
              <button key={d} type="button" role="radio" aria-checked={deployment === d} data-deploy={d} onClick={() => changeDeployment(d)}
                className={`px-3.5 py-1.5 text-[12.5px] font-semibold ${i ? 'border-s border-neutral-300' : ''} ${deployment === d ? 'bg-brand-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}>
                {d === 'saas' ? t('SaaS (recommended)', 'SaaS (موصى به)') : d === 'on-prem' ? t('On-premises', 'محلي') : t('Hybrid', 'هجين')}
              </button>
            ))}
          </div>
          {deployment !== 'saas' && <p className="mt-1.5 text-[12px] text-warning-800">{t('EA direction is SaaS first — add the reason for this choice in the Scope of Work.', 'توجه البنية المؤسسية هو SaaS أولاً — أضف سبب هذا الاختيار في نطاق العمل.')}</p>}
        </div>

        <p className="text-[12px] text-neutral-500" data-std-summary>{t(`${included} included · ${na} not applicable · required items can’t be removed, only marked not applicable with a reason.`, `${included} مضمّنة · ${na} غير منطبقة · لا يمكن حذف البنود الإلزامية، يمكن فقط تحديدها كغير منطبقة مع ذكر السبب.`)}</p>

        {/* Groups */}
        <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
          {groups.map((g) => {
            const items = STD_LIBRARY.filter((s) => s.group === g);
            const n = items.filter((s) => get(s.id)).length;
            const missing = items.filter((s) => get(s.id)?.status === 'na' && s.required && !get(s.id)?.naReason?.trim()).length;
            const isOpen = open === g;
            return (
              <div key={g} data-std-group={g}>
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
                                {cur?.ai && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-ai-50 text-ai-700"><SparklesIcon className="w-3 h-3" />{t('Suggested', 'مقترح')}</span>}
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
