// Finance review widgets for the Inbox "Required action" tab:
//  • GlReview      — accounting classification per BOQ line, Accept / Modify, mismatches first
//  • AssetsReview  — asset lines only: Asset / Non-asset, capitalisation, "Group with…"
//  • ChangesReview — "Changes since your review" for a request GL already approved
import { Fragment, useMemo, useState } from 'react';
import type { Task, FinLine, AssetDecision, FinChange } from './types';
import { useInbox, assetLinesOf, nonAssetLinesOf } from './store';
import { CheckIcon, AlertTriangleIcon, CheckCircleIcon, PencilIcon } from '../components/Icons';
import {
  PURCHASE_TYPES, COMPONENT_ROLES, MATERIAL_GROUPS, mgByCode, glFor, accountingIssues, assetFlagOf, type FinPurchaseType,
} from '../lib/accounting';
import type { BOQRow } from '../types/tender';
import BoqLineDetails, { BoqViewButton, useBoqOpen, type BoqLineView } from '../components/BoqLineDetails';

/** BOQ line drawer content for finance lines (adds the accounting fields). */
function finViews(lines: FinLine[], task: Task, isAr: boolean, t: (en: string, ar: string) => string): BoqLineView[] {
  const L = (o?: { en: string; ar: string }) => (o ? (isAr ? o.ar : o.en) : '');
  return lines.map((l) => {
    const src = task.rfp?.boq[(l.no ?? 1) - 1];
    const { glMain, glSub } = glFor(l.materialGroup);
    return {
      name: isAr ? l.itemAr : l.itemEn, description: (isAr ? l.descAr : l.descEn) ?? undefined,
      category: src?.category ? { label: src.category === 'Service' ? t('Service', 'خدمة') : t('Material', 'مواد'), tone: src.category === 'Service' ? 'service' : 'material' } : undefined,
      budget: src ? ((isAr ? src.budgetAr : src.budgetEn) ?? undefined) : undefined,
      qty: l.qty, unit: l.unit, unitPrice: l.unitPrice, total: l.amount, delivery: src?.delivery,
      extra: [
        { label: t('Purchase type', 'نوع الشراء'), value: L(PURCHASE_TYPES[l.finPurchaseType]) },
        { label: t('Material group', 'مجموعة المواد'), value: mgByCode(l.materialGroup) ? `${L(mgByCode(l.materialGroup))} · ${l.materialGroup}` : '' },
        { label: t('GL account', 'حساب الأستاذ'), value: [glMain?.code, glSub?.code ?? l.glSubOverride].filter(Boolean).join(' / '), ltr: true },
        { label: t('Asset / Non-asset', 'أصل / غير أصل'), value: assetFlagOf(l as unknown as BOQRow) === 'asset' ? t('Asset', 'أصل') : t('Non-asset', 'غير أصل') },
      ],
    };
  });
}

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
          <span className="text-[12px] font-semibold text-neutral-700" data-fin-progress={`${done}/${total}`}>{t(`${done} of ${total} BOQ items reviewed`, `${done} من ${total} بنود تمت مراجعتها`)}</span>
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
  const boqOpen = useBoqOpen();
  const views = finViews(lines, task, isAr, t);
  const grand = lines.reduce((n, x) => n + x.amount, 0);
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
                    {d.promoted && <span className="text-[#21507A]"> · {t('moved to assets by the Assets team', 'نقله فريق الأصول إلى الأصول')}</span>}
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
            <p className="text-[14px] font-semibold text-neutral-900">{t('BOQ items — accounting', 'بنود جدول الكميات — المحاسبة')}</p>
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
                  <Fragment key={l.key}>
                  <tr data-gl-row={l.key} data-state={dec[k] ?? ''} data-issue={issues.length ? 'yes' : 'no'}
                    className={`border-t border-neutral-100 align-top ${issues.length ? 'bg-warning-50/50' : ''}`}>
                    <td className={`px-4 py-3 ${issues.length ? 'border-s-[3px] border-s-warning-400' : ''}`}>
                      <div className="flex items-start gap-1.5"><p className="flex-1 text-[13px] font-semibold text-neutral-900"><span className="text-neutral-400 font-medium me-1.5 tabular-nums">{l.no}.</span>{L({ en: l.itemEn, ar: l.itemAr })}</p>
                        <span className="-mt-1"><BoqViewButton index={lines.indexOf(l)} open={boqOpen.isOpen(lines.indexOf(l))} onClick={() => boqOpen.toggle(lines.indexOf(l))} label={t('View item details', 'عرض تفاصيل البند')} /></span></div>
                      {(l.descEn || l.descAr) && <p className="text-[11.5px] text-neutral-600">{isAr ? l.descAr : l.descEn}</p>}
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
                  {boqOpen.isOpen(lines.indexOf(l)) && <tr><td colSpan={5} className="p-0"><BoqLineDetails line={views[lines.indexOf(l)]} isAr={isAr} t={t} grandTotal={grand} /></td></tr>}
                  </Fragment>
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
export function AssetsReview({ task, isAr, t, readOnly, onDecide, onConfirmAll, onNonAssetsChecked }: {
  task: Task; isAr: boolean; t: T; readOnly?: boolean;
  onDecide: (key: string, d: AssetDecision | null) => void;
  onConfirmAll: (patch: Record<string, AssetDecision>) => void;
  onNonAssetsChecked: (v: boolean) => void;
}) {
  const lines = assetLinesOf(task);
  const nonAssets = nonAssetLinesOf(task);
  const [showNon, setShowNon] = useState(false);
  const checked = !!task.finNonAssetsChecked;
  const all = task.finLines ?? [];
  const boqOpen = useBoqOpen();
  const views = finViews(all, task, isAr, t);
  const grand = all.reduce((n, x) => n + x.amount, 0);
  const viewBtn = (l: FinLine) => <BoqViewButton index={all.indexOf(l)} open={boqOpen.isOpen(all.indexOf(l))} onClick={() => boqOpen.toggle(all.indexOf(l))} label={t('View item details', 'عرض تفاصيل البند')} />;
  const details = (l: FinLine) => boqOpen.isOpen(all.indexOf(l)) && <div className="mt-3 rounded-lg overflow-hidden border border-neutral-100"><BoqLineDetails line={views[all.indexOf(l)]} isAr={isAr} t={t} grandTotal={grand} /></div>;
  const dec = task.finAssetDecisions ?? {};
  const L = (o?: { en: string; ar: string }) => (o ? (isAr ? o.ar : o.en) : '—');
  // Suggested treatment: implementation / installation building up an asset → AUC.
  const suggest = (l: FinLine): AssetDecision => ({ flag: 'asset', capitalisation: l.componentRole === 'implementation' || l.componentRole === 'installation' ? 'auc' : 'direct', confirmed: false });
  const cur = (l: FinLine) => dec[l.key] ?? suggest(l);
  // Progress counts every BOQ item: confirmed asset items + the non-asset group once checked.
  const done = lines.filter((l) => dec[l.key]?.confirmed).length + (checked ? nonAssets.length : 0);
  const seg = (on: boolean, disabled?: boolean) => `px-3 py-1.5 text-[12px] font-semibold ${on ? 'bg-brand-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`;
  return (
    <div className="space-y-5" data-assets-review>
      <Progress testId="assets" t={t} readOnly={readOnly} done={done} total={all.length}
        title={t('Decide the asset treatment', 'تحديد معالجة الأصول')}
        sub={t('All BOQ items of the request. For items flagged as assets, confirm Asset / Non-asset, capitalisation and grouping. Then check the remaining items — mark any that should be an asset.', 'جميع بنود جدول الكميات في الطلب. للبنود المصنفة كأصول، أكّد أصل / غير أصل والرسملة والتجميع. ثم تحقق من البنود المتبقية — وحدد أي بند يجب أن يكون أصلاً.')}
        allLabel={t('Confirm all as suggested', 'تأكيد الكل كما هو مقترح')}
        onAll={lines.some((l) => !dec[l.key]?.confirmed) ? () => onConfirmAll(Object.fromEntries(lines.filter((l) => !dec[l.key]?.confirmed).map((l) => [l.key, { ...cur(l), confirmed: true }]))) : undefined} />

      <div>
        <div className="space-y-3">
          <p className="text-[13px] font-semibold text-neutral-700" data-assets-heading>{t(`Flagged as assets — ${lines.length} of ${all.length} BOQ items`, `مصنفة كأصول — ${lines.length} من ${all.length} بنود`)}</p>
          {lines.map((l) => {
            const d = cur(l);
            const confirmed = !!dec[l.key]?.confirmed;
            const set = (p: Partial<AssetDecision>) => onDecide(l.key, { ...d, ...p, confirmed: false });
            const others = lines.filter((o) => o.key !== l.key);
            return (
              <div key={l.key} data-asset-line={l.key} data-confirmed={confirmed ? 'yes' : 'no'} className={`rounded-xl border bg-white px-5 py-4 ${confirmed ? 'border-success-200' : 'border-neutral-200'}`}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide flex items-center gap-1">{t(`BOQ item ${l.no ?? ''}`, `بند جدول الكميات ${l.no ?? ''}`)}<span className="-my-1.5 normal-case">{viewBtn(l)}</span></p>
                    <p className="text-[14px] font-semibold text-neutral-900">{L({ en: l.itemEn, ar: l.itemAr })}</p>
                    {(l.descEn || l.descAr) && <p className="text-[12.5px] text-neutral-600 mt-0.5">{isAr ? l.descAr : l.descEn}</p>}
                    <p className="text-[12px] text-neutral-500 mt-1 tabular-nums" dir="ltr">{l.qty} {l.unit}{l.unitPrice ? ` × ${sar(l.unitPrice)}` : ''} = <span className="font-semibold text-neutral-700">{sar(l.amount)}</span></p>
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">{t('Purchase type', 'نوع الشراء')}: <b className="font-semibold">{L(PURCHASE_TYPES[l.finPurchaseType])}</b></span>
                      <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">{t('Material group', 'مجموعة المواد')}: <b className="font-semibold">{L(mgByCode(l.materialGroup))}</b></span>
                      {l.componentRole && <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">{t('Role', 'الدور')}: <b className="font-semibold">{L(COMPONENT_ROLES[l.componentRole])}</b></span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {dec[l.key]?.promoted && <span data-promoted className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EEF4FB] text-[#21507A] border border-[#C9DBEC]">{t('Marked as asset by you', 'حددته كأصل')}</span>}
                    {confirmed && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success-50 text-success-700 border border-success-200"><CheckCircleIcon className="w-3 h-3" />{t('Confirmed', 'مؤكد')}</span>}
                    {dec[l.key]?.promoted && !readOnly && <button type="button" data-unpromote={l.key} onClick={() => onDecide(l.key, null)} className="text-[11.5px] font-medium text-neutral-500 hover:text-neutral-800 hover:underline">{t('Move back to non-assets', 'إعادة إلى غير الأصول')}</button>}
                  </div>
                </div>
                {details(l)}
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
          {!lines.length && <p className="text-[13px] text-neutral-500">{t('No BOQ items are flagged as assets.', 'لا توجد بنود مصنفة كأصول.')}</p>}

          {/* Not flagged as assets — must be checked; any item can be moved into the asset group */}
          {nonAssets.length > 0 && (
            <div data-nonassets data-checked={checked ? 'yes' : 'no'} className={`rounded-xl border bg-white overflow-hidden ${checked ? 'border-success-200' : 'border-neutral-200'}`}>
              <button type="button" onClick={() => setShowNon((v) => !v)} aria-expanded={showNon} data-nonassets-toggle
                className="w-full flex items-center gap-3 px-5 py-3.5 text-start hover:bg-neutral-50">
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-neutral-800">{t(`Not flagged as assets — ${nonAssets.length} BOQ items`, `غير مصنفة كأصول — ${nonAssets.length} بنود`)}</span>
                  <span className="block text-[12px] text-neutral-500">{checked ? t('You confirmed none of these are assets.', 'أكدت أن أياً منها ليس أصلاً.') : t('Check that none of these should be an asset.', 'تحقق من أن أياً منها لا يجب أن يكون أصلاً.')}</span>
                </span>
                {checked
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success-50 text-success-700 border border-success-200"><CheckCircleIcon className="w-3 h-3" />{t('Checked', 'تم التحقق')}</span>
                  : <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warning-50 text-warning-800 border border-warning-200">{t('To check', 'للتحقق')}</span>}
                <span className="text-[11.5px] font-semibold text-neutral-500">{showNon ? t('Hide', 'إخفاء') : t('Show', 'عرض')}</span>
              </button>
              {showNon && (
                <div className="border-t border-neutral-100">
                  <ul className="divide-y divide-neutral-100">
                    {nonAssets.map((l) => (
                      <li key={l.key} data-nonasset-line={l.key} className="px-5 py-3"><div className="flex items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-neutral-900 flex items-center gap-1"><span className="text-neutral-400 font-medium me-0.5 tabular-nums">{l.no}.</span>{L({ en: l.itemEn, ar: l.itemAr })}<span className="-my-1.5">{viewBtn(l)}</span></p>
                          {(l.descEn || l.descAr) && <p className="text-[12px] text-neutral-600 truncate">{isAr ? l.descAr : l.descEn}</p>}
                          <p className="mt-0.5 text-[11.5px] text-neutral-500">{L(PURCHASE_TYPES[l.finPurchaseType])} · {L(mgByCode(l.materialGroup))} · <span dir="ltr" className="tabular-nums">{sar(l.amount)}</span></p>
                        </div>
                        {!readOnly && (
                          <button type="button" data-mark-asset={l.key} onClick={() => onDecide(l.key, { ...suggest(l), promoted: true })}
                            className="h-8 px-3 rounded-lg border border-neutral-300 bg-white text-neutral-700 text-[12px] font-semibold hover:bg-neutral-50 flex-shrink-0">{t('Mark as asset', 'تحديد كأصل')}</button>
                        )}
                      </div>{details(l)}</li>
                    ))}
                  </ul>
                  {!readOnly && (
                    <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50/60 flex items-center justify-end gap-2">
                      {checked
                        ? <button type="button" onClick={() => onNonAssetsChecked(false)} className="text-[12px] font-medium text-neutral-500 hover:text-neutral-800 hover:underline">{t('Undo', 'تراجع')}</button>
                        : <button type="button" data-none-assets onClick={() => { onNonAssetsChecked(true); setShowNon(false); }}
                            className="h-8 px-3.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-semibold hover:bg-brand-700 inline-flex items-center gap-1.5"><CheckIcon className="w-3.5 h-3.5" />{t('None of these are assets', 'لا يوجد منها أصل')}</button>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════ Changes since your review ═══════════════════════════════ */
const IMPACT: Record<FinChange['impact'], { en: string; ar: string; cls: string; hint: [string, string] }> = {
  rereview: { en: 'Changes the accounting', ar: 'يغيّر المحاسبة', cls: 'bg-error-50 text-error-700 border-error-200', hint: ['The accounting itself changed — you should review these again.', 'تغيّرت المحاسبة نفسها — يُفضّل مراجعتها مرة أخرى.'] },
  decide:   { en: 'Your call', ar: 'حسب تقديرك', cls: 'bg-warning-50 text-warning-800 border-warning-200', hint: ['Quantities or new items — decide if they matter for accounting.', 'كميات أو بنود جديدة — قرر إن كانت تؤثر على المحاسبة.'] },
  info:     { en: 'For information', ar: 'للعلم', cls: 'bg-neutral-100 text-neutral-600 border-neutral-200', hint: ['Wording only — no effect on accounting.', 'صياغة فقط — لا أثر على المحاسبة.'] },
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
            <p className="text-[15px] font-bold text-neutral-900">{t('This request changed after you approved it', 'تغيّر هذا الطلب بعد اعتمادك له')}</p>
            <p className="text-[12.5px] text-neutral-600 mt-0.5 max-w-xl">
              {reviewed ? t(`You approved the GL review on ${new Date(reviewed.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}. The requester then made ${changes.length} changes. Check them and decide one thing: do you need to review the accounting again?`, `اعتمدت مراجعة دفتر الأستاذ في ${new Date(reviewed.at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}. ثم أجرى مقدّم الطلب ${changes.length} تغييرات. راجعها وقرر أمراً واحداً: هل تحتاج إلى مراجعة المحاسبة مرة أخرى؟`) : ''}
            </p>
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              {order.filter((k) => n(k)).map((k) => <span key={k} data-impact-count={k} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11.5px] font-semibold ${IMPACT[k].cls}`}>{n(k)} · {isAr ? IMPACT[k].ar : IMPACT[k].en}</span>)}
            </div>
          </div>
          {!readOnly && (
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-2">
              <button type="button" data-no-rereview onClick={onNoReReview} className="h-9 px-3.5 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700">{t('No re-review needed', 'لا يلزم إعادة المراجعة')}</button>
              <button type="button" data-reopen onClick={onReopen} className="h-9 px-3.5 rounded-lg border border-neutral-300 bg-white text-neutral-800 text-[13px] font-semibold hover:bg-neutral-50">{t('Re-open my review', 'إعادة فتح مراجعتي')}</button>
              </div>
              <p className="text-[11px] text-neutral-500 text-end max-w-[340px]">{t('“No re-review needed” keeps your approval and closes this task. “Re-open my review” opens the GL review again for the changed request.', '«لا يلزم إعادة المراجعة» يُبقي اعتمادك ويغلق المهمة. «إعادة فتح مراجعتي» يفتح مراجعة دفتر الأستاذ مجدداً للطلب المعدّل.')}</p>
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
