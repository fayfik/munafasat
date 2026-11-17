/* Steps 9, 11, 12 and 15 of the request flow, up to publishing in Etimad:
   9  Finance qualification (financial criteria — Finance-owned, hidden from requesters)
   11 Procurement TL: procurement method, priority, assign officer
   12 Procurement Officer: review everything and confirm value & duration
   15 Procurement Officer: create the request in Etimad and record the reference */
import { useEffect, useState, type ReactNode } from 'react';
import type { RfpDetail, Task, FinQual, FinRatio, ProcMethod } from './types';
import { ActionHead } from './ActionHead';
import { Button } from '../components/ui';
import { CheckCircleIcon, CheckIcon, SparklesIcon, AlertTriangleIcon } from '../components/Icons';
import { Avatar } from './InboxTools';
import { toast } from '../components/Toast';
import { PROC_TEAM } from './data';
import { fmtSAR, fmtDateTime } from './store';
import {
  CONTRACT_OPTS, ENVELOPE_OPTS, PRIORITY_OPTS, VENDOR_POOL, optLabel, areaLabel, deliveryLabel, boqValueOf,
  suggestFinQual, finQualOk, suggestPriority, smeOpenRfp, qualFlags,
} from './procGuide';

type T = (en: string, ar: string) => string;
type P = { task: Task; isAr: boolean; t: T; readOnly?: boolean; onRfp: (rfp: RfpDetail) => void };
const nm = (p: { name: string; nameAr?: string }, isAr: boolean) => (isAr ? p.nameAr ?? p.name : p.name);
const now = () => new Date().toISOString();

