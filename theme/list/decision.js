// Variant B · a decision on the detail page returns to the inbox list.
document.querySelectorAll('[data-decision]').forEach((btn) => btn.addEventListener('click', () => {
  if (btn.disabled) return;
  const id = document.body.dataset.taskId;
  location.href = `index.html?done=${encodeURIComponent(id)}&action=${encodeURIComponent(btn.dataset.decision)}`;
}));
