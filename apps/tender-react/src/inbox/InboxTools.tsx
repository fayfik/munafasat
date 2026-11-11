// Inbox header tools: My tasks / Team queue switcher, inbox delegation (dialog +
// banner) and the overflow menu (download the list as Excel).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Person, Task } from './types';
import { useInbox, dueInfo, fmtDate } from './store';
import { PROC_TEAM, TEAM_NAME } from './data';
import { CheckIcon, ChevronDownIcon } from '../components/Icons';
import { toast } from '../components/Toast';

type T = (en: string, ar: string) => string;
export type Scope = 'mine' | 'team';

const initials = (n: string) => n.split(' ').map((w) => w[0]).slice(0, 2).join('');
export function Avatar({ p, className = 'w-7 h-7 text-[10.5px]' }: { p: Person; className?: string }) {
  return <span className={`${className} rounded-full bg-[#2A3466] text-white font-semibold inline-flex items-center justify-center flex-shrink-0`}>{initials(p.name)}</span>;
}

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', off); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [open, close]);
  return ref;
}

/* ── Title switcher: Inbox ▾ (My tasks · Team queue) ─────────────────────── */
export function ScopeSwitcher({ scope, onChange, mine, team, isAr, t, tl }: { scope: Scope; onChange: (s: Scope) => void; mine: number; team: number; isAr: boolean; t: T; tl: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const Opt = ({ s, title, sub, n, tag }: { s: Scope; title: string; sub: string; n: number; tag?: string }) => (
    <button type="button" role="menuitemradio" aria-checked={scope === s} data-scope={s} onClick={() => { onChange(s); setOpen(false); }}
      className={`w-full text-start flex items-start gap-3 px-3 py-2.5 rounded-lg ${scope === s ? 'bg-brand-50/70' : 'hover:bg-neutral-50'}`}>
      <span className="w-4 pt-0.5">{scope === s && <CheckIcon className="w-4 h-4 text-brand-600" />}</span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-neutral-900">{title}{tag && <span className="px-1.5 py-px rounded bg-neutral-100 text-neutral-500 text-[10px] font-semibold">{tag}</span>}</span>
        <span className="block text-[12px] text-neutral-500">{sub}</span>
      </span>
      <span className="text-[12px] font-semibold text-neutral-500 tabular-nums pt-0.5">{n}</span>
    </button>
  );
  if (!tl) return <h1 className="text-[22px] font-bold text-neutral-900">{t('Inbox', 'الوارد')}</h1>;
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} data-scope-switch
        className="group inline-flex items-center gap-1.5 -ms-1.5 ps-1.5 pe-1 py-0.5 rounded-lg hover:bg-neutral-100">
        <h1 className="text-[22px] font-bold text-neutral-900">{scope === 'mine' ? t('Inbox', 'الوارد') : t('Team queue', 'قائمة الفريق')}</h1>
        <ChevronDownIcon className={`w-4 h-4 text-neutral-400 group-hover:text-neutral-700 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="pop-in absolute start-0 top-11 z-40 w-[300px] rounded-xl bg-white border border-neutral-200 shadow-xl p-1.5">
          <Opt s="mine" title={t('My tasks', 'مهامي')} sub={t('Assigned to you', 'المسندة إليك')} n={mine} />
          <Opt s="team" title={t('Team queue', 'قائمة الفريق')} sub={t(`Unassigned · ${isAr ? TEAM_NAME.ar : TEAM_NAME.en}`, `غير مسندة · ${TEAM_NAME.ar}`)} n={team} tag={t('Team lead', 'رئيس الفريق')} />
        </div>
      )}
    </div>
  );
}

/* ── Icon button ─────────────────────────────────────────────────────────── */
export function IconBtn({ label, onClick, active, children, attrs }: { label: string; onClick: () => void; active?: boolean; children: ReactNode; attrs?: Record<string, string> }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} {...attrs}
      className={`w-9 h-9 rounded-lg inline-flex items-center justify-center transition-colors ${active ? 'bg-[#2A3466] text-white' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}>
      {children}
    </button>
  );
}
export const DelegateGlyph = ({ className = 'w-[18px] h-[18px]' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5 1.4 0 2.6.3 3.7 1" /><path d="M15 17h7M19 14l3 3-3 3" /></svg>
);
const MoreGlyph = () => <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>;
const SheetGlyph = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 9h16M4 15h16M10 3v18" /></svg>;

/* ── Overflow menu: View (List / Compact) · Download as Excel ─────────────── */
export type Layout = 'compact' | 'list';
const ListGlyph = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
const SplitGlyph = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M10 4v16" /></svg>;
const ViewGlyph = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
export function MoreMenu({ rows, scopeLabel, viewLabel, isAr, t, layout, onLayout }: { rows: Task[]; scopeLabel: string; viewLabel: string; isAr: boolean; t: T; layout: Layout; onLayout: (l: Layout) => void }) {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState(false);
  const ref = useOutside(open, () => { setOpen(false); setSub(false); });
  const Item = ({ icon, title, hint, onClick, attrs, tone = 'neutral', children }: { icon: ReactNode; title: string; hint?: string; onClick?: () => void; attrs?: Record<string, string>; tone?: 'neutral' | 'success'; children?: ReactNode }) => (
    <button type="button" role="menuitem" onClick={onClick} {...attrs} className="w-full text-start flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tone === 'success' ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-600'}`}>{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-neutral-900">{title}</span>{hint && <span className="block text-[11.5px] text-neutral-500">{hint}</span>}</span>
      {children}
    </button>
  );
  const LayoutOpt = ({ v, icon, title, hint }: { v: Layout; icon: ReactNode; title: string; hint: string }) => (
    <button type="button" role="menuitemradio" aria-checked={layout === v} data-layout={v} onClick={() => { onLayout(v); setOpen(false); setSub(false); toast(v === 'list' ? t('Switched to List view', 'تم التبديل إلى عرض القائمة') : t('Switched to Compact view', 'تم التبديل إلى العرض المضغوط'), 'info'); }}
      className={`w-full text-start flex items-center gap-3 px-3 py-2.5 rounded-lg ${layout === v ? 'bg-brand-50/70' : 'hover:bg-neutral-50'}`}>
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${layout === v ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-neutral-600'}`}>{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-neutral-900">{title}</span><span className="block text-[11.5px] text-neutral-500">{hint}</span></span>
      {layout === v && <CheckIcon className="w-4 h-4 text-brand-600" />}
    </button>
  );
  return (
    <div ref={ref} className="relative">
      <IconBtn label={t('More', 'المزيد')} onClick={() => setOpen((v) => !v)} active={false} attrs={{ 'data-inbox-more': '' }}><MoreGlyph /></IconBtn>
      {open && (
        <div role="menu" className="pop-in absolute end-0 top-11 z-40 w-[270px] rounded-xl bg-white border border-neutral-200 shadow-xl p-1.5">
          <div className="relative" onMouseEnter={() => setSub(true)} onMouseLeave={() => setSub(false)}>
            <Item icon={<ViewGlyph />} title={t('View', 'طريقة العرض')} hint={layout === 'list' ? t('List view', 'عرض القائمة') : t('Compact view', 'العرض المضغوط')} onClick={() => setSub((v) => !v)} attrs={{ 'data-view-menu': '' }}>
              <ChevronDownIcon className={`w-4 h-4 text-neutral-400 ${isAr ? 'rotate-90' : '-rotate-90'}`} />
            </Item>
            {sub && (
              <div role="menu" data-view-sub className="pop-in absolute top-0 end-full me-1.5 w-[270px] rounded-xl bg-white border border-neutral-200 shadow-xl p-1.5">
                <LayoutOpt v="list" icon={<ListGlyph />} title={t('List view', 'عرض القائمة')} hint={t('Full-width table, act from the row', 'جدول بعرض كامل، اتخذ القرار من السطر')} />
                <LayoutOpt v="compact" icon={<SplitGlyph />} title={t('Compact view', 'العرض المضغوط')} hint={t('List and task side by side', 'القائمة والمهمة جنباً إلى جنب')} />
              </div>
            )}
          </div>
          <div className="my-1 h-px bg-neutral-100" />
          <Item icon={<SheetGlyph />} tone="success" title={t('Download as Excel', 'تنزيل كملف Excel')} hint={t(`${rows.length} tasks · ${scopeLabel} · ${viewLabel}`, `${rows.length} مهام · ${scopeLabel} · ${viewLabel}`)}
            attrs={{ 'data-export-excel': '' }} onClick={() => { void exportExcel(rows, scopeLabel, viewLabel, isAr, t).then(() => toast(t(`${rows.length} tasks downloaded as Excel`, `تم تنزيل ${rows.length} مهام كملف Excel`))); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}

/** The list as it is shown (scope + tab + search) → .xlsx. */
export async function exportExcel(rows: Task[], scopeLabel: string, viewLabel: string, isAr: boolean, t: T) {
  const XLSX = await import('xlsx');
  const data = rows.map((x) => {
    const d = dueInfo(x);
    return {
      [t('Task ID', 'رقم المهمة')]: x.id,
      [t('Request', 'الطلب')]: x.entity.ref,
      [t('Task', 'المهمة')]: isAr ? x.titleAr : x.titleEn,
      [t('Project', 'المشروع')]: isAr ? x.entity.titleAr : x.entity.titleEn,
      [t('Stage', 'المرحلة')]: isAr ? x.stageAr : x.stageEn,
      [t('Assigned to', 'مسندة إلى')]: x.delegatedTo ? `${isAr ? x.delegatedTo.nameAr ?? x.delegatedTo.name : x.delegatedTo.name} (${t('delegated', 'مفوّضة')})` : x.queue && !x.queue.assignedTo ? t('Unassigned', 'غير مسندة') : (isAr ? x.assignee.nameAr ?? x.assignee.name : x.assignee.name),
      [t('Requester', 'مقدّم الطلب')]: isAr ? x.requester.nameAr ?? x.requester.name : x.requester.name,
      [t('Priority', 'الأولوية')]: x.priority,
      [t('Status', 'الحالة')]: x.state,
      [t('Amount (SAR)', 'المبلغ (ريال)')]: x.amount ?? '',
      [t('Received', 'تاريخ الاستلام')]: fmtDate(x.receivedAt, isAr),
      [t('Due', 'الاستحقاق')]: fmtDate(x.dueAt, isAr),
      [t('Overdue', 'متأخرة')]: d.overdue ? t('Yes', 'نعم') : t('No', 'لا'),
    };
  });
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = Object.keys(data[0] ?? { a: 1 }).map((k) => ({ wch: Math.max(12, Math.min(48, k.length + 6, ...data.map((r) => String((r as Record<string, unknown>)[k] ?? '').length + 2))) }));
  if (isAr) ws['!views'] = [{ RTL: true }] as never;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Inbox-${scopeLabel}-${viewLabel}-${stamp}.xlsx`.replace(/\s+/g, '-'));
}

/* ── Delegation dialog ───────────────────────────────────────────────────── */
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export function DelegateDialog({ isAr, t, onClose }: { isAr: boolean; t: T; onClose: () => void }) {
  const { me, tasks, delegatableIds, delegate } = useInbox();
  const people = PROC_TEAM.filter((p) => p.id !== me.id);
  const [to, setTo] = useState<string>(people[0]?.id ?? '');
  const [from, setFrom] = useState(isoDay(new Date()));
  const [until, setUntil] = useState(isoDay(new Date(Date.now() + 7 * 86400000)));
  const [includeNew, setIncludeNew] = useState(true);
  const ids = useMemo(() => delegatableIds(), [delegatableIds]);
  const moving = tasks.filter((x) => ids.includes(x.id));
  const overdue = moving.filter((x) => dueInfo(x).overdue).length;
  const dueSoon = moving.filter((x) => dueInfo(x).soon).length;
  const target = people.find((p) => p.id === to);
  const days = Math.max(1, Math.round((+new Date(until) - +new Date(from)) / 86400000) + 1);
  const valid = !!target && until >= from;
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose]);
  const name = (p: Person) => (isAr ? p.nameAr ?? p.name : p.name);
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-[#0F1530]/45 backdrop-blur-[2px] cm-fade-in" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} dir={isAr ? 'rtl' : 'ltr'}>
      <div role="dialog" aria-modal="true" data-delegate-dialog className="w-full max-w-[560px] max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl pop-in">
        <div className="px-6 pt-6 pb-4 flex items-start gap-3.5">
          <span className="w-10 h-10 rounded-xl bg-[#EEF0FB] text-[#2A3466] flex items-center justify-center flex-shrink-0"><DelegateGlyph className="w-5 h-5" /></span>
          <div className="min-w-0">
            <h3 className="text-[18px] font-bold text-neutral-900">{t('Delegate my inbox', 'تفويض صندوق الوارد')}</h3>
            <p className="text-[12.5px] text-neutral-500 mt-0.5">{t('Your tasks move to a colleague for a period. You can cancel at any time and they come back to you.', 'تنتقل مهامك إلى زميل لفترة محددة. يمكنك الإلغاء في أي وقت لتعود إليك.')}</p>
          </div>
        </div>

        <div className="px-6 space-y-5">
          <div>
            <p className="text-[12.5px] font-semibold text-neutral-800 mb-2">{t('Delegate to', 'التفويض إلى')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {people.map((p) => (
                <label key={p.id} data-delegate-to={p.id} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${to === p.id ? 'border-[#2A3466] bg-[#F3F5FB] ring-2 ring-[#2A3466]/10' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                  <input type="radio" name="delegate-to" className="sr-only" checked={to === p.id} onChange={() => setTo(p.id)} />
                  <Avatar p={p} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-neutral-900 truncate">{name(p)}</span>
                    <span className="block text-[11.5px] text-neutral-500 truncate">{isAr ? p.roleAr : p.role} · {t(`${p.load} open`, `${p.load} مفتوحة`)}</span>
                  </span>
                  {to === p.id && <CheckIcon className="w-4 h-4 text-[#2A3466]" />}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="block text-[12.5px] font-semibold text-neutral-800 mb-1.5">{t('From', 'من')}</span>
              <input type="date" data-delegate-from value={from} min={isoDay(new Date())} onChange={(e) => setFrom(e.target.value)} className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-[13px]" /></label>
            <label className="block"><span className="block text-[12.5px] font-semibold text-neutral-800 mb-1.5">{t('Until', 'حتى')}</span>
              <input type="date" data-delegate-until value={until} min={from} onChange={(e) => setUntil(e.target.value)} className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-[13px]" /></label>
          </div>
          <label className="flex items-start gap-2.5 text-[13px] text-neutral-700 cursor-pointer">
            <input type="checkbox" className="mt-0.5 accent-[#2A3466]" checked={includeNew} onChange={(e) => setIncludeNew(e.target.checked)} />
            <span>{t('Also send new tasks that arrive during this period', 'إرسال المهام الجديدة التي تصل خلال هذه الفترة أيضاً')}</span>
          </label>

          {/* Summary */}
          <div className="rounded-xl bg-[#F3F5FB] border border-[#DADFF1] px-4 py-3.5" data-delegate-summary={moving.length}>
            <p className="text-[13.5px] text-[#1B2350]">
              <span className="font-bold tabular-nums">{moving.length}</span> {t('tasks will move to', 'مهام ستنتقل إلى')} <span className="font-semibold">{target ? name(target) : '—'}</span>
              <span className="text-[#4A5274]"> · {t(`${days} day${days > 1 ? 's' : ''}`, `${days} يوم`)}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px] font-semibold">
              {overdue > 0 && <span className="px-2 py-0.5 rounded-full bg-error-50 text-error-700 border border-error-100">{t(`${overdue} overdue`, `${overdue} متأخرة`)}</span>}
              {dueSoon > 0 && <span className="px-2 py-0.5 rounded-full bg-warning-50 text-warning-800 border border-warning-100">{t(`${dueSoon} due within a day`, `${dueSoon} تستحق خلال يوم`)}</span>}
              {target && <span className="px-2 py-0.5 rounded-full bg-white text-[#4A5274] border border-[#DADFF1]">{t(`${name(target)} has ${target.load} open today`, `لدى ${name(target)} ${target.load} مفتوحة اليوم`)}</span>}
            </div>
            {moving.length > 0 && (
              <ul className="mt-2.5 space-y-1 max-h-[120px] overflow-y-auto">
                {moving.slice(0, 6).map((x) => <li key={x.id} className="text-[12px] text-[#4A5274] truncate"><span className="tabular-nums text-[#8E97B8] me-1.5" dir="ltr">{x.entity.ref}</span>{isAr ? x.titleAr : x.titleEn}</li>)}
                {moving.length > 6 && <li className="text-[12px] text-[#8E97B8]">{t(`+${moving.length - 6} more`, `+${moving.length - 6} أخرى`)}</li>}
              </ul>
            )}
          </div>
        </div>

        <div className="px-6 py-5 mt-1 flex items-center justify-end gap-2">
          <button type="button" data-delegate-apply disabled={!valid} onClick={() => { if (target) { delegate({ to: target, from: new Date(from).toISOString(), until: new Date(until).toISOString(), includeNew }); onClose(); toast(t(`${moving.length} tasks delegated to ${target.name}`, `فُوّضت ${moving.length} مهام إلى ${target.nameAr ?? target.name}`)); } }}
            className="h-10 px-5 rounded-lg bg-[#2A3466] hover:bg-[#1F2753] text-white text-[13px] font-semibold disabled:opacity-40">{t('Delegate inbox', 'تفويض الوارد')}</button>
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg text-[13px] font-semibold text-neutral-600 hover:bg-neutral-100">{t('Cancel', 'إلغاء')}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Banner while delegated ──────────────────────────────────────────────── */
export function DelegationBanner({ isAr, t }: { isAr: boolean; t: T }) {
  const { delegation, cancelDelegation, tasks } = useInbox();
  if (!delegation) return null;
  const p = delegation.to;
  const n = tasks.filter((x) => x.delegatedTo).length;
  return (
    <div className="mt-3 rounded-xl bg-[#2A3466] text-white px-3.5 py-3 flex items-center gap-3 relative overflow-hidden" data-delegation-banner>
      <span className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 8px, transparent 8px 16px)' }} />
      <Avatar p={p} className="w-8 h-8 text-[11px] bg-white !text-[#2A3466] relative" />
      <div className="min-w-0 flex-1 relative">
        <p className="text-[13px] font-semibold leading-tight truncate">{t(`Delegated to ${p.name}`, `مفوّض إلى ${p.nameAr ?? p.name}`)}</p>
        <p className="text-[11.5px] text-white/70 mt-0.5">{t(`Until ${fmtDate(delegation.until, isAr)} · ${n} tasks with them`, `حتى ${fmtDate(delegation.until, isAr)} · ${n} مهام لديه`)}{delegation.includeNew ? t(' · new tasks too', ' · والمهام الجديدة') : ''}</p>
      </div>
      <button type="button" data-delegation-cancel onClick={() => { cancelDelegation(); toast(t('Delegation cancelled — tasks are back in your inbox', 'أُلغي التفويض — عادت المهام إلى صندوقك'), 'info'); }} className="relative h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-[12px] font-semibold whitespace-nowrap">{t('Cancel delegation', 'إلغاء التفويض')}</button>
    </div>
  );
}

/* ── TL view: unassigned requests waiting in the team queue ───────────────── */
export function TeamQueueBanner({ isAr, t, onOpen }: { isAr: boolean; t: T; onOpen: () => void }) {
  const { teamCounts, persona } = useInbox();
  const n = teamCounts['needs-action'];
  if (persona !== 'tl' || !n) return null;
  const late = teamCounts.overdue;
  return (
    <div className="mt-3 rounded-xl border border-warning-200 bg-warning-50 px-3.5 py-3 flex items-center gap-3" data-team-banner={n}>
      <span className="w-8 h-8 rounded-lg bg-white border border-warning-200 text-warning-700 flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M19 8v6M16 11h6" /></svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-warning-900">{t(`${n} unassigned request${n > 1 ? 's' : ''} in the team queue`, `${n} طلبات غير مسندة في قائمة الفريق`)}</p>
        <p className="text-[11.5px] text-warning-800/80">{late ? t(`${late} overdue · ${isAr ? TEAM_NAME.ar : TEAM_NAME.en}`, `${late} متأخرة · ${TEAM_NAME.ar}`) : (isAr ? TEAM_NAME.ar : TEAM_NAME.en)}</p>
      </div>
      <button type="button" data-team-banner-open onClick={onOpen} className="h-8 px-3 rounded-lg bg-white border border-warning-300 text-warning-900 text-[12px] font-semibold hover:bg-warning-100 whitespace-nowrap">{t('Assign now', 'إسناد الآن')}</button>
    </div>
  );
}