const Card = ({ title, aside, children, attr }: { title: string; aside?: ReactNode; children: ReactNode; attr?: Record<string, string> }) => (
  <section className="rounded-xl border border-neutral-200 bg-white px-6 py-5 rise-in" {...attr}>
    <div className="flex items-center justify-between gap-3 mb-3"><p className="text-[13px] font-bold text-neutral-800">{title}</p>{aside}</div>
    {children}
  </section>
);
const pill = (on: boolean) => `h-9 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-200 ${on ? 'bg-white text-neutral-900 shadow-[0_1px_2px_rgba(16,24,40,0.08)] ring-1 ring-neutral-200/70' : 'text-neutral-600 hover:text-neutral-900'}`;
function Segmented<K extends string>({ opts, value, onPick, isAr, disabled, attr }: { opts: { id: K; en: string; ar: string; hintEn?: string; hintAr?: string }[]; value?: K; onPick: (k: K) => void; isAr: boolean; disabled?: boolean; attr: string }) {
  return (
    <div className="inline-flex flex-wrap gap-0.5 p-1 rounded-[20px] bg-neutral-100" role="radiogroup" {...{ [attr]: value ?? '' }}>
      {opts.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} disabled={disabled} title={isAr ? o.hintAr : o.hintEn}
          className={`${pill(value === o.id)} disabled:cursor-default`} onClick={() => onPick(o.id)} data-opt={o.id}>{isAr ? o.ar : o.en}</button>
      ))}
    </div>
  );
}
const Kv = ({ k, v, ltr }: { k: string; v: ReactNode; ltr?: boolean }) => (
  <div className="bg-neutral-50 px-3 py-2.5 min-w-0">
    <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-neutral-400">{k}</dt>
    <dd className="mt-1 text-[13px] font-semibold text-neutral-800 truncate" dir={ltr ? 'ltr' : undefined}>{v}</dd>
  </div>
);
const KvGrid = ({ children }: { children: ReactNode }) => <dl className="grid grid-cols-2 md:grid-cols-3 gap-px bg-neutral-200 rounded-lg border border-neutral-200 overflow-hidden">{children}</dl>;
export const PriorityChip = ({ p, isAr }: { p?: string; isAr: boolean }) => {
  const o = PRIORITY_OPTS.find((x) => x.id === p); if (!o) return null;
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${o.cls}`} data-project-priority={o.id}>{isAr ? `المشروع · ${o.ar}` : `Project · ${o.en}`}</span>;
};

/** Project priority for list rows: set by the TL, or suggested (dashed) while a request waits in the team queue. */
export function ProjectPriority({ task, isAr }: { task: Task; isAr: boolean }) {
  const set = task.rfp?.procMethod?.priority;
  if (set) return <PriorityChip p={set} isAr={isAr} />;
  if (!task.queue || !task.rfp) return null;
  const o = PRIORITY_OPTS.find((x) => x.id === suggestPriority(task.rfp!))!;
  return <span className="inline-flex items-center rounded-full border border-dashed border-neutral-300 px-2 py-0.5 text-[11px] font-semibold text-neutral-500 whitespace-nowrap" data-project-priority-suggested={o.id}>{isAr ? `${o.ar} · مقترحة` : `${o.en} · suggested`}</span>;
}

/* ── 9 · Finance qualification ─────────────────────────────────────────── */
/** 1–7 score bands between the minimum and the target of a ratio (read-only key). */
export function scoreBands(r: FinRatio): string[] {
  const lo = Number(r.min), hi = Number(r.max);
  if (!(hi > lo)) return Array(7).fill('—');
  const step = (hi - lo) / 5;
  return Array.from({ length: 7 }, (_, i) => i === 0 ? `< ${lo.toFixed(2)}` : i === 6 ? `≥ ${hi.toFixed(2)}` : `${(lo + step * (i - 1)).toFixed(2)}–${(lo + step * i).toFixed(2)}`);
}
export function FinQualEditor({ task, isAr, t, readOnly, onRfp }: P) {
  const rfp = task.rfp!;
  const sug = suggestFinQual(rfp);
  const fq = rfp.finQual ?? sug;
  useEffect(() => { if (!rfp.finQual && !readOnly) onRfp({ ...rfp, finQual: { ...sug, by: task.assignee.name, at: now() } }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p: Partial<FinQual>) => onRfp({ ...rfp, finQual: { ...fq, ...p, by: task.assignee.name, at: now() } });
  const setR = (k: 'liquidity' | 'cash', p: Partial<FinRatio>) => {
    const next = { ...fq[k], ...p };
    // Two weights always add up to 100: editing one moves the other.
    const other = k === 'liquidity' ? 'cash' : 'liquidity';
    set(p.weight != null ? { [k]: next, [other]: { ...fq[other], weight: Math.max(0, 100 - p.weight) } } as Partial<FinQual> : { [k]: next } as Partial<FinQual>);
  };
  const total = fq.liquidity.weight + fq.cash.weight;
  const isSug = JSON.stringify([fq.liquidity, fq.cash, fq.passing]) === JSON.stringify([sug.liquidity, sug.cash, sug.passing]);
  const RATIOS: { k: 'liquidity' | 'cash'; en: string; ar: string; fEn: string; fAr: string }[] = [
    { k: 'liquidity', en: 'Liquidity ratio', ar: 'نسبة السيولة', fEn: 'Current assets ÷ current liabilities', fAr: 'الأصول المتداولة ÷ الخصوم المتداولة' },
    { k: 'cash', en: 'Cash ratio', ar: 'نسبة النقدية', fEn: 'Cash & equivalents ÷ current liabilities', fAr: 'النقد وما يعادله ÷ الخصوم المتداولة' },
  ];
  const inp = 'w-20 text-[12.5px] text-end border border-neutral-200 rounded-md px-2 py-1.5 bg-white tabular-nums focus:outline-none focus:border-brand-400 disabled:bg-neutral-50';
  return (
    <div className="space-y-5" data-fin-qual>
      <ActionHead title={t('Set the financial qualification criteria', 'تحديد معايير التأهيل المالي')}
        desc={t('Finance owns these — requesters never see them. Ranges and weights are suggested from the project profile; adjust if needed.', 'تملكها المالية — لا يراها مقدّمو الطلبات. النطاقات والأوزان مقترحة من ملف المشروع؛ عدّلها عند الحاجة.')}
        extra={<span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600" data-fin-hidden>{t('Hidden from requester', 'مخفية عن مقدّم الطلب')}</span>} />

      <Card title={t('Project profile', 'ملف المشروع')} attr={{ 'data-fin-profile': '' }}>
        <KvGrid>
          <Kv k={t('Estimated value (excl. VAT)', 'القيمة التقديرية (بدون ضريبة)')} v={fmtSAR(boqValueOf(rfp))} ltr />
          <Kv k={t('Duration', 'المدة')} v={rfp.duration ?? '—'} />
          <Kv k={t('Nature', 'الطبيعة')} v={`${areaLabel(rfp, isAr)} · ${deliveryLabel(rfp, isAr)}`} />
        </KvGrid>
        <p className="mt-3 text-[12.5px] text-neutral-600 leading-relaxed line-clamp-2"><span className="font-semibold text-neutral-700">{t('Scope', 'النطاق')}: </span>{isAr ? rfp.scopeAr : rfp.scopeEn}</p>
        {!readOnly && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="secondary" data-fin-request-value disabled={fq.valueRequested}
              onClick={() => { set({ valueRequested: true }); toast(t('Estimated value requested from the Procurement Officer', 'طُلبت القيمة التقديرية من أخصائي المشتريات')); }}>
              {fq.valueRequested ? <><CheckIcon className="w-3.5 h-3.5" />{t('Value requested', 'تم طلب القيمة')}</> : t('Request estimated value', 'طلب القيمة التقديرية')}
            </Button>
            {rfp.projectArea === 'non-it' && (
              <Button size="sm" variant="ghost" data-fin-redirect onClick={() => toast(t('Redirected to Non-IT Finance qualification', 'أُحيلت إلى التأهيل المالي لغير التقنية'))}>{t('Redirect to Non-IT Finance', 'إحالة إلى مالية غير التقنية')}</Button>
            )}
          </div>
        )}
      </Card>

      <Card title={t('Financial criteria', 'المعايير المالية')} attr={{ 'data-fin-criteria': '' }}
        aside={isSug
          ? <span className="inline-flex items-center gap-1 rounded-full bg-ai-50 border border-ai-200 px-2 py-0.5 text-[11px] font-semibold text-ai-700"><SparklesIcon className="w-3 h-3" />{t('Suggested for this profile', 'مقترحة لهذا الملف')}</span>
          : !readOnly && <Button size="sm" variant="ghost" data-fin-reset onClick={() => set({ liquidity: sug.liquidity, cash: sug.cash, passing: sug.passing })}><SparklesIcon className="w-3.5 h-3.5" />{t('Use suggested', 'استخدام المقترح')}</Button>}>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-[12.5px] min-w-[520px]">
            <thead><tr className="bg-neutral-50 border-b border-neutral-200 text-[11.5px] text-neutral-500">
              <th className="text-start px-3 py-2 font-medium">{t('Ratio', 'النسبة')}</th>
              <th className="text-end px-3 py-2 font-medium">{t('Minimum', 'الحد الأدنى')}</th>
              <th className="text-end px-3 py-2 font-medium">{t('Target', 'المستهدف')}</th>
              <th className="text-end px-3 py-2 font-medium">{t('Weight', 'الوزن')}</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {RATIOS.map((r) => (
                <tr key={r.k} data-fin-ratio={r.k}>
                  <td className="px-3 py-2.5"><p className="font-semibold text-neutral-800">{isAr ? r.ar : r.en}</p><p className="text-[11px] text-neutral-400">{isAr ? r.fAr : r.fEn}</p></td>
                  <td className="px-3 py-2.5 text-end"><input className={inp} disabled={readOnly} value={fq[r.k].min} onChange={(e) => setR(r.k, { min: e.target.value })} data-fin-min /></td>
                  <td className="px-3 py-2.5 text-end"><input className={inp} disabled={readOnly} value={fq[r.k].max} onChange={(e) => setR(r.k, { max: e.target.value })} data-fin-max /></td>
                  <td className="px-3 py-2.5 text-end"><span className="inline-flex items-center gap-1"><input type="number" min={0} max={100} className={inp} disabled={readOnly} value={fq[r.k].weight} onChange={(e) => setR(r.k, { weight: Math.min(100, Number(e.target.value) || 0) })} data-fin-weight /><span className="text-neutral-400">%</span></span></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className={`border-t border-neutral-200 ${total === 100 ? 'bg-success-50/50' : 'bg-warning-50/50'}`}>
              <td colSpan={3} className="px-3 py-2 text-end text-[12px] font-semibold text-neutral-600">{t('Total weight', 'إجمالي الأوزان')}</td>
              <td className={`px-3 py-2 text-end font-bold tabular-nums ${total === 100 ? 'text-success-700' : 'text-warning-700'}`} data-fin-total>{total}%</td>
            </tr></tfoot>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-brand-200 bg-brand-50/40 px-4 py-3">
          <div><p className="text-[13px] font-bold text-neutral-900">{t('Financial passing percentage', 'نسبة الاجتياز المالي')}</p><p className="text-[11.5px] text-neutral-500">{t('Default 60%.', 'الافتراضي 60%.')}</p></div>
          <span className="inline-flex items-center gap-1"><input type="number" min={1} max={100} className={`${inp} text-base font-bold w-24`} disabled={readOnly} value={fq.passing} onChange={(e) => set({ passing: Number(e.target.value) || 0 })} data-fin-passing /><span className="text-neutral-400">%</span></span>
        </div>
      </Card>

      <Card title={t('Scoring key (1–7)', 'مفتاح التقييم (1–7)')} aside={<span className="text-[11px] text-neutral-400">{t('Read-only · from the ranges above', 'للقراءة فقط · من النطاقات أعلاه')}</span>} attr={{ 'data-fin-key': '' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px] min-w-[560px] tabular-nums">
            <thead><tr className="text-neutral-400"><th className="text-start font-medium py-1 pe-2" />{[1, 2, 3, 4, 5, 6, 7].map((n) => <th key={n} className="font-semibold py-1 text-center">{n}</th>)}</tr></thead>
            <tbody>{RATIOS.map((r) => (
              <tr key={r.k} className="border-t border-neutral-100"><td className="py-1.5 pe-2 font-semibold text-neutral-700 whitespace-nowrap">{isAr ? r.ar : r.en}</td>
                {scoreBands(fq[r.k]).map((b, i) => <td key={i} className="py-1.5 px-1 text-center text-neutral-600" dir="ltr"><span className="inline-block rounded px-1.5 py-0.5" style={{ background: `rgba(42,97,147,${0.04 + i * 0.03})` }}>{b}</span></td>)}
              </tr>))}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ── 11 · TL: procurement method, priority, assign ─────────────────────── */
export const OFFICER_POOL = () => PROC_TEAM.filter((p) => p.id !== 'u-abdullah');
export function TlMethod({ task, isAr, t, readOnly, onRfp }: P) {
  const rfp = task.rfp!;
  const m: ProcMethod = rfp.procMethod ?? {};
  const sugP = suggestPriority(rfp);
  const officers = OFFICER_POOL();
  const lowest = [...officers].sort((a, b) => a.load - b.load)[0];
  // The suggested priority counts as set until the TL changes it; it is saved with the TL's first choice.
  const set = (p: Partial<ProcMethod>) => onRfp({ ...rfp, procMethod: { priority: sugP, ...m, ...p, by: task.assignee.name, byAr: task.assignee.nameAr, at: now() } });
  const prio = m.priority ?? sugP;
  const [vendor, setVendor] = useState('');
  const invited = m.invitedVendors ?? [];
  const steps = [!!m.contractType && (m.contractType !== 'direct' || !!m.directJustification?.trim()) && (m.contractType !== 'closed' || invited.length > 0), !!m.envelope, !!prio, !!m.officerId];
  return (
    <div className="space-y-5" data-tl-method>
      <ActionHead title={t('Set procurement method & assign', 'تحديد طريقة الشراء والإسناد')}
        desc={t('Choose how this goes to market, set the project priority, then assign an officer to review and publish it.', 'اختر طريقة طرح الطلب في السوق وحدد أولوية المشروع ثم أسنده إلى أخصائي للمراجعة والنشر.')}
        progress={{ done: steps.filter(Boolean).length, total: 4, label: t('set', 'محددة'), attrs: { 'data-tl-progress': `${steps.filter(Boolean).length}/4` } }} />

      <Card title={t('Contract type', 'نوع العقد')} attr={{ 'data-tl-contract': '' }}>
        <Segmented opts={CONTRACT_OPTS} value={m.contractType} onPick={(k) => set({ contractType: k })} isAr={isAr} disabled={readOnly} attr="data-contract" />
        {m.contractType && <p className="mt-2 text-[12px] text-neutral-500 fade-in">{(() => { const o = CONTRACT_OPTS.find((x) => x.id === m.contractType)!; return isAr ? o.hintAr : o.hintEn; })()}</p>}
        {m.contractType === 'direct' && (
          <div className="mt-3 fade-in">
            <label className="block text-[12px] font-semibold text-neutral-700 mb-1">{t('Justification for direct purchase', 'مبرر الشراء المباشر')} <span className="text-error-600">*</span></label>
            <textarea rows={2} disabled={readOnly} value={m.directJustification ?? ''} onChange={(e) => set({ directJustification: e.target.value })} data-tl-justification
              placeholder={t('e.g. sole OEM licence holder; renewal of existing subscription', 'مثال: الوكيل الوحيد للترخيص؛ تجديد اشتراك قائم')}
              className="w-full text-[13px] rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:border-brand-400" />
          </div>
        )}
        {m.contractType === 'closed' && (
          <div className="mt-3 fade-in" data-tl-vendors>
            <p className="text-[12px] font-semibold text-neutral-700 mb-1.5">{t('Invited vendors', 'الموردون المدعوون')} <span className="text-error-600">*</span> <span className="font-normal text-neutral-400">· {invited.length}</span></p>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set([...VENDOR_POOL, ...invited])].map((v) => {
                const on = invited.includes(v);
                return <button key={v} type="button" disabled={readOnly} data-vendor={v} onClick={() => set({ invitedVendors: on ? invited.filter((x) => x !== v) : [...invited, v] })}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${on ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>{on && <CheckIcon className="w-3 h-3" />}{v}</button>;
              })}
            </div>
            {!readOnly && <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = vendor.trim(); if (v && !invited.includes(v)) set({ invitedVendors: [...invited, v] }); setVendor(''); }}>
              <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder={t('Add another vendor…', 'أضف مورداً آخر…')} className="flex-1 text-[12.5px] rounded-lg border border-neutral-300 px-3 py-1.5 focus:outline-none focus:border-brand-400" />
              <Button size="sm" variant="secondary" type="submit">{t('Add', 'إضافة')}</Button>
            </form>}
          </div>
        )}
      </Card>

      <Card title={t('Envelope type', 'نوع الظرف')} attr={{ 'data-tl-envelope': '' }}>
        <Segmented opts={ENVELOPE_OPTS} value={m.envelope} onPick={(k) => set({ envelope: k })} isAr={isAr} disabled={readOnly} attr="data-envelope" />
        {m.envelope && <p className="mt-2 text-[12px] text-neutral-500 fade-in">{(() => { const o = ENVELOPE_OPTS.find((x) => x.id === m.envelope)!; return isAr ? o.hintAr : o.hintEn; })()}</p>}
      </Card>

      <Card title={t('Project priority', 'أولوية المشروع')} attr={{ 'data-tl-priority': '' }}
        aside={<span className="inline-flex items-center gap-1 rounded-full bg-ai-50 border border-ai-200 px-2 py-0.5 text-[11px] font-semibold text-ai-700" data-priority-suggested={sugP}><SparklesIcon className="w-3 h-3" />{t(`Suggested: ${optLabel(PRIORITY_OPTS, sugP, false)}`, `المقترح: ${optLabel(PRIORITY_OPTS, sugP, true)}`)}</span>}>
        <Segmented opts={PRIORITY_OPTS} value={prio} onPick={(k) => set({ priority: k })} isAr={isAr} disabled={readOnly} attr="data-priority" />
        <p className="mt-2 text-[12px] text-neutral-500">{t('From the value, duration and start date. Shown to the team in the queue and on the request.', 'من القيمة والمدة وتاريخ البدء. تظهر للفريق في قائمة الانتظار وعلى الطلب.')}</p>
      </Card>

      <Card title={t('Assign officer', 'إسناد إلى أخصائي')} attr={{ 'data-tl-assign': '' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 stagger">
          {officers.map((p) => {
            const on = m.officerId === p.id;
            return (
              <label key={p.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${on ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/15' : 'border-neutral-200 hover:bg-neutral-50'}`} data-officer={p.id}>
                <input type="radio" name={`officer-${task.id}`} className="accent-brand-600" disabled={readOnly} checked={on} onChange={() => set({ officerId: p.id, officerName: p.name, officerNameAr: p.nameAr })} />
                <Avatar p={p} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold text-neutral-800 truncate">{nm(p, isAr)}</span>
                  <span className="flex items-center gap-2 mt-1">
                    <span className="h-1 w-16 rounded-full bg-neutral-100 overflow-hidden"><span className={`block h-full rounded-full ${p.load >= 6 ? 'bg-warning-500' : 'bg-success-500'}`} style={{ width: `${Math.min(100, p.load * 14)}%` }} /></span>
                    <span className="text-[11.5px] text-neutral-500 tabular-nums">{t(`${p.load} open`, `${p.load} مفتوحة`)}</span>
                    {p.id === lowest?.id && <span className="text-[10.5px] font-semibold text-success-700">{t('Lowest load', 'الأقل حملاً')}</span>}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* Everything the TL and earlier steps decided, in one view (Officer confirm + Etimad summary). */
