import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

type DocAT = jsPDF & { autoTable: (opts: Record<string, unknown>) => void; lastAutoTable: { finalY: number } };

/** Structured data for the downloadable RFP document. */
export interface RfpPdfData {
  requestNo: string;
  submittedAt: string;       // ISO
  projectName: string;
  deptName: string;
  projectCode?: string;
  email: string;
  sourceLabel: string;
  subtotal: number; vat: number; grandTotal: number;
  purpose?: string;
  scopeOfWork?: string;
  scopeTerms?: string;
  executionLocation?: string;
  startDate?: string;
  duration?: string;
  boq: { name: string; category: string; qty: number | string; unitPrice: number; total: number }[];
  payments: { name: string; pct: number; amount: number; start?: string; duration?: string }[];
  techDocs: string[];
  techRequirements: { requirement: string; description: string }[];
  evalCriteria: { description: string; howApplied: string; weight: number }[];
  passingPct?: string;
  qualCriteria: { name: string; percentage: number; subs: { name: string; range: string; percentage: number }[] }[];
  techCommittee: string[];
  qualCommittee: string[];
  attachments: string[];
}

// Brand greens (from the design system).
const GREEN: [number, number, number] = [63, 93, 39];      // brand-800
const GREEN_MID: [number, number, number] = [105, 152, 67]; // brand-600
const GREEN_LIGHT: [number, number, number] = [238, 244, 232]; // brand-50
const INK: [number, number, number] = [27, 31, 25];
const MUTED: [number, number, number] = [134, 141, 128];
const LINE: [number, number, number] = [231, 234, 227];

