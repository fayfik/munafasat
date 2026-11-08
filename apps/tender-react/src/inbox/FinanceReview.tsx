// Finance review widgets for the Inbox "Required action" tab:
//  • GlReview      — accounting classification per BOQ line, Accept / Modify, mismatches first
//  • AssetsReview  — asset lines only: Asset / Non-asset, capitalisation, "Group with…"
//  • ChangesReview — "Changes since your review" for a request GL already approved
import { useMemo, useState } from 'react';
import type { Task, FinLine, AssetDecision, FinChange } from './types';
import { useInbox, assetLinesOf } from './store';
import { CheckIcon, AlertTriangleIcon, CheckCircleIcon, PencilIcon } from '../components/Icons';
import {
  PURCHASE_TYPES, COMPONENT_ROLES, MATERIAL_GROUPS, mgByCode, glFor, accountingIssues, assetFlagOf, type FinPurchaseType,
} from '../lib/accounting';
import type { BOQRow } from '../types/tender';

type T = (en: string, ar: string) => string;
const sar = (n: number) => 'SAR ' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
/** Accounting checks reuse the BOQ rules — a FinLine is shaped like a BOQ row for them. */
const asRow = (l: FinLine): BOQRow => ({ id: l.key, projectItem: '', itemName: l.itemEn, itemDescription: l.descEn ?? '', unitOfMeasure: l.unit, quantity: '', unitPrice: '', deliveryDate: '', finPurchaseType: l.finPurchaseType, materialGroup: l.materialGroup, glSubOverride: l.glSubOverride, assetFlag: l.assetFlag });
export const lineIssues = (l: FinLine) => accountingIssues(asRow(l));
const flagOf = (l: FinLine) => assetFlagOf(asRow(l));

/** Draft for "Return to requester" — lists the lines that still disagree. */
export function glReturnDraft(task: Task, isAr: boolean): string {
  const flagged = (task.finLines ?? []).map((l) => ({ l, i: lineIssues(l) })).filter((x) => x.i.length && task.techDecisions?.[`gl-${x.l.key}`] !== 'modified');
  if (!flagged.length) return '';
  return isAr
    ? `يرجى مراجعة التصنيف المحاسبي للبنود التالية وتصحيحه:\n${flagged.map(({ l, i }) => `• ${l.itemAr}: ${i.map((x) => x.ar).join('؛ ')}`).join('\n')}`
    : `Please review and correct the accounting classification of these lines:\n${flagged.map(({ l, i }) => `• ${l.itemEn}: ${i.map((x) => x.en).join('; ')}`).join('\n')}`;
}

function Progress({ title, sub, done, total, onAll, allLabel, t, readOnly, testId }: { title: string; sub: string; done: number; total: number; onAll?: () => void; allLabel: string; t: T; readOnly?: boolean; testId: string }) {
  return (
    <div className="rounded-xl border border-[#C9DBEC] bg-gradient-to-br from-[#F3F8FC] to-white px-5 py-4 flex items-center gap-4 flex-wrap">
      <div className="min-w-[280px] flex-1">
        <p className="text-[14px] font-bold text-neutral-900">{title}</p>
        <p className="text-[12.5px] text-neutral-600 mt-0.5">{sub}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 w-48 rounded-full bg-neutral-200 overflow-hidden"><div className="h-full bg-success-500 rounded-full transition-all" style={{ width: `${(done / Math.max(1, total)) * 100}%` }} /></div>
          <span className="text-[12px] font-semibold text-neutral-700" data-fin-progress={`${done}/${total}`}>{t(`${done} of ${total} lines reviewed`, `${done} من ${total} بنود تمت مراجعتها`)}</span>
        </div>
      </div>
      {!readOnly && onAll && done < total && (
        <button type="button" onClick={onAll} data-fin-all={testId}
          className="h-9 px-3.5 rounded-lg border border-success-300 bg-white text-success-700 text-[12.5px] font-semibold hover:bg-success-50 inline-flex items-center gap-1.5">
          <CheckIcon className="w-4 h-4" />{allLabel}
        </button>
      )}
    </div>
  );
}

