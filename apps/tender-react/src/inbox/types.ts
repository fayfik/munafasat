// Munafasat Inbox — task-driven work model.
// Frontend prototype types. A real deployment resolves these from the Work Engine /
// Task APIs; here they are served by a deterministic in-memory mock (see store.tsx).

export interface Bilingual { en: string; ar: string }

export type TaskType =
  | 'approval'
  | 'review'
  | 'data-collection'
  | 'technical-evaluation'
  | 'commercial-evaluation'
  | 'validation'
  | 'clarification'
  | 'document-submission';

/** Task lifecycle state. Not every task passes through every state. */
export type TaskState =
  | 'available'    // assigned and actionable now
  | 'in-progress'  // started by the current user, draft saved
  | 'waiting'      // submitted/sent, awaiting another person or process
  | 'returned'     // sent back to the current user for correction
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export type EntityKind = 'PR' | 'RFP' | 'RFQ' | 'PO' | 'INVOICE' | 'CONTRACT' | 'DELIVERY';

export interface RelatedEntity {
  kind: EntityKind;
  ref: string;
  titleEn: string;
  titleAr: string;
}

export interface Person {
  id: string;
  name: string;
  nameAr?: string;
  role?: string;
  roleAr?: string;
  dept?: string;
  deptAr?: string;
}

/** The decisions a user can take on a task; availability depends on type + policy. */
export type TaskAction =
  | 'approve'
  | 'reject'
  | 'return'
  | 'request-clarification'
  | 'comment'
  | 'save-draft'
  | 'submit'
  | 'complete';

// ── Task-type payloads ───────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  label: Bilingual;
  mandatory: boolean;
  evidenceRequired?: boolean;
  kind: 'confirm' | 'yesno' | 'passfail' | 'text' | 'number' | 'decision';
  options?: Bilingual[];        // for 'decision'
  value?: string | boolean | number | null;
  evidence?: string[];          // uploaded file names (mock)
  done: boolean;
}

export interface CollectField {
  id: string;
  label: Bilingual;
  kind: 'text' | 'longtext' | 'number' | 'currency' | 'select' | 'date' | 'yesno' | 'file';
  required?: boolean;
  options?: Bilingual[];
  value?: string | number | boolean | null;
  placeholder?: Bilingual;
  hint?: Bilingual;
  existing?: boolean;           // existing procurement data vs newly collected
  showIf?: { field: string; equals: string | number | boolean }; // conditional field
}

export interface EvalCriterion {
  id: string;
  label: Bilingual;
  weight: number;               // percent, criteria sum to 100
  max: number;                  // max raw score
  score?: number | null;        // raw score entered
  comment?: string;
}

export interface CommercialLine {
  id: string;
  itemEn: string; itemAr: string;
  qty: number;
  unit: string;
  unitPrice?: number;           // SAR, visible only after bid release
}

export interface ValidationCheck {
  id: string;
  label: Bilingual;
  current: string;
  expected: string;
  outcome: 'pass' | 'fail' | 'pending';
  evidence?: string;
  remediation?: Bilingual;
}

export interface RequiredDoc {
  id: string;
  label: Bilingual;
  formats: string;              // e.g. "PDF, PNG"
  mandatory: boolean;
  uploaded?: string | null;     // file name (mock)
}

export interface ActivityEntry {
  id: string;
  kind: 'comment' | 'system' | 'decision';
  actor: Person;
  at: string;                   // ISO
  text?: string;                // comment body / decision note
  system?: Bilingual;           // system event label
  decision?: Bilingual;         // formal decision label
  anchor?: { id: string; label: Bilingual }; // review comment pinned to an RFP section/field
  replyTo?: string;             // reply to a review comment (root id)
  resolved?: boolean;           // review comment resolved by the requester
  editNote?: boolean;           // reply records an edit made to the commented field
}

/** A decision button on a task, as defined by the process task list. */
export interface TaskActionDef {
  id: 'approve' | 'reject' | 'return' | 'complete' | 'submit' | 'save-draft';
  labelEn: string; labelAr: string;
  variant: 'primary' | 'secondary' | 'danger';
  needsNote?: boolean;          // reason/comments required (Return, Reject)
  gated?: boolean;              // disabled until the task's required inputs are complete
  decision?: Bilingual;         // label recorded in the activity log (defaults by id)
}

export interface Task {
  id: string;
  type: TaskType;
  titleEn: string; titleAr: string;
  summaryEn: string; summaryAr: string;
  state: TaskState;
  priority: Priority;

  entity: RelatedEntity;
  supplier?: Bilingual;
  project?: Bilingual;
  amount?: number;              // SAR, when relevant
  requester: Person;            // who initiated the underlying record
  assignee: Person;             // current owner of the task
  department: Bilingual;        // originating / assignment department
  stageEn: string; stageAr: string; // current process stage

