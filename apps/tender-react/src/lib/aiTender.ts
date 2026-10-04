// Real AI generation for every "AI" button in the tender form.
// Each function returns null when AI is unavailable in this view so the
// caller can fall back to the original sample content.
import { askJson, askText } from './claudeRuntime';
import { PROJECTS, ALL_COST_CENTERS, UNITS_OF_MEASURE } from '../data/mockData';
import { categoryById } from '../data/projectCategories';
import type { TenderFormData } from '../types/tender';

const today = () => new Date().toISOString().slice(0, 10);

function context(f: TenderFormData, opts: { boq?: boolean; deliverables?: boolean; scope?: boolean } = {}): string {
  const p = PROJECTS.find((x) => x.id === f.projectId);
  const cc = ALL_COST_CENTERS.find((x) => x.id === f.costCenterId);
  const lines: string[] = [
    `Organization: Saudi Industrial Development Fund (SIDF), a Saudi government entity. Procurement follows the Saudi Government Tenders and Procurement Law and uses the Etimad platform.`,
    `Today's date: ${today()}. Every date you propose must be after today.`,
    `Procurement channel: ${f.sourceType === 'souq-etimad' ? 'Etimad Souq (e-marketplace)' : 'Public tender (RFP)'}`,
  ];
  if (cc) lines.push(`Cost center: ${cc.name} (${cc.code})`);
  if (p) {
    lines.push(`Project: ${p.name} (${p.code})`);
    lines.push(`Project purpose: ${p.purpose}`);
    lines.push(`Project includes: ${p.includes}`);
    const extra = (f.extraIncludeCategoryIds ?? []).map((id) => categoryById(id)?.title).filter(Boolean);
    if (extra.length) lines.push(`The requester also added: ${extra.join(', ')}`);
    lines.push(`Project items: ${p.items.map((i) => `${i.name} [${i.type}]`).join('; ')}`);
    lines.push(`Regulatory records required: ${p.regulatoryRecords}`);
  } else {
    lines.push('Project: not selected yet (write generic content for an IT procurement).');
  }
  if (f.tenderingPurpose) lines.push(`Purpose of tendering (from requester): ${f.tenderingPurpose}`);
  if (opts.scope && f.scopeOfWork) lines.push(`Scope of work:\n${f.scopeOfWork.slice(0, 4000)}`);
  if (f.startDate) lines.push(`Contract start date: ${f.startDate}`);
  if (f.contractDuration) lines.push(`Contract duration: ${f.contractDuration} ${f.contractDurationType}`);
  if (opts.boq && f.boqItems.length) {
    lines.push('Bill of quantities:\n' + f.boqItems.slice(0, 40).map((r) =>
      `- ${r.projectItem} / ${r.itemName}: ${r.quantity || '?'} ${r.unitOfMeasure} x SAR ${r.unitPrice || '?'}`
      + (r.etimadCheck?.status === 'available'
        ? ` [Etimad Souq check: available; kept in tender; justification: ${(r.etimadJustification ?? '').trim() || 'MISSING'}]`
        : r.etimadCheck ? ` [Etimad Souq check: ${r.etimadCheck.status}]` : ' [Etimad Souq check: not run]')).join('\n'));
  }
  if (opts.deliverables && f.deliverables.length) {
    lines.push('Deliverables:\n' + f.deliverables.map((d) =>
      `- ${d.phase}: ${d.deliverableName} (due ${d.deliveryDate || 'TBD'})`).join('\n'));
  }
  return lines.join('\n');
}

const lang = (isAr: boolean) => isAr
  ? 'Write all human-readable text values in formal Modern Standard Arabic.'
  : 'Write all human-readable text values in clear professional English.';

export async function aiPurpose(f: TenderFormData, isAr: boolean) {
  return askText(`${context(f)}

Write the "Purpose of Tendering" statement for this tender request: 2-3 sentences, specific to this project, stating what is being procured and why. ${lang(isAr)} Reply with only the statement, no heading or quotes.`);
}

export async function aiScope(f: TenderFormData, isAr: boolean) {
  return askText(`${context(f)}

Write the "Project Scope of Work" section of this tender. Use a numbered list, one numbered item per project item or workstream, each 1-3 sentences stating the contractor's obligations with concrete quantities, durations or service levels where sensible. Plain text only (no Markdown bold or headings), 180-350 words. ${lang(isAr)}`);
}

export async function aiTerms(f: TenderFormData, isAr: boolean) {
  return askText(`${context(f, { scope: true })}

Write the "Scope-Specific Terms & Conditions" for this tender: 5-7 numbered clauses specific to this scope (compliance with Saudi regulators such as NCA, CST, ZATCA or data residency where relevant, warranty, subcontracting limits, acceptance). Plain text only, no Markdown. ${lang(isAr)}`);
}

