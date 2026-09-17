/*
  Simple in-memory data layer for the prototype.
  Loads mock-data/*.json once via fetch and caches it for the session.
  NOTE: requires the app to be served over http(s), not opened as file://
  (browsers block fetch() of local files under the file: protocol).
  From the project root: `npx serve .` or `python3 -m http.server`, then
  open http://localhost:<port>/pages/dashboard.html
*/

const CURRENT_USER = {
  name: 'Ahmed Al-Mutairi',
  initials: 'AM',
  email: 'ahmed.almutairi@sidf.gov.sa',
};

// Single source of truth for status -> chart/legend color, shared by the
// donut chart, status legend and table badges (badge.css holds the
// matching background/text tint pair per status).
const STATUS_ORDER = ['Draft', 'Submitted', 'Under Review', 'Active RFP', 'Awarded'];

const STATUS_COLOR_VAR = {
  'Draft': 'var(--color-neutral-500)',
  'Submitted': 'var(--color-blue-600)',
  'Under Review': 'var(--color-warning-600)',
  'Active RFP': 'var(--color-success-600)',
  'Awarded': 'var(--color-green-700)',
};

// The 8 RFP creation wizard steps — shared by the stepper rail and the
// wizard shell's footer ("Continue: [next step name]"). `href` pages for
// steps 2-8 don't exist yet (built in later phases); this is safe because
// only completed/current steps are ever rendered as clickable, and nothing
// is completed on a fresh wizard.
const WIZARD_STEPS = [
  { id: 'basic-details', title: 'Basic details', description: 'Project, category and RFP identification', href: 'wizard-basic-details.html' },
  { id: 'boq', title: 'Bill of Quantity', description: 'Items, quantities and specifications', href: 'wizard-boq.html' },
  { id: 'scope-of-work', title: 'Scope of work', description: 'Deliverables, boundaries and standards', href: 'wizard-scope-of-work.html' },
  { id: 'payments', title: 'Payments', description: 'Payment stages and schedule', href: 'wizard-payments.html' },
  { id: 'attachments', title: 'Attachments', description: 'Required certificates and documents', href: 'wizard-attachments.html' },
  { id: 'qualification-criteria', title: 'Qualification criteria', description: 'Vendor eligibility requirements', href: 'wizard-qualification-criteria.html' },
  { id: 'technical-requirements', title: 'Technical requirements', description: 'Technical specifications and evaluation inputs', href: 'wizard-technical-requirements.html' },
  { id: 'technical-evaluation-criteria', title: 'Technical evaluation criteria', description: 'Scoring and evaluation methodology', href: 'wizard-technical-evaluation-criteria.html' },
];

const WIZARD_STORAGE_KEY = 'munafasat.wizardState';

