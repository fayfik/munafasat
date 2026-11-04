// Manual build — requester side of the Cyber improvements (Kholoud's points 1, 2 and 8):
//  - a "General" request is asked whether it introduces or changes technology (then Cyber reviews it);
//  - the requester picks the expected data classification and includes the Cybersecurity
//    requirements that apply, from the same library the Cyber reviewer checks against.
import { useTender } from '../context/TenderContext';
import { useLanguage, useT } from '../context/LanguageContext';
import { CLASSIFICATIONS, applicableReqs, classLevel } from '../lib/cyberLibrary';

export function AffectsTechnologyQuestion({ show }: { show: boolean }) {
  const { formData, updateField } = useTender();
  const t = useT();
  if (!show) return null;
  const v = formData.affectsTechnology;
  return (
    <div className="mt-3 rounded-lg border border-neutral-200 bg-white px-3.5 py-3" data-testid="affects-tech">
      <p className="text-[12.5px] font-semibold text-neutral-800">{t('Does this request introduce new technology or change an existing system?', 'هل يضيف هذا الطلب تقنية جديدة أو يغيّر نظاماً قائماً؟')}</p>
      <p className="text-[11.5px] text-neutral-500 mt-0.5">{t('For example a new app, device, cloud service, integration or data access. If yes, Cyber Security reviews it.', 'مثل تطبيق أو جهاز أو خدمة سحابية أو تكامل أو وصول إلى بيانات. إن كانت الإجابة نعم يراجعه الأمن السيبراني.')}</p>
      <div className="mt-2 flex gap-2" role="radiogroup">
        {[true, false].map((x) => (
          <button key={String(x)} type="button" role="radio" aria-checked={v === x} onClick={() => updateField('affectsTechnology', x)}
            className={`px-3 py-1.5 rounded-md text-[12.5px] font-semibold border ${v === x ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'}`}>
            {x ? t('Yes', 'نعم') : t('No', 'لا')}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CyberRequirementsPicker({ categories, show }: { categories: string[]; show: boolean }) {
  const { formData, updateField } = useTender();
  const { isAr } = useLanguage();
  const t = useT();
  if (!show) return null;
  const cls = formData.dataClassification ?? 'Internal';
  const list = applicableReqs(categories.length ? categories : ['general'], classLevel(cls));
  const chosen = new Set(formData.cyberRequirements ?? []);
  const toggle = (id: string) => { const n = new Set(chosen); if (n.has(id)) n.delete(id); else n.add(id); updateField('cyberRequirements', [...n]); };
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4" data-testid="cyber-picker">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-neutral-900">{t('Cybersecurity requirements', 'متطلبات الأمن السيبراني')}</p>
          <p className="text-[12px] text-neutral-500 mt-0.5">{t('From the Cyber Security requirements library. Include the ones that apply — Cyber reviews against this same list, so including them now avoids a return later.', 'من مكتبة متطلبات الأمن السيبراني. أدرج ما ينطبق — يراجع الأمن السيبراني وفق القائمة نفسها، فإدراجها الآن يجنبك الإعادة لاحقاً.')}</p>
        </div>
        <button type="button" onClick={() => updateField('cyberRequirements', [...new Set([...chosen, ...list.map((r) => r.id)])])} className="text-[12px] font-semibold text-brand-700 hover:underline">{t('Include all', 'إدراج الكل')}</button>
      </div>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className="text-[12px] font-medium text-neutral-600">{t('Data this request handles:', 'البيانات التي يتعامل معها الطلب:')}</span>
        {CLASSIFICATIONS.map((c) => (
          <button key={c.en} type="button" onClick={() => updateField('dataClassification', c.en)}
            className={`px-2.5 py-1 rounded-md text-[12px] font-semibold border ${cls === c.en ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-neutral-700 border-neutral-300'}`}>{isAr ? c.ar : c.en}</button>
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {list.map((r) => (
          <li key={r.id}>
            <label className="flex items-start gap-2.5 rounded-lg bg-white border border-neutral-200 px-3 py-2 cursor-pointer hover:border-brand-300">
              <input type="checkbox" className="mt-0.5 accent-brand-600" checked={chosen.has(r.id)} onChange={() => toggle(r.id)} />
              <span className="min-w-0"><span className="block text-[12.5px] font-semibold text-neutral-800">{isAr ? r.titleAr : r.titleEn}</span><span className="block text-[11.5px] text-neutral-500 leading-snug">{r.textEn}</span></span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11.5px] text-neutral-500">{t(`${chosen.size} included · they’re added to your technical requirements.`, `${chosen.size} مدرجة · تُضاف إلى متطلباتك الفنية.`)}</p>
    </div>
  );
}