export type AiBoqRow = { projectItem: string; itemName: string; itemDescription: string; unitOfMeasure: string; quantity: number; unitPrice: number; deliveryDate: string };
export async function aiBoq(f: TenderFormData, isAr: boolean) {
  const p = PROJECTS.find((x) => x.id === f.projectId);
  const itemNames = p ? p.items.map((i) => i.name) : [];
  return askJson<AiBoqRow[]>(`${context(f, { scope: true })}

Propose a Bill of Quantities for this tender with 5-10 line items and realistic Saudi-market unit prices in SAR (excluding VAT).
Reply with only a JSON array of objects:
{"projectItem": string, "itemName": string, "itemDescription": string, "unitOfMeasure": string, "quantity": number, "unitPrice": number, "deliveryDate": "YYYY-MM-DD"}
Rules: ${itemNames.length ? `"projectItem" must be exactly one of: ${JSON.stringify(itemNames)} (keep these English names as-is).` : '"projectItem" is a short category name.'} "unitOfMeasure" must be one of ${JSON.stringify(UNITS_OF_MEASURE)}. ${lang(isAr)} (itemName and itemDescription only).`);
}

export type AiDeliverable = { phase: string; deliverableName: string; deliveryDate: string; description: string };
export async function aiDeliverables(f: TenderFormData, isAr: boolean) {
  return askJson<AiDeliverable[]>(`${context(f, { scope: true, boq: true })}

Propose 4-7 project phases with their deliverables, in delivery order, fitting inside the contract period if one is given.
Reply with only a JSON array of objects: {"phase": string, "deliverableName": string, "deliveryDate": "YYYY-MM-DD", "description": string}. "phase" is like "Phase 1". ${lang(isAr)}`);
}

export type AiStage = { stageName: string; itemsDeliverables: string; startDate: string; duration: string; percentage: number };
export async function aiStages(f: TenderFormData, isAr: boolean) {
  return askJson<AiStage[]>(`${context(f, { boq: true, deliverables: true })}

Propose a milestone-based payment schedule (4-7 stages) tied to the deliverables above. Percentages must be whole numbers that add up to exactly 100; keep an advance or signing payment at or below 15%.
Reply with only a JSON array of objects: {"stageName": string, "itemsDeliverables": string, "startDate": "YYYY-MM-DD", "duration": string like "30 days", "percentage": number}. ${lang(isAr)}`);
}

export async function aiTechDocs(f: TenderFormData, isAr: boolean) {
  return askJson<string[]>(`${context(f, { scope: true })}

List the 6-10 technical documents bidders must submit with their technical proposal for this tender.
Reply with only a JSON array of short strings (document names). ${lang(isAr)}`, 'quick');
}

export type AiReq = { requirement: string; description: string };
export async function aiTechReqs(f: TenderFormData, isAr: boolean) {
  return askJson<AiReq[]>(`${context(f, { scope: true })}

Define 6-9 measurable technical requirements bidders must meet for this project.
Reply with only a JSON array of objects: {"requirement": short title, "description": one or two sentences with acceptance criteria}. ${lang(isAr)}`);
}

export type AiCriterion = { description: string; howApplied: string; weight: number };
export async function aiEvalCriteria(f: TenderFormData, isAr: boolean) {
  return askJson<AiCriterion[]>(`${context(f, { scope: true })}

Propose 4-6 weighted technical evaluation criteria for scoring bidders' technical proposals. Weights are whole numbers that add up to exactly 100.
Reply with only a JSON array of objects: {"description": string, "howApplied": string, "weight": number}. ${lang(isAr)}`);
}

export type AiQual = Record<string, { percentage: number; sub: Record<string, { range: string; percentage: number }> }>;
export async function aiQualification(f: TenderFormData, isAr: boolean) {
  const shape = f.qualificationCriteria.map((m) => ({
    id: m.id, name: m.name, sub: m.subCriteria.map((s) => ({ id: s.id, name: s.name })),
  }));
  const total = f.boqItems.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0);
  return askJson<AiQual>(`${context(f)}
${total ? `Estimated contract value: SAR ${Math.round(total).toLocaleString('en-US')} before VAT.` : ''}

Set vendor pre-qualification thresholds for these criteria, scaled to this project's size:
${JSON.stringify(shape)}
Main-criteria percentages must be whole numbers adding to exactly 100, and within each main criterion the sub-criteria percentages must add to exactly 100. "range" is a short threshold such as "5+ years" or "SAR 2M–10M".
Reply with only a JSON object keyed by main id: {"<mainId>": {"percentage": number, "sub": {"<subId>": {"range": string, "percentage": number}}}}. ${lang(isAr)} (range text only).`);
}

export async function aiExecutiveSummary(f: TenderFormData, isAr: boolean, totals: { subtotal: number; vat: number; total: number }) {
  return askText(`${context(f, { scope: true, boq: true, deliverables: true })}
Estimated value: SAR ${totals.subtotal.toFixed(2)} before VAT, SAR ${totals.total.toFixed(2)} including 15% VAT.
Payment stages: ${f.paymentStages.map((s) => `${s.stageName} ${s.percentage}%`).join('; ') || 'none'}
Technical committee: ${f.technicalCommitteeMembers.length} members; evaluation criteria: ${f.evaluationCriteria.map((c) => `${c.description} ${c.weight}%`).join('; ') || 'none'}; passing score: ${f.technicalPassingPercentage || 'not set'}%.
Attachments: ${f.attachments.map((a) => a.name).join(', ') || 'none'}

Write an executive summary of this tender request for the approving manager: 3 short paragraphs (what is procured and why; value, timeline and payment; evaluation approach), then one final line starting "${isAr ? 'نقاط تحتاج انتباهاً:' : 'Points to check:'}" listing any gaps or risks you notice in the data above (missing fields, totals that do not add up, dates in the past). Plain text, no Markdown. ${lang(isAr)}`);
}
