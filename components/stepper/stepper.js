/*
  Vertical Stepper component — maps to powerappsui.com "Stepper".
  renderVerticalStepper({ containerId, steps, statuses, onStepClick })
  `steps` = [{ id, title, description }], `statuses` = { id: 'current' |
  'completed' | 'upcoming' | 'error' }. Only 'completed' steps are
  clickable — steps must be completed in order.
*/

function renderVerticalStepper({ containerId, steps, statuses, onStepClick = () => {} }) {
  const mount = document.getElementById(containerId);
  if (!mount) return;

  mount.innerHTML = `
    <div class="stepper-rail">
      ${steps.map((step, i) => {
        const status = statuses[step.id] || 'upcoming';
        const isCompleted = status === 'completed';
        let indicatorContent = String(i + 1);
        if (isCompleted) indicatorContent = '<i class="fa-solid fa-check"></i>';
        else if (status === 'error') indicatorContent = '<i class="fa-solid fa-exclamation"></i>';

        return `
          <div class="stepper-step ${status}" data-step-id="${step.id}" title="${step.title}" ${isCompleted ? 'role="button" tabindex="0"' : ''}>
            <span class="stepper-indicator">${indicatorContent}</span>
            <div class="stepper-content">
              <div class="stepper-title">${step.title}</div>
              <div class="stepper-description">${step.description}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  mount.querySelectorAll('.stepper-step.completed').forEach((el) => {
    el.addEventListener('click', () => {
      const step = steps.find((s) => s.id === el.dataset.stepId);
      if (step) onStepClick(step);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const step = steps.find((s) => s.id === el.dataset.stepId);
        if (step) onStepClick(step);
      }
    });
  });
}
