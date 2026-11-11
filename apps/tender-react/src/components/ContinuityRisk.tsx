// Review & Confirm → Business continuity & third-party risk.
// 1) BCM screening: a few Yes/No cards about the SERVICE → BCM applies / not applicable /
//    BCM to decide. 2) When BCM applies, the continuity clauses are added to the request and
//    the requester fills the values (RTO, RPO…). 3) The Third-Party Risk checklist (every RFP)
//    → risk rating. Answers already in the request are pre-filled; submit is blocked until
//    everything is answered.
import { useState } from 'react';
import type { TenderFormData } from '../types/tender';
import { useTender } from '../context/TenderContext';
import { useT, useLanguage } from '../context/LanguageContext';
import { CheckIcon, SparklesIcon } from './Icons';
import { textsFor, resolveAnswers } from './TechStandards';
import {
  BCM_QUESTIONS, TPR_QUESTIONS, VERDICT, RATING, bcmVerdict, bcmClausesFor, tprRating, resolveCR,
  type CRQuestion, type Answers, type Guess,
} from '../lib/continuityRisk';

/** Everything Review & Confirm needs about continuity & risk for this request. */
export function crState(f: TenderFormData) {
  const texts = textsFor(f);
  const ext = resolveAnswers(f).answers as Answers;
  const bcm = resolveCR(BCM_QUESTIONS, (f.bcmAnswers ?? {}) as Answers, texts, ext);
  const verdict = bcmVerdict(bcm.answers);
  const clauses = bcmClausesFor(bcm.answers);
  const values = f.bcmValues ?? {};
  const missingValues = clauses.filter((c) => c.value && !values[c.id]?.trim());
  const tpr = resolveCR(TPR_QUESTIONS, (f.tprAnswers ?? {}) as Answers, texts, ext);
  const rating = tprRating(tpr.answers, verdict);
  const bcmOpen = BCM_QUESTIONS.filter((q) => bcm.answers[q.id] === undefined);
  const tprOpen = TPR_QUESTIONS.filter((q) => tpr.answers[q.id] === undefined);
  return { bcm, verdict, clauses, values, missingValues, tpr, rating, bcmOpen, tprOpen, open: bcmOpen.length + tprOpen.length + missingValues.length };
}
export const continuityOpen = (f: TenderFormData) => (f.sourceType === 'souq-etimad' ? 0 : crState(f).open);

