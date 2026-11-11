// One request record for every page. Maps what the requester entered in request
// creation (TenderFormData) onto the RfpDetail record that the Inbox "Request details"
// tab and the My Requests detail page both render — so the pages always show exactly
// what was submitted. Anything the form does not hold (e.g. documents of a sample
// request) falls back to the base record.
import type { TenderFormData } from '../types/tender';
import type { RfpDetail } from './types';
import { PROJECTS, ALL_COST_CENTERS } from '../data/mockData';
import { PROJECT_CATEGORIES } from '../components/ProjectIncludesSelect';
import { crState } from '../components/ContinuityRisk';

const num = (v: number | '' | undefined) => (typeof v === 'number' ? v : Number(v) || 0);
const both = (en: string, ar?: string) => ({ en, ar: ar || en });

export function rfpFromForm(f: TenderFormData, base: RfpDetail): RfpDetail {
  const proj = PROJECTS.find((p) => p.id === f.projectId);
  const ccs = [f.costCenterId, ...(f.additionalCostCenterIds ?? [])].map((id) => ALL_COST_CENTERS.find((c) => c.id === id)).filter(Boolean);
  const esouq = f.sourceType === 'souq-etimad';
  const items = (proj?.items ?? []).filter((x) => (f.selectedProjectItemIds ?? []).includes(x.id));
  const cr = esouq ? null : crState(f);
  const durationLabel = f.contractDuration ? `${f.contractDuration} ${f.contractDurationType}` : base.duration;
  const has = <T,>(arr: T[] | undefined) => !!arr && arr.length > 0;

  return {
    ...base,
    projectCode: proj?.code ?? base.projectCode,
    projectNameEn: proj?.name ?? base.projectNameEn,
    projectNameAr: proj?.nameAr ?? base.projectNameAr,
    route: f.sourceType === 'souq-etimad' ? 'souq-etimad' : 'tendering',
    titleEn: proj?.name ?? base.titleEn,
    titleAr: proj?.nameAr ?? base.titleAr,
    // Project setup
    purposeEn: f.tenderingPurpose || base.purposeEn,
    purposeAr: f.tenderingPurpose || base.purposeAr,
    projectItems: items.length ? items.map((x) => both(x.name, x.nameAr)) : base.projectItems,
    costCenters: ccs.length ? ccs.map((c) => `${c!.code} · ${c!.name}`) : base.costCenters,
    routeJustification: f.routeJustification || undefined,
    // Scope of work
    scopeEn: f.scopeOfWork || base.scopeEn,
    scopeAr: f.scopeOfWork || base.scopeAr,
    scopeBlocks: f.scopeOfWork ? undefined : base.scopeBlocks,
    termsEn: f.scopeTerms || base.termsEn,
    termsAr: f.scopeTerms || base.termsAr,
    includes: has(f.scopeIncludes) ? f.scopeIncludes.map((id) => { const c = PROJECT_CATEGORIES.find((x) => x.id === id); return c ? both(c.en, c.ar) : both(id); }) : base.includes,
    location: f.executionLocation || base.location,
    startDate: f.startDate || base.startDate,
    duration: durationLabel,
    brand: f.hasBrandName == null ? base.brand : { has: f.hasBrandName, justification: f.brandNameJustification || undefined },
    deliverables: has(f.deliverables) ? f.deliverables.map((d) => ({ phase: d.phase, name: d.deliverableName, due: d.deliveryDate, desc: d.description })) : base.deliverables,
    regulatory: [...(proj?.regulatoryRecords ?? '').split(',').map((x) => x.trim()).filter(Boolean), ...(f.extraRegulatoryRecords ?? [])].length
      ? [...(proj?.regulatoryRecords ?? '').split(',').map((x) => x.trim()).filter(Boolean), ...(f.extraRegulatoryRecords ?? [])]
      : base.regulatory,
    // BOQ — every field the requester set, including finance fields and brand
    boq: has(f.boqItems) ? f.boqItems.map((b) => {
      const pi = proj?.items.find((x) => x.id === b.projectItem);
      return {
        itemEn: b.itemName, itemAr: b.itemName, qty: String(b.quantity || 1), unit: b.unitOfMeasure || 'EA', unitPrice: num(b.unitPrice),
        descEn: b.itemDescription, descAr: b.itemDescription,
        budgetEn: pi?.name, budgetAr: pi?.nameAr,
        category: b.category === 'material' ? 'Material' : 'Service',
        delivery: b.deliveryDate || undefined,
        finPurchaseType: b.finPurchaseType, materialGroup: b.materialGroup,
        hasBrand: !!b.hasBrandName,
        brandName: b.hasBrandName ? (b.brandJustification || undefined) : undefined,
      };
    }) : base.boq,
    // Payment
    payment: esouq ? [] : has(f.paymentStages) ? f.paymentStages.map((p) => ({ stageEn: p.stageName, stageAr: p.stageName, pct: num(p.percentage), descEn: p.itemsDeliverables, descAr: p.itemsDeliverables, due: [p.startDate, p.duration].filter(Boolean).join(' · ') || undefined })) : base.payment,
    // Technical evaluation
    evaluation: esouq ? [] : has(f.evaluationCriteria) ? f.evaluationCriteria.map((c) => ({ criterionEn: c.description, criterionAr: c.description, weight: num(c.weight), descEn: c.howApplied, descAr: c.howApplied })) : base.evaluation,
    techPassing: esouq ? undefined : f.technicalPassingPercentage ? Number(f.technicalPassingPercentage) : base.techPassing,
    techRequirements: esouq ? [] : has(f.technicalRequirements) ? f.technicalRequirements.map((r) => ({ reqEn: r.requirement, reqAr: r.requirement, descEn: r.description, descAr: r.description })) : base.techRequirements,
    techDocs: esouq ? [] : has(f.technicalDocumentsList) ? f.technicalDocumentsList.map((d) => both(d)) : base.techDocs,
    evalCommittee: esouq ? [] : has(f.technicalCommitteeMembers) ? f.technicalCommitteeMembers.map((m) => ({ name: m.name, nameAr: m.nameAr ?? m.name, roleEn: m.role, roleAr: m.role, deptEn: m.department, deptAr: m.department })) : base.evalCommittee,
    // Technical standards (EA)
    techStandards: f.techStandards?.length ? f.techStandards.map((s) => ({ id: s.id, status: s.status, naReason: s.naReason })) : base.techStandards,
    deploymentModel: f.deploymentModel ?? base.deploymentModel,
    techAnswers: f.techAnswers ?? base.techAnswers,
    // Qualification
    qualCriteria: esouq ? [] : has(f.qualificationCriteria) ? f.qualificationCriteria.map((m) => ({ nameEn: m.name, nameAr: m.nameAr || m.name, pct: num(m.percentage), subs: m.subCriteria.map((s) => ({ nameEn: s.name, nameAr: s.nameAr || s.name, range: s.range, pct: num(s.percentage) })) })) : base.qualCriteria,
    qualPassing: esouq ? undefined : f.qualificationPassingPercentage ? Number(f.qualificationPassingPercentage) : base.qualPassing,
    qualCommittee: esouq ? [] : has(f.qualificationCommitteeMembers) ? f.qualificationCommitteeMembers.map((m) => ({ name: m.name, nameAr: m.nameAr ?? m.name, roleEn: m.role, roleAr: m.role, deptEn: m.department, deptAr: m.department })) : base.qualCommittee,
    // Business continuity & third-party risk (Review & Confirm)
    bcm: cr && cr.verdict ? { answers: cr.bcm.answers, clauses: cr.clauses.map((c) => ({ id: c.id, value: cr.values[c.id] || undefined })) } : base.bcm,
    tpr: cr && cr.rating ? cr.tpr.answers : base.tpr,
    // Attachments
    documents: has(f.attachments) ? f.attachments.map((a) => ({ en: a.name, ar: a.name, type: (a.name.split('.').pop() ?? 'FILE').toUpperCase(), size: a.size ? `${Math.max(1, Math.round(a.size / 1024))} KB` : undefined })) : base.documents,
  };
}
