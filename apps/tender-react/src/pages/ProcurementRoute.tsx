import { useMemo, useRef, useState } from 'react';
import { useLanguage, useT } from '../context/LanguageContext';
import { Button, Textarea, Input, SectionCard, Badge, InfoBanner } from '../components/ui';
import { SparklesIcon, CheckIcon, XIcon } from '../components/Icons';
import {
  parseItems, triage, ROUTE_META, EXAMPLE_TEXT,
  type ParsedItem, type TriageResult, type RouteKey,
} from '../lib/triage';
import type { BOQRow, TenderFormData } from '../types/tender';

type Phase = 'input' | 'checking' | 'result' | 'landing';

interface Props {
  onEnterTender: (seed: Partial<TenderFormData>) => void;
  onExit: () => void;
}

export default function ProcurementRoute({ onEnterTender, onExit }: Props) {
  const { isAr } = useLanguage();
  const t = useT();
  const [phase, setPhase] = useState<Phase>('input');
  const [text, setText] = useState('');
  const [identified, setIdentified] = useState(false);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const evidenceRef = useMemo(() => `ETMD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`, []);
  const today = new Date().toISOString().slice(0, 10);

  // ── intake ───────────────────────────────────────────────────────────────
  function identify() {
    setBusy(true);
    // DEMO: local parse stands in for AI extraction (no credits spent).
    window.setTimeout(() => {
      const parsed = parseItems(text || EXAMPLE_TEXT);
      setItems(parsed);
      setIdentified(true);
      setBusy(false);
    }, 1100);
  }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setBusy(true);
    window.setTimeout(() => { setText(EXAMPLE_TEXT); setItems(parseItems(EXAMPLE_TEXT)); setIdentified(true); setBusy(false); }, 1100);
  }
  const updateItem = (id: string, patch: Partial<ParsedItem>) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeItem = (id: string) => setItems((xs) => xs.filter((x) => x.id !== id));
  const addItem = () => setItems((xs) => [...xs, { id: crypto.randomUUID(), name: '', quantity: '' }]);

  // ── triage run (also used by the simulate controls) ────────────────────────
  function runCheck(override?: RouteKey) {
    const list = items.filter((i) => i.name.trim());
    if (list.length === 0) return;
    setPhase('checking'); setCheck1(false); setCheck2(false);
    window.setTimeout(() => setCheck1(true), 950);
    window.setTimeout(() => setCheck2(true), 1950);
    window.setTimeout(() => { setResult(triage(list, override ?? null)); setPhase('result'); }, 2450);
  }

  function seedFromItems(): Partial<TenderFormData> {
    const boqItems: BOQRow[] = items.filter((i) => i.name.trim()).map((i) => ({
      id: crypto.randomUUID(),
      projectItem: t('General', 'عام'),
      itemName: i.name.trim(),
      itemDescription: '',
      unitOfMeasure: 'Each',
      quantity: typeof i.quantity === 'number' ? i.quantity : '',
      unitPrice: '',
      deliveryDate: '',
    }));
    return { sourceType: 'tendering', boqItems };
  }

  const validCount = items.filter((i) => i.name.trim()).length;

  return (
    <div className="px-8 py-7 max-w-[860px] mx-auto">
      {/* header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-neutral-900 tracking-tight">{t('New procurement request', 'طلب شراء جديد')}</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">{t('Tell us what you need — we’ll determine how it can be procured.', 'أخبرنا بما تحتاجه — وسنحدد الطريقة النظامية لشرائه.')}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>{t('Cancel', 'إلغاء')}</Button>
      </div>

      <Stepper phase={phase} t={t} />

      {/* ── INPUT ─────────────────────────────────────────────────────────── */}
      {phase === 'input' && (
        <div className="space-y-5 mt-5">
          <SectionCard
            title="What do you need to procure?"
            titleAr="ما الذي تحتاج إلى شرائه؟"
            description="Type your items, paste a list from an email or Excel (one per line), or attach a file. AI will read it into a clean list."
            descriptionAr="اكتب البنود، أو الصق قائمة من بريد أو إكسل (بنداً في كل سطر)، أو أرفق ملفاً. سيحوّلها الذكاء الاصطناعي إلى قائمة منظمة."
          >
            <Textarea
              rows={7}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('e.g.\n10x Dell laptops\nMicrosoft 365 licenses - 50\nSystem integration services', 'مثال:\n10 أجهزة لابتوب ديل\n50 ترخيص مايكروسوفت 365\nخدمات تكامل الأنظمة')}
            />
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button type="button" onClick={identify} disabled={busy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold rounded-lg bg-ai-50 text-ai-700 border border-ai-200 hover:bg-ai-100 transition-colors disabled:opacity-60">
                <SparklesIcon className={`w-4 h-4 ${busy ? 'spin-slow' : ''}`} />
                {busy ? t('Reading…', 'جارٍ القراءة…') : t('Identify items with AI', 'تحديد البنود بالذكاء الاصطناعي')}
              </button>
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
                {t('Attach a file', 'إرفاق ملف')}
              </Button>
              <input ref={fileRef} type="file" className="hidden" onChange={onFile}
                accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.txt" />
              {fileName && <Badge variant="default">{fileName}</Badge>}
              <button type="button" onClick={() => setText(EXAMPLE_TEXT)}
                className="text-[12px] text-neutral-400 hover:text-neutral-600 ms-auto">{t('Paste example', 'لصق مثال')}</button>
            </div>
          </SectionCard>

          {identified && (
            <SectionCard
              title={`${t('Identified items', 'البنود المحددة')} (${validCount})`}
              action={<button type="button" onClick={addItem} className="text-[12px] font-medium text-brand-600 hover:text-brand-700">+ {t('Add item', 'إضافة بند')}</button>}
            >
              <InfoBanner variant="ai" className="mb-3">
                {t('AI read your input into these items. Edit names or quantities before the check.', 'قرأ الذكاء الاصطناعي مُدخلك إلى هذه البنود. يمكنك تعديل الأسماء أو الكميات قبل الفحص.')}
              </InfoBanner>
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2">
                    <Input value={it.name} onChange={(e) => updateItem(it.id, { name: (e.target as HTMLInputElement).value })}
                      placeholder={t('Item name', 'اسم البند')} className="flex-1" />
                    <Input value={it.quantity === '' ? '' : String(it.quantity)} inputMode="numeric"
                      onChange={(e) => { const v = (e.target as HTMLInputElement).value.replace(/[^0-9]/g, ''); updateItem(it.id, { quantity: v === '' ? '' : parseInt(v, 10) }); }}
                      placeholder={t('Qty', 'الكمية')} className="w-20 text-center" />
                    <button type="button" onClick={() => removeItem(it.id)} className="text-neutral-300 hover:text-error-500 p-1.5"><XIcon className="w-4 h-4" /></button>
                  </div>
                ))}
                {items.length === 0 && <p className="text-[13px] text-neutral-400 py-2">{t('No items yet — add one or paste a list above.', 'لا توجد بنود بعد — أضف بنداً أو الصق قائمة أعلاه.')}</p>}
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="primary" size="lg" onClick={() => runCheck()} disabled={validCount === 0}>
                  {t('Check procurement route', 'فحص مسار الشراء')} →
                </Button>
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ── CHECKING ──────────────────────────────────────────────────────── */}
      {phase === 'checking' && (
        <div className="mt-5">
          <SectionCard>
            <div className="py-6 max-w-[460px] mx-auto">
              <p className="text-center text-[14px] font-medium text-neutral-700 mb-5">{t('Validating against Etimad…', 'التحقق من اعتماد…')}</p>
              <CheckRow done={check1} labelEn="Checking Etimad eSouq" labelAr="فحص السوق الإلكتروني في اعتماد" t={t} />
              <CheckRow done={check2} pending={!check1} labelEn="Checking Mandatory Catalogue" labelAr="فحص الكتالوج الإلزامي" t={t} />
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── RESULT ────────────────────────────────────────────────────────── */}
      {phase === 'result' && result && (
        <ResultView
          result={result} isAr={isAr} t={t} evidenceRef={evidenceRef} today={today}
          onBack={() => setPhase('input')}
          onContinueTender={() => onEnterTender(seedFromItems())}
          onContinueOther={() => setPhase('landing')}
          onSimulate={(r) => runCheck(r)}
        />
      )}

      {/* ── LANDING (eSouq / mandatory stub) ──────────────────────────────── */}
      {phase === 'landing' && result && (
        <div className="mt-5">
          <SectionCard>
            <div className="py-8 text-center max-w-[460px] mx-auto">
              <div className="w-12 h-12 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="w-6 h-6 text-success-600" />
              </div>
              <h3 className="text-[16px] font-semibold text-neutral-900">
                {result.route === 'souq-etimad'
                  ? t('eSouq order draft created', 'تم إنشاء مسودة طلب في السوق الإلكتروني')
                  : t('Routed to the Mandatory Catalogue', 'تمت الإحالة إلى الكتالوج الإلزامي')}
              </h3>
              <p className="text-[13px] text-neutral-500 mt-1.5">
                {t(`${validCount} item(s) will be procured via ${ROUTE_META[result.route].en}. No tender is required.`,
                   `سيتم شراء ${validCount} بند عبر ${ROUTE_META[result.route].ar}. لا تلزم منافسة.`)}
              </p>
              <div className="flex justify-center gap-2 mt-5">
                <Button variant="secondary" onClick={() => setPhase('result')}>{t('Back', 'رجوع')}</Button>
                <Button variant="primary" onClick={onExit}>{t('Go to dashboard', 'إلى لوحة المعلومات')}</Button>
              </div>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

// ── result view ──────────────────────────────────────────────────────────
function ResultView({ result, isAr, t, evidenceRef, today, onBack, onContinueTender, onContinueOther, onSimulate }: {
  result: TriageResult; isAr: boolean; t: (en: string, ar: string) => string;
  evidenceRef: string; today: string;
  onBack: () => void; onContinueTender: () => void; onContinueOther: () => void;
  onSimulate: (r: RouteKey) => void;
}) {
  const meta = ROUTE_META[result.route];
  const isTender = result.route === 'tendering';
  const tone = meta.badge; // success | info | warning
  const heroBg = tone === 'success' ? 'bg-success-50 border-success-100' : tone === 'info' ? 'bg-ai-50 border-ai-200' : 'bg-warning-50 border-warning-200';
  const heroText = tone === 'success' ? 'text-success-700' : tone === 'info' ? 'text-ai-700' : 'text-warning-800';

  return (
    <div className="space-y-5 mt-5">
      {/* verdict hero */}
      <div className={`rounded-xl border px-6 py-5 ${heroBg}`}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{t('Procurement route', 'مسار الشراء')}</span>
          {result.forced && <Badge variant="default">{t('Simulated', 'محاكاة')}</Badge>}
        </div>
        <h2 className={`text-[20px] font-bold ${heroText}`}>{isAr ? meta.ar : meta.en}</h2>
        <p className="text-[13px] text-neutral-600 mt-1">
          {isTender
            ? t('Not available on eSouq or the Mandatory Catalogue — a competitive tender is required.', 'غير متاح في السوق الإلكتروني أو الكتالوج الإلزامي — تلزم منافسة.')
            : result.route === 'souq-etimad'
            ? t('All items are available to buy directly — no tender needed.', 'جميع البنود متاحة للشراء المباشر — لا تلزم منافسة.')
            : t('Items are covered by the Mandatory Catalogue — source through it.', 'البنود مشمولة بالكتالوج الإلزامي — يتم الشراء من خلاله.')}
        </p>
      </div>

      {/* per-item verdicts */}
      <SectionCard title="Items & routing" titleAr="البنود والمسار">
        <div className="divide-y divide-neutral-100">
          {result.items.map((it) => {
            const m = ROUTE_META[it.route];
            return (
              <div key={it.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-neutral-800">
                    {it.name}{typeof it.quantity === 'number' ? <span className="text-neutral-400 font-normal"> · {t('Qty', 'الكمية')} {it.quantity}</span> : null}
                  </p>
                  <p className="text-[12px] text-neutral-500 mt-0.5 leading-snug">{isAr ? it.reasonAr : it.reason}</p>
                </div>
                <Badge variant={m.badge}>{isAr ? m.shortAr : m.shortEn}</Badge>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* evidence (tender only) */}
      {isTender && (
        <SectionCard title="Evidence of non-availability" titleAr="إثبات عدم التوفر"
          description="Captured as the justification for tendering and attached to the request for audit."
          descriptionAr="يُحفظ كمبرر للمنافسة ويُرفق بالطلب لأغراض التدقيق.">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-medium text-neutral-700">{t('Etimad reference', 'المرجع في اعتماد')}</label>
              <Input value={evidenceRef} readOnly className="mt-1" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-neutral-700">{t('Checked on', 'تاريخ الفحص')}</label>
              <Input value={today} readOnly className="mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button variant="secondary" size="sm">{t('Attach screenshot', 'إرفاق لقطة شاشة')}</Button>
            <span className="text-[11px] text-neutral-400">{t('Optional — a screenshot of the Etimad search result.', 'اختياري — لقطة من نتيجة البحث في اعتماد.')}</span>
          </div>
        </SectionCard>
      )}

      {/* actions */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={onBack}>← {t('Edit items', 'تعديل البنود')}</Button>
        {isTender
          ? <Button variant="primary" size="lg" onClick={onContinueTender}>{t('Continue to tender setup', 'المتابعة إلى إعداد المنافسة')} →</Button>
          : <Button variant="primary" size="lg" onClick={onContinueOther}>
              {result.route === 'souq-etimad' ? t('Create eSouq order', 'إنشاء طلب في السوق') : t('Proceed via Mandatory Catalogue', 'المتابعة عبر الكتالوج الإلزامي')} →
            </Button>}
      </div>

      {/* demo: simulate each outcome */}
      <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
        <span className="text-[11px] text-neutral-400">{t('Simulate outcome:', 'محاكاة النتيجة:')}</span>
        {(['souq-etimad', 'mandatory-catalogue', 'tendering'] as RouteKey[]).map((r) => (
          <button key={r} onClick={() => onSimulate(r)}
            className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${result.route === r ? 'border-neutral-300 bg-neutral-100 text-neutral-700' : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'}`}>
            {isAr ? ROUTE_META[r].shortAr : ROUTE_META[r].shortEn}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── small bits ─────────────────────────────────────────────────────────────
function CheckRow({ done, pending, labelEn, labelAr, t }: { done: boolean; pending?: boolean; labelEn: string; labelAr: string; t: (en: string, ar: string) => string }) {
  return (
    <div className={`flex items-center gap-3 py-2.5 transition-opacity ${pending ? 'opacity-40' : 'opacity-100'}`}>
      <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-success-100' : 'bg-neutral-100'}`}>
        {done
          ? <CheckIcon className="w-4 h-4 text-success-600" />
          : <svg className="w-4 h-4 spin-slow text-neutral-400" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
      </span>
      <span className="text-[13px] text-neutral-700">{t(labelEn, labelAr)}{done ? '' : '…'}</span>
      {done && <span className="text-[12px] text-success-600 ms-auto font-medium">{t('Done', 'تم')}</span>}
    </div>
  );
}

function Stepper({ phase, t }: { phase: Phase; t: (en: string, ar: string) => string }) {
  const steps = [
    { key: 'input', en: 'Define', ar: 'التحديد' },
    { key: 'checking', en: 'Route check', ar: 'فحص المسار' },
    { key: 'result', en: 'Result', ar: 'النتيجة' },
  ];
  const order: Phase[] = ['input', 'checking', 'result', 'landing'];
  const curIdx = Math.min(order.indexOf(phase), 2);
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${i === curIdx ? 'bg-brand-600 text-white' : i < curIdx ? 'bg-brand-50 text-brand-700' : 'bg-neutral-100 text-neutral-400'}`}>
            <span className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center text-[10px]">{i + 1}</span>
            {t(s.en, s.ar)}
          </div>
          {i < steps.length - 1 && <div className={`w-6 h-px ${i < curIdx ? 'bg-brand-300' : 'bg-neutral-200'}`} />}
        </div>
      ))}
    </div>
  );
}
