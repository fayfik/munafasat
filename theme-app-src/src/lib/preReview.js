// AI pre-review: predicts what each reviewer would flag before the request is
// submitted, and proposes a fix the requester can apply. Rules adapted from the
// design-review build (Kz). severity: return (likely returned) · improve · tip.
import { words, MIN_WORDS, totals, num, stdQuestions, inEaScope, uid } from './requestRules.js';
import { suggestAccounting, mgOf } from './accounting.js';
import { PROJECTS } from '../data/newRequest.js';

export const REVIEWERS = {
  manager: { en: 'Line manager', short: 'Manager', check: 'Purpose, dates and supporting quotes' },
  finance: { en: 'Finance', short: 'Finance', check: 'Payment schedule, prices and material groups' },
  ea: { en: 'Enterprise Architecture', short: 'EA', check: 'Scope clarity and technical requirements' },
  cyber: { en: 'Cybersecurity', short: 'Cyber', check: 'Security testing, data protection and confidentiality' },
  risk: { en: 'Operational risk', short: 'Risk', check: 'Continuity, service levels and exit' },
  procurement: { en: 'Procurement', short: 'Procurement', check: 'Evaluation, committee and Etimad readiness' },
  finqual: { en: 'Finance qualification', short: 'Finance qual.', check: 'Qualification committee and ranges' },
};
export const SEVERITY = { return: 'Likely returned', improve: 'Improve', tip: 'Tip' };

const hasReq = (reqs, re) => reqs.some((r) => re.test(`${r.requirement} ${r.description}`));
const answer = (f, id) => { const q = stdQuestions(f).find((x) => x.id === id); return q ? (q.value ?? q.guess?.yes) : undefined; };

