// The inbox tasks from the design-review. Approvals by authority belong to the person
// who owns the `step`; review steps belong to a team (data/actors.js) and `assignee` is
// who holds the task at the start — null means it waits in the team queue.
// `type` picks the Required-action component.

// The signed-in person now comes from state/actor.jsx (switchable in the top bar).
export const ME = { name: 'Mohammed H.', initials: 'MH', me: true };

// The approval workflow every tender request goes through, up to publishing in Etimad.
// `who` is the default person; team steps show whoever picked the task up (see lib/assign.js).
export const WORKFLOW = [
  { id: 'submitted', name: 'Request submitted' },
  { id: 'dept', name: 'Department approval', who: 'Nasser Al-Harthi' },
  { id: 'tech', name: 'Technical member review', who: 'Sara Al-Zahrani' },
  { id: 'cyber', name: 'Cyber Security', group: 'spec', who: 'Noura Al-Shamrani' },
  { id: 'bcm', name: 'Enterprise Risk (BCM)', group: 'spec', who: 'Turki Al-Anazi' },
  { id: 'orm', name: 'Operational Risk', group: 'spec', who: 'Reem Al-Dossary' },
  { id: 'ea', name: 'Enterprise Architecture', group: 'spec', who: 'Majed Al-Zahrani' },
  { id: 'gl', name: 'Finance review — GL', who: 'Khalid Al-Otaibi' },
  { id: 'assets', name: 'Finance review — Assets', who: 'Lama Al-Subaie' },
  { id: 'qfin', name: 'Qualification — Finance', who: 'Abdulrahman Al-Shehri' },
  { id: 'qproc', name: 'Qualification — Procurement', who: 'Hana Al-Ghamdi' },
  { id: 'lead', name: 'Procurement method — Team Lead', who: 'Abdullah Al-Qahtani' },
  { id: 'officer', name: 'Procurement review — Officer', who: 'Mohammed Al-Harbi' },
  { id: 'doa', name: 'DOA approval', who: 'Abdullah Al-Qahtani' },
  { id: 'price', name: 'Estimated price approval', who: 'Saad Al-Malki · Director' },
  { id: 'etimad', name: 'Create in Etimad', who: 'Mohammed Al-Harbi' },
];

const A = (id, label, variant = 'primary', extra = {}) => ({ id, label, variant, ...extra });
const APPROVE = A('approve', 'Approve');
const RETURN = A('return', 'Return', 'secondary');
const REJECT = A('reject', 'Reject', 'danger');

