/*
  Table component — maps to powerappsui.com "Table".
  Pure render function: buildTableHtml({ columns, rows, compact, emptyText })
  returns an HTML string. `columns` is [{ key, label, render?(row) => html }].
  Caller is responsible for mounting the returned HTML.
*/

function buildTableHtml({ columns, rows, compact = false, emptyText = 'No requests found.', rowKey = null, emptyHtml = null }) {
  if (!rows || rows.length === 0) {
    return emptyHtml || `<div class="table-empty">${emptyText}</div>`;
  }

  const head = columns.map((col) => `<th>${col.label}</th>`).join('');
  const body = rows.map((row) => {
    const cells = columns.map((col) => {
      const content = col.render ? col.render(row) : (row[col.key] ?? '');
      return `<td class="${col.cellClass || ''}">${content}</td>`;
    }).join('');
    const rowAttr = rowKey ? ` data-row-key="${rowKey(row)}" class="row-clickable"` : '';
    return `<tr${rowAttr}>${cells}</tr>`;
  }).join('');

  return `
    <div class="table-scroll">
      <table class="data-table${compact ? ' compact' : ''}">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
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
