/*
  Pagination — renders into a mount element and drives page/page-size
  changes via callbacks. Pure render + wire, no internal state of its own
  (the caller owns currentPage/pageSize so it can recompute the filtered
  row set first).
*/

function pageNumbersToShow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}

function renderPagination({ containerId, totalItems, page, pageSize, pageSizeOptions = [8, 20, 32], onPageChange, onPageSizeChange }) {
  const mount = document.getElementById(containerId);
  if (!mount) return;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const pageNums = pageNumbersToShow(currentPage, totalPages);
  let pageButtonsHtml = '';
  let prevNum = 0;
  pageNums.forEach((p) => {
    if (p - prevNum > 1) pageButtonsHtml += `<span class="pagination-ellipsis">…</span>`;
    pageButtonsHtml += `<button class="pagination-btn${p === currentPage ? ' active' : ''}" data-page="${p}">${p}</button>`;
    prevNum = p;
  });

  mount.innerHTML = `
    <div class="pagination-bar">
      <div class="pagination-summary">
        <span>${totalItems === 0 ? 'Showing 0 requests' : `Showing ${startItem}–${endItem} of ${totalItems} requests`}</span>
        <span>Page ${currentPage} of ${totalPages}</span>
        <label class="pagination-page-size">
          <span>Show</span>
          <select id="${containerId}-page-size">
            ${pageSizeOptions.map((n) => `<option value="${n}" ${n === pageSize ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="pagination-controls">
        <button class="pagination-btn" id="${containerId}-prev" ${currentPage <= 1 ? 'disabled' : ''}>Previous</button>
        ${pageButtonsHtml}
        <button class="pagination-btn" id="${containerId}-next" ${currentPage >= totalPages ? 'disabled' : ''}>Next</button>
      </div>
    </div>
  `;

  document.getElementById(`${containerId}-prev`).addEventListener('click', () => onPageChange(currentPage - 1));
  document.getElementById(`${containerId}-next`).addEventListener('click', () => onPageChange(currentPage + 1));
  mount.querySelectorAll('.pagination-btn[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => onPageChange(Number(btn.dataset.page)));
  });
  document.getElementById(`${containerId}-page-size`).addEventListener('change', (e) => onPageSizeChange(Number(e.target.value)));
}
