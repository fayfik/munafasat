/* Offer documents per bidder (rendered in the evaluation workspace) and the AI reading of them.
   Prototype content: each bidder's technical offer is generated from a profile, certificates from the
   opening checklist, the financial offer only once prices are unsealed. AI insights cite blocks by id. */
import type { Bilingual, DocStatus, OfferFile, Opening, OpeningVendor, RfpDetail } from './types';
const DOC_ITEMS_IDS = ['tech-offer', 'fin-offer', 'bank', 'cr', 'zakat', 'gosi', 'chamber', 'saudization', 'sme', 'other'];

export type Block =
  | { id: string; kind: 'h'; text: string }
  | { id: string; kind: 'p'; text: string }
  | { id: string; kind: 'list'; items: string[] }
  | { id: string; kind: 'kv'; kv: [string, string][] }
  | { id: string; kind: 'table'; rows: string[][] };
export interface Page { title: string; blocks: Block[] }
export type DocGroup = 'technical' | 'certificates' | 'financial' | 'etimad';
export interface OfferDoc { id: string; group: DocGroup; en: string; ar: string; pages: Page[]; status?: DocStatus; sealed?: boolean; size: string; note?: Bilingual }
export interface Cite { doc: string; page: number; block: string; label: string }
export interface CritInsight { score: number; confidence: 'high' | 'medium' | 'low'; en: string; ar: string; cites: Cite[] }
export interface ReqFinding { en: string; ar: string; status: 'met' | 'partial' | 'gap'; cite?: Cite }
export interface IntelProject { name: string; nameAr: string; status: 'on-track' | 'at-risk' | 'delayed' | 'completed'; progress: number; value: number; end: string }
export interface VendorIntel {
  kind: 'existing' | 'new'; founded: number; employees: string; hq: string; presence: string[]; sectors: string[]; clients: string[]; certifications: string[];
  sidf?: { since: number; projects: number; onTime: number; rating: number; penalties: number; spend: number; active: IntelProject[]; lastNote: Bilingual };
  web?: { website: string; linkedin: { followers: string; employees: string; growth: string }; news: { title: string; date: string; source: string; tone: 'good' | 'neutral' | 'bad' }[]; sources: { label: string; url: string }[]; crawled: string };
}
export interface VendorInsight { match: number; en: string; ar: string; bestAt: Bilingual[]; watch: Bilingual[]; requirements: ReqFinding[]; criteria: Record<string, CritInsight> }