const money = (n: number) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const money0 = (n: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(n || 0);

export function downloadRfpPdf(d: RfpPdfData) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' }) as DocAT;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const CW = W - M * 2;

  const date = new Date(d.submittedAt);
  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  /* ── Header band ─────────────────────────────────────────────── */
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 92, 'F');
  doc.setFillColor(...GREEN_MID);
  doc.rect(0, 92, W, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('SIDF  ·  MUNAFASAT', M, 30);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.setTextColor(214, 226, 203);
  doc.text('REQUEST FOR PROPOSAL', M, 48);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(d.requestNo, M, 74);

  // Right side: status pill + date
  const pillW = 74, pillH = 18, pillX = W - M - pillW, pillY = 22;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pillX, pillY, pillW, pillH, 9, 9, 'F');
  doc.setTextColor(...GREEN);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('SUBMITTED', pillX + pillW / 2, pillY + 12, { align: 'center' });
  doc.setTextColor(214, 226, 203); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text(`${dateStr}  ·  ${timeStr}`, W - M, 58, { align: 'right' });

  let y = 120;

  /* ── Project title ───────────────────────────────────────────── */
  doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text(doc.splitTextToSize(d.projectName, CW), M, y);
  y += 20;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...MUTED);
  doc.text(`${d.deptName}${d.projectCode ? '  ·  ' + d.projectCode : ''}  ·  ${d.sourceLabel}`, M, y);
  y += 20;

  /* ── Stat boxes ──────────────────────────────────────────────── */
  const stats = [
    ['TOTAL VALUE', d.subtotal > 0 ? `SAR ${money0(d.subtotal)}` : '—'],
    ['GRAND TOTAL (incl. VAT)', d.grandTotal > 0 ? `SAR ${money0(d.grandTotal)}` : '—'],
    ['PAYMENT MILESTONES', `${d.payments.length} stages`],
  ];
  const gap = 10;
  const boxW = (CW - gap * 2) / 3;
  stats.forEach(([label, value], i) => {
    const x = M + i * (boxW + gap);
    doc.setFillColor(...GREEN_LIGHT);
    doc.roundedRect(x, y, boxW, 46, 6, 6, 'F');
    doc.setTextColor(...MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    doc.text(label, x + 12, y + 17);
    doc.setTextColor(...GREEN); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text(value, x + 12, y + 35);
  });
  y += 46 + 22;

  /* ── Helpers ─────────────────────────────────────────────────── */
  function ensure(space: number) {
    if (y + space > H - 56) { doc.addPage(); y = 56; }
  }
  function sectionTitle(title: string) {
    ensure(40);
    doc.setFillColor(...GREEN); doc.rect(M, y - 9, 3, 12, 'F');
    doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(title.toUpperCase(), M + 10, y);
    y += 16;
  }
  function paragraph(text: string) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(71, 77, 67);
    const lines = doc.splitTextToSize(text, CW) as string[];
    for (const ln of lines) {
      ensure(14);
      doc.text(ln, M, y);
      y += 13;
    }
    y += 8;
  }
  function afterTable() { y = doc.lastAutoTable.finalY + 20; }
  const tableBase = {
    theme: 'grid' as const,
    headStyles: { fillColor: GREEN, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 5, textColor: INK, lineColor: LINE, lineWidth: 0.5 },
    alternateRowStyles: { fillColor: [249, 250, 247] as [number, number, number] },
    margin: { left: M, right: M },
  };

  /* ── Purpose ─────────────────────────────────────────────────── */
  if (d.purpose) { sectionTitle('Purpose'); paragraph(d.purpose); }

  /* ── Scope of work ───────────────────────────────────────────── */
  if (d.scopeOfWork) {
    sectionTitle('Scope of Work');
    paragraph(d.scopeOfWork);
    if (d.scopeTerms) { doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...MUTED); ensure(14); doc.text('Scope-specific terms & conditions', M, y); y += 13; paragraph(d.scopeTerms); }
  }

  /* ── Contract ────────────────────────────────────────────────── */
  if (d.startDate || d.duration || d.executionLocation) {
    sectionTitle('Contract Duration & Location');
    const bits: string[] = [];
    if (d.startDate) bits.push(`Start date: ${d.startDate}`);
    if (d.duration) bits.push(`Duration: ${d.duration}`);
    if (bits.length) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(71, 77, 67); ensure(14); doc.text(bits.join('      '), M, y); y += 15; }
    if (d.executionLocation) paragraph(`Location: ${d.executionLocation}`);
  }

  /* ── Bill of Quantities ──────────────────────────────────────── */
  if (d.boq.length) {
    sectionTitle('Bill of Quantities');
    ensure(60);
    doc.autoTable({
      ...tableBase, startY: y,
      head: [['Item', 'Category', 'Qty', 'Unit price', 'Total (SAR)']],
      body: d.boq.map((r) => [r.name || '—', r.category, String(r.qty || '—'), r.unitPrice > 0 ? money(r.unitPrice) : '—', r.total > 0 ? money(r.total) : '—']),
      foot: [
        ['', '', '', 'Subtotal', money(d.subtotal)],
        ['', '', '', 'VAT (15%)', money(d.vat)],
        ['', '', '', 'Grand total', `SAR ${money(d.grandTotal)}`],
      ],
      footStyles: { fillColor: [249, 250, 247], textColor: INK, fontStyle: 'bold', fontSize: 8.5 },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    });
    afterTable();
  }

  /* ── Payment schedule ────────────────────────────────────────── */
  if (d.payments.length) {
    sectionTitle('Payment Schedule');
    ensure(60);
    doc.autoTable({
      ...tableBase, startY: y,
      head: [['#', 'Stage', '%', 'Amount (SAR)', 'Start', 'Duration']],
      body: d.payments.map((p, i) => [String(i + 1), p.name || '—', `${p.pct}%`, p.amount > 0 ? money(p.amount) : '—', p.start || '—', p.duration || '—']),
      columnStyles: { 0: { cellWidth: 24, halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    });
    afterTable();
  }

  /* ── Technical documents ─────────────────────────────────────── */
  if (d.techDocs.length) {
    sectionTitle('Technical Documents');
    paragraph(d.techDocs.map((x) => '•  ' + x).join('\n'));
  }

  /* ── Technical requirements ──────────────────────────────────── */
  if (d.techRequirements.length) {
    sectionTitle('Technical Requirements');
    ensure(60);
    doc.autoTable({
      ...tableBase, startY: y,
      head: [['#', 'Requirement', 'Description']],
      body: d.techRequirements.map((r, i) => [String(i + 1), r.requirement || '—', r.description || '—']),
      columnStyles: { 0: { cellWidth: 24, halign: 'center' }, 1: { cellWidth: 130 } },
    });
    afterTable();
  }

  /* ── Evaluation criteria ─────────────────────────────────────── */
  if (d.evalCriteria.length) {
    sectionTitle('Evaluation Criteria');
    ensure(60);
    doc.autoTable({
      ...tableBase, startY: y,
      head: [['Criterion', 'How it is applied', 'Weight']],
      body: d.evalCriteria.map((c) => [c.description || '—', c.howApplied || '—', `${c.weight}%`]),
      columnStyles: { 2: { halign: 'right', cellWidth: 50 } },
    });
    afterTable();
    if (d.passingPct) { doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...GREEN); ensure(14); doc.text(`Technical passing threshold: ${d.passingPct}%`, M, y); y += 18; }
  }

  /* ── Qualification criteria ──────────────────────────────────── */
  if (d.qualCriteria.length) {
    sectionTitle('Qualification Criteria');
    const body: (string | { content: string; styles: object })[][] = [];
    d.qualCriteria.forEach((m) => {
      body.push([{ content: m.name, styles: { fontStyle: 'bold', fillColor: [249, 250, 247] } }, { content: 'Main category', styles: { fillColor: [249, 250, 247], textColor: MUTED } }, { content: `${m.percentage}%`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [249, 250, 247] } }]);
      m.subs.forEach((s) => body.push([`    ${s.name}`, s.range || '—', { content: `${s.percentage}%`, styles: { halign: 'right' } }]));
    });
    ensure(60);
    doc.autoTable({
      ...tableBase, startY: y,
      head: [['Criteria', 'Range', 'Weight']],
      body,
      columnStyles: { 2: { halign: 'right', cellWidth: 56 } },
    });
    afterTable();
  }

  /* ── Committees ──────────────────────────────────────────────── */
  if (d.techCommittee.length || d.qualCommittee.length) {
    sectionTitle('Committees');
    if (d.techCommittee.length) paragraph(`Technical Evaluation Committee: ${d.techCommittee.join(', ')}`);
    if (d.qualCommittee.length) paragraph(`Qualification Committee: ${d.qualCommittee.join(', ')}`);
  }

  /* ── Attachments ─────────────────────────────────────────────── */
  if (d.attachments.length) {
    sectionTitle('Attachments');
    paragraph(d.attachments.map((x) => '•  ' + x).join('\n'));
  }

  /* ── Footer on every page ────────────────────────────────────── */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE); doc.setLineWidth(0.5);
    doc.line(M, H - 34, W - M, H - 34);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text('SIDF — Munafasat  ·  Confidential', M, H - 20);
    doc.text(`Ref: ${d.requestNo}`, W / 2, H - 20, { align: 'center' });
    doc.text(`Page ${p} of ${pages}`, W - M, H - 20, { align: 'right' });
  }

  doc.save(`${d.requestNo}.pdf`);
}
