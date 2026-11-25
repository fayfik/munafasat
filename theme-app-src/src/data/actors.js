// The people who act on a request, and the teams they work in.
//
// Approvals by authority (department manager, DOA, director) go straight to a
// named person. Reviews go to a team: a task lands in the team queue, a member
// picks it up, and the team lead can assign or reassign it — the same model as
// design-review-manual (Cyber Security team), applied to every reviewing team.

export const TEAMS = [
  { id: 'tech', name: 'Technical review', dept: 'PMO', steps: ['tech'], lead: 'tech' },
  { id: 'cyber', name: 'Cyber Security', dept: 'Information Security', steps: ['cyber'], lead: 'cyberlead' },
  { id: 'risk', name: 'Risk Management', dept: 'Risk Management', steps: ['bcm', 'orm'], lead: 'bcm' },
  { id: 'ea', name: 'Enterprise Architecture', dept: 'IT & Digital', steps: ['ea'], lead: 'ea' },
  { id: 'finance', name: 'Finance', dept: 'Finance', steps: ['gl', 'assets', 'qfin'], lead: 'finlead' },
  { id: 'procurement', name: 'Procurement', dept: 'Procurement', steps: ['qproc', 'officer', 'etimad'], lead: 'lead' },
];
export const teamById = (id) => TEAMS.find((t) => t.id === id) || null;
export const teamOfStep = (step) => TEAMS.find((t) => t.steps.includes(step)) || null;

// `steps` are owned personally (no queue). `load` is open work outside this prototype, for the workload view.
const P = (id, name, role, dept, extra = {}) => ({ id, name, initials: name.split(/[\s-]+/).filter((w) => !/^al$/i.test(w)).map((w) => w[0]).slice(0, 2).join('').toUpperCase(), role, dept, team: null, steps: [], load: 0, ...extra });
export const ACTORS = [
  P('requester', 'Mohammed H.', 'Requester', 'IT & Digital', { initials: 'MH', steps: ['respond'] }),
  P('dept', 'Nasser Al-Harthi', 'Department manager', 'IT & Digital', { steps: ['dept'] }),
  P('price', 'Saad Al-Malki', 'Department director', 'IT & Digital', { steps: ['price'] }),
  P('tech', 'Sara Al-Zahrani', 'Technical review lead', 'PMO', { team: 'tech', load: 2 }),
  P('tech2', 'Yousef Al-Mutairi', 'Technical reviewer', 'PMO', { team: 'tech', load: 4 }),
  P('cyberlead', 'Huda Al-Otaibi', 'Cyber Security team lead', 'Information Security', { team: 'cyber', load: 2 }),
  P('cyber', 'Noura Al-Shamrani', 'Cyber security analyst', 'Information Security', { team: 'cyber', load: 3 }),
  P('cyber2', 'Faris Al-Qahtani', 'Cyber security analyst', 'Information Security', { team: 'cyber', load: 1 }),
  P('bcm', 'Turki Al-Anazi', 'Risk team lead · BCM', 'Risk Management', { team: 'risk', load: 2 }),
  P('orm', 'Reem Al-Dossary', 'Operational risk analyst', 'Risk Management', { team: 'risk', load: 3 }),
  P('risk3', 'Ghada Al-Harbi', 'Risk analyst', 'Risk Management', { team: 'risk', load: 1 }),
  P('ea', 'Majed Al-Zahrani', 'EA team lead', 'IT & Digital', { team: 'ea', load: 3 }),
  P('ea2', 'Rawan Al-Shammari', 'Enterprise architect', 'IT & Digital', { team: 'ea', load: 2 }),
  P('finlead', 'Fahad Al-Dosari', 'Finance team lead', 'Finance', { team: 'finance', load: 3 }),
  P('gl', 'Khalid Al-Otaibi', 'Finance — GL', 'Finance', { team: 'finance', load: 3 }),
  P('assets', 'Lama Al-Subaie', 'Finance — Assets', 'Finance', { team: 'finance', load: 2 }),
  P('qfin', 'Abdulrahman Al-Shehri', 'Finance — Qualification', 'Finance', { team: 'finance', load: 4 }),
  P('lead', 'Abdullah Al-Qahtani', 'Procurement team lead · DOA', 'Procurement', { team: 'procurement', steps: ['lead', 'doa'], load: 2 }),
  P('qproc', 'Hana Al-Ghamdi', 'Procurement — Qualification', 'Procurement', { team: 'procurement', load: 3 }),
  P('officer', 'Mohammed Al-Harbi', 'Procurement officer', 'Procurement', { team: 'procurement', load: 3 }),
  P('officer2', 'Yousef Al-Harthi', 'Procurement officer', 'Procurement', { team: 'procurement', load: 5 }),
  P('officer3', 'Amal Al-Qahtani', 'Procurement officer', 'Procurement', { team: 'procurement', load: 1 }),
];
export const actorById = (id) => ACTORS.find((a) => a.id === id) || ACTORS[0];
export const membersOf = (teamId) => ACTORS.filter((a) => a.team === teamId);
export const isLead = (actor) => !!actor.team && teamById(actor.team)?.lead === actor.id;
/** Everyone who acts on tasks — the requester only creates requests. */
export const reviews = (actor) => actor.steps.some((s) => s !== 'respond') || !!actor.team;
/** Officers the Procurement team lead can hand a request to. */
export const OFFICER_IDS = ['officer', 'officer2', 'officer3'];