export function preReview(f) {
  if (f.sourceType === 'emarket') return emarketReview(f);
  const out = [];
  const p = PROJECTS.find((x) => x.id === f.projectId);
  const t = totals(f);
  const lines = f.boqItems.filter((r) => (r.itemName || '').trim());
  const names = lines.map((r) => r.itemName).slice(0, 4);
  const reqs = f.technicalRequirements.filter((r) => (r.requirement || '').trim());
  const tech = inEaScope(f);

  // Finance
  if (!f.paymentStages.length || t.payPct !== 100) {
    const rows = [
      { stageName: 'Contract signing & mobilisation', itemsDeliverables: 'Signed contract, project plan, kickoff minutes', percentage: 15 },
      { stageName: 'Delivery & implementation', itemsDeliverables: names.join(', ') || 'Configured solution', percentage: 55 },
      { stageName: 'Final acceptance & handover', itemsDeliverables: 'Acceptance certificate, handover documents, training records', percentage: 30 },
    ];
    out.push({ id: 'fin-pay', dept: 'finance', severity: 'return', step: 'payment', title: f.paymentStages.length ? `Payment stages add up to ${t.payPct}%, not 100%` : 'No payment schedule',
      why: 'Finance can’t commit the budget without a schedule that totals 100% and ties each payment to a deliverable.',
      proposal: { label: 'Suggested schedule (15 / 55 / 30)', replaces: f.paymentStages.length, rows: rows.map((r) => ({ title: r.stageName, sub: r.itemsDeliverables, badge: `${r.percentage}%` })) },
      apply: () => ({ paymentStages: rows.map((r) => ({ id: uid(), ...r })) }) });
  } else if (num(f.paymentStages[0]?.percentage) > 25) {
    const first = num(f.paymentStages[0].percentage);
    const fixed = f.paymentStages.map((s, i, a) => (i === 0 ? { ...s, percentage: 20 } : i === a.length - 1 ? { ...s, percentage: num(s.percentage) + (first - 20) } : s));
    out.push({ id: 'fin-advance', dept: 'finance', severity: 'improve', step: 'payment', title: `First payment is ${first}% — above the 25% advance limit`,
      why: 'Advances above 25% need a bank guarantee. Moving the difference to final acceptance avoids it.',
      proposal: { label: 'Adjusted stages', replaces: f.paymentStages.length, rows: fixed.map((s) => ({ title: s.stageName, sub: s.itemsDeliverables, badge: `${s.percentage}%` })) },
      apply: () => ({ paymentStages: fixed }) });
  }
  const noMg = lines.filter((r) => !r.mg);
  if (noMg.length) {
    out.push({ id: 'fin-mg', dept: 'finance', severity: 'improve', step: 'boq', title: `${noMg.length} BOQ line${noMg.length === 1 ? ' has' : 's have'} no material group`,
      why: 'The GL account follows the material group — without it Finance classifies each line by hand.',
      proposal: { label: 'Suggested material groups', rows: noMg.slice(0, 6).map((r) => { const s = suggestAccounting(r.itemName, r.itemDescription); return { title: r.itemName, badge: s ? mgOf(s.mg).en : '—' }; }) },
      apply: (g) => ({ boqItems: g.boqItems.map((r) => { if (r.mg || !(r.itemName || '').trim()) return r; const s = suggestAccounting(r.itemName, r.itemDescription); return s ? { ...r, ptype: s.ptype, mg: s.mg, acctSource: 'ai' } : r; }) }) });
  }
  const noPrice = lines.filter((r) => !(num(r.unitPrice) > 0));
  if (noPrice.length) out.push({ id: 'fin-price', dept: 'finance', severity: 'return', step: 'boq', title: `${noPrice.length} BOQ line${noPrice.length === 1 ? '' : 's'} without an estimated price`, why: 'The budget check compares the BOQ total with the available budget — every line needs an estimate.', manual: 'Add a unit price to each line. Use a recent quote or the last purchase price.' });

  // Enterprise architecture
  if (words(f.scopeOfWork) < MIN_WORDS.scope) {
    const text = `The contractor shall deliver ${names.join(', ') || 'the items in the BOQ'} for ${p?.name || 'this project'} at ${f.executionLocation || 'the organisation’s premises in Riyadh'}. This covers design, supply, configuration, testing, training and handover, with documentation in Arabic and English. Out of scope: changes to systems not listed in the BOQ and hardware outside the delivery locations. The contractor provides a named project manager and weekly progress reports until final acceptance.`;
    out.push({ id: 'ea-sow', dept: 'ea', severity: 'return', step: 'scope', title: 'Scope of work is too short to assess',
      why: `EA returns scopes that don’t say what is delivered, by whom and what is out of scope (${words(f.scopeOfWork)} of ${MIN_WORDS.scope} words).`,
      proposal: { label: 'Suggested scope of work', text }, apply: () => ({ scopeOfWork: text }) });
  }
  if (tech && !reqs.length) {
    const rows = [
      { requirement: 'Arabic & English user interface', description: 'All screens, reports and notifications in Arabic (RTL) and English.' },
      { requirement: 'Single sign-on with role-based access', description: 'Login through the corporate identity provider (SAML 2.0) with segregation of duties.' },
      { requirement: 'Documentation and knowledge transfer', description: 'As-built design, admin guides and hands-on training for the support team.' },
    ];
    out.push({ id: 'ea-reqs', dept: 'ea', severity: 'return', step: 'tech', title: 'No technical requirements', why: 'Vendors are evaluated against these — without them EA can’t check fit with the architecture.',
      proposal: { label: 'Suggested requirements', rows: rows.map((r) => ({ title: r.requirement, sub: r.description })) },
      apply: (g) => ({ technicalRequirements: [...g.technicalRequirements, ...rows.map((r) => ({ id: uid(), ...r }))] }) });
  }
  if (tech && answer(f, 'integrates') && !hasReq(reqs, /integrat|api|interface/i)) {
    const r = { requirement: 'Integration through documented APIs', description: 'All integrations go through the integration platform using documented REST APIs; no direct database links.' };
    out.push({ id: 'ea-integ', dept: 'ea', severity: 'improve', step: 'tech', title: 'Connects to internal systems but has no integration requirement', why: 'EA approves integrations only through the integration platform with documented APIs.',
      proposal: { label: 'Requirement to add', rows: [{ title: r.requirement, sub: r.description }] }, apply: (g) => ({ technicalRequirements: [...g.technicalRequirements, { id: uid(), ...r }] }) });
  }

  // Cybersecurity
  if (tech && !hasReq(reqs, /penetration|pen test|nca|ecc/i)) {
    const r = { requirement: 'Security testing & NCA compliance', description: 'Independent penetration test before go-live; the solution complies with NCA Essential Cybersecurity Controls; critical findings fixed within 30 days.' };
    out.push({ id: 'cy-test', dept: 'cyber', severity: 'return', step: 'tech', title: 'No security testing or NCA compliance requirement', why: 'Cybersecurity returns technology requests that don’t oblige the vendor to pass a penetration test and meet NCA ECC.',
      proposal: { label: 'Requirement to add', rows: [{ title: r.requirement, sub: r.description }] }, apply: (g) => ({ technicalRequirements: [...g.technicalRequirements, { id: uid(), ...r }] }) });
  }
  if (answer(f, 'personal-data') && !hasReq(reqs, /pdpl|personal data|privacy|data protection/i)) {
    const r = { requirement: 'Personal data protection (PDPL)', description: 'Personal data stays in Saudi Arabia, is encrypted at rest and in transit, and every access is logged for audit.' };
    out.push({ id: 'cy-pdpl', dept: 'cyber', severity: 'return', step: 'tech', title: 'Personal data is involved but not protected in the requirements', why: 'The request handles employee or customer data. PDPL requires data residency, encryption and access logging.',
      proposal: { label: 'Requirement to add', rows: [{ title: r.requirement, sub: r.description }] }, apply: (g) => ({ technicalRequirements: [...g.technicalRequirements, { id: uid(), ...r }] }) });
  }
  if (tech && !/confidential|non-disclosure|nda/i.test(f.scopeTerms || '')) {
    const clause = 'Confidentiality: vendor staff sign a non-disclosure agreement before access; all project data stays in Saudi Arabia and is returned or destroyed at contract end.';
    out.push({ id: 'cy-nda', dept: 'cyber', severity: 'improve', step: 'scope', title: 'No confidentiality clause in the terms', why: 'Vendor staff will see internal data — Cybersecurity expects an NDA and data-return clause.',
      proposal: { label: 'Clause to add to the terms', text: clause, append: true }, apply: (g) => ({ scopeTerms: `${(g.scopeTerms || '').trim()}${(g.scopeTerms || '').trim() ? '\n' : ''}${clause}` }) });
  }

  // Procurement
  if (!f.evaluationCriteria.length || t.evalPct !== 100) {
    const rows = [
      { description: 'Technical approach & methodology', howApplied: 'Scored on clarity of approach, plan and fit to the requirements.', weight: 40 },
      { description: 'Team qualifications', howApplied: 'CVs and certifications of the named team against the roles in the BOQ.', weight: 30 },
      { description: 'Similar projects delivered', howApplied: 'Two or more similar projects in the last three years, with references.', weight: 20 },
      { description: 'Implementation plan & timeline', howApplied: 'Realistic plan with milestones matching the payment schedule.', weight: 10 },
    ];
    out.push({ id: 'pr-eval', dept: 'procurement', severity: 'return', step: 'tech', title: f.evaluationCriteria.length ? `Evaluation weights add up to ${t.evalPct}%, not 100%` : 'No evaluation criteria', why: 'The tender can’t be published to Etimad without weighted criteria that total 100%.',
      proposal: { label: 'Suggested criteria (40 / 30 / 20 / 10)', replaces: f.evaluationCriteria.length, rows: rows.map((r) => ({ title: r.description, sub: r.howApplied, badge: `${r.weight}%` })) },
      apply: () => ({ evaluationCriteria: rows.map((r) => ({ id: uid(), ...r })) }) });
  }
  if (!(Number(f.technicalPassingPercentage) > 0)) out.push({ id: 'pr-pass', dept: 'procurement', severity: 'improve', step: 'tech', title: 'Technical passing percentage is not set', why: 'Without a pass mark, every vendor goes through to the financial opening.', proposal: { label: 'Suggested pass mark', text: '70%' }, apply: () => ({ technicalPassingPercentage: 70 }) });
  if (!f.technicalCommitteeMembers.length) out.push({ id: 'pr-committee', dept: 'procurement', severity: 'return', step: 'tech', title: 'No technical evaluator selected', why: 'Procurement can’t form the committee without a named technical evaluator.', manual: 'Pick the technical evaluator in the Technical evaluation step.' });
  const noDate = lines.filter((r) => !r.deliveryDate);
  if (noDate.length) out.push({ id: 'pr-dates', dept: 'procurement', severity: 'tip', step: 'boq', title: `${noDate.length} BOQ line${noDate.length === 1 ? '' : 's'} without a “needed by” date`, why: 'Dates drive the penalty clauses and the payment schedule in the contract.', manual: 'Add the date each line is needed by.' });

  // Line manager
  if (!f.startDate || !f.contractDuration) out.push({ id: 'mgr-duration', dept: 'manager', severity: 'return', step: 'scope', title: 'Start date or contract duration is missing', why: 'Your manager approves the budget against a period — without dates it can’t be phased.', manual: 'Set the start date and duration in the Scope of work step.' });
  if (!(f.executionLocation || '').trim()) out.push({ id: 'mgr-location', dept: 'manager', severity: 'improve', step: 'scope', title: 'Where the work happens is not specified', why: 'Location changes the cost and the vendors who can bid; managers ask for it before approving.', manual: 'Add where the work is delivered (city, site or remote).' });
  if (f.purpose && !/objective|vision|target|strateg/i.test(f.purpose)) {
    const add = ' This supports the department’s annual objectives and the Vision 2030 digital-transformation targets; without it, the current manual process continues with its cost and delay.';
    out.push({ id: 'mgr-objective', dept: 'manager', severity: 'tip', step: 'setup', title: 'Link the purpose to an objective', why: 'Managers approve faster when the request says which objective it serves and what happens without it.',
      proposal: { label: 'Sentence to add to the purpose', text: add.trim(), append: true }, apply: (g) => ({ purpose: `${g.purpose.trim()}${add}` }) });
  }
  if (!f.attachments.length) out.push({ id: 'mgr-quote', dept: 'manager', severity: 'tip', step: 'attachments', title: 'No quote or market study attached', why: 'A recent quote or market study backs up the estimate your manager approves.', manual: 'Attach a recent quote, a market study or the last purchase order for similar items.' });

  // Operational risk
  if (answer(f, 'critical') && !hasReq(reqs, /disaster|recovery|continuity|\bdr\b|backup|rto|rpo/i)) {
    const r = { requirement: 'Disaster recovery & business continuity', description: 'DR site in KSA with RTO ≤ 4 hours and RPO ≤ 1 hour; DR test before go-live and yearly.' };
    out.push({ id: 'risk-dr', dept: 'risk', severity: 'return', step: 'tech', title: 'Business-critical, but no disaster-recovery requirement', why: 'Operational Risk and BCM return critical systems without recovery targets and a DR test.',
      proposal: { label: 'Requirement to add', rows: [{ title: r.requirement, sub: r.description }] }, apply: (g) => ({ technicalRequirements: [...g.technicalRequirements, { id: uid(), ...r }] }) });
  }
  if (lines.length && !hasReq(reqs, /sla|service level|penalt|availability/i)) {
    const r = { requirement: 'Service levels & penalties', description: 'Response and resolution times by priority, monthly service report, penalties up to 10% of the monthly fee.' };
    out.push({ id: 'risk-sla', dept: 'risk', severity: 'improve', step: 'tech', title: 'No service levels or penalties', why: 'Without SLAs and penalties the organisation can’t enforce performance after go-live.',
      proposal: { label: 'Requirement to add', rows: [{ title: r.requirement, sub: r.description }] }, apply: (g) => ({ technicalRequirements: [...g.technicalRequirements, { id: uid(), ...r }] }) });
  }

  // Finance qualification
  if (!f.qualificationCommitteeMembers.length) out.push({ id: 'fq-committee', dept: 'finqual', severity: 'return', step: 'qual', title: 'No qualification reviewer selected', why: 'Someone has to check vendors against the qualification criteria.', manual: 'Add at least one reviewer in the Qualification step.' });
  const noRange = f.qualificationCriteria.flatMap((m) => m.subCriteria).filter((s) => !(s.range || '').trim());
  if (noRange.length) out.push({ id: 'fq-range', dept: 'finqual', severity: 'improve', step: 'qual', title: `${noRange.length} sub-criteri${noRange.length === 1 ? 'on has' : 'a have'} no range`, why: 'Without a range (e.g. “SAR 2M+” or “7+ years”) vendors can’t be scored consistently.', manual: 'Fill in a range for each sub-criterion, or import values from a similar project.' });

  return out;
}

function emarketReview(f) {
  const out = [];
  if (!(f.purpose || '').trim()) out.push({ id: 'em-purpose', dept: 'manager', severity: 'return', step: 'setup', title: 'No purpose of purchase', why: 'Your manager approves the spend against a reason.', manual: 'Say why these items are being purchased.' });
  const noSup = f.boqItems.filter((r) => !(r.supplier || '').trim());
  if (noSup.length) out.push({ id: 'em-supplier', dept: 'procurement', severity: 'improve', step: 'boq', title: `${noSup.length} item${noSup.length === 1 ? '' : 's'} without a supplier`, why: 'The purchase order is raised per supplier on Etimad.', manual: 'Add the catalogue supplier for each item.' });
  if (!f.attachments.length) out.push({ id: 'em-quote', dept: 'manager', severity: 'tip', step: 'attachments', title: 'No catalogue quote attached', why: 'A screenshot or quote from the catalogue confirms the price.', manual: 'Attach the Etimad catalogue quote.' });
  return out;
}

/** Order the reviewers check in (for the "thinking" list). */
export const CHECK_ORDER = ['manager', 'finance', 'ea', 'cyber', 'risk', 'procurement', 'finqual'];
