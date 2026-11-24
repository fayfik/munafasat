/* Committee stage after Etimad publish — Epics C5 to E.
   16 Raise bid opening form (Procurement member) → 17 Confirm committee (Chairman)
   → 18 Record bids (Secretary) → 19 Members verify → 20 MoM & send to BEC.
   Two-envelope: Financial opening after BEC shortlists. Direct purchase: DPEC assign → evaluate → select.
   Clean, list-first screens; the bid register opens as a full page when the pane is too narrow. */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { CommitteeSeat, DocStatus, OfferFile, Opening, OpeningVendor, Person, RfpDetail, SeatRole, Task } from './types';
import { ActionHead } from './ActionHead';
import { EvalWidget, EvalSignatures, Viewer } from './EvalSteps';
import { classified, offerDocs, offerFiles } from './offerDocs';
import { CaseStory, StoryStrip } from './CaseStory';
import { Avatar } from './InboxTools';
import { Button } from '../components/ui';
import { toast } from '../components/Toast';
import { ArrowLeftIcon, CheckCircleIcon, CheckIcon, ChevronDownIcon, DocumentIcon, PlusIcon, TrashIcon, UploadIcon, XIcon, AlertTriangleIcon, ChevronRightIcon, SparklesIcon } from '../components/Icons';
import {
  ALTERNATES, COMMITTEE_LABEL, DOC_ITEMS, DOC_STATUS, ETIMAD_BIDDERS, REPLACE_REASONS, SEAT_LABEL,
  attending, envelopeOf, etimadSession, fmtSar, members, newOpening, priceSealed, seatOf, specialDp, suggestedVendor, vendorDocs, vendorFrom, vendorReady,
} from './committee';

