import { useRef, useState, type ChangeEvent } from 'react';
import { useTender } from '../context/TenderContext';
import { useLanguage, useT } from '../context/LanguageContext';
import { Button, Select, SectionCard, Badge, InfoBanner, Textarea } from '../components/ui';
import { CheckIcon } from '../components/Icons';
import { PROJECTS } from '../data/mockData';
import type { ProjectItem } from '../types/tender';
import {
  classifyItem, groupItems, forcedRoute, parseItemNames, EXAMPLE_TEXT, ROUTE_META, BOQ_TYPE_META,
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

  // Free-text intake: type / paste / attach → AI extracts an editable list.
  const [text, setText] = useState('');
  const [identifying, setIdentifying] = useState(false);
  const [freeItems, setFreeItems] = useState<FreeItem[]>([]);
  const [attachment, setAttachment] = useState<string | null>(null);
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

  function pickProject(id: string) { setProjectId(id); setItemIds([]); }
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
  const editFree = (id: string, name: string) => setFreeItems((xs) => xs.map((f) => f.id === id ? { ...f, name } : f));
  const removeFree = (id: string) => setFreeItems((xs) => xs.filter((f) => f.id !== id));
  const addFree = () => setFreeItems((xs) => [...xs, { id: uid(), name: '' }]);

  function runCheck() {
    if (clsInput.length === 0) return;
    setPhase('checking'); setCheck1(false); setCheck2(false);
    const override = forcedRoute();
    window.setTimeout(() => setCheck1(true), 900);
    window.setTimeout(() => setCheck2(true), 1800);
    window.setTimeout(() => {
      const verdicts: ItemVerdict[] = clsInput.map((c) => classifyItem(c, override));
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
    if (g.route !== 'tendering') setPhase('landing');
  }

  const chosen = groups.find((g) => g.key === chosenKey) ?? groups[0];

  return (
    <div className="max-w-[820px]">
      <SubSteps phase={phase} t={t} />

      {/* SELECT */}
      {phase === 'select' && (
        <SectionCard
          title="What are you procuring?"
          titleAr="ما الذي تقوم بشرائه؟"
          description="Select the budgeted project and tick the items this request covers — then type or paste any extra items below. We check each item against Etimad to set the procurement route."
          descriptionAr="اختر المشروع المدرج في الميزانية وحدّد البنود التي يشملها هذا الطلب — ثم اكتب أو الصق أي بنود إضافية أدناه. نفحص كل بند في اعتماد لتحديد مسار الشراء.">
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
                <div>
                  <p className="text-[13px] font-semibold text-neutral-800">{t('Tell us what else you need to procure', 'أخبرنا بما تحتاج شراءه')}</p>
                  <p className="text-[12px] text-neutral-500">{t('Type or paste a list, or attach a file — we’ll identify the items and add them to the check below.', 'اكتب أو الصق قائمة، أو أرفق ملفاً — سنحدد البنود ونضيفها إلى الفحص أدناه.')}</p>
                </div>
              </div>

              <div className="mt-3">
                <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)}
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

            {/* Procurement route definition */}
            <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/60 px-5 py-4">
              <p className="text-[13px] font-semibold text-neutral-700">{t('Procurement route', 'مسار الشراء')}</p>
              <p className="text-[12px] text-neutral-500 mt-0.5">
                {t('We check each item against Etimad eSouq, then tendering. A request must be one BOQ type and one route — mixed items are split into separate requests.',
                   'نفحص كل بند في السوق الإلكتروني ثم المنافسة. يجب أن يكون الطلب من نوع بند واحد ومسار واحد — وتُقسَّم البنود المختلطة إلى طلبات منفصلة.')}
              </p>
              <div className="flex items-center justify-between mt-3 gap-3">
                <span className="text-[12px] text-neutral-500">{clsInput.length > 0 ? t(`${clsInput.length} item${clsInput.length > 1 ? 's' : ''} to check`, `${clsInput.length} بند للفحص`) : t('Select at least one item to continue', 'اختر بنداً واحداً على الأقل للمتابعة')}</span>
                <Button variant="primary" size="lg" onClick={runCheck} disabled={clsInput.length === 0}>{t('Check procurement route', 'فحص مسار الشراء')} →</Button>
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
              {chosen.route === 'tendering' ? t('Create this request & continue', 'إنشاء هذا الطلب والمتابعة') : t('Create eSouq request', 'إنشاء طلب السوق الإلكتروني')} →
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
