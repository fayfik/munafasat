/* Epic F · Bid evaluation (BEC). One pattern for every member (F6): vendor list → OTP → vendor
   evaluation page with only that role's inputs → e-sign (name, role, committee, Riyadh time) → next vendor.
   F1 Legal · F2 Technical (+ report) · F3 Procurement verification · F4 Finance ranking · F5 Chairman selection. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { EvalRole, Evaluation, Opening, OpeningVendor, Person, RfpDetail, Signature, Task, VendorSheet } from './types';
import { ActionHead } from './ActionHead';
import { Avatar } from './InboxTools';
import { Button } from '../components/ui';
import { toast } from '../components/Toast';
import { ArrowLeftIcon, CheckCircleIcon, CheckIcon, ChevronDownIcon, ChevronRightIcon, ChevronUpIcon, DocumentIcon, AlertTriangleIcon, SparklesIcon, XIcon, ClockIcon } from '../components/Icons';
import { Card, Pill } from './CommitteeSteps';
import { DOC_ITEMS, fmtSar, newOpening } from './committee';
import {
  BEC, LEGAL_CHECKS, LEGAL_REASONS, PREF_SOURCES, ROLE_LABEL, VARIANCE_FLAG, adjusted, emptyEval, evalVendors, fmtPct, isFlagged, needsWhy,
  prefPct, ranking, riyadh, roleOfStep, sheetMissing, sheetOf, sign, signed, techCriteria, techPassing, techTotal, variance, verifyRow,
} from './evaluation';

type T = (en: string, ar: string) => string;
export type EP = { task: Task; isAr: boolean; t: T; readOnly?: boolean; onRfp: (rfp: RfpDetail) => void; reopen?: (step: number, o: Opening, reason: string) => boolean };
const nm = (p: Person, isAr: boolean) => (isAr ? p.nameAr ?? p.name : p.name);
const L = (b: { en: string; ar: string }, isAr: boolean) => (isAr ? b.ar : b.en);

function useEval(task: Task, onRfp: EP['onRfp']) {
  const rfp = task.rfp!;
  const o: Opening = rfp.opening ?? newOpening('boc');
  const ev: Evaluation = o.eval ?? emptyEval();
  const setEval = (p: Partial<Evaluation>) => onRfp({ ...rfp, opening: { ...o, eval: { ...ev, ...p } } });
  const setSheet = (role: EvalRole, vid: string, p: Partial<VendorSheet>) =>
    setEval({ sheets: { ...ev.sheets, [role]: { ...(ev.sheets[role] ?? {}), [vid]: { ...(ev.sheets[role]?.[vid] ?? {}), ...p, touched: true } } } });
  const log = (en: string, ar: string, by: string) => [...(ev.log ?? []), { at: new Date().toISOString(), by, en, ar }];
  /** Void signed sheets (a return or a reopen) — the reason is kept on the sheet and in the case log. */
  const voided = (role: EvalRole, vids: string[], reason: string, by: string): Opening => {
    const sh = { ...(ev.sheets[role] ?? {}) };
    for (const v of vids) { const s = sh[v] ?? {}; sh[v] = { ...s, sig: undefined, voids: [...(s.voids ?? []), { at: new Date().toISOString(), by, reason }] }; }
    return { ...o, eval: { ...ev, sheets: { ...ev.sheets, [role]: sh }, log: log(`${ROLE_LABEL[role].en} signature voided (${vids.length}) — ${reason}`, `أُلغي توقيع ${ROLE_LABEL[role].ar} (${vids.length}) — ${reason}`, by) } };
  };
  return { rfp, o, ev, setEval, setSheet, voided, log };
}

