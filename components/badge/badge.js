/*
  Badge component helpers — maps to powerappsui.com "Badge".
  Pure render functions (no mount point) so other components can compose them inline.
*/

function renderCountBadge(count) {
  if (!count || count <= 0) return '';
  const display = count > 99 ? '99+' : String(count);
  return `<span class="badge">${display}</span>`;
}

const STATUS_BADGE_CLASS = {
  'Draft': 'badge-status-draft',
  'Submitted': 'badge-status-submitted',
  'Under Review': 'badge-status-under-review',
  'Active RFP': 'badge-status-active',
  'Awarded': 'badge-status-awarded',
};

function renderStatusBadge(status) {
  const cls = STATUS_BADGE_CLASS[status] || 'badge-status-draft';
  return `<span class="badge badge-status ${cls}">${status}</span>`;
}

const APPROVAL_CHIP_CLASS = {
  'Draft': 'badge-chip-draft',
  'Submitted': 'badge-chip-submitted',
  'Approved': 'badge-chip-approved',
  'Rejected': 'badge-chip-rejected',
};

function renderApprovalChip(approvalStatus) {
  const cls = APPROVAL_CHIP_CLASS[approvalStatus] || 'badge-chip-draft';
  return `<span class="badge badge-chip ${cls}">${approvalStatus}</span>`;
}