/* ── Bidder profiles (what each technical offer says) ── */
interface Profile {
  summary: string; method: string[]; phases: [string, string][]; cutover: string;
  lead: string; team: [string, string, string][]; certified: number; consultants: number; saudi: number;
  refs: [string, string, string, string][]; hypercare: string; sla: [string, string][]; arabic: string; ams: string;
  migration: string; training: string; risks: [string, string][];
  ai: { scores: number[]; conf: CritInsight['confidence'][]; why: Bilingual[]; match: number; summary: Bilingual; best: Bilingual[]; watch: Bilingual[]; req: ('met' | 'partial' | 'gap')[] };
}
const PROFILES: Record<string, Profile> = {
  v1: {
    summary: 'Najd Digital proposes a greenfield S/4HANA 2023 implementation using SAP Activate, delivered from Riyadh by a team that has completed three comparable public-sector programmes since 2022. The offer covers FI, CO, MM, FM and Embedded EWM, full ECC data migration with reconciliation, six training batches and a three-month hypercare.',
    method: ['SAP Activate with six quality gates signed off by the client', 'Fit-to-standard workshops per module in weeks 3–8', 'Clean-core principle: extensions on BTP only', 'Automated testing with Tricentis for regression'],
    phases: [['Prepare', '4 weeks'], ['Explore', '10 weeks'], ['Realize', '24 weeks'], ['Deploy', '6 weeks'], ['Run (hypercare)', '12 weeks']],
    cutover: 'Three mock cut-overs with reconciliation sign-off; go-live over a weekend with a 48-hour rollback window.',
    lead: 'Faisal Al-Dosari — PMP, 14 years, led two GOSI and MOF S/4HANA programmes',
    team: [['FI / CO', '4', 'All SAP certified'], ['MM / EWM', '4', '3 certified'], ['FM (public sector)', '2', 'Both certified'], ['Basis & BTP', '3', 'Certified'], ['Data migration', '3', 'SAP DMLT experience']],
    certified: 15, consultants: 16, saudi: 44,
    refs: [['Ministry of Finance', 'S/4HANA FI/FM conversion', '2024', 'Live'], ['GOSI', 'S/4HANA greenfield + EWM', '2023', 'Live'], ['Saudi Ports Authority', 'S/4HANA FI/MM', '2022', 'Live']],
    hypercare: '12 weeks on-site, 6 consultants', sla: [['P1', 'Response 1 h · resolve 4 h'], ['P2', 'Response 4 h · resolve 1 day'], ['P3', 'Response 1 day · resolve 5 days']], arabic: 'Arabic-speaking L1 and L2 from Riyadh', ams: 'Optional 24-month AMS at fixed monthly fee',
    migration: 'SAP Migration Cockpit with three reconciliation cycles; finance balances reconciled to the cent before sign-off.',
    training: 'Six batches (train-the-trainer + end users), bilingual material, LMS recordings.',
    risks: [['Key-user availability during Explore', 'Backfill plan agreed with HR'], ['FM budget structure redesign', 'Early design authority in week 2']],
    ai: { scores: [88, 84, 92, 78], conf: ['high', 'high', 'high', 'medium'],
      why: [
        { en: 'Full SAP Activate plan with six quality gates and three mock cut-overs — exceeds the request’s cut-over expectations.', ar: 'خطة SAP Activate كاملة مع ست بوابات جودة وثلاث تجارب انتقال — تتجاوز توقعات الطلب.' },
        { en: '15 of 16 consultants SAP-certified; 44% Saudi nationals, above the 30% target.', ar: '15 من 16 مستشاراً معتمدون؛ 44% سعوديون، أعلى من هدف 30%.' },
        { en: 'Three live Saudi public-sector S/4HANA programmes since 2022, two with FM — the closest match among bidders.', ar: 'ثلاثة مشاريع S/4HANA حكومية منذ 2022، اثنان منها مع إدارة الأموال — الأقرب بين الموردين.' },
        { en: 'P1 response in 1 hour with Arabic L2; AMS is optional and priced separately.', ar: 'استجابة الأولوية 1 خلال ساعة مع دعم عربي؛ خدمات التطبيقات اختيارية ومسعرة منفصلة.' },
      ],
      match: 92, summary: { en: 'Strongest fit for public-sector FM and migration. Best-documented cut-over of the three offers.', ar: 'الأنسب لإدارة الأموال الحكومية والترحيل. أفضل خطة انتقال موثقة بين العروض الثلاثة.' },
      best: [{ en: 'Public-sector FM references', ar: 'مراجع إدارة الأموال الحكومية' }, { en: 'Cut-over & data reconciliation', ar: 'الانتقال ومطابقة البيانات' }, { en: 'Saudization 44%', ar: 'السعودة 44%' }],
      watch: [{ en: 'AMS after hypercare is not included in the price', ar: 'خدمات التطبيقات بعد الدعم غير مشمولة في السعر' }],
      req: ['met', 'met', 'met', 'met', 'met', 'met', 'partial'] },
  },
  v2: {
    summary: 'Rawabi offers an S/4HANA 2023 greenfield using an agile variant of SAP Activate with two-week sprints, a nearshore delivery centre in Riyadh and AI-assisted testing. Scope covers FI, CO, MM, FM and Embedded EWM with data migration and hypercare.',
    method: ['Agile SAP Activate — 2-week sprints with demo every sprint', 'Fit-to-standard per process area', 'AI-assisted test generation (own accelerator)'],
    phases: [['Prepare', '3 weeks'], ['Explore', '8 weeks'], ['Realize', '26 weeks'], ['Deploy', '5 weeks'], ['Run (hypercare)', '12 weeks']],
    cutover: 'Two mock cut-overs; reconciliation reports for finance balances.',
    lead: 'Noura Al-Harbi — PMP, 11 years, led one S/4HANA public-sector programme',
    team: [['FI / CO', '3', '2 certified'], ['MM / EWM', '3', '2 certified'], ['FM (public sector)', '1', 'Certified'], ['Basis & BTP', '2', 'Certified'], ['Data migration', '2', '—']],
    certified: 9, consultants: 11, saudi: 36,
    refs: [['Saudi Customs (ZATCA)', 'S/4HANA FI', '2023', 'Live'], ['Private bank', 'S/4HANA FI/MM', '2022', 'Live']],
    hypercare: '12 weeks, 4 consultants (hybrid)', sla: [['P1', 'Response 2 h · resolve 8 h'], ['P2', 'Response 8 h · resolve 2 days'], ['P3', 'Response 2 days · resolve 10 days']], arabic: 'Arabic L1; L2 in English', ams: '12-month AMS included',
    migration: 'Migration Cockpit; two reconciliation cycles.',
    training: 'Six batches; English material with Arabic summaries.',
    risks: [['Single FM consultant', 'Partner backup from SAP'], ['Sprint cadence vs client availability', 'Fixed sprint calendar']],
    ai: { scores: [78, 70, 74, 72], conf: ['medium', 'high', 'medium', 'medium'],
      why: [
        { en: 'Agile Activate is well described but only two mock cut-overs — below the three the request expects for FM.', ar: 'المنهجية المرنة موصوفة جيداً لكن بتجربتي انتقال فقط — أقل من ثلاث متوقعة.' },
        { en: '9 of 11 consultants certified; a single FM consultant is a key-person risk.', ar: '9 من 11 معتمدون؛ مستشار واحد لإدارة الأموال يمثل مخاطرة.' },
        { en: 'One public-sector S/4HANA reference (ZATCA, FI only); no FM reference.', ar: 'مرجع حكومي واحد (هيئة الزكاة، المالية فقط)؛ لا مرجع لإدارة الأموال.' },
        { en: '12-month AMS included is a plus; P1 response 2 hours and L2 in English.', ar: 'تضمين 12 شهراً من خدمات التطبيقات ميزة؛ استجابة الأولوية 1 خلال ساعتين والمستوى الثاني بالإنجليزية.' },
      ],
      match: 74, summary: { en: 'Modern delivery and AMS included, but thin on public-sector FM and a smaller certified team.', ar: 'تسليم حديث مع خدمات تطبيقات مشمولة، لكن خبرة محدودة في إدارة الأموال الحكومية وفريق معتمد أصغر.' },
      best: [{ en: '12-month AMS included', ar: '12 شهراً خدمات تطبيقات مشمولة' }, { en: 'Agile delivery & AI-assisted testing', ar: 'تسليم مرن واختبار بالذكاء الاصطناعي' }],
      watch: [{ en: 'Single FM consultant (key-person risk)', ar: 'مستشار واحد لإدارة الأموال' }, { en: 'L2 support not in Arabic', ar: 'المستوى الثاني ليس بالعربية' }],
      req: ['met', 'partial', 'partial', 'met', 'partial', 'met', 'met'] },
  },
  v3: {
    summary: 'Khaleej proposes an S/4HANA implementation based on their template from earlier ECC projects, delivered by a mixed onshore/offshore team. The offer covers FI, MM and EWM; FM is described as an optional add-on.',
    method: ['Waterfall with SAP Activate terminology', 'Template-based design from previous ECC rollouts'],
    phases: [['Design', '12 weeks'], ['Build', '22 weeks'], ['Test', '8 weeks'], ['Go-live', '2 weeks'], ['Support', '8 weeks']],
    cutover: 'One rehearsal before go-live.',
    lead: 'Project manager to be named at contract signature',
    team: [['FI / CO', '2', '1 certified'], ['MM / EWM', '3', '1 certified'], ['FM (public sector)', '0', 'Optional add-on'], ['Basis', '1', 'Certified'], ['Data migration', '1', '—']],
    certified: 3, consultants: 7, saudi: 22,
    refs: [['Municipality (ECC 6.0)', 'ECC FI/MM', '2019', 'Live'], ['Retail group', 'S/4HANA MM', '2021', 'Live']],
    hypercare: '8 weeks, remote', sla: [['P1', 'Response 8 h'], ['P2', 'Response 2 days']], arabic: 'Arabic L1 only', ams: 'Not offered',
    migration: 'LSMW-based migration; reconciliation not described.',
    training: 'Four batches, English only.',
    risks: [['Project manager not named', '—'], ['FM out of base scope', '—']],
    ai: { scores: [60, 52, 58, 50], conf: ['high', 'high', 'medium', 'high'],
      why: [
        { en: 'Waterfall plan with a single rehearsal; reconciliation is not described.', ar: 'خطة تقليدية بتجربة واحدة؛ المطابقة غير موصوفة.' },
        { en: '3 of 7 consultants certified, no FM consultant, PM not named; Saudization 22% is below the 30% target.', ar: '3 من 7 معتمدون، لا مستشار لإدارة الأموال، ومدير المشروع غير مسمى؛ السعودة 22% أقل من 30%.' },
        { en: 'No S/4HANA public-sector reference; latest public work is ECC (2019).', ar: 'لا مرجع S/4HANA حكومي؛ آخر عمل حكومي على ECC عام 2019.' },
        { en: '8-week remote hypercare and P1 response 8 hours — below the 3-month hypercare in scope.', ar: 'دعم عن بعد 8 أسابيع واستجابة 8 ساعات — أقل من 3 أشهر المطلوبة.' },
      ],
      match: 41, summary: { en: 'Does not cover FM in base scope and misses hypercare and Saudization requirements.', ar: 'لا يغطي إدارة الأموال في النطاق الأساسي ولا يحقق متطلبات الدعم والسعودة.' },
      best: [{ en: 'Retail S/4HANA MM experience', ar: 'خبرة S/4HANA في المشتريات للتجزئة' }],
      watch: [{ en: 'FM only as an optional add-on', ar: 'إدارة الأموال إضافة اختيارية' }, { en: 'Hypercare 8 weeks vs 3 months', ar: 'دعم 8 أسابيع مقابل 3 أشهر' }, { en: 'Project manager not named', ar: 'مدير المشروع غير مسمى' }],
      req: ['partial', 'gap', 'gap', 'gap', 'partial', 'gap', 'gap'] },
  },
};
const GENERIC = (v: OpeningVendor): Profile => ({
  ...PROFILES.v2, summary: `${v.name} submitted a technical offer for the scope in the request. The document was entered manually, so only its cover sheet is available here.`,
  ai: { ...PROFILES.v2.ai, scores: [70, 70, 70, 70], conf: ['low', 'low', 'low', 'low'], match: 60, summary: { en: 'Entered manually — AI read only the cover sheet. Review the full offer before scoring.', ar: 'أُدخل يدوياً — قرأ الذكاء الاصطناعي صفحة الغلاف فقط.' }, best: [], watch: [{ en: 'Low confidence: limited document', ar: 'ثقة منخفضة: مستند محدود' }] },
});
const prof = (v: OpeningVendor) => PROFILES[v.id] ?? GENERIC(v);

