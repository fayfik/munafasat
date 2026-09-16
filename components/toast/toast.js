/* Toast — showToast(message) renders a small auto-dismissing confirmation. */

function ensureToastStack() {
  let stack = document.getElementById('toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toast-stack';
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  return stack;
}

function showToast(message, duration = 3000) {
  const stack = ensureToastStack();
  const item = document.createElement('div');
  item.className = 'toast-item';
  item.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>${message}</span>`;
  stack.appendChild(item);

  requestAnimationFrame(() => item.classList.add('show'));

  setTimeout(() => {
    item.classList.remove('show');
    setTimeout(() => item.remove(), 200);
  }, duration);
}
