// Blocks Continue when the step would likely be returned (thin scope, one-line
// BOQ descriptions…). Lists what to fix and takes the requester to the field.
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { QualityIssue } from '../lib/quality';
import { words } from '../lib/quality';
import { useLanguage, useT } from '../context/LanguageContext';

export function focusField(field: string) {
  const el = document.getElementById(field);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('q-flash'); void el.offsetWidth; el.classList.add('q-flash');
  const input = el.querySelector<HTMLElement>('textarea, input:not([type=checkbox]):not([type=radio])');
  setTimeout(() => input?.focus({ preventScroll: true }), 350);
}

export default function QualityGate({ issues, onClose }: { issues: QualityIssue[]; onClose: () => void }) {
  const t = useT();
  const { isAr } = useLanguage();
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  if (!issues.length) return null;
  const fix = (field: string) => { onClose(); setTimeout(() => focusField(field), 60); };
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] backdrop-in" onClick={onClose} role="dialog" aria-modal="true" dir={isAr ? 'rtl' : 'ltr'} data-quality-gate>
      <div className="w-full max-w-[520px] rounded-2xl bg-white shadow-2xl pop-in overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 flex items-start gap-3.5">
          <span className="w-10 h-10 rounded-xl bg-warning-50 text-warning-600 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>
          </span>
          <div className="min-w-0">
            <h3 className="text-[17px] font-bold text-neutral-900">{t('Add more detail before you continue', 'أضف تفاصيل أكثر قبل المتابعة')}</h3>
            <p className="mt-1 text-[13px] text-neutral-600 leading-relaxed">{t('As it stands, this step is likely to be returned by a reviewer. Fixing it now saves a review round.', 'بوضعها الحالي، من المرجح أن يعيد المراجع هذه الخطوة. إصلاحها الآن يوفّر جولة مراجعة.')}</p>
          </div>
        </div>
        <ul className="px-6 space-y-2.5">
          {issues.map((i) => (
            <li key={i.id} data-quality-issue={i.id} className="rounded-xl border border-neutral-200 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-neutral-900">{isAr ? i.ar : i.en}</p>
                  <p className="mt-0.5 text-[12.5px] text-neutral-600 leading-relaxed">{isAr ? i.whyAr : i.whyEn}</p>
                  {i.metaEn && <p className="mt-1 text-[11.5px] font-medium text-warning-800">{isAr ? i.metaAr : i.metaEn}</p>}
                </div>
                <button type="button" onClick={() => fix(i.field)} className="h-8 px-3 rounded-lg border border-neutral-300 text-[12.5px] font-semibold text-neutral-700 hover:bg-neutral-50 flex-shrink-0">{t('Fix', 'إصلاح')}</button>
              </div>
            </li>
          ))}
        </ul>
        <div className="px-6 py-5 flex justify-end">
          <button type="button" data-quality-fix onClick={() => fix(issues[0].field)} className="h-10 px-5 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700">{t('Fix now', 'إصلاح الآن')}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Word meter under a long-text field: grows green once there is enough detail. */
export function DetailMeter({ text, min, id }: { text: string; min: number; id?: string }) {
  const t = useT();
  const n = words(text);
  const ok = n >= min;
  const pct = Math.min(100, Math.round((n / min) * 100));
  return (
    <div className="mt-1.5 flex items-center gap-2.5" data-detail-meter={id} data-ok={ok || undefined}>
      <div className="w-24 h-1 rounded-full bg-neutral-100 overflow-hidden"><div className={`h-full rounded-full transition-all duration-300 ${ok ? 'bg-success-500' : n ? 'bg-warning-500' : 'bg-neutral-200'}`} style={{ width: `${pct}%` }} /></div>
      <span className={`text-[11.5px] ${ok ? 'text-success-700' : 'text-neutral-500'}`}>
        {ok ? t(`${n} words · enough detail`, `${n} كلمة · تفاصيل كافية`) : t(`${n} of ${min} words — add more detail so it isn’t returned`, `${n} من ${min} كلمة — أضف تفاصيل حتى لا يُعاد`)}
      </span>
    </div>
  );
}
