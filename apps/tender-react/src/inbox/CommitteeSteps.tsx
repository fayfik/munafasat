/* Committee stage after Etimad publish — Epics C5 to E.
   16 Raise bid opening form (Procurement member) → 17 Confirm committee (Chairman)
   → 18 Record bids (Secretary) → 19 Members verify → 20 MoM & send to BEC.
   Two-envelope: Financial opening after BEC shortlists. Direct purchase: DPEC assign → evaluate → select.
   Clean, list-first screens; the bid register opens as a full page when the pane is too narrow. */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { CommitteeSeat, DocStatus, Opening, OpeningVendor, Person, RfpDetail, SeatRole, Task } from './types';
import { ActionHead } from './ActionHead';
import { Avatar } from './InboxTools';
import { Button } from '../components/ui';
import { toast } from '../components/Toast';
import { ArrowLeftIcon, CheckCircleIcon, CheckIcon, DocumentIcon, PlusIcon, TrashIcon, UploadIcon, XIcon, AlertTriangleIcon, ChevronRightIcon, SparklesIcon } from '../components/Icons';
import {
  ALTERNATES, COMMITTEE_LABEL, DOC_ITEMS, DOC_STATUS, ETIMAD_BIDDERS, REPLACE_REASONS, SEAT_LABEL,
  attending, envelopeOf, fmtSar, members, newOpening, priceSealed, seatOf, specialDp, suggestedVendor, vendorDocs, vendorFrom, vendorReady,
} from './committee';