/* ── small visual parts ──────────────────────────────────────────── */
const ShieldIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
);
const PenIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 21c3-1 5-3 7-5M14.5 4.5l5 5L10 19l-5 1 1-5 8.5-10.5z" /></svg>
);
const LockIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
);
const Initials = ({ name, tone = 'blue' }: { name: string; tone?: 'blue' | 'gray' }) => (
  <span className={`w-9 h-9 rounded-xl inline-flex items-center justify-center text-[12px] font-bold flex-shrink-0 ${tone === 'blue' ? 'bg-gradient-to-br from-[#EAF2FB] to-[#DCE7F7] text-[#21507A]' : 'bg-neutral-100 text-neutral-400'}`}>
    {name.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join('')}
  </span>
);
/** Ring gauge for a 0–100 score with the passing mark. */
function Gauge({ value, pass, size = 92 }: { value: number; pass: number; size?: number }) {
  const r = size / 2 - 7, c = 2 * Math.PI * r, ok = value >= pass;
  const a = (pass / 100) * 2 * Math.PI - Math.PI / 2;
  return (
    <svg width={size} height={size} className="flex-shrink-0" data-gauge={Math.round(value)}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#EEF0F3" strokeWidth={7} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={ok ? '#3F8F4E' : value ? '#D97706' : '#EEF0F3'} strokeWidth={7} fill="none" strokeLinecap="round"
        strokeDasharray={`${(Math.min(100, value) / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dasharray .5s ease' }} />
      <line x1={size / 2 + (r - 6) * Math.cos(a)} y1={size / 2 + (r - 6) * Math.sin(a)} x2={size / 2 + (r + 6) * Math.cos(a)} y2={size / 2 + (r + 6) * Math.sin(a)} stroke="#1F2937" strokeWidth={2} />
      <text x="50%" y="48%" textAnchor="middle" className="fill-neutral-900" style={{ font: '600 19px Inter, sans-serif' }}>{value ? value.toFixed(1) : '—'}</text>
      <text x="50%" y="66%" textAnchor="middle" className="fill-neutral-400" style={{ font: '500 10px Inter, sans-serif' }}>/ 100</text>
    </svg>
  );
}
/** The e-signature stamp: name, role, committee, date and time (Riyadh). */
export function Stamp({ sig, isAr, t, compact }: { sig: Signature; isAr: boolean; t: T; compact?: boolean }) {
  if (compact) return <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-success-700" title={`${sig.by.name} · ${riyadh(sig.at)}`} data-stamp-mini><PenIcon className="w-3.5 h-3.5" />{riyadh(sig.at, isAr)}</span>;
  return (
    <div className="relative rounded-xl border-2 border-dashed border-success-300 bg-success-50/40 px-4 py-3 stamp-in" data-stamp>
      <div className="flex items-center gap-2 text-success-700"><PenIcon /><span className="text-[11px] font-bold uppercase tracking-wider">{t('Electronically signed', 'موقّع إلكترونياً')}</span><ShieldIcon className="w-4 h-4 ms-auto" /></div>
      <p className="mt-1.5 text-[15px] font-semibold text-neutral-900" style={{ fontFamily: '"Brush Script MT", "Segoe Script", cursive' }}>{nm(sig.by, isAr)}</p>
      <p className="text-[12px] text-neutral-600">{L(sig.role, isAr)} · {L(sig.committee, isAr)}</p>
      <p className="mt-1 text-[11.5px] text-neutral-500 tabular-nums" dir="ltr">{riyadh(sig.at)} · {t('Riyadh', 'الرياض')}</p>
    </div>
  );
}
const statusOf = (s: VendorSheet) => (s.sig ? 'signed' : s.touched ? 'progress' : 'new');
const StatusPill = ({ s, t }: { s: VendorSheet; t: T }) => {
  const k = statusOf(s);
  return k === 'signed' ? <Pill tone="green" attr={{ 'data-sheet-status': 'signed' }}><PenIcon className="w-3 h-3" />{t('Signed', 'موقّع')}</Pill>
    : k === 'progress' ? <Pill tone="blue" attr={{ 'data-sheet-status': 'progress' }}>{t('In progress', 'قيد التقييم')}</Pill>
    : <Pill tone="gray" attr={{ 'data-sheet-status': 'new' }}>{t('Not started', 'لم يبدأ')}</Pill>;
};
const Modal = ({ children, onClose, label, wide }: { children: ReactNode; onClose: () => void; label: string; wide?: boolean }) => createPortal(
  <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-[2px] fade-in" onClick={onClose}>
    <div role="dialog" aria-label={label} className={`w-full ${wide ? 'max-w-lg' : 'max-w-sm'} rounded-2xl bg-white shadow-2xl rise-in`} onClick={(e) => e.stopPropagation()}>{children}</div>
  </div>, document.body);

/* ── F6.2 · One-time code (emulated) ─────────────────────────────── */
function OtpDialog({ person, vendor, isAr, t, onOk, onClose }: { person: Person; vendor: OpeningVendor; isAr: boolean; t: T; onOk: () => void; onClose: () => void }) {
  const [code] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [tries, setTries] = useState(0);
  const [err, setErr] = useState(false);
  const [left, setLeft] = useState(60);
  const [ok, setOk] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const locked = tries >= 3;
  const phone = `+966 5• ••• ${String(person.id.length * 37 + 1000).slice(-4)}`;
  useEffect(() => { const id = window.setInterval(() => setLeft((x) => Math.max(0, x - 1)), 1000); return () => window.clearInterval(id); }, []);
  useEffect(() => { refs.current[0]?.focus(); }, []);
  const check = (ds: string[]) => {
    if (ds.join('') === code) { setOk(true); window.setTimeout(onOk, 550); }
    else { setTries((n) => n + 1); setErr(true); window.setTimeout(() => { setErr(false); setDigits(Array(6).fill('')); refs.current[0]?.focus(); }, 450); }
  };
  const put = (i: number, v: string) => {
    const clean = v.replace(/\D/g, '');
    if (clean.length > 1) { const ds = clean.slice(0, 6).split(''); while (ds.length < 6) ds.push(''); setDigits(ds); if (ds.every(Boolean)) check(ds); return; }
    const ds = [...digits]; ds[i] = clean; setDigits(ds);
    if (clean && i < 5) refs.current[i + 1]?.focus();
    if (ds.every(Boolean)) check(ds);
  };
  return (
    <Modal onClose={onClose} label={t('Verify it’s you', 'تحقق من هويتك')}>
      <div className="p-6" data-otp>
        <div className="flex items-start justify-between">
          <span className={`w-11 h-11 rounded-2xl inline-flex items-center justify-center ${ok ? 'bg-success-50 text-success-600' : locked ? 'bg-error-50 text-error-600' : 'bg-[#EEF1FA] text-[#2A3466]'} transition-colors`}>{ok ? <CheckIcon className="w-5 h-5" /> : <ShieldIcon />}</span>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-neutral-400 hover:bg-neutral-100"><XIcon className="w-4 h-4" /></button>
        </div>
        <h3 className="mt-4 text-[16px] font-semibold text-neutral-900">{locked ? t('Too many attempts', 'محاولات كثيرة') : t('Verify to open this offer', 'تحقق لفتح هذا العرض')}</h3>
        <p className="mt-1 text-[12.5px] text-neutral-500">{locked
          ? t('Access to offers is locked for 15 minutes. Your administrator has been notified.', 'تم قفل الوصول إلى العروض لمدة 15 دقيقة وتم إشعار المسؤول.')
          : <>{t('Enter the 6-digit code sent to', 'أدخل الرمز المكوّن من 6 أرقام المرسل إلى')} <span className="font-semibold text-neutral-700 tabular-nums" dir="ltr">{phone}</span> {t('to open', 'لفتح')} <span className="font-semibold text-neutral-700">{vendor.name}</span>.</>}</p>
        {!locked && (
          <>
            <div className={`mt-5 flex justify-between gap-2 ${err ? 'shake' : ''}`} dir="ltr">
              {digits.map((d, i) => (
                <input key={i} ref={(el) => { refs.current[i] = el; }} value={d} inputMode="numeric" maxLength={6} aria-label={`Digit ${i + 1}`} data-otp-digit={i}
                  onChange={(e) => put(i, e.target.value)} onKeyDown={(e) => { if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus(); }}
                  className={`w-11 h-12 text-center text-[20px] font-semibold rounded-xl border-2 tabular-nums focus:outline-none transition-colors ${ok ? 'border-success-400 bg-success-50' : err ? 'border-error-400 bg-error-50' : d ? 'border-brand-400' : 'border-neutral-200 focus:border-brand-500'}`} />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[12px]">
              <span className={tries ? 'text-error-600 font-medium' : 'text-neutral-400'}>{tries ? t(`Wrong code · ${3 - tries} attempt${3 - tries > 1 ? 's' : ''} left`, `رمز خاطئ · ${3 - tries} محاولة متبقية`) : t('Valid for 5 minutes', 'صالح لمدة 5 دقائق')}</span>
              {left > 0 ? <span className="text-neutral-400 tabular-nums">{t(`Resend in ${left}s`, `إعادة الإرسال بعد ${left} ث`)}</span>
                : <button type="button" onClick={() => { setLeft(60); toast(t('A new code was sent', 'تم إرسال رمز جديد')); }} className="font-semibold text-brand-700" data-otp-resend>{t('Resend code', 'إعادة إرسال الرمز')}</button>}
            </div>
          </>
        )}
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-neutral-900 text-white px-3 py-2.5 text-[12px]" data-otp-demo={code}>
          <span className="px-1.5 py-0.5 rounded bg-white/15 text-[10px] font-bold uppercase tracking-wide">{t('Prototype SMS', 'رسالة تجريبية')}</span>
          <span className="whitespace-nowrap">{t('Code', 'الرمز')} <span className="font-semibold tracking-[0.12em] tabular-nums" dir="ltr">{code}</span></span>
          {!locked && <button type="button" onClick={() => put(0, code)} className="ms-auto text-[11.5px] font-semibold text-white/80 hover:text-white" data-otp-fill>{t('Fill', 'تعبئة')}</button>}
          {locked && <button type="button" onClick={() => setTries(0)} className="ms-auto text-[11.5px] font-semibold text-white/80 hover:text-white">{t('Unlock', 'فتح')}</button>}
        </div>
        <p className="mt-3 text-[11px] text-neutral-400 text-center">{isAr ? 'يُطلب الرمز في كل مرة يُفتح فيها عرض.' : 'A code is asked every time an offer is opened.'}</p>
      </div>
    </Modal>
  );
}

/* ── F2.1 · Technical inputs ─────────────────────────────────────── */
function TechInputs({ s, rfp, isAr, t, ro, set }: { s: VendorSheet; rfp: RfpDetail; isAr: boolean; t: T; ro: boolean; set: (p: Partial<VendorSheet>) => void }) {
  const cs = techCriteria(rfp); const total = techTotal(s, rfp); const pass = techPassing(rfp);
  const setScore = (k: string, p: { score?: number; why?: string }) => set({ scores: { ...(s.scores ?? {}), [k]: { ...(s.scores?.[k] ?? {}), ...p } } });
  return (
    <div className="space-y-4" data-tech-inputs>
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 flex items-center gap-5">
        <Gauge value={total} pass={pass} />
        <div className="min-w-0">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">{t('Weighted technical score', 'الدرجة الفنية الموزونة')}</p>
          <p className="mt-1 text-[13px] text-neutral-700">{t(`Passing mark ${pass}% — from the approved request`, `درجة النجاح ${pass}% — من الطلب المعتمد`)}</p>
          <p className="mt-2">{Object.keys(s.scores ?? {}).length === 0 ? <Pill tone="gray">{t('Not scored yet', 'لم يُقيّم بعد')}</Pill>
            : cs.some((c) => s.scores?.[c.key]?.score == null) ? <Pill tone="blue">{t(`${cs.filter((c) => s.scores?.[c.key]?.score != null).length} of ${cs.length} criteria scored`, `${cs.filter((c) => s.scores?.[c.key]?.score != null).length} من ${cs.length} معايير`)}</Pill>
            : total >= pass ? <Pill tone="green" attr={{ 'data-tech-verdict': 'pass' }}>{t('Passes', 'مجتاز')}</Pill> : <Pill tone="amber" attr={{ 'data-tech-verdict': 'fail' }}>{t(`Below passing by ${(pass - total).toFixed(1)}`, `أقل من النجاح بـ ${(pass - total).toFixed(1)}`)}</Pill>}</p>
        </div>
      </section>
      <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between"><h4 className="text-[13.5px] font-semibold text-neutral-900">{t('Criteria', 'المعايير')}</h4><span className="text-[11.5px] text-neutral-400">{t('Score 0–100 · justify below 60 or 90+', 'الدرجة 0–100 · برّر أقل من 60 أو 90 فأعلى')}</span></div>
        <ul className="divide-y divide-neutral-100">
          {cs.map((c) => {
            const sc = s.scores?.[c.key]; const v = sc?.score; const req = needsWhy(v);
            return (
              <li key={c.key} className="px-5 py-4" data-criterion={c.key}>
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-neutral-900">{isAr ? c.ar : c.en} <span className="ms-1 px-1.5 py-px rounded bg-neutral-100 text-neutral-600 text-[11px] font-semibold align-[1px]">{c.weight}%</span></p>
                    {(c.descEn || c.descAr) && <p className="mt-0.5 text-[12px] text-neutral-500">{isAr ? c.descAr : c.descEn}</p>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <input type="range" min={0} max={100} step={5} disabled={ro} value={v ?? 0} onChange={(e) => setScore(c.key, { score: Number(e.target.value) })} className="w-32 accent-brand-600" aria-label={`${c.en} slider`} />
                    <input type="number" min={0} max={100} disabled={ro} value={v ?? ''} placeholder="—" onChange={(e) => setScore(c.key, { score: e.target.value === '' ? undefined : Math.max(0, Math.min(100, Number(e.target.value))) })}
                      className="w-16 text-center text-[14px] font-semibold rounded-lg border border-neutral-200 py-1.5 tabular-nums focus:outline-none focus:border-brand-400 disabled:bg-neutral-50" data-score={c.key} />
                    <span className="w-14 text-end text-[12px] text-neutral-500 tabular-nums">{v != null ? `${((v * c.weight) / 100).toFixed(1)} pts` : ''}</span>
                  </div>
                </div>
                <input disabled={ro} value={sc?.why ?? ''} onChange={(e) => setScore(c.key, { why: e.target.value })} data-why={c.key}
                  placeholder={req ? t('Justification required for this score', 'التبرير مطلوب لهذه الدرجة') : t('Justification (optional)', 'التبرير (اختياري)')}
                  className={`mt-2.5 w-full text-[12.5px] rounded-lg border px-3 py-2 focus:outline-none focus:border-brand-400 disabled:bg-neutral-50 ${req && !sc?.why?.trim() ? 'border-warning-300 bg-warning-50/40' : 'border-neutral-200'}`} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/* ── F1 · Legal inputs ───────────────────────────────────────────── */
function LegalInputs({ s, v, isAr, t, ro, set, onReturnItems }: { s: VendorSheet; v: OpeningVendor; isAr: boolean; t: T; ro: boolean; set: (p: Partial<VendorSheet>) => void; onReturnItems: (ids: string[]) => void }) {
  const missing = LEGAL_CHECKS.filter((c) => s.checks?.[c.id] === 'missing');
  const fromOpening = () => set({ checks: Object.fromEntries(LEGAL_CHECKS.map((c) => [c.id, v.docs[c.doc] === 'valid' ? 'pass' : 'missing'])) as VendorSheet['checks'] });
  return (
    <div className="space-y-4" data-legal-inputs>
      <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between gap-3">
          <h4 className="text-[13.5px] font-semibold text-neutral-900">{t('Document checklist', 'قائمة المستندات')}</h4>
          {!ro && <button type="button" onClick={fromOpening} className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700" data-legal-prefill><SparklesIcon className="w-3.5 h-3.5" />{t('Take from opening checklist', 'من قائمة الفتح')}</button>}
        </div>
        <ul className="divide-y divide-neutral-100">
          {LEGAL_CHECKS.map((c) => {
            const op = v.docs[c.doc]; const val = s.checks?.[c.id];
            return (
              <li key={c.id} className="flex items-center gap-3 px-5 py-3" data-legal-check={c.id}>
                <span className={`w-2 h-2 rounded-full ${val === 'pass' ? 'bg-success-500' : val === 'missing' ? 'bg-error-500' : 'bg-neutral-200'}`} />
                <span className="flex-1 text-[13px] text-neutral-800">{isAr ? c.ar : c.en}</span>
                <span className="text-[11.5px] text-neutral-400">{t('At opening', 'عند الفتح')}: <span className={op === 'valid' ? 'text-success-700' : op ? 'text-warning-700' : ''}>{op ? (DOC_STATUS_LABEL[op][isAr ? 1 : 0]) : '—'}</span></span>
                <div className="inline-flex gap-1">
                  {(['pass', 'missing'] as const).map((k) => (
                    <button key={k} type="button" disabled={ro} onClick={() => set({ checks: { ...(s.checks ?? {}), [c.id]: k } })} data-legal-set={k} aria-pressed={val === k}
                      className={`h-7 px-2.5 rounded-md text-[12px] font-semibold ring-1 transition-all ${val === k ? (k === 'pass' ? 'bg-success-50 text-success-700 ring-success-300' : 'bg-error-50 text-error-700 ring-error-300') : 'ring-transparent text-neutral-500 hover:bg-neutral-100'}`}>{k === 'pass' ? t('Pass', 'سليم') : t('Missing', 'ناقص')}</button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
        {missing.length > 0 && (
          <div className="px-5 py-3 bg-error-50/50 border-t border-error-100 flex items-center gap-3" data-legal-missing>
            <AlertTriangleIcon className="w-4 h-4 text-error-600" />
            <span className="flex-1 text-[12.5px] text-error-800">{s.returnedItems?.length ? t(`Returned to the Secretary: ${s.returnedItems.length} item(s)`, `أُعيدت إلى الأمين: ${s.returnedItems.length}`) : t(`${missing.length} missing — ask the Secretary to obtain them`, `${missing.length} ناقصة — اطلبها من الأمين`)}</span>
            {!ro && !s.returnedItems?.length && <Button size="sm" variant="secondary" onClick={() => onReturnItems(missing.map((m) => m.id))} data-legal-return>{t('Return to Secretary', 'إعادة إلى الأمين')}</Button>}
          </div>
        )}
      </section>
      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h4 className="text-[13.5px] font-semibold text-neutral-900">{t('Legal compliance', 'المطابقة النظامية')}</h4>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {([[true, t('Compliant', 'مطابق'), t('Goes on to financial ranking', 'ينتقل إلى الترتيب المالي')], [false, t('Not compliant', 'غير مطابق'), t('Excluded from ranking', 'يُستبعد من الترتيب')]] as const).map(([k, l, d]) => (
            <button key={String(k)} type="button" disabled={ro} onClick={() => set({ compliant: k, ...(k ? { reasonCode: undefined } : {}) })} data-compliant={k ? 'yes' : 'no'} aria-pressed={s.compliant === k}
              className={`text-start rounded-xl border-2 px-4 py-3 transition-all ${s.compliant === k ? (k ? 'border-success-400 bg-success-50/60' : 'border-error-300 bg-error-50/60') : 'border-neutral-200 hover:border-neutral-300'}`}>
              <span className="flex items-center gap-2 text-[13.5px] font-semibold text-neutral-900">{k ? <CheckCircleIcon className="w-4 h-4 text-success-600" /> : <XIcon className="w-4 h-4 text-error-600" />}{l}</span>
              <span className="block mt-0.5 text-[12px] text-neutral-500">{d}</span>
            </button>
          ))}
        </div>
        {s.compliant === false && (
          <div className="mt-4 fade-in">
            <p className="text-[12px] font-semibold text-neutral-600">{t('Reason code', 'رمز السبب')}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {LEGAL_REASONS.map((r) => (
                <button key={r.code} type="button" disabled={ro} onClick={() => set({ reasonCode: r.code })} data-reason-code={r.code}
                  className={`h-8 px-3 rounded-full text-[12.5px] border transition-colors ${s.reasonCode === r.code ? 'border-error-400 bg-error-50 text-error-800 font-semibold' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}><span className="tabular-nums font-semibold me-1">{r.code}</span>{isAr ? r.ar : r.en}</button>
              ))}
            </div>
          </div>
        )}
        <textarea rows={2} disabled={ro} value={s.comment ?? ''} onChange={(e) => set({ comment: e.target.value })} placeholder={t('Comment (optional)', 'تعليق (اختياري)')} className="mt-4 w-full text-[13px] rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:border-brand-400 disabled:bg-neutral-50" />
      </section>
    </div>
  );
}
const DOC_STATUS_LABEL: Record<string, [string, string]> = { valid: ['Valid', 'سارٍ'], expired: ['Expired', 'منتهٍ'], missing: ['Missing', 'غير مرفق'] };

