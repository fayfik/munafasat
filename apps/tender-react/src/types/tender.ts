export type SourceType = 'tendering' | 'souq-etimad';
export type ContractDurationType = 'days' | 'months' | 'years';
export type ProjectItemType = 'assets' | 'services' | 'consumables';
/** Etimad BOQ categorisation captured per BOQ line. */
export type BOQCategory = 'service' | 'equipment' | 'material' | 'manpower';
export type SectionStatus = 'completed' | 'in-progress' | 'not-started' | 'missing';
export type TenderStatus = 'draft' | 'submitted' | 'under-review' | 'approved' | 'returned';
/** v3 flow: requester drafts → Procurement completes payment & evaluation → requester confirms → approvals. */
export type V3Stage = 'draft' | 'with-procurement' | 'requester-confirm' | 'in-approval';

export interface ProjectItem {
  id: string;
  name: string;
  nameAr: string;
  type: ProjectItemType;
  /** Approved budget for this line, SAR. */
  budget?: number;
}

export interface BOQRow {
  id: string;
  projectItem: string;
  /** Etimad category — Service / Equipment / Material. */
  category?: BOQCategory;
  itemName: string;
  itemDescription: string;
  unitOfMeasure: string;
  quantity: number | '';
  unitPrice: number | '';
  deliveryDate: string;
  hasBrandName?: boolean;
  brandJustification?: string;
  /** Result of the last "Check Etimad availability" run for this row. */
  etimadCheck?: EtimadCheck;
  /** User kept an Etimad-available item in the tender. */
  etimadKeep?: boolean;
  etimadJustification?: string;
  /** Supporting documents attached to this line (specs, drawings, quotes…). */
  attachments?: FileAttachment[];
  /** Mandatory-list reference (listed company / product) — captured for Material & Equipment items. */
  mandatoryList?: string;

  /* ── Man Power category fields ────────────────────────────────────────────── */
  jobTitle?: string;
  staffCount?: number | '';
  /** Minimum accepted qualification (value from QUALIFICATIONS). */
  minQualification?: string;
  minExperienceYears?: number | '';
  officialWorkingHours?: number | '';
  extraWorkingHours?: number | '';
  /** Whether a specific nationality is required for this manpower line. */
  nationalityRequired?: boolean;
  /** Selected nationalities (when nationalityRequired). */
  nationalities?: string[];

  /* ── Etimad E-Market (direct catalogue purchase) fields ───────────────────────── */
  /** Product · Service · Vehicle Leasing. Drives which fields apply and the group. */
  purchaseType?: 'product' | 'service' | 'vehicle-leasing';
  productId?: string;
  supplier?: string;
  orderUnit?: string;            // product only
  shippingCharges?: number | ''; // product only
  startDate?: string;            // service / vehicle-leasing
  endDate?: string;              // service / vehicle-leasing
  respName?: string;             // delivery note — responsible name
  respMobile?: string;           // delivery note — responsible mobile
  lineTotal?: number | '';       // total value for this line
}

export type EtimadAvailability = 'available' | 'not-available' | 'uncertain';

export interface EtimadCheck {
  status: EtimadAvailability;
  comment: string;
  checkedAt: string;
  /** 'estimate' until a live Etimad integration exists. */
  source: 'demo' | 'estimate' | 'etimad';
  /** Name + description + unit + price the check was run against; a mismatch means the item changed since. */
  itemKey: string;
}

export interface DeliverableRow {
  id: string;
  phase: string;
  deliverableName: string;
  deliveryDate: string;
  description: string;
}

export interface PaymentStageRow {
  id: string;
  stageName: string;
  itemsDeliverables: string;
  startDate: string;
  duration: string;
  percentage: number | '';
}

export interface Person {
  id: string;
  name: string;
  nameAr?: string;
  role: string;
  department: string;
  initials: string;
  avatarColor: string;
  photoUrl?: string;
}

export interface TechRequirementRow {
  id: string;
  requirement: string;
  description: string;
}

export interface EvalCriterionRow {
  id: string;
  description: string;
  howApplied: string;
  weight: number | '';
}

export interface QualSubCriteria {
  id: string;
  name: string;
  nameAr: string;
  range: string;
  percentage: number | '';
}

export interface QualMainCriteria {
  id: string;
  name: string;
  nameAr: string;
  percentage: number | '';
  subCriteria: QualSubCriteria[];
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  nameAr: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  costCenterId: string;
  purpose: string;
  purposeAr: string;
  includes: string;
  items: ProjectItem[];
  regulatoryRecords: string;
}

export interface TenderFormData {
  sourceType: SourceType;
  costCenterId: string;
  /** Cost centers added on top of the default one (via "View more cost centers"). */
  additionalCostCenterIds?: string[];
  projectId: string;
  /** Project items chosen for this tender (ids from the project's item list). */
  selectedProjectItemIds?: string[];
  /** Why eMarket-available items were kept in a tender (step 1). */
  routeJustification?: string;
  /** How the requester picked the route in step 1. */
  routeChoice?: 'tender' | 'emarket' | 'help';
  /** v3 hand-off: who holds the request now. */
  v3Stage?: V3Stage;
  /** Note from Procurement when sending the RFP back for the requester's confirmation. */
  procurementNote?: string;
  /** Requester's change request when sending the RFP back to Procurement. */
  requesterChangeRequest?: string;
  /** Template Procurement applied for payment stages / evaluation (by category). */
  paymentTemplate?: string;
  evaluationTemplate?: string;
  /** Past request the requester started from in step 1. */
  startedFromRfp?: string;
  /** When each hand-off happened (ISO). */
  v3History?: { stage: V3Stage; at: string; by: 'requester' | 'procurement'; note?: string }[];
  /** Items moved out of this request into a separate draft (step 1). */
  movedToDraft?: { count: number; route: SourceType };
  /** Names of eMarket-available items kept in the tender with the justification above. */
  justifiedEmarketItems?: string[];
  tenderingPurpose: string;
  scopeOfWork: string;
  scopeTerms: string;
  /** "What does this project include" — selected category ids or custom labels. */
  scopeIncludes: string[];
  /** Requester-added regulatory records (beyond the project's default/locked set). */
  extraRegulatoryRecords: string[];
  boqItems: BOQRow[];
  hasBrandName: boolean | null;
  brandNameJustification: string;
  executionLocation: string;
  startDate: string;
  contractDurationType: ContractDurationType;
  contractDuration: string;
  deliverables: DeliverableRow[];
  paymentStages: PaymentStageRow[];
  technicalCommitteeMembers: Person[];
  technicalDocumentsList: string[];
  technicalRequirements: TechRequirementRow[];
  evaluationCriteria: EvalCriterionRow[];
  technicalPassingPercentage: string;
  qualificationCommitteeMembers: Person[];
  qualificationCriteria: QualMainCriteria[];
  attachments: FileAttachment[];
  /** Etimad E-Market draft that receives BOQ items moved out of this tender. */
  linkedEtimadRequestId?: string;
}

export interface TenderDraft {
  id: string;
  title: string;
  type: SourceType;
  status: TenderStatus;
  createdAt: string;
  updatedAt: string;
  department: string;
  budget: string;
}
