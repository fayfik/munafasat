import { useRef, useState, type ChangeEvent } from 'react';
import { useTender } from '../context/TenderContext';
import { useLanguage, useT } from '../context/LanguageContext';
import { Button, Select, SectionCard, Badge, InfoBanner, Textarea, Input } from '../components/ui';
import { BOQ_CATEGORIES, BOQ_CATEGORY_META } from '../lib/boqCategory';
import type { BOQCategory, ProjectItemType } from '../types/tender';
import { CheckIcon } from '../components/Icons';
import DrawerClose from '../components/DrawerClose';
import routeIllustration from '../assets/procurement-route-illustration.svg';
import { PROJECTS, ALL_COST_CENTERS } from '../data/mockData';
import { useRequests } from '../context/RequestStore';
import { EXPENSE_TYPES, expenseTypeOf } from '../lib/expenseTypes';
import type { ProjectItem, SourceType, TenderFormData } from '../types/tender';
import {
  classifyItem, groupItems, forcedRoute, parseItemNames, itemNameLooksReal, EXAMPLE_TEXT, ROUTE_META, BOQ_TYPE_META,
  type ClsItem, type ItemVerdict, type RequestGroup, type RouteKey,
} from '../lib/triage';

interface FreeItem { id: string; name: string; }
/** "Item details" intake row (Help me decide, preset fields). */
interface DetailRow { id: string; type: BOQCategory | ''; name: string; qty: number | ''; unitPrice: number | ''; deliveryDate: string; }
const emptyDetail = (): DetailRow => ({ id: crypto?.randomUUID ? crypto.randomUUID() : `d_${Math.random().toString(36).slice(2)}`, type: '', name: '', qty: '', unitPrice: '', deliveryDate: '' });
const CAT_TO_ITEM_TYPE: Record<BOQCategory, ProjectItemType> = { service: 'services', manpower: 'services', equipment: 'assets', material: 'consumables' };
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `f_${Math.random().toString(36).slice(2)}`);

type Phase = 'select' | 'checking' | 'awaiting' | 'result' | 'review' | 'landing';
/** How the requester wants to procure: they know the route, or want help deciding. */
type RouteMode = 'tender' | 'emarket' | 'help';