/** What the request asks for (from scope, technical requirements and the evaluation criteria). */
export const REQUIREMENTS: Bilingual[] = [
  { en: 'SAP Activate with cut-over rehearsals', ar: 'SAP Activate مع تجارب انتقال' },
  { en: 'Public-sector FM (Funds Management) experience', ar: 'خبرة إدارة الأموال الحكومية' },
  { en: 'Certified consultants for every module', ar: 'مستشارون معتمدون لكل وحدة' },
  { en: 'Saudization ≥ 30% on the project team', ar: 'سعودة ≥ 30% في فريق المشروع' },
  { en: 'Arabic-speaking L2 support', ar: 'دعم المستوى الثاني بالعربية' },
  { en: '3 months hypercare, P1 response ≤ 2 h', ar: 'دعم 3 أشهر واستجابة ≤ ساعتين' },
  { en: 'ECC data migration with reconciliation', ar: 'ترحيل بيانات ECC مع المطابقة' },
];

/* ── Documents ── */
const T = 'tech';
function techOffer(v: OpeningVendor): OfferDoc {
  const p = prof(v);
  return {
    id: T, group: 'technical', en: 'Technical offer', ar: 'العرض الفني', size: `${(2.1 + v.name.length / 20).toFixed(1)} MB`,
    pages: [
      { title: '1 · Executive summary', blocks: [
        { id: 'sum-h', kind: 'h', text: `${v.name} — Technical proposal` },
        { id: 'sum-1', kind: 'p', text: p.summary },
        { id: 'sum-kv', kind: 'kv', kv: [['Bidder', v.name], ['Commercial register', v.cr], ['Proposal validity', `${v.validityDays ?? 90} days`], ['Delivery location', 'Riyadh']] },
      ] },
      { title: '2 · Methodology & plan', blocks: [
        { id: 'meth-h', kind: 'h', text: 'Implementation approach' },
        { id: 'meth-1', kind: 'list', items: p.method },
        { id: 'meth-2', kind: 'table', rows: [['Phase', 'Duration'], ...p.phases] },
        { id: 'meth-3', kind: 'h', text: 'Cut-over strategy' },
        { id: 'meth-4', kind: 'p', text: p.cutover },
        { id: 'meth-5', kind: 'h', text: 'Data migration' },
        { id: 'meth-6', kind: 'p', text: p.migration },
      ] },
      { title: '3 · Team', blocks: [
        { id: 'team-h', kind: 'h', text: 'Project organisation' },
        { id: 'team-1', kind: 'kv', kv: [['Project manager', p.lead], ['Consultants', String(p.consultants)], ['SAP certified', `${p.certified} of ${p.consultants}`], ['Saudi nationals', `${p.saudi}%`]] },
        { id: 'team-2', kind: 'table', rows: [['Area', 'Consultants', 'Certification'], ...p.team] },
      ] },
      { title: '4 · Experience', blocks: [
        { id: 'exp-h', kind: 'h', text: 'Comparable projects (last 5 years)' },
        { id: 'exp-1', kind: 'table', rows: [['Client', 'Scope', 'Year', 'Status'], ...p.refs] },
      ] },
      { title: '5 · Support, training & risks', blocks: [
        { id: 'sup-h', kind: 'h', text: 'Hypercare and support' },
        { id: 'sup-1', kind: 'kv', kv: [['Hypercare', p.hypercare], ['Language', p.arabic], ['AMS', p.ams]] },
        { id: 'sup-2', kind: 'table', rows: [['Priority', 'Service level'], ...p.sla] },
        { id: 'sup-3', kind: 'h', text: 'Training' },
        { id: 'sup-4', kind: 'p', text: p.training },
        { id: 'sup-5', kind: 'table', rows: [['Risk', 'Mitigation'], ...p.risks] },
      ] },
    ],
  };
}
const CERTS: { id: string; doc: string; en: string; ar: string; issuer: string; months: number }[] = [
  { id: 'cr', doc: 'cr', en: 'Commercial register', ar: 'السجل التجاري', issuer: 'Ministry of Commerce', months: 14 },
  { id: 'zakat', doc: 'zakat', en: 'Zakat certificate', ar: 'شهادة الزكاة', issuer: 'ZATCA', months: 5 },
  { id: 'gosi', doc: 'gosi', en: 'GOSI certificate', ar: 'شهادة التأمينات', issuer: 'GOSI', months: 3 },
  { id: 'saudization', doc: 'saudization', en: 'Saudization (Nitaqat)', ar: 'شهادة السعودة (نطاقات)', issuer: 'HRSD', months: 7 },
  { id: 'chamber', doc: 'chamber', en: 'Chamber of Commerce', ar: 'الغرفة التجارية', issuer: 'Riyadh Chamber', months: 9 },
  { id: 'bank', doc: 'bank', en: 'Bid bond', ar: 'الضمان الابتدائي', issuer: 'Saudi National Bank', months: 4 },
];
const addMonths = (m: number) => { const d = new Date(); d.setMonth(d.getMonth() + m); return d.toISOString().slice(0, 10); };
function certDoc(v: OpeningVendor, c: (typeof CERTS)[number]): OfferDoc {
  const file = v.files?.find((f) => f.item === c.doc);
  const st = v.docs[c.doc] ?? (v.files ? (file ? file.status ?? 'valid' : 'missing') : TRUTH[v.id]?.[c.doc] ?? 'valid');
  const expiry = st === 'expired' ? addMonths(-1) : addMonths(c.months);
  return {
    id: `c-${c.id}`, group: 'certificates', en: c.en, ar: c.ar, status: st ?? 'missing', size: st === 'missing' ? '—' : '240 KB',
    pages: st === 'missing' ? [] : [{ title: c.en, blocks: [
      { id: 'c-h', kind: 'h', text: c.en },
      { id: 'c-kv', kind: 'kv', kv: [['Issued to', v.name], ['CR number', v.cr], ['Issuer', c.issuer], ['Certificate no.', `${c.id.toUpperCase()}-${v.cr.slice(-5)}`], ['Expiry date', expiry], ...(c.id === 'bank' ? [['Amount', '2% of offer value'] as [string, string]] : [])] },
      { id: 'c-p', kind: 'p', text: st === 'expired' ? 'This certificate has expired. A renewed copy was not attached to the offer.' : 'Verified against the issuer’s registry at bid opening.' },
    ] }],
  };
}
function finOffer(v: OpeningVendor, sealed: boolean): OfferDoc {
  const pr = v.price ?? 0;
  const lines: [string, number][] = [['Licences (S/4HANA, 3 years)', 0.28], ['Implementation services', 0.46], ['Data migration', 0.08], ['Training (6 batches)', 0.04], ['Hypercare', 0.06], ['Infrastructure & BTP', 0.08]];
  return {
    id: 'fin', group: 'financial', en: 'Financial offer', ar: 'العرض المالي', sealed, size: '610 KB',
    pages: sealed ? [] : [{ title: 'Price schedule', blocks: [
      { id: 'f-h', kind: 'h', text: 'Price schedule (SAR, excl. VAT)' },
      { id: 'f-t', kind: 'table', rows: [['Item', 'Amount'], ...lines.map(([k, f]) => [k, Math.round(pr * f).toLocaleString('en-US')]), ['Total', pr.toLocaleString('en-US')]] },
      { id: 'f-p', kind: 'p', text: 'Prices are fixed for the contract duration. Payment against milestones as per the request.' },
    ] }],
  };
}
function etimadDoc(o: Opening): OfferDoc {
  return { id: 'etimad', group: 'etimad', en: 'Etimad opening report', ar: 'تقرير الفتح من اعتماد', size: '180 KB', pages: [{ title: 'Opening report', blocks: [
    { id: 'e-h', kind: 'h', text: 'Etimad — bid opening report' },
    { id: 'e-t', kind: 'table', rows: [['#', 'Bidder', 'CR'], ...o.vendors.map((v, i) => [String(i + 1), v.name, v.cr])] },
  ] }] };
}
export function offerDocs(v: OpeningVendor, o: Opening): OfferDoc[] {
  return [techOffer(v), ...CERTS.map((c) => certDoc(v, c)), finOffer(v, !o.financial?.momAt), etimadDoc(o)];
}

