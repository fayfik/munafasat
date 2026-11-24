/* Evaluation onboarding — shown the first time a member starts evaluating (then behind the ⓘ button).
   Three steps with illustrations; the last CTA verifies once (one code for every bidder this session). */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { EvalRole } from './types';
import { Button } from '../components/ui';
import { CheckIcon, XIcon } from '../components/Icons';

type T = (en: string, ar: string) => string;

/* ── Illustrations (flat, brand palette) ── */
const Blob = ({ c }: { c: string }) => <path d="M60 40C110-10 260-5 320 45s35 140-30 165-210 25-255-25S10 90 60 40z" fill={c} />;
const IlluVerify = () => (
  <svg viewBox="0 0 360 230" className="w-full h-full" aria-hidden>
    <Blob c="#EEF3E8" />
    <circle cx="300" cy="40" r="6" fill="#F5C451" /><circle cx="48" cy="176" r="4" fill="#5B4BD8" opacity=".5" />
    <rect x="128" y="22" width="104" height="186" rx="18" fill="#2A3466" />
    <rect x="136" y="36" width="88" height="158" rx="10" fill="#fff" />
    <rect x="166" y="28" width="28" height="4" rx="2" fill="#4B5694" />
    <text x="180" y="66" textAnchor="middle" style={{ font: '600 9px Inter, sans-serif' }} fill="#6B7280">Munafasat</text>
    <text x="180" y="80" textAnchor="middle" style={{ font: '700 10px Inter, sans-serif' }} fill="#111827">Your code</text>
    {[0, 1, 2, 3, 4, 5].map((i) => <g key={i}><rect x={142 + i * 13.3} y="92" width="11" height="15" rx="3" fill={i < 4 ? '#EEF3E8' : '#F3F4F6'} stroke={i < 4 ? '#699843' : '#E5E7EB'} /><text x={147.5 + i * 13.3} y="103" textAnchor="middle" style={{ font: '700 8px Inter, sans-serif' }} fill="#2A3466">{i < 4 ? '4826'[i] : ''}</text></g>)}
    <rect x="146" y="122" width="68" height="16" rx="8" fill="#699843" /><text x="180" y="133" textAnchor="middle" style={{ font: '700 7.5px Inter, sans-serif' }} fill="#fff">Verify</text>
    <rect x="148" y="150" width="64" height="4" rx="2" fill="#E5E7EB" /><rect x="156" y="160" width="48" height="4" rx="2" fill="#E5E7EB" />
    <g transform="translate(228 112)">
      <path d="M32 0l30 12v22c0 20-13 36-30 44C15 70 2 54 2 34V12L32 0z" fill="#699843" />
      <path d="M32 8l22 9v17c0 15-9 27-22 33-13-6-22-18-22-33V17l22-9z" fill="#83B35A" />
      <path d="M21 36l8 8 15-16" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <g transform="translate(58 70)">
      <rect width="62" height="34" rx="10" fill="#fff" stroke="#E5E7EB" /><path d="M14 34l-4 10 14-10" fill="#fff" stroke="#E5E7EB" />
      <rect x="10" y="10" width="30" height="5" rx="2.5" fill="#5B4BD8" opacity=".75" /><rect x="10" y="20" width="42" height="4" rx="2" fill="#E5E7EB" />
    </g>
    <path d="M300 160l4 8 8 4-8 4-4 8-4-8-8-4 8-4z" fill="#F5C451" />
  </svg>
);
const IlluRead = () => (
  <svg viewBox="0 0 360 230" className="w-full h-full" aria-hidden>
    <Blob c="#EEEAFE" />
    <g transform="rotate(-6 120 120)"><rect x="62" y="40" width="120" height="156" rx="8" fill="#fff" stroke="#E5E7EB" /></g>
    <rect x="78" y="30" width="124" height="164" rx="8" fill="#fff" stroke="#D1D5DB" />
    <rect x="92" y="48" width="70" height="7" rx="3.5" fill="#2A3466" />
    {[64, 76, 88].map((y) => <rect key={y} x="92" y={y} width={y === 88 ? 60 : 96} height="4" rx="2" fill="#E5E7EB" />)}
    <rect x="88" y="100" width="104" height="22" rx="4" fill="#FEF3C7" stroke="#FCD34D" />
    <rect x="94" y="107" width="80" height="4" rx="2" fill="#B45309" opacity=".55" /><rect x="94" y="114" width="56" height="3" rx="1.5" fill="#B45309" opacity=".35" />
    {[132, 144, 156, 168].map((y) => <rect key={y} x="92" y={y} width={y === 168 ? 50 : 92} height="4" rx="2" fill="#E5E7EB" />)}
    <g transform="translate(150 118)"><circle cx="22" cy="22" r="20" fill="#fff" fillOpacity=".4" stroke="#2A3466" strokeWidth="6" /><path d="M37 37l18 18" stroke="#2A3466" strokeWidth="8" strokeLinecap="round" /></g>
    <g transform="translate(222 46)">
      <rect width="112" height="122" rx="14" fill="#5B4BD8" />
      <path d="M18 18l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff" />
      <rect x="36" y="22" width="48" height="6" rx="3" fill="#fff" fillOpacity=".85" />
      {[[46, 70], [62, 54], [78, 82]].map(([y, w]) => <g key={y}><rect x="14" y={y} width="84" height="7" rx="3.5" fill="#fff" fillOpacity=".2" /><rect x="14" y={y} width={w} height="7" rx="3.5" fill="#fff" /></g>)}
      <rect x="14" y="96" width="44" height="14" rx="7" fill="#fff" /><text x="36" y="106" textAnchor="middle" style={{ font: '700 7.5px Inter, sans-serif' }} fill="#5B4BD8">Apply</text>
    </g>
    <path d="M216 120 C200 120 196 110 188 108" stroke="#5B4BD8" strokeWidth="2" strokeDasharray="4 4" fill="none" />
    <circle cx="44" cy="58" r="5" fill="#F5C451" /><circle cx="330" cy="196" r="6" fill="#699843" opacity=".5" />
  </svg>
);
const IlluSign = () => (
  <svg viewBox="0 0 360 230" className="w-full h-full" aria-hidden>
    <Blob c="#FDF2E3" />
    {[0, 1, 2].map((i) => (
      <g key={i} transform={`translate(${46 + i * 8} ${52 + i * 40})`}>
        <rect width="112" height="32" rx="9" fill="#fff" stroke="#E5E7EB" />
        <circle cx="16" cy="16" r="9" fill={i === 0 ? '#699843' : i === 1 ? '#EEF3E8' : '#F3F4F6'} />
        {i === 0 && <path d="M12 16l3 3 6-6" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        <rect x="32" y="10" width={i === 2 ? 50 : 64} height="5" rx="2.5" fill="#2A3466" opacity={i === 0 ? 1 : 0.55} /><rect x="32" y="19" width="40" height="4" rx="2" fill="#E5E7EB" />
      </g>
    ))}
    <g transform="translate(186 26)">
      <rect width="150" height="176" rx="12" fill="#fff" stroke="#D1D5DB" />
      <path d="M30 70a45 45 0 0 1 90 0" stroke="#EEF0F3" strokeWidth="12" fill="none" strokeLinecap="round" />
      <path d="M30 70a45 45 0 0 1 78-30" stroke="#699843" strokeWidth="12" fill="none" strokeLinecap="round" />
      <text x="75" y="70" textAnchor="middle" style={{ font: '700 18px Inter, sans-serif' }} fill="#111827">86</text>
      <rect x="22" y="96" width="106" height="52" rx="8" fill="#F0F7EA" stroke="#83B35A" strokeDasharray="4 3" />
      <path d="M34 128c8-14 14-14 16-4s8 8 12-4 8-6 10 2 10 2 16-6" stroke="#2A3466" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <rect x="34" y="136" width="58" height="4" rx="2" fill="#699843" opacity=".55" />
      <g transform="translate(108 120) rotate(35)"><rect width="10" height="44" rx="3" fill="#2A3466" /><path d="M0 44l5 10 5-10z" fill="#F5C451" /></g>
    </g>
    <path d="M330 26l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#5B4BD8" opacity=".7" /><circle cx="176" cy="206" r="5" fill="#F5C451" />
  </svg>
);

const STEPS = (role: EvalRole, t: T) => [
  { illu: <IlluVerify />, title: t('Verify once', 'تحقق مرة واحدة'), short: t('One code, all bidders', 'رمز واحد لكل الموردين'),
    body: t('A one-time code sent to your phone unlocks every bidder’s offer for this session. Your access and each signature are logged with date and time.', 'رمز لمرة واحدة يُرسل إلى جوالك يفتح عروض كل الموردين لهذه الجلسة. يُسجل دخولك وكل توقيع بالتاريخ والوقت.'),
    points: [t('No code per vendor — just once', 'لا رمز لكل مورد — مرة واحدة فقط'), t('The session ends when you leave the task', 'تنتهي الجلسة عند مغادرة المهمة')] },
  { illu: <IlluRead />, title: t('Read the offer with AI beside you', 'اقرأ العرض والذكاء الاصطناعي بجانبك'), short: t('Documents + AI insights', 'المستندات ورؤى الذكاء'),
    body: role === 'legal' ? t('Every certificate the bidder submitted opens in the viewer. AI reads expiry dates and flags what is missing or expired.', 'تفتح كل شهادة قدمها المورد في العارض. يقرأ الذكاء الاصطناعي تواريخ الانتهاء ويشير إلى الناقص أو المنتهي.')
      : role === 'finance' ? t('The financial offer and price schedule open in the viewer. AI compares the price with the estimate and the other bidders.', 'يفتح العرض المالي وجدول الأسعار في العارض. يقارن الذكاء الاصطناعي السعر بالتقدير وبالموردين الآخرين.')
      : t('Every document the bidder submitted opens here. AI reads it against the request, suggests a score and shows the page it came from — plus who the vendor is and how they have delivered for us before.', 'كل مستند قدمه المورد يفتح هنا. يقرأه الذكاء الاصطناعي مقابل الطلب ويقترح درجة ويعرض الصفحة المصدر — ومن هو المورد وكيف كان أداؤه معنا.'),
    points: [t('Tap an AI suggestion to see why', 'اضغط على اقتراح الذكاء لمعرفة السبب'), t('Citations jump to the exact passage', 'الإشارات تنتقل إلى المقطع نفسه')] },
  { illu: <IlluSign />, title: role === 'legal' ? t('Check, decide, sign', 'تحقق، قرر، وقّع') : role === 'finance' ? t('Price, preferences, sign', 'السعر، التفضيلات، التوقيع') : t('Score, sign, next bidder', 'قيّم، وقّع، المورد التالي'), short: t('E-sign every bidder', 'وقّع لكل مورد'),
    body: role === 'legal' ? t('Mark each document, decide compliance with a reason code, then e-sign. Non-compliant offers leave the ranking.', 'حدد حالة كل مستند وقرر المطابقة برمز السبب ثم وقّع. تخرج العروض غير المطابقة من الترتيب.')
      : role === 'finance' ? t('Confirm the evaluated price and preferences, then e-sign. The ranking unlocks when every bidder is signed.', 'أكّد السعر المقيّم والتفضيلات ثم وقّع. يظهر الترتيب بعد توقيع كل الموردين.')
      : t('Score each criterion, justify outliers, then e-sign with your name, role and time. The next bidder opens automatically.', 'قيّم كل معيار وبرّر الدرجات الاستثنائية ثم وقّع باسمك ودورك والوقت. يفتح المورد التالي تلقائياً.'),
    points: [t('Signed sheets become read-only', 'تصبح الأوراق الموقعة للقراءة فقط'), t('A return voids the signature, with the reason logged', 'الإعادة تلغي التوقيع مع تسجيل السبب')] },
];
const TIP = (role: EvalRole, t: T) => role === 'legal' ? t('An expired certificate isn’t automatically non-compliant — use reason code L-02 if it decides the outcome.', 'الشهادة المنتهية لا تعني عدم المطابقة تلقائياً — استخدم L-02 إذا كانت حاسمة.')
  : role === 'finance' ? t('Prices more than 20% from the estimate are flagged and need your comment before you sign.', 'الأسعار التي تبعد أكثر من 20% عن التقدير تحتاج تعليقك قبل التوقيع.')
  : t('Scores below 60 or 90 and above need a short justification — AI can draft it from the offer.', 'الدرجات أقل من 60 أو 90 فأعلى تحتاج تبريراً — يمكن للذكاء صياغته من العرض.');

export function Onboarding({ role, roleLabel, vendors, mode, isAr, t, onDone, onClose }: { role: EvalRole; roleLabel: string; vendors: number; mode: 'first' | 'info'; isAr: boolean; t: T; onDone: () => void; onClose: () => void }) {
  const steps = STEPS(role, t);
  const [i, setI] = useState(0);
  const st = steps[i]; const last = i === steps.length - 1;
  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-[radial-gradient(80%_80%_at_30%_20%,rgba(42,52,102,.55),rgba(17,24,39,.65))] backdrop-blur-[3px] fade-in" onClick={onClose}>
      <div role="dialog" aria-label={t('How evaluation works', 'كيف يعمل التقييم')} onClick={(e) => e.stopPropagation()} data-onboarding={mode}
        className="w-full max-w-[940px] h-[580px] rounded-[28px] bg-white shadow-2xl overflow-hidden grid grid-cols-[300px_1fr] rise-in">
        <aside className="relative flex flex-col px-7 py-7 border-e border-neutral-200">
          <span className="w-fit inline-flex items-center rounded-md bg-[#EEF1FA] text-[#2A3466] px-2 py-0.5 text-[11px] font-semibold">{roleLabel}</span>
          <h2 className="mt-3 text-[20px] font-bold text-neutral-900 leading-tight">{t('Before you evaluate', 'قبل أن تبدأ التقييم')}</h2>
          <p className="mt-1 text-[12.5px] text-neutral-500">{t(`3 steps · ${vendors} bidders waiting`, `3 خطوات · ${vendors} موردين بانتظارك`)}</p>
          <ol className="relative mt-7 space-y-6">
            <span className="absolute start-[19px] top-2 bottom-2 w-0.5 bg-neutral-100" />
            <span className="absolute start-[19px] top-2 w-0.5 bg-brand-500 transition-all duration-500" style={{ height: `${(i / (steps.length - 1)) * 100}%`, maxHeight: 'calc(100% - 16px)' }} />
            {steps.map((s, k) => (
              <li key={k}>
                <button type="button" onClick={() => setI(k)} className="relative flex items-start gap-3 text-start group" data-onb-step={k}>
                  <span className={`relative z-10 w-10 h-10 rounded-full inline-flex items-center justify-center text-[14px] font-bold transition-all ${k < i ? 'bg-brand-600 text-white' : k === i ? 'bg-white text-brand-700 ring-[3px] ring-brand-500 shadow-[0_0_0_6px_rgba(105,152,67,.15)]' : 'bg-neutral-100 text-neutral-400'}`}>
                    {k < i ? <CheckIcon className="w-4 h-4" /> : k + 1}
                  </span>
                  <span className="pt-1"><span className={`block text-[13px] font-semibold ${k === i ? 'text-neutral-900' : 'text-neutral-500 group-hover:text-neutral-700'}`}>{s.title}</span><span className="block text-[11.5px] text-neutral-400">{s.short}</span></span>
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-auto">
            <div className="border-t border-dashed border-neutral-200 pt-4">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">{t('Good to know', 'معلومة مفيدة')}</p>
              <p className="mt-1.5 text-[12px] text-neutral-600 leading-relaxed">{TIP(role, t)}</p>
            </div>
          </div>
        </aside>
        <section className="relative flex flex-col bg-[#F7F8FA]">
          <button type="button" onClick={onClose} aria-label={t('Close', 'إغلاق')} className="absolute top-4 end-4 z-10 w-9 h-9 rounded-full inline-flex items-center justify-center text-neutral-400 hover:bg-white hover:text-neutral-700"><XIcon className="w-5 h-5" /></button>
          <div className="h-[250px] px-12 pt-8 flex items-center justify-center" key={`i${i}`}><div className="w-full max-w-[380px] h-full rise-in">{st.illu}</div></div>
          <div className="flex-1 px-12 pt-4 fade-in" key={`t${i}`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">{t(`Step ${i + 1} of ${steps.length}`, `الخطوة ${i + 1} من ${steps.length}`)}</p>
            <h3 className="mt-1.5 text-[26px] font-bold text-neutral-900 leading-tight">{st.title}</h3>
            <p className="mt-2 text-[14px] text-neutral-600 leading-relaxed max-w-[520px]">{st.body}</p>
            <ul className="mt-3 flex flex-wrap gap-2">{st.points.map((p) => <li key={p} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white ring-1 ring-neutral-200 text-[12.5px] text-neutral-700"><CheckIcon className="w-3.5 h-3.5 text-brand-600" />{p}</li>)}</ul>
          </div>
          <div className="px-12 pb-8 pt-4 flex items-center gap-2 justify-end">
            <span className="me-auto flex gap-1.5">{steps.map((_, k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-6 bg-brand-600' : 'w-1.5 bg-neutral-300'}`} />)}</span>
            {last
              ? <Button variant="primary" onClick={onDone} data-onb-done>{mode === 'first' ? t('Verify and start', 'تحقق وابدأ') : t('Got it', 'فهمت')}</Button>
              : <Button variant="primary" onClick={() => setI(i + 1)} data-onb-next>{t('Next', 'التالي')}</Button>}
            {i > 0 && <Button variant="secondary" onClick={() => setI(i - 1)}>{t('Back', 'السابق')}</Button>}
            {mode === 'first' && !last && <Button variant="ghost" onClick={onDone} data-onb-skip>{t('Skip intro', 'تخطي المقدمة')}</Button>}
          </div>
          {void isAr}
        </section>
      </div>
    </div>, document.body);
}

/* Session memory: intro seen per role (kept across visits when storage works), code verified per task (this session only). */
const seen = new Set<string>();
const verified = new Set<string>();
export const introSeen = (role: EvalRole) => { if (seen.has(role)) return true; try { return localStorage.getItem(`munafasat.onb.${role}`) === '1'; } catch { return false; } };
export const markIntroSeen = (role: EvalRole) => { seen.add(role); try { localStorage.setItem(`munafasat.onb.${role}`, '1'); } catch { /* storage unavailable */ } };
export const isVerified = (taskId: string) => verified.has(taskId);
export const markVerified = (taskId: string) => { verified.add(taskId); };
