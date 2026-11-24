/* Case story — the whole committee journey on every committee task: what each stage produced,
   who did it and when, with the detail one click away. Built from the case's shared record. */
import { useMemo, useState, type ReactNode } from 'react';
import type { Opening, Person, RfpDetail, Task } from './types';
import { Avatar } from './InboxTools';
import { CheckIcon, ChevronDownIcon, SparklesIcon } from '../components/Icons';
import { BOC_ROSTER, DOC_ITEMS, DPEC_ROSTER, SEAT_LABEL, attending, fmtSar, vendorDocs } from './committee';
import { BEC_ROSTER, TECH_MANAGER, evalVendors, ranking, riyadh, sheetOf, signed, techCriteria, techPassing, techTotal } from './evaluation';
import { flowStep } from './store';

type T = (en: string, ar: string) => string;
interface Stage { step: number; en: string; ar: string; who?: Person; role: { en: string; ar: string }; at?: string; summary?: ReactNode; detail?: ReactNode }

const roster = (list: { role: string; person: Person }[], role: string) => list.find((s) => s.role === role)?.person;
const nm = (p: Person | undefined, isAr: boolean) => (p ? (isAr ? p.nameAr ?? p.name : p.name) : '—');
const Mini = ({ rows }: { rows: ReactNode[][] }) => (
  <table className="w-full text-[12px]"><tbody>{rows.map((r, i) => <tr key={i} className={i === 0 ? 'text-neutral-500 text-[11px]' : 'border-t border-neutral-100'}>{r.map((c, j) => <td key={j} className={`py-1.5 pe-3 ${j > 0 ? 'tabular-nums' : ''}`}>{c}</td>)}</tr>)}</tbody></table>
);