function StateBadge({ s, t }: { s?: 'accepted' | 'modified'; t: T }) {
  if (!s) return null;
  return s === 'accepted'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success-50 text-success-700 border border-success-200"><CheckIcon className="w-3 h-3" />{t('Accepted', 'مقبول')}</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EEF4FB] text-[#21507A] border border-[#C9DBEC]"><PencilIcon className="w-3 h-3" />{t('Modified', 'معدّل')}</span>;
}

/* ═══════════════════════════════ GL ═══════════════════════════════ */
export function GlReview({ task, isAr, t, readOnly, onDecide, onUpdateLine, onAcceptAll }: {
  task: Task; isAr: boolean; t: T; readOnly?: boolean;
  onDecide: (key: string, d: 'accepted' | 'modified' | null) => void;
  onUpdateLine: (key: string, patch: Partial<FinLine>) => void;
  onAcceptAll: (keys: string[]) => void;
}) {
  const { tasks } = useInbox();
  const lines = task.finLines ?? [];
  const dec = task.techDecisions ?? {};
  const [filter, setFilter] = useState<'all' | 'gl' | 'issues'>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ pt: FinPurchaseType; mg: string; sub: string }>({ pt: 'service', mg: '', sub: '' });
  const L = (o?: { en: string; ar: string }) => (o ? (isAr ? o.ar : o.en) : '—');
  // Mismatches first, then by original order.
  const sorted = useMemo(() => [...lines].sort((a, b) => Number(lineIssues(b).length > 0) - Number(lineIssues(a).length > 0) || lines.indexOf(a) - lines.indexOf(b)), [lines]);
  const glOwns = (l: FinLine) => flagOf(l) !== 'asset' || l.finPurchaseType === 'service-asset';
  const shown = sorted.filter((l) => filter === 'all' || (filter === 'gl' ? glOwns(l) : lineIssues(l).length > 0));
  const keys = lines.map((l) => `gl-${l.key}`);
  const decided = keys.filter((k) => dec[k]).length;
  const issuesCount = lines.filter((l) => lineIssues(l).length).length;
  // Assets' decisions on the same request (mixed flow) — replaces the manual hand-over.
  const assetsTask = tasks.find((x) => x.finReview === 'assets' && x.entity.ref === task.entity.ref);
  const assetDecs = Object.entries(assetsTask?.finAssetDecisions ?? {}).filter(([, d]) => d.confirmed);
  const startEdit = (l: FinLine) => { setDraft({ pt: l.finPurchaseType, mg: l.materialGroup, sub: l.glSubOverride ?? '' }); setEditing(l.key); };
  const segBtn = (k: typeof filter, label: string, n: number) => (
    <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k} data-gl-filter={k}
      className={`px-3 py-1.5 text-[12px] font-semibold rounded-md ${filter === k ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}>
      {label} <span className="tabular-nums text-neutral-400">{n}</span>
    </button>
  );
  return (
    <div className="space-y-5" data-gl-review>
      <Progress testId="gl" t={t} readOnly={readOnly} done={decided} total={keys.length}
        title={t('Review the accounting classification', 'مراجعة التصنيف المحاسبي')}
        sub={t('Each BOQ line was classified by AI when the request was created. Accept it, or Modify the Purchase type, Material group or sub-account. Lines that disagree are shown first.', 'صُنّف كل بند بالذكاء الاصطناعي عند إنشاء الطلب. اقبله أو عدّل نوع الشراء أو مجموعة المواد أو الحساب الفرعي. تظهر البنود غير المتسقة أولاً.')}
        allLabel={t('Accept all remaining', 'قبول جميع البنود المتبقية')}
        onAll={() => onAcceptAll(keys.filter((k) => !dec[k]))} />

      {/* Assets team decisions (mixed requests) */}
      {assetsTask && (
        <div data-assets-decided className={`rounded-xl border px-5 py-3.5 ${assetDecs.length ? 'border-[#C9DBEC] bg-[#F3F8FC]' : 'border-neutral-200 bg-white'}`}>
          <p className="text-[13px] font-semibold text-neutral-800">{assetDecs.length ? t('Assets decided:', 'قرار فريق الأصول:') : t('Assets review in progress', 'مراجعة الأصول قيد التنفيذ')}</p>
          {assetDecs.length ? (
            <ul className="mt-1.5 space-y-1">
              {assetDecs.map(([k, d]) => {
                const l = (assetsTask.finLines ?? []).find((x) => x.key === k);
                const grp = d.groupWith ? (assetsTask.finLines ?? []).find((x) => x.key === d.groupWith) : undefined;
                return (
                  <li key={k} className="text-[12.5px] text-neutral-700">
                    <span className="font-semibold">{L(l ? { en: l.itemEn, ar: l.itemAr } : undefined)}</span>{' — '}
                    {d.flag === 'asset' ? (d.capitalisation === 'auc' ? t('Asset Under Construction', 'أصل تحت الإنشاء') : t('Direct asset', 'أصل مباشر')) : t('Not an asset', 'ليس أصلاً')}
                    {grp && <span className="text-neutral-500"> · {t('grouped with', 'مجمّع مع')} {L({ en: grp.itemEn, ar: grp.itemAr })}</span>}
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-[12.5px] text-neutral-500 mt-0.5">{t(`${assetsTask.assignee.name} is reviewing the asset lines; their decisions will appear here.`, `${assetsTask.assignee.nameAr ?? assetsTask.assignee.name} يراجع بنود الأصول؛ ستظهر قراراتهم هنا.`)}</p>}
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-3.5 border-b border-neutral-200">
          <div>
            <p className="text-[14px] font-semibold text-neutral-900">{t('BOQ lines — accounting', 'بنود جدول الكميات — المحاسبة')}</p>
            <p className="text-[12px] text-neutral-500">{issuesCount ? t(`${issuesCount} line(s) disagree and are highlighted.`, `${issuesCount} بند غير متسق ومُبرز.`) : t('All lines are consistent.', 'جميع البنود متسقة.')}</p>
          </div>
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-neutral-100 p-0.5">
            {segBtn('all', t('All lines', 'كل البنود'), lines.length)}
            {segBtn('gl', t('Lines GL owns', 'بنود دفتر الأستاذ'), lines.filter(glOwns).length)}
            {segBtn('issues', t('To check', 'للمراجعة'), issuesCount)}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-start">
            <thead>
              <tr className="bg-neutral-50 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                <th className="px-4 py-2.5 text-start">{t('Item', 'البند')}</th>
                <th className="px-3 py-2.5 text-start">{t('Purchase type', 'نوع الشراء')}</th>
                <th className="px-3 py-2.5 text-start">{t('Material group', 'مجموعة المواد')}</th>
                <th className="px-3 py-2.5 text-start">{t('GL account · main / sub', 'حساب الأستاذ · رئيسي / فرعي')}</th>
                <th className="px-4 py-2.5 text-end">{t('Review', 'المراجعة')}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((l) => {
                const k = `gl-${l.key}`;
                const issues = lineIssues(l);
                const mg = mgByCode(l.materialGroup);
                const { glMain, glSub } = glFor(l.materialGroup);
                const isEditing = editing === l.key;
                if (isEditing) {
                  const dmg = mgByCode(draft.mg);
                  const dgl = glFor(draft.mg);
                  return (
                    <tr key={l.key} data-gl-row={l.key} data-editing={l.key} className="bg-[#F3F8FC]">
                      <td colSpan={5} className="px-4 py-3.5 border-t border-[#C9DBEC]">
                        <p className="text-[13px] font-semibold text-neutral-900 mb-2.5">{L({ en: l.itemEn, ar: l.itemAr })}</p>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <label className="block"><span className="block text-[11.5px] font-medium text-neutral-600 mb-1">{t('Purchase type', 'نوع الشراء')}</span>
                            <select data-edit-pt value={draft.pt} onChange={(e) => setDraft((d) => ({ ...d, pt: e.target.value as FinPurchaseType }))} className="h-9 w-full rounded-lg border border-neutral-300 bg-white px-2 text-[13px]">
                              {(Object.keys(PURCHASE_TYPES) as FinPurchaseType[]).map((p) => <option key={p} value={p}>{L(PURCHASE_TYPES[p])}</option>)}
                            </select></label>
                          <label className="block"><span className="block text-[11.5px] font-medium text-neutral-600 mb-1">{t('Material group', 'مجموعة المواد')}</span>
                            <select data-edit-mg value={draft.mg} onChange={(e) => setDraft((d) => ({ ...d, mg: e.target.value }))} className="h-9 w-full rounded-lg border border-neutral-300 bg-white px-2 text-[13px]">
                              {MATERIAL_GROUPS.map((m) => <option key={m.code} value={m.code}>{`${L(m)} · ${m.code}`}</option>)}
                            </select></label>
                          <div><span className="block text-[11.5px] font-medium text-neutral-600 mb-1">{t('GL main (follows Material group)', 'الحساب الرئيسي (يتبع مجموعة المواد)')}</span>
                            <div className="h-9 rounded-lg border border-neutral-200 bg-neutral-100 px-2.5 text-[13px] text-neutral-500 flex items-center truncate">{dgl.glMain ? `${dgl.glMain.code} · ${L(dgl.glMain)}` : '—'}</div></div>
                          <label className="block"><span className="block text-[11.5px] font-medium text-neutral-600 mb-1">{t('GL sub-account', 'الحساب الفرعي')}</span>
                            {dgl.glSub
                              ? <div className="h-9 rounded-lg border border-neutral-200 bg-neutral-100 px-2.5 text-[13px] text-neutral-500 flex items-center truncate">{`${dgl.glSub.code} · ${L(dgl.glSub)}`}</div>
                              : <input data-edit-sub value={draft.sub} onChange={(e) => setDraft((d) => ({ ...d, sub: e.target.value }))} placeholder={t(`e.g. ${dmg?.glMain.code ?? '1290'}-01`, `مثال: ${dmg?.glMain.code ?? '1290'}-01`)} className="h-9 w-full rounded-lg border border-warning-300 bg-white px-2.5 text-[13px]" />}
                          </label>
                        </div>
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <button type="button" onClick={() => setEditing(null)} className="h-8 px-3 rounded-lg border border-neutral-300 bg-white text-[12.5px] font-medium text-neutral-600 hover:bg-neutral-50">{t('Cancel', 'إلغاء')}</button>
                          <button type="button" data-save={l.key} onClick={() => { onUpdateLine(l.key, { finPurchaseType: draft.pt, materialGroup: draft.mg, glSubOverride: dgl.glSub ? undefined : (draft.sub.trim() || undefined) }); setEditing(null); }}
                            className="h-8 px-3.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-semibold hover:bg-brand-700">{t('Save', 'حفظ')}</button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={l.key} data-gl-row={l.key} data-state={dec[k] ?? ''} data-issue={issues.length ? 'yes' : 'no'}
                    className={`border-t border-neutral-100 align-top ${issues.length ? 'bg-warning-50/50' : ''}`}>
                    <td className={`px-4 py-3 ${issues.length ? 'border-s-[3px] border-s-warning-400' : ''}`}>
                      <p className="text-[13px] font-semibold text-neutral-900">{L({ en: l.itemEn, ar: l.itemAr })}</p>
                      <p className="text-[11.5px] text-neutral-500">{l.qty} {l.unit} · <span dir="ltr">{sar(l.amount)}</span>{flagOf(l) === 'asset' && <span className="ms-1.5 px-1.5 py-0.5 rounded bg-[#EEF4FB] text-[#21507A] text-[10px] font-semibold">{t('Asset', 'أصل')}</span>}</p>
                      {issues.map((i) => <p key={i.code} className="mt-1 flex items-start gap-1 text-[11.5px] text-warning-800"><AlertTriangleIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />{isAr ? i.ar : i.en}</p>)}
                    </td>
                    <td className="px-3 py-3 text-[12.5px] text-neutral-700">{L(PURCHASE_TYPES[l.finPurchaseType])}</td>
                    <td className="px-3 py-3 text-[12.5px] text-neutral-700">{mg ? <>{L(mg)}<span className="block text-[11px] text-neutral-400">{mg.code}</span></> : '—'}</td>
                    <td className="px-3 py-3 text-[12.5px] text-neutral-700 tabular-nums">
                      {glMain ? <span className="block" title={L(glMain)}>{glMain.code} <span className="text-[11px] text-neutral-400">{L(glMain)}</span></span> : '—'}
                      <span className="block mt-0.5">{glSub ? <span title={L(glSub)}>{glSub.code} <span className="text-[11px] text-neutral-400">{L(glSub)}</span></span> : l.glSubOverride ?? <span className="text-warning-700 font-medium">{t('Sub-account missing', 'الحساب الفرعي غير محدد')}</span>}</span>
                    </td>
                    <td className="px-4 py-3 text-end">
                      {dec[k] ? (
                        <span className="inline-flex items-center gap-2"><StateBadge s={dec[k]} t={t} />
                          {!readOnly && <button type="button" onClick={() => onDecide(k, null)} className="text-[11.5px] font-medium text-neutral-500 hover:text-neutral-800 underline-offset-2 hover:underline">{t('Undo', 'تراجع')}</button>}
                        </span>
                      ) : !readOnly && (
                        <span className="inline-flex flex-col items-end gap-1.5">
                          <button type="button" data-accept={k} onClick={() => onDecide(k, 'accepted')} className="h-8 px-3 rounded-lg border border-success-300 bg-white text-success-700 text-[12px] font-semibold hover:bg-success-50 inline-flex items-center gap-1"><CheckIcon className="w-3.5 h-3.5" />{t('Accept', 'قبول')}</button>
                          <button type="button" data-modify={k} onClick={() => startEdit(l)} className="h-8 px-3 rounded-lg border border-neutral-300 bg-white text-neutral-700 text-[12px] font-semibold hover:bg-neutral-50 inline-flex items-center gap-1"><PencilIcon className="w-3.5 h-3.5" />{t('Modify', 'تعديل')}</button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!shown.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-[13px] text-neutral-500">{t('No lines in this view.', 'لا توجد بنود في هذا العرض.')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ Assets ═══════════════════════════════ */
export function AssetsReview({ task, isAr, t, readOnly, onDecide, onConfirmAll }: {
  task: Task; isAr: boolean; t: T; readOnly?: boolean;
  onDecide: (key: string, d: AssetDecision) => void;
  onConfirmAll: (patch: Record<string, AssetDecision>) => void;
}) {
  const lines = assetLinesOf(task);
  const all = task.finLines ?? [];
  const dec = task.finAssetDecisions ?? {};
  const L = (o?: { en: string; ar: string }) => (o ? (isAr ? o.ar : o.en) : '—');
  // Suggested treatment: implementation / installation building up an asset → AUC.
  const suggest = (l: FinLine): AssetDecision => ({ flag: 'asset', capitalisation: l.componentRole === 'implementation' || l.componentRole === 'installation' ? 'auc' : 'direct', confirmed: false });
  const cur = (l: FinLine) => dec[l.key] ?? suggest(l);
  const done = lines.filter((l) => dec[l.key]?.confirmed).length;
  const roles = all.reduce<Record<string, number>>((m, l) => { const r = l.componentRole ?? 'none'; m[r] = (m[r] ?? 0) + 1; return m; }, {});
  const seg = (on: boolean, disabled?: boolean) => `px-3 py-1.5 text-[12px] font-semibold ${on ? 'bg-brand-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`;
  return (
    <div className="space-y-5" data-assets-review>
      <Progress testId="assets" t={t} readOnly={readOnly} done={done} total={lines.length}
        title={t('Decide the asset treatment', 'تحديد معالجة الأصول')}
        sub={t('Only lines flagged as assets are shown. Confirm Asset / Non-asset, how it is capitalised, and which components form one asset.', 'تُعرض البنود المصنفة كأصول فقط. أكّد أصل / غير أصل وطريقة الرسملة والمكونات التي تشكل أصلاً واحداً.')}
        allLabel={t('Confirm all as suggested', 'تأكيد الكل كما هو مقترح')}
        onAll={() => onConfirmAll(Object.fromEntries(lines.filter((l) => !dec[l.key]?.confirmed).map((l) => [l.key, { ...cur(l), confirmed: true }])))} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="space-y-3">
          {lines.map((l) => {
            const d = cur(l);
            const confirmed = !!dec[l.key]?.confirmed;
            const set = (p: Partial<AssetDecision>) => onDecide(l.key, { ...d, ...p, confirmed: false });
            const others = lines.filter((o) => o.key !== l.key);
            return (
              <div key={l.key} data-asset-line={l.key} data-confirmed={confirmed ? 'yes' : 'no'} className={`rounded-xl border bg-white px-5 py-4 ${confirmed ? 'border-success-200' : 'border-neutral-200'}`}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-neutral-900">{L({ en: l.itemEn, ar: l.itemAr })}</p>
                    <p className="text-[12px] text-neutral-500 mt-0.5">{l.qty} {l.unit} · <span dir="ltr">{sar(l.amount)}</span> · {L(PURCHASE_TYPES[l.finPurchaseType])} · {L(mgByCode(l.materialGroup))}
                      {l.componentRole && <span className="ms-1.5 px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 text-[10.5px] font-semibold">{L(COMPONENT_ROLES[l.componentRole])}</span>}</p>
                  </div>
                  {confirmed && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success-50 text-success-700 border border-success-200"><CheckCircleIcon className="w-3 h-3" />{t('Confirmed', 'مؤكد')}</span>}
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span className="block text-[11.5px] font-medium text-neutral-600 mb-1">{t('Asset / Non-asset', 'أصل / غير أصل')}</span>
                    <div className="inline-flex rounded-lg border border-neutral-300 overflow-hidden" role="radiogroup">
                      <button type="button" disabled={readOnly} role="radio" aria-checked={d.flag === 'asset'} data-flag="asset" onClick={() => set({ flag: 'asset' })} className={seg(d.flag === 'asset')}>{t('Asset', 'أصل')}</button>
                      <button type="button" disabled={readOnly} role="radio" aria-checked={d.flag === 'non-asset'} data-flag="non-asset" onClick={() => set({ flag: 'non-asset', groupWith: undefined })} className={`${seg(d.flag === 'non-asset')} border-s border-neutral-300`}>{t('Non-asset', 'غير أصل')}</button>
                    </div>
                  </div>
                  <div>
                    <span className="block text-[11.5px] font-medium text-neutral-600 mb-1">{t('Capitalisation', 'الرسملة')}</span>
                    <div className="inline-flex rounded-lg border border-neutral-300 overflow-hidden" role="radiogroup">
                      <button type="button" disabled={readOnly || d.flag !== 'asset'} role="radio" aria-checked={d.capitalisation === 'direct'} data-cap="direct" onClick={() => set({ capitalisation: 'direct' })} className={seg(d.capitalisation === 'direct' && d.flag === 'asset', d.flag !== 'asset')}>{t('Direct asset', 'أصل مباشر')}</button>
                      <button type="button" disabled={readOnly || d.flag !== 'asset'} role="radio" aria-checked={d.capitalisation === 'auc'} data-cap="auc" title={t('Asset Under Construction', 'أصل تحت الإنشاء')} onClick={() => set({ capitalisation: 'auc' })} className={`${seg(d.capitalisation === 'auc' && d.flag === 'asset', d.flag !== 'asset')} border-s border-neutral-300`}>{t('AUC', 'تحت الإنشاء')}</button>
                    </div>
                  </div>
                  <label className="block">
                    <span className="block text-[11.5px] font-medium text-neutral-600 mb-1">{t('Group with…', 'تجميع مع…')}</span>
                    <select data-group={l.key} disabled={readOnly || d.flag !== 'asset'} value={d.groupWith ?? ''} onChange={(e) => set({ groupWith: e.target.value || undefined })}
                      className="h-9 w-full rounded-lg border border-neutral-300 bg-white px-2 text-[13px] disabled:bg-neutral-100 disabled:text-neutral-400">
                      <option value="">{t('Separate asset', 'أصل مستقل')}</option>
                      {others.map((o) => <option key={o.key} value={o.key}>{L({ en: o.itemEn, ar: o.itemAr })}</option>)}
                    </select>
                  </label>
                </div>
                {!readOnly && !confirmed && (
                  <div className="mt-3 flex justify-end">
                    <button type="button" data-confirm={l.key} onClick={() => onDecide(l.key, { ...d, confirmed: true })}
                      className="h-8 px-3.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-semibold hover:bg-brand-700 inline-flex items-center gap-1.5"><CheckIcon className="w-3.5 h-3.5" />{t('Confirm', 'تأكيد')}</button>
                  </div>
                )}
              </div>
            );
          })}
          {!lines.length && <p className="text-[13px] text-neutral-500">{t('This request has no asset lines.', 'لا يحتوي هذا الطلب على بنود أصول.')}</p>}
        </div>

        {/* Project context */}
        <aside className="rounded-xl border border-neutral-200 bg-white px-5 py-4 xl:sticky xl:top-[120px]" data-assets-context>
          <p className="text-[13px] font-semibold text-neutral-900">{t('Project context', 'سياق المشروع')}</p>
          <p className="mt-1.5 text-[12.5px] text-neutral-600 leading-relaxed">{isAr ? task.rfp?.scopeAr : task.rfp?.scopeEn}</p>
          <p className="mt-4 text-[11.5px] font-semibold text-neutral-500 uppercase tracking-wide">{t('Component roles (all lines)', 'أدوار المكونات (كل البنود)')}</p>
          <ul className="mt-1.5 space-y-1">
            {Object.entries(roles).map(([r, n]) => (
              <li key={r} className="flex items-center justify-between text-[12.5px] text-neutral-700">
                <span>{r === 'none' ? t('Not specified', 'غير محدد') : L(COMPONENT_ROLES[r as keyof typeof COMPONENT_ROLES])}</span><span className="tabular-nums text-neutral-500">{n}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11.5px] font-semibold text-neutral-500 uppercase tracking-wide">{t('Other lines in this request', 'بنود أخرى في هذا الطلب')}</p>
          <ul className="mt-1.5 space-y-1">
            {all.filter((l) => !lines.includes(l)).map((l) => <li key={l.key} className="text-[12px] text-neutral-500 truncate">{L({ en: l.itemEn, ar: l.itemAr })} · {L(PURCHASE_TYPES[l.finPurchaseType])}</li>)}
          </ul>
        </aside>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ Changes since your review ═══════════════════════════════ */
const IMPACT: Record<FinChange['impact'], { en: string; ar: string; cls: string; hint: [string, string] }> = {
  rereview: { en: 'Re-review required', ar: 'تلزم إعادة المراجعة', cls: 'bg-error-50 text-error-700 border-error-200', hint: ['Material group, sub-account, asset flag or Purchase type changed.', 'تغيّرت مجموعة المواد أو الحساب الفرعي أو تصنيف الأصل أو نوع الشراء.'] },
  decide:   { en: 'Finance to decide', ar: 'قرار المالية', cls: 'bg-warning-50 text-warning-800 border-warning-200', hint: ['Quantity changes or new items — decide whether they need another look.', 'تغييرات الكمية أو بنود جديدة — قرر ما إذا كانت تحتاج إلى مراجعة.'] },
  info:     { en: 'Informational', ar: 'للعلم', cls: 'bg-neutral-100 text-neutral-600 border-neutral-200', hint: ['Scope wording only — no accounting impact.', 'صياغة النطاق فقط — لا أثر محاسبي.'] },
};
export function ChangesReview({ task, isAr, t, readOnly, onNoReReview, onReopen }: { task: Task; isAr: boolean; t: T; readOnly?: boolean; onNoReReview: () => void; onReopen: () => void }) {
  const changes = task.finChanges ?? [];
  const reviewed = task.activity.find((a) => a.kind === 'decision');
  const order: FinChange['impact'][] = ['rereview', 'decide', 'info'];
  const n = (k: FinChange['impact']) => changes.filter((c) => c.impact === k).length;
  return (
    <div className="space-y-5" data-changes-review>
      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200 flex items-start gap-4 flex-wrap">
          <div className="min-w-[260px] flex-1">
            <p className="text-[15px] font-bold text-neutral-900">{t('Changes since your review', 'التغييرات منذ مراجعتك')}</p>
            <p className="text-[12.5px] text-neutral-500 mt-0.5">
              {reviewed ? t(`You approved this request on ${new Date(reviewed.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}. ${changes.length} changes were made after that.`, `اعتمدت هذا الطلب في ${new Date(reviewed.at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}. أُجري ${changes.length} تغييرات بعد ذلك.`) : ''}
            </p>
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              {order.filter((k) => n(k)).map((k) => <span key={k} data-impact-count={k} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11.5px] font-semibold ${IMPACT[k].cls}`}>{n(k)} · {isAr ? IMPACT[k].ar : IMPACT[k].en}</span>)}
            </div>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <button type="button" data-no-rereview onClick={onNoReReview} className="h-9 px-3.5 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700">{t('No re-review needed', 'لا يلزم إعادة المراجعة')}</button>
              <button type="button" data-reopen onClick={onReopen} className="h-9 px-3.5 rounded-lg border border-neutral-300 bg-white text-neutral-800 text-[13px] font-semibold hover:bg-neutral-50">{t('Re-open my review', 'إعادة فتح مراجعتي')}</button>
            </div>
          )}
        </div>
        {order.filter((k) => n(k)).map((k) => (
          <div key={k} className="border-b last:border-b-0 border-neutral-100">
            <div className="px-5 pt-3.5 pb-1.5 flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${IMPACT[k].cls}`}>{isAr ? IMPACT[k].ar : IMPACT[k].en}</span>
              <span className="text-[11.5px] text-neutral-500">{isAr ? IMPACT[k].hint[1] : IMPACT[k].hint[0]}</span>
            </div>
            <table className="w-full text-start">
              <tbody>
                {changes.filter((c) => c.impact === k).map((c) => (
                  <tr key={c.id} data-change={c.id} className="align-top">
                    <td className="ps-5 pe-3 py-2 w-[30%] text-[13px] font-semibold text-neutral-800">{isAr ? c.lineAr : c.lineEn}<span className="block text-[11.5px] font-normal text-neutral-500">{isAr ? c.fieldAr : c.fieldEn}</span></td>
                    <td className="px-3 py-2 text-[12.5px] text-neutral-500 line-through decoration-neutral-300 w-[32%]">{c.oldV}</td>
                    <td className="pe-5 ps-3 py-2 text-[12.5px] font-semibold text-neutral-900"><span className="text-neutral-300 me-1.5">→</span>{c.newV}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
