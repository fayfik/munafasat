export type SourceType = 'tendering' | 'souq-etimad' | 'mandatory-catalogue';
export type ContractDurationType = 'days' | 'months' | 'years';
export type ProjectItemType = 'assets' | 'services' | 'consumables';
export type SectionStatus = 'completed' | 'in-progress' | 'not-started' | 'missing';
export type TenderStatus = 'draft' | 'submitted' | 'under-review' | 'approved' | 'returned';

export interface ProjectItem {
  id: string;
  name: string;
  nameAr: string;
  type: ProjectItemType;
}

export interface BOQRow {
  id: string;
  projectItem: string;
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
  tenderingPurpose: string;
  scopeOfWork: string;
  scopeTerms: string;
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
  /** Etimad Souq draft that receives BOQ items moved out of this tender. */
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
