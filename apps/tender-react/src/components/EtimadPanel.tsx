import { useState } from 'react';
import { useT } from '../context/LanguageContext';
import { isStale } from '../lib/etimadCheck';
import { SparklesIcon, CheckCircleIcon, AlertTriangleIcon, InfoIcon } from './Icons';
import type { BOQRow } from '../types/tender';

interface Props {
  row: BOQRow;
  checking: boolean;
  onCheck: () => void;
  onMove: () => Promise<'moved' | 'preview' | 'error'>;
  onUpdate: (patch: Partial<BOQRow>) => void;
  /** Render nothing until the row has a current check (the caller shows EtimadCheckButton elsewhere). */
  hideUnchecked?: boolean;
}

/** "Check Etimad availability" button on its own, for rows without a current check. */
export function EtimadCheckButton({ row, checking, onCheck }: { row: BOQRow; checking: boolean; onCheck: () => void }) {
  const t = useT();
  const stale = isStale(row);
  return (
    <div className="flex items-center justify-end gap-2 flex-wrap">
      {stale && <span className="text-[11px] text-warning-700">{t('Item changed since the last check.', 'تغيّر البند منذ آخر تحقق.')}</span>}
      <button
        type="button"
        onClick={onCheck}
        disabled={checking}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-ai-50 text-ai-700 border border-ai-200 hover:bg-ai-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <SparklesIcon className={`w-3 h-3 ${checking ? 'spin-slow' : ''}`} />
        {checking ? t('Checking Etimad…', 'جاري التحقق من اعتماد…') : stale ? t('Check again', 'تحقق مجدداً') : t('Check Etimad availability', 'التحقق من التوفر في اعتماد')}
      </button>
    </div>
  );
}

/** "Check Etimad availability" control and verdict for one BOQ item. */
export default function EtimadPanel({ row, checking, onCheck, onMove, onUpdate, hideUnchecked }: Props) {
  const t = useT();
  const [moving, setMoving] = useState(false);
  const [moveMsg, setMoveMsg] = useState('');
  const check = row.etimadCheck;
  const stale = isStale(row);

  const checkButton = (label: string) => (
    <button
      type="button"
      onClick={onCheck}
      disabled={checking}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-ai-50 text-ai-700 border border-ai-200 hover:bg-ai-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <SparklesIcon className={`w-3 h-3 ${checking ? 'spin-slow' : ''}`} />
      {checking ? t('Checking Etimad…', 'جاري التحقق من اعتماد…') : label}
    </button>
  );

  const sourceNote = check?.source === 'demo' ? (
    <span className="text-[10px] text-neutral-400">{t('Demo result from sample rules, not a live Etimad lookup', 'نتيجة تجريبية من قواعد نموذجية، وليست بحثاً مباشراً في اعتماد')}</span>
  ) : check?.source === 'estimate' ? (
    <span className="text-[10px] text-neutral-400">{t('AI estimate, not a live Etimad lookup', 'تقدير بالذكاء الاصطناعي، وليس بحثاً مباشراً في اعتماد')}</span>
  ) : null;

  if (!check || stale) {
    if (hideUnchecked) return null;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {checkButton(t('Check Etimad availability', 'التحقق من التوفر في اعتماد'))}
        {stale && <span className="text-[11px] text-warning-700">{t('Item changed since the last check.', 'تغيّر البند منذ آخر تحقق.')}</span>}
      </div>
    );
  }

  async function move() {
    setMoving(true);
    setMoveMsg('');
    const r = await onMove();
    setMoving(false);
    if (r === 'preview') setMoveMsg(t('Moving items needs saving, which is off in preview mode. Open the page in Claude to use it.', 'نقل البنود يتطلب الحفظ، وهو غير متاح في وضع المعاينة. افتح الصفحة في Claude لاستخدامه.'));
    if (r === 'error') setMoveMsg(t('Could not create the Etimad Souq draft. Check that you can edit this page, then try again.', 'تعذّر إنشاء مسودة سوق اعتماد. تأكد من صلاحية التعديل ثم حاول مجدداً.'));
  }

  if (check.status === 'not-available') {
    return (
      <div className="rounded-lg border border-success-100 bg-success-50 px-3 py-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <CheckCircleIcon className="w-3.5 h-3.5 text-success-600" />
          <span className="text-[12px] font-semibold text-success-700">{t('Not in Etimad Souq. Proceed with tendering.', 'غير متوفر في سوق اعتماد. تابع بالمنافسة.')}</span>
          <span className="ms-auto">{checkButton(t('Check again', 'تحقق مجدداً'))}</span>
        </div>
        {check.comment && <p className="text-[11px] text-success-700 mt-1">{check.comment}</p>}
        <div className="mt-1">{sourceNote}</div>
      </div>
    );
  }

  if (check.status === 'uncertain') {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <InfoIcon className="w-3.5 h-3.5 text-neutral-500" />
          <span className="text-[12px] font-semibold text-neutral-700">{t('Unclear. Confirm on Etimad before proceeding.', 'غير واضح. تأكد من اعتماد قبل المتابعة.')}</span>
          <span className="ms-auto">{checkButton(t('Check again', 'تحقق مجدداً'))}</span>
        </div>
        {check.comment && <p className="text-[11px] text-neutral-600 mt-1">{check.comment}</p>}
        <div className="mt-1">{sourceNote}</div>
      </div>
    );
  }

  // Available in Etimad Souq
  return (
    <div className="rounded-lg border border-warning-100 bg-warning-50 px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <AlertTriangleIcon className="w-3.5 h-3.5 text-warning-600" />
        <span className="text-[12px] font-semibold text-warning-700">{t('Available in Etimad Souq', 'متوفر في سوق اعتماد')}</span>
        <span className="ms-auto">{checkButton(t('Check again', 'تحقق مجدداً'))}</span>
      </div>
      {check.comment && <p className="text-[11px] text-warning-700">{check.comment}</p>}

      {!row.etimadKeep ? (
        <>
          <p className="text-[11px] text-warning-700">
            {t('We suggest buying this item through a separate Etimad Souq request instead of this tender.', 'نقترح شراء هذا البند عبر طلب مستقل في سوق اعتماد بدلاً من هذه المنافسة.')}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={move}
              disabled={moving}
              className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-[11px] font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors"
            >
              {moving ? t('Moving…', 'جاري النقل…') : t('Move to Etimad Souq request', 'نقل إلى طلب سوق اعتماد')}
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ etimadKeep: true })}
              className="px-3 py-1.5 rounded-lg border border-warning-500/40 bg-white text-[11px] font-semibold text-warning-700 hover:bg-warning-100 transition-colors"
            >
              {t('Keep in this tender', 'الإبقاء في هذه المنافسة')}
            </button>
          </div>
          {moveMsg && <p className="text-[11px] text-error-600">{moveMsg}</p>}
        </>
      ) : (
        <JustificationBox
          rowId={row.id}
          saved={row.etimadJustification ?? ''}
          onSubmit={(text) => onUpdate({ etimadJustification: text })}
          onMoveInstead={() => onUpdate({ etimadKeep: false })}
        />
      )}
      <div>{sourceNote}</div>
    </div>
  );
}