/* ── AI reading ── */
const CRIT_CITES: Cite[][] = [
  [{ doc: T, page: 1, block: 'meth-1', label: 'Methodology' }, { doc: T, page: 1, block: 'meth-4', label: 'Cut-over' }],
  [{ doc: T, page: 2, block: 'team-1', label: 'Team summary' }, { doc: T, page: 2, block: 'team-2', label: 'Certifications' }],
  [{ doc: T, page: 3, block: 'exp-1', label: 'References' }],
  [{ doc: T, page: 4, block: 'sup-1', label: 'Hypercare' }, { doc: T, page: 4, block: 'sup-2', label: 'SLA' }],
];
const REQ_CITES: Cite[] = [
  { doc: T, page: 1, block: 'meth-4', label: 'Cut-over' }, { doc: T, page: 3, block: 'exp-1', label: 'References' }, { doc: T, page: 2, block: 'team-2', label: 'Certifications' },
  { doc: T, page: 2, block: 'team-1', label: 'Team' }, { doc: T, page: 4, block: 'sup-1', label: 'Support' }, { doc: T, page: 4, block: 'sup-2', label: 'SLA' }, { doc: T, page: 1, block: 'meth-6', label: 'Migration' },
];
export function vendorInsight(v: OpeningVendor, r?: RfpDetail): VendorInsight {
  const p = prof(v); const n = (r?.evaluation ?? []).length || 4;
  const criteria: Record<string, CritInsight> = {};
  for (let i = 0; i < n; i++) criteria[String(i)] = { score: p.ai.scores[i % 4], confidence: p.ai.conf[i % 4], en: p.ai.why[i % 4].en, ar: p.ai.why[i % 4].ar, cites: CRIT_CITES[i % 4] };
  return { match: p.ai.match, en: p.ai.summary.en, ar: p.ai.summary.ar, bestAt: p.ai.best, watch: p.ai.watch,
    requirements: REQUIREMENTS.map((q, i) => ({ ...q, status: p.ai.req[i], cite: REQ_CITES[i] })), criteria };
}
/** AI estimate of the weighted technical score — used to place a bidder among the others. */
export function aiWeighted(v: OpeningVendor, r?: RfpDetail) {
  const cs = r?.evaluation ?? []; const ins = vendorInsight(v, r); const w = cs.reduce((a, c) => a + c.weight, 0) || 1;
  return Math.round(cs.reduce((a, c, i) => a + ins.criteria[String(i)].score * c.weight, 0) / w);
}
/** Legal reading: expiry dates found in the certificates. */
export function legalInsight(v: OpeningVendor, o: Opening) {
  return offerDocs(v, o).filter((d) => d.group === 'certificates').map((d) => {
    const exp = d.pages[0]?.blocks.find((b) => b.kind === 'kv') as Extract<Block, { kind: 'kv' }> | undefined;
    const date = exp?.kv.find(([k]) => k === 'Expiry date')?.[1];
    return { doc: d, date, status: d.status ?? 'missing', cite: d.pages.length ? { doc: d.id, page: 0, block: 'c-kv', label: d.en } as Cite : undefined };
  });
}

