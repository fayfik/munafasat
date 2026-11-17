import { aboveRange, natureOf, recText } from './qualGuide';
// "Will this be returned?" checks — run when the requester presses Continue.
// Each rule mirrors a common reason a manager, EA or Finance returns a request,
// so the requester fixes it now instead of after a review round-trip.
import type { TenderFormData } from '../types/tender';

export interface QualityIssue {
  id: string;
  /** DOM id of the field to scroll to (q-<field>). */
  field: string;
  en: string; ar: string;
  /** Why it matters — who returns it. */
  whyEn: string; whyAr: string;
  /** Progress, e.g. "12 of 40 words". */
  metaEn?: string; metaAr?: string;
}

export const words = (s?: string) => (s ?? '').trim().split(/\s+/).filter((w) => w.length > 1).length;

/** Minimum detail per field (words). */
export const MIN_WORDS = { scopeOfWork: 40, purpose: 12, boqDesc: 5, deliverable: 3, howApplied: 6, techReq: 6 } as const;

export function qualityIssues(sectionId: string, f: TenderFormData): QualityIssue[] {
  const out: QualityIssue[] = [];
  switch (sectionId) {
    case 'project-setup': {
      const nat = natureOf(f);
      if (f.boqItems.length && (!nat.area || !nat.delivery)) out.push({
        id: 'nature', field: 'q-nature',
        en: 'Set the project nature', ar: 'حدد طبيعة المشروع',
        whyEn: 'Finance and Procurement size the qualification criteria from it (IT / non-IT and delivery type).',
        whyAr: 'تحدد المالية والمشتريات معايير التأهيل بناءً عليها (تقني / غير تقني ونوع التوريد).',
      });
      const n = words(f.tenderingPurpose);
      if (n < MIN_WORDS.purpose) out.push({
        id: 'purpose', field: 'q-tenderingPurpose',
        en: 'Describe the purpose of this request', ar: 'صف الغرض من هذا الطلب',
        whyEn: 'Your manager returns requests that don’t say why the purchase is needed.', whyAr: 'يعيد مديرك الطلبات التي لا توضح سبب الحاجة إلى الشراء.',
        metaEn: `${n} of ${MIN_WORDS.purpose} words`, metaAr: `${n} من ${MIN_WORDS.purpose} كلمة`,
      });
      break;
    }
    case 'qualification': {
      const over = aboveRange(f).filter((x) => !x.justified);
      if (over.length) out.push({
        id: 'qual-above', field: 'q-qualification',
        en: `${over.length} qualification criteri${over.length === 1 ? 'on is' : 'a are'} above the recommended range`, ar: `${over.length} من معايير التأهيل أعلى من النطاق الموصى به`,
        whyEn: 'Procurement returns criteria that exclude SMEs or don’t fit the project size. Lower the threshold or add a one-line reason.',
        whyAr: 'تعيد المشتريات المعايير التي تستبعد المنشآت الصغيرة والمتوسطة أو لا تناسب حجم المشروع. خفّض الحد أو أضف سبباً في سطر.',
        metaEn: over.map((x) => `${x.nameEn}: ${x.value} (typical ${recText(x.rec, false)})`).join(' · '),
        metaAr: over.map((x) => `${x.nameAr}: ${x.value} (المعتاد ${recText(x.rec, true)})`).join(' · '),
      });
      break;
    }
    case 'scope-of-work': {
      const n = words(f.scopeOfWork);
      if (n < MIN_WORDS.scopeOfWork) out.push({
        id: 'sow', field: 'q-scopeOfWork',
        en: 'Add more detail to the Scope of Work', ar: 'أضف تفاصيل أكثر إلى نطاق العمل',
        whyEn: 'EA and your manager return a short scope. Say what is delivered, where, by whom, and what is out of scope.',
        whyAr: 'تعيد البنية المؤسسية ومديرك النطاق المختصر. وضّح ما سيُسلَّم وأين ومن المسؤول وما هو خارج النطاق.',
        metaEn: `${n} of ${MIN_WORDS.scopeOfWork} words`, metaAr: `${n} من ${MIN_WORDS.scopeOfWork} كلمة`,
      });
      break;
    }
    case 'boq': {
      const thin = f.boqItems.filter((r) => words(r.itemDescription) < MIN_WORDS.boqDesc);
      if (thin.length) out.push({
        id: 'boq-desc', field: 'q-boq',
        en: `${thin.length} BOQ item${thin.length === 1 ? ' needs' : 's need'} a clearer description`, ar: `${thin.length} من بنود الجدول تحتاج وصفاً أوضح`,
        whyEn: 'EA checks the specification and Finance picks the material group from it — a one-liner gets returned.',
        whyAr: 'تتحقق البنية المؤسسية من المواصفات وتحدد المالية مجموعة المواد منها — الوصف المختصر يُعاد.',
        metaEn: thin.slice(0, 3).map((r) => r.itemName || '—').join(' · '), metaAr: thin.slice(0, 3).map((r) => r.itemName || '—').join(' · '),
      });
      const noPrice = f.boqItems.filter((r) => !(Number(r.unitPrice) > 0) || !(Number(r.quantity) > 0 || Number(r.staffCount) > 0));
      if (noPrice.length) out.push({
        id: 'boq-price', field: 'q-boq',
        en: `${noPrice.length} BOQ item${noPrice.length === 1 ? ' has' : 's have'} no quantity or unit price`, ar: `${noPrice.length} من البنود بلا كمية أو سعر وحدة`,
        whyEn: 'Your manager can’t approve the budget without an estimated amount for every line.',
        whyAr: 'لا يستطيع مديرك اعتماد الميزانية دون مبلغ تقديري لكل بند.',
      });
      break;
    }
    case 'payment-schedule': {
      const thin = f.paymentStages.filter((s) => words(s.itemsDeliverables) < MIN_WORDS.deliverable);
      if (thin.length) out.push({
        id: 'pay-deliv', field: 'q-payment',
        en: `${thin.length} payment stage${thin.length === 1 ? '' : 's'} without the deliverable it pays for`, ar: `${thin.length} من مراحل الدفع بلا مخرجات`,
        whyEn: 'Finance and PMO return payments that aren’t tied to a deliverable.', whyAr: 'تعيد المالية ومكتب المشاريع الدفعات غير المرتبطة بمخرج.',
      });
      break;
    }
    case 'technical-evaluation': {
      const thin = f.evaluationCriteria.filter((c) => words(c.howApplied) < MIN_WORDS.howApplied);
      if (thin.length) out.push({
        id: 'eval-how', field: 'q-evaluation',
        en: `Explain how ${thin.length === 1 ? '1 criterion is' : `${thin.length} criteria are`} scored`, ar: `وضّح طريقة تقييم ${thin.length} من المعايير`,
        whyEn: 'The technical committee returns criteria without a clear scoring method.', whyAr: 'تعيد اللجنة الفنية المعايير التي لا توضح طريقة التقييم.',
      });
      const req = f.technicalRequirements.filter((r) => r.requirement && words(r.description) < MIN_WORDS.techReq);
      if (req.length) out.push({
        id: 'tech-req', field: 'q-evaluation',
        en: `${req.length} technical requirement${req.length === 1 ? ' needs' : 's need'} a description`, ar: `${req.length} من المتطلبات الفنية تحتاج وصفاً`,
        whyEn: 'EA returns requirements that only have a title.', whyAr: 'تعيد البنية المؤسسية المتطلبات التي لها عنوان فقط.',
      });
      break;
    }
  }
  return out;
}
