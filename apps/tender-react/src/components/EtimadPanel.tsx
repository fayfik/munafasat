import { useT } from '../context/LanguageContext';
import { isOnEtimad, requesterAnswer } from '../lib/etimadCheck';
import type { BOQRow } from '../types/tender';

// Manual mode: the requester answers "Is this item available on Etimad E-Market?"
// with a Yes/No switch. Yes keeps the item in the tender and asks for a justification
// (or lets them move it to a separate Etimad E-Market request instead).

interface Props {
  row: BOQRow;
  onMove: (origin: DOMRect) => void;
  onUpdate: (patch: Partial<BOQRow>) => void;
  /** Kept for call-site compatibility with the AI version; unused in manual mode. */
  checking?: boolean;
  onCheck?: () => void;
  hideUnchecked?: boolean;
  /** Only the justification part (the switch is rendered elsewhere, e.g. in the spreadsheet cell). */
  justificationOnly?: boolean;
}

/** The Yes / No switch itself. */
export function EtimadSwitch({ value, onChange, size = 'md', id }: { value: boolean; onChange: (v: boolean) => void; size?: 'sm' | 'md'; id?: string }) {
  const t = useT();
  const sm = size === 'sm';
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={value}
      aria-label={t('Available on Etimad E-Market', 'متوفر في سوق اعتماد')}
      onClick={() => onChange(!value)}
      className={`inline-flex items-center gap-2 ${sm ? 'text-[11px]' : 'text-[12px]'} font-semibold select-none`}
      dir="ltr"
    >
      <span className={`relative inline-flex flex-shrink-0 rounded-full transition-colors ${sm ? 'w-7 h-4' : 'w-9 h-5'} ${value ? 'bg-brand-600' : 'bg-neutral-300'}`}>
        <span className={`absolute top-0.5 rounded-full bg-white shadow transition-all ${sm ? 'w-3 h-3' : 'w-4 h-4'} ${value ? (sm ? 'left-3.5' : 'left-[18px]') : 'left-0.5'}`} />
      </span>
      <span className={value ? 'text-brand-700' : 'text-neutral-500'}>{value ? t('Yes', 'نعم') : t('No', 'لا')}</span>
    </button>
  );
}

export const ETIMAD_QUESTION = { en: 'Is this item available on Etimad E-Market?', ar: 'هل هذا البند متوفر في سوق اعتماد؟' };
export const ETIMAD_JUST_LABEL = { en: 'Justification — why buy it through this tender instead of Etimad E-Market?', ar: 'المبرر — لماذا يُشترى عبر هذه المنافسة بدلاً من سوق اعتماد؟' };
export const ETIMAD_JUST_PLACEHOLDER = {
  en: 'e.g. Must be delivered and supported by the same contractor as the implementation services.',
  ar: 'مثال: يجب توريده ودعمه من المقاول نفسه المنفذ لخدمات التطبيق.',
};

export default function EtimadPanel({ row, onMove, onUpdate, justificationOnly }: Props) {
  const t = useT();
  const on = isOnEtimad(row);
  const just = row.etimadJustification ?? '';
  const fieldId = `etimad-just-${row.id}`;

  const justification = on && (
    <div className="rounded-lg border border-warning-100 bg-warning-50 px-3 py-2.5 space-y-1.5 slide-up">
      <label htmlFor={fieldId} className="block text-[11px] font-semibold text-warning-800">
        {t(ETIMAD_JUST_LABEL.en, ETIMAD_JUST_LABEL.ar)} <span className="text-error-600">*</span>
      </label>
      <textarea
        id={fieldId}
        value={just}
        onChange={(e) => onUpdate({ etimadJustification: e.target.value, etimadKeep: true })}
        rows={2}
        placeholder={t(ETIMAD_JUST_PLACEHOLDER.en, ETIMAD_JUST_PLACEHOLDER.ar)}
        className="block w-full rounded-lg border border-warning-500/40 bg-white px-3 py-2 text-[12px] text-neutral-900 placeholder-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
      />
      <div className="flex items-center gap-2 flex-wrap">
        {!just.trim() && <span className="text-[11px] text-warning-700">{t('Required to keep this item in the tender.', 'مطلوب لإبقاء هذا البند في المنافسة.')}</span>}
        <button type="button" onClick={(e) => onMove(e.currentTarget.getBoundingClientRect())}
          className="ms-auto text-[11px] font-semibold text-brand-700 hover:text-brand-800">
          {t('Move it to an Etimad E-Market request instead', 'نقله إلى طلب سوق اعتماد بدلاً من ذلك')}
        </button>
      </div>
    </div>
  );

  if (justificationOnly) return justification || null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[11.5px] text-neutral-600">{t(ETIMAD_QUESTION.en, ETIMAD_QUESTION.ar)}</span>
        <EtimadSwitch size="sm" value={on} onChange={(v) => onUpdate(requesterAnswer(row, v, just))} />
      </div>
      {justification}
    </div>
  );
}