export const TASKS = [
  { id: 'TSK-4478-01', req: 'REQ-4478', type: 'dept', step: 'dept', title: 'Department approval', due: '11 Nov 2026', left: '1d 0h left', hours: 24, unread: true,
    hint: 'Khalid Al-Qahtani submitted this request. Review it, comment on any section or field, then approve, return or reject.', actions: [REJECT, RETURN, APPROVE] },
  { id: 'TSK-4471-01', req: 'REQ-4471', type: 'dept', step: 'dept', title: 'Department approval', due: '11 Nov 2026', left: '23h left', hours: 23, unread: true,
    hint: 'Fatima Al-Zahrani submitted this request. Review it, comment on any section or field, then approve, return or reject.', actions: [REJECT, RETURN, APPROVE] },
  { id: 'TSK-4433-01', req: 'REQ-4433', type: 'dept', step: 'dept', title: 'Department approval', due: '11 Nov 2026', left: '17h left', hours: 17, unread: true,
    hint: 'Ibrahim Al-Rashid submitted this request. Review it, comment on any section or field, then approve, return or reject.', actions: [REJECT, RETURN, APPROVE] },
  { id: 'TSK-4433-02', assignee: 'tech', req: 'REQ-4433', type: 'tech', step: 'tech', title: 'Technical evaluation review', due: '13 Nov 2026', left: '1d 18h left', hours: 42,
    hint: 'Check the technical documents, requirements and evaluation criteria. Accept each item or modify it; Approve unlocks when every item is reviewed.', actions: [RETURN, APPROVE] },
  { id: 'TSK-4433-03', assignee: null, req: 'REQ-4433', type: 'cyber', step: 'cyber', title: 'Cyber security review', due: '13 Nov 2026', left: '1d 18h left', hours: 42, unread: true,
    hint: 'Review the sections Cyber owns — scope, technical requirements, integrations, data classification and the cybersecurity standards. Add missing clauses from the library, then submit your review.', actions: [RETURN, A('submit', 'Submit review')] },
  { id: 'TSK-4433-04', assignee: 'bcm', req: 'REQ-4433', type: 'bcm', step: 'bcm', title: 'Business continuity review', due: '12 Nov 2026', left: '17h left', hours: 17,
    hint: 'Confirm business continuity applies to this service — judged by the service, not the department — then check every continuity clause and its values.', actions: [RETURN, A('submit', 'Submit review')] },
  { id: 'TSK-4433-05', assignee: 'orm', req: 'REQ-4433', type: 'orm', step: 'orm', title: 'Operational risk review', due: '12 Nov 2026', left: '17h left', hours: 17,
    hint: 'A high-level confirmation: is the scope clear, what does the third-party checklist say, and are the right controls in the RFP?', actions: [RETURN, A('confirm', 'Confirm review')] },
  { id: 'TSK-4433-06', assignee: null, req: 'REQ-4433', type: 'ea', step: 'ea', title: 'Enterprise architecture review', due: '14 Nov 2026', left: '2d 18h left', hours: 66,
    hint: 'Review only the sections EA owns. Accept each, or comment for the requester.', actions: [RETURN, APPROVE] },
  { id: 'TSK-4433-07', assignee: 'gl', req: 'REQ-4433', type: 'gl', step: 'gl', title: 'Finance review — GL', due: '12 Nov 2026', left: '18h left', hours: 18,
    hint: 'AI classified each BOQ line at creation. Accept the classification or modify it; lines that disagree come first.', actions: [RETURN, APPROVE] },
  { id: 'TSK-4429-07R', assignee: 'gl', req: 'REQ-4429', type: 'glchanged', step: 'gl', title: 'Changed after your GL approval', due: '12 Nov 2026', left: '23h left', hours: 23, unread: true,
    hint: 'The request changed after you approved it. Keep your approval, or re-open your review.', actions: [A('keep', 'No re-review needed')] },
  { id: 'TSK-4433-08', assignee: null, req: 'REQ-4433', type: 'assets', step: 'assets', title: 'Finance review — Assets', due: '12 Nov 2026', left: '17h left', hours: 17,
    hint: 'Confirm the treatment for lines flagged as assets, then check the rest for any missed asset.', actions: [RETURN, APPROVE] },
  { id: 'TSK-4433-09', assignee: 'qfin', req: 'REQ-4433', type: 'finqual', step: 'qfin', title: 'Qualification — Finance', due: '12 Nov 2026', left: '17h left', hours: 17,
    hint: 'Review the financial criteria the requester entered — liquidity and cash ratio ranges and weights — adjust them for the project profile and set the passing percentage.', actions: [A('complete', 'Complete')] },
  { id: 'TSK-4433-10', assignee: 'qproc', req: 'REQ-4433', type: 'procqual', step: 'qproc', title: 'Qualification — Procurement', due: '12 Nov 2026', left: '18h left', hours: 18,
    hint: 'Review the qualification criteria the requester set. Accept each one, or comment where it is out of line with the project size or shuts out SMEs.', actions: [RETURN, A('approve', 'Confirm criteria')] },
  { id: 'TSK-4433-11', req: 'REQ-4433', type: 'method', step: 'lead', title: 'Procurement method — Team Lead', due: '15 Nov 2026', left: '3d 18h left', hours: 90,
    hint: 'Set how this request goes to market — contract type and envelope — confirm the project priority, and assign an officer.', actions: [A('assign', 'Assign to officer')] },
  { id: 'TSK-4433-12', assignee: 'officer', req: 'REQ-4433', type: 'confirm', step: 'officer', title: 'Procurement review — Officer', due: '13 Nov 2026', left: '1d 17h left', hours: 41,
    hint: 'Review everything on the request, including the Team Lead’s method and priority. Confirm the estimated contract value and duration, then mark it good to go.', actions: [A('return', 'Return with comments', 'secondary'), A('approve', 'Good to go')] },
  { id: 'TSK-4433-13', req: 'REQ-4433', type: 'doa', step: 'doa', title: 'DOA approval', due: '13 Nov 2026', left: '1d 17h left', hours: 41,
    hint: 'Confirm the request value is within your delegation of authority, then approve.', actions: [APPROVE] },
  { id: 'TSK-4433-14', req: 'REQ-4433', type: 'price', step: 'price', title: 'Estimated price approval', due: '13 Nov 2026', left: '1d 18h left', hours: 42,
    hint: 'Approve the estimated price as Director of IT & Digital. After your approval the Procurement Officer creates the request in Etimad.', actions: [APPROVE] },
  { id: 'TSK-4433-15', assignee: 'officer', req: 'REQ-4433', type: 'etimad', step: 'etimad', title: 'Create in Etimad', due: '15 Nov 2026', left: '3d 17h left', hours: 89,
    hint: 'The request and its estimated price are approved. Create the competition in Etimad with the approved settings and record the Etimad reference.', actions: [A('publish', 'Mark as published')] },
];