type T = (en: string, ar: string) => string;
type P = { task: Task; isAr: boolean; t: T; readOnly?: boolean; onRfp: (rfp: RfpDetail) => void };
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
const Card = ({ title, aside, children, attr, pad = true }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; attr?: Record<string, string>; pad?: boolean }) => (
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
const Bar = ({ done, total }: { done: number; total: number }) => (
  <span className="inline-flex items-center gap-2"><span className="h-1.5 w-24 rounded-full bg-neutral-100 overflow-hidden"><span className="block h-full rounded-full bg-success-500 transition-all duration-500" style={{ width: `${Math.round((done / Math.max(1, total)) * 100)}%` }} /></span><span className="text-[12px] text-neutral-500 tabular-nums">{done}/{total}</span></span>
);
const vendorStatus = (v: OpeningVendor, o: Opening, r: RfpDetail | undefined, t: T) => {
  const d = vendorDocs(v);
  if (vendorReady(v, o, r)) return d.issues ? <Pill tone="amber">{t(`${d.issues} issue${d.issues > 1 ? 's' : ''}`, `${d.issues} ملاحظة`)}</Pill> : <Pill tone="green"><CheckIcon className="w-3 h-3" />{t('Checked', 'تم التحقق')}</Pill>;
  return d.set ? <Pill tone="blue">{t('In progress', 'قيد التحقق')}</Pill> : <Pill tone="gray">{t('Not started', 'لم يبدأ')}</Pill>;
};
export const RoleChip = ({ role, isAr }: { role?: { en: string; ar: string }; isAr: boolean }) =>
  role ? <span className="inline-flex items-center rounded-md bg-[#EEF1FA] text-[#2A3466] px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap" data-committee-role>{isAr ? role.ar : role.en}</span> : null;

/* ── 16 · Raise bid opening form ───────────────────────────────────── */
export function RaiseOpening({ task, isAr, t, readOnly, onRfp }: P) {
  const { rfp, o, set, setVendor } = useOpening(task, onRfp);
  const [busy, setBusy] = useState(false);
  const env = envelopeOf(rfp);
  const upload = () => {
    setBusy(true);
    window.setTimeout(() => {
      set({ source: { kind: 'upload', fileName: `Etimad_opening_report_${rfp.etimad?.ref ?? task.entity.ref}.pdf`, at: now() }, vendors: ETIMAD_BIDDERS.map(vendorFrom) });
      setBusy(false); toast(t('3 bidders read from the Etimad report — check them', 'تمت قراءة 3 موردين من تقرير اعتماد — تحقق منهم'));
    }, 700);
  };
  const add = () => set({ vendors: [...o.vendors, { id: `v${Date.now()}`, name: '', cr: '', docs: {} }] });
  const ok = o.vendors.filter((v) => v.name.trim() && v.cr.trim()).length;
  return (
    <div className="space-y-4" data-raise-opening>
      <ActionHead title={t('Raise the bid opening form', 'رفع نموذج فتح العروض')}
        desc={t('Bidding has closed in Etimad. Bring in the bidders — upload Etimad’s opening report or enter them — and send the case to the committee.', 'أُغلق التقديم في اعتماد. أدخل الموردين — ارفع تقرير الفتح من اعتماد أو أدخلهم يدوياً — وأرسل الحالة إلى اللجنة.')}
        progress={{ done: ok, total: Math.max(1, o.vendors.length), label: t('bidders complete', 'موردين مكتملين'), attrs: { 'data-raise-progress': `${ok}/${o.vendors.length}` } }} />
      <Card title={t('Tender', 'المنافسة')}>
        <Facts items={[
          [t('Etimad reference', 'مرجع اعتماد'), <span dir="ltr">{rfp.etimad?.ref ?? '—'}</span>],
          [t('Bid closing', 'إغلاق العروض'), fmtDate(rfp.etimad?.closingDate, isAr)],
          [t('Envelopes', 'الأظرف'), env === 'two' ? t('Two — prices sealed', 'ظرفان — الأسعار مختومة') : t('One', 'ظرف واحد')],
          [t('Opening date', 'تاريخ الفتح'), <input type="date" disabled={readOnly} value={o.openingDate ?? ''} onChange={(e) => set({ openingDate: e.target.value })} className="text-[13px] font-medium bg-transparent rounded-md border border-neutral-200 px-2 py-0.5 focus:outline-none focus:border-brand-400" data-opening-date />],
        ]} />
      </Card>
      <Card title={t('Bidders', 'الموردون')} attr={{ 'data-bidders': '' }}
        aside={!readOnly && <div className="inline-flex gap-0.5 p-1 rounded-full bg-neutral-100" role="radiogroup" data-source={o.source?.kind ?? ''}>
          {([['upload', t('Upload Etimad report', 'رفع تقرير اعتماد')], ['manual', t('Enter manually', 'إدخال يدوي')]] as const).map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={o.source?.kind === k} data-source-opt={k}
              onClick={() => (k === 'upload' ? (o.source?.kind !== 'upload' && upload()) : set({ source: { kind: 'manual', at: now() }, vendors: o.vendors.length ? o.vendors : [{ id: 'v1', name: '', cr: '', docs: {} }] }))}
              className={`h-8 px-3 rounded-full text-[12.5px] font-semibold transition-all ${o.source?.kind === k ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200/70' : 'text-neutral-600 hover:text-neutral-900'}`}>{l}</button>
          ))}
        </div>}>
        {!o.source && !busy && (
          <button type="button" disabled={readOnly} onClick={upload} data-upload-etimad
            className="w-full rounded-xl border-2 border-dashed border-neutral-200 hover:border-brand-300 hover:bg-brand-50/30 transition-colors py-8 flex flex-col items-center gap-2 text-neutral-500">
            <UploadIcon className="w-6 h-6" /><span className="text-[13px] font-semibold text-neutral-800">{t('Upload Etimad opening report', 'ارفع تقرير فتح العروض من اعتماد')}</span>
            <span className="text-[12px]">{t('PDF or Excel exported from Etimad · or enter bidders manually', 'PDF أو Excel من اعتماد · أو أدخل الموردين يدوياً')}</span>
          </button>
        )}
        {busy && <div className="py-8 text-center text-[13px] text-neutral-500 fade-in" data-reading>{t('Reading the report…', 'جارٍ قراءة التقرير…')}</div>}
        {o.source && !busy && (
          <div className="fade-in">
            {o.source.kind === 'upload' && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2 text-[12.5px]" data-etimad-file>
                <DocumentIcon className="w-4 h-4 text-neutral-500" /><span className="font-medium text-neutral-800 truncate" dir="ltr">{o.source.fileName}</span>
                <span className="ms-auto inline-flex items-center gap-1 text-ai-700 text-[11.5px] font-semibold"><SparklesIcon className="w-3 h-3" />{t(`${o.vendors.length} bidders read`, `قُرئ ${o.vendors.length} موردين`)}</span>
              </div>
            )}
            <div className="rounded-xl border border-neutral-200 overflow-hidden">
              <table className="w-full text-[13px]">
                <thead><tr className="bg-neutral-50 text-[11.5px] text-neutral-500"><th className="text-start font-medium px-3 py-2 w-10">#</th><th className="text-start font-medium px-3 py-2">{t('Bidder', 'المورد')}</th><th className="text-start font-medium px-3 py-2 w-52">{t('Commercial register no.', 'رقم السجل التجاري')}</th><th className="w-10" /></tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {o.vendors.map((v, i) => (
                    <tr key={v.id} data-bidder-row={i}>
                      <td className="px-3 py-1.5 text-neutral-400 tabular-nums">{i + 1}</td>
                      <td className="px-2 py-1.5"><input disabled={readOnly} value={v.name} onChange={(e) => setVendor(v.id, { name: e.target.value })} placeholder={t('Company name', 'اسم الشركة')} className="w-full rounded-md px-2 py-1.5 border border-transparent hover:border-neutral-200 focus:border-brand-400 focus:outline-none bg-transparent" data-bidder-name /></td>
                      <td className="px-2 py-1.5"><input disabled={readOnly} dir="ltr" value={v.cr} onChange={(e) => setVendor(v.id, { cr: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10 digits" className="w-full rounded-md px-2 py-1.5 border border-transparent hover:border-neutral-200 focus:border-brand-400 focus:outline-none bg-transparent tabular-nums" data-bidder-cr /></td>
                      <td className="px-2">{!readOnly && <button type="button" aria-label={t('Remove', 'حذف')} onClick={() => set({ vendors: o.vendors.filter((x) => x.id !== v.id) })} className="p-1.5 rounded-md text-neutral-400 hover:text-error-600 hover:bg-error-50"><TrashIcon className="w-4 h-4" /></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!readOnly && <button type="button" onClick={add} data-add-bidder className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-700 hover:text-brand-800"><PlusIcon className="w-4 h-4" />{t('Add bidder', 'إضافة مورد')}</button>}
          </div>
        )}
      </Card>
    </div>
  );
}

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

/* ── Bid register (full page): vendor list + one vendor's documents ── */
function DocRow({ item, value, onSet, readOnly, isAr }: { item: (typeof DOC_ITEMS)[number]; value?: DocStatus; onSet: (s: DocStatus) => void; readOnly?: boolean; isAr: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5" data-doc={item.id}>
      <span className={`w-2 h-2 rounded-full ${value === 'valid' ? 'bg-success-500' : value === 'expired' ? 'bg-warning-500' : value === 'missing' ? 'bg-error-500' : 'bg-neutral-200'}`} />
      <span className="flex-1 min-w-0 text-[13px] text-neutral-800">{isAr ? item.ar : item.en}{!item.required && <span className="text-neutral-400"> · {isAr ? 'اختياري' : 'optional'}</span>}</span>
      <div className="inline-flex gap-1" role="radiogroup">
        {DOC_STATUS.map((s) => (
          <button key={s.id} type="button" disabled={readOnly} role="radio" aria-checked={value === s.id} onClick={() => onSet(s.id)} data-doc-status={s.id}
            className={`h-7 px-2.5 rounded-md text-[12px] font-semibold transition-all ring-1 ${value === s.id ? s.on : 'ring-transparent text-neutral-500 hover:bg-neutral-100'}`}>{isAr ? s.ar : s.en}</button>
        ))}
      </div>
    </div>
  );
}
export function BidRegister({ task, isAr, t, readOnly, onRfp, onClose }: P & { onClose: () => void }) {
  const { rfp, o, setVendor } = useOpening(task, onRfp);
  const [sel, setSel] = useState(o.vendors[0]?.id ?? '');
  const v = o.vendors.find((x) => x.id === sel) ?? o.vendors[0];
  const idx = o.vendors.findIndex((x) => x.id === v?.id);
  const sealed = priceSealed(o, rfp);
  const dp = o.committee === 'dpec';
  const ready = o.vendors.filter((x) => vendorReady(x, o, rfp)).length;
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const allValid = () => v && setVendor(v.id, { docs: Object.fromEntries(DOC_ITEMS.filter((d) => d.required).map((d) => [d.id, 'valid' as DocStatus])) });
  return createPortal(
    <div className="fixed inset-0 z-50 bg-neutral-50 flex flex-col fade-in" data-bid-register>
      <header className="h-16 flex-shrink-0 bg-white border-b border-neutral-200 flex items-center gap-4 px-5">
        <button type="button" onClick={onClose} data-register-close title={t('Back to task', 'العودة إلى المهمة')} className="w-9 h-9 rounded-full border border-neutral-200 inline-flex items-center justify-center text-neutral-600 hover:bg-neutral-50"><ArrowLeftIcon className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} /></button>
        <div className="min-w-0"><p className="text-[11.5px] text-neutral-500" dir="ltr">{task.entity.ref} · {rfp.etimad?.ref}</p><h2 className="text-[16px] font-semibold text-neutral-900 truncate">{dp ? t('Offer register', 'سجل العروض') : t('Bid register', 'سجل العطاءات')}</h2></div>
        {sealed && <Pill tone="violet" attr={{ 'data-sealed': '' }}>{t('Technical opening · prices sealed', 'الفتح الفني · الأسعار مختومة')}</Pill>}
        <span className="ms-auto flex items-center gap-3"><Bar done={ready} total={o.vendors.length} /><Button size="sm" variant="primary" onClick={onClose} data-register-done>{t('Done', 'تم')}</Button></span>
      </header>
      <div className="flex-1 min-h-0 flex">
        <aside className="w-80 flex-shrink-0 border-e border-neutral-200 bg-white overflow-y-auto" data-register-vendors>
          <p className="px-5 pt-4 pb-2 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">{t(`${o.vendors.length} bidders`, `${o.vendors.length} موردين`)}</p>
          <ul className="px-3 pb-4 space-y-1 stagger">
            {o.vendors.map((x, i) => {
              const d = vendorDocs(x);
              return (
                <li key={x.id}>
                  <button type="button" onClick={() => setSel(x.id)} data-register-vendor={i} aria-current={x.id === v?.id}
                    className={`w-full text-start rounded-xl px-3 py-2.5 transition-colors ${x.id === v?.id ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-neutral-50'}`}>
                    <span className="flex items-center justify-between gap-2"><span className="text-[13px] font-semibold text-neutral-900 truncate">{x.name}</span>{vendorStatus(x, o, rfp, t)}</span>
                    <span className="mt-1.5 flex items-center gap-2"><span className="h-1 flex-1 rounded-full bg-neutral-100 overflow-hidden"><span className="block h-full rounded-full bg-success-500" style={{ width: `${Math.round((d.set / d.total) * 100)}%` }} /></span><span className="text-[11px] text-neutral-500 tabular-nums">{d.set}/{d.total}</span></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
        {v && (
          <main className="flex-1 min-w-0 overflow-y-auto" key={v.id}>
            <div className="max-w-3xl mx-auto px-6 py-6 space-y-4 fade-in" data-register-detail={idx}>
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-[11.5px] text-neutral-500">{t(`Bidder ${idx + 1} of ${o.vendors.length}`, `المورد ${idx + 1} من ${o.vendors.length}`)}</p><h3 className="text-[20px] font-semibold text-neutral-900">{v.name}</h3><p className="text-[12.5px] text-neutral-500 tabular-nums" dir="ltr">CR {v.cr}</p></div>
                <div className="text-end">
                  <p className="text-[11px] text-neutral-500">{t('Offer price (SAR)', 'سعر العرض (ريال)')}</p>
                  {sealed
                    ? <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ai-700" data-price-sealed>🔒 {t('Sealed', 'مختوم')}</p>
                    : <input type="number" min={0} disabled={readOnly} value={v.price ?? ''} onChange={(e) => setVendor(v.id, { price: Number(e.target.value) || undefined })} placeholder="0" dir="ltr" className="mt-1 w-40 text-end text-[15px] font-semibold rounded-lg border border-neutral-200 px-3 py-1.5 tabular-nums focus:outline-none focus:border-brand-400" data-vendor-price />}
                </div>
              </div>
              <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100"><h4 className="text-[13.5px] font-semibold text-neutral-900">{t('Documents', 'المستندات')}</h4>
                  {!readOnly && <button type="button" onClick={allValid} data-all-valid className="text-[12px] font-semibold text-brand-700 hover:text-brand-800">{t('Mark required as valid', 'تحديد المطلوب كساري')}</button>}</div>
                <div className="divide-y divide-neutral-100">{DOC_ITEMS.map((d) => <DocRow key={d.id} item={d} value={v.docs[d.id]} readOnly={readOnly} isAr={isAr} onSet={(s) => setVendor(v.id, { docs: { ...v.docs, [d.id]: s } })} />)}</div>
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
      </div>
    </div>, document.body);
}

/* ── 18 · Record bids (Secretary) / DP evaluate (Officer + Technical) ── */
function VendorTable({ o, rfp, t, showPrice, showTech, onOpen }: { o: Opening; rfp?: RfpDetail; t: T; showPrice: boolean; showTech?: boolean; onOpen?: (i: number) => void }) {
  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden" data-vendor-table>
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
              <td className="px-4 py-2.5"><p className="font-medium text-neutral-900">{v.name}</p><p className="text-[11.5px] text-neutral-500 tabular-nums" dir="ltr">CR {v.cr}</p></td>
              <td className="px-3 py-2.5"><Bar done={d.set} total={d.total} /></td>
              {showTech && <td className="px-3 py-2.5">{v.techPass == null ? <span className="text-neutral-400">—</span> : v.techPass ? <Pill tone="green">{t('Pass', 'مجتاز')}</Pill> : <Pill tone="red">{t('Fail', 'غير مجتاز')}</Pill>}</td>}
              <td className="px-3 py-2.5 text-end tabular-nums" dir="ltr">{showPrice ? fmtSar(v.price) : <span className="text-ai-700 text-[12px] font-semibold">🔒 {t('Sealed', 'مختوم')}</span>}</td>
              <td className="px-4 py-2.5 text-end">{vendorStatus(v, o, rfp, t)}</td>
            </tr>
          ); })}
        </tbody>
      </table>
    </div>
  );
}
export function RecordBids(props: P) {
  const { task, isAr, t, readOnly } = props;
  const { rfp, o } = useOpening(task, props.onRfp);
  const [open, setOpen] = useState(false);
  const ready = o.vendors.filter((v) => vendorReady(v, o, rfp)).length;
  const dp = o.committee === 'dpec';
  const sealed = priceSealed(o, rfp);
  return (
    <div className="space-y-4" data-record-bids>
      <ActionHead title={dp ? t('Record offers and the technical result', 'تسجيل العروض والنتيجة الفنية') : t('Record the bids', 'تسجيل العطاءات')}
        desc={dp ? t('Check each offer’s documents and price; the Technical member enters pass or fail with a short reason.', 'تحقق من مستندات وسعر كل عرض؛ ويُدخل العضو الفني النتيجة مع مبرر مختصر.')
          : sealed ? t('Check each bidder’s documents against the Etimad report. Prices stay sealed until technical evaluation is done.', 'تحقق من مستندات كل مورد مقابل تقرير اعتماد. تبقى الأسعار مختومة حتى انتهاء التقييم الفني.')
          : t('Check each bidder’s documents and record the offer price.', 'تحقق من مستندات كل مورد وسجّل سعر العرض.')}
        progress={{ done: ready, total: o.vendors.length, label: t('bidders checked', 'موردين تم التحقق منهم'), attrs: { 'data-record-progress': `${ready}/${o.vendors.length}` } }}
        extra={<Button variant={ready === o.vendors.length ? 'secondary' : 'primary'} onClick={() => setOpen(true)} data-open-register>{readOnly ? t('View register', 'عرض السجل') : ready ? t('Continue in register', 'المتابعة في السجل') : t('Open register', 'فتح السجل')}</Button>} />
      <VendorTable o={o} rfp={rfp} t={t} showPrice={!sealed} showTech={dp} onOpen={() => setOpen(true)} />
      {o.source?.fileName && <p className="flex items-center gap-1.5 text-[12px] text-neutral-500"><DocumentIcon className="w-3.5 h-3.5" /><span dir="ltr">{o.source.fileName}</span></p>}
      {open && <BidRegister {...props} onClose={() => setOpen(false)} />}
    </div>
  );
  void isAr;
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
  ];
  return (
    <div className="space-y-4" data-committee-tab>
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
  );
}

/** Router: the widget for a committee task. */
export function CommitteeWidget(p: P) {
  switch (p.task.committee) {
    case 'raise-opening': return <RaiseOpening {...p} />;
    case 'assign': return <AssignCommittee {...p} />;
    case 'record': case 'dp-evaluate': return <RecordBids {...p} />;
    case 'verify': return <VerifyOpening {...p} />;
    case 'mom': return <ApproveMom {...p} />;
    case 'fin-opening': return <FinancialOpening {...p} />;
    case 'dp-select': return <DpSelect {...p} />;
    default: return null;
  }
}
