import { useRef, useState, type ChangeEvent } from 'react';
import { useTender } from '../context/TenderContext';
import { useLanguage, useT } from '../context/LanguageContext';
import { Button, Select, SectionCard, Badge, InfoBanner, Textarea } from '../components/ui';
import { CheckIcon, ClockIcon, DocumentIcon, PlusIcon, XIcon } from '../components/Icons';
import { PROJECTS } from '../data/mockData';
import type { ProjectItem, RouteReview, RouteReviewItem } from '../types/tender';
import {
  classifyItem, groupItems, forcedRoute, ROUTE_META, BOQ_TYPE_META,
  type ItemVerdict, type RequestGroup, type RouteKey,
} from '../lib/triage';

/** An item the requester adds by hand (not in the project's item list). */
interface FreeItem { id: string; name: string; qty: number | ''; }

/** Split pasted text into items, one per line. A leading or trailing number is taken as the quantity
 *  ("20 contractor engineers", "Network switches x4"). Plain text parsing — no AI. */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function parseLines(text: string): { name: string; qty: number | '' }[] {
  return text.split(/\r?\n/)
    .map((raw) => raw.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
    .filter(Boolean)
    .map((line) => {
      let m = line.match(/^(.*?)\s*(?:\bx|×|\bqty\.?|\bquantity|[-,(])\s*(\d{1,6})\)?\s*$/i);
      if (m && m[1].trim()) return { name: m[1].trim(), qty: Number(m[2]) };
      m = line.match(/^(\d{1,6})\s+(.+)$/);
      if (m) return { name: cap(m[2].trim()), qty: Number(m[1]) };
      return { name: line, qty: '' as const };
    });
}

const fmtWhen = (iso: string, isAr: boolean) =>
  new Intl.DateTimeFormat(isAr ? 'ar-SA-u-ca-gregory' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `f_${Math.random().toString(36).slice(2)}`);

type Phase = 'select' | 'awaiting' | 'result' | 'landing';

export default function ProcurementRouteStep() {
  const { isAr } = useLanguage();
  const t = useT();
  const { confirmRoute, routeConfirmed, formData, updateField } = useTender();
  const review = formData.routeReview;

  const [phase, setPhase] = useState<Phase>('select');
  const [projectId, setProjectId] = useState('');
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [chosenKey, setChosenKey] = useState('');

  // Additional items the requester lists by hand, a pasted list, an attached file and a note for Procurement.
  const [freeItems, setFreeItems] = useState<FreeItem[]>([]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const project = PROJECTS.find((p) => p.id === projectId);
  const items: ProjectItem[] = project?.items ?? [];
  const selected = items.filter((i) => itemIds.includes(i.id));
  const freeValid = freeItems.filter((f) => f.name.trim().length > 0);
  const sendCount = selected.length + freeValid.length;

  // Already confirmed (navigated back, or opened an existing request) → summary + edit.
  if (routeConfirmed && phase === 'select' && !projectId) {
    const r: RouteKey = formData.sourceType === 'souq-etimad' ? 'souq-etimad' : 'tendering';
    const m = ROUTE_META[r];
    const confProj = PROJECTS.find((p) => p.id === formData.projectId);
    const confItems = confProj ? confProj.items.filter((i) => (formData.selectedProjectItemIds ?? []).includes(i.id)) : [];
    const startEdit = () => { loadFromReview(); setProjectId(formData.projectId); setItemIds(formData.selectedProjectItemIds ?? []); setPhase('select'); };
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

  function pickProject(id: string) { setProjectId(id); setItemIds([]); }
  const toggle = (id: string) => setItemIds((xs) => xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]);
  const toggleAll = () => setItemIds((xs) => xs.length === items.length ? [] : items.map((i) => i.id));

  // Additional items
  const addFree = () => setFreeItems((xs) => [...xs, { id: uid(), name: '', qty: '' }]);
  const editFree = (id: string, patch: Partial<FreeItem>) => setFreeItems((xs) => xs.map((f) => f.id === id ? { ...f, ...patch } : f));
  const removeFree = (id: string) => setFreeItems((xs) => xs.filter((f) => f.id !== id));
  function addPasted() {
    const rows = parseLines(pasteText).map((r) => ({ id: uid(), ...r }));
    if (rows.length) setFreeItems((xs) => [...xs.filter((f) => f.name.trim()), ...rows]);
    setPasteText(''); setPasteOpen(false);
  }
  function onAttach(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setAttachment(f.name);
    e.target.value = '';
  }

  // Bring the last sent list back into the form (Withdraw & edit, or Edit after confirming).
  function loadFromReview() {
    if (!review) return;
    setProjectId(review.projectId);
    setItemIds(review.items.filter((i) => i.projectItemId).map((i) => i.projectItemId!));
    setFreeItems(review.items.filter((i) => !i.projectItemId).map((i) => ({ id: i.id, name: i.name, qty: i.quantity ?? '' })));
    setAttachment(review.attachmentName ?? null);
    setNote(review.note ?? '');
  }

  function sendForReview() {
    if (!project || sendCount === 0) return;
    const reviewItems: RouteReviewItem[] = [
      ...selected.map((i) => ({ id: i.id, name: i.name, nameAr: i.nameAr, projectItemId: i.id, quantity: '' as const })),
      ...freeValid.map((f) => ({ id: f.id, name: f.name.trim(), quantity: f.qty })),
    ];
    const next: RouteReview = {
      status: 'awaiting', projectId: project.id, items: reviewItems,
      note: note.trim() || undefined, attachmentName: attachment ?? undefined, sentAt: new Date().toISOString(),
    };
    updateField('routeReview', next);
    updateField('projectId', project.id);
    updateField('costCenterId', project.costCenterId);
  }

  function withdraw() {
    loadFromReview();
    updateField('routeReview', undefined);
    setPhase('select');
  }

  // Prototype only: fill in Procurement's response using the demo routing rules.
  function simulateResponse() {
    if (!review) return;
    const override = forcedRoute();
    const decided = review.items.map((it) => {
      const v = classifyItem({ id: it.id, name: it.name, nameAr: it.nameAr, type: PROJECTS.find((p) => p.id === review.projectId)?.items.find((x) => x.id === it.projectItemId)?.type }, override);
      return {
        ...it,
        route: ROUTE_META[v.route].sourceType,
        comment: v.route === 'souq-etimad'
          ? t('Listed on Etimad eSouq — buy directly from the catalogue.', 'متوفر في السوق الإلكتروني — يُشترى مباشرة من الكتالوج.')
          : t('Not available on eSouq — needs a competitive tender.', 'غير متوفر في السوق الإلكتروني — يتطلب منافسة.'),
      };
    });
    updateField('routeReview', { ...review, items: decided, status: 'returned', returnedAt: new Date().toISOString(), reviewer: 'Procurement team', simulated: true });
  }

  // Procurement's response → one request per route.
  const groups: RequestGroup[] = review?.status === 'returned'
    ? groupItems(review.items.map((it): ItemVerdict => {
        const v = classifyItem({ id: it.id, name: it.name, nameAr: it.nameAr });
        const route: RouteKey = it.route === 'souq-etimad' ? 'souq-etimad' : 'tendering';
        return { ...v, route, projectItemId: it.projectItemId, reason: it.comment ?? '', reasonAr: it.comment ?? '' };
      }))
    : [];

  function confirmChosen() {
    const g = groups.find((x) => x.key === chosenKey) ?? groups[0];
    if (!g || !review) return;
    confirmRoute({
      sourceType: ROUTE_META[g.route].sourceType,
      projectId: review.projectId,
      items: g.items.map((i) => ({ name: i.name, nameAr: i.nameAr, projectItemId: i.projectItemId, quantity: review.items.find((x) => x.id === i.id)?.quantity ?? '' })),
    });
    if (g.route !== 'tendering') setPhase('landing');
  }

  // Which view to show: the saved review decides, unless the user is on the eSouq landing page.
  const view: Phase = phase === 'landing' ? 'landing' : review?.status === 'awaiting' ? 'awaiting' : review?.status === 'returned' ? 'result' : 'select';

  const chosen = groups.find((g) => g.key === chosenKey) ?? groups[0];
  const reviewProject = PROJECTS.find((p) => p.id === review?.projectId);

  return (
    <div className="max-w-[820px]">
      <SubSteps phase={view} t={t} />

      {/* SELECT — list the items and send them to Procurement */}
      {view === 'select' && (
        <SectionCard
          title="What are you procuring?"
          titleAr="ما الذي تقوم بشرائه؟"
          description="Select the budgeted project and tick the items this request covers, then add anything else you need. Procurement checks each item and tells you which can be bought on Etimad eSouq and which need a competitive tender."
          descriptionAr="اختر المشروع المدرج في الميزانية وحدّد البنود التي يشملها هذا الطلب، ثم أضف أي بنود أخرى تحتاجها. تفحص إدارة المشتريات كل بند وتحدد ما يمكن شراؤه من السوق الإلكتروني وما يتطلب منافسة.">
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
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-medium text-neutral-800">{t('Project Items', 'بنود المشروع')}</p>
                  <span className="text-[12px] text-neutral-500">{t(`${itemIds.length} of ${items.length} selected`, `${itemIds.length} من ${items.length} محددة`)}</span>
                </div>
                <div className="rounded-xl border border-neutral-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200">
                        <th className="w-12 ps-4 py-2.5"><Check checked={itemIds.length === items.length} mixed={itemIds.length > 0 && itemIds.length < items.length} onChange={toggleAll} /></th>
                        <th className="text-start px-3 py-2.5 text-xs font-medium text-neutral-500">{t('Item', 'البند')}</th>
                        <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500">{t('Arabic Name', 'الاسم بالعربية')}</th>
                        <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500">{t('BOQ Type', 'نوع البند')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {items.map((item) => {
                        const checked = itemIds.includes(item.id);
                        const bt = BOQ_TYPE_META[classifyItem(item).boqType];
                        return (
                          <tr key={item.id} onClick={() => toggle(item.id)} className={`cursor-pointer transition-colors ${checked ? 'bg-brand-50/60' : 'bg-white hover:bg-neutral-50'}`}>
                            <td className="ps-4 py-3" onClick={(e) => e.stopPropagation()}><Check checked={checked} onChange={() => toggle(item.id)} /></td>
                            <td className="px-3 py-3 text-neutral-700 font-medium">{item.name}</td>
                            <td className="px-4 py-3 text-neutral-500 text-xs" dir="rtl">{item.nameAr}</td>
                            <td className="px-4 py-3"><Badge variant={bt.badge}>{isAr ? bt.ar : bt.en}</Badge></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Additional items — listed by hand (or pasted), plus an optional reference file */}
            {project && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-4">
                <p className="text-[13px] font-semibold text-neutral-800">{t('Additional items', 'بنود إضافية')} <span className="font-normal text-neutral-400">{t('Optional', 'اختياري')}</span></p>
                <p className="text-[12px] text-neutral-500 mt-0.5">{t('Anything else you need that isn’t in the project list. Procurement checks these too.', 'أي شيء آخر تحتاجه وغير موجود في قائمة المشروع. ستفحصه المشتريات أيضاً.')}</p>

                {freeItems.length > 0 && (
                  <div className="mt-3 rounded-lg border border-neutral-200 bg-white overflow-hidden">
                    <div className="grid grid-cols-[1fr_96px_32px] gap-2 px-3 py-2 border-b border-neutral-100 text-[11px] font-medium text-neutral-500">
                      <span>{t('Item', 'البند')}</span><span className="text-end">{t('Qty', 'الكمية')}</span><span />
                    </div>
                    {freeItems.map((f, i) => (
                      <div key={f.id} className="grid grid-cols-[1fr_96px_32px] gap-2 items-center px-3 py-1.5 border-b border-neutral-100 last:border-b-0">
                        <input value={f.name} onChange={(e) => editFree(f.id, { name: e.target.value })} autoFocus={i === freeItems.length - 1 && !f.name}
                          aria-label={t(`Item ${i + 1} name`, `اسم البند ${i + 1}`)} placeholder={t('Item name', 'اسم البند')}
                          className="min-w-0 text-[13px] text-neutral-800 bg-transparent outline-none placeholder:text-neutral-400 py-1" />
                        <input value={f.qty} inputMode="numeric" onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ''); editFree(f.id, { qty: v === '' ? '' : Number(v) }); }}
                          aria-label={t(`Item ${i + 1} quantity`, `كمية البند ${i + 1}`)} placeholder="—" dir="ltr"
                          className="w-full text-end text-[13px] tabular-nums text-neutral-800 bg-transparent outline-none placeholder:text-neutral-300 py-1" />
                        <button type="button" onClick={() => removeFree(f.id)} aria-label={t(`Remove item ${i + 1}`, `إزالة البند ${i + 1}`)}
                          className="w-7 h-7 rounded-md text-neutral-400 hover:text-error-600 hover:bg-error-50 flex items-center justify-center">
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {pasteOpen && (
                  <div className="mt-3">
                    <Textarea rows={4} value={pasteText} onChange={(e) => setPasteText(e.target.value)} autoFocus
                      placeholder={t('One item per line, e.g.\n20 contractor engineers\nOffice cleaning services\nNetwork switches x4', 'بند واحد في كل سطر، مثال:\n20 مهندس مقاول\nخدمات نظافة المكاتب\nمحولات شبكة ×4')} />
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="primary" size="sm" onClick={addPasted} disabled={!pasteText.trim()}>{t('Add to list', 'إضافة إلى القائمة')}</Button>
                      <Button variant="ghost" size="sm" onClick={() => { setPasteOpen(false); setPasteText(''); }}>{t('Cancel', 'إلغاء')}</Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <button type="button" onClick={addFree} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 transition-colors shadow-sm">
                    <PlusIcon className="w-3.5 h-3.5" />{t('Add item', 'إضافة بند')}
                  </button>
                  {!pasteOpen && <Button variant="secondary" size="sm" onClick={() => setPasteOpen(true)}>{t('Paste a list', 'لصق قائمة')}</Button>}
                  <input ref={fileRef} type="file" className="hidden" onChange={onAttach} accept=".txt,.csv,.xlsx,.xls,.doc,.docx,.pdf" />
                  {!attachment && <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>{t('Attach file', 'إرفاق ملف')}</Button>}
                  {attachment && (
                    <span className="inline-flex items-center gap-1.5 ps-2.5 pe-1 py-1 rounded-lg border border-neutral-200 bg-white text-[12px] text-neutral-700 max-w-[260px]">
                      <DocumentIcon className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                      <span className="truncate">{attachment}</span>
                      <button type="button" onClick={() => setAttachment(null)} aria-label={t('Remove file', 'إزالة الملف')} className="w-5 h-5 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100">
                        <XIcon className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 mt-2">{t('Attached files are sent to Procurement for reference.', 'تُرسل الملفات المرفقة إلى المشتريات كمرجع.')}</p>
              </div>
            )}

            {project && (
              <div>
                <label htmlFor="note-to-procurement" className="block text-[13px] font-medium text-neutral-800 mb-1.5">
                  {t('Note to Procurement', 'ملاحظة للمشتريات')} <span className="font-normal text-neutral-400">{t('Optional', 'اختياري')}</span>
                </label>
                <Textarea id="note-to-procurement" rows={2} value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder={t('Anything Procurement should know, e.g. timelines or preferred suppliers.', 'أي شيء يجب أن تعرفه المشتريات، مثل المواعيد أو الموردين المفضلين.')} />
              </div>
            )}

            {/* Send to Procurement */}
            <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/60 px-5 py-4">
              <p className="text-[13px] font-semibold text-neutral-700">{t('Procurement review', 'مراجعة المشتريات')}</p>
              <p className="text-[12px] text-neutral-500 mt-0.5">
                {t('Procurement checks each item and sends back which can be bought on Etimad eSouq and which need a competitive tender. Mixed items become separate requests. You’ll be notified when they reply.',
                   'تفحص المشتريات كل بند وتعيد إليك ما يمكن شراؤه من السوق الإلكتروني وما يتطلب منافسة. تُقسَّم البنود المختلطة إلى طلبات منفصلة. سيصلك إشعار عند الرد.')}
              </p>
              <div className="flex items-center justify-between mt-3 gap-3">
                <span className="text-[12px] text-neutral-500">{sendCount > 0 ? t(`${sendCount} item${sendCount > 1 ? 's' : ''} to send`, `${sendCount} بند للإرسال`) : t('Select or add at least one item to continue', 'اختر أو أضف بنداً واحداً على الأقل للمتابعة')}</span>
                <Button variant="primary" size="lg" onClick={sendForReview} disabled={!project || sendCount === 0}>{t('Send to Procurement for review', 'إرسال إلى المشتريات للمراجعة')} →</Button>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* AWAITING — sent, waiting for Procurement */}
      {view === 'awaiting' && review && (
        <div className="space-y-4">
          <SectionCard>
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-full bg-warning-50 text-warning-600 flex items-center justify-center flex-shrink-0"><ClockIcon className="w-5 h-5" /></span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[15px] font-semibold text-neutral-900">{t('Awaiting Procurement review', 'بانتظار مراجعة المشتريات')}</h3>
                  <Badge variant="submitted">{t('In review', 'قيد المراجعة')}</Badge>
                </div>
                <p className="text-[12.5px] text-neutral-500 mt-0.5">
                  {t(`Sent to the Procurement team on ${fmtWhen(review.sentAt, false)}. You’ll be notified in your Inbox when they reply; the next steps unlock once you confirm the route.`,
                     `أُرسل إلى فريق المشتريات في ${fmtWhen(review.sentAt, true)}. سيصلك إشعار في صندوق الوارد عند الرد، وتُفتح الخطوات التالية بعد تأكيد المسار.`)}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-neutral-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 border-b border-neutral-200">
                <p className="text-[12px] font-medium text-neutral-600">{reviewProject ? (isAr ? reviewProject.nameAr : reviewProject.name) : ''}</p>
                <p className="text-[12px] text-neutral-500">{t(`${review.items.length} item${review.items.length > 1 ? 's' : ''}`, `${review.items.length} بند`)}</p>
              </div>
              <ul className="divide-y divide-neutral-100">
                {review.items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="text-[13px] text-neutral-800">{isAr && it.nameAr ? it.nameAr : it.name}</span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                      {it.quantity !== '' && it.quantity !== undefined && <span className="text-[12px] text-neutral-500 tabular-nums">{t('Qty', 'الكمية')} {it.quantity}</span>}
                      <span className="text-[11px] text-neutral-400">{it.projectItemId ? t('Project item', 'بند مشروع') : t('Added', 'مضاف')}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {(review.attachmentName || review.note) && (
              <div className="mt-3 space-y-2">
                {review.attachmentName && (
                  <p className="inline-flex items-center gap-1.5 text-[12px] text-neutral-600"><DocumentIcon className="w-3.5 h-3.5 text-neutral-400" />{review.attachmentName}</p>
                )}
                {review.note && <p className="text-[12px] text-neutral-600"><span className="font-medium text-neutral-700">{t('Your note:', 'ملاحظتك:')}</span> {review.note}</p>}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-neutral-100">
              <Button variant="secondary" onClick={withdraw}>{t('Withdraw & edit', 'سحب وتعديل')}</Button>
              <span className="text-[11px] text-neutral-400">{t('You can withdraw until Procurement replies.', 'يمكنك السحب حتى ترد المشتريات.')}</span>
            </div>
          </SectionCard>

          {/* Prototype only */}
          <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-[12px] text-neutral-500"><span className="font-semibold text-neutral-600">{t('Prototype:', 'نموذج أولي:')}</span> {t('there is no Procurement team behind this demo.', 'لا يوجد فريق مشتريات خلف هذا العرض.')}</p>
            <button type="button" onClick={simulateResponse} className="text-[12px] font-semibold text-link hover:underline underline-offset-2 whitespace-nowrap">{t('Simulate procurement response', 'محاكاة رد المشتريات')}</button>
          </div>
        </div>
      )}

      {/* RESULT — Procurement's segregated list */}
      {view === 'result' && review && chosen && (
        <div className="space-y-5">
          <SectionCard>
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-full bg-success-50 text-success-600 flex items-center justify-center flex-shrink-0"><CheckIcon className="w-5 h-5" /></span>
              <div>
                <h3 className="text-[15px] font-semibold text-neutral-900">{t('Procurement has reviewed your items', 'راجعت المشتريات بنودك')}</h3>
                <p className="text-[12.5px] text-neutral-500 mt-0.5">
                  {t(`${review.reviewer ?? 'Procurement team'} · ${review.returnedAt ? fmtWhen(review.returnedAt, false) : ''}`, `${review.reviewer === 'Procurement team' || !review.reviewer ? 'فريق المشتريات' : review.reviewer} · ${review.returnedAt ? fmtWhen(review.returnedAt, true) : ''}`)}
                  {review.simulated && <span className="ms-2 text-[11px] text-neutral-400">({t('simulated for the prototype', 'محاكاة للنموذج الأولي')})</span>}
                </p>
              </div>
            </div>
          </SectionCard>

          {groups.length > 1 && (
            <InfoBanner variant="warning">
              {t(`Procurement split your items into ${groups.length} requests: one Etimad eSouq request and one Competitive Tender request. Pick the one to create now; the other can be created afterwards as a separate request from My Requests.`,
                 `قسّمت المشتريات بنودك إلى ${groups.length} طلبات: طلب للسوق الإلكتروني وطلب للمنافسة. اختر الطلب الذي تريد إنشاءه الآن؛ ويمكن إنشاء الآخر لاحقاً كطلب منفصل من "طلباتي".`)}
            </InfoBanner>
          )}

          <SectionCard title={groups.length > 1 ? t('Requests to create', 'الطلبات المطلوب إنشاؤها') : t('Procurement route', 'مسار الشراء')}>
            <div className="space-y-2.5">
              {groups.map((g) => {
                const rm = ROUTE_META[g.route];
                const isChosen = g.key === chosenKey || (!chosenKey && g === groups[0]);
                const selectable = groups.length > 1;
                return (
                  <button key={g.key} type="button" onClick={() => selectable && setChosenKey(g.key)}
                    className={`w-full text-start rounded-xl border px-4 py-3 transition-all ${isChosen ? 'border-brand-600 bg-brand-50' : 'border-neutral-200 bg-white'} ${selectable ? 'hover:border-neutral-300 cursor-pointer' : 'cursor-default'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectable && <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${isChosen ? 'border-brand-600 bg-brand-600' : 'border-neutral-400'}`}>{isChosen && <span className="w-1.5 h-1.5 rounded-full bg-white" />}</span>}
                        <Badge variant={rm.badge}>{isAr ? rm.ar : rm.en}</Badge>
                      </div>
                      <span className="text-[12px] text-neutral-500 whitespace-nowrap">{t(`${g.items.length} item${g.items.length > 1 ? 's' : ''}`, `${g.items.length} بند`)}{selectable && isChosen ? ` · ${t('this request', 'هذا الطلب')}` : selectable ? ` · ${t('separate request', 'طلب منفصل')}` : ''}</span>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {g.items.map((i) => (
                        <li key={i.id} className="text-[12.5px]">
                          <span className="text-neutral-800 font-medium">{isAr ? i.nameAr : i.name}</span>
                          {i.reason && <span className="block text-[12px] text-neutral-500">{i.reason}</span>}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <div className="flex items-center justify-end">
            <Button variant="primary" size="lg" onClick={confirmChosen}>
              {chosen.route === 'tendering' ? t('Create this request & continue', 'إنشاء هذا الطلب والمتابعة') : t('Create eSouq request', 'إنشاء طلب السوق الإلكتروني')} →
            </Button>
          </div>
        </div>
      )}

      {/* LANDING (eSouq) */}
      {view === 'landing' && chosen && (
        <SectionCard>
          <div className="py-8 text-center max-w-[460px] mx-auto">
            <div className="w-12 h-12 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-4"><CheckIcon className="w-6 h-6 text-success-600" /></div>
            <h3 className="text-[16px] font-semibold text-neutral-900">{t('Routed to Etimad eSouq', 'تمت الإحالة إلى السوق الإلكتروني')}</h3>
            <p className="text-[13px] text-neutral-500 mt-1.5">{t('These items are bought off-catalogue, so the tender steps don’t apply.', 'تُشترى هذه البنود من الكتالوج، لذا لا تنطبق خطوات المنافسة.')}</p>
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

function SubSteps({ phase, t }: { phase: Phase; t: (en: string, ar: string) => string }) {
  const steps = [{ en: 'Select items', ar: 'اختيار البنود' }, { en: 'Procurement review', ar: 'مراجعة المشتريات' }, { en: 'Result', ar: 'النتيجة' }];
  const order: Phase[] = ['select', 'awaiting', 'result', 'landing'];
  const cur = Math.min(order.indexOf(phase), 2);
  return (
    <div className="flex items-center gap-2 mb-5">
      {steps.map((s, i) => (
        <div key={s.en} className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${i === cur ? 'bg-brand-600 text-white' : i < cur ? 'bg-brand-50 text-brand-700' : 'bg-neutral-100 text-neutral-500'}`}>
            <span className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center text-[10px]">{i + 1}</span>{t(s.en, s.ar)}
          </div>
          {i < steps.length - 1 && <div className={`w-6 h-px ${i < cur ? 'bg-brand-300' : 'bg-neutral-200'}`} />}
        </div>
      ))}
    </div>
  );
}
