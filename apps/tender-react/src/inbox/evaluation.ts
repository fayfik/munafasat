/* Epic F · Bid evaluation — rules shared by the BEC screens and the task gates.
   Every BEC member works vendor by vendor: OTP → evaluation page → e-sign → next vendor. */
import type { Bilingual, CommitteeSeat, EvalRole, Evaluation, Opening, OpeningVendor, Person, RfpDetail, Signature, Task, VendorSheet } from './types';

const person = (id: string, name: string, nameAr: string, role: string, roleAr: string, dept: string, deptAr: string): Person =>
  ({ id, name, nameAr, role, roleAr, dept, deptAr });

/** Bid Evaluation Committee — annual roster; the Technical member is nominated per case. */
export const BEC_ROSTER: { role: CommitteeSeat['role']; person: Person }[] = [
  { role: 'chairman', person: person('u-khalidz', 'Khalid Al-Zahrani', 'خالد الزهراني', 'Bid Evaluation Committee Chairman', 'رئيس لجنة فحص العروض', 'Procurement', 'المشتريات') },
  { role: 'legal', person: person('u-reem', 'Reem Al-Saleh', 'ريم الصالح', 'Legal member', 'العضو القانوني', 'Legal', 'الشؤون القانونية') },
  { role: 'finance', person: person('u-abdulrahman', 'Abdulrahman Al-Qahtani', 'عبدالرحمن القحطاني', 'Finance member', 'العضو المالي', 'Finance', 'المالية') },
  { role: 'procurement', person: person('u-yasser', 'Yasser Al-Ghamdi', 'ياسر الغامدي', 'Procurement member', 'عضو المشتريات', 'Procurement', 'المشتريات') },
  { role: 'technical', person: person('u-sara', 'Sara Al-Zahrani', 'سارة الزهراني', 'Technical member', 'العضو الفني', 'IT & Digital', 'تقنية المعلومات والتحول الرقمي') },
];
/** Signs the technical report (the Technical member's manager). */
export const TECH_MANAGER = person('u-ahmedm', 'Ahmed Al-Mansour', 'أحمد المنصور', 'Director, IT & Digital', 'مدير تقنية المعلومات والتحول الرقمي', 'IT & Digital', 'تقنية المعلومات والتحول الرقمي');
export const becSeats = (): CommitteeSeat[] => BEC_ROSTER.map((s) => ({ role: s.role, person: s.person, attending: true }));
export const becPerson = (role: CommitteeSeat['role']) => BEC_ROSTER.find((s) => s.role === role)!.person;

export const ROLE_LABEL: Record<EvalRole, Bilingual> = {
  legal: { en: 'Legal member', ar: 'العضو القانوني' },
  technical: { en: 'Technical member', ar: 'العضو الفني' },
  finance: { en: 'Finance member', ar: 'العضو المالي' },
};
export const BEC: Bilingual = { en: 'Bid Evaluation Committee', ar: 'لجنة فحص العروض' };

/* ── Legal (F1) ── */
export const LEGAL_CHECKS: { id: string; doc: string; en: string; ar: string }[] = [
  { id: 'cr', doc: 'cr', en: 'Commercial register', ar: 'السجل التجاري' },
  { id: 'zakat', doc: 'zakat', en: 'Zakat certificate', ar: 'شهادة الزكاة' },
  { id: 'gosi', doc: 'gosi', en: 'GOSI certificate', ar: 'شهادة التأمينات' },
  { id: 'saudization', doc: 'saudization', en: 'Saudization certificate', ar: 'شهادة السعودة' },
  { id: 'bond', doc: 'bank', en: 'Bid bond', ar: 'الضمان الابتدائي' },
];
export const LEGAL_REASONS: { code: string; en: string; ar: string }[] = [
  { code: 'L-01', en: 'Bid bond missing or below 1–2%', ar: 'الضمان الابتدائي غير مرفق أو أقل من النسبة' },
  { code: 'L-02', en: 'Expired mandatory certificate', ar: 'شهادة إلزامية منتهية' },
  { code: 'L-03', en: 'Offer validity shorter than required', ar: 'مدة سريان العرض أقل من المطلوب' },
  { code: 'L-04', en: 'Offer not signed or stamped', ar: 'العرض غير موقع أو غير مختوم' },
  { code: 'L-05', en: 'Conflicts with tender conditions', ar: 'مخالفة لشروط المنافسة' },
];

