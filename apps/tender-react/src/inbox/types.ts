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

  activity: ActivityEntry[];
}

export type InboxView =
  | 'needs-action'
  | 'in-progress'
  | 'sent-waiting'
  | 'completed'
  | 'overdue'
  | 'all';
