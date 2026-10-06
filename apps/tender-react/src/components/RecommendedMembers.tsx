import { useState } from 'react';
import { useT, useLanguage } from '../context/LanguageContext';
import { SparklesIcon, CheckIcon, CheckCircleIcon, ChevronDownIcon } from './Icons';
import { Avatar } from './ui';
import type { Person } from '../types/tender';

interface RecMember {
  id: string;
  name: string; nameAr: string;
  role: string; roleAr: string;
  department: string;
  initials: string; avatarColor: string;
  reviewed: number;        // RFPs reviewed in this project
  photoUrl: string;        // professional stock headshot
}

// Face-cropped stock headshots (Unsplash). `crop=faces` centres on the face.
const AV = (id: string) => `https://images.unsplash.com/photo-${id}?w=176&h=176&fit=crop&crop=faces&auto=format&q=80`;

export const RECOMMENDED_MEMBERS: RecMember[] = [
  { id: 'rec-khalid',   name: 'Khalid Al-Otaibi',   nameAr: 'خالد العتيبي',  role: 'Senior Solutions Architect',   roleAr: 'كبير مهندسي الحلول',          department: 'IT & Digital Transformation', initials: 'KA', avatarColor: '#1a6b38', reviewed: 4, photoUrl: AV('1756412066366-b46dafaca253') },
  { id: 'rec-abdullah', name: 'Abdullah Al-Harbi',  nameAr: 'عبدالله الحربي', role: 'Procurement Lead',             roleAr: 'قائد المشتريات',             department: 'Finance & Procurement',       initials: 'AH', avatarColor: '#2563eb', reviewed: 3, photoUrl: AV('1780776489912-aa89b69b8c59') },
  { id: 'rec-noura',    name: 'Noura Al-Qahtani',   nameAr: 'نورة القحطاني', role: 'Cybersecurity Officer',        roleAr: 'مسؤولة الأمن السيبراني',     department: 'Information Security',         initials: 'NQ', avatarColor: '#7c3aed', reviewed: 5, photoUrl: AV('1649399044844-9af065083b8a') },
  { id: 'rec-faisal',   name: 'Faisal Al-Dossari',  nameAr: 'فيصل الدوسري',  role: 'ERP Functional Manager',       roleAr: 'مدير وظيفي لنظام تخطيط الموارد', department: 'IT & Digital Transformation', initials: 'FD', avatarColor: '#d97706', reviewed: 2, photoUrl: AV('1756412066334-faa0ba38261f') },
  { id: 'rec-sara',     name: 'Sara Al-Zahrani',    nameAr: 'سارة الزهراني', role: 'Quality & Compliance Analyst', roleAr: 'محللة الجودة والامتثال',     department: 'PMO',                         initials: 'SZ', avatarColor: '#be123c', reviewed: 3, photoUrl: AV('1649399046939-7b8112221151') },
];

export default function RecommendedMembers({ value, onChange }: { value: Person[]; onChange: (p: Person[]) => void }) {
  const t = useT();
  const { isAr } = useLanguage();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const isAdded = (id: string) => value.some((p) => p.id === id);
  const toPerson = (m: RecMember): Person => ({ id: m.id, name: m.name, nameAr: m.nameAr, role: m.role, department: m.department, initials: m.initials, avatarColor: m.avatarColor, photoUrl: m.photoUrl });

  const addMembers = (ids: string[]) => {
    const toAdd = RECOMMENDED_MEMBERS.filter((m) => ids.includes(m.id) && !isAdded(m.id)).map(toPerson);
    if (toAdd.length) onChange([...value, ...toAdd]);
    setPicked(new Set());
  };
  const togglePick = (id: string) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectableIds = RECOMMENDED_MEMBERS.filter((m) => !isAdded(m.id)).map((m) => m.id);
  const allPicked = selectableIds.length > 0 && selectableIds.every((id) => picked.has(id));
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(selectableIds));

  return (
    <div className="mt-3">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ai-200 bg-ai-50 text-ai-700 text-[12px] font-semibold hover:bg-ai-100 transition-colors">
        <SparklesIcon className="w-3.5 h-3.5" />
        {t('Recommended members', 'أعضاء مقترحون')}
        <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-ai-100 bg-ai-50/40 p-4 slide-up">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-[13px] font-semibold text-neutral-800">{t('Recommended committee members', 'أعضاء اللجنة المقترحون')}</p>
              <p className="text-[12px] text-neutral-600">{t('People who have reviewed RFPs created in this project.', 'أشخاص راجعوا طلبات عروض أُنشئت في هذا المشروع.')}</p>
            </div>
            <button type="button" onClick={toggleAll} className="text-[12px] font-semibold text-ai-700 hover:text-ai-800 flex-shrink-0">
              {allPicked ? t('Clear all', 'مسح الكل') : t('Select all', 'تحديد الكل')}
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5">
            {RECOMMENDED_MEMBERS.map((m) => {
              const added = isAdded(m.id);
              const sel = picked.has(m.id);
              return (
                <button key={m.id} type="button" disabled={added} onClick={() => togglePick(m.id)}
                  className={`text-start rounded-xl border p-3 flex items-start gap-3 transition-colors ${added ? 'border-success-200 bg-success-50/60 cursor-default' : sel ? 'border-brand-500 bg-brand-50' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}>
                  <Avatar person={m} className="w-11 h-11 rounded-full flex-shrink-0 ring-1 ring-black/5" textClass="text-[14px]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-neutral-900 truncate">{isAr ? m.nameAr : m.name}</p>
                    <p className="text-[11px] text-neutral-500 truncate">{(isAr ? m.roleAr : m.role)} · {m.department}</p>
                    <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-ai-700 bg-ai-100/70 rounded-full px-2 py-0.5">
                      <SparklesIcon className="w-3 h-3" />
                      {t(`Reviewed ${m.reviewed} RFP${m.reviewed > 1 ? 's' : ''}`, `راجع ${m.reviewed} طلب عروض`)}
                    </span>
                  </div>
                  {added ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-700 flex-shrink-0"><CheckCircleIcon className="w-4 h-4" />{t('Added', 'مُضاف')}</span>
                  ) : (
                    <span className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${sel ? 'bg-brand-600 border-brand-600' : 'border-neutral-300'}`}>
                      {sel && <CheckIcon className="w-3 h-3 text-white" />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 mt-3">
            <button type="button" onClick={() => addMembers(selectableIds)} disabled={selectableIds.length === 0}
              className="px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors">
              {t('Add all', 'إضافة الكل')}
            </button>
            <button type="button" onClick={() => addMembers([...picked])} disabled={picked.size === 0}
              className="px-3.5 py-1.5 rounded-lg bg-brand-600 text-white text-[12px] font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {t(`Add selected${picked.size ? ` (${picked.size})` : ''}`, `إضافة المحدد${picked.size ? ` (${picked.size})` : ''}`)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
