// Technical member task: the request-creation "Technical Evaluation" step in view
// mode. Each item is accepted or modified; Modify opens only that row for editing.
import { useState, type ReactNode } from 'react';
import type { Task, RfpDetail } from './types';
import { SectionCard } from '../components/ui';
import { CheckIcon, DocumentIcon, PencilIcon, CheckCircleIcon, AlertTriangleIcon } from '../components/Icons';
import { LOCKED_TECH_DOCS } from '../sections/TechnicalEvaluation';
import { techReviewKeys } from './store';
import { ActionHead, BulkButton } from './ActionHead';

type T = (en: string, ar: string) => string;
type Decision = 'accepted' | 'modified';

export default function TechEvalReview({ task, isAr, t, readOnly, onDecide, onUpdate, onAcceptAll }: {
  task: Task; isAr: boolean; t: T; readOnly?: boolean;
  onDecide: (key: string, d: Decision | null) => void; onUpdate: (rfp: RfpDetail, key: string) => void; onAcceptAll: (keys: string[]) => void;
}) {
  const rfp = task.rfp!;
  const dec = task.techDecisions ?? {};
  const [editing, setEditing] = useState<string | null>(null);
  const keys = techReviewKeys(task);
  const decided = keys.filter((k) => dec[k]).length;
  const weightTotal = rfp.evaluation.reduce((s, c) => s + c.weight, 0);
  const L = (en?: string, ar?: string) => (isAr ? ar ?? en ?? '' : en ?? '');

  const save = (key: string, next: RfpDetail) => { onUpdate(next, key); setEditing(null); };
  const rowProps = (key: string) => ({ k: key, state: dec[key], editing: editing === key, readOnly, t,
    onAccept: () => onDecide(key, 'accepted'), onModify: () => setEditing(key), onUndo: () => onDecide(key, null), onCancel: () => setEditing(null) });

  return (
    <div className="space-y-5" data-tech-review>
      <ActionHead title={t('Review the technical evaluation', 'مراجعة التقييم الفني')}
        desc={t('Accept each item, or Modify a row to change it. Approve unlocks when every item is reviewed.', 'اقبل كل بند أو عدّل السطر لتغييره. يُفعّل الاعتماد بعد مراجعة جميع البنود.')}
        progress={{ done: decided, total: keys.length, label: t('items reviewed', 'بنود تمت مراجعتها'), attrs: { 'data-tech-progress': `${decided}/${keys.length}` } }}
        bulk={!readOnly && decided < keys.length ? <BulkButton onClick={() => onAcceptAll(keys.filter((k) => !dec[k]))}>{t('Accept all remaining', 'قبول جميع البنود المتبقية')}</BulkButton> : undefined} />

      {/* Evaluation member (view) */}
      <SectionCard title="Technical Evaluation Member" titleAr="عضو التقييم الفني">
        <div className="flex flex-wrap gap-2">
          {(rfp.evalCommittee ?? []).map((m) => (
            <span key={m.name} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50/60 ps-1.5 pe-3 py-1.5">
              <span className="w-7 h-7 rounded-full bg-[#2A6193] text-white text-[10px] font-semibold flex items-center justify-center">{m.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
              <span className="leading-tight"><span className="block text-[12.5px] font-semibold text-neutral-800">{L(m.name, m.nameAr)}</span><span className="block text-[11px] text-neutral-500">{L(m.roleEn, m.roleAr)} · {L(m.deptEn, m.deptAr)}</span></span>
            </span>
          ))}
        </div>
      </SectionCard>

      {/* Technical documents */}
      <SectionCard title="Technical Documents List" titleAr="قائمة الوثائق الفنية">
        <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
          {LOCKED_TECH_DOCS.map((d, i) => (
            <div key={`l${i}`} className="flex items-center gap-3 px-3.5 py-2.5 bg-neutral-50/40">
              <span className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center"><DocumentIcon className="w-4 h-4" /></span>
              <span className="flex-1 text-[13px] text-neutral-800">{L(d.en, d.ar)}</span>
              <span className="text-[10.5px] font-semibold text-neutral-500 bg-neutral-100 border border-neutral-200 rounded-full px-2 py-0.5">{t('Mandatory', 'إلزامي')}</span>
            </div>
          ))}
          {(rfp.techDocs ?? []).map((d, i) => {
            const key = `doc-${i}`;
            return (
              <EditableRow key={key} {...rowProps(key)}
                view={<div className="flex items-center gap-3"><span className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-500 flex items-center justify-center flex-shrink-0"><DocumentIcon className="w-4 h-4" /></span><span className="text-[13px] text-neutral-800">{L(d.en, d.ar)}</span></div>}
                fields={[{ label: t('Document name', 'اسم الوثيقة'), value: L(d.en, d.ar) }]}
                onSave={([v]) => save(key, { ...rfp, techDocs: rfp.techDocs!.map((x, j) => (j === i ? (isAr ? { ...x, ar: v } : { ...x, en: v }) : x)) })} />
            );
          })}
        </div>
      </SectionCard>

      {/* Technical requirements */}
      <SectionCard title="Technical Requirements" titleAr="المتطلبات الفنية">
        <div className="rounded-xl border border-neutral-200 overflow-hidden">
          <div className="grid grid-cols-[32px_minmax(140px,0.7fr)_1.6fr_auto] bg-neutral-50 border-b border-neutral-200 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
            <span className="px-3 py-2.5">#</span><span className="px-3 py-2.5">{t('Requirement', 'المتطلب')}</span><span className="px-3 py-2.5">{t('Description', 'الوصف')}</span><span className="px-3 py-2.5 text-end">{t('Review', 'المراجعة')}</span>
          </div>
          <div className="divide-y divide-neutral-100">
            {(rfp.techRequirements ?? []).map((r, i) => {
              const key = `req-${i}`;
              return (
                <EditableRow key={key} {...rowProps(key)} grid="grid-cols-[32px_minmax(140px,0.7fr)_1.6fr_auto]" index={i + 1}
                  cells={[<span className="text-[13px] font-medium text-neutral-800">{L(r.reqEn, r.reqAr)}</span>, <span className="text-[12.5px] text-neutral-600">{L(r.descEn, r.descAr)}</span>]}
                  fields={[{ label: t('Requirement', 'المتطلب'), value: L(r.reqEn, r.reqAr) }, { label: t('Description', 'الوصف'), value: L(r.descEn, r.descAr), long: true }]}
                  onSave={([a, b]) => save(key, { ...rfp, techRequirements: rfp.techRequirements!.map((x, j) => (j === i ? (isAr ? { ...x, reqAr: a, descAr: b } : { ...x, reqEn: a, descEn: b }) : x)) })} />
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* Evaluation criteria */}
      <SectionCard title="Evaluation Criteria" titleAr="معايير التقييم">
        <div className="rounded-xl border border-neutral-200 overflow-hidden">
          <div className="grid grid-cols-[32px_minmax(160px,1fr)_1.3fr_90px_auto] bg-neutral-50 border-b border-neutral-200 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
            <span className="px-3 py-2.5">#</span><span className="px-3 py-2.5">{t('Criteria Description', 'وصف المعيار')}</span><span className="px-3 py-2.5">{t('How Criteria is Applied', 'كيفية تطبيق المعيار')}</span><span className="px-3 py-2.5 text-end">{t('Final Weight', 'الوزن النهائي')}</span><span className="px-3 py-2.5 text-end">{t('Review', 'المراجعة')}</span>
          </div>
          <div className="divide-y divide-neutral-100">
            {rfp.evaluation.map((c, i) => {
              const key = `eval-${i}`;
              return (
                <EditableRow key={key} {...rowProps(key)} grid="grid-cols-[32px_minmax(160px,1fr)_1.3fr_90px_auto]" index={i + 1}
                  cells={[<span className="text-[13px] font-medium text-neutral-800">{L(c.criterionEn, c.criterionAr)}</span>, <span className="text-[12.5px] text-neutral-600">{L(c.descEn, c.descAr)}</span>, <span className="block text-end text-[13px] font-semibold text-neutral-800 tabular-nums">{c.weight}%</span>]}
                  fields={[{ label: t('Criteria description', 'وصف المعيار'), value: L(c.criterionEn, c.criterionAr) }, { label: t('How criteria is applied', 'كيفية تطبيق المعيار'), value: L(c.descEn, c.descAr), long: true }, { label: t('Final weight (%)', 'الوزن النهائي (%)'), value: String(c.weight), num: true }]}
                  onSave={([a, b, w]) => save(key, { ...rfp, evaluation: rfp.evaluation.map((x, j) => (j === i ? { ...(isAr ? { ...x, criterionAr: a, descAr: b } : { ...x, criterionEn: a, descEn: b }), weight: Number(w) || 0 } : x)) })} />
              );
            })}
          </div>
        </div>
        <div className={`flex items-center justify-between rounded-lg px-4 py-2.5 mt-4 text-sm border ${weightTotal === 100 ? 'bg-success-50 border-success-200 text-success-700' : 'bg-warning-50 border-warning-200 text-warning-700'}`} data-weight-total={weightTotal}>
          <span className="flex items-center gap-2 font-medium">{weightTotal === 100 ? <CheckCircleIcon className="w-4 h-4" /> : <AlertTriangleIcon className="w-4 h-4" />}{t('Total Weight', 'إجمالي الأوزان')}: {weightTotal}%{weightTotal !== 100 && <span className="font-normal">— {t('must equal 100%', 'يجب أن يكون 100%')}</span>}</span>
          <span className="w-48 h-2 bg-neutral-200 rounded-full overflow-hidden"><span className={`block h-full rounded-full ${weightTotal === 100 ? 'bg-success-500' : 'bg-warning-500'}`} style={{ width: `${Math.min(weightTotal, 100)}%` }} /></span>
        </div>

        {/* Passing percentage */}
        <div className="mt-5 pt-5 border-t border-neutral-100">
          <EditableRow {...rowProps('passing')} boxed
            view={<div className="flex items-center justify-between gap-4 flex-wrap"><div><p className="text-[13.5px] font-bold text-neutral-900">{t('Technical Passing Percentage', 'نسبة الاجتياز الفني')}</p><p className="text-[12px] text-neutral-500 mt-0.5">{t('Minimum score out of 100% a vendor must achieve to pass the technical evaluation stage.', 'الحد الأدنى للدرجة من 100% التي يجب على المورد تحقيقها للنجاح في مرحلة التقييم الفني.')}</p></div><span className="text-[20px] font-bold text-neutral-900 tabular-nums">{rfp.techPassing ?? 0}%</span></div>}
            fields={[{ label: t('Technical passing percentage (%)', 'نسبة الاجتياز الفني (%)'), value: String(rfp.techPassing ?? ''), num: true }]}
            onSave={([v]) => save('passing', { ...rfp, techPassing: Math.min(100, Number(v) || 0) })} />
        </div>
      </SectionCard>
    </div>
  );
}

interface FieldDef { label: string; value: string; long?: boolean; num?: boolean }

export function EditableRow({ k, state, editing, readOnly, t, onAccept, onModify, onUndo, onCancel, onSave, fields, view, cells, grid, index, boxed }: {
  k: string; state?: Decision; editing: boolean; readOnly?: boolean; t: T;
  onAccept: () => void; onModify: () => void; onUndo: () => void; onCancel: () => void; onSave: (v: string[]) => void;
  fields: FieldDef[]; view?: ReactNode; cells?: ReactNode[]; grid?: string; index?: number; boxed?: boolean;
}) {
  const [vals, setVals] = useState(fields.map((f) => f.value));
  const tone = state === 'accepted' ? 'bg-success-50/40' : state === 'modified' ? 'bg-[#EEF4FB]/60' : '';
  const actions = readOnly ? (state ? <Badge state={state} t={t} /> : null) : state ? (
    <span className="flex items-center gap-2 justify-end"><Badge state={state} t={t} /><button type="button" onClick={onUndo} className="text-[11.5px] font-semibold text-neutral-400 hover:text-neutral-700">{t('Undo', 'تراجع')}</button></span>
  ) : (
    <span className="flex items-center gap-1.5 justify-end">
      <button type="button" onClick={onAccept} data-accept={k} className="h-8 px-2.5 rounded-lg border border-success-300 bg-white hover:bg-success-50 text-success-700 text-[12px] font-semibold inline-flex items-center gap-1"><CheckIcon className="w-3.5 h-3.5" />{t('Accept', 'قبول')}</button>
      <button type="button" onClick={() => { setVals(fields.map((f) => f.value)); onModify(); }} data-modify={k} className="h-8 px-2.5 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 text-[12px] font-semibold inline-flex items-center gap-1"><PencilIcon className="w-3.5 h-3.5" />{t('Modify', 'تعديل')}</button>
    </span>
  );

  if (editing) {
    return (
      <div className={`px-4 py-3.5 bg-[#F7FAFD] border-s-2 border-[#2A6193] ${boxed ? 'rounded-xl border border-[#C9DBEC]' : ''} cm-fade-in`} data-editing={k}>
        <div className={`grid gap-3 ${fields.length >= 3 ? 'sm:grid-cols-[1fr_1.4fr_120px]' : fields.length === 2 ? 'sm:grid-cols-[1fr_1.6fr]' : ''}`}>
          {fields.map((f, i) => (
            <label key={f.label} className="block text-[11.5px] font-semibold text-neutral-600">{f.label}
              {f.long
                ? <textarea rows={2} value={vals[i]} onChange={(e) => setVals((v) => v.map((x, j) => (j === i ? e.target.value : x)))} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-[13px] font-normal text-neutral-900 focus:border-brand-500 focus:outline-none" />
                : <input type={f.num ? 'number' : 'text'} min={f.num ? 0 : undefined} max={f.num ? 100 : undefined} value={vals[i]} onChange={(e) => setVals((v) => v.map((x, j) => (j === i ? e.target.value : x)))} className={`mt-1 w-full h-9 rounded-lg border border-neutral-300 px-3 text-[13px] font-normal text-neutral-900 focus:border-brand-500 focus:outline-none ${f.num ? 'text-end tabular-nums' : ''}`} />}
            </label>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button type="button" onClick={onCancel} className="h-8 px-3 rounded-lg text-[12.5px] font-semibold text-neutral-600 hover:bg-neutral-100">{t('Cancel', 'إلغاء')}</button>
          <button type="button" disabled={vals.some((v) => !v.trim())} onClick={() => onSave(vals)} data-save={k} className="h-8 px-3 rounded-lg bg-[#2A6193] hover:bg-[#21507A] disabled:opacity-50 text-white text-[12.5px] font-semibold">{t('Save changes', 'حفظ التغييرات')}</button>
        </div>
      </div>
    );
  }
  if (cells && grid) {
    return (
      <div className={`grid ${grid} items-start ${tone}`} data-row={k} data-state={state ?? 'pending'}>
        <span className="px-3 py-3 text-[12px] text-neutral-400 tabular-nums">{index}</span>
        {cells.map((c, i) => <span key={i} className="px-3 py-3">{c}</span>)}
        <span className="px-3 py-2">{actions}</span>
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-3 px-3.5 py-2.5 ${tone} ${boxed ? 'rounded-xl border border-brand-200 bg-brand-50/30 px-4 py-3.5' : ''}`} data-row={k} data-state={state ?? 'pending'}>
      <div className="flex-1 min-w-0">{view}</div>
      <div className="flex-shrink-0">{actions}</div>
    </div>
  );
}

function Badge({ state, t }: { state: Decision; t: T }) {
  return state === 'accepted'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-100 text-success-700 text-[11.5px] font-semibold"><CheckIcon className="w-3 h-3" />{t('Accepted', 'مقبول')}</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#DCE9F6] text-[#21507A] text-[11.5px] font-semibold"><PencilIcon className="w-3 h-3" />{t('Modified', 'معدّل')}</span>;
}