type T = (en: string, ar: string) => string;
type P = { task: Task; isAr: boolean; t: T; readOnly?: boolean; onRfp: (rfp: RfpDetail) => void; reopen?: (step: number, o: Opening, reason: string) => boolean };
const nm = (p: Person, isAr: boolean) => (isAr ? p.nameAr ?? p.name : p.name);
const now = () => new Date().toISOString();
const fmtDate = (iso?: string, isAr = false) => (iso ? new Date(iso).toLocaleDateString(isAr ? 'ar-SA-u-ca-gregory' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function useOpening(task: Task, onRfp: P['onRfp']) {
  const rfp = task.rfp!;
  const o: Opening = rfp.opening ?? newOpening(task.committee === 'dp-evaluate' || task.committee === 'dp-select' ? 'dpec' : 'boc');
  const set = (p: Partial<Opening>) => onRfp({ ...rfp, opening: { ...o, ...p } });
  const setVendor = (id: string, p: Partial<OpeningVendor>) => set({ vendors: o.vendors.map((v) => (v.id === id ? { ...v, ...p } : v)) });
  const setSeat = (role: SeatRole, p: Partial<CommitteeSeat> | null) => set({ seats: p === null ? o.seats.filter((s) => s.role !== role) : o.seats.some((s) => s.role === role) ? o.seats.map((s) => (s.role === role ? { ...s, ...p } : s)) : [...o.seats, p as CommitteeSeat] });
  return { rfp, o, set, setVendor, setSeat };
}

/* ── small parts ───────────────────────────────────────────────────── */
export const Card = ({ title, aside, children, attr, pad = true }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; attr?: Record<string, string>; pad?: boolean }) => (
  <section className="rounded-2xl border border-neutral-200 bg-white rise-in overflow-hidden" {...attr}>
    {title && <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3"><h3 className="text-[13.5px] font-semibold text-neutral-900">{title}</h3>{aside}</div>}
    <div className={pad ? 'px-5 pb-5' : ''}>{children}</div>
  </section>
);
const Facts = ({ items }: { items: [string, ReactNode][] }) => (
  <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
    {items.map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-[11px] text-neutral-500">{k}</dt><dd className="mt-0.5 text-[13px] font-medium text-neutral-900 truncate">{v}</dd></div>)}
  </dl>
);
export const Pill = ({ tone, children, attr }: { tone: 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'violet'; children: ReactNode; attr?: Record<string, string> }) => {
  const cls = { gray: 'bg-neutral-100 text-neutral-600', blue: 'bg-[#EAF2FB] text-[#21507A]', green: 'bg-success-50 text-success-700', amber: 'bg-warning-50 text-warning-800', red: 'bg-error-50 text-error-700', violet: 'bg-ai-50 text-ai-700' }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap ${cls}`} {...attr}>{children}</span>;
};
export const Bar = ({ done, total }: { done: number; total: number }) => (
  <span className="inline-flex items-center gap-2"><span className="h-1.5 w-24 rounded-full bg-neutral-100 overflow-hidden"><span className="block h-full rounded-full bg-success-500 transition-all duration-500" style={{ width: `${Math.round((done / Math.max(1, total)) * 100)}%` }} /></span><span className="text-[12px] text-neutral-500 tabular-nums">{done}/{total}</span></span>
);
const vendorStatus = (v: OpeningVendor, o: Opening, r: RfpDetail | undefined, t: T) => {
  const d = vendorDocs(v);
  if (vendorReady(v, o, r)) return d.issues ? <Pill tone="amber">{t(`${d.issues} issue${d.issues > 1 ? 's' : ''}`, `${d.issues} ملاحظة`)}</Pill> : <Pill tone="green"><CheckIcon className="w-3 h-3" />{t('Checked', 'تم التحقق')}</Pill>;
  return d.set ? <Pill tone="blue">{t('In progress', 'قيد التحقق')}</Pill> : <Pill tone="gray">{t('Not started', 'لم يبدأ')}</Pill>;
};
export const RoleChip = ({ role, isAr }: { role?: { en: string; ar: string }; isAr: boolean }) =>
  role ? <span className="inline-flex items-center rounded-md bg-[#EEF1FA] text-[#2A3466] px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap" data-committee-role>{isAr ? role.ar : role.en}</span> : null;

/* ── 16 · Raise bid opening form — read Etimad's report: session, bidders, bid bonds ── */
const fmtDT = (iso?: string, isAr = false) => (iso ? new Date(iso).toLocaleString(isAr ? 'ar-SA-u-ca-gregory' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : '—');
const Steps = ({ steps, at }: { steps: string[]; at: number }) => (
  <ul className="space-y-2.5">{steps.map((s, i) => (
    <li key={s} className={`flex items-center gap-3 text-[13px] transition-colors ${i < at ? 'text-neutral-800' : i === at ? 'text-neutral-900 font-semibold' : 'text-neutral-400'}`}>
      <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center flex-shrink-0 ${i < at ? 'bg-success-500 text-white' : i === at ? 'border-2 border-brand-500 border-t-transparent animate-spin' : 'border-2 border-neutral-200'}`}>{i < at && <CheckIcon className="w-3 h-3" />}</span>{s}
    </li>
  ))}</ul>
);
function useStepper(n: number, ms: number, onDone: () => void) {
  const [at, setAt] = useState(-1);
  useEffect(() => { if (at < 0) return; if (at >= n) { onDone(); return; } const id = window.setTimeout(() => setAt(at + 1), ms); return () => window.clearTimeout(id); }, [at]); // eslint-disable-line react-hooks/exhaustive-deps
  return { at, running: at >= 0 && at < n, start: () => setAt(0) };
}
export function RaiseOpening({ task, isAr, t, readOnly, onRfp }: P) {
  const { rfp, o, set, setVendor } = useOpening(task, onRfp);
  const env = envelopeOf(rfp);
  const [open, setOpen] = useState<string | null>(null);
  const read = useStepper(3, 420, () => {
    set({ ...etimadSession(), source: { kind: 'upload', fileName: `Etimad_opening_report_${rfp.etimad?.ref ?? task.entity.ref}.pdf`, at: now() }, vendors: ETIMAD_BIDDERS.map(vendorFrom) });
    toast(t('3 bidders, 1 withdrawal and the session details read from the report', 'تمت قراءة 3 موردين وانسحاب واحد وتفاصيل الجلسة'));
  });
  const add = () => { const id = `v${Date.now()}`; set({ vendors: [...o.vendors, { id, name: '', cr: '', docs: {} }] }); setOpen(id); };
  const ok = o.vendors.filter((v) => v.name.trim() && v.cr.trim()).length;
  const bonds = o.vendors.reduce((a, v) => a + (v.bond?.amount ?? 0), 0);
  const shortValidity = o.vendors.filter((v) => v.validityDays && v.validityDays < 90);
  const inp = 'w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[13px] bg-white focus:outline-none focus:border-brand-400 disabled:bg-neutral-50';
  return (
    <div className="space-y-4" data-raise-opening>
      <ActionHead title={t('Raise the bid opening form', 'رفع نموذج فتح العروض')}
        desc={t('Bidding has closed in Etimad. Upload Etimad’s opening report — the session, bidders and bid bonds are read for you — or enter them, then send the case to the committee.', 'أُغلق التقديم في اعتماد. ارفع تقرير الفتح — تُقرأ الجلسة والموردون والضمانات تلقائياً — أو أدخلها، ثم أرسل الحالة إلى اللجنة.')}
        progress={{ done: ok, total: Math.max(1, o.vendors.length), label: t('bidders complete', 'موردين مكتملين'), attrs: { 'data-raise-progress': `${ok}/${o.vendors.length}` } }} />
      {!o.source && !read.running && (
        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-3">
          <button type="button" disabled={readOnly} onClick={read.start} data-upload-etimad
            className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-brand-200 bg-gradient-to-br from-brand-50/60 to-white hover:border-brand-400 transition-colors px-6 py-8 text-start">
            <span className="w-12 h-12 rounded-2xl bg-white shadow-sm ring-1 ring-brand-100 inline-flex items-center justify-center text-brand-700 group-hover:scale-105 transition-transform"><UploadIcon className="w-6 h-6" /></span>
            <p className="mt-4 text-[15px] font-semibold text-neutral-900">{t('Upload Etimad opening report', 'ارفع تقرير الفتح من اعتماد')}</p>
            <p className="mt-1 text-[12.5px] text-neutral-500">{t('PDF or Excel exported from Etimad. AI reads the session, every bidder, bid numbers, submission times and bid bonds.', 'ملف PDF أو Excel من اعتماد. يقرأ الذكاء الاصطناعي الجلسة والموردين وأرقام العروض وأوقات التقديم والضمانات.')}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-ai-700"><SparklesIcon className="w-3.5 h-3.5" />{t('AI extraction', 'استخراج بالذكاء الاصطناعي')}</span>
          </button>
          <button type="button" disabled={readOnly} data-source-opt="manual" onClick={() => { set({ source: { kind: 'manual', at: now() }, vendors: [{ id: 'v1', name: '', cr: '', docs: {} }] }); setOpen('v1'); }}
            className="rounded-2xl border border-neutral-200 bg-white hover:bg-neutral-50 px-6 py-8 text-start transition-colors">
            <span className="w-12 h-12 rounded-2xl bg-neutral-100 inline-flex items-center justify-center text-neutral-600"><PlusIcon className="w-6 h-6" /></span>
            <p className="mt-4 text-[15px] font-semibold text-neutral-900">{t('Enter manually', 'إدخال يدوي')}</p>
            <p className="mt-1 text-[12.5px] text-neutral-500">{t('When the report isn’t available — add each bidder and their bid bond.', 'عند عدم توفر التقرير — أضف كل مورد وضمانه.')}</p>
          </button>
        </div>
      )}
      {read.running && (
        <Card attr={{ 'data-reading': '' }}>
          <div className="pt-4 flex items-center gap-6">
            <div className="relative w-24 h-28 rounded-lg border border-neutral-200 bg-white overflow-hidden flex-shrink-0"><div className="p-2 space-y-1.5">{Array.from({ length: 9 }, (_, i) => <span key={i} className="block h-1.5 rounded bg-neutral-100" style={{ width: `${60 + ((i * 17) % 40)}%` }} />)}</div><span className="absolute inset-x-0 h-6 bg-gradient-to-b from-ai-400/0 via-ai-400/30 to-ai-400/0 scan-line" /></div>
            <div className="flex-1"><p className="text-[13.5px] font-semibold text-neutral-900 mb-3">{t('Reading the Etimad report…', 'جارٍ قراءة تقرير اعتماد…')}</p><Steps at={read.at} steps={[t('Opening session and committee order', 'جلسة الفتح وقرار التشكيل'), t('Bidders, bid numbers and submission times', 'الموردون وأرقام العروض وأوقات التقديم'), t('Bid bonds and offer validity', 'الضمانات وسريان العروض')]} /></div>
          </div>
        </Card>
      )}
      {o.source && (
        <>
          <Card title={t('Opening session', 'جلسة الفتح')} aside={o.source.kind === 'upload' ? <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-ai-700" data-etimad-file><SparklesIcon className="w-3.5 h-3.5" /><span className="truncate max-w-[220px]" dir="ltr">{o.source.fileName}</span></span> : <Pill tone="gray">{t('Entered manually', 'إدخال يدوي')}</Pill>}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-3">
              <Field k={t('Etimad reference', 'مرجع اعتماد')}><span dir="ltr" className="text-[13px] font-medium">{rfp.etimad?.ref ?? '—'}</span></Field>
              <Field k={t('Bid closing', 'إغلاق العروض')}><span className="text-[13px] font-medium">{fmtDate(rfp.etimad?.closingDate, isAr)}</span></Field>
              <Field k={t('Opening date', 'تاريخ الفتح')}><input type="date" disabled={readOnly} value={o.openingDate ?? ''} onChange={(e) => set({ openingDate: e.target.value })} className={inp} data-opening-date /></Field>
              <Field k={t('Opening time', 'وقت الفتح')}><input type="time" disabled={readOnly} value={o.openingTime ?? ''} onChange={(e) => set({ openingTime: e.target.value })} className={inp} /></Field>
              <Field k={t('Envelopes', 'الأظرف')}><span className="text-[13px] font-medium">{env === 'two' ? t('Two — prices sealed', 'ظرفان — الأسعار مختومة') : t('One', 'ظرف واحد')}</span></Field>
              <Field k={t('Mode', 'طريقة الفتح')}><select disabled={readOnly} value={o.mode ?? 'etimad'} onChange={(e) => set({ mode: e.target.value as Opening['mode'] })} className={inp}><option value="etimad">{t('Etimad (electronic)', 'اعتماد (إلكتروني)')}</option><option value="in-person">{t('In person', 'حضوري')}</option></select></Field>
              <Field k={t('Committee order no.', 'رقم قرار التشكيل')}><input disabled={readOnly} value={o.formationNo ?? ''} onChange={(e) => set({ formationNo: e.target.value })} className={inp} placeholder="CF-2026-…" /></Field>
              <Field k={t('Order date', 'تاريخ القرار')}><input type="date" disabled={readOnly} value={o.formationDate ?? ''} onChange={(e) => set({ formationDate: e.target.value })} className={inp} /></Field>
            </div>
          </Card>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-raise-tiles>
            {[[t('Bids received', 'العروض المستلمة'), o.vendors.length, 'text-neutral-900'], [t('Withdrawn', 'منسحبة'), o.withdrawn?.length ?? 0, 'text-neutral-900'], [t('Bid bonds', 'الضمانات'), bonds ? `${(bonds / 1000).toFixed(0)}K` : '—', 'text-neutral-900'], [t('Short validity', 'سريان قصير'), shortValidity.length, shortValidity.length ? 'text-warning-700' : 'text-neutral-900']].map(([k, v, c]) => (
              <div key={String(k)} className="rounded-2xl border border-neutral-200 bg-white px-4 py-3"><p className="text-[11.5px] text-neutral-500">{k}</p><p className={`mt-0.5 text-[22px] font-bold tabular-nums ${c}`}>{v}</p></div>
            ))}
          </div>
          {shortValidity.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl border border-ai-200 bg-ai-50/60 px-4 py-3 text-[12.5px] text-neutral-800" data-raise-insight>
              <SparklesIcon className="w-4 h-4 text-ai-600 mt-0.5 flex-shrink-0" /><span>{shortValidity.map((v) => v.name).join(', ')} {t(`offered ${shortValidity[0].validityDays}-day validity; the request asks for 90 days. Flag it for the committee.`, `قدّم سرياناً ${shortValidity[0].validityDays} يوماً؛ والطلب يتطلب 90 يوماً. نبّه اللجنة.`)}</span>
            </div>
          )}
          <Card title={t('Bidders', 'الموردون')} pad={false} attr={{ 'data-bidders': '' }} aside={!readOnly ? <button type="button" onClick={add} data-add-bidder className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-700 hover:text-brand-800"><PlusIcon className="w-4 h-4" />{t('Add bidder', 'إضافة مورد')}</button> : undefined}>
            <ul className="divide-y divide-neutral-100 border-t border-neutral-100">
              {o.vendors.map((v, i) => { const ex = open === v.id; return (
                <li key={v.id} data-bidder-row={i}>
                  <button type="button" onClick={() => setOpen(ex ? null : v.id)} className="w-full flex items-center gap-3 px-5 py-3 text-start hover:bg-neutral-50/80">
                    <span className="w-5 text-[12px] text-neutral-400 tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold text-neutral-900 truncate">{v.name || <span className="text-neutral-400 font-normal">{t('New bidder', 'مورد جديد')}</span>}</span>
                      <span className="block text-[11.5px] text-neutral-500 tabular-nums" dir="ltr">{v.cr ? `CR ${v.cr}` : '—'}{v.bidNo ? ` · ${v.bidNo}` : ''}{v.submittedAt ? ` · ${fmtDT(v.submittedAt)}` : ''}</span></span>
                    {v.bond && <span className="hidden md:inline-flex items-center gap-1 h-6 px-2 rounded-md bg-neutral-100 text-[11.5px] text-neutral-700 tabular-nums">{t('Bond', 'ضمان')} {(v.bond.amount / 1000).toFixed(1)}K · {v.bond.bank.split(' ')[0]}</span>}
                    {v.validityDays && v.validityDays < 90 ? <Pill tone="amber">{t(`${v.validityDays}-day validity`, `سريان ${v.validityDays} يوماً`)}</Pill> : v.fileCount ? <Pill tone="gray">{t(`${v.fileCount} files`, `${v.fileCount} ملفات`)}</Pill> : null}
                    <ChevronDownIcon className={`w-4 h-4 text-neutral-400 transition-transform ${ex ? 'rotate-180' : ''}`} />
                  </button>
                  {ex && (
                    <div className="px-5 pb-4 ps-[52px] grid grid-cols-2 md:grid-cols-4 gap-3 fade-in">
                      <Field k={t('Company name', 'اسم الشركة')} wide><input disabled={readOnly} value={v.name} onChange={(e) => setVendor(v.id, { name: e.target.value })} className={inp} data-bidder-name placeholder={t('Company name', 'اسم الشركة')} /></Field>
                      <Field k={t('Commercial register', 'السجل التجاري')}><input disabled={readOnly} dir="ltr" value={v.cr} onChange={(e) => setVendor(v.id, { cr: e.target.value.replace(/\D/g, '').slice(0, 10) })} className={`${inp} tabular-nums`} data-bidder-cr placeholder="10 digits" /></Field>
                      <Field k={t('Etimad bid no.', 'رقم العرض في اعتماد')}><input disabled={readOnly} dir="ltr" value={v.bidNo ?? ''} onChange={(e) => setVendor(v.id, { bidNo: e.target.value })} className={inp} /></Field>
                      <Field k={t('Offer validity (days)', 'سريان العرض (يوم)')}><input type="number" disabled={readOnly} value={v.validityDays ?? ''} onChange={(e) => setVendor(v.id, { validityDays: Number(e.target.value) || undefined })} className={inp} /></Field>
                      <Field k={t('Bond bank', 'بنك الضمان')}><input disabled={readOnly} value={v.bond?.bank ?? ''} onChange={(e) => setVendor(v.id, { bond: { amount: 0, validUntil: '', ...v.bond, bank: e.target.value } })} className={inp} /></Field>
                      <Field k={t('Bond amount (SAR)', 'مبلغ الضمان')}><input type="number" disabled={readOnly} value={v.bond?.amount ?? ''} onChange={(e) => setVendor(v.id, { bond: { bank: '', validUntil: '', ...v.bond, amount: Number(e.target.value) || 0 } })} className={inp} /></Field>
                      <Field k={t('Bond valid until', 'سريان الضمان')}><input type="date" disabled={readOnly} value={v.bond?.validUntil ?? ''} onChange={(e) => setVendor(v.id, { bond: { bank: '', amount: 0, ...v.bond, validUntil: e.target.value } })} className={inp} /></Field>
                      {!readOnly && <div className="flex items-end"><button type="button" onClick={() => set({ vendors: o.vendors.filter((x) => x.id !== v.id) })} className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-[12px] text-neutral-500 hover:text-error-600 hover:bg-error-50"><TrashIcon className="w-4 h-4" />{t('Remove', 'حذف')}</button></div>}
                    </div>
                  )}
                </li>
              ); })}
              {o.withdrawn?.map((w) => (
                <li key={w.cr} className="flex items-center gap-3 px-5 py-3 bg-neutral-50/70" data-withdrawn>
                  <span className="w-5" /><span className="min-w-0 flex-1"><span className="block text-[13px] text-neutral-500 line-through truncate">{w.name}</span><span className="block text-[11.5px] text-neutral-400 tabular-nums" dir="ltr">CR {w.cr}</span></span>
                  <Pill tone="gray">{t(`Withdrawn ${fmtDT(w.at, isAr)}`, `انسحب ${fmtDT(w.at, isAr)}`)}</Pill>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
const Field = ({ k, children, wide }: { k: string; children: ReactNode; wide?: boolean }) => <label className={`block min-w-0 ${wide ? 'col-span-2 md:col-span-1' : ''}`}><span className="block text-[11px] text-neutral-500 mb-1">{k}</span>{children}</label>;

/* ── 17 · Confirm committee (default from roster, replace by exception) ── */
function ReplaceDialog({ seat, isAr, t, onClose, onSave }: { seat: CommitteeSeat; isAr: boolean; t: T; onClose: () => void; onSave: (p: Person, reason: string) => void }) {
  const pool = ALTERNATES[seat.role] ?? [];
  const [pick, setPick] = useState(pool[0]?.id ?? '');
  const [reason, setReason] = useState('');
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 fade-in" onClick={onClose}>
      <div role="dialog" aria-label={t('Replace member', 'استبدال عضو')} className="w-full max-w-md rounded-2xl bg-white shadow-xl p-5 rise-in" onClick={(e) => e.stopPropagation()} data-replace-dialog>
        <div className="flex items-start justify-between"><div><h3 className="text-[15px] font-semibold text-neutral-900">{t('Replace member for this case', 'استبدال عضو لهذه الحالة')}</h3><p className="text-[12.5px] text-neutral-500 mt-1">{t(`${SEAT_LABEL[seat.role].en} seat · the annual roster stays as it is.`, `مقعد ${SEAT_LABEL[seat.role].ar} · يبقى التشكيل السنوي كما هو.`)}</p></div><button type="button" onClick={onClose} className="p-1 rounded-md text-neutral-400 hover:bg-neutral-100"><XIcon className="w-4 h-4" /></button></div>
        <p className="mt-4 text-[12px] font-semibold text-neutral-600">{t('Replacement', 'البديل')}</p>
        <div className="mt-1.5 space-y-1.5">
          {pool.map((p) => (
            <label key={p.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2 cursor-pointer ${pick === p.id ? 'border-brand-500 ring-2 ring-brand-500/15' : 'border-neutral-200 hover:bg-neutral-50'}`} data-replacement={p.id}>
              <input type="radio" className="sr-only" checked={pick === p.id} onChange={() => setPick(p.id)} /><Avatar p={p} /><span className="text-[13px] font-medium text-neutral-900">{nm(p, isAr)}</span><span className="text-[11.5px] text-neutral-500 ms-auto">{isAr ? p.deptAr : p.dept}</span>
            </label>
          ))}
        </div>
        <p className="mt-4 text-[12px] font-semibold text-neutral-600">{t('Reason', 'السبب')}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {REPLACE_REASONS.map((r) => <button key={r.en} type="button" onClick={() => setReason(r.en)} data-reason={r.en} className={`h-8 px-3 rounded-full text-[12.5px] font-medium border transition-colors ${reason === r.en ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>{isAr ? r.ar : r.en}</button>)}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="primary" disabled={!pick || !reason} onClick={() => onSave(pool.find((p) => p.id === pick)!, reason)} data-replace-save>{t('Replace', 'استبدال')}</Button>
          <Button variant="ghost" onClick={onClose}>{t('Cancel', 'إلغاء')}</Button>
        </div>
      </div>
    </div>, document.body);
}
export function AssignCommittee({ task, isAr, t, readOnly, onRfp }: P) {
  const { o, setSeat } = useOpening(task, onRfp);
  const [replacing, setReplacing] = useState<CommitteeSeat | null>(null);
  const dp = o.committee === 'dpec';
  const tech = seatOf(o, 'technical');
  const rows = o.seats.filter((s) => s.role !== 'technical');
  return (
    <div className="space-y-4" data-assign-committee>
      <ActionHead title={dp ? t('Confirm the committee and nominate the Technical member', 'تأكيد اللجنة وترشيح العضو الفني') : t('Confirm the committee', 'تأكيد اللجنة')}
        desc={t('Members come from this year’s roster. Replace a seat only for this case, with a reason; untick anyone not attending.', 'الأعضاء من تشكيل هذا العام. استبدل مقعداً لهذه الحالة فقط مع ذكر السبب، وألغِ تحديد من لن يحضر.')}
        progress={{ done: attending(o).length, total: members(o).length, label: t('members attending', 'أعضاء حاضرون'), attrs: { 'data-attending': String(attending(o).length) } }} />
      <Card title={COMMITTEE_LABEL[o.committee][isAr ? 'ar' : 'en']} aside={<Pill tone="gray">{t('Annual roster 2026', 'تشكيل 2026')}</Pill>} pad={false}>
        <ul className="divide-y divide-neutral-100 stagger">
          {rows.map((s) => (
            <li key={s.role} className="flex items-center gap-3 px-5 py-3" data-seat={s.role}>
              <span className="w-24 text-[12px] font-semibold text-neutral-500">{isAr ? SEAT_LABEL[s.role].ar : SEAT_LABEL[s.role].en}</span>
              <Avatar p={s.person} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-neutral-900 truncate">{nm(s.person, isAr)}</span>
                {s.replaced && <span className="block text-[11.5px] text-warning-700" data-replaced>{t(`Replacing ${s.replaced.from.name} · ${s.replaced.reason}`, `بدلاً من ${s.replaced.from.nameAr ?? s.replaced.from.name} · ${REPLACE_REASONS.find((r) => r.en === s.replaced!.reason)?.ar ?? s.replaced.reason}`)}</span>}
              </span>
              {s.role !== 'chairman' && s.role !== 'secretary' && (
                <label className="inline-flex items-center gap-1.5 text-[12px] text-neutral-600 cursor-pointer"><input type="checkbox" className="accent-brand-600" disabled={readOnly} checked={s.attending} onChange={(e) => setSeat(s.role, { attending: e.target.checked })} data-attend={s.role} />{t('Attending', 'حاضر')}</label>
              )}
              {!readOnly && s.role !== 'chairman' && (ALTERNATES[s.role]?.length ?? 0) > 0 && <Button size="sm" variant="ghost" onClick={() => setReplacing(s)} data-replace={s.role}>{t('Replace', 'استبدال')}</Button>}
            </li>
          ))}
        </ul>
      </Card>
      {dp && (
        <Card title={t('Technical member for this case', 'العضو الفني لهذه الحالة')} aside={tech ? <Pill tone="green"><CheckIcon className="w-3 h-3" />{t('Nominated', 'تم الترشيح')}</Pill> : <Pill tone="amber">{t('Required', 'مطلوب')}</Pill>} attr={{ 'data-technical': '' }}>
          <p className="text-[12.5px] text-neutral-500 mb-3">{t('The one seat chosen per case — the specialist who matches this request.', 'المقعد الوحيد الذي يُختار لكل حالة — المختص المناسب لهذا الطلب.')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {(ALTERNATES.technical ?? []).map((p) => (
              <label key={p.id} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${tech?.person.id === p.id ? 'border-brand-500 ring-2 ring-brand-500/15 bg-brand-50/40' : 'border-neutral-200 hover:bg-neutral-50'}`} data-tech-pick={p.id}>
                <input type="radio" className="sr-only" disabled={readOnly} checked={tech?.person.id === p.id} onChange={() => setSeat('technical', { role: 'technical', person: p, attending: true })} />
                <Avatar p={p} /><span className="min-w-0"><span className="block text-[13px] font-medium text-neutral-900 truncate">{nm(p, isAr)}</span><span className="block text-[11.5px] text-neutral-500 truncate">{isAr ? p.deptAr : p.dept}</span></span>
              </label>
            ))}
          </div>
        </Card>
      )}
      {replacing && <ReplaceDialog seat={replacing} isAr={isAr} t={t} onClose={() => setReplacing(null)}
        onSave={(p, reason) => { setSeat(replacing.role, { person: p, replaced: { from: replacing.replaced?.from ?? replacing.person, reason }, attending: true }); setReplacing(null); toast(t(`${p.name} seated for this case`, `تم تعيين ${p.nameAr ?? p.name} لهذه الحالة`)); }} />}
    </div>
  );
}

/* ── Bid register (full page): bidders · AI-classified checklist · document preview ── */
const ITEM_DOC: Record<string, string> = { 'tech-offer': 'tech', 'fin-offer': 'fin', bank: 'c-bank', cr: 'c-cr', zakat: 'c-zakat', gosi: 'c-gosi', chamber: 'c-chamber', saudization: 'c-saudization' };
function DocRow({ item, value, file, onSet, onPick, picked, readOnly, isAr, t, onConfirm }: { item: (typeof DOC_ITEMS)[number]; value?: DocStatus; file?: OfferFile; onSet: (s: DocStatus) => void; onPick: () => void; picked: boolean; readOnly?: boolean; isAr: boolean; t: T; onConfirm: () => void }) {
  const review = file && !file.confirmed;
  return (
    <div className={`px-4 py-3 transition-colors cursor-pointer ${picked ? 'bg-brand-50/60' : review ? 'bg-warning-50/50' : 'hover:bg-neutral-50'}`} data-doc={item.id} onClick={onPick}>
      <div className="flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${value === 'valid' ? 'bg-success-500' : value === 'expired' ? 'bg-warning-500' : value === 'missing' ? 'bg-error-500' : 'bg-neutral-200'}`} />
        <span className="flex-1 min-w-0 text-[13px] font-medium text-neutral-900">{isAr ? item.ar : item.en}{!item.required && <span className="text-neutral-400 font-normal"> · {isAr ? 'اختياري' : 'optional'}</span>}</span>
        <div className="inline-flex gap-0.5" role="radiogroup" onClick={(e) => e.stopPropagation()}>
          {DOC_STATUS.map((s) => (
            <button key={s.id} type="button" disabled={readOnly} role="radio" aria-checked={value === s.id} onClick={() => onSet(s.id)} data-doc-status={s.id}
              className={`h-7 px-2 rounded-md text-[11.5px] font-semibold transition-all ring-1 ${value === s.id ? s.on : 'ring-transparent text-neutral-400 hover:bg-neutral-100'}`}>{isAr ? s.ar : s.en}</button>
          ))}
        </div>
      </div>
      {file ? (
        <div className="mt-1.5 ms-5 flex items-center gap-2 flex-wrap text-[11.5px]">
          <span className="inline-flex items-center gap-1 text-neutral-600 min-w-0"><DocumentIcon className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate max-w-[180px]" dir="ltr">{file.name}</span></span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded font-semibold ${file.conf >= 0.8 ? 'bg-ai-50 text-ai-700' : 'bg-warning-100 text-warning-800'}`} data-ai-conf={Math.round(file.conf * 100)}><SparklesIcon className="w-3 h-3" />{Math.round(file.conf * 100)}%</span>
          {file.expiry && <span className={file.status === 'expired' ? 'text-warning-700 font-semibold' : 'text-neutral-500'}>{file.status === 'expired' ? t(`Expired ${file.expiry}`, `انتهت ${file.expiry}`) : t(`Valid until ${file.expiry}`, `سارية حتى ${file.expiry}`)}</span>}
          {review && !readOnly && <span className="ms-auto flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}><span className="text-warning-800">{t('AI isn’t sure — check the preview', 'الذكاء غير متأكد — راجع المعاينة')}</span><button type="button" onClick={onConfirm} data-ai-confirm={item.id} className="h-6 px-2 rounded-md bg-warning-500 text-white font-semibold hover:bg-warning-600">{t('Confirm', 'تأكيد')}</button></span>}
        </div>
      ) : value === 'missing' ? <p className="mt-1 ms-5 text-[11.5px] text-error-700">{t('No matching file in the package', 'لا يوجد ملف مطابق في الحزمة')}</p> : null}
    </div>
  );
}
export function BidRegister({ task, isAr, t, readOnly, onRfp, onClose, start }: P & { onClose: () => void; start?: { vid: string; item?: string } }) {
  const { rfp, o, setVendor } = useOpening(task, onRfp);
  const [sel, setSel] = useState(start?.vid ?? o.vendors[0]?.id ?? '');
  const [item, setItem] = useState<string>(start?.item ?? 'tech-offer');
  const [nav, setNav] = useState(1); const [page, setPage] = useState(0); const [zoom, setZoom] = useState(0.9);
  const v = o.vendors.find((x) => x.id === sel) ?? o.vendors[0];
  const idx = o.vendors.findIndex((x) => x.id === v?.id);
  const sealed = priceSealed(o, rfp);
  const dp = o.committee === 'dpec';
  const ready = o.vendors.filter((x) => vendorReady(x, o, rfp)).length;
  const docs = useMemo(() => (v ? offerDocs(v, o) : []), [v, o]);
  const doc = docs.find((d) => d.id === ITEM_DOC[item]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const pick = (id: string) => { setItem(id); setPage(0); setNav((n) => n + 1); };
  const allValid = () => v && setVendor(v.id, { docs: Object.fromEntries(DOC_ITEMS.filter((d) => d.required).map((d) => [d.id, 'valid' as DocStatus])) });
  const confirm = (id: string) => { if (!v?.files) return; const f = v.files.find((x) => x.item === id); setVendor(v.id, { files: v.files.map((x) => (x.item === id ? { ...x, confirmed: true } : x)), docs: { ...v.docs, [id]: f?.status ?? 'valid' } }); };
  const review = v?.files?.filter((f) => !f.confirmed).length ?? 0;
  return createPortal(
    <div className="fixed inset-0 z-50 bg-neutral-50 flex flex-col fade-in" data-bid-register>
      <header className="h-16 flex-shrink-0 bg-white border-b border-neutral-200 flex items-center gap-4 px-5">
        <button type="button" onClick={onClose} data-register-close title={t('Back to task', 'العودة إلى المهمة')} className="w-9 h-9 rounded-full border border-neutral-200 inline-flex items-center justify-center text-neutral-600 hover:bg-neutral-50"><ArrowLeftIcon className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} /></button>
        <div className="min-w-0"><p className="text-[11.5px] text-neutral-500" dir="ltr">{task.entity.ref} · {rfp.etimad?.ref}</p><h2 className="text-[16px] font-semibold text-neutral-900 truncate">{dp ? t('Offer register', 'سجل العروض') : t('Bid register', 'سجل العطاءات')}</h2></div>
        {sealed && <Pill tone="violet" attr={{ 'data-sealed': '' }}>{t('Technical opening · prices sealed', 'الفتح الفني · الأسعار مختومة')}</Pill>}
        {o.intake && <Pill tone="violet"><SparklesIcon className="w-3 h-3" />{t(`AI sorted ${o.intake.files} files`, `صنّف الذكاء ${o.intake.files} ملفاً`)}</Pill>}
        <span className="ms-auto flex items-center gap-3"><Bar done={ready} total={o.vendors.length} /><Button size="sm" variant="primary" onClick={onClose} data-register-done>{t('Done', 'تم')}</Button></span>
      </header>
      <div className="flex-1 min-h-0 grid grid-cols-[260px_minmax(420px,520px)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] overflow-hidden">
        <aside className="border-e border-neutral-200 bg-white overflow-y-auto" data-register-vendors>
          <p className="px-5 pt-4 pb-2 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">{t(`${o.vendors.length} bidders`, `${o.vendors.length} موردين`)}</p>
          <ul className="px-3 pb-4 space-y-1 stagger">
            {o.vendors.map((x, i) => { const d = vendorDocs(x); const rv = x.files?.filter((f) => !f.confirmed).length ?? 0; return (
              <li key={x.id}>
                <button type="button" onClick={() => setSel(x.id)} data-register-vendor={i} aria-current={x.id === v?.id}
                  className={`w-full text-start rounded-xl px-3 py-2.5 transition-colors ${x.id === v?.id ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-neutral-50'}`}>
                  <span className="flex items-center justify-between gap-2"><span className="text-[13px] font-semibold text-neutral-900 truncate">{x.name}</span>{rv ? <Pill tone="amber">{t(`${rv} to review`, `${rv} للمراجعة`)}</Pill> : vendorStatus(x, o, rfp, t)}</span>
                  <span className="mt-1.5 flex items-center gap-2"><span className="h-1 flex-1 rounded-full bg-neutral-100 overflow-hidden"><span className="block h-full rounded-full bg-success-500" style={{ width: `${Math.round((d.set / d.total) * 100)}%` }} /></span><span className="text-[11px] text-neutral-500 tabular-nums">{d.set}/{d.total}</span></span>
                </button>
              </li>
            ); })}
          </ul>
        </aside>
        {v && (
          <main className="min-h-0 overflow-y-auto border-e border-neutral-200 bg-[#FAFAFB]" key={v.id}>
            <div className="px-5 py-5 space-y-3 fade-in" data-register-detail={idx}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0"><p className="text-[11.5px] text-neutral-500">{t(`Bidder ${idx + 1} of ${o.vendors.length}`, `المورد ${idx + 1} من ${o.vendors.length}`)}</p><h3 className="text-[18px] font-semibold text-neutral-900 truncate">{v.name}</h3><p className="text-[12px] text-neutral-500 tabular-nums" dir="ltr">CR {v.cr}{v.bidNo ? ` · ${v.bidNo}` : ''}</p></div>
                <div className="text-end flex-shrink-0">
                  <p className="text-[11px] text-neutral-500">{t('Offer price (SAR)', 'سعر العرض (ريال)')}</p>
                  {sealed ? <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ai-700" data-price-sealed>🔒 {t('Sealed', 'مختوم')}</p>
                    : <input type="number" min={0} disabled={readOnly} value={v.price ?? ''} onChange={(e) => setVendor(v.id, { price: Number(e.target.value) || undefined })} placeholder="0" dir="ltr" className="mt-1 w-36 text-end text-[14px] font-semibold rounded-lg border border-neutral-200 px-3 py-1.5 tabular-nums focus:outline-none focus:border-brand-400" data-vendor-price />}
                </div>
              </div>
              {review > 0 && <div className="flex items-center gap-2 rounded-xl bg-warning-50 border border-warning-200 px-3 py-2 text-[12.5px] text-warning-900"><AlertTriangleIcon className="w-4 h-4 text-warning-600" />{t(`${review} file needs your confirmation`, `${review} ملف بحاجة إلى تأكيدك`)}</div>}
              <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100"><h4 className="text-[13.5px] font-semibold text-neutral-900">{t('Documents', 'المستندات')}</h4>
                  {!readOnly && !v.files && <button type="button" onClick={allValid} data-all-valid className="text-[12px] font-semibold text-brand-700 hover:text-brand-800">{t('Mark required as valid', 'تحديد المطلوب كساري')}</button>}</div>
                <div className="divide-y divide-neutral-100">{DOC_ITEMS.map((d) => <DocRow key={d.id} item={d} value={v.docs[d.id]} file={v.files?.find((f) => f.item === d.id)} picked={item === d.id} onPick={() => pick(d.id)} readOnly={readOnly} isAr={isAr} t={t} onConfirm={() => confirm(d.id)} onSet={(s) => setVendor(v.id, { docs: { ...v.docs, [d.id]: s } })} />)}</div>
              </section>
              {dp && (
                <section className="rounded-2xl border border-neutral-200 bg-white p-4" data-tech-result>
                  <h4 className="text-[13.5px] font-semibold text-neutral-900">{t('Technical result', 'النتيجة الفنية')}</h4>
                  <div className="mt-2 flex items-center gap-2">
                    {([[true, t('Pass', 'مجتاز')], [false, t('Fail', 'غير مجتاز')]] as const).map(([k, l]) => (
                      <button key={String(k)} type="button" disabled={readOnly} onClick={() => setVendor(v.id, { techPass: k })} data-tech={k ? 'pass' : 'fail'}
                        className={`h-8 px-3.5 rounded-md text-[12.5px] font-semibold ring-1 transition-all ${v.techPass === k ? (k ? 'bg-success-50 text-success-700 ring-success-300' : 'bg-error-50 text-error-700 ring-error-300') : 'ring-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>{l}</button>
                    ))}
                  </div>
                  <input disabled={readOnly} value={v.techNote ?? ''} onChange={(e) => setVendor(v.id, { techNote: e.target.value })} placeholder={t('Short justification', 'مبرر مختصر')} className="mt-3 w-full text-[13px] rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:border-brand-400" />
                </section>
              )}
              <section className="rounded-2xl border border-neutral-200 bg-white p-4">
                <h4 className="text-[13.5px] font-semibold text-neutral-900">{t('Note on this offer', 'ملاحظة على هذا العرض')}</h4>
                <textarea rows={2} disabled={readOnly} value={v.note ?? ''} onChange={(e) => setVendor(v.id, { note: e.target.value })} placeholder={t('Optional — anything the committee should know', 'اختياري — ما يجب أن تعرفه اللجنة')} className="mt-2 w-full text-[13px] rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:border-brand-400" />
              </section>
              <div className="flex items-center justify-between pt-1">
                <Button variant="ghost" disabled={idx <= 0} onClick={() => setSel(o.vendors[idx - 1].id)}><ArrowLeftIcon className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />{t('Previous', 'السابق')}</Button>
                {idx < o.vendors.length - 1
                  ? <Button variant="primary" onClick={() => setSel(o.vendors[idx + 1].id)} data-next-vendor>{t('Next bidder', 'المورد التالي')}<ChevronRightIcon className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} /></Button>
                  : <Button variant="primary" onClick={onClose}>{t('Back to task', 'العودة إلى المهمة')}</Button>}
              </div>
            </div>
          </main>
        )}
        {v && (doc
          ? <Viewer doc={doc} vendor={v} page={page} nav={nav} zoom={zoom} setZoom={setZoom} onPage={(n) => { setPage(n); setNav((x) => x + 1); }} onSeen={setPage} isAr={isAr} t={t} />
          : <div className="flex flex-col items-center justify-center bg-[#EEF0F3] text-center px-8"><DocumentIcon className="w-8 h-8 text-neutral-300" /><p className="mt-2 text-[13px] text-neutral-500">{t('Select a document to preview it here.', 'اختر مستنداً لمعاينته هنا.')}</p></div>)}
      </div>
    </div>, document.body);
}

/* ── 18 · Record bids (Secretary) / DP evaluate (Officer + Technical) ── */
function VendorTable({ o, rfp, t, showPrice, showTech, onOpen }: { o: Opening; rfp?: RfpDetail; t: T; showPrice: boolean; showTech?: boolean; onOpen?: (i: number) => void }) {
  return (
    <div className="rounded-2xl border border-neutral-200 overflow-hidden bg-white" data-vendor-table>
      <table className="w-full text-[13px]">
        <thead><tr className="bg-neutral-50 text-[11.5px] text-neutral-500">
          <th className="text-start font-medium px-4 py-2">{t('Bidder', 'المورد')}</th>
          <th className="text-start font-medium px-3 py-2">{t('Documents', 'المستندات')}</th>
          {showTech && <th className="text-start font-medium px-3 py-2">{t('Technical', 'الفني')}</th>}
          <th className="text-end font-medium px-3 py-2">{t('Price', 'السعر')}</th>
          <th className="text-end font-medium px-4 py-2">{t('Status', 'الحالة')}</th>
        </tr></thead>
        <tbody className="divide-y divide-neutral-100">
          {o.vendors.map((v, i) => { const d = vendorDocs(v); return (
            <tr key={v.id} className={onOpen ? 'hover:bg-neutral-50 cursor-pointer' : ''} onClick={onOpen ? () => onOpen(i) : undefined} data-vendor-row={i}>
              <td className="px-4 py-2.5"><p className="font-medium text-neutral-900">{v.name}</p><p className="text-[11.5px] text-neutral-500 tabular-nums" dir="ltr">CR {v.cr}{v.files ? ` · ${v.files.length} files` : ''}</p></td>
              <td className="px-3 py-2.5"><Bar done={d.set} total={d.total} /></td>
              {showTech && <td className="px-3 py-2.5">{v.techPass == null ? <span className="text-neutral-400">—</span> : v.techPass ? <Pill tone="green">{t('Pass', 'مجتاز')}</Pill> : <Pill tone="red">{t('Fail', 'غير مجتاز')}</Pill>}</td>}
              <td className="px-3 py-2.5 text-end tabular-nums" dir="ltr">{showPrice ? fmtSar(v.price) : <span className="text-ai-700 text-[12px] font-semibold">🔒 {t('Sealed', 'مختوم')}</span>}</td>
              <td className="px-4 py-2.5 text-end">{v.files?.some((f) => !f.confirmed) ? <Pill tone="amber">{t('Review', 'مراجعة')}</Pill> : vendorStatus(v, o, rfp, t)}</td>
            </tr>
          ); })}
        </tbody>
      </table>
    </div>
  );
}
export function RecordBids(props: P) {
  const { task, isAr, t, readOnly } = props;
  const { rfp, o, set } = useOpening(task, props.onRfp);
  const [open, setOpen] = useState<null | { vid: string; item?: string }>(null);
  const ready = o.vendors.filter((v) => vendorReady(v, o, rfp)).length;
  const dp = o.committee === 'dpec';
  const sealed = priceSealed(o, rfp);
  const files = o.vendors.reduce((a, v) => a + (offerFiles(v).length), 0);
  const run = useStepper(4, 520, () => {
    const vs = o.vendors.map((v) => classified(v, false));
    set({ vendors: vs, intake: { at: now(), files: vs.reduce((a, v) => a + (v.files?.length ?? 0), 0), packages: vs.length } });
    toast(t('Offer packages sorted and checked by AI', 'تم فرز الحزم وفحصها بالذكاء الاصطناعي'));
  });
  const all = o.vendors.flatMap((v) => (v.files ?? []).map((f) => ({ v, f })));
  const review = all.filter((x) => !x.f.confirmed);
  const expired = all.filter((x) => x.f.status === 'expired');
  const missing = o.vendors.flatMap((v) => DOC_ITEMS.filter((d) => d.required && v.docs[d.id] === 'missing').map((d) => ({ v, d })));
  const high = all.filter((x) => x.f.conf >= 0.8).length;
  return (
    <div className="space-y-4" data-record-bids>
      <ActionHead title={dp ? t('Record offers and the technical result', 'تسجيل العروض والنتيجة الفنية') : t('Record the bids', 'تسجيل العطاءات')}
        desc={dp ? t('Upload the offer packages — AI sorts each file by bidder and type and pre-checks it. Confirm, record prices and the technical result.', 'ارفع حزم العروض — يفرز الذكاء الاصطناعي كل ملف حسب المورد والنوع ويفحصه. أكّد وسجّل الأسعار والنتيجة الفنية.')
          : t('Upload all offer packages from Etimad. AI sorts every file by bidder and document type, reads expiry dates and pre-fills the checklist — you confirm.', 'ارفع كل حزم العروض من اعتماد. يفرز الذكاء الاصطناعي كل ملف حسب المورد ونوع المستند ويقرأ تواريخ الانتهاء ويعبئ القائمة — وأنت تؤكد.')}
        progress={{ done: ready, total: o.vendors.length, label: t('bidders checked', 'موردين تم التحقق منهم'), attrs: { 'data-record-progress': `${ready}/${o.vendors.length}` } }}
        extra={<Button variant={o.intake && !review.length ? 'secondary' : o.intake ? 'primary' : 'secondary'} onClick={() => setOpen({ vid: review[0]?.v.id ?? o.vendors[0]?.id })} data-open-register>{readOnly ? t('View register', 'عرض السجل') : o.intake ? t('Open register', 'فتح السجل') : t('Check manually', 'تحقق يدوياً')}</Button>} />
      {!o.intake && !run.running && !readOnly && (
        <button type="button" onClick={run.start} data-intake-upload className="group w-full rounded-2xl border-2 border-dashed border-ai-200 bg-gradient-to-br from-ai-50/70 via-white to-white hover:border-ai-400 transition-colors px-6 py-6 flex items-center gap-5 text-start">
          <span className="relative w-16 h-16 flex-shrink-0">
            {[0, 1, 2].map((i) => <span key={i} className="absolute w-11 h-14 rounded-lg bg-white ring-1 ring-neutral-200 shadow-sm transition-transform group-hover:-translate-y-0.5" style={{ left: i * 8, top: 6 - i * 3, transform: `rotate(${(i - 1) * 7}deg)` }} />)}
            <span className="absolute -bottom-1 -end-1 w-7 h-7 rounded-full bg-ai-600 text-white inline-flex items-center justify-center shadow"><SparklesIcon className="w-4 h-4" /></span>
          </span>
          <span className="min-w-0"><span className="block text-[15px] font-semibold text-neutral-900">{t('Upload offer packages', 'ارفع حزم العروض')}</span>
            <span className="block mt-0.5 text-[12.5px] text-neutral-500">{t(`ZIP or folder from Etimad · ${o.vendors.length} bidders · about ${files} files. AI matches files to bidders by CR, classifies each document and reads expiry dates.`, `ملف ZIP أو مجلد من اعتماد · ${o.vendors.length} موردين · نحو ${files} ملفاً. يطابق الذكاء الملفات بالموردين ويصنفها ويقرأ تواريخ الانتهاء.`)}</span></span>
          <span className="ms-auto hidden md:inline-flex h-9 px-4 rounded-full bg-ai-600 text-white text-[12.5px] font-semibold items-center gap-1.5 group-hover:bg-ai-700"><UploadIcon className="w-4 h-4" />{t('Upload', 'رفع')}</span>
        </button>
      )}
      {run.running && (
        <Card attr={{ 'data-intake-running': '' }}>
          <div className="pt-4 flex items-center gap-6">
            <div className="relative w-28 h-28 flex-shrink-0">
              {o.vendors.map((v, i) => <span key={v.id} className="absolute w-16 h-20 rounded-lg bg-white ring-1 ring-neutral-200 shadow-sm flex items-end p-1.5 text-[8px] font-semibold text-neutral-500 transition-all duration-500" style={{ left: run.at >= 1 ? i * 22 : 20, top: run.at >= 1 ? 8 + i * 4 : 14, transform: `rotate(${run.at >= 1 ? (i - 1) * 9 : 0}deg)` }}>{v.name.split(' ')[0]}</span>)}
              <span className="absolute inset-x-0 h-6 bg-gradient-to-b from-ai-400/0 via-ai-400/35 to-ai-400/0 scan-line" />
            </div>
            <div className="flex-1"><p className="text-[13.5px] font-semibold text-neutral-900 mb-3">{t('Sorting the packages…', 'جارٍ فرز الحزم…')}</p>
              <Steps at={run.at} steps={[t(`Unpacking ${o.vendors.length} packages · ${files} files`, `فك ${o.vendors.length} حزم · ${files} ملفاً`), t('Matching files to bidders by CR number', 'مطابقة الملفات بالموردين برقم السجل'), t('Classifying each document', 'تصنيف كل مستند'), t('Reading expiry dates and amounts', 'قراءة تواريخ الانتهاء والمبالغ')]} /></div>
          </div>
        </Card>
      )}
      {o.intake && (
        <section className="rounded-2xl border border-ai-100 bg-gradient-to-br from-ai-50/60 to-white p-4" data-intake-result>
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-ai-700"><SparklesIcon className="w-3.5 h-3.5" />{t('AI intake', 'فرز الذكاء الاصطناعي')}</p>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
            {[[t('Files sorted', 'ملفات مفروزة'), `${all.length}`, ''], [t('High confidence', 'ثقة عالية'), `${high}/${all.length}`, ''], [t('Need your review', 'تحتاج مراجعتك'), review.length, review.length ? 'text-warning-700' : ''], [t('Issues found', 'ملاحظات'), expired.length + missing.length, expired.length + missing.length ? 'text-error-700' : '']].map(([k, v, c]) => (
              <div key={String(k)} className="rounded-xl bg-white ring-1 ring-neutral-200/70 px-3 py-2.5"><p className="text-[11px] text-neutral-500">{k}</p><p className={`mt-0.5 text-[20px] font-bold tabular-nums ${c || 'text-neutral-900'}`} data-intake-kpi={String(k)}>{v}</p></div>
            ))}
          </div>
          {(review.length > 0 || expired.length > 0 || missing.length > 0) && (
            <ul className="mt-3 space-y-1.5">
              {review.map(({ v, f }) => <li key={f.id} className="flex items-center gap-2.5 rounded-lg bg-white ring-1 ring-warning-200 px-3 py-2 text-[12.5px]"><span className="w-2 h-2 rounded-full bg-warning-500" /><span className="flex-1"><span className="font-semibold">{v.name}</span> · <span dir="ltr">{f.name}</span> — {t(`looks like ${DOC_ITEMS.find((d) => d.id === f.item)?.en} (${Math.round(f.conf * 100)}% sure)`, `يبدو ${DOC_ITEMS.find((d) => d.id === f.item)?.ar} (${Math.round(f.conf * 100)}%)`)}</span><button type="button" onClick={() => setOpen({ vid: v.id, item: f.item })} className="text-[12px] font-semibold text-brand-700" data-intake-review>{t('Review', 'مراجعة')}</button></li>)}
              {expired.map(({ v, f }) => <li key={f.id} className="flex items-center gap-2.5 rounded-lg bg-white ring-1 ring-neutral-200 px-3 py-2 text-[12.5px]"><span className="w-2 h-2 rounded-full bg-error-500" /><span className="flex-1"><span className="font-semibold">{v.name}</span> · {DOC_ITEMS.find((d) => d.id === f.item)?.[isAr ? 'ar' : 'en']} {t(`expired ${f.expiry}`, `انتهت ${f.expiry}`)}</span><button type="button" onClick={() => setOpen({ vid: v.id, item: f.item })} className="text-[12px] font-semibold text-brand-700">{t('View', 'عرض')}</button></li>)}
              {missing.map(({ v, d }) => <li key={v.id + d.id} className="flex items-center gap-2.5 rounded-lg bg-white ring-1 ring-neutral-200 px-3 py-2 text-[12.5px]"><span className="w-2 h-2 rounded-full bg-error-500" /><span className="flex-1"><span className="font-semibold">{v.name}</span> · {isAr ? d.ar : d.en} {t('not in the package', 'غير موجود في الحزمة')}</span></li>)}
            </ul>
          )}
        </section>
      )}
      <VendorTable o={o} rfp={rfp} t={t} showPrice={!sealed} showTech={dp} onOpen={(i) => setOpen({ vid: o.vendors[i].id })} />
      {o.source?.fileName && <p className="flex items-center gap-1.5 text-[12px] text-neutral-500"><DocumentIcon className="w-3.5 h-3.5" /><span dir="ltr">{o.source.fileName}</span></p>}
      {open && <BidRegister {...props} start={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* ── 19 · Members verify (conflict of interest + approve) ─────────── */
export function VerifyOpening({ task, isAr, t, readOnly, onRfp }: P) {
  const { rfp, o, setSeat } = useOpening(task, onRfp);
  const att = attending(o);
  const done = att.filter((s) => s.approval === 'approved').length;
  return (
    <div className="space-y-4" data-verify-opening>
      <ActionHead title={t('Verify the bid opening', 'التحقق من فتح العروض')}
        desc={t('Each attending member declares no conflict of interest, checks the register against the Etimad report, then approves or returns it.', 'يقر كل عضو حاضر بعدم تعارض المصالح ويطابق السجل مع تقرير اعتماد ثم يعتمد أو يعيد.')}
        progress={{ done, total: att.length, label: t('approved', 'اعتمدوا'), attrs: { 'data-verify-progress': `${done}/${att.length}` } }} />
      <Card title={t('Members', 'الأعضاء')} pad={false}>
        <ul className="divide-y divide-neutral-100">
          {att.map((s) => (
            <li key={s.role} className="flex items-center gap-3 px-5 py-3 flex-wrap" data-verify-seat={s.role}>
              <Avatar p={s.person} />
              <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium text-neutral-900">{nm(s.person, isAr)}</span><span className="block text-[11.5px] text-neutral-500">{isAr ? SEAT_LABEL[s.role].ar : SEAT_LABEL[s.role].en}</span></span>
              {s.approval === 'approved'
                ? <Pill tone="green" attr={{ 'data-approved': '' }}><CheckIcon className="w-3 h-3" />{t('Approved', 'معتمد')}</Pill>
                : s.approval === 'returned' ? <Pill tone="red">{t('Returned', 'مُعاد')}</Pill>
                : !readOnly && (
                  <span className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 text-[12px] text-neutral-600 cursor-pointer"><input type="checkbox" className="accent-brand-600" checked={!!s.coi} onChange={(e) => setSeat(s.role, { coi: e.target.checked })} data-coi={s.role} />{t('No conflict of interest', 'لا يوجد تعارض مصالح')}</label>
                    <Button size="sm" variant="primary" disabled={!s.coi} onClick={() => setSeat(s.role, { approval: 'approved', approvalAt: now() })} data-member-approve={s.role}>{t('Approve', 'اعتماد')}</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setSeat(s.role, { approval: 'returned', approvalAt: now() }); toast(t('Returned to the Secretary', 'أُعيد إلى أمين اللجنة')); }}>{t('Return', 'إعادة')}</Button>
                  </span>
                )}
            </li>
          ))}
        </ul>
      </Card>
      <VendorTable o={o} rfp={rfp} t={t} showPrice={!priceSealed(o, rfp)} />
    </div>
  );
}

/* ── 20 · MoM & send to BEC (Chairman) ────────────────────────────── */
export function MomPreview({ task, isAr, t, financial }: { task: Task; isAr: boolean; t: T; financial?: boolean }) {
  const rfp = task.rfp!; const o = rfp.opening!;
  const att = attending(o);
  const vendors = financial ? o.vendors.filter((v) => v.techPass) : o.vendors;
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden" data-mom-preview>
      <div className="px-6 py-5 border-b border-neutral-100 bg-gradient-to-b from-neutral-50 to-white">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{t('Minutes of meeting · preview', 'محضر الاجتماع · معاينة')}</p>
        <h3 className="mt-1 text-[16px] font-semibold text-neutral-900">{financial ? t('Financial offers opening', 'فتح العروض المالية') : t('Bid opening', 'فتح العروض')} · <span dir="ltr">{rfp.etimad?.ref}</span></h3>
        <p className="text-[12.5px] text-neutral-500 mt-0.5">{task.entity.titleEn && (isAr ? task.entity.titleAr : task.entity.titleEn)} · {fmtDate(o.openingDate, isAr)}</p>
      </div>
      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-6">
        <div>
          <p className="text-[11.5px] font-semibold text-neutral-500 mb-2">{t('Attendees', 'الحضور')}</p>
          <ul className="space-y-1.5 text-[12.5px]">{[seatOf(o, 'chairman'), seatOf(o, 'secretary'), ...att].filter(Boolean).map((s) => <li key={s!.role} className="flex items-center gap-2"><span className="text-neutral-500 w-24">{isAr ? SEAT_LABEL[s!.role].ar : SEAT_LABEL[s!.role].en}</span><span className="text-neutral-900">{nm(s!.person, isAr)}</span>{s!.approval === 'approved' && <CheckCircleIcon className="w-3.5 h-3.5 text-success-600" />}</li>)}</ul>
        </div>
        <div>
          <p className="text-[11.5px] font-semibold text-neutral-500 mb-2">{t(`${vendors.length} bidders`, `${vendors.length} موردين`)}</p>
          <ul className="space-y-1.5 text-[12.5px]">{vendors.map((v) => { const d = vendorDocs(v); return <li key={v.id} className="flex items-center gap-2"><span className="flex-1 truncate text-neutral-900">{v.name}</span><span className="text-neutral-500 tabular-nums">{d.set - d.issues}/{d.total}</span>{(financial || !priceSealed(o, rfp)) && <span className="tabular-nums text-neutral-700 w-32 text-end" dir="ltr">{fmtSar(v.price)}</span>}</li>; })}</ul>
        </div>
      </div>
    </section>
  );
}
export function ApproveMom({ task, isAr, t, readOnly, onRfp }: P) {
  const { rfp, o, set } = useOpening(task, onRfp);
  const two = envelopeOf(rfp) === 'two';
  return (
    <div className="space-y-4" data-approve-mom>
      <ActionHead title={t('Approve the opening and send to Bid Evaluation', 'اعتماد الفتح والإرسال للجنة التقييم')}
        desc={two ? t('Members have verified. Add your comments; the MoM is generated and the technical offers go to the Bid Evaluation Committee. Prices stay sealed.', 'تحقق الأعضاء. أضف ملاحظاتك؛ يُنشأ المحضر وتنتقل العروض الفنية إلى لجنة فحص العروض. تبقى الأسعار مختومة.')
          : t('Members have verified. Add your comments; the MoM is generated and the offers go to the Bid Evaluation Committee.', 'تحقق الأعضاء. أضف ملاحظاتك؛ يُنشأ المحضر وتنتقل العروض إلى لجنة فحص العروض.')} />
      <MomPreview task={task} isAr={isAr} t={t} />
      <Card title={t('Chairman’s comments', 'ملاحظات الرئيس')} attr={{ 'data-chairman-note': '' }}>
        <textarea rows={3} disabled={readOnly} value={o.chairmanNote ?? ''} onChange={(e) => set({ chairmanNote: e.target.value })} placeholder={t('Printed on the MoM', 'تُطبع في المحضر')} className="w-full text-[13px] rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:border-brand-400" />
        <div className="mt-2 flex justify-end"><Button size="sm" variant="ghost" onClick={() => toast(t('MoM PDF generated (preview)', 'تم إنشاء ملف المحضر (معاينة)'))}><DocumentIcon className="w-4 h-4" />{t('Preview MoM PDF', 'معاينة ملف المحضر')}</Button></div>
      </Card>
    </div>
  );
}

/* ── Two-envelope · Financial opening ─────────────────────────────── */
export function FinancialOpening({ task, isAr, t, readOnly, onRfp }: P) {
  const { o, set, setVendor } = useOpening(task, onRfp);
  const pass = o.vendors.filter((v) => v.techPass); const fail = o.vendors.filter((v) => v.techPass === false);
  const done = pass.filter((v) => (v.price ?? 0) > 0).length;
  return (
    <div className="space-y-4" data-fin-opening>
      <ActionHead title={t('Open the financial offers', 'فتح العروض المالية')}
        desc={t('Bid Evaluation has shortlisted the technically passing bidders. Open only their financial offers in Etimad and record the prices; the others stay sealed.', 'حددت لجنة فحص العروض الموردين المجتازين فنياً. افتح عروضهم المالية فقط في اعتماد وسجّل الأسعار؛ وتبقى البقية مختومة.')}
        progress={{ done, total: pass.length, label: t('prices recorded', 'أسعار مسجلة'), attrs: { 'data-finopen-progress': `${done}/${pass.length}` } }} />
      <Card title={t('Technically passing', 'المجتازون فنياً')} pad={false}>
        <ul className="divide-y divide-neutral-100">
          {pass.map((v) => (
            <li key={v.id} className="flex items-center gap-3 px-5 py-3" data-fin-vendor={v.id}>
              <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium text-neutral-900">{v.name}</span><span className="block text-[11.5px] text-neutral-500 tabular-nums" dir="ltr">CR {v.cr}</span></span>
              <Pill tone="green">{t('Passed technical', 'اجتاز فنياً')}</Pill>
              <input type="number" min={0} disabled={readOnly} dir="ltr" value={v.price ?? ''} onChange={(e) => setVendor(v.id, { price: Number(e.target.value) || undefined })} placeholder={t('Price (SAR)', 'السعر (ريال)')} className="w-40 text-end text-[13.5px] font-semibold rounded-lg border border-neutral-200 px-3 py-1.5 tabular-nums focus:outline-none focus:border-brand-400" data-fin-price />
            </li>
          ))}
          {fail.map((v) => (
            <li key={v.id} className="flex items-center gap-3 px-5 py-3 bg-neutral-50/60" data-fin-sealed={v.id}>
              <span className="min-w-0 flex-1 text-[13px] text-neutral-500">{v.name}</span>
              <Pill tone="gray">🔒 {t('Sealed · failed technical', 'مختوم · لم يجتز فنياً')}</Pill>
            </li>
          ))}
        </ul>
      </Card>
      <Card title={t('Chairman’s comments', 'ملاحظات الرئيس')}>
        <textarea rows={2} disabled={readOnly} value={o.financial?.note ?? ''} onChange={(e) => set({ financial: { ...(o.financial ?? {}), note: e.target.value } })} placeholder={t('Printed on the financial opening MoM', 'تُطبع في محضر الفتح المالي')} className="w-full text-[13px] rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:border-brand-400" />
      </Card>
    </div>
  );
  void isAr;
}

/* ── DP · Select vendor (Chairman) ────────────────────────────────── */
export function DpSelect({ task, isAr, t, readOnly, onRfp }: P) {
  const { rfp, o, set } = useOpening(task, onRfp);
  const sug = suggestedVendor(o);
  const special = specialDp(o);
  const pick = o.dp?.selected;
  const ranked = useMemo(() => [...o.vendors].sort((a, b) => (a.techPass === false ? 1 : 0) - (b.techPass === false ? 1 : 0) || (a.price ?? 9e15) - (b.price ?? 9e15)), [o.vendors]);
  return (
    <div className="space-y-4" data-dp-select>
      <ActionHead title={t('Select the vendor', 'اختيار المورد')}
        desc={t('The offers are ranked by price among technically passing bidders. Confirm the suggestion, or pick another with a reason.', 'العروض مرتبة حسب السعر بين المجتازين فنياً. أكّد الاقتراح أو اختر غيره مع ذكر السبب.')} />
      <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${special ? 'border-warning-200 bg-warning-50/60' : 'border-neutral-200 bg-white'}`} data-dp-route={special ? 'special' : 'normal'}>
        {special ? <AlertTriangleIcon className="w-4 h-4 text-warning-600 mt-0.5" /> : <CheckCircleIcon className="w-4 h-4 text-success-600 mt-0.5" />}
        <p className="text-[13px] text-neutral-800">{special
          ? <><span className="font-semibold">{t('Special direct purchase', 'شراء مباشر خاص')}</span> · {t('goes to the Qualification Committee next', 'ينتقل إلى لجنة التأهيل')}{o.dp?.specialWhy && <span className="text-neutral-500"> · {isAr ? o.dp.specialWhy.ar : o.dp.specialWhy.en}</span>}</>
          : <><span className="font-semibold">{t('Normal direct purchase', 'شراء مباشر عادي')}</span> · {t('goes straight to final approval', 'ينتقل مباشرة إلى الاعتماد النهائي')}</>}</p>
      </div>
      <Card title={t('Offers', 'العروض')} pad={false}>
        <ul className="divide-y divide-neutral-100">
          {ranked.map((v, i) => (
            <li key={v.id}>
              <label className={`flex items-center gap-3 px-5 py-3 ${v.techPass === false ? 'opacity-60' : 'cursor-pointer hover:bg-neutral-50'} ${pick === v.id ? 'bg-brand-50/50' : ''}`} data-dp-vendor={v.id}>
                <input type="radio" name={`dp-${task.id}`} className="accent-brand-600" disabled={readOnly || v.techPass === false} checked={pick === v.id} onChange={() => set({ dp: { ...(o.dp ?? {}), selected: v.id, at: now() } })} />
                <span className="w-5 text-[12px] text-neutral-400 tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium text-neutral-900">{v.name}</span>{v.techNote && <span className="block text-[11.5px] text-neutral-500 truncate">{v.techNote}</span>}</span>
                {v.id === sug?.id && <Pill tone="violet" attr={{ 'data-suggested': '' }}><SparklesIcon className="w-3 h-3" />{t('Lowest passing', 'أقل سعر مجتاز')}</Pill>}
                {v.techPass === false ? <Pill tone="red">{t('Failed technical', 'لم يجتز فنياً')}</Pill> : <Pill tone="green">{t('Passed', 'مجتاز')}</Pill>}
                <span className="w-36 text-end text-[13px] font-semibold tabular-nums" dir="ltr">{fmtSar(v.price)}</span>
              </label>
            </li>
          ))}
        </ul>
      </Card>
      {pick && pick !== sug?.id && (
        <Card title={t('Why not the lowest passing offer?', 'لماذا لم يُختر أقل عرض مجتاز؟')} attr={{ 'data-dp-reason': '' }}>
          <input disabled={readOnly} value={o.dp?.reason ?? ''} onChange={(e) => set({ dp: { ...(o.dp ?? {}), reason: e.target.value } })} placeholder={t('Required', 'مطلوب')} className="w-full text-[13px] rounded-lg border border-warning-300 px-3 py-2 focus:outline-none focus:border-brand-400" />
        </Card>
      )}
      <p className="text-[12px] text-neutral-500">{t('Estimated value', 'القيمة التقديرية')}: <span className="font-semibold text-neutral-700 tabular-nums" dir="ltr">{fmtSar(task.amount)}</span></p>
      {void rfp}
    </div>
  );
}

/* ── Committee tab (task detail) ──────────────────────────────────── */
export function CommitteeTab({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  const o = task.rfp?.opening;
  if (!o) return <p className="text-[13px] text-neutral-500">{t('The committee is set when the bid opening form is raised.', 'تُحدد اللجنة عند رفع نموذج فتح العروض.')}</p>;
  const rows = [...o.seats].sort((a, b) => ['chairman', 'secretary', 'legal', 'finance', 'procurement', 'technical'].indexOf(a.role) - ['chairman', 'secretary', 'legal', 'finance', 'procurement', 'technical'].indexOf(b.role));
  const docs: [string, string | undefined][] = [
    [t('Etimad opening report', 'تقرير الفتح من اعتماد'), o.source?.fileName],
    [t('Bid opening MoM', 'محضر فتح العروض'), o.momAt ? `MoM_opening_${task.entity.ref}.pdf` : undefined],
    [t('Financial opening MoM', 'محضر الفتح المالي'), o.financial?.momAt ? `MoM_financial_${task.entity.ref}.pdf` : undefined],
    [t('Technical evaluation report', 'تقرير التقييم الفني'), o.eval?.techReport?.sig ? `Technical_report_${task.entity.ref}.pdf` : undefined],
  ];
  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start" data-committee-tab>
    <CaseStory task={task} isAr={isAr} t={t} />
    <div className="space-y-4">
      <Card title={COMMITTEE_LABEL[o.committee][isAr ? 'ar' : 'en']} aside={<Pill tone="gray">{t('Annual roster 2026', 'تشكيل 2026')}</Pill>} pad={false}>
        <ul className="divide-y divide-neutral-100">
          {rows.map((s) => (
            <li key={s.role} className="flex items-center gap-3 px-5 py-3" data-committee-seat={s.role}>
              <span className="w-24 text-[12px] font-semibold text-neutral-500">{isAr ? SEAT_LABEL[s.role].ar : SEAT_LABEL[s.role].en}</span>
              <Avatar p={s.person} />
              <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium text-neutral-900 truncate">{nm(s.person, isAr)}</span>
                {s.replaced && <span className="block text-[11.5px] text-warning-700">{t(`Replacing ${s.replaced.from.name} · ${s.replaced.reason}`, `بدلاً من ${s.replaced.from.nameAr ?? s.replaced.from.name}`)}</span>}</span>
              {s.role === 'technical' && <Pill tone="blue">{t('Nominated for this case', 'مرشح لهذه الحالة')}</Pill>}
              {!s.attending ? <Pill tone="gray">{t('Not attending', 'غير حاضر')}</Pill> : s.approval === 'approved' ? <Pill tone="green"><CheckIcon className="w-3 h-3" />{t('Approved', 'معتمد')}</Pill> : s.approval === 'returned' ? <Pill tone="red">{t('Returned', 'مُعاد')}</Pill> : null}
            </li>
          ))}
        </ul>
      </Card>
      <EvalSignatures o={o} isAr={isAr} t={t} />
      <Card title={t('Documents', 'المستندات')} pad={false}>
        <ul className="divide-y divide-neutral-100">
          {docs.map(([k, f]) => (
            <li key={k} className="flex items-center gap-3 px-5 py-3">
              <DocumentIcon className={`w-4 h-4 ${f ? 'text-brand-600' : 'text-neutral-300'}`} />
              <span className="flex-1 text-[13px] text-neutral-800">{k}</span>
              {f ? <span className="text-[12px] text-neutral-500 truncate" dir="ltr">{f}</span> : <span className="text-[12px] text-neutral-400">{t('Not yet', 'لم يصدر بعد')}</span>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
    </div>
  );
}

/** Router: the widget for a committee task. */
export function CommitteeWidget(p: P & { openStory?: () => void }) {
  const body = CommitteeBody(p);
  const showStrip = p.task.committee !== 'raise-opening';
  return <div className="space-y-4">{showStrip && <StoryStrip task={p.task} isAr={p.isAr} t={p.t} onOpen={p.openStory} />}{body}</div>;
}
function CommitteeBody(p: P) {
  switch (p.task.committee) {
    case 'raise-opening': return <RaiseOpening {...p} />;
    case 'assign': return <AssignCommittee {...p} />;
    case 'record': case 'dp-evaluate': return <RecordBids {...p} />;
    case 'verify': return <VerifyOpening {...p} />;
    case 'mom': return <ApproveMom {...p} />;
    case 'fin-opening': return <FinancialOpening {...p} />;
    case 'dp-select': return <DpSelect {...p} />;
    default: return <EvalWidget {...p} />;
  }
}
