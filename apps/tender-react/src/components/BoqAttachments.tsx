import { useRef, type ChangeEvent } from 'react';
import { useT } from '../context/LanguageContext';
import type { FileAttachment } from '../types/tender';

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `a_${Math.random().toString(36).slice(2)}`);

function fmtSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PaperclipIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

interface Props {
  attachments: FileAttachment[];
  onChange: (next: FileAttachment[]) => void;
  /** compact = smaller inline control for table/row use. */
  compact?: boolean;
  /** buttonOnly = just the attach button with a count (for tight table cells). */
  buttonOnly?: boolean;
}

/** Attach supporting documents to a single BOQ line. */
export default function BoqAttachments({ attachments, onChange, compact, buttonOnly }: Props) {
  const t = useT();
  const ref = useRef<HTMLInputElement>(null);

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) {
      const added: FileAttachment[] = files.map((f) => ({
        id: uid(), name: f.name, size: f.size, mimeType: f.type || 'application/octet-stream', uploadedAt: new Date().toISOString(),
      }));
      onChange([...attachments, ...added]);
    }
    e.target.value = '';
  }
  const remove = (id: string) => onChange(attachments.filter((a) => a.id !== id));

  return (
    <div className={compact ? 'flex items-center gap-1.5 flex-wrap' : 'flex items-start gap-2 flex-wrap'}>
      <input ref={ref} type="file" multiple className="hidden" onChange={onPick} />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-300 bg-white text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-colors"
      >
        <PaperclipIcon className="w-3 h-3" />
        {attachments.length > 0 ? t(`Attachments (${attachments.length})`, `المرفقات (${attachments.length})`) : t('Attach', 'إرفاق')}
      </button>
      {!buttonOnly && attachments.map((a) => (
        <span key={a.id} className="inline-flex items-center gap-1.5 max-w-[220px] px-2 py-1 rounded-lg bg-neutral-100 border border-neutral-200 text-[11px] text-neutral-700">
          <PaperclipIcon className="w-3 h-3 text-neutral-500 flex-shrink-0" />
          <span className="truncate" title={a.name}>{a.name}</span>
          {a.size > 0 && <span className="text-neutral-500 flex-shrink-0">{fmtSize(a.size)}</span>}
          <button type="button" onClick={() => remove(a.id)} className="text-neutral-500 hover:text-error-500 flex-shrink-0" aria-label={t(`Remove ${a.name}`, `إزالة ${a.name}`)}>×</button>
        </span>
      ))}
    </div>
  );
}
