import { useRef, useState, type ChangeEvent } from 'react';
import { useTender } from '../context/TenderContext';
import { useLanguage, useT } from '../context/LanguageContext';
import { Button, Select, SectionCard, Badge, InfoBanner, Textarea } from '../components/ui';
import { CheckIcon } from '../components/Icons';
import DrawerClose from '../components/DrawerClose';
import routeIllustration from '../assets/procurement-route-illustration.svg';
import { PROJECTS } from '../data/mockData';
import type { ProjectItem } from '../types/tender';
import {
  classifyItem, groupItems, forcedRoute, parseItemNames, itemNameLooksReal, EXAMPLE_TEXT, ROUTE_META, BOQ_TYPE_META,
  type ClsItem, type ItemVerdict, type RequestGroup, type RouteKey,
} from '../lib/triage';

interface FreeItem { id: string; name: string; }
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `f_${Math.random().toString(36).slice(2)}`);

type Phase = 'select' | 'checking' | 'result' | 'landing';

export default function ProcurementRouteStep() {
  const { isAr } = useLanguage();
  const t = useT();
  const { confirmRoute, routeConfirmed, formData } = useTender();

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

  const project = PROJECTS.find((p) => p.id === projectId);
  const items: ProjectItem[] = project?.items ?? [];
  const selected = items.filter((i) => itemIds.includes(i.id));
  const freeValid = freeItems.filter((f) => f.name.trim().length > 0);

  // Everything fed into the route check: chosen project items + free-typed items.
  const clsInput: ClsItem[] = [
    ...selected.map((i) => ({ id: i.id, name: i.name, nameAr: i.nameAr, type: i.type, projectItemId: i.id })),
    ...freeValid.map((f) => ({ id: f.id, name: f.name.trim() })),
  ];

  // Already confirmed (navigated back, or opened an existing request) → summary + edit.
  if (routeConfirmed && phase === 'select' && !projectId) {
    const r: RouteKey = formData.sourceType === 'souq-etimad' ? 'souq-etimad' : 'tendering';
    const m = ROUTE_META[r];
    const confProj = PROJECTS.find((p) => p.id === formData.projectId);
    const confItems = confProj ? confProj.items.filter((i) => (formData.selectedProjectItemIds ?? []).includes(i.id)) : [];
    const startEdit = () => { setProjectId(formData.projectId); setItemIds(formData.selectedProjectItemIds ?? []); setPhase('select'); };
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
  function identify() {
    const src = text.trim();
    setIdentifying(true);
    window.setTimeout(() => {
      const names = parseItemNames(src.length ? src : EXAMPLE_TEXT);
      if (!src.length) setText(EXAMPLE_TEXT);
      setFreeItems(names.map((n) => ({ id: uid(), name: n })));
      setIdentifying(false);
    }, 1100);
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
    setPhase('checking'); setCheck1(false); setCheck2(false);
    const override = forcedRoute();
    window.setTimeout(() => setCheck1(true), 900);
    window.setTimeout(() => setCheck2(true), 1800);
    window.setTimeout(() => {
      const verdicts: ItemVerdict[] = input.map((c) => classifyItem(c, override));
      const g = groupItems(verdicts);
      setGroups(g); setChosenKey(g[0]?.key ?? ''); setPhase('result');
    }, 2300);
  }

  function confirmChosen() {
    const g = groups.find((x) => x.key === chosenKey) ?? groups[0];
    if (!g) return;
    confirmRoute({
      sourceType: ROUTE_META[g.route].sourceType,
      projectId,
      items: g.items.map((i) => ({ name: i.name, nameAr: i.nameAr, projectItemId: i.projectItemId })),
    });
    // Both routes now continue into the wizard (confirmRoute advances to Project Setup).
  }

  const chosen = groups.find((g) => g.key === chosenKey) ?? groups[0];

  return (
    <div className="max-w-[820px]">
      {showInfo && <RouteInfoModal onClose={() => setShowInfo(false)} isAr={isAr} t={t} />}
      <SubSteps phase={phase} t={t} />

      {/* SELECT */}
      {phase === 'select' && (
        <SectionCard
          title="What are you procuring?"
          titleAr="ما الذي تقوم بشرائه؟"
          description="Pick your project and the items you need. We’ll route each one the right way — Etimad eSouq or a competitive tender."
          descriptionAr="اختر مشروعك والبنود التي تحتاجها. سنوجّه كل بند إلى المسار الصحيح — السوق الإلكتروني (اعتماد) أو منافسة."
          action={
            <button type="button" onClick={() => setShowInfo(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ai-200 bg-ai-50 text-ai-700 text-[12px] font-semibold hover:bg-ai-100 transition-colors">
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

            {/* Free-text intake — appears once at least one project item is selected */}
            {selected.length > 0 && (
            <div className="rounded-xl border border-ai-200 bg-ai-50/40 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-ai-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-ai-600" viewBox="0 0 24 24" fill="currentColor"><path d="M11 2 9.6 6.6 5 8l4.6 1.4L11 14l1.4-4.6L17 8l-4.6-1.4L11 2Zm7 9-.8 2.6L15 14l2.2.7.8 2.3.8-2.3L21 14l-2.2-.7L18 11Z" /></svg>
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-semibold text-neutral-900">{t('Tell us what you’re looking for', 'أخبرنا بما تبحث عنه')}</p>
                    <span className="text-[11px] font-semibold text-ai-700 bg-ai-100 rounded-full px-2 py-0.5">{t('Required', 'مطلوب')}</span>
                  </div>
                  <p className="text-[13px] text-neutral-600 mt-1 leading-relaxed">{t('Add the materials or services you need — type them, paste a list, or attach a file. We’ll check each one against the Etimad catalogue and suppliers in Saudi Arabia to set the right procurement route. This check is a required step before the request can be built.', 'أضف المواد أو الخدمات التي تحتاجها — اكتبها أو الصق قائمة أو أرفق ملفاً. سنتحقق من كل منها في كتالوج اعتماد ولدى الموردين في المملكة العربية السعودية لتحديد مسار الشراء الصحيح. هذا الفحص خطوة إلزامية قبل بناء الطلب.')}</p>
                </div>
              </div>

              <div className="mt-3">
                <Textarea rows={4} value={text} onChange={(e) => { setText(e.target.value); if (intakeError) setIntakeError(''); }}
                  placeholder={t('e.g.\n20 contractor engineers\nOffice cleaning services\nNetwork switches x4', 'مثال:\n20 مهندس مقاول\nخدمات نظافة المكاتب\nمحولات شبكة ×4')} />
              </div>

              <div className="flex items-center gap-2 mt-2.5">
                <input ref={fileRef} type="file" className="hidden" onChange={onAttach}
                  accept=".txt,.csv,.xlsx,.xls,.doc,.docx,.pdf" />
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={identifying}>{t('Attach file', 'إرفاق ملف')}</Button>
                <Button variant="ai" size="sm" onClick={identify} loading={identifying} disabled={identifying}>
                  {t('Identify items with AI', 'تحديد البنود بالذكاء الاصطناعي')}
                </Button>
                {attachment && <span className="text-[12px] text-neutral-500 truncate">{attachment}</span>}
              </div>

              {freeItems.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[12px] font-medium text-neutral-600">{t(`AI identified ${freeValid.length} item${freeValid.length > 1 ? 's' : ''} — review and edit:`, `حدد الذكاء الاصطناعي ${freeValid.length} بند — راجع وعدّل:`)}</p>
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
                  <button type="button" onClick={addFree} className="text-[12px] font-semibold text-ai-700 hover:underline mt-0.5">+ {t('Add item', 'إضافة بند')}</button>
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
                <span className="text-[13px] text-neutral-500">{clsInput.length > 0 ? t(`${clsInput.length} item${clsInput.length > 1 ? 's' : ''} to check`, `${clsInput.length} بند للفحص`) : text.trim().length > 0 ? t('Ready to check', 'جاهز للفحص') : t('Tell us what you’re looking for to continue', 'أخبرنا بما تبحث عنه للمتابعة')}</span>
                <Button variant="primary" size="lg" onClick={runCheck} disabled={text.trim().length === 0 && freeValid.length === 0 && selected.length === 0}>{t('Check procurement route', 'فحص مسار الشراء')} →</Button>
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
            <CheckRow done={check1} labelEn="Checking Etimad eSouq availability" labelAr="فحص توفر السوق الإلكتروني في اعتماد" t={t} />
            <CheckRow done={check2} pending={!check1} labelEn="Grouping by BOQ type & route" labelAr="التجميع حسب نوع البند والمسار" t={t} />
          </div>
        </SectionCard>
      )}

      {/* RESULT */}
      {phase === 'result' && chosen && (
        <div className="space-y-5">
          {groups.length > 1 && (
            <InfoBanner variant="warning">
              {t(`These items follow two different procurement routes, so they’re split into ${groups.length} requests — one Etimad eSouq request and one Competitive Tender request. Pick the one to create now; the other can be created afterwards as a separate request from My Requests.`,
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
                    <p className="text-[12px] text-neutral-600 mt-1.5 ps-0.5">{g.items.map((i) => (isAr ? i.nameAr : i.name)).join('، ')}</p>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setPhase('select')}>← {t('Back to items', 'العودة إلى البنود')}</Button>
            <Button variant="primary" size="lg" onClick={confirmChosen}>
              {chosen.route === 'tendering' ? t('Create this request & continue', 'إنشاء هذا الطلب والمتابعة') : t('Create eSouq purchase & continue', 'إنشاء طلب الشراء ومتابعة')} →
            </Button>
          </div>
        </div>
      )}

      {/* LANDING (eSouq) */}
      {phase === 'landing' && chosen && (
        <SectionCard>
          <div className="py-8 text-center max-w-[460px] mx-auto">
            <div className="w-12 h-12 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-4"><CheckIcon className="w-6 h-6 text-success-600" /></div>
            <h3 className="text-[16px] font-semibold text-neutral-900">{t('Routed to Etimad eSouq', 'تمت الإحالة إلى السوق الإلكتروني')}</h3>
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
    t('We check each item against Etimad.', 'نفحص كل بند في منصة اعتماد.'),
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
          {t('Before you build a request, Munafasat checks how each item can be bought. The procurement route is the channel an item takes to reach suppliers via Etimad — and getting it right keeps you compliant and saves time.',
             'قبل بناء الطلب، تتحقق منافسات من كيفية شراء كل بند. مسار الشراء هو القناة التي يسلكها البند للوصول إلى المورّدين عبر منصة اعتماد — واختياره الصحيح يضمن الالتزام ويوفّر الوقت.')}
        </p>

        <div className="mt-[17.5px] space-y-[10.5px]">
          <div className="rounded-[10.5px] border border-success-100 bg-success-50/60 p-[12.25px]">
            <Badge variant="success">{t('Etimad eSouq', 'السوق الإلكتروني')}</Badge>
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
  const steps = [{ en: 'Select', ar: 'الاختيار' }, { en: 'Check', ar: 'الفحص' }, { en: 'Result', ar: 'النتيجة' }];
  const order: Phase[] = ['select', 'checking', 'result', 'landing'];
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
