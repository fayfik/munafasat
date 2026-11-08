// Finance accounting UI for the BOQ step. Everything here is hidden behind "Show more"
// by default so the requester is not asked to think about accounting: the values are
// AI-prepared from the item name & description and only previewed (view mode).
// In the add / edit form, Purchase Type and Material Group stay editable; the GL
// account is always read-only because it follows the Material Group.
import { useEffect, useState, type ReactNode } from 'react';
import type { BOQRow, TenderFormData } from '../types/tender';
import { useT, useLanguage } from '../context/LanguageContext';
import { Select } from './ui';
import { ChevronDownIcon, SparklesIcon, AlertTriangleIcon, CheckCircleIcon } from './Icons';
import {
  PURCHASE_TYPES, COMPONENT_ROLES, MATERIAL_GROUPS, mgByCode, glFor, assetFlagOf, accountingIssues, requestAccounting,
  financeRouting, suggestAccounting, getRoutingOrder, setRoutingOrder, ROUTE_EVENT,
  type FinPurchaseType, type ComponentRole, type RoutingOrder,
} from '../lib/accounting';

type T = (en: string, ar: string) => string;
export type AcctValue = Pick<BOQRow, 'finPurchaseType' | 'materialGroup' | 'componentRole' | 'acctSource' | 'acctBasis' | 'glSubOverride' | 'assetFlag'>;

/** Small inline loader shown while Purchase Type & Material Group are being determined. */
export function AcctStatusLine({ show, name }: { show: boolean; name?: string }) {
  const t = useT();
  if (!show) return null;
  return (
    <p data-acct-loading className="flex items-center gap-2 text-[12px] font-medium text-ai-700">
      <span className="w-3.5 h-3.5 rounded-full border-2 border-ai-200 border-t-ai-600 animate-spin flex-shrink-0" />
      {t('Determining Purchase type, Material group…', 'جارٍ تحديد نوع الشراء ومجموعة المواد…')}
      {name && <span className="text-neutral-400 font-normal truncate">“{name}”</span>}
    </p>
  );
}

/** "Show more" CTA used at every level. A dot flags lines that Finance will need to check. */
function ShowMore({ open, onClick, issues, label, testId }: { open: boolean; onClick: () => void; issues?: number; label?: string; testId?: string }) {
  const t = useT();
  return (
    <button type="button" onClick={onClick} data-acct-toggle={testId} aria-expanded={open}
      className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-neutral-500 hover:text-brand-700">
      {open ? t('Show less', 'عرض أقل') : (label ?? t('Show more', 'عرض المزيد'))}
      {!open && !!issues && <span className="w-1.5 h-1.5 rounded-full bg-warning-500" title={t(`${issues} to check`, `${issues} للمراجعة`)} />}
      <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  );
}

/** Accounting check chip — green when consistent, amber with a count otherwise. */
export function AcctCheckChip({ row }: { row: BOQRow }) {
  const t = useT();
  const { isAr } = useLanguage();
  if (!row.finPurchaseType || !row.materialGroup) return <span className="text-[11px] text-neutral-400">{t('Not classified yet', 'لم يُصنَّف بعد')}</span>;
  const issues = accountingIssues(row);
  if (!issues.length)
    return <span data-acct-check="ok" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-success-50 text-success-700 border border-success-100"><CheckCircleIcon className="w-3 h-3" />{t('Accounting OK', 'المحاسبة سليمة')}</span>;
  return (
    <span data-acct-check="issue" title={issues.map((i) => (isAr ? i.ar : i.en)).join('\n')}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-warning-50 text-warning-800 border border-warning-200">
      <AlertTriangleIcon className="w-3 h-3" />{t(`${issues.length} to check`, `${issues.length} للمراجعة`)}
    </span>
  );
}

function Kv({ k, v, mono }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-medium text-neutral-400">{k}</dt>
      <dd className={`mt-0.5 text-[12.5px] text-neutral-800 truncate ${mono ? 'tabular-nums' : ''}`}>{v ?? <span className="text-neutral-300">—</span>}</dd>
    </div>
  );
}

