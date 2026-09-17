/*
  Table component — maps to powerappsui.com "Table".
  Pure render function: buildTableHtml({ columns, rows, compact, emptyText })
  returns an HTML string. `columns` is [{ key, label, render?(row) => html }].
  Caller is responsible for mounting the returned HTML.

  Opt-in column resizing: pass `resizable: true` and a unique `tableId`, then
  call `enableColumnResize(tableId, widths)` once the HTML is in the DOM —
  `widths` is a plain object the caller owns (e.g. `{ 0: 180, 3: 220 }`,
  keyed by column index) that the drag handler both reads (to restore sizes
  across re-renders) and writes (as the user drags), so persistence across
  a full re-render is the caller's responsibility, not this component's.
*/

function buildTableHtml({ columns, rows, compact = false, emptyText = 'No requests found.', rowKey = null, emptyHtml = null, resizable = false, tableId = null, columnWidths = null }) {
  if (!rows || rows.length === 0) {
    return emptyHtml || `<div class="table-empty">${emptyText}</div>`;
  }

  const head = columns.map((col, i) => `
    <th>
      <span class="th-label">${col.label}</span>
      ${resizable ? `<span class="col-resize-handle" data-col-idx="${i}"></span>` : ''}
    </th>
  `).join('');
  const body = rows.map((row) => {
    const cells = columns.map((col) => {
      const content = col.render ? col.render(row) : (row[col.key] ?? '');
      return `<td class="${col.cellClass || ''}">${content}</td>`;
    }).join('');
    const rowAttr = rowKey ? ` data-row-key="${rowKey(row)}" class="row-clickable"` : '';
    return `<tr${rowAttr}>${cells}</tr>`;
  }).join('');

  const colgroup = resizable
    ? `<colgroup>${columns.map((_, i) => `<col${columnWidths && columnWidths[i] ? ` style="width:${columnWidths[i]}px;"` : ''}>`).join('')}</colgroup>`
    : '';

  return `
    <div class="table-scroll">
      <table class="data-table${compact ? ' compact' : ''}${resizable ? ' resizable-table' : ''}"${tableId ? ` id="${tableId}"` : ''}>
        ${colgroup}
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

/*
  Wires drag-to-resize on every `.col-resize-handle` inside table `tableId`.
  `widths` is mutated in place as the user drags, so the caller can pass the
  same object into the next buildTableHtml() call to keep sizes across a
  re-render. Safe to call repeatedly after every re-render (each call only
  wires the handles currently in the DOM).
*/
function enableColumnResize(tableId, widths) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const cols = table.querySelectorAll(':scope > colgroup > col');

  table.querySelectorAll('.col-resize-handle').forEach((handle) => {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const idx = Number(handle.dataset.colIdx);
      const col = cols[idx];
      const th = handle.closest('th');
      if (!col || !th) return;
      const startX = e.clientX;
      const startWidth = th.getBoundingClientRect().width;
      handle.classList.add('active');

      function onMove(ev) {
        const next = Math.max(60, Math.round(startWidth + (ev.clientX - startX)));
        col.style.width = `${next}px`;
        widths[idx] = next;
      }
      function onUp() {
        handle.classList.remove('active');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

function requestDetailHref(id) {
  return `request-detail.html?id=${encodeURIComponent(id)}`;
}

function formatDate(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatSAR(amount) {
  return `${amount.toLocaleString('en-US')} SAR`;
}