function MethodSummary({ rfp, isAr, t }: { rfp: RfpDetail; isAr: boolean; t: T }) {
  const m = rfp.procMethod ?? {};
  return (
    <KvGrid>
      <Kv k={t('Contract type', 'نوع العقد')} v={optLabel(CONTRACT_OPTS, m.contractType, isAr)} />
      <Kv k={t('Envelope', 'الظرف')} v={optLabel(ENVELOPE_OPTS, m.envelope, isAr)} />
      <Kv k={t('Project priority', 'أولوية المشروع')} v={<PriorityChip p={m.priority} isAr={isAr} />} />
      {m.contractType === 'closed' && <Kv k={t('Invited vendors', 'الموردون المدعوون')} v={(m.invitedVendors ?? []).join(', ') || '—'} />}
      {m.contractType === 'direct' && <Kv k={t('Direct purchase justification', 'مبرر الشراء المباشر')} v={m.directJustification || '—'} />}
      <Kv k={t('Officer', 'الأخصائي')} v={m.officerName ? (isAr ? m.officerNameAr ?? m.officerName : m.officerName) : '—'} />
      <Kv k={t('Set by', 'حدده')} v={m.by ? (isAr ? m.byAr ?? m.by : m.by) : '—'} />
    </KvGrid>
  );
}

