// The people who act on a request. Each owns one or more workflow steps; the
// prototype lets you switch between them to see each person's own inbox.
export const ACTORS = [
  { id: 'requester', name: 'Mohammed H.', initials: 'MH', role: 'Requester', dept: 'IT & Digital', group: 'Requests', steps: [] },
  { id: 'dept', name: 'Nasser Al-Harthi', initials: 'NH', role: 'Department manager', dept: 'IT & Digital', group: 'Approvals', steps: ['dept'] },
  { id: 'price', name: 'Saad Al-Malki', initials: 'SM', role: 'Estimated price approver', dept: 'Finance', group: 'Approvals', steps: ['price'] },
  { id: 'tech', name: 'Sara Al-Zahrani', initials: 'SZ', role: 'Technical member', dept: 'PMO', group: 'Specialist reviews', steps: ['tech'] },
  { id: 'cyber', name: 'Noura Al-Shamrani', initials: 'NS', role: 'Cyber security', dept: 'Information Security', group: 'Specialist reviews', steps: ['cyber'] },
  { id: 'bcm', name: 'Turki Al-Anazi', initials: 'TA', role: 'Enterprise risk (BCM)', dept: 'Risk Management', group: 'Specialist reviews', steps: ['bcm'] },
  { id: 'orm', name: 'Reem Al-Dossary', initials: 'RD', role: 'Operational risk', dept: 'Risk Management', group: 'Specialist reviews', steps: ['orm'] },
  { id: 'ea', name: 'Majed Al-Zahrani', initials: 'MZ', role: 'Enterprise architecture', dept: 'IT & Digital', group: 'Specialist reviews', steps: ['ea'] },
  { id: 'gl', name: 'Khalid Al-Otaibi', initials: 'KO', role: 'Finance — GL', dept: 'Finance', group: 'Finance', steps: ['gl'] },
  { id: 'assets', name: 'Lama Al-Subaie', initials: 'LS', role: 'Finance — Assets', dept: 'Finance', group: 'Finance', steps: ['assets'] },
  { id: 'qfin', name: 'Abdulrahman Al-Shehri', initials: 'AS', role: 'Qualification — Finance', dept: 'Finance', group: 'Qualification', steps: ['qfin'] },
  { id: 'qproc', name: 'Hana Al-Ghamdi', initials: 'HG', role: 'Qualification — Procurement', dept: 'Procurement', group: 'Qualification', steps: ['qproc'] },
  { id: 'lead', name: 'Abdullah Al-Qahtani', initials: 'AQ', role: 'Procurement team lead · DOA', dept: 'Procurement', group: 'Procurement', steps: ['lead', 'doa'] },
  { id: 'officer', name: 'Mohammed Al-Harbi', initials: 'MA', role: 'Procurement officer', dept: 'Procurement', group: 'Procurement', steps: ['officer'] },
];
export const actorById = (id) => ACTORS.find((a) => a.id === id) || ACTORS[0];
export const actorForTask = (task) => ACTORS.find((a) => a.steps.includes(task.step)) || ACTORS[0];
export const ownsTask = (actor, task) => actor.steps.includes(task.step);