/* ── Vendor intelligence (sample data; fictional companies) ── */
const INTEL: Record<string, VendorIntel> = {
  v1: { kind: 'existing', founded: 2004, employees: '1,200+', hq: 'Riyadh', presence: ['Riyadh (HQ)', 'Jeddah', 'Dammam', 'NEOM site office'], sectors: ['Government', 'Banking', 'Energy'],
    clients: ['Ministry of Finance', 'GOSI', 'Saudi Ports Authority', 'Riyad Bank', 'SEC', 'NHC'], certifications: ['SAP Gold Partner', 'ISO 27001', 'ISO 9001', 'CST cloud licence'],
    sidf: { since: 2015, projects: 12, onTime: 10, rating: 4.4, penalties: 1, spend: 48_600_000, lastNote: { en: 'Strong delivery on the 2024 loan-origination release; one late milestone on data warehouse (vendor-side resourcing).', ar: 'تسليم قوي لإصدار نظام القروض 2024؛ تأخر مرحلة واحدة في مستودع البيانات.' },
      active: [
        { name: 'Loan origination portal — phase 3', nameAr: 'بوابة إصدار القروض — المرحلة 3', status: 'on-track', progress: 72, value: 6_400_000, end: '2027-03' },
        { name: 'Enterprise data warehouse modernisation', nameAr: 'تحديث مستودع البيانات المؤسسي', status: 'at-risk', progress: 45, value: 4_150_000, end: '2026-12' },
      ] } },
  v2: { kind: 'existing', founded: 2016, employees: '350', hq: 'Riyadh', presence: ['Riyadh (HQ)', 'Al Khobar'], sectors: ['Government', 'Fintech'],
    clients: ['ZATCA', 'Monsha’at', 'A private bank', 'Tadawul Group'], certifications: ['SAP Silver Partner', 'ISO 27001'],
    sidf: { since: 2021, projects: 3, onTime: 3, rating: 4.1, penalties: 0, spend: 7_900_000, lastNote: { en: 'Delivered all three projects on time; small team stretched during the 2025 peak.', ar: 'سلّم المشاريع الثلاثة في موعدها؛ الفريق صغير وتأثر في ذروة 2025.' },
      active: [{ name: 'AI-assisted customer onboarding', nameAr: 'تهيئة العملاء بمساعدة الذكاء الاصطناعي', status: 'on-track', progress: 60, value: 2_300_000, end: '2027-01' }] } },
  v3: { kind: 'new', founded: 1998, employees: '800', hq: 'Jeddah', presence: ['Jeddah (HQ)', 'Riyadh branch', 'Cairo delivery centre'], sectors: ['Municipal', 'Retail', 'Healthcare'],
    clients: ['A municipality (ECC support)', 'Regional retail group', 'Private hospital group'], certifications: ['SAP Partner', 'ISO 9001'],
    web: { website: 'khaleej-is.example', linkedin: { followers: '14.2K', employees: '780 on LinkedIn', growth: '−6% headcount, 12 months' },
      news: [
        { title: 'Renews ECC support contract with a municipality for 3 years', date: '2025-09', source: 'Company news', tone: 'good' },
        { title: 'Opens nearshore delivery centre in Cairo', date: '2024-11', source: 'Regional press', tone: 'neutral' },
        { title: 'Reported delays on a retail S/4HANA rollout', date: '2024-05', source: 'Industry blog', tone: 'bad' },
      ],
      sources: [{ label: 'Company website', url: 'https://khaleej-is.example' }, { label: 'LinkedIn company page', url: 'https://linkedin.example/company/khaleej-is' }, { label: 'Ministry of Commerce CR lookup', url: 'https://mc.example/cr/1010074863' }],
      crawled: '2 hours ago' } },
};
export const vendorIntel = (v: OpeningVendor): VendorIntel => INTEL[v.id] ?? { kind: 'new', founded: 2010, employees: '—', hq: '—', presence: [], sectors: [], clients: [], certifications: [],
  web: { website: '—', linkedin: { followers: '—', employees: '—', growth: '—' }, news: [], sources: [], crawled: 'just now' } };