/* ── 12 · Officer: review everything, confirm value & duration ─────────── */
export function OfficerConfirm({ task, isAr, t, readOnly, onRfp }: P) {
  const rfp = task.rfp!;
  const [value, setValue] = useState(String(rfp.officerConfirm?.value ?? task.amount ?? Math.round(boqValueOf(rfp) * 1.15)));
  const [duration, setDuration] = useState(rfp.officerConfirm?.duration ?? rfp.duration ?? '');
  const ok = !!rfp.officerConfirm;
  const fq = rfp.finQual;
  const flags = qualFlags(rfp);
  const checks: [string, string, boolean][] = [
    [t('Procurement method set', 'تم تحديد طريقة الشراء'), '', !!rfp.procMethod?.contractType && !!rfp.procMethod?.envelope],
    [t('Financial criteria weights total 100%', 'أوزان المعايير المالية 100%'), '', finQualOk(fq)],
    [t('Qualification open to SMEs', 'التأهيل متاح للمنشآت الصغيرة'), flags.size ? t(`${flags.size} above typical range — justified by requester`, `${flags.size} فوق النطاق — مبررة من مقدّم الطلب`) : '', flags.size === 0],
    [t('Technical passing percentage set', 'تم تحديد نسبة الاجتياز الفني'), '', rfp.techPassing != null],
  ];
  return (
    <div className="space-y-5" data-officer-confirm>
      <ActionHead title={t('Review & confirm', 'المراجعة والتأكيد')}
        desc={t('One view of the request and every decision on it. Confirm the estimated contract value and duration, then mark it good to go — or return it with comments.', 'عرض واحد للطلب وكل القرارات عليه. أكّد القيمة التقديرية للعقد ومدته ثم اعتمد جاهزيته — أو أعده مع ملاحظات.')}
        progress={{ done: ok ? 1 : 0, total: 1, label: t('confirmed', 'مؤكد'), attrs: { 'data-officer-progress': ok ? '1/1' : '0/1' } }} />
      <Card title={t('Procurement method (set by Procurement TL)', 'طريقة الشراء (حددها رئيس فريق المشتريات)')} attr={{ 'data-officer-method': '' }}><MethodSummary rfp={rfp} isAr={isAr} t={t} /></Card>
      <Card title={t('Request at a glance', 'الطلب في لمحة')}>
        <KvGrid>
          <Kv k={t('Nature', 'الطبيعة')} v={`${areaLabel(rfp, isAr)} · ${deliveryLabel(rfp, isAr)}`} />
          <Kv k={t('BOQ value (excl. VAT)', 'قيمة الجدول (بدون ضريبة)')} v={fmtSAR(boqValueOf(rfp))} ltr />
          <Kv k={t('Qualification passing', 'اجتياز التأهيل')} v={`${rfp.qualPassing ?? 60}%`} />
          <Kv k={t('Financial criteria', 'المعايير المالية')} v={fq ? `${t('Liquidity', 'السيولة')} ${fq.liquidity.weight}% · ${t('Cash', 'النقدية')} ${fq.cash.weight}% · ${fq.passing}%` : '—'} />
          <Kv k={t('Technical passing', 'الاجتياز الفني')} v={rfp.techPassing != null ? `${rfp.techPassing}%` : '—'} />
          <Kv k={t('Documents', 'المستندات')} v={String(rfp.documents.length)} />
        </KvGrid>
        <ul className="mt-3 space-y-1.5" data-officer-checks>
          {checks.map(([l, sub, pass], i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px]">
              {pass ? <CheckCircleIcon className="w-4 h-4 text-success-600 mt-0.5" /> : <AlertTriangleIcon className="w-4 h-4 text-warning-600 mt-0.5" />}
              <span className="text-neutral-700">{l}{sub && <span className="text-neutral-400"> · {sub}</span>}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card title={t('Confirm estimated contract value & duration', 'تأكيد القيمة التقديرية للعقد ومدته')} attr={{ 'data-officer-value': '' }}
        aside={ok ? <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-success-700 fade-in"><CheckCircleIcon className="w-3.5 h-3.5" />{t('Confirmed', 'مؤكد')} · {fmtDateTime(rfp.officerConfirm!.at, isAr)}</span> : undefined}>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <label className="block"><span className="block text-[12px] font-semibold text-neutral-600 mb-1">{t('Estimated value (SAR, incl. VAT)', 'القيمة التقديرية (ريال، شامل الضريبة)')}</span>
            <input dir="ltr" type="number" value={value} disabled={readOnly || ok} onChange={(e) => setValue(e.target.value)} data-officer-value-input className="w-full text-[13px] rounded-lg border border-neutral-300 px-3 py-2 tabular-nums disabled:bg-neutral-50 focus:outline-none focus:border-brand-400" /></label>
          <label className="block"><span className="block text-[12px] font-semibold text-neutral-600 mb-1">{t('Contract duration', 'مدة العقد')}</span>
            <input value={duration} disabled={readOnly || ok} onChange={(e) => setDuration(e.target.value)} data-officer-duration className="w-full text-[13px] rounded-lg border border-neutral-300 px-3 py-2 disabled:bg-neutral-50 focus:outline-none focus:border-brand-400" /></label>
          {!readOnly && (ok
            ? <Button variant="ghost" data-officer-edit onClick={() => { const { officerConfirm: _o, ...rest } = rfp; onRfp(rest as RfpDetail); }}>{t('Edit', 'تعديل')}</Button>
            : <Button variant="secondary" data-officer-confirm-btn disabled={!(Number(value) > 0) || !duration.trim()}
                onClick={() => { onRfp({ ...rfp, officerConfirm: { value: Number(value), duration: duration.trim(), by: task.assignee.name, byAr: task.assignee.nameAr, at: now() } }); toast(t('Value and duration confirmed', 'تم تأكيد القيمة والمدة')); }}>
                <CheckIcon className="w-4 h-4" />{t('Confirm', 'تأكيد')}</Button>)}
        </div>
      </Card>
    </div>
  );
}

/* ── 15 · Officer: create the request in Etimad ────────────────────────── */
export function EtimadCreate({ task, isAr, t, readOnly, onRfp }: P) {
  const rfp = task.rfp!;
  const m = rfp.procMethod ?? {};
  const fq = rfp.finQual;
  const [ref, setRef] = useState(rfp.etimad?.ref ?? '');
  const done = !!rfp.etimad;
  const rows: [string, string][] = [
    [t('Contract type', 'نوع العقد'), optLabel(CONTRACT_OPTS, m.contractType, isAr)],
    [t('Envelope', 'الظرف'), optLabel(ENVELOPE_OPTS, m.envelope, isAr)],
    [t('Project priority', 'أولوية المشروع'), optLabel(PRIORITY_OPTS, m.priority, isAr)],
    [t('Technical criteria', 'المعايير الفنية'), `${rfp.evaluation.length} ${t('criteria', 'معايير')} · ${t('passing', 'الاجتياز')} ${rfp.techPassing ?? '—'}%`],
    [t('Qualification criteria', 'معايير التأهيل'), `${(rfp.qualCriteria ?? []).reduce((n, x) => n + x.subs.length, 0)} ${t('sub-criteria', 'معايير فرعية')} · ${t('passing', 'الاجتياز')} ${rfp.qualPassing ?? 60}% · ${smeOpenRfp(rfp) ? t('open to SMEs', 'متاح للمنشآت الصغيرة') : t('justified above range', 'أعلى من النطاق بمبرر')}`],
    [t('Financial criteria', 'المعايير المالية'), fq ? `${t('Liquidity', 'السيولة')} ${fq.liquidity.min}–${fq.liquidity.max} (${fq.liquidity.weight}%) · ${t('Cash', 'النقدية')} ${fq.cash.min}–${fq.cash.max} (${fq.cash.weight}%) · ${t('passing', 'الاجتياز')} ${fq.passing}%` : '—'],
    ...(m.contractType === 'closed' ? [[t('Invited vendors', 'الموردون المدعوون'), (m.invitedVendors ?? []).join(', ')] as [string, string]] : []),
    [t('Estimated value', 'القيمة التقديرية'), rfp.officerConfirm ? `${fmtSAR(rfp.officerConfirm.value)} · ${rfp.officerConfirm.duration}` : fmtSAR(task.amount ?? 0)],
    [t('Documents', 'المستندات'), `${rfp.documents.length} ${t('files', 'ملفات')}`],
  ];
  return (
    <div className="space-y-5" data-etimad-create>
      <ActionHead title={t('Create the request in Etimad', 'إنشاء الطلب في منصة اعتماد')}
        desc={t('Everything below is approved. Create the competition in Etimad with these settings, then record the Etimad reference here.', 'كل ما يلي معتمد. أنشئ المنافسة في اعتماد بهذه الإعدادات ثم سجّل مرجع اعتماد هنا.')}
        progress={{ done: done ? 1 : 0, total: 1, label: t('recorded', 'مسجل'), attrs: { 'data-etimad-progress': done ? '1/1' : '0/1' } }} />
      <Card title={t('Publication summary', 'ملخص النشر')} attr={{ 'data-etimad-summary': '' }}
        aside={!readOnly && <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(rows.map(([k, v]) => `${k}: ${v}`).join('\n')).catch(() => {}); toast(t('Summary copied', 'تم نسخ الملخص')); }}>{t('Copy', 'نسخ')}</Button>}>
        <dl className="divide-y divide-neutral-100 stagger">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[180px_1fr] gap-3 py-2 text-[12.5px]"><dt className="text-neutral-500">{k}</dt><dd className="font-semibold text-neutral-800">{v}</dd></div>
          ))}
        </dl>
      </Card>
      <Card title={t('Etimad reference', 'مرجع اعتماد')} attr={{ 'data-etimad-ref': '' }}
        aside={done ? <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-success-700 fade-in"><CheckCircleIcon className="w-3.5 h-3.5" />{t('Recorded', 'مسجل')}</span> : undefined}>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!ref.trim()) return; onRfp({ ...rfp, etimad: { ref: ref.trim(), at: now(), by: task.assignee.name, byAr: task.assignee.nameAr } }); toast(t(`Etimad reference ${ref.trim()} recorded`, `تم تسجيل مرجع اعتماد ${ref.trim()}`)); }}>
          <input dir="ltr" value={ref} disabled={readOnly || done} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 260139001234" data-etimad-input
            className="flex-1 text-[13px] rounded-lg border border-neutral-300 px-3 py-2 tabular-nums disabled:bg-neutral-50 focus:outline-none focus:border-brand-400" />
          {!readOnly && !done && <Button type="submit" variant="secondary" disabled={!ref.trim()} data-etimad-save>{t('Record reference', 'تسجيل المرجع')}</Button>}
          {!readOnly && done && <Button type="button" variant="ghost" onClick={() => { const { etimad: _e, ...rest } = rfp; onRfp(rest as RfpDetail); }}>{t('Edit', 'تعديل')}</Button>}
        </form>
      </Card>
    </div>
  );
}

/** "Published in Etimad · ref" — shown on every view of the request once recorded. */
export function EtimadBanner({ rfp, isAr, t }: { rfp?: RfpDetail; isAr: boolean; t: T }) {
  if (!rfp?.etimad) return null;
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-success-50 border border-success-200 px-4 py-2.5 fade-in" data-etimad-published>
      <CheckCircleIcon className="w-4 h-4 text-success-600" />
      <span className="text-[13px] text-success-800"><span className="font-semibold">{t('Published in Etimad', 'منشور في اعتماد')}</span> · <span dir="ltr" className="tabular-nums">{rfp.etimad.ref}</span>
        <span className="text-success-700/70"> · {fmtDateTime(rfp.etimad.at, isAr)}</span></span>
    </div>
  );
}