function stagesFor(rfp: RfpDetail, o: Opening | undefined, isAr: boolean, t: T): Stage[] {
  const L = (en: string, ar: string) => ({ en, ar });
  const vs = o?.vendors ?? [];
  const dp = o?.committee === 'dpec';
  const R = dp ? DPEC_ROSTER : BOC_ROSTER;
  const publish: Stage = { step: 15, ...L('Published in Etimad', 'نُشرت في اعتماد'), role: L('Procurement officer', 'أخصائي المشتريات'), who: rfp.etimad ? { id: 'o', name: rfp.etimad.by, nameAr: rfp.etimad.byAr } as Person : undefined, at: rfp.etimad?.at,
    summary: rfp.etimad && <>{t('Etimad ref', 'مرجع اعتماد')} <b dir="ltr">{rfp.etimad.ref}</b>{rfp.etimad.closingDate && <> · {t('bids closed', 'إغلاق العروض')} {rfp.etimad.closingDate}</>}</> };
  const raise: Stage = { step: 16, ...L(dp ? 'Offers raised to the DP committee' : 'Bid opening form raised', dp ? 'رُفعت العروض للجنة الشراء المباشر' : 'رُفع نموذج فتح العروض'), role: L('Procurement member', 'عضو المشتريات'), who: roster(R, 'procurement'), at: o?.source?.at,
    summary: o?.source && <>{t(`${vs.length} bidders`, `${vs.length} موردين`)}{o.withdrawn?.length ? t(` · ${o.withdrawn.length} withdrawn`, ` · ${o.withdrawn.length} منسحب`) : ''}{vs.some((v) => v.bond) ? t(` · bonds ${fmtSar(vs.reduce((a, v) => a + (v.bond?.amount ?? 0), 0))}`, ` · ضمانات ${fmtSar(vs.reduce((a, v) => a + (v.bond?.amount ?? 0), 0))}`) : ''} · {o.source.kind === 'upload' ? t('read from the Etimad report', 'من تقرير اعتماد') : t('entered manually', 'إدخال يدوي')}</>,
    detail: vs.length > 0 && <Mini rows={[[t('Bidder', 'المورد'), 'CR', t('Bid no.', 'رقم العرض'), t('Bond', 'الضمان'), t('Validity', 'السريان')], ...vs.map((v) => [v.name, v.cr, v.bidNo ?? '—', v.bond ? `${(v.bond.amount / 1000).toFixed(1)}K` : '—', v.validityDays ? `${v.validityDays}d` : '—'])]} /> };
  const seats = o?.seats ?? [];
  const committee: Stage = { step: 17, ...L('Committee confirmed', 'تأكيد اللجنة'), role: L('Chairman', 'الرئيس'), who: roster(R, 'chairman'), at: o?.source?.at,
    summary: o && <>{t(`${seats.length} members`, `${seats.length} أعضاء`)} · {t(`${o ? attending(o).length : 0} attending`, `${o ? attending(o).length : 0} حاضرون`)}{seats.some((s) => s.replaced) ? t(` · ${seats.filter((s) => s.replaced).length} replaced for this case`, ` · ${seats.filter((s) => s.replaced).length} مستبدل`) : ''}</>,
    detail: <ul className="space-y-1">{seats.map((s) => <li key={s.role} className="flex items-center gap-2 text-[12px]"><span className="w-24 text-neutral-500">{isAr ? SEAT_LABEL[s.role].ar : SEAT_LABEL[s.role].en}</span><span className="text-neutral-800">{nm(s.person, isAr)}</span>{s.replaced && <span className="text-warning-700">· {t('replacing', 'بدلاً من')} {s.replaced.from.name} ({s.replaced.reason})</span>}{!s.attending && <span className="text-neutral-400">· {t('not attending', 'غير حاضر')}</span>}</li>)}</ul> };
  const issues = vs.flatMap((v) => DOC_ITEMS.filter((d) => v.docs[d.id] && v.docs[d.id] !== 'valid').map((d) => `${v.name.split(' ')[0]}: ${isAr ? d.ar : d.en} (${v.docs[d.id]})`));
  const record: Stage = { step: 18, ...L(dp ? 'Offers and technical result recorded' : 'Bids recorded', dp ? 'تسجيل العروض والنتيجة الفنية' : 'تسجيل العطاءات'), role: L(dp ? 'Officer & Technical member' : 'Secretary', dp ? 'الأخصائي والعضو الفني' : 'الأمين'), who: roster(R, 'secretary'), at: o?.recordedAt,
    summary: o?.recordedAt && <>{o.intake ? <><SparklesIcon className="inline w-3 h-3 text-ai-600 me-0.5" />{t(`${o.intake.files} files sorted by AI`, `${o.intake.files} ملفاً فرزها الذكاء`)} · </> : null}{issues.length ? t(`${issues.length} issue${issues.length > 1 ? 's' : ''}: ${issues[0]}`, `${issues.length} ملاحظة: ${issues[0]}`) : t('all documents valid', 'كل المستندات سارية')}</>,
    detail: <Mini rows={[[t('Bidder', 'المورد'), t('Documents', 'المستندات'), t('Issues', 'ملاحظات'), ...(dp ? [t('Technical', 'الفني')] : [])], ...vs.map((v) => { const d = vendorDocs(v); return [v.name, `${d.set}/${d.total}`, d.issues || '—', ...(dp ? [v.techPass == null ? '—' : v.techPass ? t('Pass', 'مجتاز') : t('Fail', 'غير مجتاز')] : [])]; })]} /> };
  if (dp) {
    const sel = vs.find((v) => v.id === o?.dp?.selected);
    return [publish, raise, committee, record, { step: 19, ...L('Vendor selected', 'اختيار المورد'), role: L('Chairman', 'الرئيس'), who: roster(R, 'chairman'), at: o?.dp?.at, summary: sel && <>{sel.name} · {fmtSar(sel.price)}{o?.dp?.reason ? ` · ${o.dp.reason}` : ''}</> }];
  }
  const att = o ? attending(o) : [];
  const verify: Stage = { step: 19, ...L('Members verified the opening', 'تحقق الأعضاء من الفتح'), role: L('Members', 'الأعضاء'), at: att.map((s) => s.approvalAt).filter(Boolean).sort().pop(),
    summary: att.length > 0 && <>{t(`${att.filter((s) => s.approval === 'approved').length} of ${att.length} approved`, `${att.filter((s) => s.approval === 'approved').length} من ${att.length} اعتمدوا`)} · {att.every((s) => s.coi) ? t('no conflicts of interest', 'لا تعارض مصالح') : t('declarations pending', 'إقرارات معلقة')}</>,
    detail: <ul className="space-y-1">{att.map((s) => <li key={s.role} className="text-[12px] text-neutral-700">{nm(s.person, isAr)} · {s.approval === 'approved' ? t('approved', 'اعتمد') : s.approval === 'returned' ? t('returned', 'أعاد') : t('pending', 'معلق')}{s.approvalAt && <span className="text-neutral-400"> · {riyadh(s.approvalAt, isAr)}</span>}</li>)}</ul> };
  const mom: Stage = { step: 20, ...L('MoM approved · sent to Bid Evaluation', 'اعتماد المحضر والإرسال للجنة الفحص'), role: L('Chairman', 'الرئيس'), who: roster(R, 'chairman'), at: o?.momAt, summary: o?.momAt && (o.chairmanNote ? `“${o.chairmanNote}”` : t('Approved without comments', 'اعتُمد دون ملاحظات')) };
  const ev = o?.eval;
  const cs = techCriteria(rfp);
  const techRows = vs.map((v) => ({ v, s: sheetOf(o, 'technical', v.id) })).filter((x) => signed(x.s));
  const tech: Stage = { step: 21, ...L('Technical offers scored', 'تقييم العروض الفنية'), role: L('Technical member', 'العضو الفني'), who: roster(BEC_ROSTER, 'technical'), at: techRows.map((x) => x.s.sig!.at).sort().pop(),
    summary: techRows.length > 0 && techRows.map((x) => `${x.v.name.split(' ')[0]} ${techTotal(x.s, rfp).toFixed(0)}`).join(' · '),
    detail: techRows.length > 0 && <Mini rows={[[t('Bidder', 'المورد'), ...cs.map((c) => `${(isAr ? c.ar : c.en).split(/[ &]/)[0]} ${c.weight}%`), t('Total', 'المجموع')], ...techRows.map((x) => [x.v.name, ...cs.map((c) => x.s.scores?.[c.key]?.score ?? '—'), <b key="t">{techTotal(x.s, rfp).toFixed(1)}</b>])]} /> };
  const pass = vs.filter((v) => techTotal(sheetOf(o, 'technical', v.id), rfp) >= techPassing(rfp));
  const report: Stage = { step: 22, ...L('Technical report approved', 'اعتماد التقرير الفني'), role: L('Technical manager', 'المدير الفني'), who: TECH_MANAGER, at: ev?.techReport?.sig?.at,
    summary: ev?.techReport?.sig && t(`${pass.length} of ${vs.length} pass the ${techPassing(rfp)} mark: ${pass.map((v) => v.name.split(' ')[0]).join(', ')}`, `${pass.length} من ${vs.length} اجتازوا: ${pass.map((v) => v.name.split(' ')[0]).join('، ')}`) };
  const fin: Stage = { step: 23, ...L('Financial offers opened', 'فتح العروض المالية'), role: L('BOC Chairman', 'رئيس لجنة الفتح'), who: roster(BOC_ROSTER, 'chairman'), at: o?.financial?.momAt,
    summary: o?.financial?.momAt && vs.filter((v) => v.price).map((v) => `${v.name.split(' ')[0]} ${fmtSar(v.price)}`).join(' · ') };
  const legalV = evalVendors(o, 'legal');
  const legal: Stage = { step: 24, ...L('Legal compliance checked', 'التحقق من المطابقة النظامية'), role: L('Legal member', 'العضو القانوني'), who: roster(BEC_ROSTER, 'legal'), at: legalV.map((v) => sheetOf(o, 'legal', v.id).sig?.at).filter(Boolean).sort().pop(),
    summary: legalV.some((v) => signed(sheetOf(o, 'legal', v.id))) && legalV.map((v) => { const s = sheetOf(o, 'legal', v.id); return `${v.name.split(' ')[0]} ${s.compliant === false ? `✕ ${s.reasonCode}` : s.compliant ? '✓' : '—'}`; }).join(' · ') };
  const rk = ranking(o);
  const finRank: Stage = { step: 25, ...L('Prices evaluated and ranked', 'تقييم الأسعار والترتيب'), role: L('Finance member', 'العضو المالي'), who: roster(BEC_ROSTER, 'finance'), at: rk.ordered.map((x) => x.s.sig?.at).filter(Boolean).sort().pop(),
    summary: rk.ready && rk.ordered.map((x, i) => `#${i + 1} ${x.v.name.split(' ')[0]} ${fmtSar(x.adj)}`).join(' · '),
    detail: rk.ready && <Mini rows={[[t('Rank', 'الترتيب'), t('Bidder', 'المورد'), t('Evaluated', 'المقيّم'), t('Adjusted', 'بعد التفضيل')], ...rk.ordered.map((x, i) => [`#${i + 1}`, x.v.name, fmtSar(x.s.evalPrice ?? x.v.price), fmtSar(x.adj)])]} /> };
  const verified = Object.values(ev?.verified ?? {}).filter(Boolean).length;
  const procV: Stage = { step: 26, ...L('Evaluation verified', 'التحقق من التقييم'), role: L('Procurement member', 'عضو المشتريات'), who: roster(BEC_ROSTER, 'procurement'), summary: verified > 0 && t(`${verified} of ${vs.length} bidders verified complete`, `${verified} من ${vs.length} تم التحقق منهم`) };
  const selV = vs.find((v) => v.id === ev?.selection?.vendor);
  const select: Stage = { step: 27, ...L('Vendor selected → Qualification', 'اختيار المورد ← التأهيل'), role: L('BEC Chairman', 'رئيس لجنة الفحص'), who: roster(BEC_ROSTER, 'chairman'), at: ev?.selection?.at, summary: selV && <>{selV.name}{ev?.selection?.reason ? ` · “${ev.selection.reason}”` : ''}</> };
  return [publish, raise, committee, record, verify, mom, tech, report, fin, legal, finRank, procV, select];
}