/* ── F4 · Finance inputs ─────────────────────────────────────────── */
function FinInputs({ s, v, estimate, isAr, t, ro, set }: { s: VendorSheet; v: OpeningVendor; estimate?: number; isAr: boolean; t: T; ro: boolean; set: (p: Partial<VendorSheet>) => void }) {
  const price = s.evalPrice ?? v.price; const varc = variance(price, estimate); const flag = isFlagged(price, estimate);
  const pos = varc == null ? 50 : Math.max(2, Math.min(98, 50 + varc * 125)); // ±40% across the track
  const Kpi = ({ k, v: val, tone }: { k: string; v: ReactNode; tone?: string }) => <div className="rounded-xl bg-neutral-50 px-4 py-3"><p className="text-[11px] text-neutral-500">{k}</p><p className={`mt-0.5 text-[15px] font-semibold tabular-nums ${tone ?? 'text-neutral-900'}`} dir="ltr">{val}</p></div>;
  const sel = (val: string | undefined, onChange: (x: string) => void, attr: string) => (
    <select disabled={ro} value={val ?? ''} onChange={(e) => onChange(e.target.value)} data-src={attr} className="text-[12.5px] rounded-lg border border-neutral-200 px-2.5 py-1.5 bg-white focus:outline-none focus:border-brand-400 disabled:bg-neutral-50">
      <option value="">{t('Source…', 'المصدر…')}</option>{PREF_SOURCES.map((p) => <option key={p.en} value={p.en}>{isAr ? p.ar : p.en}</option>)}
    </select>
  );
  return (
    <div className="space-y-4" data-fin-inputs>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi k={t('Opened price', 'السعر عند الفتح')} v={fmtSar(v.price)} />
        <Kpi k={t('Estimated value', 'القيمة التقديرية')} v={fmtSar(estimate)} />
        <Kpi k={t('Variance', 'الفرق')} v={fmtPct(varc)} tone={flag ? 'text-error-700' : 'text-neutral-900'} />
        <Kpi k={t('Adjusted for ranking', 'السعر بعد التفضيل')} v={fmtSar(adjusted(s, v))} tone="text-brand-800" />
      </section>
      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h4 className="text-[13.5px] font-semibold text-neutral-900">{t('Evaluated price', 'السعر المقيّم')}</h4>
            <p className="text-[12px] text-neutral-500">{t('After arithmetic corrections; defaults to the opened price.', 'بعد التصحيحات الحسابية؛ الافتراضي هو سعر الفتح.')}</p>
          </div>
          <input type="number" min={0} disabled={ro} dir="ltr" value={s.evalPrice ?? ''} placeholder={String(v.price ?? '')} onChange={(e) => set({ evalPrice: Number(e.target.value) || undefined })} data-eval-price
            className="w-48 text-end text-[16px] font-semibold rounded-lg border border-neutral-200 px-3 py-2 tabular-nums focus:outline-none focus:border-brand-400 disabled:bg-neutral-50" />
        </div>
        <div className="mt-5" data-variance={varc == null ? '' : varc.toFixed(3)}>
          <div className="relative h-2 rounded-full bg-gradient-to-r from-error-200 via-success-200 to-error-200">
            <span className="absolute inset-y-0 rounded-full bg-success-300/70" style={{ left: `${50 - VARIANCE_FLAG * 125}%`, right: `${50 - VARIANCE_FLAG * 125}%` }} />
            <span className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white ring-2 ring-neutral-800 shadow transition-all duration-500" style={{ left: `calc(${pos}% - 7px)` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[10.5px] text-neutral-400 tabular-nums" dir="ltr"><span>−40%</span><span>−20%</span><span>{t('estimate', 'التقدير')}</span><span>+20%</span><span>+40%</span></div>
        </div>
        {flag && (
          <div className="mt-4 rounded-xl border border-error-200 bg-error-50/60 p-3 fade-in" data-flag>
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-error-800"><AlertTriangleIcon className="w-4 h-4" />{varc! < 0 ? t('Abnormally low price', 'سعر منخفض بشكل غير طبيعي') : t('Abnormally high price', 'سعر مرتفع بشكل غير طبيعي')} · {fmtPct(varc)}</p>
            <textarea rows={2} disabled={ro} value={s.flagNote ?? ''} onChange={(e) => set({ flagNote: e.target.value })} placeholder={t('Comment required — why is this acceptable?', 'تعليق مطلوب — لماذا يعتبر مقبولاً؟')} data-flag-note className="mt-2 w-full text-[13px] rounded-lg border border-error-200 bg-white px-3 py-2 focus:outline-none focus:border-brand-400" />
          </div>
        )}
      </section>
      <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between"><h4 className="text-[13.5px] font-semibold text-neutral-900">{t('Preferences', 'التفضيلات')}</h4><span className="text-[12px] font-semibold text-brand-700 tabular-nums" data-pref>−{(prefPct(s) * 100).toFixed(1)}% {t('applied', 'مطبق')}</span></div>
        <div className="divide-y divide-neutral-100">
          <div className="px-5 py-3 flex items-center gap-3 flex-wrap">
            <span className="flex-1 min-w-[180px]"><span className="block text-[13px] text-neutral-800">{t('Local content', 'المحتوى المحلي')}</span><span className="block text-[11.5px] text-neutral-500">{t('Up to 10% — LC% × 10%', 'حتى 10% — نسبة المحتوى × 10%')}</span></span>
            <span className="inline-flex items-center gap-1"><input type="number" min={0} max={100} disabled={ro} value={s.localContent ?? ''} placeholder="0" onChange={(e) => set({ localContent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) || undefined })} data-lc className="w-16 text-center text-[13px] rounded-lg border border-neutral-200 py-1.5 tabular-nums focus:outline-none focus:border-brand-400 disabled:bg-neutral-50" /><span className="text-[12px] text-neutral-500">%</span></span>
            {sel(s.lcSource, (x) => set({ lcSource: x || undefined }), 'lc')}
          </div>
          <div className="px-5 py-3 flex items-center gap-3 flex-wrap">
            <span className="flex-1 min-w-[180px]"><span className="block text-[13px] text-neutral-800">{t('Local SME', 'منشأة صغيرة أو متوسطة محلية')}</span><span className="block text-[11.5px] text-neutral-500">{t('10% price preference', 'تفضيل سعري 10%')}</span></span>
            <label className="inline-flex items-center gap-2 text-[12.5px] text-neutral-700 cursor-pointer"><input type="checkbox" className="accent-brand-600" disabled={ro} checked={!!s.sme} onChange={(e) => set({ sme: e.target.checked, ...(e.target.checked ? {} : { smeSource: undefined }) })} data-sme />{t('Eligible', 'مؤهلة')}</label>
            {s.sme && sel(s.smeSource, (x) => set({ smeSource: x || undefined }), 'sme')}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── F6.3 · Vendor evaluation page (full page) ───────────────────── */
function EvalPage({ role, vid, p, onClose, onNext }: { role: EvalRole; vid: string; p: EP; onClose: () => void; onNext: (from: string) => void }) {
  const { task, isAr, t, readOnly } = p;
  const { rfp, o, setSheet, setEval, ev, log } = useEval(task, p.onRfp);
  const vs = evalVendors(o, role);
  const idx = vs.findIndex((x) => x.id === vid); const v = vs[idx];
  const s = sheetOf(o, role, vid);
  const ro = !!readOnly || !!s.sig;
  const miss = v ? sheetMissing(role, s, rfp, v, task.amount) : [];
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !confirm) onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose, confirm]);
  if (!v) return null;
  const set = (x: Partial<VendorSheet>) => setSheet(role, vid, x);
  const doSign = () => {
    const sig = sign(task.assignee, ROLE_LABEL[role]);
    const base = role === 'finance' && s.evalPrice == null ? { evalPrice: v.price } : {};
    setEval({ sheets: { ...ev.sheets, [role]: { ...(ev.sheets[role] ?? {}), [vid]: { ...s, ...base, touched: true, sig } } }, log: log(`${v.name} signed by ${task.assignee.name} (${ROLE_LABEL[role].en})`, `وقّع ${task.assignee.nameAr ?? task.assignee.name} على ${v.name} (${ROLE_LABEL[role].ar})`, task.assignee.name) });
    setConfirm(false); toast(t(`${v.name} signed`, `تم توقيع ${v.name}`)); onNext(vid);
  };
  const lastVoid = s.voids?.[s.voids.length - 1];
  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#F6F7F9] flex flex-col fade-in" data-eval-page={role} data-eval-vendor={vid}>
      <header className="h-16 flex-shrink-0 bg-white border-b border-neutral-200 flex items-center gap-4 px-5">
        <button type="button" onClick={onClose} data-eval-back className="inline-flex items-center gap-1.5 h-9 ps-2.5 pe-3 rounded-full border border-neutral-200 text-[12.5px] font-semibold text-neutral-700 hover:bg-neutral-50"><ArrowLeftIcon className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />{t('Back to vendors', 'العودة إلى الموردين')}</button>
        <div className="min-w-0">
          <p className="text-[11.5px] text-neutral-500">{L(ROLE_LABEL[role], isAr)} · {t(`Vendor ${idx + 1} of ${vs.length}`, `المورد ${idx + 1} من ${vs.length}`)}</p>
          <h2 className="text-[16px] font-semibold text-neutral-900 truncate">{v.name}</h2>
        </div>
        <div className="hidden md:flex items-center gap-1.5 ms-4" aria-label="vendors">
          {vs.map((x, i) => { const st = statusOf(sheetOf(o, role, x.id)); return <span key={x.id} title={x.name} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-8' : 'w-4'} ${st === 'signed' ? 'bg-success-500' : st === 'progress' ? 'bg-brand-400' : 'bg-neutral-200'}`} />; })}
        </div>
        <span className="ms-auto flex items-center gap-2">
          {!ro && <Button variant="primary" disabled={miss.length > 0} onClick={() => setConfirm(true)} data-sign><PenIcon />{idx < vs.length - 1 ? t('Sign and next vendor', 'وقّع وانتقل للتالي') : t('Sign', 'وقّع')}</Button>}
          {!ro && <Button variant="secondary" onClick={() => { set({}); toast(t('Draft saved', 'تم حفظ المسودة')); }} data-save-draft>{t('Save draft', 'حفظ كمسودة')}</Button>}
          {ro && s.sig && <Pill tone="green"><LockIcon className="w-3 h-3" />{t('Signed · read-only', 'موقّع · للقراءة فقط')}</Pill>}
        </span>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto" key={vid}>
        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 rise-in">
          <main className="min-w-0 space-y-4">
            {lastVoid && !s.sig && (
              <div className="flex items-start gap-2.5 rounded-xl border border-warning-200 bg-warning-50/70 px-4 py-3 text-[12.5px] text-warning-900" data-voided>
                <AlertTriangleIcon className="w-4 h-4 mt-0.5 text-warning-600" /><span><span className="font-semibold">{t('Your earlier signature was voided', 'أُلغي توقيعك السابق')}</span> · {lastVoid.reason} · <span className="text-warning-700">{lastVoid.by}, {riyadh(lastVoid.at, isAr)}</span></span>
              </div>
            )}
            {role === 'technical' && <TechInputs s={s} rfp={rfp} isAr={isAr} t={t} ro={ro} set={set} />}
            {role === 'legal' && <LegalInputs s={s} v={v} isAr={isAr} t={t} ro={ro} set={set} onReturnItems={(ids) => { set({ returnedItems: ids }); toast(t('Missing documents returned to the Secretary', 'أُعيدت المستندات الناقصة إلى الأمين')); }} />}
            {role === 'finance' && <FinInputs s={s} v={v} estimate={task.amount} isAr={isAr} t={t} ro={ro} set={set} />}
          </main>
          <aside className="space-y-4">
            {s.sig ? <Stamp sig={s.sig} isAr={isAr} t={t} /> : (
              <section className="rounded-2xl border border-neutral-200 bg-white p-4" data-eval-missing>
                <p className="text-[12px] font-semibold text-neutral-600">{miss.length ? t('Before you sign', 'قبل التوقيع') : t('Ready to sign', 'جاهز للتوقيع')}</p>
                {miss.length ? <ul className="mt-2 space-y-1.5">{miss.map((m) => <li key={m.en} className="flex items-start gap-2 text-[12.5px] text-neutral-700"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-warning-500 flex-shrink-0" />{L(m, isAr)}</li>)}</ul>
                  : <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-success-700"><CheckCircleIcon className="w-4 h-4" />{t('Everything required is filled in.', 'تم استكمال كل المطلوب.')}</p>}
              </section>
            )}
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3">
              <p className="text-[12px] font-semibold text-neutral-600">{t('Offer', 'العرض')}</p>
              <div className="flex items-center gap-3"><Initials name={v.name} /><span className="min-w-0"><span className="block text-[13px] font-semibold text-neutral-900 truncate">{v.name}</span><span className="block text-[11.5px] text-neutral-500 tabular-nums" dir="ltr">CR {v.cr}</span></span></div>
              <dl className="text-[12.5px] space-y-1.5">
                <div className="flex justify-between"><dt className="text-neutral-500">{t('Opening documents', 'مستندات الفتح')}</dt><dd className="font-medium text-neutral-800 tabular-nums">{DOC_ITEMS.filter((d) => d.required && v.docs[d.id] === 'valid').length}/{DOC_ITEMS.filter((d) => d.required).length} {t('valid', 'سارية')}</dd></div>
                <div className="flex justify-between"><dt className="text-neutral-500">{t('Price', 'السعر')}</dt><dd className="font-medium text-neutral-800 tabular-nums" dir="ltr">{role === 'technical' && !o.financial?.momAt ? <span className="text-ai-700">🔒 {t('Sealed', 'مختوم')}</span> : fmtSar(v.price)}</dd></div>
                {role !== 'technical' && <div className="flex justify-between"><dt className="text-neutral-500">{t('Technical score', 'الدرجة الفنية')}</dt><dd className="font-medium text-neutral-800 tabular-nums">{techTotal(sheetOf(o, 'technical', v.id), rfp).toFixed(1)}</dd></div>}
                {role === 'finance' && <div className="flex justify-between"><dt className="text-neutral-500">{t('Legal', 'القانوني')}</dt><dd className="font-medium text-success-700">{t('Compliant', 'مطابق')}</dd></div>}
              </dl>
              {o.source?.fileName && <p className="flex items-center gap-1.5 text-[11.5px] text-neutral-500 border-t border-neutral-100 pt-3"><DocumentIcon className="w-3.5 h-3.5" /><span className="truncate" dir="ltr">{o.source.fileName}</span></p>}
            </section>
            {!!s.voids?.length && (
              <section className="rounded-2xl border border-neutral-200 bg-white p-4"><p className="text-[12px] font-semibold text-neutral-600">{t('Signature history', 'سجل التوقيع')}</p>
                <ul className="mt-2 space-y-1.5 text-[12px] text-neutral-600">{s.voids.map((x, i) => <li key={i} className="flex gap-2"><XIcon className="w-3.5 h-3.5 text-warning-600 mt-0.5" /><span>{t('Voided', 'أُلغي')} · {x.reason} <span className="text-neutral-400">· {riyadh(x.at, isAr)}</span></span></li>)}</ul></section>
            )}
          </aside>
        </div>
      </div>
      {confirm && (
        <Modal onClose={() => setConfirm(false)} label={t('Sign evaluation', 'توقيع التقييم')}>
          <div className="p-6" data-sign-confirm>
            <h3 className="text-[16px] font-semibold text-neutral-900">{t(`Sign your evaluation of ${v.name}?`, `توقيع تقييمك لـ ${v.name}؟`)}</h3>
            <p className="mt-1 text-[12.5px] text-neutral-500">{t('The sheet becomes read-only. Only a return or the Chairman can reopen it, and that voids the signature.', 'تصبح الورقة للقراءة فقط. لا يعيد فتحها إلا الإعادة أو الرئيس، ويُلغى التوقيع حينها.')}</p>
            <div className="mt-4"><Stamp sig={{ by: task.assignee, role: ROLE_LABEL[role], committee: BEC, at: new Date().toISOString() }} isAr={isAr} t={t} /></div>
            <div className="mt-5 flex justify-end gap-2"><Button variant="primary" onClick={doSign} data-sign-ok><PenIcon />{t('Sign', 'وقّع')}</Button><Button variant="ghost" onClick={() => setConfirm(false)}>{t('Cancel', 'إلغاء')}</Button></div>
          </div>
        </Modal>
      )}
    </div>, document.body);
}

/* ── F6.1 · Vendor list on the task (Technical / Legal / Finance) ── */
export function VendorEvalTask(p: EP) {
  const { task, isAr, t, readOnly } = p;
  const role = roleOfStep(task.committee)!;
  const { rfp, o, ev, setEval } = useEval(task, p.onRfp);
  const vs = evalVendors(o, role);
  const out = o.vendors.filter((v) => !vs.some((x) => x.id === v.id));
  const [otpFor, setOtpFor] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const n = vs.filter((v) => signed(sheetOf(o, role, v.id))).length;
  const nextUnsigned = (from?: string) => { const i = vs.findIndex((x) => x.id === from); return [...vs.slice(i + 1), ...vs.slice(0, i + 1)].find((x) => x.id !== from && !signed(sheetOf(o, role, x.id)))?.id; };
  const metric = (v: OpeningVendor) => {
    const s = sheetOf(o, role, v.id);
    if (role === 'technical') { const x = techTotal(s, rfp); return s.scores && Object.keys(s.scores).length ? <span className={`text-[13px] font-semibold tabular-nums ${x >= techPassing(rfp) ? 'text-success-700' : 'text-warning-700'}`}>{x.toFixed(1)}</span> : null; }
    if (role === 'legal') return s.compliant == null ? null : s.compliant ? <span className="text-[12px] font-semibold text-success-700">{t('Compliant', 'مطابق')}</span> : <span className="text-[12px] font-semibold text-error-700">{s.reasonCode ?? t('Not compliant', 'غير مطابق')}</span>;
    return s.touched || s.sig ? <span className="text-[13px] font-semibold tabular-nums text-neutral-800" dir="ltr">{fmtSar(adjusted(s, v))}</span> : null;
  };
  const desc = role === 'technical' ? t('Score each offer against the approved criteria and weights. Open a bidder, verify with the one-time code, score, sign, then move to the next.', 'قيّم كل عرض مقابل المعايير والأوزان المعتمدة. افتح المورد وتحقق بالرمز وقيّم ووقّع ثم انتقل للتالي.')
    : role === 'legal' ? t('Check each technically passing offer for legal compliance. Non-compliant offers are excluded from ranking.', 'تحقق من المطابقة النظامية لكل عرض مجتاز فنياً. تُستبعد العروض غير المطابقة من الترتيب.')
    : t('Enter each compliant offer’s evaluated price and preferences. The ranking is computed once every vendor is signed.', 'أدخل السعر المقيّم والتفضيلات لكل عرض مطابق. يُحسب الترتيب بعد توقيع كل الموردين.');
  return (
    <div className="space-y-4" data-vendor-eval={role}>
      <ActionHead title={role === 'technical' ? t('Score the technical offers', 'تقييم العروض الفنية') : role === 'legal' ? t('Check legal compliance', 'التحقق من المطابقة النظامية') : t('Evaluate prices and rank', 'تقييم الأسعار والترتيب')}
        desc={desc} progress={{ done: n, total: vs.length, label: t(`of ${vs.length} signed`, `من ${vs.length} موقّعة`), attrs: { 'data-signed-progress': `${n}/${vs.length}` } }}
        extra={!readOnly && n < vs.length ? <Button variant="primary" onClick={() => setOtpFor(nextUnsigned() ?? vs[0].id)} data-eval-start>{n ? t('Continue with next vendor', 'المتابعة مع المورد التالي') : t('Start with first vendor', 'ابدأ بالمورد الأول')}</Button> : undefined} />
      <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <ul className="divide-y divide-neutral-100 stagger">
          {vs.map((v, i) => { const s = sheetOf(o, role, v.id); return (
            <li key={v.id}>
              <button type="button" onClick={() => setOtpFor(v.id)} data-eval-vendor-row={v.id} className="w-full flex items-center gap-4 px-5 py-3.5 text-start hover:bg-neutral-50/80 transition-colors group">
                <span className="w-5 text-[12px] text-neutral-400 tabular-nums">{i + 1}</span>
                <Initials name={v.name} />
                <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold text-neutral-900 truncate">{v.name}</span>
                  <span className="block text-[11.5px] text-neutral-500">{s.sig ? <>{t('Signed', 'وُقّع')} {riyadh(s.sig.at, isAr)}</> : s.voids?.length ? <span className="text-warning-700">{t('Signature voided — re-sign', 'أُلغي التوقيع — أعد التوقيع')}</span> : <span className="tabular-nums" dir="ltr">CR {v.cr}</span>}</span></span>
                <span className="w-36 text-end">{metric(v)}</span>
                <span className="w-28 text-end"><StatusPill s={s} t={t} /></span>
                <ChevronRightIcon className={`w-4 h-4 text-neutral-300 group-hover:text-neutral-500 ${isAr ? 'rotate-180' : ''}`} />
              </button>
            </li>
          ); })}
        </ul>
        {out.length > 0 && (
          <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50/60 text-[12px] text-neutral-500 flex flex-wrap gap-x-4 gap-y-1" data-eval-out>
            <span className="font-semibold text-neutral-600">{t('Not in scope', 'خارج النطاق')}:</span>
            {out.map((v) => <span key={v.id}>{v.name} · {v.techPass === false ? t('failed technical', 'لم يجتز فنياً') : t('not compliant', 'غير مطابق')}</span>)}
          </div>
        )}
      </section>
      {role === 'finance' && <RankingCard p={p} />}
      {otpFor && <OtpDialog person={task.assignee} vendor={o.vendors.find((x) => x.id === otpFor)!} isAr={isAr} t={t} onClose={() => setOtpFor(null)} onOk={() => { setOpenId(otpFor); setOtpFor(null); }} />}
      {openId && <EvalPage role={role} vid={openId} p={p} onClose={() => setOpenId(null)} onNext={(from) => { const nx = nextUnsigned(from); setOpenId(null); if (nx) window.setTimeout(() => setOtpFor(nx), 250); }} />}
      {void ev}{void setEval}
    </div>
  );
}

/* ── F4.1 · Ranking (finance task) ───────────────────────────────── */
function RankingCard({ p }: { p: EP }) {
  const { task, isAr, t, readOnly } = p;
  const { o, ev, setEval } = useEval(task, p.onRfp);
  const rk = ranking(o);
  if (!rk.ready) return (
    <section className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-5 py-6 text-center" data-ranking="pending">
      <LockIcon className="w-5 h-5 mx-auto text-neutral-400" /><p className="mt-2 text-[13px] font-semibold text-neutral-700">{t('Ranking unlocks when every vendor is signed', 'يظهر الترتيب بعد توقيع كل الموردين')}</p>
      <p className="text-[12px] text-neutral-500">{t('Built only from signed sheets — adjusted price, lowest first.', 'يُبنى من الأوراق الموقعة فقط — السعر بعد التفضيل، الأقل أولاً.')}</p>
    </section>
  );
  const move = (i: number, d: -1 | 1) => { const ids = rk.ordered.map((x) => x.v.id); const j = i + d; if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; setEval({ rankOverride: { order: ids, reason: ev.rankOverride?.reason ?? '' } }); };
  return (
    <Card title={<span className="inline-flex items-center gap-2">{t('Financial ranking', 'الترتيب المالي')}{rk.overridden && <Pill tone="amber" attr={{ 'data-overridden': '' }}>{t('Manual order', 'ترتيب يدوي')}</Pill>}</span>} attr={{ 'data-ranking': 'ready' }} pad={false}
      aside={rk.overridden && !readOnly ? <Button size="sm" variant="ghost" onClick={() => setEval({ rankOverride: undefined })}>{t('Reset to computed', 'العودة للمحسوب')}</Button> : undefined}>
      <table className="w-full text-[13px]">
        <thead><tr className="text-[11.5px] text-neutral-500 bg-neutral-50"><th className="text-start font-medium px-5 py-2 w-14">#</th><th className="text-start font-medium px-3 py-2">{t('Vendor', 'المورد')}</th><th className="text-end font-medium px-3 py-2">{t('Evaluated', 'المقيّم')}</th><th className="text-end font-medium px-3 py-2">{t('Preference', 'التفضيل')}</th><th className="text-end font-medium px-3 py-2">{t('Adjusted', 'بعد التفضيل')}</th><th className="text-end font-medium px-3 py-2">{t('vs estimate', 'مقابل التقدير')}</th><th className="w-20" /></tr></thead>
        <tbody className="divide-y divide-neutral-100">
          {rk.ordered.map((x, i) => (
            <tr key={x.v.id} className={i === 0 ? 'bg-success-50/40' : ''} data-rank-row={i + 1} data-rank-vendor={x.v.id}>
              <td className="px-5 py-3"><span className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-[12px] font-bold ${i === 0 ? 'bg-success-600 text-white' : 'bg-neutral-100 text-neutral-600'}`}>{i + 1}</span></td>
              <td className="px-3 py-3 font-medium text-neutral-900">{x.v.name}{isFlagged(x.s.evalPrice ?? x.v.price, task.amount) && <AlertTriangleIcon className="inline w-3.5 h-3.5 ms-1.5 text-error-600" />}</td>
              <td className="px-3 py-3 text-end tabular-nums" dir="ltr">{fmtSar(x.s.evalPrice ?? x.v.price)}</td>
              <td className="px-3 py-3 text-end tabular-nums text-brand-700">−{(prefPct(x.s) * 100).toFixed(1)}%</td>
              <td className="px-3 py-3 text-end tabular-nums font-semibold" dir="ltr">{fmtSar(x.adj)}</td>
              <td className="px-3 py-3 text-end tabular-nums text-neutral-600">{fmtPct(variance(x.s.evalPrice ?? x.v.price, task.amount))}</td>
              <td className="px-3 py-3">{!readOnly && <span className="flex justify-end gap-0.5">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="p-1 rounded text-neutral-400 hover:bg-neutral-100 disabled:opacity-30" aria-label="Move up" data-rank-up={i + 1}><ChevronUpIcon className="w-4 h-4" /></button>
                <button type="button" disabled={i === rk.ordered.length - 1} onClick={() => move(i, 1)} className="p-1 rounded text-neutral-400 hover:bg-neutral-100 disabled:opacity-30" aria-label="Move down"><ChevronDownIcon className="w-4 h-4" /></button></span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rk.overridden && (
        <div className="px-5 py-3 border-t border-warning-100 bg-warning-50/50" data-override-reason>
          <input disabled={readOnly} value={ev.rankOverride?.reason ?? ''} onChange={(e) => setEval({ rankOverride: { ...ev.rankOverride!, reason: e.target.value } })} placeholder={t('Reason for changing the computed ranking (required)', 'سبب تعديل الترتيب المحسوب (مطلوب)')} className="w-full text-[13px] rounded-lg border border-warning-300 bg-white px-3 py-2 focus:outline-none focus:border-brand-400" />
        </div>
      )}
      {void isAr}
    </Card>
  );
}

/* ── Return dialog (void signatures, reopen a step) ──────────────── */
function ReturnDialog({ title, vendors, isAr, t, onClose, onSave, pickVendors = true }: { title: string; vendors: OpeningVendor[]; isAr: boolean; t: T; onClose: () => void; onSave: (ids: string[], reason: string) => void; pickVendors?: boolean }) {
  const [ids, setIds] = useState<string[]>(vendors.length === 1 ? [vendors[0].id] : []);
  const [reason, setReason] = useState('');
  return (
    <Modal onClose={onClose} label={title} wide>
      <div className="p-6" data-return-dialog>
        <h3 className="text-[16px] font-semibold text-neutral-900">{title}</h3>
        <p className="mt-1 text-[12.5px] text-neutral-500">{t('Signatures on the selected sheets are voided and the reason is logged.', 'تُلغى التواقيع على الأوراق المحددة ويُسجل السبب.')}</p>
        {pickVendors && <div className="mt-4 space-y-1.5">{vendors.map((v) => (
          <label key={v.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2 cursor-pointer ${ids.includes(v.id) ? 'border-brand-500 bg-brand-50/40' : 'border-neutral-200 hover:bg-neutral-50'}`} data-return-vendor={v.id}>
            <input type="checkbox" className="accent-brand-600" checked={ids.includes(v.id)} onChange={(e) => setIds(e.target.checked ? [...ids, v.id] : ids.filter((x) => x !== v.id))} /><span className="text-[13px] font-medium text-neutral-900">{v.name}</span>
          </label>))}</div>}
        <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('Reason (required)', 'السبب (مطلوب)')} className="mt-4 w-full text-[13px] rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:border-brand-400" data-return-reason />
        <div className="mt-5 flex justify-end gap-2"><Button variant="primary" disabled={(pickVendors && !ids.length) || !reason.trim()} onClick={() => onSave(ids, reason.trim())} data-return-ok>{t('Return', 'إعادة')}</Button><Button variant="ghost" onClick={onClose}>{t('Cancel', 'إلغاء')}</Button></div>
        {void isAr}
      </div>
    </Modal>
  );
}

/* ── F2.2 · Technical report (manager signs on approval) ─────────── */
export function TechReport(p: EP) {
  const { task, isAr, t, readOnly } = p;
  const { rfp, o, voided } = useEval(task, p.onRfp);
  const cs = techCriteria(rfp); const pass = techPassing(rfp);
  const vs = o.vendors;
  const rows = vs.map((v) => ({ v, s: sheetOf(o, 'technical', v.id) })).map((x) => ({ ...x, total: techTotal(x.s, rfp) })).sort((a, b) => b.total - a.total);
  const passing = rows.filter((x) => x.total >= pass).length;
  const [ret, setRet] = useState(false);
  const allSigned = rows.every((x) => signed(x.s));
  return (
    <div className="space-y-4" data-tech-report>
      <ActionHead title={t('Approve the technical evaluation report', 'اعتماد تقرير التقييم الفني')}
        desc={t('Generated from the Technical member’s signed vendor sheets. Approving signs the report and fixes the shortlist for the financial opening; a return voids the affected signatures.', 'يُنشأ من أوراق التقييم الموقعة للعضو الفني. الاعتماد يوقّع التقرير ويحدد القائمة المختصرة للفتح المالي؛ والإعادة تلغي التواقيع المعنية.')}
        extra={!readOnly ? <span className="flex gap-2"><Button variant="secondary" onClick={() => setRet(true)} data-report-return>{t('Return sheets', 'إعادة أوراق')}</Button><Button variant="ghost" onClick={() => toast(t('Technical report PDF generated (preview)', 'تم إنشاء ملف التقرير الفني (معاينة)'))}><DocumentIcon className="w-4 h-4" />{t('PDF', 'PDF')}</Button></span> : undefined} />
      <div className="grid grid-cols-3 gap-3">
        {[[t('Bidders evaluated', 'الموردون المقيّمون'), `${vs.length}`], [t('Pass the mark', 'اجتازوا درجة النجاح'), `${passing} / ${vs.length}`], [t('Passing mark', 'درجة النجاح'), `${pass}%`]].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-neutral-200 bg-white px-5 py-4"><p className="text-[11.5px] text-neutral-500">{k}</p><p className="mt-1 text-[22px] font-semibold text-neutral-900 tabular-nums">{v}</p></div>
        ))}
      </div>
      <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden" data-report-matrix>
        <div className="px-5 py-4 border-b border-neutral-100 bg-gradient-to-b from-neutral-50 to-white">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{t('Technical evaluation report', 'تقرير التقييم الفني')}</p>
          <h3 className="mt-0.5 text-[15px] font-semibold text-neutral-900">{isAr ? task.entity.titleAr : task.entity.titleEn} · <span dir="ltr">{rfp.etimad?.ref}</span></h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead><tr className="text-[11px] text-neutral-500 bg-neutral-50/60">
              <th className="text-start font-medium px-5 py-2">{t('Vendor', 'المورد')}</th>
              {cs.map((c) => <th key={c.key} className="text-center font-medium px-2 py-2 max-w-[110px]" title={isAr ? c.ar : c.en}><span className="block truncate">{(isAr ? c.ar : c.en).split(/[ &]/)[0]}</span><span className="text-neutral-400">{c.weight}%</span></th>)}
              <th className="text-center font-medium px-3 py-2">{t('Total', 'المجموع')}</th><th className="text-center font-medium px-3 py-2">{t('Result', 'النتيجة')}</th><th className="text-start font-medium px-3 py-2">{t('Signature', 'التوقيع')}</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((x) => (
                <tr key={x.v.id} data-report-row={x.v.id}>
                  <td className="px-5 py-3 font-medium text-neutral-900 whitespace-nowrap">{x.v.name}</td>
                  {cs.map((c) => { const sc = x.s.scores?.[c.key]?.score; return <td key={c.key} className="px-2 py-3 text-center tabular-nums" title={x.s.scores?.[c.key]?.why}><span className={`inline-block min-w-[34px] rounded-md px-1.5 py-0.5 ${sc == null ? 'text-neutral-300' : sc >= 80 ? 'bg-success-50 text-success-800' : sc >= 60 ? 'bg-neutral-100 text-neutral-700' : 'bg-warning-50 text-warning-800'}`}>{sc ?? '—'}</span></td>; })}
                  <td className="px-3 py-3 text-center font-semibold tabular-nums">{x.total.toFixed(1)}</td>
                  <td className="px-3 py-3 text-center">{x.total >= pass ? <Pill tone="green">{t('Pass', 'مجتاز')}</Pill> : <Pill tone="red">{t('Fail', 'غير مجتاز')}</Pill>}</td>
                  <td className="px-3 py-3">{x.s.sig ? <Stamp sig={x.s.sig} isAr={isAr} t={t} compact /> : <Pill tone="amber">{t('Voided — awaiting re-sign', 'ملغى — بانتظار إعادة التوقيع')}</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-neutral-100 flex items-center gap-2 text-[12px] text-neutral-500">
          {o.eval?.techReport?.sig ? <Stamp sig={o.eval.techReport.sig} isAr={isAr} t={t} compact /> : <><PenIcon className="w-3.5 h-3.5" />{allSigned ? t(`You sign the report on approval · ${task.assignee.name}`, `توقّع التقرير عند الاعتماد · ${task.assignee.nameAr ?? task.assignee.name}`) : t('Approval waits for every sheet to be signed again', 'ينتظر الاعتماد إعادة توقيع كل الأوراق')}</>}
        </div>
      </section>
      {ret && <ReturnDialog title={t('Return sheets to the Technical member', 'إعادة أوراق إلى العضو الفني')} vendors={vs.filter((v) => signed(sheetOf(o, 'technical', v.id)))} isAr={isAr} t={t} onClose={() => setRet(false)}
        onSave={(ids, reason) => { const no = voided('technical', ids, reason, task.assignee.name); const ok = p.reopen?.(21, no, reason); if (!ok) p.onRfp({ ...rfp, opening: no }); setRet(false); toast(t('Returned to the Technical member — signatures voided', 'أُعيد إلى العضو الفني — أُلغيت التواقيع')); }} />}
    </div>
  );
}

/* ── F3.1 · Procurement verification ─────────────────────────────── */
export function ProcVerify(p: EP) {
  const { task, isAr, t, readOnly } = p;
  const { rfp, o, ev, setEval, voided } = useEval(task, p.onRfp);
  const [ret, setRet] = useState<null | 'legal' | 'technical'>(null);
  const rows = o.vendors.map((v) => ({ v, r: verifyRow(o, rfp, v) }));
  const cell = (ok: boolean, applies: boolean, body: ReactNode) => !applies ? <span className="text-neutral-300">—</span> : <span className="inline-flex items-center gap-1.5">{ok ? <CheckCircleIcon className="w-4 h-4 text-success-600" /> : <AlertTriangleIcon className="w-4 h-4 text-warning-600" />}{body}</span>;
  const done = rows.filter((x) => ev.verified?.[x.v.id]).length;
  return (
    <div className="space-y-4" data-proc-verify>
      <ActionHead title={t('Verify the evaluation before selection', 'التحقق من التقييم قبل الاختيار')}
        desc={t('What each step produced, per vendor. Tick a vendor once its legal, technical and financial results are complete; return a step if something is missing.', 'ما نتج عن كل خطوة لكل مورد. أكّد المورد عند اكتمال نتائجه القانونية والفنية والمالية، وأعد الخطوة إن نقص شيء.')}
        progress={{ done, total: rows.length, label: t('vendors verified', 'موردين تم التحقق منهم'), attrs: { 'data-verify-count': `${done}/${rows.length}` } }}
        extra={!readOnly ? <span className="flex gap-2"><Button variant="secondary" onClick={() => setRet('legal')} data-return-legal>{t('Return to Legal', 'إعادة للقانوني')}</Button><Button variant="ghost" onClick={() => setRet('technical')} data-return-tech>{t('Return to Technical', 'إعادة للفني')}</Button></span> : undefined} />
      <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-[13px]">
          <thead><tr className="text-[11.5px] text-neutral-500 bg-neutral-50"><th className="text-start font-medium px-5 py-2">{t('Vendor', 'المورد')}</th><th className="text-start font-medium px-3 py-2">{t('Technical', 'الفني')}</th><th className="text-start font-medium px-3 py-2">{t('Legal', 'القانوني')}</th><th className="text-start font-medium px-3 py-2">{t('Financial', 'المالي')}</th><th className="text-end font-medium px-5 py-2">{t('Verified', 'تم التحقق')}</th></tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map(({ v, r }) => (
              <tr key={v.id} data-verify-vendor={v.id} className={!r.ok ? 'bg-warning-50/30' : ''}>
                <td className="px-5 py-3"><p className="font-medium text-neutral-900">{v.name}</p><p className="text-[11.5px] text-neutral-500 tabular-nums" dir="ltr">CR {v.cr}</p></td>
                <td className="px-3 py-3">{cell(r.items[0].ok, true, <span className="tabular-nums">{r.score.toFixed(1)} · {r.pass ? t('pass', 'مجتاز') : t('fail', 'غير مجتاز')}</span>)}</td>
                <td className="px-3 py-3">{cell(r.items[1].ok, r.items[1].applies, r.legal.compliant === false ? <span className="text-error-700">{r.legal.reasonCode}</span> : t('compliant', 'مطابق'))}</td>
                <td className="px-3 py-3">{cell(r.items[2].ok, r.items[2].applies, <span className="tabular-nums">{r.rank ? `#${r.rank}` : ''} {fmtSar(adjusted(r.fin, v))}</span>)}</td>
                <td className="px-5 py-3 text-end"><input type="checkbox" className="w-4 h-4 accent-brand-600" disabled={readOnly || !r.ok} checked={!!ev.verified?.[v.id]} onChange={(e) => setEval({ verified: { ...(ev.verified ?? {}), [v.id]: e.target.checked } })} data-verify-tick={v.id} aria-label={`Verify ${v.name}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {ret && <ReturnDialog title={ret === 'legal' ? t('Return to the Legal member', 'إعادة إلى العضو القانوني') : t('Return to the Technical member', 'إعادة إلى العضو الفني')}
        vendors={evalVendors(o, ret).filter((v) => signed(sheetOf(o, ret, v.id)))} isAr={isAr} t={t} onClose={() => setRet(null)}
        onSave={(ids, reason) => { const no = voided(ret, ids, reason, task.assignee.name); const ok = p.reopen?.(ret === 'legal' ? 24 : 21, no, reason); if (!ok) p.onRfp({ ...rfp, opening: no }); setRet(null); toast(t('Returned — signatures voided', 'تمت الإعادة — أُلغيت التواقيع')); }} />}
    </div>
  );
}

/* ── F5.1 · BEC Chairman selects the vendor ──────────────────────── */
export function BecSelect(p: EP) {
  const { task, isAr, t, readOnly } = p;
  const { rfp, o, ev, setEval } = useEval(task, p.onRfp);
  const rk = ranking(o);
  const sel = ev.selection?.vendor;
  const [ret, setRet] = useState(false);
  const pick = rk.ordered.find((x) => x.v.id === sel);
  const save = pick && task.amount ? task.amount - (pick.s.evalPrice ?? pick.v.price ?? 0) : undefined;
  const excluded = o.vendors.filter((v) => !rk.ordered.some((x) => x.v.id === v.id));
  return (
    <div className="space-y-4" data-bec-select>
      <ActionHead title={t('Select the vendor', 'اختيار المورد')}
        desc={t('The shortlist is ranked from signed sheets. Select a vendor with a reason; the whole ranked list goes to the Qualification Committee, so it can move to the next vendor if needed.', 'القائمة المختصرة مرتبة من الأوراق الموقعة. اختر مورداً مع ذكر السبب؛ تنتقل القائمة المرتبة كاملة إلى لجنة التأهيل لتنتقل للمورد التالي عند الحاجة.')}
        extra={!readOnly ? <Button variant="secondary" onClick={() => setRet(true)} data-return-proc>{t('Return to Procurement', 'إعادة للمشتريات')}</Button> : undefined} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {rk.ordered.map((x, i) => { const tech = techTotal(sheetOf(o, 'technical', x.v.id), rfp); const on = sel === x.v.id; return (
          <button key={x.v.id} type="button" disabled={readOnly} onClick={() => setEval({ selection: { ...(ev.selection ?? {}), vendor: x.v.id } })} data-select-vendor={x.v.id} aria-pressed={on}
            className={`relative text-start rounded-2xl border-2 bg-white p-4 transition-all ${on ? 'border-brand-500 ring-4 ring-brand-500/10 shadow-sm' : 'border-neutral-200 hover:border-neutral-300'}`}>
            <span className="flex items-center justify-between"><span className={`inline-flex w-8 h-8 rounded-full items-center justify-center text-[13px] font-bold ${i === 0 ? 'bg-success-600 text-white' : 'bg-neutral-100 text-neutral-600'}`}>{i + 1}</span>
              {i === 0 ? <Pill tone="violet" attr={{ 'data-top-ranked': '' }}><SparklesIcon className="w-3 h-3" />{t('Top ranked', 'الأعلى ترتيباً')}</Pill> : on ? <Pill tone="blue">{t('Selected', 'مختار')}</Pill> : null}</span>
            <p className="mt-3 text-[14px] font-semibold text-neutral-900">{x.v.name}</p>
            <p className="text-[20px] font-semibold text-neutral-900 tabular-nums mt-1" dir="ltr">{fmtSar(x.adj)}</p>
            <p className="text-[11.5px] text-neutral-500">{t('adjusted price', 'السعر بعد التفضيل')} · {fmtPct(variance(x.s.evalPrice ?? x.v.price, task.amount))} {t('vs estimate', 'مقابل التقدير')}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11.5px]">
              <span className="rounded-lg bg-neutral-50 px-2 py-1.5"><span className="block text-neutral-500">{t('Technical', 'الفني')}</span><span className="font-semibold text-neutral-800 tabular-nums">{tech.toFixed(1)}</span></span>
              <span className="rounded-lg bg-neutral-50 px-2 py-1.5"><span className="block text-neutral-500">{t('Legal', 'القانوني')}</span><span className="font-semibold text-success-700">{t('Compliant', 'مطابق')}</span></span>
            </div>
            {on && <CheckCircleIcon className="absolute top-3 end-3 w-5 h-5 text-brand-600 hidden" />}
          </button>
        ); })}
      </div>
      {excluded.length > 0 && <p className="text-[12px] text-neutral-500" data-excluded>{t('Not ranked', 'غير مرتب')}: {excluded.map((v) => v.name).join(' · ')}</p>}
      <Card title={t('Selection reason', 'سبب الاختيار')} attr={{ 'data-selection-reason': '' }} aside={pick && save != null ? <Pill tone={save >= 0 ? 'green' : 'amber'}>{save >= 0 ? t(`Saves ${fmtSar(save)} vs estimate`, `وفر ${fmtSar(save)} عن التقدير`) : t(`${fmtSar(-save)} above estimate`, `أعلى من التقدير بـ ${fmtSar(-save)}`)}</Pill> : undefined}>
        {pick && rk.ordered[0].v.id !== pick.v.id && <p className="mb-2 flex items-center gap-1.5 text-[12.5px] text-warning-800"><AlertTriangleIcon className="w-4 h-4" />{t('You selected a vendor other than the top ranked — explain why.', 'اخترت مورداً غير الأعلى ترتيباً — وضح السبب.')}</p>}
        <textarea rows={3} disabled={readOnly} value={ev.selection?.reason ?? ''} onChange={(e) => setEval({ selection: { ...(ev.selection ?? {}), reason: e.target.value } })} placeholder={t('Recorded on the evaluation MoM and sent to Qualification', 'يُسجل في محضر التقييم ويُرسل إلى لجنة التأهيل')} className="w-full text-[13px] rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:border-brand-400" />
      </Card>
      {ret && <ReturnDialog title={t('Return to the Procurement member', 'إعادة إلى عضو المشتريات')} vendors={[]} pickVendors={false} isAr={isAr} t={t} onClose={() => setRet(false)}
        onSave={(_ids, reason) => { const ok = p.reopen?.(26, { ...o, eval: { ...ev, verified: {} } }, reason); setRet(false); toast(ok ? t('Returned to the Procurement member', 'أُعيد إلى عضو المشتريات') : t('Returned', 'تمت الإعادة')); }} />}
    </div>
  );
}

/** Committee tab: BEC members and every signature on the case. */
export function EvalSignatures({ o, isAr, t }: { o: Opening; isAr: boolean; t: T }) {
  const ev = o.eval; const name = (id: string) => o.vendors.find((v) => v.id === id)?.name ?? id;
  const sigs = useMemo(() => {
    const out: { key: string; vendor: string; sig: Signature }[] = [];
    for (const role of ['technical', 'legal', 'finance'] as EvalRole[]) for (const [vid, s] of Object.entries(ev?.sheets[role] ?? {})) if (s.sig) out.push({ key: `${role}-${vid}`, vendor: name(vid), sig: s.sig });
    if (ev?.techReport?.sig) out.push({ key: 'report', vendor: t('Technical report', 'التقرير الفني'), sig: ev.techReport.sig });
    return out.sort((a, b) => a.sig.at.localeCompare(b.sig.at));
  }, [ev]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!o.bec) return null;
  return (
    <>
      <Card title={BEC[isAr ? 'ar' : 'en']} aside={<Pill tone="gray">{t('Annual roster 2026', 'تشكيل 2026')}</Pill>} pad={false}>
        <ul className="divide-y divide-neutral-100">{o.bec.map((s) => (
          <li key={s.role} className="flex items-center gap-3 px-5 py-3" data-bec-seat={s.role}><span className="w-24 text-[12px] font-semibold text-neutral-500">{s.role === 'technical' ? t('Technical', 'فني') : s.role === 'chairman' ? t('Chairman', 'الرئيس') : s.role === 'legal' ? t('Legal', 'قانوني') : s.role === 'finance' ? t('Finance', 'مالي') : t('Procurement', 'المشتريات')}</span><Avatar p={s.person} /><span className="text-[13px] font-medium text-neutral-900">{nm(s.person, isAr)}</span>{s.role === 'technical' && <span className="ms-auto"><Pill tone="blue">{t('Nominated for this case', 'مرشح لهذه الحالة')}</Pill></span>}</li>
        ))}</ul>
      </Card>
      <Card title={t('Signatures', 'التواقيع')} aside={<span className="text-[12px] text-neutral-500">{sigs.length}</span>} pad={false} attr={{ 'data-signatures': String(sigs.length) }}>
        {sigs.length ? <ul className="divide-y divide-neutral-100">{sigs.map((x) => (
          <li key={x.key} className="flex items-center gap-3 px-5 py-2.5 text-[12.5px]"><PenIcon className="w-3.5 h-3.5 text-success-600" /><span className="w-44 truncate font-medium text-neutral-900">{x.vendor}</span><span className="flex-1 truncate text-neutral-600">{nm(x.sig.by, isAr)} · {L(x.sig.role, isAr)}</span><span className="text-neutral-500 tabular-nums" dir="ltr">{riyadh(x.sig.at)}</span></li>
        ))}</ul> : <p className="px-5 py-4 text-[12.5px] text-neutral-500">{t('No signatures yet.', 'لا توجد تواقيع بعد.')}</p>}
        {!!ev?.log?.length && <div className="px-5 py-3 border-t border-neutral-100"><p className="text-[11.5px] font-semibold text-neutral-500 mb-1.5 inline-flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" />{t('Log', 'السجل')}</p><ul className="space-y-1 text-[12px] text-neutral-600">{ev.log.slice(-6).map((l, i) => <li key={i}>{isAr ? l.ar : l.en} <span className="text-neutral-400">· {riyadh(l.at, isAr)}</span></li>)}</ul></div>}
      </Card>
    </>
  );
}

export function EvalWidget(p: EP) {
  switch (p.task.committee) {
    case 'tech-eval': case 'legal-eval': case 'fin-rank': return <VendorEvalTask {...p} />;
    case 'tech-report': return <TechReport {...p} />;
    case 'proc-verify': return <ProcVerify {...p} />;
    case 'bec-select': return <BecSelect {...p} />;
    default: return null;
  }
}