const Icon = ({ d, tone = 'brand' }: { d: string; tone?: 'brand' | 'warning' }) => (
  <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${tone === 'warning' ? 'bg-warning-50 text-warning-700' : 'bg-[#EEF4FB] text-[#2A6193]'}`}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d={d} /></svg>
  </span>
);

/** One question at a time; answered ones become tiles (click to change). */
function QuestionBlock({ kind, questions, answers, derived, user, onAnswer }: {
  kind: 'bcm' | 'tpr'; questions: CRQuestion[]; answers: Answers; derived: Record<string, Guess>; user: Answers; onAnswer: (id: string, yes: boolean) => void;
}) {
  const t = useT();
  const { isAr } = useLanguage();
  const [asking, setAsking] = useState<string | null>(null);
  const missing = questions.filter((q) => answers[q.id] === undefined);
  const current = asking ? questions.find((q) => q.id === asking)! : missing[0];
  const known = questions.length - missing.length;
  return (
    <div className="space-y-3 @container">
      {current && (
        <div data-cr-questions={kind}>
          <div className="flex items-center gap-3 mb-2">
            <p className="flex-1 text-[13px] font-semibold text-neutral-800">{asking ? t('Change this answer', 'تغيير هذه الإجابة') : t(`${missing.length} question${missing.length === 1 ? '' : 's'} your request doesn’t answer yet`, `${missing.length} أسئلة لم يجب عنها طلبك بعد`)}</p>
            {!asking && <span className="text-[12px] font-semibold text-neutral-500 tabular-nums">{t(`${known} of ${questions.length} known`, `${known} من ${questions.length} معروفة`)}</span>}
          </div>
          <div className="relative">
            {!asking && missing.length > 1 && <div aria-hidden className="absolute inset-x-4 -bottom-2 h-full rounded-xl border border-neutral-200 bg-neutral-50" />}
            <div key={current.id} data-cr-q={`${kind}-${current.id}`} className="rise-in relative rounded-xl border border-neutral-200 bg-white px-4 py-4 shadow-[0_6px_20px_-12px_rgba(16,24,40,0.25)] flex flex-col gap-3 @[560px]:flex-row @[560px]:items-center">
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <Icon d={current.icon} tone={kind === 'bcm' ? 'warning' : 'brand'} />
                <div className="min-w-0">
                  <p className="text-[14.5px] font-semibold text-neutral-900">{isAr ? current.ar : current.en}</p>
                  <p className="text-[12.5px] text-neutral-600 mt-0.5 leading-relaxed">{isAr ? current.descAr : current.descEn}</p>
                </div>
              </div>
              <div className="flex gap-2 ps-[58px] @[560px]:ps-0">
                {[true, false].map((yes) => (
                  <button key={String(yes)} type="button" data-cr-answer={yes ? 'yes' : 'no'} onClick={() => { onAnswer(current.id, yes); setAsking(null); }}
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
      {known > 0 && (
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 @[760px]:grid-cols-3 gap-2">
          {questions.filter((q) => answers[q.id] !== undefined).map((q) => {
            const yes = !!answers[q.id];
            const d = user[q.id] === undefined ? derived[q.id] : undefined;
            return (
              <button key={q.id} type="button" data-cr-tile={`${kind}-${q.id}`} data-yes={yes || undefined} onClick={() => setAsking(q.id)} title={d ? `${d.src ? (isAr ? d.src.ar : d.src.en) + ': ' : ''}${d.basis}` : undefined}
                className={`group text-start rounded-lg border px-2.5 py-2 transition-colors hover:border-brand-300 ${asking === q.id ? 'border-brand-500 ring-2 ring-brand-100' : yes ? 'border-neutral-200 bg-white' : 'border-dashed border-neutral-200 bg-neutral-50/60'}`}>
                <span className="flex items-center gap-2">
                  <span className={`flex-1 min-w-0 text-[12.5px] leading-snug ${yes ? 'text-neutral-800 font-medium' : 'text-neutral-500'}`}>{isAr ? q.shortAr : q.short}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold ${yes ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-500'}`}>{yes ? t('Yes', 'نعم') : t('No', 'لا')}</span>
                </span>
                <span className="block mt-0.5 text-[11px] text-neutral-400 truncate">
                  {d ? t(`From ${d.src?.en ?? 'your request'}`, `من ${d.src?.ar ?? 'طلبك'}`) : t('Your answer', 'إجابتك')}
                  <span className="ms-1 text-brand-700 font-semibold opacity-0 group-hover:opacity-100">· {t('Change', 'تغيير')}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ContinuityRisk() {
  const { formData, updateField } = useTender();
  const t = useT();
  const { isAr } = useLanguage();
  const s = crState(formData);
  const v = s.verdict ? VERDICT[s.verdict] : null;
  const tone = s.verdict === 'applies' ? 'border-warning-200 bg-warning-50/60' : s.verdict === 'na' ? 'border-success-200 bg-success-50/50' : 'border-[#C9DBEC] bg-[#F3F8FC]';
  return (
    <div className="space-y-6" data-continuity data-cr-open={s.open}>
      <p className="flex items-start gap-2 text-[12.5px] text-neutral-600">
        <SparklesIcon className="w-3.5 h-3.5 text-ai-600 mt-0.5 flex-shrink-0" />
        <span>{t('Answers already in your request are filled in. BCM looks at the service you are buying — not your department.', 'الإجابات الموجودة في طلبك معبأة مسبقاً. تنظر إدارة الاستمرارية إلى الخدمة التي تشتريها لا إلى إدارتك.')}</span>
      </p>

      {/* 1 · BCM screening */}
      <section id="q-bcm" data-bcm-screening>
        <h5 className="text-[13.5px] font-semibold text-neutral-900 mb-2.5">{t('Business continuity (BCM)', 'استمرارية الأعمال')}</h5>
        <QuestionBlock kind="bcm" questions={BCM_QUESTIONS} answers={s.bcm.answers} derived={s.bcm.derived} user={(formData.bcmAnswers ?? {}) as Answers}
          onAnswer={(id, yes) => updateField('bcmAnswers', { ...(formData.bcmAnswers ?? {}), [id]: yes })} />
        {v && (
          <div className={`mt-3 rounded-xl border px-4 py-3 ${tone}`} data-bcm-verdict={s.verdict}>
            <p className="text-[13.5px] font-bold text-neutral-900">{isAr ? v.ar : v.en}</p>
            <p className="text-[12.5px] text-neutral-600 mt-0.5">{isAr ? v.whyAr : v.whyEn}</p>
          </div>
        )}
        {/* 2 · Continuity clauses */}
        {s.clauses.length > 0 && (
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white overflow-hidden" data-bcm-clauses>
            <div className="px-4 py-2.5 border-b border-neutral-100 flex items-center gap-2">
              <p className="flex-1 text-[12.5px] font-semibold text-neutral-800">{t(`${s.clauses.length} continuity clauses added to the request`, `أُضيف ${s.clauses.length} بنداً للاستمرارية إلى الطلب`)}</p>
              {s.missingValues.length > 0 ? <span className="text-[12px] text-warning-700">{t(`${s.missingValues.length} value${s.missingValues.length > 1 ? 's' : ''} to fill`, `${s.missingValues.length} قيم للتعبئة`)}</span> : <span className="text-[12px] text-success-700 inline-flex items-center gap-1"><CheckIcon className="w-3.5 h-3.5" />{t('Complete', 'مكتمل')}</span>}
            </div>
            <ul className="divide-y divide-neutral-100">
              {s.clauses.map((c) => (
                <li key={c.id} className="px-4 py-2.5 flex items-start gap-3" data-bcm-clause={c.id}>
                  <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${!c.value || s.values[c.id]?.trim() ? 'bg-success-500 text-white' : 'border-2 border-warning-400'}`}>{(!c.value || s.values[c.id]?.trim()) && <CheckIcon className="w-2.5 h-2.5" />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-neutral-800">{isAr ? c.ar : c.en}{c.set === 'people' && <span className="ms-2 px-1.5 rounded bg-neutral-100 text-neutral-500 text-[10.5px] font-semibold">{t('Staff', 'الموظفون')}</span>}</p>
                    <p className="text-[12px] text-neutral-500">{isAr ? c.descAr : c.descEn}</p>
                  </div>
                  {c.value && (
                    <label className="flex-shrink-0 w-[170px]" id={`q-bcm-${c.id}`}>
                      <span className="sr-only">{isAr ? c.value.labelAr : c.value.labelEn}</span>
                      <input data-bcm-value={c.id} value={s.values[c.id] ?? ''} placeholder={c.value.placeholder} onChange={(e) => updateField('bcmValues', { ...s.values, [c.id]: e.target.value })}
                        className={`h-9 w-full rounded-lg border px-2.5 text-[13px] ${s.values[c.id]?.trim() ? 'border-neutral-300' : 'border-warning-300 bg-warning-50/40'}`} />
                    </label>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 3 · Third-party risk */}
      <section id="q-tpr" data-tpr>
        <div className="flex items-center gap-2 mb-2.5">
          <h5 className="flex-1 text-[13.5px] font-semibold text-neutral-900">{t('Third-party risk assessment', 'تقييم مخاطر الطرف الثالث')}</h5>
          {s.rating && <span className={`px-2 py-0.5 rounded-full border text-[11.5px] font-semibold ${RATING[s.rating].cls}`} data-tpr-rating={s.rating}>{t(`${RATING[s.rating].en} risk`, `مخاطر ${RATING[s.rating].ar}`)}</span>}
        </div>
        <QuestionBlock kind="tpr" questions={TPR_QUESTIONS} answers={s.tpr.answers} derived={s.tpr.derived} user={(formData.tprAnswers ?? {}) as Answers}
          onAnswer={(id, yes) => updateField('tprAnswers', { ...(formData.tprAnswers ?? {}), [id]: yes })} />
        {s.rating && RATING[s.rating].waei && <p className="mt-2 text-[12px] text-warning-800" data-waei>{t('High or critical vendors are added to WAEI for monitoring after the contract is signed.', 'يُضاف الموردون ذوو المخاطر العالية أو الحرجة إلى نظام "وعي" للمتابعة بعد توقيع العقد.')}</p>}
      </section>
    </div>
  );
}