/** Read-only accounting values of one BOQ line (used in rows and item details). */
export function AcctView({ row, isIt }: { row: BOQRow; isIt: boolean }) {
  const t = useT();
  const { isAr } = useLanguage();
  const mg = mgByCode(row.materialGroup);
  const { glMain, glSub } = glFor(row.materialGroup);
  const flag = assetFlagOf(row);
  const L = (o?: { en: string; ar: string }) => (o ? (isAr ? o.ar : o.en) : undefined);
  const issues = accountingIssues(row);
  return (
    <div data-acct-view className="@container rounded-lg border border-neutral-200 bg-neutral-50/60 px-3 py-2.5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-semibold text-neutral-600">{t('Finance details', 'التفاصيل المالية')}</span>
        {row.acctSource === 'ai' && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ai-700"><SparklesIcon className="w-3 h-3" />{t('AI-prepared', 'أعدّها الذكاء الاصطناعي')}</span>}
        <span className="ms-auto"><AcctCheckChip row={row} /></span>
      </div>
      <dl className="grid grid-cols-2 @[520px]:grid-cols-3 @[860px]:grid-cols-6 gap-x-4 gap-y-2">
        <Kv k={t('Purchase type', 'نوع الشراء')} v={row.finPurchaseType ? L(PURCHASE_TYPES[row.finPurchaseType]) : undefined} />
        <Kv k={t('Material group', 'مجموعة المواد')} v={mg ? `${L(mg)} · ${mg.code}` : undefined} />
        <Kv k={t('GL main account', 'الحساب الرئيسي')} v={glMain ? `${glMain.code} ${L(glMain)}` : undefined} mono />
        <Kv k={t('GL sub-account', 'الحساب الفرعي')} v={glSub ? `${glSub.code} ${L(glSub)}` : row.glSubOverride} mono />
        <Kv k={t('Asset / Non-asset', 'أصل / غير أصل')} v={flag ? (flag === 'asset' ? t('Asset', 'أصل') : t('Non-asset', 'غير أصل')) : undefined} />
        {isIt && <Kv k={t('Component role', 'دور المكوّن')} v={row.componentRole ? L(COMPONENT_ROLES[row.componentRole]) : undefined} />}
      </dl>
      {issues.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {issues.map((i) => <li key={i.code} className="flex items-start gap-1.5 text-[11.5px] text-warning-800"><AlertTriangleIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />{isAr ? i.ar : i.en}</li>)}
        </ul>
      )}
    </div>
  );
}