/** Justification for keeping an Etimad-available item in the tender: draft → Submit → saved view with Edit. */
function JustificationBox({ rowId, saved, onSubmit, onMoveInstead }: { rowId: string; saved: string; onSubmit: (text: string) => void; onMoveInstead: () => void }) {
  const t = useT();
  const [editing, setEditing] = useState(!saved.trim());
  const [draft, setDraft] = useState(saved);
  const [justSaved, setJustSaved] = useState(false);
  const fieldId = `etimad-just-${rowId}`;

  if (!editing) {
    return (
      <div className="rounded-lg border border-success-100 bg-white px-3 py-2 space-y-1">
        <div className="flex items-center gap-1.5">
          <CheckCircleIcon className="w-3.5 h-3.5 text-success-600" />
          <span className="text-[11px] font-semibold text-success-700">
            {justSaved ? t('Justification submitted', 'تم إرسال المبرر') : t('Justification', 'المبرر')}
          </span>
          <button
            type="button"
            onClick={() => { setDraft(saved); setEditing(true); setJustSaved(false); }}
            className="ms-auto text-[11px] font-semibold text-brand-700 hover:text-brand-800"
          >
            {t('Edit', 'تعديل')}
          </button>
        </div>
        <p className="text-[12px] text-neutral-800 whitespace-pre-line">{saved}</p>
      </div>
    );
  }

  const canSubmit = draft.trim().length > 0 && draft.trim() !== saved.trim();
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-[11px] font-semibold text-warning-700">
        {t('Why tender this item instead of buying it on Etimad Souq?', 'لماذا يُطرح هذا البند في منافسة بدلاً من شرائه من سوق اعتماد؟')}
      </label>
      <textarea
        id={fieldId}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={2}
        placeholder={t('e.g. Must be delivered and supported by the same contractor as the implementation services.', 'مثال: يجب توريده ودعمه من المقاول نفسه المنفذ لخدمات التطبيق.')}
        className="block w-full rounded-lg border border-warning-500/40 bg-white px-3 py-2 text-[12px] text-neutral-900 placeholder-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => { onSubmit(draft.trim()); setEditing(false); setJustSaved(true); }}
          className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-[11px] font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t('Submit justification', 'إرسال المبرر')}
        </button>
        {saved.trim() && (
          <button type="button" onClick={() => { setDraft(saved); setEditing(false); }} className="px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50">
            {t('Cancel', 'إلغاء')}
          </button>
        )}
        {!saved.trim() && (
          <span className="text-[11px] text-warning-700">{t('Required. Reviewers will ask for it.', 'مطلوب، فسيطلبه المراجعون.')}</span>
        )}
        <button type="button" onClick={onMoveInstead} className="text-[11px] font-semibold text-brand-700 hover:text-brand-800 ms-auto">
          {t('Move to Etimad Souq instead', 'النقل إلى سوق اعتماد بدلاً من ذلك')}
        </button>
      </div>
    </div>
  );
}
