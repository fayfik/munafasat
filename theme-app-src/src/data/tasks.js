// The 17 inbox tasks from the design-review. Each belongs to the actor who owns its
// `step` (see data/actors.js); `type` picks the Required-action component.

// The signed-in person now comes from state/actor.jsx (switchable in the top bar).
export const ME = { name: 'Mohammed H.', initials: 'MH', me: true };

// The approval workflow every tender request goes through (15 steps).
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
  { id: 'lead', name: 'Procurement review — Team Lead', who: 'Abdullah Al-Qahtani' },
  { id: 'officer', name: 'Procurement review — Officer', who: 'Mohammed Al-Harbi' },
  { id: 'doa', name: 'DOA approval', who: 'Abdullah Al-Qahtani' },
  { id: 'price', name: 'Estimated price approval', who: 'Saad Al-Malki' },
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
  { id: 'TSK-4433-02', req: 'REQ-4433', type: 'tech', step: 'tech', title: 'Technical evaluation review', due: '13 Nov 2026', left: '1d 18h left', hours: 42,
    hint: 'Check the technical documents, requirements and evaluation criteria. Accept each item or modify it; Approve unlocks when every item is reviewed.', actions: [RETURN, APPROVE] },
  { id: 'TSK-4433-03', req: 'REQ-4433', type: 'cyber', step: 'cyber', title: 'Cyber security review', due: '13 Nov 2026', left: '1d 18h left', hours: 42, unread: true,
    hint: 'Review the sections Cyber owns — scope, technical requirements, integrations, data classification and the cybersecurity standards. Add missing clauses from the library, then submit your review.', actions: [RETURN, A('submit', 'Submit review')] },
  { id: 'TSK-4433-04', req: 'REQ-4433', type: 'bcm', step: 'bcm', title: 'Business continuity review', due: '12 Nov 2026', left: '17h left', hours: 17,
    hint: 'Confirm business continuity applies to this service — judged by the service, not the department — then check every continuity clause and its values.', actions: [RETURN, A('submit', 'Submit review')] },
  { id: 'TSK-4433-05', req: 'REQ-4433', type: 'orm', step: 'orm', title: 'Operational risk review', due: '12 Nov 2026', left: '17h left', hours: 17,
    hint: 'A high-level confirmation: is the scope clear, what does the third-party checklist say, and are the right controls in the RFP?', actions: [RETURN, A('confirm', 'Confirm review')] },
  { id: 'TSK-4433-06', req: 'REQ-4433', type: 'ea', step: 'ea', title: 'Enterprise architecture review', due: '14 Nov 2026', left: '2d 18h left', hours: 66,
    hint: 'Review only the sections EA owns. Accept each, or comment for the requester.', actions: [RETURN, APPROVE] },
  { id: 'TSK-4433-07', req: 'REQ-4433', type: 'gl', step: 'gl', title: 'Finance review — GL', due: '12 Nov 2026', left: '18h left', hours: 18,
    hint: 'AI classified each BOQ line at creation. Accept the classification or modify it; lines that disagree come first.', actions: [RETURN, APPROVE] },
  { id: 'TSK-4429-07R', req: 'REQ-4429', type: 'glchanged', step: 'gl', title: 'Changed after your GL approval', due: '12 Nov 2026', left: '23h left', hours: 23, unread: true,
    hint: 'The request changed after you approved it. Keep your approval, or re-open your review.', actions: [A('keep', 'No re-review needed')] },
  { id: 'TSK-4433-08', req: 'REQ-4433', type: 'assets', step: 'assets', title: 'Finance review — Assets', due: '12 Nov 2026', left: '17h left', hours: 17,
    hint: 'Confirm the treatment for lines flagged as assets, then check the rest for any missed asset.', actions: [RETURN, APPROVE] },
  { id: 'TSK-4433-09', req: 'REQ-4433', type: 'qual', step: 'qfin', title: 'Qualification — Finance', due: '12 Nov 2026', left: '17h left', hours: 17,
    hint: 'Review the qualification criteria prefilled from the request. Accept each criterion or modify its range and weight; totals must be 100%.', actions: [A('complete', 'Complete')] },
  { id: 'TSK-4433-10', req: 'REQ-4433', type: 'qual', step: 'qproc', title: 'Qualification — Procurement', due: '12 Nov 2026', left: '18h left', hours: 18,
    hint: 'Review the qualification criteria prefilled from the request. Accept each criterion or modify its range and weight; totals must be 100%.', actions: [A('complete', 'Complete')] },
  { id: 'TSK-4433-11', req: 'REQ-4433', type: 'lead', step: 'lead', title: 'Procurement review — Team Lead', due: '15 Nov 2026', left: '3d 18h left', hours: 90,
    hint: 'Review the request, then either assign it to an officer (new or commented requests) or submit it for DOA approval.', actions: [A('assign', 'Assign to officer', 'secondary'), A('doa', 'Submit for DOA approval')] },
  { id: 'TSK-4433-12', req: 'REQ-4433', type: 'officer', step: 'officer', title: 'Procurement review — Officer', due: '13 Nov 2026', left: '1d 17h left', hours: 41,
    hint: 'Check the request against the officer checklist, add your comments, then submit for DOA approval or return it.', actions: [A('return', 'Return with comments', 'secondary'), A('doa', 'Submit for DOA approval')] },
  { id: 'TSK-4433-13', req: 'REQ-4433', type: 'doa', step: 'doa', title: 'DOA approval', due: '13 Nov 2026', left: '1d 17h left', hours: 41,
    hint: 'Confirm the request value is within your delegation of authority, then approve.', actions: [APPROVE] },
  { id: 'TSK-4433-14', req: 'REQ-4433', type: 'price', step: 'price', title: 'Estimated price approval', due: '13 Nov 2026', left: '1d 18h left', hours: 42,
    hint: 'Approve the estimated price by budget item before the tender is published.', actions: [APPROVE] },
];

export const taskById = (id) => TASKS.find((t) => t.id === id);

// What happens after each decision (shown in the confirmation dialog).
export function nextSteps(task, action, request) {
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
      ['Officer review', 'The officer checks the request against the procurement checklist.'],
      ['Back to you', 'You submit it for DOA approval once the officer is done.'],
    ];
    case 'doa': return [
      ['DOA approval', `Goes to ${WORKFLOW.find((s) => s.id === 'doa').who} for delegation-of-authority approval.`],
      ['Then', 'Estimated price approval · Saad Al-Malki'],
    ];
    default: return [
      ['Moves on', next ? `${next.name} · ${next.who}` : 'Ready for publishing on Etimad.'],
      ['Requester notified', `${who} can follow progress in My Requests.`],
    ];
  }
}

export const ACTION_PAST = { approve: 'approved', return: 'returned', reject: 'rejected', submit: 'review submitted', confirm: 'review confirmed', keep: 'approval kept', complete: 'completed', assign: 'assigned to officer', doa: 'submitted for DOA approval' };
