import { useT } from '../context/LanguageContext';
import { isOnEtimad, requesterAnswer, etimadAnswerOf } from '../lib/etimadCheck';
import type { BOQRow } from '../types/tender';
import JustificationField from './JustificationField';

// Manual mode: the requester answers "Is this item available on Etimad E-Market?"
// with an explicit Yes/No (nothing selected by default). Yes keeps the item in the tender and asks for a justification
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

/** Explicit Yes / No answer (radio group as a segmented pill). Nothing is selected until the user picks. */
export function EtimadAnswer({ value, onChange, size = 'md', id, ariaLabel, showRequired = true }: {
  value: 'yes' | 'no' | null; onChange: (v: 'yes' | 'no') => void; size?: 'sm' | 'md'; id?: string; ariaLabel?: string; showRequired?: boolean;
}) {
  const t = useT();
  const sm = size === 'sm';
  const opt = (v: 'yes' | 'no', label: string) => (
    <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
      className={`${sm ? 'px-3 py-1 text-[11.5px]' : 'px-4 py-1.5 text-[12.5px]'} font-semibold transition-colors ${v === 'no' ? 'border-s border-neutral-300' : ''} ${
        value === v ? 'bg-brand-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}>
      {label}
    </button>
  );
  return (
    <span className="inline-flex items-center gap-2">
      <span id={id} role="radiogroup" aria-label={ariaLabel ?? t('Available on Etimad E-Market', 'متوفر في سوق اعتماد')}
        className={`inline-flex rounded-lg border overflow-hidden ${value ? 'border-neutral-300' : 'border-warning-400'}`} dir="ltr">
        {opt('yes', t('Yes', 'نعم'))}
        {opt('no', t('No', 'لا'))}
      </span>
      {!value && showRequired && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning-700">
          <span className="w-1.5 h-1.5 rounded-full bg-warning-500" />{t('Answer required', 'الإجابة مطلوبة')}
        </span>
      )}
    </span>
  );
}

/** A plain on/off switch (used where a default of "No" is safe, e.g. Has Brand Name). */
export function EtimadSwitch({ value, onChange, size = 'md', id, ariaLabel }: { value: boolean; onChange: (v: boolean) => void; size?: 'sm' | 'md'; id?: string; ariaLabel?: string }) {
  const t = useT();
  const sm = size === 'sm';
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={value}
      aria-label={ariaLabel ?? t('Available on Etimad E-Market', 'متوفر في سوق اعتماد')}
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
    <div className="slide-up">
      <JustificationField
        id={fieldId}
        label={t(ETIMAD_JUST_LABEL.en, ETIMAD_JUST_LABEL.ar)}
        value={just}
        placeholder={t(ETIMAD_JUST_PLACEHOLDER.en, ETIMAD_JUST_PLACEHOLDER.ar)}
        onSubmit={(text) => onUpdate({ etimadJustification: text, etimadKeep: true })}
        footer={
          <button type="button" onClick={(e) => onMove(e.currentTarget.getBoundingClientRect())}
            className="text-[11.5px] font-semibold text-brand-700 hover:text-brand-800">
            {t('Move it to an Etimad E-Market request instead', 'نقله إلى طلب سوق اعتماد بدلاً من ذلك')}
          </button>
        }
      />
    </div>
  );

  if (justificationOnly) return justification || null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[11.5px] text-neutral-600">{t(ETIMAD_QUESTION.en, ETIMAD_QUESTION.ar)}</span>
        <EtimadAnswer size="sm" value={etimadAnswerOf(row)} onChange={(v) => onUpdate(requesterAnswer(row, v === 'yes', just))} />
      </div>
      {justification}
    </div>
  );
}
