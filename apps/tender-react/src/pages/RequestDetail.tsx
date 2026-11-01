import { useMemo, useState, type ReactNode } from 'react';
import { jsPDF } from 'jspdf';
import { useRequests, type SavedRequest } from '../context/RequestStore';
import { useT, useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui';
import { ArrowLeftIcon, CheckIcon, DownloadIcon, DocumentIcon, PencilIcon, XIcon, UploadIcon, ClockIcon, AlertTriangleIcon } from '../components/Icons';
import { RfpTab, rfpSections } from '../inbox/TaskDetail';
import { APPROVAL_STAGES, REQUESTER, requestRfpFor } from '../inbox/data';
import { STATUS, TYPE } from './MyRequests';

type T = (en: string, ar: string) => string;
type TabKey = 'overview' | 'details' | 'documents' | 'process';

const TABS: { key: TabKey; en: string; ar: string }[] = [
  { key: 'overview',  en: 'Overview',        ar: 'نظرة عامة' },
  { key: 'details',   en: 'Request details', ar: 'تفاصيل الطلب' },
  { key: 'documents', en: 'Documents',       ar: 'المستندات' },
  { key: 'process',   en: 'Process',         ar: 'سير العمل' },
];

// ─── Derived request model ───────────────────────────────────────────────────

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const costCenterOf = (d: string) => ({ 'IT & Digital Transformation': 'IT-ERP-2026', 'Information Security': 'SEC-OPS-2026', Finance: 'FIN-TRS-2026', 'Human Resources': 'HR-DEV-2026', 'Legal Affairs': 'LEG-GEN-2026', 'Facilities & Services': 'FAC-HQ-2026', 'Enterprise Risk': 'RSK-ERM-2026', 'General Administration': 'GA-ADM-2026' } as Record<string, string>)[d] ?? 'GEN-2026';
const parseAmount = (b: string) => Number(b.replace(/[^\d.]/g, '')) || 0;

interface ProcStep { id: string; en: string; ar: string; who: { en: string; ar: string; role?: string; roleAr?: string }; group?: { en: string; ar: string }; state: 'done' | 'current' | 'returned' | 'upcoming'; at?: string; note?: { en: string; ar: string } }

function buildProcess(r: SavedRequest): ProcStep[] {
  const esouq = r.type === 'souq-etimad';
  const created = +new Date(r.createdAt);
  const day = 864e5;
  const groupOf = (i: number) =>
    i >= 2 && i <= 5 ? { en: 'Specialist reviews · in parallel', ar: 'المراجعات التخصصية · بالتوازي' } :
    i === 6 || i === 7 ? { en: 'Finance review · in parallel', ar: 'المراجعة المالية · بالتوازي' } :
    i === 8 || i === 9 ? { en: 'Qualification · in parallel', ar: 'التأهيل · بالتوازي' } : undefined;
  const stages = APPROVAL_STAGES.filter((_, i) => !esouq || ![8, 9].includes(i)); // E-Market: no qualification stage
  const steps: Omit<ProcStep, 'state'>[] = [
    { id: 's-sub', en: 'Request submitted', ar: 'تقديم الطلب', who: { en: r.createdByName || REQUESTER.name, ar: r.createdByNameAr || REQUESTER.nameAr || REQUESTER.name, role: 'Requester', roleAr: 'مقدّم الطلب' } },
    ...stages.map((s) => {
      const i = APPROVAL_STAGES.indexOf(s);
      return { id: `s-${i}`, en: s.stage.en, ar: s.stage.ar, who: { en: s.assignee.name, ar: s.assignee.nameAr ?? s.assignee.name, role: s.assignee.role, roleAr: s.assignee.roleAr }, group: groupOf(i) };
    }),
    { id: 's-pr', en: 'Purchase requisition created in SAP ECC', ar: 'إنشاء طلب الشراء في SAP ECC', who: { en: 'SAP ECC', ar: 'SAP ECC', role: 'System', roleAr: 'النظام' } },
    { id: 's-pub', en: esouq ? 'Order placed on Etimad E-Market' : 'Tender published on Etimad', ar: esouq ? 'إصدار الطلب على سوق اعتماد' : 'طرح المنافسة على منصة اعتماد', who: { en: 'Procurement', ar: 'المشتريات', role: 'Procurement Officer', roleAr: 'أخصائي مشتريات' } },
  ];
  const last = steps.length;
  let cur: number; let returned = false;
  switch (r.status) {
    case 'draft': cur = 0; break;
    case 'submitted': cur = 1; break;
    case 'under-review': cur = 2 + (hash(r.id) % (stages.length - 3)); break;
    case 'returned': cur = 1 + (hash(r.id) % 3); returned = true; break;
    default: cur = r.prNumber ? last - 1 : last - 2;
  }
  // Steps in the same parallel group share the current state.
  const curGroup = steps[cur]?.group?.en;
  return steps.map((s, i) => {
    const inCurGroup = !!curGroup && s.group?.en === curGroup;
    const state: ProcStep['state'] =
      r.status === 'draft' ? (i === 0 ? 'current' : 'upcoming') :
      returned && i === cur ? 'returned' :
      inCurGroup && !returned ? (i < cur ? 'done' : 'current') :
      i < cur ? 'done' : i === cur ? 'current' : 'upcoming';
    const at = state === 'done' || state === 'returned' ? new Date(created + (i === 0 ? 0 : i * 0.6 * day)).toISOString() : undefined;
    const note = state === 'returned'
      ? { en: 'Returned to the requester — update the BOQ quantities and the delivery schedule, then resubmit.', ar: 'أعيد إلى مقدّم الطلب — حدّث كميات جدول الكميات وجدول التسليم ثم أعد التقديم.' }
      : s.id === 's-pr' && r.prNumber && state === 'done' ? { en: `PR ${r.prNumber} created.`, ar: `تم إنشاء طلب الشراء ${r.prNumber}.` }
      : undefined;
    return { ...s, state, at, note };
  });
}

const PHASES = (esouq: boolean) => [
  { en: 'Request', ar: 'الطلب' },
  { en: 'Approvals', ar: 'الاعتمادات' },
  { en: 'PR creation', ar: 'إنشاء طلب الشراء' },
  { en: esouq ? 'E-Market order' : 'Tendering', ar: esouq ? 'طلب سوق اعتماد' : 'الطرح' },
  { en: esouq ? 'Delivery' : 'Evaluation & award', ar: esouq ? 'التسليم' : 'التقييم والترسية' },
  { en: 'PO & contract', ar: 'أمر الشراء والعقد' },
];
const phaseIdx = (r: SavedRequest) => r.status === 'draft' ? 0 : r.status === 'approved' ? (r.prNumber ? 3 : 2) : 1;

interface Member { name: string; nameAr: string; role: string; roleAr: string; chip: { en: string; ar: string; cls: string }; duty: { en: string; ar: string } }
const CHIP = {
  tech: { en: 'Technical', ar: 'فني', cls: 'bg-[#FFF3E6] text-[#B25B00]' },
  fin:  { en: 'Financial', ar: 'مالي', cls: 'bg-success-50 text-success-700' },
  proc: { en: 'Procurement', ar: 'مشتريات', cls: 'bg-[#EEF4FB] text-[#2A6193]' },
  legal:{ en: 'Legal', ar: 'قانوني', cls: 'bg-[#F1EEFB] text-[#6A47D6]' },
};
function committee(esouq: boolean): Member[] {
  const all: Member[] = [
    { name: 'Sara Al-Zahrani', nameAr: 'سارة الزهراني', role: 'Technical Reviewer', roleAr: 'مراجع فني', chip: CHIP.tech, duty: { en: 'Technical evaluation', ar: 'التقييم الفني' } },
    { name: 'Hana Al-Ghamdi', nameAr: 'هناء الغامدي', role: 'Evaluation committee chair', roleAr: 'رئيسة لجنة التقييم', chip: CHIP.proc, duty: { en: 'Bid evaluation', ar: 'تقييم العروض' } },
    { name: 'Khalid Al-Otaibi', nameAr: 'خالد العتيبي', role: 'Qualification committee chair', roleAr: 'رئيس لجنة التأهيل', chip: CHIP.fin, duty: { en: 'Qualification', ar: 'التأهيل' } },
    { name: 'Abdulrahman Al-Shehri', nameAr: 'عبدالرحمن الشهري', role: 'Finance Qualification', roleAr: 'التأهيل المالي', chip: CHIP.fin, duty: { en: 'Financial evaluation', ar: 'التقييم المالي' } },
    { name: 'Abdullah Al-Qahtani', nameAr: 'عبدالله القحطاني', role: 'Procurement Team Lead', roleAr: 'رئيس فريق المشتريات', chip: CHIP.proc, duty: { en: 'Commercial evaluation', ar: 'التقييم التجاري' } },
    { name: 'Mohammed Al-Harbi', nameAr: 'محمد الحربي', role: 'Procurement Officer', roleAr: 'أخصائي مشتريات', chip: CHIP.proc, duty: { en: 'Tender secretary', ar: 'أمين المنافسة' } },
    { name: 'Lina Al-Mutairi', nameAr: 'لينا المطيري', role: 'Legal Counsel', roleAr: 'مستشارة قانونية', chip: CHIP.legal, duty: { en: 'Contract review', ar: 'مراجعة العقد' } },
    { name: 'Majed Al-Zahrani', nameAr: 'ماجد الزهراني', role: 'Enterprise Architect', roleAr: 'مهندس البنية المؤسسية', chip: CHIP.tech, duty: { en: 'Solution compliance', ar: 'مطابقة الحل' } },
  ];
  return esouq ? all.filter((m) => m.chip === CHIP.proc) : all;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RequestDetail({ id, onBack, onEdit }: { id: string; onBack: () => void; onEdit: (id: string) => void }) {
  const { isAr } = useLanguage();
  const t = useT();
  const { get } = useRequests();
  const r = get(id);
  const [tab, setTab] = useState<TabKey>('overview');
  const [cancelAsk, setCancelAsk] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  const amount = r ? parseAmount(r.budget) : 0;
  const rfp = useMemo(() => r ? requestRfpFor({
    refId: r.requestNo || 'Draft', titleEn: r.title, titleAr: r.titleAr || r.title,
    deptEn: r.department, deptAr: r.departmentAr || r.department, amount, type: r.type, costCenter: costCenterOf(r.department),
  }) : undefined, [r, amount]);
  const proc = useMemo(() => r ? buildProcess(r) : [], [r]);

  if (!r || !rfp) {
    return (
      <div className="p-10 text-center">
        <p className="text-neutral-600">{t('Request not found.', 'الطلب غير موجود.')}</p>
        <Button variant="secondary" className="mt-3" onClick={onBack}>{t('Back to My Requests', 'العودة إلى طلباتي')}</Button>
      </div>
    );
  }

  const st = STATUS[r.status], ty = TYPE[r.type];
  const esouq = r.type === 'souq-etimad';
  const ref = r.requestNo || t('Draft', 'مسودة');
  const editable = r.status === 'draft' || r.status === 'returned';
  const closed = r.status === 'approved';
  const title = isAr ? (r.titleAr || r.title) : r.title;
  const tabLabel = TABS.find((x) => x.key === tab)!;

  return (
    <div className="min-h-full bg-neutral-50/60">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-5">
          <div className="flex items-start gap-4 flex-wrap">
            <button onClick={onBack} title={t('Back to My Requests', 'العودة إلى طلباتي')}
              className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100 flex items-center justify-center flex-shrink-0">
              <ArrowLeftIcon className={`w-5 h-5 ${isAr ? 'rotate-180' : ''}`} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-neutral-500">
                <button onClick={onBack} className="hover:text-brand-700">{t('My Requests', 'طلباتي')}</button>
                <span className="mx-1.5 text-neutral-300">/</span>
                <span className="font-mono" dir="ltr">{ref}</span>
                <span className="mx-1.5 text-neutral-300">/</span>
                <span className="text-brand-700 font-medium">{isAr ? tabLabel.ar : tabLabel.en}</span>
              </p>
              <div className="mt-1 flex items-center gap-2.5 flex-wrap">
                <h1 className="text-[22px] font-bold text-neutral-900 tracking-tight">{title}</h1>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-medium ${cancelled ? 'bg-neutral-100 text-neutral-500' : st.chip}`}><span className={`w-1.5 h-1.5 rounded-full ${cancelled ? 'bg-neutral-400' : st.dot}`} />{cancelled ? t('Cancelled', 'ملغى') : (isAr ? st.ar : st.en)}</span>
                <span className={`inline-flex px-2 py-0.5 rounded-md border text-[12px] font-medium ${ty.chip}`}>{isAr ? ty.ar : ty.en}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {editable && !cancelled && (
                <Button variant="primary" size="md" onClick={() => onEdit(r.id)}><PencilIcon className="w-4 h-4" />{r.status === 'draft' ? t('Continue editing', 'متابعة التعديل') : t('Edit & resubmit', 'تعديل وإعادة التقديم')}</Button>
              )}
              {!closed && !cancelled && (
                <button onClick={() => setCancelAsk(true)} className="h-[38px] px-4 rounded-lg border border-error-200 text-error-700 hover:bg-error-50 text-[13px] font-semibold inline-flex items-center gap-1.5">
                  <XIcon className="w-4 h-4" />{t('Cancel request', 'إلغاء الطلب')}
                </button>
              )}
              <button onClick={() => downloadRequestPdf(r)} title={t('Download request PDF', 'تنزيل الطلب PDF')}
                className="h-[38px] w-[38px] rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-50 flex items-center justify-center"><DownloadIcon className="w-4 h-4" /></button>
            </div>
          </div>
          {/* Tabs */}
          <div className="mt-4 flex items-center gap-1 overflow-x-auto">
            {TABS.map((x) => (
              <button key={x.key} onClick={() => setTab(x.key)}
                className={`px-4 py-3 text-[14px] font-semibold border-b-2 whitespace-nowrap transition-colors ${tab === x.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}>
                {isAr ? x.ar : x.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 space-y-5">
        {cancelled && (
          <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[13px] text-neutral-600 flex items-center gap-2"><AlertTriangleIcon className="w-4 h-4 text-neutral-400" />{t('This request was cancelled. Pending approval tasks have been withdrawn.', 'تم إلغاء هذا الطلب وسحب مهام الاعتماد المعلقة.')}</div>
        )}
        {tab === 'overview' && <Overview r={r} esouq={esouq} amount={amount} proc={proc} isAr={isAr} t={t} onTab={setTab} />}
        {tab === 'details' && <Details rfp={rfp} amount={amount} isAr={isAr} t={t} />}
        {tab === 'documents' && <Documents r={r} rfp={rfp} editable={editable && !cancelled} isAr={isAr} t={t} />}
        {tab === 'process' && <Process steps={proc} r={r} isAr={isAr} t={t} />}
      </div>

      {cancelAsk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/30" onClick={() => setCancelAsk(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 cm-dialog-in">
            <h2 className="text-[17px] font-bold text-neutral-900">{t('Cancel this request?', 'إلغاء هذا الطلب؟')}</h2>
            <p className="mt-2 text-[13px] text-neutral-600 leading-relaxed">{t(`${ref} will be withdrawn and any pending approval tasks removed from approvers' inboxes. This can't be undone.`, `سيتم سحب ${ref} وإزالة مهام الاعتماد المعلقة من صناديق المعتمدين. لا يمكن التراجع عن ذلك.`)}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCancelAsk(false)}>{t('Keep request', 'الإبقاء على الطلب')}</Button>
              <Button variant="danger" onClick={() => { setCancelled(true); setCancelAsk(false); }}>{t('Cancel request', 'إلغاء الطلب')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Overview ────────────────────────────────────────────────────────────────

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-neutral-200 shadow-sm">
      <div className="flex items-center justify-between gap-3 px-6 pt-5">
        <h2 className="text-[17px] font-bold text-brand-700">{title}</h2>
        {action}
      </div>
      <div className="px-6 pt-4 pb-6">{children}</div>
    </section>
  );
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2 lg:col-span-3' : ''}>
      <p className="text-[12.5px] text-neutral-500">{label}</p>
      <div className="mt-1 text-[14px] font-semibold text-neutral-900">{children}</div>
    </div>
  );
}

function Overview({ r, esouq, amount, proc, isAr, t, onTab }: { r: SavedRequest; esouq: boolean; amount: number; proc: ProcStep[]; isAr: boolean; t: T; onTab: (k: TabKey) => void }) {
  const st = STATUS[r.status], ty = TYPE[r.type];
  const phases = PHASES(esouq);
  const pi = phaseIdx(r);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const startD = new Date(+new Date(r.createdAt) + 45 * 864e5).toISOString();
  const endD = new Date(+new Date(r.createdAt) + (esouq ? 75 : 410) * 864e5).toISOString();
  const approvers = proc.filter((s) => s.id !== 's-sub' && s.id !== 's-pr' && s.id !== 's-pub');
  const doneN = approvers.filter((s) => s.state === 'done').length;
  const current = proc.filter((s) => s.state === 'current' || s.state === 'returned');
  const members = committee(esouq);
  const cc = costCenterOf(r.department);

  return (
    <>
      {/* Phase stepper */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-3 overflow-x-auto">
        <div className="flex min-w-[860px]">
          {phases.map((p, i) => {
            const state = i < pi ? 'done' : i === pi ? 'current' : 'upcoming';
            const cls = state === 'done' ? 'bg-success-600 text-white' : state === 'current' ? (r.status === 'returned' ? 'bg-error-600 text-white' : 'bg-[#2A6193] text-white') : 'bg-neutral-100 text-neutral-500';
            return (
              <div key={i} className={`relative flex-1 h-12 flex items-center justify-center gap-1.5 text-[13px] font-semibold ${cls} ${i > 0 ? '-ms-3' : ''}`}
                style={{ clipPath: i === 0 ? 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)' : i === phases.length - 1 ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%)' : 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)', borderRadius: i === 0 ? '10px 0 0 10px' : i === phases.length - 1 ? '0 10px 10px 0' : undefined }}>
                {state === 'done' && <CheckIcon className="w-4 h-4" />}
                {isAr ? p.ar : p.en}
              </div>
            );
          })}
        </div>
        {current.length > 0 && (
          <p className="mt-3 px-1 text-[12.5px] text-neutral-600 flex items-center gap-1.5 flex-wrap">
            <ClockIcon className="w-4 h-4 text-neutral-400" />
            {r.status === 'returned' ? t('Returned at', 'أعيد في مرحلة') : r.status === 'draft' ? t('Not submitted yet —', 'لم يُقدَّم بعد —') : t('Currently with', 'حاليًا لدى')}
            {r.status !== 'draft' && current.map((s, i) => (
              <span key={s.id} className="font-semibold text-neutral-800">{isAr ? s.who.ar : s.who.en} <span className="font-normal text-neutral-500">({isAr ? s.ar : s.en})</span>{i < current.length - 1 ? '،' : ''}</span>
            ))}
            {r.status === 'draft' && <span className="text-neutral-500">{t('complete the remaining sections and submit.', 'أكمل الأقسام المتبقية ثم قدّم الطلب.')}</span>}
            <button onClick={() => onTab('process')} className="ms-auto text-brand-700 font-semibold hover:underline">{t('View process', 'عرض سير العمل')}</button>
          </p>
        )}
      </div>

      <Card title={t('Request details', 'تفاصيل الطلب')} action={<button onClick={() => onTab('details')} className="text-[12.5px] font-semibold text-brand-700 hover:underline">{t('View full request', 'عرض الطلب كاملًا')}</button>}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
          <Field label={t('Request title', 'عنوان الطلب')} wide>{isAr ? (r.titleAr || r.title) : r.title}</Field>
          <Field label={t('Request number', 'رقم الطلب')}>{r.requestNo ? <span className="font-mono" dir="ltr">{r.requestNo}</span> : <span className="text-neutral-400 font-normal italic">{t('Assigned on submission', 'يُخصص عند التقديم')}</span>}</Field>
          <Field label={t('Department', 'الإدارة')}>{isAr ? (r.departmentAr || r.department) : r.department}</Field>
          <Field label={t('Status', 'الحالة')}><span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-medium ${st.chip}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{isAr ? st.ar : st.en}</span></Field>
          <Field label={t('Type', 'النوع')}><span className={`inline-flex px-2 py-0.5 rounded-md border text-[12px] font-medium ${ty.chip}`}>{isAr ? ty.ar : ty.en}</span></Field>
          <Field label={t('Budget code / Cost centre', 'رمز الميزانية / مركز التكلفة')}><span dir="ltr">{cc}</span></Field>
          <Field label={t('Estimated cost (incl. VAT)', 'التكلفة التقديرية (شامل الضريبة)')}><span dir="ltr" className="tabular-nums">SAR {amount.toLocaleString('en-US')}</span></Field>
          <Field label={t('Requester', 'مقدّم الطلب')}><span className="inline-flex items-center gap-2"><Ini name={r.createdByName || REQUESTER.name} />{isAr ? (r.createdByNameAr || r.createdByName) : r.createdByName}</span></Field>
          <Field label={t('Approvers', 'المعتمدون')}>
            <button onClick={() => onTab('process')} className="inline-flex items-center gap-2 group">
              <span className="flex -space-x-1.5 rtl:space-x-reverse">
                {approvers.slice(0, 5).map((s) => <span key={s.id} className={`rounded-full ring-2 ${s.state === 'done' ? 'ring-success-500' : s.state === 'current' ? 'ring-warning-500' : s.state === 'returned' ? 'ring-error-500' : 'ring-white'}`}><Ini name={s.who.en} size="w-8 h-8" /></span>)}
                {approvers.length > 5 && <span className="w-8 h-8 rounded-full ring-2 ring-white bg-neutral-100 text-neutral-600 text-[10.5px] font-semibold flex items-center justify-center">+{approvers.length - 5}</span>}
              </span>
              <span className="text-[12.5px] font-medium text-neutral-500 group-hover:text-brand-700">{doneN}/{approvers.length} {t('approved', 'معتمد')}</span>
            </button>
          </Field>
          <Field label={t('Created on', 'تاريخ الإنشاء')}>{fmt(r.createdAt)}</Field>
          <Field label={t('Last updated', 'آخر تحديث')}>{fmt(r.updatedAt)}</Field>
        </div>
      </Card>

      <Card title={t('PR details', 'تفاصيل طلب الشراء')}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
          <Field label={t('PR number', 'رقم طلب الشراء')}>{r.prNumber ? <span className="font-mono" dir="ltr">{r.prNumber}</span> : <span className="text-neutral-400 font-normal italic">{t('Created in SAP ECC after final approval', 'يُنشأ في SAP ECC بعد الاعتماد النهائي')}</span>}</Field>
          <Field label={t('RFP number', 'رقم المنافسة')}>{r.requestNo ? <span className="font-mono" dir="ltr">{r.requestNo.replace('TEN', esouq ? 'EMK' : 'RFP')}</span> : <span className="text-neutral-300 font-normal">—</span>}</Field>
          <Field label={t('Purchase type', 'نوع الشراء')}>{esouq ? t('Etimad E-Market order', 'طلب سوق اعتماد') : t('RFP — competitive tender', 'منافسة عامة')}</Field>
          <Field label={t('PR type', 'نوع طلب الشراء')}>{/Services|Consult|Support|Audit|Testing|Program|Agency|Cleaning|Leasing/i.test(r.title) ? t('Service', 'خدمة') : t('Material', 'مواد')}</Field>
          <Field label={t('Urgency', 'الأولوية')}>{amount > 3_000_000 ? t('High', 'عالية') : t('Normal', 'عادية')}</Field>
          <Field label={t('Delivery location', 'موقع التسليم')}>{t('Riyadh — Head office', 'الرياض — المقر الرئيسي')}</Field>
          <Field label={t('Expected start date', 'تاريخ البدء المتوقع')}>{fmt(startD)}</Field>
          <Field label={t('Expected end date', 'تاريخ الانتهاء المتوقع')}>{fmt(endD)}</Field>
          <Field label={t('Contract duration', 'مدة العقد')}>{esouq ? t('One-off purchase', 'شراء لمرة واحدة') : t('12 months', '12 شهرًا')}</Field>
          <Field label={t('Detailed requirement / statement of work (SOW)', 'المتطلبات التفصيلية / نطاق العمل')} wide>
            <p className="font-normal text-[13.5px] text-neutral-700 leading-relaxed">
              {isAr
                ? `يغطي هذا الطلب «${r.titleAr || r.title}» لصالح ${r.departmentAr || r.department}. يشمل النطاق التوريد والتنفيذ والتسليم وفق جدول الكميات المعتمد، مع ضمان المطابقة للمواصفات الفنية ومتطلبات الأمن السيبراني، وتقديم التدريب ونقل المعرفة والدعم بعد التشغيل. يُقاس النجاح بالالتزام بالجدول الزمني والقبول النهائي من الجهة الطالبة.`
                : `This request covers "${r.title}" for ${r.department}. The scope includes supply, implementation and delivery against the approved bill of quantities, compliance with the technical specification and cyber-security controls, plus training, knowledge transfer and post go-live support. Success is measured by on-time delivery against the plan and final acceptance by the requesting department.`}
            </p>
          </Field>
        </div>
      </Card>

      <Card title={t('Committee members', 'أعضاء اللجان')} action={<span className="text-[12px] text-neutral-400">{members.length} {t('members', 'أعضاء')}</span>}>
        <div className="grid lg:grid-cols-2 border-t border-neutral-100">
          {members.map((m, i) => (
            <div key={m.name} className={`flex items-center gap-3 py-4 border-b border-neutral-100 ${i % 2 === 0 ? 'lg:pe-6 lg:border-e' : 'lg:ps-6'}`}>
              <Ini name={m.name} size="w-10 h-10" text="text-[12px]" />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-neutral-900 truncate">{isAr ? m.nameAr : m.name}</p>
                <p className="text-[12.5px] text-neutral-500 truncate">{isAr ? m.roleAr : m.role}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[12px] font-semibold ${m.chip.cls}`}>{isAr ? m.chip.ar : m.chip.en}</span>
              <span className="w-40 hidden sm:flex items-center gap-1.5 text-[12.5px] text-neutral-600"><PeopleGlyph className="w-4 h-4 text-neutral-400 flex-shrink-0" />{isAr ? m.duty.ar : m.duty.en}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

// ─── Request details (every create-request section) ──────────────────────────

function Details({ rfp, amount, isAr, t }: { rfp: ReturnType<typeof requestRfpFor>; amount: number; isAr: boolean; t: T }) {
  const secs = rfpSections(rfp);
  return (
    <div className="flex gap-6 items-start">
      <nav className="hidden xl:block w-52 flex-shrink-0 sticky top-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{t('Sections', 'الأقسام')}</p>
        {secs.map((s) => (
          <button key={s.id} onClick={() => document.getElementById(`rfp-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="w-full text-start px-3 py-2 rounded-lg text-[13px] font-medium text-neutral-600 hover:bg-white hover:text-brand-700">{isAr ? s.ar : s.en}</button>
        ))}
      </nav>
      <div className="flex-1 min-w-0"><RfpTab rfp={rfp} amount={amount} isAr={isAr} t={t} /></div>
    </div>
  );
}

// ─── Documents ───────────────────────────────────────────────────────────────

interface Doc { name: string; nameAr: string; type: string; size: string; by: string; byAr: string; at: string }

function Documents({ r, rfp, editable, isAr, t }: { r: SavedRequest; rfp: ReturnType<typeof requestRfpFor>; editable: boolean; isAr: boolean; t: T }) {
  const [added, setAdded] = useState<Doc[]>([]);
  const by = r.createdByName || REQUESTER.name, byAr = r.createdByNameAr || by;
  const at = r.createdAt;
  const attachments: Doc[] = [
    ...rfp.documents.slice(0, r.type === 'souq-etimad' ? 2 : 5).map((d) => ({ name: d.en, nameAr: d.ar, type: d.type ?? 'PDF', size: d.size ?? '—', by, byAr, at })),
    ...added,
  ];
  const generated: Doc[] = [
    ...(r.status !== 'draft' ? [{ name: `Request summary — ${r.requestNo}`, nameAr: `ملخص الطلب — ${r.requestNo}`, type: 'PDF', size: '412 KB', by: 'Munafasat', byAr: 'منافسات', at }] : []),
    ...(r.status === 'approved' ? [{ name: 'Approval memo (DOA)', nameAr: 'مذكرة الاعتماد (تفويض الصلاحيات)', type: 'PDF', size: '188 KB', by: 'Munafasat', byAr: 'منافسات', at: r.updatedAt }] : []),
    ...(r.prNumber ? [{ name: `Purchase requisition ${r.prNumber}`, nameAr: `طلب الشراء ${r.prNumber}`, type: 'PDF', size: '96 KB', by: 'SAP ECC', byAr: 'SAP ECC', at: r.updatedAt }] : []),
  ];
  const groups = [
    { en: 'Request attachments', ar: 'مرفقات الطلب', docs: attachments },
    { en: 'Generated documents', ar: 'المستندات المُنشأة', docs: generated },
  ];
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <div className="space-y-5">
      {groups.map((g, gi) => (
        <section key={g.en} className="bg-white rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
            <h2 className="text-[15px] font-bold text-neutral-900">{isAr ? g.ar : g.en} <span className="ms-1 text-[12px] font-semibold text-neutral-400">{g.docs.length}</span></h2>
            {gi === 0 && editable && (
              <label className="cursor-pointer inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-neutral-300 text-[12.5px] font-semibold text-neutral-700 hover:bg-neutral-50">
                <UploadIcon className="w-4 h-4" />{t('Upload', 'رفع')}
                <input type="file" multiple className="hidden" onChange={(e) => {
                  const fs = Array.from(e.target.files ?? []);
                  setAdded((a) => [...a, ...fs.map((f) => ({ name: f.name, nameAr: f.name, type: (f.name.split('.').pop() || 'FILE').toUpperCase(), size: f.size > 1e6 ? `${(f.size / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1e3))} KB`, by, byAr, at: new Date().toISOString() }))]);
                  e.target.value = '';
                }} />
              </label>
            )}
          </div>
          {g.docs.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-neutral-400">{gi === 1 ? t('Documents are generated once the request is submitted.', 'تُنشأ المستندات بعد تقديم الطلب.') : t('No attachments yet.', 'لا توجد مرفقات بعد.')}</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {g.docs.map((d, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-neutral-50/70">
                  <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${d.type === 'PDF' ? 'bg-error-50 text-error-700' : d.type === 'XLSX' ? 'bg-success-50 text-success-700' : 'bg-blue-50 text-blue-700'}`}>{d.type}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-neutral-900 truncate">{isAr ? d.nameAr : d.name}</p>
                    <p className="text-[12px] text-neutral-500">{d.size} · {t('by', 'بواسطة')} {isAr ? d.byAr : d.by} · {fmt(d.at)}</p>
                  </div>
                  <button onClick={() => downloadPlaceholder(d.name, r)} title={t('Download', 'تنزيل')} className="w-9 h-9 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-brand-700 flex items-center justify-center"><DownloadIcon className="w-4 h-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

// ─── Process ─────────────────────────────────────────────────────────────────

function Process({ steps, r, isAr, t }: { steps: ProcStep[]; r: SavedRequest; isAr: boolean; t: T }) {
  const done = steps.filter((s) => s.state === 'done').length;
  const fmt = (iso: string) => new Date(iso).toLocaleString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  // Collapse consecutive steps of a parallel group into one block.
  const blocks: { group?: ProcStep['group']; items: ProcStep[] }[] = [];
  steps.forEach((s) => {
    const lastB = blocks[blocks.length - 1];
    if (s.group && lastB?.group?.en === s.group.en) lastB.items.push(s);
    else blocks.push({ group: s.group, items: [s] });
  });
  return (
    <section className="bg-white rounded-xl border border-neutral-200 shadow-sm">
      <div className="px-6 pt-5 pb-4 border-b border-neutral-100 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[17px] font-bold text-brand-700">{t('Approval process', 'مسار الاعتماد')}</h2>
          <p className="text-[12.5px] text-neutral-500 mt-0.5">{r.type === 'souq-etimad' ? t('Etimad E-Market flow — qualification is not required.', 'مسار سوق اعتماد — لا يتطلب التأهيل.') : t('Tender flow — reviews in the same group run in parallel.', 'مسار المنافسة — المراجعات في المجموعة نفسها تتم بالتوازي.')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-44 rounded-full bg-neutral-100 overflow-hidden"><div className="h-full bg-success-500 rounded-full" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
          <span className="text-[12.5px] font-semibold text-neutral-700 tabular-nums">{done}/{steps.length} {t('steps', 'خطوات')}</span>
        </div>
      </div>
      <ol className="px-6 py-5">
        {blocks.map((b, bi) => {
          const lastBlock = bi === blocks.length - 1;
          const bState = b.items.some((s) => s.state === 'returned') ? 'returned' : b.items.some((s) => s.state === 'current') ? 'current' : b.items.every((s) => s.state === 'done') ? 'done' : 'upcoming';
          return (
            <li key={bi} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <Node state={bState} n={bi + 1} />
                {!lastBlock && <span className={`w-0.5 flex-1 my-1 ${bState === 'done' ? 'bg-success-300' : 'bg-neutral-200'}`} />}
              </div>
              <div className={`flex-1 min-w-0 ${lastBlock ? '' : 'pb-6'}`}>
                {b.group ? (
                  <>
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-neutral-400 pt-1.5 mb-2">{isAr ? b.group.ar : b.group.en}</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {b.items.map((s) => <StepCard key={s.id} s={s} fmt={fmt} isAr={isAr} t={t} compact />)}
                    </div>
                  </>
                ) : <StepCard s={b.items[0]} fmt={fmt} isAr={isAr} t={t} />}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Node({ state, n }: { state: ProcStep['state']; n: number }) {
  if (state === 'done') return <span className="w-8 h-8 rounded-full bg-success-600 text-white flex items-center justify-center flex-shrink-0"><CheckIcon className="w-4 h-4" /></span>;
  if (state === 'returned') return <span className="w-8 h-8 rounded-full bg-error-600 text-white flex items-center justify-center flex-shrink-0"><ArrowLeftIcon className="w-4 h-4" /></span>;
  if (state === 'current') return <span className="w-8 h-8 rounded-full bg-white border-2 border-warning-500 text-warning-700 text-[12px] font-bold flex items-center justify-center flex-shrink-0 relative"><span className="absolute inset-0 rounded-full animate-ping bg-warning-400/20" />{n}</span>;
  return <span className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-400 text-[12px] font-semibold flex items-center justify-center flex-shrink-0">{n}</span>;
}

function StepCard({ s, fmt, isAr, t, compact }: { s: ProcStep; fmt: (iso: string) => string; isAr: boolean; t: T; compact?: boolean }) {
  const tag =
    s.state === 'done' ? <span className="text-[11.5px] font-semibold text-success-700">{t('Completed', 'مكتمل')}</span> :
    s.state === 'current' ? <span className="text-[11.5px] font-semibold text-warning-700">{t('In progress', 'قيد التنفيذ')}</span> :
    s.state === 'returned' ? <span className="text-[11.5px] font-semibold text-error-700">{t('Returned', 'مرتجع')}</span> :
    <span className="text-[11.5px] font-medium text-neutral-400">{t('Upcoming', 'قادم')}</span>;
  return (
    <div className={`rounded-xl border px-4 ${compact ? 'py-2.5' : 'py-3'} ${s.state === 'current' ? 'border-warning-200 bg-warning-50/40' : s.state === 'returned' ? 'border-error-200 bg-error-50/40' : 'border-neutral-200 bg-white'} ${s.state === 'upcoming' ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13.5px] font-semibold text-neutral-900">{isAr ? s.ar : s.en}</p>
        {tag}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[12.5px] text-neutral-600">
        <Ini name={s.who.en} size="w-5 h-5" text="text-[8.5px]" />
        <span className="truncate">{isAr ? s.who.ar : s.who.en}{s.who.role && <span className="text-neutral-400"> · {isAr ? s.who.roleAr : s.who.role}</span>}</span>
        {s.at && <span className="ms-auto text-[11.5px] text-neutral-400 whitespace-nowrap">{fmt(s.at)}</span>}
      </div>
      {s.note && <p className={`mt-2 text-[12.5px] leading-relaxed ${s.state === 'returned' ? 'text-error-700' : 'text-neutral-600'}`}>{isAr ? s.note.ar : s.note.en}</p>}
    </div>
  );
}

// ─── Small bits ──────────────────────────────────────────────────────────────

const AV = ['#1a6b38', '#2563eb', '#7c3aed', '#b45309', '#0e7490', '#be185d', '#4d7c0f'];
function Ini({ name, size = 'w-6 h-6', text = 'text-[10px]' }: { name: string; size?: string; text?: string }) {
  const parts = name.replace(/\bAl-/g, '').split(/[\s-]+/).filter(Boolean);
  const ini = ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  return <span className={`${size} ${text} rounded-full text-white font-semibold flex items-center justify-center flex-shrink-0`} style={{ background: AV[hash(name) % AV.length] }}>{ini}</span>;
}

function PeopleGlyph({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 19c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5v.5h-13z" /><circle cx="16.5" cy="9" r="2.6" opacity=".6" /><path d="M16 13.6c3 .1 5.5 2 5.5 4.9v.5h-4.6c0-2-1-3.9-2.6-5.1z" opacity=".6" /></svg>;
}

function downloadRequestPdf(r: SavedRequest) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFontSize(16); doc.text(r.title, 40, 60);
  doc.setFontSize(10);
  const rows: [string, string][] = [
    ['Request number', r.requestNo || 'Draft'], ['Status', STATUS[r.status].en], ['Type', TYPE[r.type].en],
    ['Department', r.department], ['Estimated cost', r.budget], ['Created on', r.createdAt.slice(0, 10)],
    ['PR number', r.prNumber || '—'], ['Created by', r.createdByName || '—'],
  ];
  rows.forEach(([k, v], i) => { doc.setTextColor(120); doc.text(k, 40, 100 + i * 22); doc.setTextColor(20); doc.text(v, 180, 100 + i * 22); });
  doc.save(`${r.requestNo || r.id}.pdf`);
}

function downloadPlaceholder(name: string, r: SavedRequest) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFontSize(14); doc.text(name, 40, 60);
  doc.setFontSize(10); doc.setTextColor(120); doc.text(`${r.requestNo || 'Draft'} · ${r.title}`, 40, 84);
  doc.text('Sample document generated by the Munafasat prototype.', 40, 110);
  doc.save(`${name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_')}.pdf`);
}

