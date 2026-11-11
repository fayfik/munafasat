// Shared inbox data — used by both test variants:
//   A · split view   (theme/index.html, department-approval.html, cyber-review.html)
//   B · table + page (theme/list/)
// Only REQ-4478 and REQ-4433 have a working detail page for now.
window.MUNAFASAT_TASKS = [
  {
    id: 'REQ-4478', task: 'Manager approval', project: 'SIEM & SOC Managed Services', amount: 'SAR 5,400,000',
    status: 'pending', type: 'Tender', department: 'Information Security',
    requester: { name: 'Khalid Al-Qahtani', initials: 'KA' },
    received: '09 Nov 2026', receivedSort: '2026-11-09T22:06', due: '1d left', dueHours: 24, unread: true,
    group: 'today', split: 'department-approval.html', page: 'req-4478.html'
  },
  {
    id: 'REQ-4471', task: 'Manager approval', project: 'Cloud Infrastructure Migration', amount: 'SAR 1,800,000',
    status: 'pending', type: 'Tender', department: 'IT & Digital Transformation',
    requester: { name: 'Fatima Al-Zahrani', initials: 'FZ' },
    received: '09 Nov 2026', receivedSort: '2026-11-09T18:40', due: '1d left', dueHours: 26, unread: true,
    group: 'today'
  },
  {
    id: 'REQ-4429', task: 'Changed after your GL approval', project: 'Data Center Network Refresh', amount: 'SAR 1,500,000',
    status: 'pending', type: 'Tender', department: 'IT & Digital Transformation',
    requester: { name: 'Ibrahim Al-Rashid', initials: 'IA' },
    received: '10 Nov 2026', receivedSort: '2026-11-10T09:12', due: '11h left', dueHours: 11, unread: false,
    group: 'today'
  },
  {
    id: 'REQ-4466', task: 'Finance review — GL', project: 'Data Center UPS Replacement', amount: 'SAR 1,120,000',
    status: 'pending', type: 'Tender', department: 'IT & Digital Transformation',
    requester: { name: 'Fatima Al-Zahrani', initials: 'FZ' },
    received: '08 Nov 2026', receivedSort: '2026-11-08T11:30', due: '12h left', dueHours: 12, unread: false,
    group: 'today'
  },
  {
    id: 'REQ-4433', task: 'Cyber security review', project: 'Core ERP Modernization', amount: 'SAR 9,940,000',
    status: 'unassigned', type: 'Tender', department: 'IT & Digital',
    requester: { name: 'Ibrahim Al-Rashid', initials: 'IA' },
    received: '10 Nov 2026', receivedSort: '2026-11-10T08:05', due: '1d 12h left', dueHours: 36, unread: true,
    group: 'week', split: 'cyber-review.html', page: 'req-4433.html'
  },
  {
    id: 'REQ-4458', task: 'Manager approval', project: 'Network Security Equipment Refresh', amount: 'SAR 980,000',
    status: 'pending', type: 'Tender', department: 'Information Security',
    requester: { name: 'Mohammed Al-Otaibi', initials: 'MO' },
    received: '10 Nov 2026', receivedSort: '2026-11-10T14:20', due: '2d left', dueHours: 48, unread: false,
    group: 'week'
  },
  {
    id: 'REQ-4418', task: 'Manager approval', project: 'Ergonomic Office Chairs (300)', amount: 'SAR 210,000',
    status: 'pending', type: 'Etimad E-Market', department: 'Facilities & Services',
    requester: { name: 'Mohammed Al-Otaibi', initials: 'MO' },
    received: '07 Nov 2026', receivedSort: '2026-11-07T10:00', due: '3d left', dueHours: 72, unread: false,
    group: 'week'
  }
];

window.MUNAFASAT_STATUS = {
  pending: 'Pending your decision',
  unassigned: 'Unassigned',
  review: 'In review',
  approved: 'Approved',
  returned: 'Returned',
  rejected: 'Rejected'
};

// Decisions made in variant B during this browser session (so the list reflects them).
window.MUNAFASAT_DECISIONS = (() => {
  const KEY = 'munafasat-decisions';
  let store = {};
  try { store = JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (e) { store = {}; }
  return {
    all: () => store,
    get: (id) => store[id],
    remove: (id) => { delete store[id]; try { sessionStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} },
    set: (id, action) => { store[id] = action; try { sessionStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} },
    clear: () => { store = {}; try { sessionStorage.removeItem(KEY); } catch (e) {} }
  };
})();
