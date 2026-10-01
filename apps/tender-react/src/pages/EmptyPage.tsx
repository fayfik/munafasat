import type { ComponentType } from 'react';
import { useT } from '../context/LanguageContext';
import { NavInboxIcon, NavReportsIcon } from '../components/Icons';

const PAGES: Record<'inbox' | 'reports', { title: [string, string]; sub: [string, string]; empty: [string, string]; hint: [string, string]; Icon: ComponentType<{ className?: string; filled?: boolean }> }> = {
  inbox: {
    title: ['Inbox', 'الوارد'],
    sub: ['Requests and tasks that need your action.', 'الطلبات والمهام التي تحتاج إلى إجراء منك.'],
    empty: ['Nothing needs your attention', 'لا يوجد ما يحتاج إلى انتباهك'],
    hint: ['Requests sent back to you, approvals and comments will appear here.', 'ستظهر هنا الطلبات المعادة إليك والموافقات والتعليقات.'],
    Icon: NavInboxIcon,
  },
  reports: {
    title: ['Reports', 'التقارير'],
    sub: ['Procurement activity and spend across your requests.', 'نشاط المشتريات والإنفاق عبر طلباتك.'],
    empty: ['Reports are coming soon', 'التقارير قادمة قريباً'],
    hint: ['You will be able to track request status, cycle times and spend by cost center here.', 'ستتمكن هنا من متابعة حالة الطلبات ومدد الإنجاز والإنفاق حسب مركز التكلفة.'],
    Icon: NavReportsIcon,
  },
};

/** Placeholder page for main-menu destinations that are not built yet. */
export default function EmptyPage({ page }: { page: 'inbox' | 'reports' }) {
  const t = useT();
  const c = PAGES[page];
  return (
    <div className="px-4 sm:px-6 py-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-title-sm font-semibold text-neutral-900">{t(...c.title)}</h1>
        <p className="text-body-md text-neutral-500 mt-0.5">{t(...c.sub)}</p>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white py-16 px-6 text-center shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
          <c.Icon className="w-6 h-6" />
        </div>
        <p className="mt-4 text-[15px] font-semibold text-neutral-800">{t(...c.empty)}</p>
        <p className="mt-1 text-[13px] text-neutral-500 max-w-sm mx-auto">{t(...c.hint)}</p>
      </div>
    </div>
  );
}