/** Row-level preview: a "Show more" link that reveals the view-only accounting values. */
export function AcctRowPreview({ row, isIt, forceOpen }: { row: BOQRow; isIt: boolean; forceOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const isOpen = open || !!forceOpen;
  const issues = accountingIssues(row).length;
  return (
    <div className="mt-1.5" data-acct-row={row.id}>
      {!forceOpen && <ShowMore open={isOpen} onClick={() => setOpen((v) => !v)} issues={issues} testId="row" />}
      {isOpen && <div className="mt-1.5 slide-up"><AcctView row={row} isIt={isIt} /></div>}
    </div>
  );
}

/** Add / edit form section. Purchase Type & Material Group editable; GL read-only. */
export function AcctFormSection({ value, onChange, isIt, pending }: { value: AcctValue; onChange: (patch: Partial<AcctValue>) => void; isIt: boolean; pending: boolean }) {
  const t = useT();
  const { isAr } = useLanguage();
  const [open, setOpen] = useState(false);
  const { glMain, glSub } = glFor(value.materialGroup);
  const L = (o?: { en: string; ar: string }) => (o ? (isAr ? o.ar : o.en) : '');
  const preview = { ...value, id: 'x', projectItem: '', itemName: '', itemDescription: '', unitOfMeasure: '', quantity: '' as const, unitPrice: '' as const, deliveryDate: '' } as BOQRow;
  const issues = accountingIssues(preview);
  const ro = 'h-[38px] w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 text-[13px] text-neutral-500 cursor-not-allowed truncate flex items-center';
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3" data-acct-form>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-neutral-700">{t('Finance details', 'التفاصيل المالية')}</p>
          <p className="text-[11.5px] text-neutral-500">{t('Prepared by AI from the item name and description for the Finance team — no action needed.', 'يُعدّها الذكاء الاصطناعي من اسم البند ووصفه لفريق المالية — لا يلزم أي إجراء.')}</p>
        </div>
        <ShowMore open={open} onClick={() => setOpen((v) => !v)} issues={issues.length} testId="form" />
      </div>
      {open && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 slide-up">
          <label className="block">
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-600 mb-1">{t('Purchase type', 'نوع الشراء')}{value.acctSource === 'ai' && <SparklesIcon className="w-3 h-3 text-ai-600" />}</span>
            <Select value={value.finPurchaseType ?? ''} disabled={pending} aria-label={t('Purchase type', 'نوع الشراء')}
              onChange={(e) => onChange({ finPurchaseType: (e.target.value || undefined) as FinPurchaseType | undefined, acctSource: 'user' })}>
              <option value="">{t('Select…', 'اختر…')}</option>
              {(Object.keys(PURCHASE_TYPES) as FinPurchaseType[]).map((k) => <option key={k} value={k}>{L(PURCHASE_TYPES[k])}</option>)}
            </Select>
          </label>
          <label className="block">
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-600 mb-1">{t('Material group', 'مجموعة المواد')}{value.acctSource === 'ai' && <SparklesIcon className="w-3 h-3 text-ai-600" />}</span>
            <Select value={value.materialGroup ?? ''} disabled={pending} aria-label={t('Material group', 'مجموعة المواد')}
              onChange={(e) => onChange({ materialGroup: e.target.value || undefined, acctSource: 'user' })}>
              <option value="">{t('Select…', 'اختر…')}</option>
              {MATERIAL_GROUPS.map((m) => <option key={m.code} value={m.code}>{`${L(m)} · ${m.code}`}</option>)}
            </Select>
          </label>
          <div>
            <span className="block text-[12px] font-medium text-neutral-600 mb-1">{t('GL main account', 'الحساب الرئيسي')}</span>
            <div className={ro} data-gl-main aria-disabled title={t('Follows the Material Group', 'يتبع مجموعة المواد')}>{glMain ? `${glMain.code} · ${L(glMain)}` : '—'}</div>
          </div>
          <div>
            <span className="block text-[12px] font-medium text-neutral-600 mb-1">{t('GL sub-account', 'الحساب الفرعي')}</span>
            <div className={ro} aria-disabled title={t('Follows the Material Group', 'يتبع مجموعة المواد')}>{glSub ? `${glSub.code} · ${L(glSub)}` : '—'}</div>
          </div>
          {isIt && (
            <label className="block sm:col-span-2">
              <span className="block text-[12px] font-medium text-neutral-600 mb-1">{t('Component role', 'دور المكوّن')} <span className="text-neutral-400 font-normal">{t('(optional — helps the Assets team)', '(اختياري — يساعد فريق الأصول)')}</span></span>
              <Select value={value.componentRole ?? ''} aria-label={t('Component role', 'دور المكوّن')} onChange={(e) => onChange({ componentRole: (e.target.value || undefined) as ComponentRole | undefined })}>
                <option value="">{t('Not specified', 'غير محدد')}</option>
                {(Object.keys(COMPONENT_ROLES) as ComponentRole[]).map((k) => <option key={k} value={k}>{L(COMPONENT_ROLES[k])}</option>)}
              </Select>
            </label>
          )}
          <p className="sm:col-span-2 text-[11px] text-neutral-400">{t('The GL account follows the Material Group and cannot be edited here.', 'يتبع حساب الأستاذ العام مجموعة المواد ولا يمكن تعديله هنا.')}</p>
          {issues.length > 0 && (
            <ul className="sm:col-span-2 space-y-0.5">
              {issues.map((i) => <li key={i.code} className="flex items-start gap-1.5 text-[11.5px] text-warning-800"><AlertTriangleIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />{isAr ? i.ar : i.en}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Request-level card: Cost Center & Commitment Item (from budget) + accounting check summary. */
export function RequestAcctCard({ formData, showAll, onShowAll }: { formData: TenderFormData; showAll: boolean; onShowAll: (v: boolean) => void }) {
  const t = useT();
  const { isAr } = useLanguage();
  const [open, setOpen] = useState(false);
  const { costCenter, commitmentItem } = requestAccounting(formData);
  const rows = formData.boqItems.filter((r) => r.itemName.trim());
  const classified = rows.filter((r) => r.finPurchaseType && r.materialGroup);
  const flagged = rows.map((r, i) => ({ r, i, issues: accountingIssues(r) })).filter((x) => x.issues.length);
  const assets = classified.filter((r) => assetFlagOf(r) === 'asset').length;
  const L = (o?: { en: string; ar: string }) => (o ? (isAr ? o.ar : o.en) : '—');
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3" data-acct-request>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-neutral-800">{t('Finance details', 'التفاصيل المالية')}</p>
          <p className="text-[12px] text-neutral-500">{t('Prepared by AI for the Finance team — you don’t need to fill anything here.', 'يُعدّها الذكاء الاصطناعي لفريق المالية — لا تحتاج إلى تعبئة أي شيء هنا.')}</p>
        </div>
        <ShowMore open={open} onClick={() => setOpen((v) => !v)} issues={flagged.length} testId="request" />
      </div>
      {open && (
        <div className="mt-3 space-y-3 slide-up">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2">
              <dt className="text-[10.5px] font-medium text-neutral-400">{t('Cost center (from budget)', 'مركز التكلفة (من الميزانية)')}</dt>
              <dd className="mt-0.5 text-[13px] font-semibold text-neutral-800" data-acct-cc>{costCenter ? `${costCenter.code} · ${L(costCenter)}` : '—'}</dd>
            </div>
            <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2">
              <dt className="text-[10.5px] font-medium text-neutral-400">{t('Commitment item (from budget)', 'بند الالتزام (من الميزانية)')}</dt>
              <dd className="mt-0.5 text-[13px] font-semibold text-neutral-800 truncate" data-acct-ci>{commitmentItem ? `${commitmentItem.code} · ${L(commitmentItem)}` : '—'}</dd>
            </div>
          </dl>
          {/* Summary bar */}
          <div data-acct-summary className={`rounded-lg border px-3 py-2.5 ${flagged.length ? 'border-warning-200 bg-warning-50/60' : 'border-success-100 bg-success-50/60'}`}>
            <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-[12px]">
              <span className={`inline-flex items-center gap-1.5 font-semibold ${flagged.length ? 'text-warning-800' : 'text-success-700'}`}>
                {flagged.length ? <AlertTriangleIcon className="w-3.5 h-3.5" /> : <CheckCircleIcon className="w-3.5 h-3.5" />}
                {flagged.length ? t(`Accounting check: ${flagged.length} line${flagged.length === 1 ? '' : 's'} for Finance to check`, `فحص المحاسبة: ${flagged.length} بند للمراجعة من المالية`) : t('Accounting check: all lines consistent', 'فحص المحاسبة: جميع البنود متسقة')}
              </span>
              <span className="text-neutral-600">{t(`${classified.length}/${rows.length} lines classified`, `${classified.length}/${rows.length} بنود مصنفة`)}</span>
              <span className="text-neutral-600">{t(`${assets} asset · ${classified.length - assets} non-asset`, `${assets} أصل · ${classified.length - assets} غير أصل`)}</span>
              <label className="ms-auto inline-flex items-center gap-1.5 text-neutral-600 cursor-pointer">
                <input type="checkbox" className="accent-brand-600" checked={showAll} onChange={(e) => onShowAll(e.target.checked)} data-acct-showall />
                {t('Show on every line', 'إظهار في كل بند')}
              </label>
            </div>
            {flagged.length > 0 && (
              <ul className="mt-2 space-y-1">
                {flagged.slice(0, 5).map(({ r, i, issues }) => (
                  <li key={r.id} className="text-[11.5px] text-warning-900"><span className="font-semibold">{t(`Line ${i + 1}`, `البند ${i + 1}`)} · {r.itemName}</span> — {issues.map((x) => (isAr ? x.ar : x.en)).join('; ')}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export type { T };

/** Review & Confirm — where the request goes in Finance, based on the asset flags. */
export function FinanceRoutingCard({ rows }: { rows: BOQRow[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<RoutingOrder>(() => getRoutingOrder());
  useEffect(() => {
    const on = () => setOrder(getRoutingOrder());
    window.addEventListener(ROUTE_EVENT, on);
    return () => window.removeEventListener(ROUTE_EVENT, on);
  }, []);
  // Lines not yet prepared (e.g. the BOQ step was never opened) use the same AI suggestion.
  const named = rows.filter((r) => r.itemName.trim()).map((r) => (r.finPurchaseType ? r : { ...r, ...(suggestAccounting(r.itemName, r.itemDescription) ?? {}) }));
  const r = financeRouting(named, order);
  if (r.kind === 'none') return null;
  const lines = (n: number) => (n === 1 ? t('line', 'بند') : t('lines', 'بنود'));
  const sentence =
    r.kind === 'assets' ? t(`This request contains ${r.assets} asset ${lines(r.assets)}, so it goes to the Assets team.`, `يحتوي هذا الطلب على ${r.assets} بند أصول، لذا يُحال إلى فريق الأصول.`)
    : r.kind === 'gl' ? t(`This request contains ${r.nonAssets} non-asset ${lines(r.nonAssets)}, so it goes to the GL team.`, `يحتوي هذا الطلب على ${r.nonAssets} بند غير أصول، لذا يُحال إلى فريق دفتر الأستاذ.`)
    : order === 'parallel'
      ? t(`This request contains ${r.assets} asset ${lines(r.assets)} and ${r.nonAssets} non-asset ${lines(r.nonAssets)}, so it goes to Assets and GL in parallel.`, `يحتوي هذا الطلب على ${r.assets} بند أصول و${r.nonAssets} بند غير أصول، لذا يُحال إلى الأصول ودفتر الأستاذ بالتوازي.`)
      : t(`This request contains ${r.assets} asset ${lines(r.assets)} and ${r.nonAssets} non-asset ${lines(r.nonAssets)}, so it goes to Assets, then GL.`, `يحتوي هذا الطلب على ${r.assets} بند أصول و${r.nonAssets} بند غير أصول، لذا يُحال إلى الأصول ثم دفتر الأستاذ.`);
  const Step = ({ k }: { k: string }) => {
    const label = k === 'assets' ? t('Assets', 'الأصول') : k === 'gl' ? t('GL', 'دفتر الأستاذ') : t('Assets + GL (parallel)', 'الأصول + دفتر الأستاذ (بالتوازي)');
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#EEF4FB] border border-[#C9DBEC] text-[11.5px] font-semibold text-[#21507A]">{label}</span>;
  };
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4" data-finance-routing={r.kind}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-neutral-800">{t('Finance review route', 'مسار المراجعة المالية')}</p>
          <p className="mt-0.5 text-[13px] text-neutral-600" data-routing-sentence>{sentence}</p>
        </div>
        <ShowMore open={open} onClick={() => setOpen((v) => !v)} testId="routing" />
      </div>
      {open && (
        <div className="mt-3 space-y-3 slide-up">
          <div className="flex items-center gap-2 flex-wrap text-[12px] text-neutral-500">
            <span>{t('Requester', 'مقدّم الطلب')}</span>
            {r.steps.map((s) => <span key={s} className="inline-flex items-center gap-2"><span className="text-neutral-300">→</span><Step k={s} /></span>)}
            <span className="text-neutral-300">→</span><span>{t('Qualification', 'التأهيل')}</span>
            {r.unclassified > 0 && <span className="ms-2 text-warning-700">{t(`${r.unclassified} line(s) not classified yet`, `${r.unclassified} بند غير مصنف بعد`)}</span>}
          </div>
          {r.kind === 'mixed' && (
            <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2.5">
              <p className="text-[11.5px] font-semibold text-neutral-600 mb-1.5">{t('Mixed requests — routing order (setting, for trial)', 'الطلبات المختلطة — ترتيب الإحالة (إعداد تجريبي)')}</p>
              <div className="inline-flex rounded-lg border border-neutral-300 overflow-hidden" role="radiogroup">
                {(['assets-first', 'parallel'] as RoutingOrder[]).map((o) => (
                  <button key={o} type="button" role="radio" aria-checked={order === o} data-routing-order={o} onClick={() => { setRoutingOrder(o); setOrder(o); }}
                    className={`px-3 py-1.5 text-[12px] font-semibold ${order === o ? 'bg-brand-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'} ${o === 'parallel' ? 'border-s border-neutral-300' : ''}`}>
                    {o === 'assets-first' ? t('Assets, then GL', 'الأصول ثم دفتر الأستاذ') : t('In parallel', 'بالتوازي')}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-neutral-400">{t('Suggested in the Finance meeting; not yet a confirmed decision.', 'مقترح من اجتماع المالية؛ ليس قراراً معتمداً بعد.')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