export function CaseStory({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  const rfp = task.rfp!; const o = rfp.opening;
  const cur = Math.floor(flowStep(task));
  const stages = useMemo(() => stagesFor(rfp, o, isAr, t), [rfp, o, isAr]); // eslint-disable-line react-hooks/exhaustive-deps
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const done = stages.filter((s) => s.step < cur).length;
  const all = stages.every((s) => s.step >= cur || !s.detail || open[s.step]);
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden" data-case-story>
      <div className="px-5 py-4 flex items-center gap-3 border-b border-neutral-100">
        <div className="min-w-0 flex-1"><h3 className="text-[14px] font-semibold text-neutral-900">{t('Case story', 'سجل الحالة')}</h3><p className="text-[12px] text-neutral-500">{t(`${done} of ${stages.length} stages done · ${task.entity.ref}`, `${done} من ${stages.length} مراحل · ${task.entity.ref}`)}</p></div>
        <span className="h-1.5 w-28 rounded-full bg-neutral-100 overflow-hidden"><span className="block h-full rounded-full bg-success-500 transition-all duration-700" style={{ width: `${(done / stages.length) * 100}%` }} /></span>
        <button type="button" onClick={() => setOpen(all ? {} : Object.fromEntries(stages.filter((s) => s.step < cur).map((s) => [s.step, true])))} className="text-[12px] font-semibold text-brand-700 hover:text-brand-800" data-story-expand>{all ? t('Collapse all', 'طي الكل') : t('Expand all', 'توسيع الكل')}</button>
      </div>
      <ol className="px-5 py-4">
        {stages.map((s, i) => {
          const st = s.step < cur ? 'done' : s.step === cur ? 'current' : 'next'; const ex = !!open[s.step];
          return (
            <li key={s.step} className="relative flex gap-4 pb-5 last:pb-0" data-story-stage={s.step} data-story-state={st}>
              {i < stages.length - 1 && <span className={`absolute start-[13px] top-7 bottom-0 w-0.5 ${st === 'done' ? 'bg-success-200' : 'bg-neutral-100'}`} />}
              <span className={`relative z-10 w-7 h-7 rounded-full inline-flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${st === 'done' ? 'bg-success-500 text-white' : st === 'current' ? 'bg-white ring-[3px] ring-brand-500 text-brand-700 shadow-[0_0_0_5px_rgba(105,152,67,.15)]' : 'bg-neutral-100 text-neutral-400'}`}>{st === 'done' ? <CheckIcon className="w-3.5 h-3.5" /> : i + 1}</span>
              <div className={`min-w-0 flex-1 ${st === 'current' ? 'rounded-xl bg-brand-50/60 ring-1 ring-brand-100 px-3 py-2 -mt-1' : ''}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-[13px] font-semibold ${st === 'next' ? 'text-neutral-400' : 'text-neutral-900'}`}>{isAr ? s.ar : s.en}</p>
                  {st === 'current' && <span className="px-1.5 py-px rounded bg-brand-600 text-white text-[10px] font-bold uppercase tracking-wide">{t('You are here', 'أنت هنا')}</span>}
                  {st === 'done' && s.detail && <button type="button" onClick={() => setOpen({ ...open, [s.step]: !ex })} className="ms-auto inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-neutral-500 hover:text-neutral-800" data-story-toggle={s.step}>{ex ? t('Less', 'أقل') : t('Details', 'التفاصيل')}<ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${ex ? 'rotate-180' : ''}`} /></button>}
                </div>
                {st !== 'next' && <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-neutral-500">{s.who && <Avatar p={s.who} />}<span>{nm(s.who, isAr) !== '—' ? `${nm(s.who, isAr)} · ` : ''}{isAr ? s.role.ar : s.role.en}{s.at && st === 'done' ? ` · ${riyadh(s.at, isAr)}` : ''}</span></p>}
                {st === 'done' && s.summary && <p className="mt-1 text-[12.5px] text-neutral-700 leading-snug">{s.summary}</p>}
                {st === 'next' && <p className="text-[11.5px] text-neutral-400">{isAr ? s.role.ar : s.role.en}</p>}
                {ex && s.detail && <div className="mt-2 rounded-xl bg-neutral-50 ring-1 ring-neutral-200/70 px-3 py-2 fade-in">{s.detail}</div>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Compact "story so far" on the Required action tab. */
export function StoryStrip({ task, isAr, t, onOpen }: { task: Task; isAr: boolean; t: T; onOpen?: () => void }) {
  const rfp = task.rfp; if (!rfp) return null;
  const cur = Math.floor(flowStep(task));
  const stages = stagesFor(rfp, rfp.opening, isAr, t);
  const done = stages.filter((s) => s.step < cur);
  const last = done[done.length - 1];
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white px-4 py-3" data-story-strip>
      <div className="flex items-center gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 whitespace-nowrap">{t('Story so far', 'ما تم حتى الآن')}</p>
        <ol className="flex items-center gap-1 min-w-0 flex-1" aria-label="stages">
          {stages.map((s) => { const st = s.step < cur ? 'done' : s.step === cur ? 'current' : 'next'; return (
            <li key={s.step} title={isAr ? s.ar : s.en} className={`h-1.5 flex-1 rounded-full ${st === 'done' ? 'bg-success-500' : st === 'current' ? 'bg-brand-500 animate-pulse' : 'bg-neutral-200'}`} />
          ); })}
        </ol>
        {onOpen && <button type="button" onClick={onOpen} className="text-[12px] font-semibold text-brand-700 hover:text-brand-800 whitespace-nowrap" data-story-open>{t('Full story', 'السجل الكامل')} →</button>}
      </div>
      {last && <p className="mt-2 text-[12px] text-neutral-600 truncate"><span className="font-semibold text-neutral-800">{isAr ? last.ar : last.en}</span>{last.summary ? <> · {last.summary}</> : null}</p>}
    </section>
  );
}