// Ephemeral per-tab wizard state (current step, per-step status, prefilled
// form data) — kept in sessionStorage rather than mock-data/*.json since
// it's transient creation-flow UI state, not persisted backend data.
const WizardStore = (() => {
  function defaultState({ mode = 'scratch', sourceRequestId = null, formData = {} } = {}) {
    const stepStatuses = {};
    WIZARD_STEPS.forEach((step, i) => {
      stepStatuses[step.id] = i === 0 ? 'current' : 'upcoming';
    });
    return { mode, sourceRequestId, stepStatuses, formData };
  }

  function read() {
    try {
      const raw = sessionStorage.getItem(WIZARD_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function write(state) {
    sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
    return state;
  }

  function start(opts) {
    return write(defaultState(opts));
  }

  function getState() {
    return read() || start();
  }

  function setStepStatus(stepId, status) {
    const state = getState();
    state.stepStatuses[stepId] = status;
    return write(state);
  }

  function getFormData() {
    return getState().formData || {};
  }

  // Shallow-merges `patch` into formData and persists. Used on every field
  // change so a refresh (or navigating back to this step) restores values.
  function updateFormData(patch) {
    const state = getState();
    state.formData = { ...state.formData, ...patch };
    write(state);
    return state.formData;
  }

  function clear() {
    sessionStorage.removeItem(WIZARD_STORAGE_KEY);
  }

  // The stepper rail (and the footer's "Continue: <next step>" label) show
  // a variable-length step list depending on Step 1's procurement category:
  // Souq Etimad procurements only need Basic details + BOQ, every other
  // step is irrelevant to that flow. Hidden steps keep their stepStatuses
  // entry and formData untouched — this only affects what's rendered.
  function getVisibleSteps() {
    const formData = getFormData();
    if (formData.procurementCategory === 'souq-etimad') {
      return WIZARD_STEPS.filter((s) => s.id === 'basic-details' || s.id === 'boq');
    }
    return WIZARD_STEPS;
  }

  return { STEPS: WIZARD_STEPS, start, getState, setStepStatus, getFormData, updateFormData, clear, getVisibleSteps };
})();

// Fixed category list for Section 2's "Categories" field. `approverRoles` is
// stored for a future approval-routing phase — not displayed yet.
const CATEGORY_OPTIONS = [
  { name: 'Cybersecurity infrastructure', approverRoles: ['Cyber TL', 'RISK'] },
  { name: 'Network infrastructure', approverRoles: ['OP'] },
  { name: 'Software licenses', approverRoles: ['OP'] },
  { name: 'CONSULTING SERVICES', approverRoles: ['OP', 'RISK'] },
  { name: 'Managed services', approverRoles: ['OP'] },
  { name: 'Cloud services', approverRoles: ['Cyber TL', 'OP'] },
];

const DataStore = (() => {
  let rfps = null;
  let activity = null;
  let notifications = null;
  let projects = null;
  let rfpsPromise = null;
  let activityPromise = null;
  let notificationsPromise = null;
  let projectsPromise = null;
  let certificates = null;
  let technicalDocuments = null;
  let certificatesPromise = null;
  let technicalDocumentsPromise = null;

  function load(path, cacheSetter, promiseGetter, promiseSetter) {
    return async () => {
      const cached = promiseGetter();
      if (cached) return cached;
      const promise = fetch(path)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          cacheSetter(data);
          return data;
        });
      promiseSetter(promise);
      return promise;
    };
  }

  const loadRfps = load(
    '../mock-data/rfps.json',
    (data) => { rfps = data; },
    () => rfpsPromise,
    (p) => { rfpsPromise = p; }
  );

  const loadActivity = load(
    '../mock-data/activity.json',
    (data) => { activity = data; },
    () => activityPromise,
    (p) => { activityPromise = p; }
  );

  const loadNotifications = load(
    '../mock-data/notifications.json',
    (data) => { notifications = data; },
    () => notificationsPromise,
    (p) => { notificationsPromise = p; }
  );

  const loadProjects = load(
    '../mock-data/projects.json',
    (data) => { projects = data; },
    () => projectsPromise,
    (p) => { projectsPromise = p; }
  );

  async function getAllProjects() {
    return loadProjects();
  }

  async function getProjectById(id) {
    const all = await loadProjects();
    return all.find((p) => p.id === id) || null;
  }

  const loadCertificates = load(
    '../mock-data/certificates.json',
    (data) => { certificates = data; },
    () => certificatesPromise,
    (p) => { certificatesPromise = p; }
  );

  const loadTechnicalDocuments = load(
    '../mock-data/technical-documents.json',
    (data) => { technicalDocuments = data; },
    () => technicalDocumentsPromise,
    (p) => { technicalDocumentsPromise = p; }
  );

  async function getAllCertificates() {
    return loadCertificates();
  }

  async function getAllTechnicalDocuments() {
    return loadTechnicalDocuments();
  }

  async function getAllRfps() {
    return loadRfps();
  }

  async function getRfpById(id) {
    const all = await loadRfps();
    return all.find((rfp) => rfp.id === id) || null;
  }

  async function getRfpsByStatus(status) {
    const all = await loadRfps();
    return all.filter((rfp) => rfp.status === status);
  }

  async function getStatusCounts() {
    const all = await loadRfps();
    return all.reduce((counts, rfp) => {
      counts[rfp.status] = (counts[rfp.status] || 0) + 1;
      return counts;
    }, {});
  }

  async function getStatusBreakdown() {
    const all = await loadRfps();
    const total = all.length;
    const counts = await getStatusCounts();
    return STATUS_ORDER.map((status) => {
      const count = counts[status] || 0;
      return {
        status,
        count,
        percent: total ? Math.round((count / total) * 100) : 0,
        color: STATUS_COLOR_VAR[status],
      };
    });
  }

  async function getPendingApprovalRfps() {
    const all = await loadRfps();
    return all.filter((rfp) => rfp.pendingApproval);
  }

  async function getTopValueRfps(limit = 10) {
    const all = await loadRfps();
    return [...all].sort((a, b) => b.estimatedBudgetSAR - a.estimatedBudgetSAR).slice(0, limit);
  }

  async function getRecentRequests(limit = 10) {
    const all = await loadRfps();
    return [...all]
      .sort((a, b) => new Date(b.lastUpdatedDate) - new Date(a.lastUpdatedDate))
      .slice(0, limit);
  }

  async function getClosingSoonRfps(limit = 3) {
    const all = await loadRfps();
    return all
      .filter((rfp) => typeof rfp.closingSoonDaysLeft === 'number')
      .sort((a, b) => a.closingSoonDaysLeft - b.closingSoonDaysLeft)
      .slice(0, limit);
  }

  async function getKpiSnapshot() {
    const counts = await getStatusCounts();
    const pendingApproval = await getPendingApprovalRfps();
    return {
      drafts: { count: counts['Draft'] || 0, sub: '2 updated today' },
      submissions: { count: counts['Submitted'] || 0, sub: `${pendingApproval.length} awaiting approval` },
      awaitingApproval: { count: pendingApproval.length, sub: 'Requires your attention' },
      totalRfpValue: { value: 500000, sub: '10 RFPs' },
      totalPoValue: { value: 300000, sub: '200K optimized for 10 RFPs' },
    };
  }

  async function getAllActivity() {
    return loadActivity();
  }

  async function getAllNotifications() {
    return loadNotifications();
  }

  async function getUnreadNotificationCount() {
    const all = await loadNotifications();
    return all.filter((n) => !n.read).length;
  }

  async function getProjectList() {
    const all = await loadRfps();
    return [...new Set(all.map((r) => r.project))].sort();
  }

  async function deleteRfp(id) {
    const all = await loadRfps();
    rfps = all.filter((r) => r.id !== id);
    return rfps;
  }

  return {
    CURRENT_USER,
    STATUS_ORDER,
    STATUS_COLOR_VAR,
    getAllRfps,
    getRfpById,
    getRfpsByStatus,
    getStatusCounts,
    getStatusBreakdown,
    getPendingApprovalRfps,
    getTopValueRfps,
    getRecentRequests,
    getClosingSoonRfps,
    getKpiSnapshot,
    getAllActivity,
    getAllNotifications,
    getUnreadNotificationCount,
    getProjectList,
    deleteRfp,
    getAllProjects,
    getProjectById,
    getAllCertificates,
    getAllTechnicalDocuments,
    CATEGORY_OPTIONS,
  };
})();