export default function ProcurementRouteStep() {
  const { isAr } = useLanguage();
  const t = useT();
  const { confirmRoute, routeConfirmed, formData, updateField } = useTender();

  const [phase, setPhase] = useState<Phase>('select');
  const [projectId, setProjectId] = useState('');
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [groups, setGroups] = useState<RequestGroup[]>([]);
  const [chosenKey, setChosenKey] = useState('');
  const [showInfo, setShowInfo] = useState(false);

  // Free-text intake: type / paste / attach → AI extracts an editable list.
  const [text, setText] = useState('');
  const [identifying, setIdentifying] = useState(false);
  const [freeItems, setFreeItems] = useState<FreeItem[]>([]);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [intakeError, setIntakeError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  // Prototype: two ways to describe items for "Help me decide" — open text, or preset fields.
  const [intakeStyle, setIntakeStyle] = useState<'text' | 'fields'>('text');
  const [details, setDetails] = useState<DetailRow[]>([emptyDetail()]);
  const detailsUsed = details.filter((d) => d.name.trim() || d.type || d.qty !== '' || d.unitPrice !== '' || d.deliveryDate);
  const detailsIncomplete = detailsUsed.filter((d) => !d.name.trim() || !d.type || d.qty === '');
  const editDetail = (id: string, patch: Partial<DetailRow>) => { if (intakeError) setIntakeError(''); setDetails((xs) => xs.map((d) => d.id === id ? { ...d, ...patch } : d)); };
  const removeDetail = (id: string) => setDetails((xs) => xs.length > 1 ? xs.filter((d) => d.id !== id) : [emptyDetail()]);
  const addDetail = () => setDetails((xs) => [...xs, emptyDetail()]);
  const detailOf = (id: string) => (intakeStyle === 'fields' ? details.find((d) => d.id === id) : undefined);

  // Route choice (Tendering / Etimad eMarket / Help me decide) and the follow-up review.
  const [mode, setMode] = useState<RouteMode | ''>('');
  const [flagged, setFlagged] = useState<ItemVerdict[]>([]);   // items that don't fit the chosen route
  const [rest, setRest] = useState<ItemVerdict[]>([]);         // items that do
  const [tenderAction, setTenderAction] = useState<'move' | 'justify'>('move');
  const [justification, setJustification] = useState('');
  const { addSessionDraft } = useRequests();
  // Manual mode: Procurement confirms which items are on Etimad eMarket.
  const [pending, setPending] = useState<ClsItem[]>([]);
  const [sentAt, setSentAt] = useState('');
  const [reviewedAt, setReviewedAt] = useState('');

  const project = PROJECTS.find((p) => p.id === projectId);
  const items: ProjectItem[] = project?.items ?? [];
  const selected = items.filter((i) => itemIds.includes(i.id));
  const freeValid = freeItems.filter((f) => f.name.trim().length > 0);

  // Everything fed into the route check: chosen project items + free-typed items.
  const clsInput: ClsItem[] = [
    ...selected.map((i) => ({ id: i.id, name: i.name, nameAr: i.nameAr, type: i.type, projectItemId: i.id })),
    ...(intakeStyle === 'fields'
      ? detailsUsed.filter((d) => d.name.trim()).map((d) => ({ id: d.id, name: d.name.trim() }))
      : freeValid.map((f) => ({ id: f.id, name: f.name.trim() }))),
  ];

  // Already confirmed (navigated back, or opened an existing request) → summary + edit.
  if (routeConfirmed && phase === 'select' && !projectId) {
    const r: RouteKey = formData.sourceType === 'souq-etimad' ? 'souq-etimad' : 'tendering';
    const m = ROUTE_META[r];
    const confProj = PROJECTS.find((p) => p.id === formData.projectId);
    const confItems = confProj ? confProj.items.filter((i) => (formData.selectedProjectItemIds ?? []).includes(i.id)) : [];
    const startEdit = () => { setProjectId(formData.projectId); setItemIds(formData.selectedProjectItemIds ?? []); setMode(formData.routeChoice ?? ''); setPhase('select'); };
    return (
      <SectionCard title="Procurement route" titleAr="مسار الشراء" description="The channel for this request has been determined." descriptionAr="تم تحديد قناة الشراء لهذا الطلب."
        action={<Button variant="secondary" size="sm" onClick={startEdit}>{t('Edit', 'تعديل')}</Button>}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{t('Determined route', 'المسار المحدد')}</p>
            <p className="text-[18px] font-bold text-neutral-900 mt-0.5">{isAr ? m.ar : m.en}</p>
            {confProj && <p className="text-[12px] text-neutral-500 mt-1">{isAr ? confProj.nameAr : confProj.name} · {t(`${confItems.length} item${confItems.length > 1 ? 's' : ''}`, `${confItems.length} بند`)}</p>}
          </div>
          <Badge variant={m.badge}>{t('Confirmed', 'مؤكد')}</Badge>
        </div>
        <p className="text-[12px] text-neutral-500 mt-3">{t('Want to proceed with different items in this project? Use Edit to change the selection and re-check the route.', 'تريد المتابعة ببنود أخرى من المشروع؟ استخدم تعديل لتغيير الاختيار وإعادة فحص المسار.')}</p>
      </SectionCard>
    );
  }

  // On picking a project, pre-select ALL of its items so the request starts with
  // every item included; the user can untick any they don't need.
  function pickProject(id: string) {
    setProjectId(id);
    const its = id ? (PROJECTS.find((p) => p.id === id)?.items ?? []) : [];
    setItemIds(its.map((it) => it.id));
  }
  const toggle = (id: string) => setItemIds((xs) => xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]);
  const toggleAll = () => setItemIds((xs) => xs.length === items.length ? [] : items.map((i) => i.id));

  // Free-text intake handlers
  // Splits the typed or pasted text into one item per line (no AI).
  function identify() {
    const src = text.trim();
    if (!src.length) return;
    setFreeItems(parseItemNames(src).map((n) => ({ id: uid(), name: n })));
  }
  function onAttach(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setAttachment(f.name);
    setIdentifying(true);
    window.setTimeout(() => {
      setText(EXAMPLE_TEXT);
      setFreeItems(parseItemNames(EXAMPLE_TEXT).map((n) => ({ id: uid(), name: n })));
      setIdentifying(false);
    }, 1100);
    e.target.value = '';
  }
  const editFree = (id: string, name: string) => { if (intakeError) setIntakeError(''); setFreeItems((xs) => xs.map((f) => f.id === id ? { ...f, name } : f)); };
  const removeFree = (id: string) => setFreeItems((xs) => xs.filter((f) => f.id !== id));
  const addFree = () => setFreeItems((xs) => [...xs, { id: uid(), name: '' }]);

  function runCheck() {
    if (intakeStyle === 'fields') {
      if (detailsUsed.length === 0) { setIntakeError(t('Add at least one item.', 'أضف بنداً واحداً على الأقل.')); return; }
      if (detailsIncomplete.length > 0) {
        setIntakeError(t('Each item needs a product type, a product name and a quantity.', 'يحتاج كل بند إلى نوع المنتج واسمه والكمية.'));
        return;
      }
      setIntakeError('');
      setPending([
        ...selected.map((i) => ({ id: i.id, name: i.name, nameAr: i.nameAr, type: i.type, projectItemId: i.id })),
        ...detailsUsed.map((d) => ({ id: d.id, name: d.name.trim(), type: d.type ? CAT_TO_ITEM_TYPE[d.type] : undefined })),
      ]);
      setSentAt(new Date().toISOString());
      setPhase('awaiting');
      return;
    }
    // Typing is enough: if the user entered intake text but didn't run "Identify",
    // parse it now so the route check can proceed without the extra click.
    let effFree = freeValid;
    if (effFree.length === 0 && text.trim().length > 0) {
      effFree = parseItemNames(text.trim()).map((n) => ({ id: uid(), name: n }));
    }
    const input: ClsItem[] = [
      ...selected.map((i) => ({ id: i.id, name: i.name, nameAr: i.nameAr, type: i.type, projectItemId: i.id })),
      ...effFree.map((f) => ({ id: f.id, name: f.name.trim() })),
    ];
    if (input.length === 0) return;
    // Validation: if the user typed something, at least one of those items must
    // read like a real procurement item — block random / gibberish text.
    const freeNames = effFree.map((f) => f.name.trim()).filter(Boolean);
    if (freeNames.length > 0 && !freeNames.some(itemNameLooksReal)) {
      setIntakeError(t(
        'We couldn’t recognise any procurement items in what you typed. Please describe what you need to buy — e.g. “20 laptops”, “office cleaning services”.',
        'لم نتمكن من التعرف على أي بنود شراء فيما كتبته. يرجى وصف ما تحتاج إلى شرائه — مثل «20 حاسوباً محمولاً» أو «خدمات نظافة المكاتب».',
      ));
      return;
    }
    setIntakeError('');
    // Validation passed — persist the parsed items so they show during the check.
    if (freeValid.length === 0 && effFree.length > 0) setFreeItems(effFree);
    // Sent to Procurement — the requester waits for their Etimad check.
    setPending(input);
    setSentAt(new Date().toISOString());
    setPhase('awaiting');
  }

  // Prototype only: fills in Procurement's answer (sample data standing in for their Etimad check).
  function simulateProcurementReply() {
    const override = mode === 'help' ? forcedRoute() : null;
    const verdicts: ItemVerdict[] = pending.map((c) => {
      const v = classifyItem(c, override);
      return { ...v,
        reason: v.route === 'souq-etimad' ? 'Listed on Etimad eMarket — can be bought directly from the catalogue.' : 'Not listed on Etimad eMarket — needs a competitive tender.',
        reasonAr: v.route === 'souq-etimad' ? 'مدرج في السوق الإلكتروني — يمكن شراؤه مباشرة من الكتالوج.' : 'غير مدرج في السوق الإلكتروني — يتطلب منافسة.' };
    });
    setReviewedAt(new Date().toISOString());
    if (mode === 'help') {
      const g = groupItems(verdicts);
      setGroups(g); setChosenKey(g[0]?.key ?? ''); setPhase('result');
      return;
    }
    // Tendering: flag items that are on eMarket. eMarket: flag items that aren't.
    const off: RouteKey = mode === 'tender' ? 'souq-etimad' : 'tendering';
    setFlagged(verdicts.filter((v) => v.route === off));
    setRest(verdicts.filter((v) => v.route !== off));
    setTenderAction(verdicts.every((v) => v.route === off) ? 'justify' : 'move');
    setJustification('');
    setPhase('review');
  }

  function confirmChosen() {
    const g = groups.find((x) => x.key === chosenKey) ?? groups[0];
    if (!g) return;
    confirmRoute({
      sourceType: ROUTE_META[g.route].sourceType,
      projectId,
      items: g.items.map((i) => ({ name: i.name, nameAr: i.nameAr, projectItemId: i.projectItemId })),
      choice: 'help',
    });
    // The other route's items become a linked draft, so they aren't lost.
    linkDrafts(groups.filter((x) => x.key !== g.key).map((x) => moveToDraft(x.route, x.items)));
    // Both routes now continue into the wizard (confirmRoute advances to Project Setup).
  }

  const toItems = (vs: ItemVerdict[]) => vs.map((i) => ({ name: i.name, nameAr: i.nameAr, projectItemId: i.projectItemId }));
  const itemNames = (vs: ItemVerdict[]) => vs.map((i) => (isAr ? i.nameAr : i.name)).join(isAr ? '، ' : ', ');
  // Save the flagged items as a separate draft request (shown in My Requests for this session).
  // The draft carries its project and items, so "Continue this draft" opens it ready to fill in.
  function moveToDraft(route: RouteKey, vs: ItemVerdict[] = flagged): { id: string; route: SourceType; items: string[] } {
    const cc = ALL_COST_CENTERS.find((c) => c.id === project?.costCenterId);
    const sourceType = ROUTE_META[route].sourceType;
    const form = {
      sourceType, projectId, costCenterId: project?.costCenterId ?? '',
      selectedProjectItemIds: vs.map((v) => v.projectItemId).filter((x): x is string => !!x),
      tenderingPurpose: project?.purpose ?? '',
      boqItems: vs.map((v) => { const d = detailOf(v.id); return {
        id: crypto.randomUUID(), projectItem: v.name, itemName: v.name, itemDescription: '', unitOfMeasure: 'Each',
        quantity: d?.qty ?? '', unitPrice: d?.unitPrice ?? '', deliveryDate: d?.deliveryDate ?? '',
        ...(d?.type ? { category: d.type } : {}),
        ...(sourceType === 'souq-etimad'
          ? { purchaseType: (v.boqType === 'services' || v.boqType === 'manpower' ? 'service' : 'product') as 'service' | 'product', productId: '', supplier: '', lineTotal: (d && d.qty !== '' && d.unitPrice !== '' ? Number(d.qty) * Number(d.unitPrice) : '') as number | '' }
          : {}),
      }; }),
    } as unknown as TenderFormData;
    const id = addSessionDraft({
      title: `${project?.name ?? 'Request'} — ${ROUTE_META[route].en} (${vs.length} item${vs.length > 1 ? 's' : ''})`,
      type: sourceType,
      department: cc?.name ?? '—',
      budget: '—',
    }, form);
    return { id, route: sourceType, items: vs.map((v) => v.name) };
  }
  const linkDrafts = (ds: { id: string; route: SourceType; items: string[] }[]) => { if (ds.length) updateField('linkedDrafts', ds); };
  function continueTender() {
    if (tenderAction === 'move' && rest.length > 0) {
      const d = moveToDraft('souq-etimad');
      confirmRoute({ sourceType: 'tendering', projectId, items: toItems(rest), choice: 'tender', movedToDraft: flagged.length ? { count: flagged.length, route: 'souq-etimad' } : undefined });
      linkDrafts([d]);
    } else {
      confirmRoute({ sourceType: 'tendering', projectId, items: toItems([...rest, ...flagged]), choice: 'tender',
        justification: flagged.length ? justification.trim() : undefined, justifiedItems: flagged.map((f) => f.name) });
    }
  }
  function continueEmarket() {
    if (rest.length === 0) {
      // Nothing is on eMarket — this becomes a tender request instead.
      confirmRoute({ sourceType: 'tendering', projectId, items: toItems(flagged), choice: 'emarket' });
      return;
    }
    const d = flagged.length ? moveToDraft('tendering') : null;
    confirmRoute({ sourceType: 'souq-etimad', projectId, items: toItems(rest), choice: 'emarket', movedToDraft: flagged.length ? { count: flagged.length, route: 'tendering' } : undefined });
    if (d) linkDrafts([d]);
  }

  // Tendering / Etimad E-Market chosen directly — skip the check and go straight into the wizard.
  function continueDirect(route: 'tender' | 'emarket') {
    const items = selected.map((i) => ({ name: i.name, nameAr: i.nameAr, projectItemId: i.id }));
    confirmRoute({
      sourceType: route === 'tender' ? 'tendering' : 'souq-etimad',
      projectId,
      items,
      choice: route,
    });
  }

  const chosen = groups.find((g) => g.key === chosenKey) ?? groups[0];

  return (
    <div className="max-w-[820px]">
      {showInfo && <RouteInfoModal onClose={() => setShowInfo(false)} isAr={isAr} t={t} />}
      {mode === 'help' && phase !== 'landing' && <SubSteps phase={phase} t={t} />}

      {/* SELECT */}
      {phase === 'select' && (
        <SectionCard
          title="What are you procuring?"
          titleAr="ما الذي تقوم بشرائه؟"
          description="Pick your project and the items you need. We’ll route each one the right way — Etimad eMarket or a competitive tender."
          descriptionAr="اختر مشروعك والبنود التي تحتاجها. سنوجّه كل بند إلى المسار الصحيح — السوق الإلكتروني (اعتماد) أو منافسة."
          action={
            <button type="button" onClick={() => setShowInfo(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-700 text-[12px] font-semibold hover:bg-neutral-50 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" strokeLinecap="round" /></svg>
              {t('Know more', 'اعرف المزيد')}
            </button>
          }>
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">{t('Project', 'المشروع')}</label>
              <Select value={projectId} onChange={(e) => pickProject(e.target.value)}>
                <option value="">{t('Select a project…', 'اختر مشروعاً…')}</option>
                {PROJECTS.map((p) => <option key={p.id} value={p.id}>{`${isAr ? p.nameAr : p.name} (${p.code})`}</option>)}
              </Select>
            </div>

            {project && (
              <div>
                <div className="flex items-end justify-between gap-3 mb-2">
                  <div>
                    <p className="text-[13px] font-medium text-neutral-800">{t('Budgeted items', 'البنود المعتمدة في الميزانية')}</p>
                    <p className="text-[12px] text-neutral-500 mt-0.5">{t('Select the items to include in this request.', 'اختر البنود التي يشملها هذا الطلب.')}</p>
                  </div>
                  <span className="text-[12px] text-neutral-500 whitespace-nowrap">{t(`${itemIds.length} of ${items.length} selected`, `${itemIds.length} من ${items.length} محددة`)}</span>
                </div>
                <div className="rounded-xl border border-neutral-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200">
                        <th className="w-12 ps-4 py-2.5"><Check checked={itemIds.length === items.length} mixed={itemIds.length > 0 && itemIds.length < items.length} onChange={toggleAll} /></th>
                        <th className="text-start px-3 py-2.5 text-xs font-medium text-neutral-500">{t('Item', 'البند')}</th>
                        <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500">{t('Arabic Name', 'الاسم بالعربية')}</th>
                        <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500">{t('Expense type', 'نوع المصروف')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {items.map((item) => {
                        const checked = itemIds.includes(item.id);
                        const et = EXPENSE_TYPES[expenseTypeOf(item)];
                        return (
                          <tr key={item.id} onClick={() => toggle(item.id)} className={`cursor-pointer transition-colors ${checked ? 'bg-brand-50/60' : 'bg-white hover:bg-neutral-50'}`}>
                            <td className="ps-4 py-3" onClick={(e) => e.stopPropagation()}><Check checked={checked} onChange={() => toggle(item.id)} /></td>
                            <td className="px-3 py-3 text-neutral-700 font-medium">{item.name}</td>
                            <td className="px-4 py-3 text-neutral-500 text-xs" dir="rtl">{item.nameAr}</td>
                            <td className="px-4 py-3 text-[12px] text-neutral-700 whitespace-nowrap">{isAr ? et.ar : et.en}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* How do you want to procure? — appears once at least one budgeted item is selected */}
            {selected.length > 0 && (
              <div>
                <p className="text-[13px] font-medium text-neutral-800">{t('How do you want to procure these?', 'كيف تريد شراء هذه البنود؟')}</p>
                <p className="text-[12px] text-neutral-500 mt-0.5">{t('Choose the route if you already know it.', 'اختر المسار إذا كنت تعرفه.')}</p>
                <div role="radiogroup" aria-label={t('Procurement route', 'مسار الشراء')} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2.5">
                  {MODE_OPTIONS.map((o) => {
                    const on = mode === o.key;
                    return (
                      <button key={o.key} type="button" role="radio" aria-checked={on}
                        onClick={() => { setMode(o.key); if (intakeError) setIntakeError(''); }}
                        className={`text-start rounded-xl border px-3.5 py-3 transition-colors ${on ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${o.iconBg}`}>{o.icon}</span>
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${on ? 'border-brand-600 bg-brand-600' : 'border-neutral-300'}`}>{on && <span className="w-1.5 h-1.5 rounded-full bg-white" />}</span>
                        </div>
                        <p className="text-[13.5px] font-semibold text-neutral-900 mt-2">{t(o.en, o.ar)}</p>
                        <p className="text-[12px] text-neutral-500 mt-0.5 leading-snug">{t(o.descEn, o.descAr)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Item intake — only when the requester wants help deciding the route */}
            {selected.length > 0 && mode === 'help' && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 px-5 py-4 slide-up">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[14px] font-semibold text-neutral-900">
                  {t('Tell us what you’re looking for', 'أخبرنا بما تبحث عنه')}
                </p>
                <span className="text-[11px] font-semibold text-neutral-600 bg-neutral-100 rounded-full px-2 py-0.5">{t('Required', 'مطلوب')}</span>
              </div>
              {/* Prototype switch: two ways of describing the items */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <div role="radiogroup" aria-label={t('How do you want to describe the items?', 'كيف تريد وصف البنود؟')} className="inline-flex rounded-lg border border-neutral-300 bg-white p-0.5">
                  {([['text', t('Describe in text', 'وصف نصي')], ['fields', t('Enter item details', 'إدخال تفاصيل البنود')]] as const).map(([k, label]) => (
                    <button key={k} type="button" role="radio" aria-checked={intakeStyle === k}
                      onClick={() => { setIntakeStyle(k); setIntakeError(''); }}
                      className={`px-3 py-1.5 rounded-md text-[12.5px] font-semibold transition-colors ${intakeStyle === k ? 'bg-brand-600 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-50'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <span className="text-[10.5px] font-semibold uppercase tracking-wide text-neutral-500 border border-dashed border-neutral-300 rounded-full px-2 py-0.5">{t('Prototype: compare both', 'نموذج أولي: قارن الطريقتين')}</span>
              </div>

              {intakeStyle === 'text' ? (<>
              <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/60 px-3.5 py-2.5">
                <p className="text-[12.5px] font-semibold text-brand-800">{t('Give Procurement as much detail as you can', 'زوّد المشتريات بأكبر قدر من التفاصيل')}</p>
                <p className="text-[12px] text-brand-800/80 mt-0.5 leading-relaxed">
                  {t('Procurement checks each item on Etimad from what you write here. For every item, say what it is, how many you need, key specs or brand, and when and where it’s needed. Vague descriptions mean questions back and a slower answer.',
                     'تفحص المشتريات كل بند في اعتماد بناءً على ما تكتبه هنا. لكل بند، اذكر ما هو، والكمية المطلوبة، والمواصفات الأساسية أو العلامة التجارية، ومتى وأين تحتاجه. الأوصاف المبهمة تعني أسئلة إضافية وتأخراً في الرد.')}
                </p>
              </div>
              <div className="mt-3">
                <Textarea rows={6} value={text} onChange={(e) => { setText(e.target.value); if (intakeError) setIntakeError(''); }}
                  placeholder={t('e.g.\n20 laptops — 16 GB RAM, 512 GB SSD, 14-inch, needed by March at the Riyadh office\nOffice cleaning services — 3 floors, daily, 12-month contract\nNetwork switches x4 — 48-port, PoE, for the new data room', 'مثال:\n20 حاسوباً محمولاً — ذاكرة 16 جيجابايت، تخزين 512 جيجابايت، 14 بوصة، مطلوبة بحلول مارس في مكتب الرياض\nخدمات نظافة المكاتب — 3 طوابق، يومياً، عقد 12 شهراً\nمحولات شبكة ×4 — 48 منفذاً، PoE، لغرفة البيانات الجديدة')} />
              </div>

              <div className="flex items-center gap-2 mt-2.5">
                <input ref={fileRef} type="file" className="hidden" onChange={onAttach}
                  accept=".txt,.csv,.xlsx,.xls,.doc,.docx,.pdf" />
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={identifying}>{t('Attach file', 'إرفاق ملف')}</Button>
                <Button variant="secondary" size="sm" onClick={identify} disabled={identifying || !text.trim()}>
                  {t('Make a list', 'تحويل إلى قائمة')}
                </Button>
                {attachment && <span className="text-[12px] text-neutral-500 truncate">{attachment}</span>}
              </div>

              {freeItems.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[12px] font-medium text-neutral-600">{t(`${freeValid.length} item${freeValid.length > 1 ? 's' : ''} — review and edit:`, `${freeValid.length} بند — راجع وعدّل:`)}</p>
                  {freeItems.map((f) => {
                    const bt = f.name.trim() ? BOQ_TYPE_META[classifyItem({ id: f.id, name: f.name.trim() }).boqType] : null;
                    return (
                      <div key={f.id} className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5">
                        <input value={f.name} onChange={(e) => editFree(f.id, e.target.value)}
                          className="flex-1 min-w-0 text-[13px] text-neutral-800 bg-transparent outline-none placeholder:text-neutral-500"
                          placeholder={t('Item name…', 'اسم البند…')} />
                        {bt && <Badge variant={bt.badge}>{isAr ? bt.ar : bt.en}</Badge>}
                        <button type="button" onClick={() => removeFree(f.id)} className="w-6 h-6 rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 flex items-center justify-center flex-shrink-0" aria-label={t('Remove', 'إزالة')}>×</button>
                      </div>
                    );
                  })}
                  <button type="button" onClick={addFree} className="text-[12px] font-semibold text-brand-700 hover:underline mt-0.5">+ {t('Add item', 'إضافة بند')}</button>
                </div>
              )}
              </>) : (
              <div className="mt-3 space-y-2" data-testid="detail-rows">
                <p className="text-[12.5px] text-neutral-600">{t('Add each item you need. Procurement checks them on Etimad using these details.', 'أضف كل بند تحتاجه. تفحص المشتريات البنود في اعتماد بناءً على هذه التفاصيل.')}</p>
                <div className="hidden md:grid grid-cols-[150px_1fr_84px_118px_140px_28px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  <span>{t('Product type', 'نوع المنتج')} <span className="text-error-600">*</span></span>
                  <span>{t('Product name', 'اسم المنتج')} <span className="text-error-600">*</span></span>
                  <span>{t('Quantity', 'الكمية')} <span className="text-error-600">*</span></span>
                  <span>{t('Unit price (SAR)', 'سعر الوحدة (ريال)')}</span>
                  <span>{t('Delivery date', 'موعد التسليم')}</span>
                  <span />
                </div>
                {details.map((d, i) => (
                  <div key={d.id} className="grid grid-cols-1 md:grid-cols-[150px_1fr_84px_118px_140px_28px] gap-2 items-center rounded-lg border border-neutral-200 bg-white p-2">
                    <Select value={d.type} onChange={(e) => editDetail(d.id, { type: e.target.value as BOQCategory })} aria-label={t(`Product type, item ${i + 1}`, `نوع المنتج، البند ${i + 1}`)}>
                      <option value="">{t('Select…', 'اختر…')}</option>
                      {BOQ_CATEGORIES.map((c) => <option key={c} value={c}>{isAr ? BOQ_CATEGORY_META[c].ar : BOQ_CATEGORY_META[c].en}</option>)}
                    </Select>
                    <Input value={d.name} onChange={(e) => editDetail(d.id, { name: e.target.value })} placeholder={t('e.g. Laptop, 14-inch, 16 GB RAM', 'مثال: حاسوب محمول 14 بوصة')} aria-label={t(`Product name, item ${i + 1}`, `اسم المنتج، البند ${i + 1}`)} />
                    <Input type="number" min={1} value={d.qty} onChange={(e) => editDetail(d.id, { qty: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0" aria-label={t(`Quantity, item ${i + 1}`, `الكمية، البند ${i + 1}`)} />
                    <Input type="number" min={0} value={d.unitPrice} onChange={(e) => editDetail(d.id, { unitPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0.00" aria-label={t(`Unit price, item ${i + 1}`, `سعر الوحدة، البند ${i + 1}`)} />
                    <Input type="date" value={d.deliveryDate} onChange={(e) => editDetail(d.id, { deliveryDate: e.target.value })} aria-label={t(`Delivery date, item ${i + 1}`, `موعد التسليم، البند ${i + 1}`)} />
                    <button type="button" onClick={() => removeDetail(d.id)} className="w-7 h-7 rounded-md text-neutral-500 hover:text-error-600 hover:bg-error-50 flex items-center justify-center" aria-label={t(`Remove item ${i + 1}`, `إزالة البند ${i + 1}`)}>×</button>
                  </div>
                ))}
                <button type="button" onClick={addDetail} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-brand-300 text-[12.5px] font-semibold text-brand-700 hover:bg-brand-50 transition-colors">
                  + {t('Add item', 'إضافة بند')}
                </button>
              </div>
              )}
            </div>
            )}

            {/* Check procurement route CTA — enabled once the user has entered what they need */}
            <div className="pt-1">
              {intakeError && (
                <div className="mb-2 flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-[13px] text-error-700">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16h.01" strokeLinecap="round" /></svg>
                  <span className="leading-relaxed">{intakeError}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-neutral-500">
                  {!mode
                    ? (selected.length > 0 ? t('Choose how you want to procure to continue', 'اختر طريقة الشراء للمتابعة') : t('Select a project and items to continue', 'اختر مشروعاً وبنوداً للمتابعة'))
                    : mode === 'help'
                    ? (clsInput.length > 0 ? t(`${clsInput.length} item${clsInput.length > 1 ? 's' : ''} to check`, `${clsInput.length} بند للفحص`) : t('List what you need to continue', 'اذكر ما تحتاجه للمتابعة'))
                    : t(`${selected.length} budgeted item${selected.length > 1 ? 's' : ''} selected`, `${selected.length} بند معتمد محدد`)}
                </span>
                {mode === 'help' ? (
                  <Button variant="primary" size="lg" onClick={runCheck} disabled={intakeStyle === 'fields' ? detailsUsed.length === 0 : (text.trim().length === 0 && freeValid.length === 0 && selected.length === 0)}>
                    {t('Send to Procurement for an Etimad check', 'إرسال إلى المشتريات لفحص اعتماد')} →
                  </Button>
                ) : (
                  <Button variant="primary" size="lg" onClick={() => continueDirect(mode as 'tender' | 'emarket')} disabled={!mode || selected.length === 0}>
                    {mode === 'emarket' ? t('Continue with Etimad E-Market', 'المتابعة بالسوق الإلكتروني') : mode === 'tender' ? t('Continue with tender', 'المتابعة بالمنافسة') : t('Continue', 'متابعة')} →
                  </Button>
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* CHECKING */}
      {phase === 'checking' && (
        <SectionCard>
          <div className="py-6 max-w-[460px] mx-auto">
            <p className="text-center text-[14px] font-medium text-neutral-700 mb-5">{t('Validating against Etimad…', 'التحقق من اعتماد…')}</p>
            <CheckRow done={check1} labelEn="Checking Etimad eMarket availability" labelAr="فحص توفر السوق الإلكتروني في اعتماد" t={t} />
            <CheckRow done={check2} pending={!check1}
              labelEn={mode === 'tender' ? 'Matching items to your tender' : mode === 'emarket' ? 'Confirming catalogue matches' : 'Grouping by BOQ type & route'}
              labelAr={mode === 'tender' ? 'مطابقة البنود مع المنافسة' : mode === 'emarket' ? 'تأكيد التطابق مع الكتالوج' : 'التجميع حسب نوع البند والمسار'} t={t} />
          </div>
        </SectionCard>
      )}

      {/* AWAITING PROCUREMENT */}
      {phase === 'awaiting' && (
        <div className="space-y-4">
          <SectionCard>
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-full bg-warning-50 text-warning-600 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[15px] font-semibold text-neutral-900">{t('Waiting for Procurement’s Etimad check', 'بانتظار فحص المشتريات في اعتماد')}</h3>
                  <Badge variant="warning">{t('With Procurement', 'لدى المشتريات')}</Badge>
                </div>
                <p className="text-[13px] text-neutral-600 mt-0.5">
                  {t(`Sent on ${new Date(sentAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}. Procurement checks each item on Etimad eMarket and tells you which can be bought there and which need a tender. You’ll be notified when they reply.`,
                     'يفحص فريق المشتريات كل بند في السوق الإلكتروني ويخبرك بما يمكن شراؤه منه وما يتطلب منافسة. ستُبلَّغ عند الرد.')}
                </p>
                <p className="text-[12px] text-neutral-500 mt-2">{t('Route you asked for:', 'المسار الذي طلبته:')} <span className="font-semibold text-neutral-700">{mode === 'tender' ? t('Tendering', 'منافسة') : mode === 'emarket' ? t('Etimad eMarket', 'السوق الإلكتروني') : t('Help me decide', 'ساعدني في الاختيار')}</span></p>
              </div>
            </div>
            <ul className="mt-4 rounded-lg border border-neutral-200 divide-y divide-neutral-100">
              {pending.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <span className="text-[13px] text-neutral-800">{isAr ? (c.nameAr ?? c.name) : c.name}</span>
                  <span className="text-[11px] text-neutral-500">{c.projectItemId ? t('Budgeted item', 'بند معتمد') : (() => { const d = detailOf(c.id); if (!d) return t('Added', 'مضاف');
                    const bits = [d.type ? (isAr ? BOQ_CATEGORY_META[d.type].ar : BOQ_CATEGORY_META[d.type].en) : '', d.qty !== '' ? `× ${d.qty}` : '', d.unitPrice !== '' ? `SAR ${Number(d.unitPrice).toLocaleString('en-US')}` : '', d.deliveryDate ? t(`by ${d.deliveryDate}`, `بحلول ${d.deliveryDate}`) : ''].filter(Boolean);
                    return bits.join(' · '); })()}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button variant="secondary" onClick={() => { setPending([]); setPhase('select'); }}>{t('Withdraw & edit', 'سحب وتعديل')}</Button>
              <span className="text-[12px] text-neutral-500">{t('You can withdraw until Procurement replies.', 'يمكنك السحب حتى يرد فريق المشتريات.')}</span>
            </div>
          </SectionCard>
          <div className="rounded-xl border border-dashed border-neutral-300 px-5 py-3 flex items-center justify-between gap-3">
            <p className="text-[12.5px] text-neutral-600"><span className="font-semibold">{t('Prototype:', 'نموذج أولي:')}</span> {t('there is no Procurement team behind this demo.', 'لا يوجد فريق مشتريات خلف هذا العرض.')}</p>
            <button type="button" onClick={simulateProcurementReply} className="text-[12.5px] font-semibold text-link hover:underline whitespace-nowrap">{t('Simulate Procurement response', 'محاكاة رد المشتريات')} →</button>
          </div>
        </div>
      )}

      {/* Who checked — shown on the result screens */}
      {(phase === 'result' || phase === 'review') && reviewedAt && (
        <p className="mb-3 text-[12px] text-neutral-500">
          {t('Checked on Etimad by the Procurement team', 'تم الفحص في اعتماد من فريق المشتريات')} · {new Date(reviewedAt).toLocaleString(isAr ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} <span className="text-neutral-400">{t('(simulated for the prototype)', '(محاكاة للنموذج الأولي)')}</span>
        </p>
      )}

      {/* RESULT */}
      {phase === 'result' && chosen && (
        <div className="space-y-5">
          {groups.length > 1 && (
            <InfoBanner variant="warning">
              {t(`These items follow two different procurement routes, so they’re split into ${groups.length} requests — one Etimad eMarket request and one Competitive Tender request. Pick the one to create now; the other can be created afterwards as a separate request from My Requests.`,
                 `تتبع هذه البنود مسارَي شراء مختلفين، لذا تُقسَّم إلى ${groups.length} طلبات — طلب للسوق الإلكتروني وطلب للمنافسة. اختر الطلب الذي تريد إنشاءه الآن؛ ويمكن إنشاء الآخر لاحقاً كطلب منفصل من "طلباتي".`)}
            </InfoBanner>
          )}

          <SectionCard title={groups.length > 1 ? t('Requests to create', 'الطلبات المطلوب إنشاؤها') : t('Procurement route', 'مسار الشراء')}>
            <div className="space-y-2.5">
              {groups.map((g) => {
                const rm = ROUTE_META[g.route];
                const isChosen = g.key === chosenKey;
                const selectable = groups.length > 1;
                return (
                  <button key={g.key} type="button" onClick={() => selectable && setChosenKey(g.key)}
                    className={`w-full text-start rounded-xl border px-4 py-3 transition-all ${isChosen ? 'border-brand-600 bg-brand-50' : 'border-neutral-200 bg-white'} ${selectable ? 'hover:border-neutral-300 cursor-pointer' : 'cursor-default'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectable && <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${isChosen ? 'border-brand-600 bg-brand-600' : 'border-neutral-400'}`}>{isChosen && <span className="w-1.5 h-1.5 rounded-full bg-white" />}</span>}
                        <Badge variant={rm.badge}>{isAr ? rm.ar : rm.en}</Badge>
                        <span className="text-[11px] text-neutral-500">·</span>
                        {g.boqTypes.map((bt) => { const bm = BOQ_TYPE_META[bt]; return <Badge key={bt} variant={bm.badge}>{isAr ? bm.ar : bm.en}</Badge>; })}
                      </div>
                      <span className="text-[12px] text-neutral-500 whitespace-nowrap">{t(`${g.items.length} item${g.items.length > 1 ? 's' : ''}`, `${g.items.length} بند`)}{selectable && isChosen ? ` · ${t('this request', 'هذا الطلب')}` : selectable ? ` · ${t('separate request', 'طلب منفصل')}` : ''}</span>
                    </div>
                    <p className="text-[12px] text-neutral-600 mt-1.5 ps-0.5">{g.items.map((i) => (isAr ? i.nameAr : i.name)).join(isAr ? '، ' : ', ')}</p>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setPhase('select')}>← {t('Back to items', 'العودة إلى البنود')}</Button>
            <Button variant="primary" size="lg" onClick={confirmChosen}>
              {chosen.route === 'tendering' ? t('Create this request & continue', 'إنشاء هذا الطلب والمتابعة') : t('Create eMarket purchase & continue', 'إنشاء طلب الشراء ومتابعة')} →
            </Button>
          </div>
        </div>
      )}

      {/* REVIEW — Tendering or Etimad eMarket chosen by the requester */}
      {phase === 'review' && (
        <div className="space-y-5">
          {mode === 'tender' && (flagged.length === 0 ? (
            <SectionCard>
              <ReviewHead tone="success" title={t(`All ${rest.length} item${rest.length > 1 ? 's' : ''} need a competitive tender`, `جميع البنود (${rest.length}) تتطلب منافسة`)}
                body={t('None of these items are listed on Etimad eMarket, so they all go into this tender.', 'لا يوجد أي من هذه البنود في السوق الإلكتروني (اعتماد)، لذا تُدرج جميعها في هذه المنافسة.')} />
              <ItemList items={rest} isAr={isAr} />
            </SectionCard>
          ) : (
            <SectionCard>
              <ReviewHead tone="warning" title={t(`${flagged.length} item${flagged.length > 1 ? 's are' : ' is'} available on Etimad eMarket`, `${flagged.length} بند متاح في السوق الإلكتروني (اعتماد)`)}
                body={t('Items listed on eMarket are normally bought there directly. Choose how to handle them.', 'البنود المدرجة في السوق الإلكتروني تُشترى عادةً منه مباشرة. اختر كيفية التعامل معها.')} />
              <ItemList items={flagged} isAr={isAr} badge={{ variant: 'success', text: t('On eMarket', 'في السوق الإلكتروني') }} />
              <div role="radiogroup" className="mt-4 space-y-2.5">
                <ChoiceRow on={tenderAction === 'move'} disabled={rest.length === 0} onPick={() => setTenderAction('move')}
                  title={t('Move them to a draft eMarket request', 'نقلها إلى مسودة طلب في السوق الإلكتروني')}
                  body={rest.length === 0
                    ? t('Nothing would be left for this tender. Keep them with a justification, or go back and choose Etimad eMarket.', 'لن يتبقى شيء لهذه المنافسة. أبقها مع مبرر، أو عد واختر السوق الإلكتروني.')
                    : t(`We’ll save them as a separate draft in My Requests and continue this tender with the other ${rest.length} item${rest.length > 1 ? 's' : ''}: ${itemNames(rest)}.`, `سنحفظها كمسودة منفصلة في "طلباتي" ونتابع هذه المنافسة بالبنود الأخرى (${rest.length}): ${itemNames(rest)}.`)} />
                <ChoiceRow on={tenderAction === 'justify'} onPick={() => setTenderAction('justify')}
                  title={t('Keep them in this tender', 'إبقاؤها في هذه المنافسة')}
                  body={t('Explain why these items need to be tendered rather than bought on eMarket.', 'وضّح سبب طرح هذه البنود في منافسة بدلاً من شرائها من السوق الإلكتروني.')}>
                  {tenderAction === 'justify' && (
                    <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
                      <label htmlFor="route-justification" className="block text-[12px] font-medium text-neutral-700 mb-1">{t('Justification', 'المبرر')} <span className="text-error-600">*</span></label>
                      <Textarea id="route-justification" rows={3} value={justification} onChange={(e) => setJustification(e.target.value)}
                        placeholder={t('e.g. Needs to be bundled with installation and support under one contract.', 'مثال: يجب دمجها مع التركيب والدعم في عقد واحد.')} />
                      {justification.trim().length > 0 && justification.trim().length < 15 && (
                        <p className="text-[11px] text-neutral-500 mt-1">{t('Add a little more detail (at least 15 characters).', 'أضف مزيداً من التفاصيل (15 حرفاً على الأقل).')}</p>
                      )}
                    </div>
                  )}
                </ChoiceRow>
              </div>
            </SectionCard>
          ))}

          {mode === 'emarket' && (flagged.length === 0 ? (
            <SectionCard>
              <ReviewHead tone="success" title={t(`All ${rest.length} item${rest.length > 1 ? 's are' : ' is'} available on Etimad eMarket`, `جميع البنود (${rest.length}) متاحة في السوق الإلكتروني (اعتماد)`)}
                body={t('You can buy these directly from the Etimad catalogue.', 'يمكنك شراء هذه البنود مباشرة من كتالوج اعتماد.')} />
              <ItemList items={rest} isAr={isAr} />
            </SectionCard>
          ) : (
            <SectionCard>
              <ReviewHead tone="warning"
                title={rest.length === 0
                  ? t('None of these items are on Etimad eMarket', 'لا يوجد أي من هذه البنود في السوق الإلكتروني (اعتماد)')
                  : t(`${flagged.length} item${flagged.length > 1 ? 's aren’t' : ' isn’t'} available on Etimad eMarket`, `${flagged.length} بند غير متاح في السوق الإلكتروني (اعتماد)`)}
                body={rest.length === 0
                  ? t('These items need a competitive tender. Continue with this request as a tender instead.', 'تتطلب هذه البنود منافسة. تابع هذا الطلب كمنافسة بدلاً من ذلك.')
                  : t(`These can’t be bought on eMarket. We’ll move them to a draft tender request in My Requests and continue the eMarket purchase with the other ${rest.length} item${rest.length > 1 ? 's' : ''}.`, `لا يمكن شراء هذه البنود من السوق الإلكتروني. سننقلها إلى مسودة طلب منافسة في "طلباتي" ونتابع الشراء بالبنود الأخرى (${rest.length}).`)} />
              <ItemList items={flagged} isAr={isAr} badge={{ variant: 'warning', text: t('Needs a tender', 'يتطلب منافسة') }} />
              {rest.length > 0 && (
                <>
                  <p className="text-[12px] font-medium text-neutral-600 mt-4 mb-1.5">{t('Continuing on Etimad eMarket', 'المتابعة في السوق الإلكتروني')}</p>
                  <ItemList items={rest} isAr={isAr} badge={{ variant: 'success', text: t('On eMarket', 'في السوق الإلكتروني') }} />
                </>
              )}
            </SectionCard>
          ))}

          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setPhase('select')}>← {t('Back to items', 'العودة إلى البنود')}</Button>
            {mode === 'tender' ? (
              <Button variant="primary" size="lg" onClick={continueTender}
                disabled={flagged.length > 0 && tenderAction === 'justify' && justification.trim().length < 15}>
                {flagged.length === 0 ? t('Continue with tender', 'المتابعة بالمنافسة')
                  : tenderAction === 'move' ? t('Move to draft & continue tender', 'النقل إلى مسودة ومتابعة المنافسة')
                  : t('Continue with justification', 'المتابعة مع المبرر')} →
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={continueEmarket}>
                {flagged.length === 0 ? t('Continue with eMarket purchase', 'متابعة الشراء من السوق الإلكتروني')
                  : rest.length === 0 ? t('Continue as a tender request', 'المتابعة كطلب منافسة')
                  : t('Move to draft & continue', 'النقل إلى مسودة والمتابعة')} →
              </Button>
            )}
          </div>
        </div>
      )}

      {/* LANDING (eMarket) */}
      {phase === 'landing' && chosen && (
        <SectionCard>
          <div className="py-8 text-center max-w-[460px] mx-auto">
            <div className="w-12 h-12 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-4"><CheckIcon className="w-6 h-6 text-success-600" /></div>
            <h3 className="text-[16px] font-semibold text-neutral-900">{t('Routed to Etimad eMarket', 'تمت الإحالة إلى السوق الإلكتروني')}</h3>
            <p className="text-[13px] text-neutral-500 mt-1.5">{t('These items are bought off-catalogue, so the tender steps don’t apply.', 'تُشترى هذه البنود من الكتالوج، لذا لا تنطبق خطوات المنافسة.')}</p>
            <div className="flex justify-center mt-5"><Button variant="secondary" onClick={() => setPhase('result')}>{t('Back to result', 'العودة إلى النتيجة')}</Button></div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function Check({ checked, mixed, onChange }: { checked: boolean; mixed?: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center transition-colors ${checked || mixed ? 'bg-brand-600 border-brand-600' : 'border-neutral-300 bg-white hover:border-neutral-400'}`}>
      {checked && <CheckIcon className="w-3 h-3 text-white" />}
      {!checked && mixed && <span className="w-2 h-0.5 bg-white rounded" />}
    </button>
  );
}

function CheckRow({ done, pending, labelEn, labelAr, t }: { done: boolean; pending?: boolean; labelEn: string; labelAr: string; t: (en: string, ar: string) => string }) {
  return (
    <div className={`flex items-center gap-3 py-2.5 transition-opacity ${pending ? 'opacity-40' : 'opacity-100'}`}>
      <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-success-100' : 'bg-neutral-100'}`}>
        {done ? <CheckIcon className="w-4 h-4 text-success-600" /> : <svg className="w-4 h-4 spin-slow text-neutral-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
      </span>
      <span className="text-[13px] text-neutral-700">{t(labelEn, labelAr)}{done ? '' : '…'}</span>
      {done && <span className="text-[12px] text-success-600 ms-auto font-medium">{t('Done', 'تم')}</span>}
    </div>
  );
}

/** "Know more" — side drawer explaining the procurement route (Figma 135:3923). */
function RouteInfoModal({ onClose, isAr, t }: { onClose: () => void; isAr: boolean; t: (en: string, ar: string) => string }) {
  const steps = [
    t('Pick your project and the items you need — or paste a list.', 'اختر مشروعك والبنود التي تحتاجها — أو الصق قائمة.'),
    t('Procurement checks each item on Etimad.', 'يفحص فريق المشتريات كل بند في منصة اعتماد.'),
    t('Items are grouped by route — one request follows one route.', 'تُجمَّع البنود حسب المسار — كل طلب يتبع مساراً واحداً.'),
    t('You confirm and continue to build the request.', 'تؤكد وتتابع لبناء الطلب.'),
  ];
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[2px]" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="route-info-title" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="relative w-full max-w-[400px] h-full bg-white rounded-s-[12px] shadow-2xl overflow-y-auto p-6 drawer-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] leading-[16.5px] font-semibold uppercase tracking-[0.275px] text-ai-700">{t('Why this step', 'لماذا هذه الخطوة')}</p>
            <h2 id="route-info-title" className="text-[22px] leading-[24px] font-bold text-neutral-900">{t('The procurement route', 'مسار الشراء')}</h2>
          </div>
          <DrawerClose onClose={onClose} label={t('Close', 'إغلاق')} />
        </div>

        <div className="mt-3 rounded-lg bg-brand-50 py-5 flex justify-center">
          <img src={routeIllustration} alt="" width={252} height={152} className="block" />
        </div>

        <p className="mt-[10.5px] text-[14px] leading-[22.75px] text-neutral-600">
          {t('Before you build a request, Procurement checks how each item can be bought. The procurement route is the channel an item takes to reach suppliers via Etimad — and getting it right keeps you compliant and saves time.',
             'قبل بناء الطلب، تتحقق منافسات من كيفية شراء كل بند. مسار الشراء هو القناة التي يسلكها البند للوصول إلى المورّدين عبر منصة اعتماد — واختياره الصحيح يضمن الالتزام ويوفّر الوقت.')}
        </p>

        <div className="mt-[17.5px] space-y-[10.5px]">
          <div className="rounded-[10.5px] border border-success-100 bg-success-50/60 p-[12.25px]">
            <Badge variant="success">{t('Etimad eMarket', 'السوق الإلكتروني')}</Badge>
            <p className="mt-[5.25px] text-[13px] leading-[19.5px] text-neutral-600">{t('Catalogue items bought directly from listed suppliers on Etimad — fast, no tender needed.', 'بنود كتالوجية تُشترى مباشرة من موردين مُدرجين في اعتماد — سريعة ولا تحتاج منافسة.')}</p>
          </div>
          <div className="rounded-[10.5px] border border-warning-100 bg-warning-50/60 p-[12.25px]">
            <Badge variant="warning">{t('Competitive Tender', 'منافسة')}</Badge>
            <p className="mt-[5.25px] text-[13px] leading-[19.5px] text-neutral-600">{t('Items that must be competed — suppliers submit offers on Etimad against your scope and BOQ.', 'بنود يجب طرحها في منافسة — يقدّم المورّدون عروضهم في اعتماد وفق نطاق العمل وجدول الكميات.')}</p>
          </div>
        </div>

        <p className="mt-[21px] text-[12px] leading-[18px] font-semibold uppercase tracking-[0.3px] text-neutral-500">{t('How it works', 'كيف تعمل')}</p>
        <ol className="mt-[7px] space-y-[8.75px]">
          {steps.map((label, i) => (
            <li key={i} className="flex items-start gap-[10.5px]">
              <span className="mt-[1.75px] w-[21px] h-[21px] rounded-full bg-brand-50 text-brand-700 text-[12px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <span className="pt-[2px] text-[13px] leading-[16px] text-neutral-700">{label}</span>
            </li>
          ))}
        </ol>

        <div className="mt-[21px] rounded-[10.5px] bg-ai-50 border border-ai-100 p-[12.25px]">
          <p className="text-[12.5px] leading-[20.3px] text-ai-800">
            {t('A request can’t mix routes. If your items span both, we split them so each follows the right process — and you can create the other request afterwards.',
               'لا يمكن أن يجمع الطلب بين مسارين. إذا كانت بنودك تتوزع على الاثنين، نقسّمها ليتبع كل منها المسار الصحيح — ويمكنك إنشاء الطلب الآخر لاحقاً.')}
          </p>
        </div>

        <div className="mt-[21px] flex justify-end">
          <button type="button" onClick={onClose}
            className="px-[14px] py-[7px] rounded-[7px] bg-brand-600 text-white text-[13px] leading-[19.5px] font-medium shadow-[0_1px_1px_rgba(27,31,25,0.06)] hover:bg-brand-700 transition-colors">
            {t('Got it', 'فهمت')}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubSteps({ phase, t }: { phase: Phase; t: (en: string, ar: string) => string }) {
  const steps = [{ en: 'Describe items', ar: 'وصف البنود' }, { en: 'Procurement check', ar: 'فحص المشتريات' }, { en: 'Choose route', ar: 'اختيار المسار' }];
  const cur = phase === 'select' ? 0 : phase === 'awaiting' || phase === 'checking' ? 1 : 2;
  return (
    <div className="flex items-center gap-2 mb-5">
      {steps.map((s, i) => (
        <div key={s.en} className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${i === cur ? 'bg-brand-600 text-white' : i < cur ? 'bg-brand-50 text-brand-700' : 'bg-neutral-100 text-neutral-500'}`}>
            <span className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center text-[10px]">{i + 1}</span>{t(s.en, s.ar)}
          </div>
          {i < steps.length - 1 && <div className={`w-6 h-px ${i < cur ? 'bg-brand-300' : 'bg-neutral-200'}`} />}
        </div>
      ))}
    </div>
  );
}

const MODE_OPTIONS: { key: RouteMode; en: string; ar: string; descEn: string; descAr: string; iconBg: string; icon: React.ReactNode }[] = [
  { key: 'tender', en: 'Tendering', ar: 'منافسة', descEn: 'Suppliers bid on Etimad against your scope and BOQ.', descAr: 'يتقدم المورّدون بعروضهم في اعتماد وفق نطاق العمل وجدول الكميات.',
    iconBg: 'bg-warning-50 text-warning-600',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M14 4l6 6M12 6l6 6M9.5 8.5l6 6M4 20l7-7M3 21h8" /></svg> },
  { key: 'emarket', en: 'Etimad E-Market', ar: 'السوق الإلكتروني', descEn: 'Buy listed items directly from the Etimad catalogue.', descAr: 'شراء البنود المدرجة مباشرة من كتالوج اعتماد.',
    iconBg: 'bg-success-50 text-success-600',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M4 5h2l2.2 10.2a1.5 1.5 0 001.5 1.2h7.1a1.5 1.5 0 001.5-1.1L21 8H7" /><circle cx="10" cy="20" r="1.2" /><circle cx="18" cy="20" r="1.2" /></svg> },
  { key: 'help', en: 'Help me decide', ar: 'ساعدني في الاختيار', descEn: 'Not sure? Procurement checks your items on Etimad and tells you the route.', descAr: 'لست متأكداً؟ سنفحص بنودك ونقترح المسار.',
    iconBg: 'bg-ai-50 text-ai-600',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17h.01" /></svg> },
];

function ReviewHead({ tone, title, body }: { tone: 'success' | 'warning'; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 mb-3">
      <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tone === 'success' ? 'bg-success-50 text-success-600' : 'bg-warning-50 text-warning-600'}`}>
        {tone === 'success'
          ? <CheckIcon className="w-4 h-4" />
          : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 9v4M12 17h.01" strokeLinecap="round" /><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>}
      </span>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-neutral-900">{title}</h3>
        <p className="text-[13px] text-neutral-600 mt-0.5 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function ItemList({ items, isAr, badge }: { items: ItemVerdict[]; isAr: boolean; badge?: { variant: 'success' | 'warning'; text: string } }) {
  return (
    <ul className="rounded-lg border border-neutral-200 divide-y divide-neutral-100">
      {items.map((i) => (
        <li key={i.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
          <span className="text-[13px] text-neutral-800">{isAr ? i.nameAr : i.name}</span>
          {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
        </li>
      ))}
    </ul>
  );
}

function ChoiceRow({ on, disabled, onPick, title, body, children }: { on: boolean; disabled?: boolean; onPick: () => void; title: string; body: string; children?: React.ReactNode }) {
  return (
    <div role="radio" aria-checked={on} aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : 0}
      onClick={() => { if (!disabled) onPick(); }}
      onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onPick(); } }}
      className={`rounded-xl border px-4 py-3 transition-colors ${disabled ? 'opacity-60 cursor-not-allowed border-neutral-200' : on ? 'border-brand-600 bg-brand-50/60 cursor-pointer' : 'border-neutral-200 hover:border-neutral-300 cursor-pointer'}`}>
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${on && !disabled ? 'border-brand-600 bg-brand-600' : 'border-neutral-300'}`}>{on && !disabled && <span className="w-1.5 h-1.5 rounded-full bg-white" />}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-neutral-900">{title}</p>
          <p className="text-[12px] text-neutral-600 mt-0.5 leading-relaxed">{body}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
