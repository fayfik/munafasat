// Qualification tasks: the request-creation "Qualification Criteria" step, prefilled
// from the request, in view mode. Each main and sub-criterion is accepted or modified;
// Modify opens only that row (range and weight).
import type { Task, RfpDetail } from './types';
import { SectionCard } from '../components/ui';
import { CheckIcon, CheckCircleIcon, AlertTriangleIcon } from '../components/Icons';
import { EditableRow } from './TechEvalReview';
import { qualReviewKeys } from './store';
import { useState } from 'react';

type T = (en: string, ar: string) => string;
type Decision = 'accepted' | 'modified';
const GRID_MAIN = 'grid-cols-[32px_minmax(200px,1.4fr)_minmax(140px,1fr)_90px_auto]';

export default function QualReview({ task, isAr, t, readOnly, onDecide, onUpdate, onAcceptAll }: {
  task: Task; isAr: boolean; t: T; readOnly?: boolean;
  onDecide: (key: string, d: Decision | null) => void; onUpdate: (rfp: RfpDetail, key: string) => void; onAcceptAll: (keys: string[]) => void;
}) {
  const rfp = task.rfp!;
  const crit = rfp.qualCriteria ?? [];
  const dec = task.techDecisions ?? {};
  const [editing, setEditing] = useState<string | null>(null);
  const keys = qualReviewKeys(task);
  const decided = keys.filter((k) => dec[k]).length;
  const mainTotal = crit.reduce((s, m) => s + m.pct, 0);
  const L = (en?: string, ar?: string) => (isAr ? ar ?? en ?? '' : en ?? '');
  const save = (key: string, next: RfpDetail) => { onUpdate(next, key); setEditing(null); };
  const rowProps = (key: string) => ({ k: key, state: dec[key], editing: editing === key, readOnly, t,
    onAccept: () => onDecide(key, 'accepted'), onModify: () => setEditing(key), onUndo: () => onDecide(key, null), onCancel: () => setEditing(null) });
  const setMain = (i: number, pct: number) => ({ ...rfp, qualCriteria: crit.map((m, j) => (j === i ? { ...m, pct } : m)) });
  const setSub = (i: number, si: number, range: string, pct: number) => ({ ...rfp, qualCriteria: crit.map((m, j) => (j === i ? { ...m, subs: m.subs.map((s, k) => (k === si ? { ...s, range, pct } : s)) } : m)) });

  return (
    <div className="space-y-5" data-qual-review>
      {/* Progress */}
      <div className="rounded-xl border border-[#C9DBEC] bg-gradient-to-br from-[#F3F8FC] to-white px-5 py-4 flex items-center gap-4 flex-wrap">
        <div className="min-w-[280px] flex-1">
          <p className="text-[14px] font-bold text-neutral-900">{t('Review the qualification criteria', 'مراجعة معايير التأهيل')}</p>
          <p className="text-[12.5px] text-neutral-600 mt-0.5">{t('The criteria below are prefilled from the request. Accept each criterion, or click Modify to change its range and weight. Complete is enabled once every row is reviewed and the totals are 100%.', 'المعايير أدناه معبأة مسبقاً من الطلب. اقبل كل معيار، أو انقر تعديل لتغيير النطاق والوزن. يُفعّل الإكمال بعد مراجعة جميع الأسطر وبلوغ المجاميع 100%.')}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 w-48 rounded-full bg-neutral-200 overflow-hidden"><div className="h-full bg-success-500 rounded-full transition-all" style={{ width: `${(decided / Math.max(1, keys.length)) * 100}%` }} /></div>
            <span className="text-[12px] font-semibold text-neutral-700" data-qual-progress={`${decided}/${keys.length}`}>{t(`${decided} of ${keys.length} criteria reviewed`, `${decided} من ${keys.length} معايير تمت مراجعتها`)}</span>
          </div>
        </div>
        {!readOnly && decided < keys.length && (
          <button type="button" onClick={() => onAcceptAll(keys.filter((k) => !dec[k]))}
            className="h-9 px-3.5 rounded-lg border border-success-300 bg-white text-success-700 text-[12.5px] font-semibold hover:bg-success-50 inline-flex items-center gap-1.5">
            <CheckIcon className="w-4 h-4" />{t('Accept all remaining', 'قبول جميع البنود المتبقية')}
          </button>
        )}
      </div>

      {/* Qualification member (view) */}
      <SectionCard title="Qualification Member" titleAr="عضو التأهيل" description="The member responsible for reviewing qualification criteria." descriptionAr="العضو المسؤول عن مراجعة معايير التأهيل.">
        <div className="flex flex-wrap gap-2">
          {(rfp.qualCommittee ?? []).map((m) => (
            <span key={m.name} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50/60 ps-1.5 pe-3 py-1.5">
              <span className="w-7 h-7 rounded-full bg-[#517632] text-white text-[10px] font-semibold flex items-center justify-center">{m.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
              <span className="leading-tight"><span className="block text-[12.5px] font-semibold text-neutral-800">{L(m.name, m.nameAr)}</span><span className="block text-[11px] text-neutral-500">{L(m.roleEn, m.roleAr)} · {L(m.deptEn, m.deptAr)}</span></span>
            </span>
          ))}
        </div>
      </SectionCard>

      {/* Qualification criteria (same table as the creation page) */}
      <SectionCard title="Qualification Criteria" titleAr="معايير التأهيل" description="Minimum qualification thresholds. Main criteria percentages must total 100%, as must each sub-criteria group." descriptionAr="الحدود الدنيا للتأهيل. يجب أن تكون مجموع نسب المعايير الرئيسية 100%، وكذلك كل مجموعة معايير فرعية.">
        <div className="rounded-xl border border-neutral-200 overflow-hidden">
          <div className={`grid ${GRID_MAIN} bg-neutral-50 border-b border-neutral-200 text-[11px] font-medium text-neutral-500 uppercase tracking-wide`}>
            <span className="px-3 py-2.5" /><span className="px-3 py-2.5">{t('Criteria', 'المعايير')}</span><span className="px-3 py-2.5">{t('Range', 'النطاق')}</span><span className="px-3 py-2.5 text-end">{t('Weight (%)', 'الوزن (%)')}</span><span className="px-3 py-2.5 text-end">{t('Review', 'المراجعة')}</span>
          </div>
          {crit.map((m, i) => {
            const subTotal = m.subs.reduce((s, x) => s + x.pct, 0);
            return (
              <div key={m.nameEn} className="border-b-2 border-neutral-200 last:border-b-0">
                <div className="bg-neutral-50">
                  <EditableRow {...rowProps(`qm-${i}`)} grid={GRID_MAIN} index={i + 1}
                    cells={[<span className="text-[13px] font-semibold text-neutral-800">{L(m.nameEn, m.nameAr)}</span>, <span className="text-[12px] italic text-neutral-400">{t('Main category', 'فئة رئيسية')}</span>, <span className="block text-end text-[13px] font-semibold text-neutral-800 tabular-nums">{m.pct}%</span>]}
                    fields={[{ label: t(`${m.nameEn} — weight (%)`, `${m.nameAr} — الوزن (%)`), value: String(m.pct), num: true }]}
                    onSave={([w]) => save(`qm-${i}`, setMain(i, Number(w) || 0))} />
                </div>
                <div className="divide-y divide-neutral-100">
                  {m.subs.map((s, si) => (
                    <EditableRow key={s.nameEn} {...rowProps(`qs-${i}-${si}`)} grid={GRID_MAIN} index={undefined}
                      cells={[<span className="flex items-start gap-2 ps-2"><span className="text-neutral-300">└</span><span className="text-[12.5px] text-neutral-700">{L(s.nameEn, s.nameAr)}</span></span>, <span className="text-[12.5px] text-neutral-700">{s.range}</span>, <span className="block text-end text-[12.5px] text-neutral-700 tabular-nums">{s.pct}%</span>]}
                      fields={[{ label: t(`${s.nameEn} — range`, `${s.nameAr} — النطاق`), value: s.range }, { label: t('Weight (%)', 'الوزن (%)'), value: String(s.pct), num: true }]}
                      onSave={([r, w]) => save(`qs-${i}-${si}`, setSub(i, si, r, Number(w) || 0))} />
                  ))}
                </div>
                <div className={`grid ${GRID_MAIN} ${subTotal === 100 ? 'bg-success-50/40' : 'bg-warning-50/40'}`}>
                  <span /><span className="px-3 py-1.5 ps-8 text-[12px] italic text-neutral-400">{t('Sub-criteria total', 'إجمالي المعايير الفرعية')}</span><span />
                  <span className={`px-3 py-1.5 text-end text-[12px] font-semibold tabular-nums ${subTotal === 100 ? 'text-success-600' : 'text-warning-600'}`} data-sub-total={subTotal}>{subTotal}% {subTotal !== 100 && '⚠'}</span><span />
                </div>
              </div>
            );
          })}
        </div>
        <div className={`flex items-center justify-between rounded-lg px-4 py-2.5 mt-4 text-sm border ${mainTotal === 100 ? 'bg-success-50 border-success-200 text-success-700' : 'bg-warning-50 border-warning-200 text-warning-700'}`} data-main-total={mainTotal}>
          <span className="flex items-center gap-2 font-medium">{mainTotal === 100 ? <CheckCircleIcon className="w-4 h-4" /> : <AlertTriangleIcon className="w-4 h-4" />}{t('Main Criteria Total', 'إجمالي المعايير الرئيسية')}: {mainTotal}%{mainTotal !== 100 && <span className="font-normal">— {t('must equal 100%', 'يجب أن يكون 100%')}</span>}</span>
          <span className="w-48 h-2 bg-neutral-200 rounded-full overflow-hidden"><span className={`block h-full rounded-full ${mainTotal === 100 ? 'bg-success-500' : 'bg-warning-500'}`} style={{ width: `${Math.min(mainTotal, 100)}%` }} /></span>
        </div>
      </SectionCard>
    </div>
  );
}