/* The requester's "Respond to review comments" task appears when a reviewer returns a request
   (state.responds, set by the store) and goes back to the reviewer on resubmit. */
export const RESUBMIT = A('resubmit', 'Resubmit request');
export function respondTasks(state) {
  return Object.entries(state?.responds || {}).map(([req, r]) => {
    const from = TASKS.find((t) => t.id === r.from);
    return { id: `RSP-${req.replace('REQ-', '')}`, req, type: 'respond', step: 'respond', title: 'Respond to review comments', due: r.due, left: '2d left', hours: 48, unread: true,
      from: r.from, fromTitle: from?.title, note: r.note, returnedAt: r.at,
      hint: 'A reviewer returned this request. Reply to or resolve each comment, change the commented fields, then resubmit.', actions: [RESUBMIT] };
  });
}
export const allTasks = (state) => [...TASKS, ...respondTasks(state)];
export const taskById = (id, state) => TASKS.find((t) => t.id === id) || respondTasks(state).find((t) => t.id === id);

// What happens after each decision (shown in the confirmation dialog).
export function nextSteps(task, action, request) {
  if (action === 'resubmit') {
    const from = TASKS.find((t) => t.id === task.from);
    return [
      ['Back to the reviewer', `${from?.title || 'The reviewer'} gets the request again, marked as resubmitted.`],
      ['They check your changes', 'Your replies, resolved comments and edited fields are shown with the request.'],
      ['Then', 'The approval continues from where it was returned.'],
    ];
  }
  const idx = WORKFLOW.findIndex((s) => s.id === task.step);
  const next = WORKFLOW.slice(idx + 1).find((s) => !(WORKFLOW[idx].group && s.group === WORKFLOW[idx].group)) || null;
  const who = request.requester.name;
  const n = request.id.replace('REQ-', '#');
  switch (action) {
    case 'return': return [
      ['Back to the requester', `A “Review comments for request ${n}” task is created for ${who}.`],
      ['Requester responds', 'They reply to and resolve each comment, and edit only the commented fields.'],
      ['Back to you', 'Once every comment is resolved the request is resubmitted to you.'],
    ];
    case 'reject': return [
      ['Request closed', `Request ${n} is rejected and closed.`],
      ['Requester notified', `${who} receives your rejection reason.`],
    ];
    case 'submit': case 'confirm': return [
      ['Your review is recorded', 'Accepted items and your comments are saved with the request.'],
      ['Parallel reviews finish', 'The four specialist reviews (Cyber, BCM, Operational Risk, EA) run side by side.'],
      ['Then', `${next ? next.name : 'The next step'} · ${next?.who || ''}`.trim()],
    ];
    case 'keep': return [
      ['Your approval stands', 'The changes are noted; your GL classification stays as approved.'],
      ['Request continues', `${next ? `${next.name} · ${next.who}` : 'Next step'}`],
    ];
    case 'assign': return [
      ['Officer review', 'The officer you picked reviews everything and confirms the value and duration.'],
      ['Then', 'DOA approval · Abdullah Al-Qahtani, then the director approves the estimated price.'],
    ];
    case 'complete': return task.type === 'finqual' ? [
      ['Financial criteria set', 'Your ranges, weights and passing percentage are saved with the request. Requesters don’t see them.'],
      ['Then', 'Qualification — Procurement reviews the criteria'],
    ] : [['Moves on', next ? `${next.name} · ${next.who}` : 'Next step']];
    case 'publish': return [
      ['Published in Etimad', `Request ${n} shows the Etimad reference on every view.`],
      ['Requester notified', `${who} sees that the tender is live in My Requests.`],
    ];
    default: return [
      ['Moves on', next ? `${next.name} · ${next.who}` : 'Ready for publishing on Etimad.'],
      ['Requester notified', `${who} can follow progress in My Requests.`],
    ];
  }
}

export const ACTION_PAST = { resubmit: 'resubmitted', approve: 'approved', return: 'returned', reject: 'rejected', submit: 'review submitted', confirm: 'review confirmed', keep: 'approval kept', complete: 'completed', assign: 'assigned to officer', doa: 'submitted for DOA approval', publish: 'published in Etimad' };
