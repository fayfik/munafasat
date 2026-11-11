// Cyber security review: pick up → assign to me → tick checks → approve.
(() => {
  const pickup = document.getElementById('btn-pickup');
  const assignBtn = document.getElementById('btn-assign');
  const ret = document.getElementById('btn-return');
  const approve = document.getElementById('btn-approve');
  const assignee = document.getElementById('assignee');
  const status = document.getElementById('status-label');
  const checks = [...document.querySelectorAll('.cyber-check')];
  const notes = document.getElementById('notes');
  const fill = document.getElementById('progress');
  const doneCount = document.getElementById('done-count');

  const update = () => {
    const done = checks.filter((c) => c.checked).length;
    doneCount.textContent = done;
    fill.style.width = `${(done / checks.length) * 100}%`;
    approve.disabled = done < checks.length;
    approve.title = approve.disabled ? 'Complete both checks to approve' : '';
  };

  // Picking up (or assigning yourself) claims the task and unlocks the review.
  const claim = () => {
    assignee.innerHTML =
      '<span class="person-chip"><span class="avatar t-micro">MH</span><span class="t-body">Mohammed H. (you)</span></span>';
    pickup.hidden = true;
    ret.hidden = false;
    approve.hidden = false;
    status.textContent = 'In review';
    checks.forEach((c) => { c.disabled = false; });
    notes.disabled = false;
    checks[0].focus();
    document.dispatchEvent(new CustomEvent('task:claimed'));
  };

  pickup.addEventListener('click', claim);
  assignBtn.addEventListener('click', claim);
  checks.forEach((c) => c.addEventListener('change', update));
  update();
})();