  receivedAt: string;           // ISO
  dueAt: string;                // ISO
  completedAt?: string;         // ISO
  decision?: Bilingual;         // recorded outcome when completed/rejected

  // Ownership routing for the inbox views
  mineAction: boolean;          // the current user is expected to act
  initiatedByMe?: boolean;      // the current user started/sent this (Sent/Waiting)

  // Workflow shape (demonstrated deterministically in the mock)
  dependsOn?: string[];         // serial: these task ids must complete first
  parallelGroup?: string;       // tasks sharing a group run in parallel
  joinNote?: Bilingual;         // next-stage join condition, for display

  actions?: TaskActionDef[];    // CTAs for this task (falls back to defaults by type)
  /** What each decision leads to (shown on the Required action tab). */
  outcomes?: { action: Bilingual; next: Bilingual; tone: 'success' | 'warning' | 'danger' | 'info' }[];
  assignTo?: Person[];          // officers the TL can assign to
  doaInfo?: { label: Bilingual; value: string }[];
  priceBreakdown?: boolean;     // show the estimated price by budget item
  reviewComments?: boolean;     // reviewer can pin comments to RFP sections/fields
  respondComments?: boolean;    // requester replies to / resolves review comments and edits commented fields
  /** Steps shown in the decision dialog ("What's next?") per action id. */
  decisionSteps?: Record<string, { titleEn: string; titleAr: string; descEn: string; descAr: string }[]>;

  // Type-specific payloads (only the one matching `type` is populated, plus
  // an optional generic completion checklist on some types).
  approvalRecord?: { label: Bilingual; value: string; emphasis?: boolean }[];
  priorApprovals?: { name: string; at: string; decision: string }[];
  requireReasonOnReject?: boolean;
  checklist?: ChecklistItem[];
  findingsLabel?: Bilingual;
  fields?: CollectField[];
  criteria?: EvalCriterion[];
  passThreshold?: number;       // percent
  commercialLines?: CommercialLine[];
  commercialReleased?: boolean;
  validationChecks?: ValidationCheck[];
  returnedBy?: Person;
  returnReason?: Bilingual;
  returnIssues?: Bilingual[];
  originalValues?: { label: Bilingual; value: string }[];
  requiredDocs?: RequiredDoc[];

  // Full RFP / request context (shown in the detail tabs) and the workflow trail.
  slaHours?: number;            // total SLA window from receivedAt
  rfp?: RfpDetail;
  trail?: TrailStep[];

  activity: ActivityEntry[];
}

/** Complete RFP / request record a task relates to — rendered in the detail tabs. */
export interface RfpDetail {
  refId: string;
  titleEn: string; titleAr: string;
  summaryEn: string; summaryAr: string;
  meta: { label: Bilingual; value: string; dir?: 'ltr' }[];
  scopeEn: string; scopeAr: string;
  /** Structured scope blocks (objectives, in/out of scope, deliverables…). */
  scopeBlocks?: { headEn: string; headAr: string; itemsEn: string[]; itemsAr: string[] }[];
  boq: {
    itemEn: string; itemAr: string; qty: string; unit: string; unitPrice: number;
    descEn?: string; descAr?: string;
    budgetEn?: string; budgetAr?: string;      // budgeted (project) item
    category?: 'Service' | 'Material';
    delivery?: string;                         // ISO date
  }[];
  payment: { stageEn: string; stageAr: string; pct: number; descEn?: string; descAr?: string; due?: string; dueAr?: string }[];
  evaluation: { criterionEn: string; criterionAr: string; weight: number; descEn?: string; descAr?: string }[];
  techPassing?: number;                        // technical passing score %
  techSplit?: number;                          // technical share of the overall score %
  techDocs?: { en: string; ar: string }[];      // additional technical documents (beyond the locked set)
  techRequirements?: { reqEn: string; reqAr: string; descEn: string; descAr: string }[];
  evalCommittee?: CommitteeMember[];
  qualification: { reqEn: string; reqAr: string; evidenceEn?: string; evidenceAr?: string }[];
  qualCriteria?: { nameEn: string; nameAr: string; pct: number; subs: { nameEn: string; nameAr: string; range: string; pct: number }[] }[];
  qualPassing?: number;
  qualCommittee?: CommitteeMember[];
  documents: { en: string; ar: string; type?: string; size?: string; by?: string }[];
}

export interface CommitteeMember { name: string; nameAr: string; roleEn: string; roleAr: string; deptEn: string; deptAr: string }

/** One step in the task's workflow trail (past, current, or upcoming). */
export interface TrailStep {
  id: string;
  titleEn: string; titleAr: string;
  actorEn: string; actorAr: string;
  at?: string;                  // ISO, for done steps
  note?: Bilingual;
  state: 'done' | 'current' | 'upcoming';
}

export type InboxView =
  | 'needs-action'
  | 'in-progress'
  | 'sent-waiting'
  | 'completed'
  | 'overdue'
  | 'all';