/* ── Finance (F4) ── */
export const VARIANCE_FLAG = 0.2;           // ±20% vs estimate → abnormally low / high
export const PREF_SOURCES: Bilingual[] = [
  { en: 'LCGPA certificate', ar: 'شهادة هيئة المحتوى المحلي' },
  { en: 'Monsha’at SME certificate', ar: 'شهادة منشآت' },
  { en: 'Vendor declaration', ar: 'إقرار المورد' },
];

/* ── Shared ── */
export const emptyEval = (): Evaluation => ({ sheets: {} });
export const sheetOf = (o: Opening | undefined, role: EvalRole, vid: string): VendorSheet => o?.eval?.sheets[role]?.[vid] ?? {};
export const signed = (s?: VendorSheet) => !!s?.sig;
export const riyadh = (iso: string, isAr = false) => new Date(iso).toLocaleString(isAr ? 'ar-SA-u-ca-gregory' : 'en-GB', { timeZone: 'Asia/Riyadh', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

export const techCriteria = (r?: RfpDetail) => (r?.evaluation ?? []).map((c, i) => ({ key: String(i), en: c.criterionEn, ar: c.criterionAr, weight: c.weight, descEn: c.descEn, descAr: c.descAr }));
export const techPassing = (r?: RfpDetail) => r?.techPassing ?? 70;
/** Weighted technical score 0–100. */
export function techTotal(s: VendorSheet, r?: RfpDetail) {
  const cs = techCriteria(r); const w = cs.reduce((a, c) => a + c.weight, 0) || 1;
  return Math.round((cs.reduce((a, c) => a + (s.scores?.[c.key]?.score ?? 0) * c.weight, 0) / w) * 10) / 10;
}
/** Scores outside 60–90 need a justification. */
export const needsWhy = (score?: number) => score != null && (score < 60 || score >= 90);

/** Who each role evaluates. Two envelopes: Technical sees every bidder; Legal and Finance only technically passing; Finance only legally compliant. */
export function evalVendors(o: Opening | undefined, role: EvalRole): OpeningVendor[] {
  const vs = o?.vendors ?? [];
  if (role === 'technical') return vs;
  const pass = vs.filter((v) => v.techPass);
  if (role === 'legal') return pass;
  return pass.filter((v) => sheetOf(o, 'legal', v.id).compliant !== false);
}

export function sheetMissing(role: EvalRole, s: VendorSheet, r: RfpDetail | undefined, v: OpeningVendor, estimate?: number): Bilingual[] {
  const m: Bilingual[] = [];
  if (role === 'technical') {
    const cs = techCriteria(r);
    if (!cs.every((c) => s.scores?.[c.key]?.score != null)) m.push({ en: 'Score every criterion', ar: 'قيّم كل معيار' });
    if (cs.some((c) => needsWhy(s.scores?.[c.key]?.score) && !s.scores?.[c.key]?.why?.trim())) m.push({ en: 'Justify scores below 60 or 90 and above', ar: 'برّر الدرجات أقل من 60 أو 90 فأعلى' });
  } else if (role === 'legal') {
    if (!LEGAL_CHECKS.every((c) => s.checks?.[c.id])) m.push({ en: 'Check every document', ar: 'تحقق من كل مستند' });
    if (s.compliant == null) m.push({ en: 'Mark the offer compliant or not', ar: 'حدد مطابقة العرض' });
    if (s.compliant === false && !s.reasonCode) m.push({ en: 'Choose a reason code', ar: 'اختر رمز السبب' });
  } else {
    if (!((s.evalPrice ?? v.price ?? 0) > 0)) m.push({ en: 'Enter the evaluated price', ar: 'أدخل السعر المقيّم' });
    if ((s.localContent ?? 0) > 0 && !s.lcSource) m.push({ en: 'Give the local content source', ar: 'حدد مصدر المحتوى المحلي' });
    if (s.sme && !s.smeSource) m.push({ en: 'Give the SME source', ar: 'حدد مصدر المنشأة الصغيرة' });
    if (isFlagged(s.evalPrice ?? v.price, estimate) && !s.flagNote?.trim()) m.push({ en: 'Comment on the flagged price', ar: 'علّق على السعر المؤشر' });
  }
  return m;
}

export const variance = (price?: number, estimate?: number) => (price && estimate ? (price - estimate) / estimate : undefined);
export const isFlagged = (price?: number, estimate?: number) => { const x = variance(price, estimate); return x != null && Math.abs(x) > VARIANCE_FLAG; };
/** Price preference: local content up to 10% (LC% × 10%), SME 10%; capped at 20%. */
export const prefPct = (s: VendorSheet) => Math.min(0.2, ((s.localContent ?? 0) / 100) * 0.1 + (s.sme ? 0.1 : 0));
export const adjusted = (s: VendorSheet, v: OpeningVendor) => Math.round((s.evalPrice ?? v.price ?? 0) * (1 - prefPct(s)));

/** Ranking from signed finance sheets (computed once every sheet is signed); a manual override reorders it. */
export function ranking(o: Opening | undefined) {
  const vs = evalVendors(o, 'finance');
  const rows = vs.map((v) => ({ v, s: sheetOf(o, 'finance', v.id) })).map((x) => ({ ...x, adj: adjusted(x.s, x.v) }));
  const ready = rows.length > 0 && rows.every((x) => signed(x.s));
  const auto = [...rows].sort((a, b) => a.adj - b.adj);
  const ov = o?.eval?.rankOverride;
  const ordered = ov ? ov.order.map((id) => rows.find((x) => x.v.id === id)).filter(Boolean) as typeof rows : auto;
  return { ready, auto, ordered, overridden: !!ov && ov.order.join() !== auto.map((x) => x.v.id).join() };
}

export const roleOfStep = (c?: Task['committee']): EvalRole | undefined => (c === 'tech-eval' ? 'technical' : c === 'legal-eval' ? 'legal' : c === 'fin-rank' ? 'finance' : undefined);

/** Gates for the BEC steps. */
export function evalNeeds(task: Task, need: (ok: boolean, en: string, ar: string) => void) {
  const o = task.rfp?.opening; const r = task.rfp;
  const role = roleOfStep(task.committee);
  if (role) {
    const vs = evalVendors(o, role);
    const n = vs.filter((v) => signed(sheetOf(o, role, v.id))).length;
    need(vs.length > 0 && n === vs.length, `Sign every vendor (${n} of ${vs.length} signed)`, `وقّع لكل مورد (${n} من ${vs.length})`);
    if (role === 'finance') { const rk = ranking(o); if (rk.overridden) need(!!o?.eval?.rankOverride?.reason.trim(), 'Give a reason for changing the ranking', 'اذكر سبب تعديل الترتيب'); }
    return;
  }
  if (task.committee === 'tech-report') {
    const vs = evalVendors(o, 'technical');
    need(vs.length > 0 && vs.every((v) => signed(sheetOf(o, 'technical', v.id))), 'Every vendor sheet is signed by the Technical member', 'كل أوراق التقييم موقعة من العضو الفني');
  }
  if (task.committee === 'proc-verify') {
    const vs = o?.vendors ?? [];
    need(vs.every((v) => verifyRow(o, r, v).ok), 'Every step complete for every vendor', 'اكتمال كل الخطوات لكل مورد');
    need(vs.every((v) => o?.eval?.verified?.[v.id]), 'Tick every vendor as verified', 'أكّد التحقق من كل مورد');
  }
  if (task.committee === 'bec-select') {
    need(!!o?.eval?.selection?.vendor, 'Select the vendor', 'اختر المورد');
    need(!!o?.eval?.selection?.reason?.trim(), 'Give the selection reason', 'اذكر سبب الاختيار');
  }
}

/** F3: what each step produced for one vendor. */
export function verifyRow(o: Opening | undefined, r: RfpDetail | undefined, v: OpeningVendor) {
  const tech = sheetOf(o, 'technical', v.id), legal = sheetOf(o, 'legal', v.id), fin = sheetOf(o, 'finance', v.id);
  const score = techTotal(tech, r); const pass = score >= techPassing(r);
  const inLegal = evalVendors(o, 'legal').some((x) => x.id === v.id);
  const inFin = evalVendors(o, 'finance').some((x) => x.id === v.id);
  const rk = ranking(o).ordered.findIndex((x) => x.v.id === v.id);
  const items = [
    { key: 'technical' as const, ok: signed(tech), applies: true },
    { key: 'legal' as const, ok: !inLegal || signed(legal), applies: inLegal },
    { key: 'finance' as const, ok: !inFin || signed(fin), applies: inFin },
  ];
  return { tech, legal, fin, score, pass, rank: rk >= 0 ? rk + 1 : undefined, items, ok: items.every((i) => i.ok) };
}

export const sign = (by: Person, role: Bilingual): Signature => ({ by, role, committee: BEC, at: new Date().toISOString() });
export const fmtPct = (x?: number) => (x == null ? '—' : `${x > 0 ? '+' : ''}${(x * 100).toFixed(1)}%`);