/* ── What each bidder actually submitted (truth the AI reads) ── */
type Truth = Record<string, DocStatus>;
const TRUTH: Record<string, Truth> = {
  v1: { 'tech-offer': 'valid', 'fin-offer': 'valid', bank: 'valid', cr: 'valid', zakat: 'valid', gosi: 'valid', chamber: 'valid', saudization: 'valid', sme: 'missing', other: 'valid' },
  v2: { 'tech-offer': 'valid', 'fin-offer': 'valid', bank: 'valid', cr: 'valid', zakat: 'valid', gosi: 'valid', chamber: 'valid', saudization: 'valid', sme: 'valid', other: 'missing' },
  v3: { 'tech-offer': 'valid', 'fin-offer': 'valid', bank: 'valid', cr: 'valid', zakat: 'expired', gosi: 'valid', chamber: 'valid', saudization: 'valid', sme: 'missing', other: 'missing' },
};
export const truthOf = (v: OpeningVendor, item: string): DocStatus => v.docs[item] ?? TRUTH[v.id]?.[item] ?? 'valid';
const FILE_NAMES: Record<string, (short: string) => string> = {
  'tech-offer': (s) => `${s}_Technical_Proposal_v3.pdf`, 'fin-offer': (s) => `${s}_Financial_Offer_SEALED.pdf`, bank: (s) => `${s}_Bid_Bond.pdf`,
  cr: (s) => `${s}_CR_Certificate.pdf`, zakat: () => 'Zakat_Certificate_1447.pdf', gosi: () => 'GOSI_Certificate.pdf', chamber: () => 'Chamber_Membership.pdf',
  saudization: () => 'Nitaqat_Certificate.pdf', sme: () => 'Monshaat_SME_Certificate.pdf', other: (s) => `${s}_Company_Profile.pdf`,
};
/** Files in a bidder's package. One scan is deliberately ambiguous so the AI asks for a review. */
export function offerFiles(v: OpeningVendor): OfferFile[] {
  const short = v.name.split(' ')[0];
  const truth = TRUTH[v.id] ?? Object.fromEntries(DOC_ITEMS_IDS.map((i) => [i, i === 'sme' || i === 'other' ? 'missing' : 'valid'])) as Truth;
  const out: OfferFile[] = [];
  for (const id of DOC_ITEMS_IDS) {
    const st = truth[id]; if (st === 'missing') continue;
    const cert = CERTS.find((c) => c.doc === id);
    const lowConf = v.id === 'v2' && id === 'gosi';
    out.push({ id: `${v.id}-${id}`, name: lowConf ? 'scan_0043.pdf' : FILE_NAMES[id](short), size: id === 'tech-offer' ? '2.7 MB' : id === 'fin-offer' ? '610 KB' : '240 KB', item: id,
      conf: lowConf ? 0.64 : 0.9 + ((v.name.length + id.length) % 9) / 100, status: st, expiry: cert ? (st === 'expired' ? addMonths(-1) : addMonths(cert.months)) : undefined });
  }
  if (v.id === 'v1') out.push({ id: 'v1-x', name: 'Najd_Cover_Letter.pdf', size: '90 KB', item: 'other', conf: 0.88, status: 'valid' });
  return out;
}
/** Apply the AI classification to a bidder: confident results set the checklist; low-confidence ones wait for a person (unless confirm). */
export function classified(v: OpeningVendor, confirm = true): OpeningVendor {
  const files = offerFiles(v).map((f) => ({ ...f, confirmed: confirm || f.conf >= 0.8 }));
  const docs: Record<string, DocStatus> = {};
  for (const id of DOC_ITEMS_IDS) {
    const f = files.find((x) => x.item === id);
    if (!f) docs[id] = 'missing';
    else if (f.confirmed) docs[id] = f.status ?? 'valid';
  }
  for (const id of ['sme', 'other']) if (docs[id] === 'missing') delete docs[id];
  return { ...v, files, docs };
}
