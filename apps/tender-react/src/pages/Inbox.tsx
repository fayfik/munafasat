import { useRequests } from '../context/RequestStore';
import { useRole } from '../context/RoleContext';
import { useT, useLanguage } from '../context/LanguageContext';
import { Badge } from '../components/ui';
import type { V3Stage } from '../types/tender';

/** v3 — requests waiting on the current role (Procurement: to complete; Requester: to confirm). */
export default function Inbox({ onOpen }: { onOpen: (id: string) => void }) {
  const { requests } = useRequests();
  const { role } = useRole();
  const t = useT();
  const { isAr } = useLanguage();
  const waiting: V3Stage = role === 'procurement' ? 'with-procurement' : 'requester-confirm';
  const rows = requests.filter((r) => r.form?.v3Stage === waiting);
  const others = requests.filter((r) => r.form?.v3Stage && r.form.v3Stage !== waiting && r.form.v3Stage !== 'draft');
  const stageLabel = (s?: V3Stage) => s === 'with-procurement' ? t('With Procurement', 'لدى المشتريات') : s === 'requester-confirm' ? t('Awaiting requester', 'بانتظار مقدم الطلب') : s === 'in-approval' ? t('In approval', 'قيد الاعتماد') : t('Draft', 'مسودة');
  const when = (iso: string) => new Date(iso).toLocaleString(isAr ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const Row = ({ r }: { r: (typeof requests)[number] }) => (
    <button type="button" onClick={() => onOpen(r.id)} className="w-full text-start flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-neutral-50 transition-colors">
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-neutral-900 truncate">{r.title}</p>
        <p className="text-[12px] text-neutral-500 mt-0.5">{r.department} · {r.requestNo ? <span dir="ltr">{r.requestNo}</span> : null} · {t('updated', 'آخر تحديث')} {when(r.updatedAt)}</p>
        {role === 'procurement' && r.form?.requesterChangeRequest && r.form.v3Stage === 'with-procurement' && (
          <p className="text-[12px] text-warning-700 mt-1">{t('Changes requested:', 'تعديلات مطلوبة:')} {r.form.requesterChangeRequest}</p>
        )}
      </div>
      <Badge variant={r.form?.v3Stage === waiting ? 'warning' : 'default'}>{stageLabel(r.form?.v3Stage)}</Badge>
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-title-md font-semibold text-neutral-900">{t('Inbox', 'الوارد')}</h1>
        <p className="text-[13px] text-neutral-500 mt-1">
          {role === 'procurement'
            ? t('Requests sent by requesters for you to add payment stages and evaluation criteria.', 'طلبات أرسلها مقدمو الطلبات لإضافة مراحل الدفع ومعايير التقييم.')
            : t('RFPs Procurement has completed and sent back for your confirmation.', 'كراسات أكملتها المشتريات وأعادتها لتأكيدك.')}
        </p>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <p className="px-5 py-3 text-[12px] font-semibold text-neutral-500 uppercase tracking-wide border-b border-neutral-100">{t('Waiting for you', 'بانتظارك')} · {rows.length}</p>
        <div className="divide-y divide-neutral-100">
          {rows.map((r) => <Row key={r.id} r={r} />)}
          {rows.length === 0 && (
            <p className="px-5 py-8 text-center text-[13px] text-neutral-500">
              {role === 'procurement'
                ? t('Nothing to complete. Requests a requester sends to Procurement appear here.', 'لا شيء لإكماله. تظهر هنا الطلبات التي يرسلها مقدمو الطلبات.')
                : t('Nothing to confirm right now.', 'لا شيء لتأكيده حالياً.')}
            </p>
          )}
        </div>
      </div>
      {others.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <p className="px-5 py-3 text-[12px] font-semibold text-neutral-500 uppercase tracking-wide border-b border-neutral-100">{t('Other requests in progress', 'طلبات أخرى قيد التنفيذ')}</p>
          <div className="divide-y divide-neutral-100">{others.map((r) => <Row key={r.id} r={r} />)}</div>
        </div>
      )}
    </div>
  );
}
