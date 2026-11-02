// PDF-style document preview in a modal: toolbar (name, page, zoom, download) and
// rendered A4 pages. Prototype documents are generated from the request data, so
// the preview renders the same content the downloadable PDF contains.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { jsPDF } from 'jspdf';
import { useLanguage, useT } from '../context/LanguageContext';
import { XIcon, DownloadIcon } from './Icons';
import { Sk } from './Loader';

export interface PreviewDoc {
  name: string; nameAr?: string; type: string; size?: string; by?: string;
  ref?: string; title?: string; dept?: string; amount?: string; date?: string;
}

type Block = { h?: string; p?: string; table?: string[][]; list?: string[] };

function pagesFor(d: PreviewDoc): Block[][] {
  const n = d.name.toLowerCase();
  const title = d.title || d.name;
  const head: Block = { table: [['Reference', d.ref || '—'], ['Request', title], ['Department', d.dept || '—'], ['Estimated value', d.amount || '—'], ['Date', d.date || '—']] };
  if (/bill of quantities|boq|comparison/.test(n)) return [[
    head, { h: '1. Bill of quantities' },
    { table: [['#', 'Item', 'Qty', 'Unit', 'Unit price (SAR)'], ['1', 'Licences / materials', '120', 'Each', '2,400'], ['2', 'Implementation services', '1', 'Lot', '185,000'], ['3', 'Training', '6', 'Batch', '9,500'], ['4', 'Support & warranty (12 months)', '12', 'Month', '6,200'], ['5', 'Project management', '1', 'Lot', '42,000']] },
    { p: 'Prices exclude VAT (15%). Quantities are estimates for evaluation and may vary within ±10% at award.' },
  ]];
  if (/budget|memo|approval|requisition|summary/.test(n)) return [[
    head, { h: n.includes('requisition') ? 'Purchase requisition' : n.includes('summary') ? 'Request summary' : 'Approval memorandum' },
    { p: `This document records the ${n.includes('budget') ? 'budget availability' : 'approval status'} for "${title}". The request was reviewed in line with the Delegation of Authority matrix and the Government Tenders and Procurement Law.` },
    { list: ['Budget line confirmed against the department cost centre', 'Estimated price reviewed by Procurement', 'Approvals recorded in Munafasat with timestamps', 'Purchase requisition to be created in SAP ECC after final approval'] },
    { h: 'Sign-off' }, { table: [['Role', 'Name', 'Decision'], ['Department Manager', 'Faisal Al-Dossari', 'Approved'], ['Procurement Team Lead', 'Abdullah Al-Qahtani', 'Approved'], ['Department Director', 'Saad Al-Malki', 'Approved']] },
  ]];
  return [[
    head, { h: '1. Background' },
    { p: `${d.dept || 'The requesting department'} requires "${title}" to support its operational plan. This ${n.includes('specification') ? 'technical specification' : 'statement of work'} defines the requirement, deliverables and acceptance criteria for bidders.` },
    { h: '2. Scope' },
    { list: ['Supply and delivery of all items in the bill of quantities', 'Installation, configuration and testing on site', 'Training and knowledge transfer to nominated staff', 'Warranty and post-delivery support for 12 months'] },
    { h: '3. Deliverables & timeline' },
    { table: [['Milestone', 'Deliverable', 'Week'], ['M1', 'Kick-off & delivery plan', '2'], ['M2', 'Delivery & installation', '8'], ['M3', 'Final acceptance', '12']] },
  ], [
    { h: '4. Technical requirements' },
    { list: ['Compliance with NCA Essential Cybersecurity Controls (ECC-1:2018)', 'Data residency within the Kingdom of Saudi Arabia', 'Integration with existing systems via standard APIs', 'Local support presence with Arabic-speaking staff'] },
    { h: '5. Acceptance' },
    { p: 'Acceptance is confirmed by the requesting department through a signed certificate of completion after successful testing against the requirements above.' },
    { h: '6. Contact' }, { p: 'Procurement Department — procurement@entity.gov.sa' },
  ]];
}

export function downloadDocPdf(d: PreviewDoc) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  pagesFor(d).forEach((page, pi) => {
    if (pi) doc.addPage();
    let y = 56;
    doc.setFontSize(15); doc.setTextColor(20); if (pi === 0) { doc.text(d.name, 40, y); y += 28; }
    page.forEach((b) => {
      doc.setFontSize(10);
      if (b.h) { doc.setFontSize(12); doc.setTextColor(30, 90, 40); doc.text(b.h, 40, y); y += 20; doc.setTextColor(40); }
      if (b.p) { const ls = doc.splitTextToSize(b.p, 515); doc.text(ls, 40, y); y += ls.length * 14 + 8; }
      if (b.list) b.list.forEach((li) => { doc.text(`•  ${li}`, 48, y); y += 15; });
      if (b.table) { b.table.forEach((row, ri) => { row.forEach((c, ci) => { doc.setTextColor(ri === 0 ? 110 : 30); doc.text(c, 40 + ci * (515 / row.length), y); }); y += 16; }); y += 6; }
    });
  });
  doc.save(`${d.name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_')}.pdf`);
}

export default function DocPreview({ doc, onClose }: { doc: PreviewDoc; onClose: () => void }) {
  const { isAr } = useLanguage();
  const t = useT();
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const pages = pagesFor(doc);
  useEffect(() => { const id = setTimeout(() => setLoading(false), 550); return () => clearTimeout(id); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col bg-neutral-900/80 cm-fade-in" role="dialog" aria-label={doc.name}>
      <div className="h-14 flex-shrink-0 bg-[#1F2733] text-white flex items-center gap-3 px-4">
        <span className="w-9 h-9 rounded-lg bg-error-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{doc.type}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold truncate">{isAr && doc.nameAr ? doc.nameAr : doc.name}</p>
          <p className="text-[11.5px] text-white/50 truncate">{[doc.size, doc.by, `${pages.length} ${t(pages.length === 1 ? 'page' : 'pages', 'صفحات')}`].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-lg p-0.5" dir="ltr">
          <button onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(1)))} className="w-8 h-8 rounded-md hover:bg-white/10 text-[16px]" title={t('Zoom out', 'تصغير')}>−</button>
          <span className="w-12 text-center text-[12px] tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(1)))} className="w-8 h-8 rounded-md hover:bg-white/10 text-[16px]" title={t('Zoom in', 'تكبير')}>+</button>
        </div>
        <button onClick={() => downloadDocPdf(doc)} className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-[12.5px] font-semibold inline-flex items-center gap-1.5"><DownloadIcon className="w-4 h-4" />{t('Download', 'تنزيل')}</button>
        <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center" title={t('Close', 'إغلاق')}><XIcon className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 overflow-auto py-8" onClick={onClose}>
        <div className="flex flex-col items-center gap-6" dir="ltr" style={{ zoom }} onClick={(e) => e.stopPropagation()}>
          {pages.map((page, pi) => (
            <div key={pi} className="w-[640px] max-w-[92vw] min-h-[860px] bg-white shadow-2xl rounded-sm px-12 py-12 text-neutral-800 relative">
              {loading ? (
                <div className="space-y-3"><Sk className="h-6 w-2/3" /><Sk className="h-3 w-full mt-6" /><Sk className="h-3 w-11/12" /><Sk className="h-3 w-4/5" /><Sk className="h-32 w-full mt-6" /><Sk className="h-3 w-full" /><Sk className="h-3 w-3/4" /></div>
              ) : (
                <>
                  {pi === 0 && (
                    <div className="flex items-start justify-between border-b-2 border-brand-600 pb-4 mb-6">
                      <div><p className="text-[10px] uppercase tracking-widest text-neutral-400">Munafasat</p><h1 className="text-[20px] font-bold mt-1">{doc.name}</h1></div>
                      <p className="text-[10.5px] text-neutral-400 text-end">{doc.ref}<br />{doc.date}</p>
                    </div>
                  )}
                  {page.map((b, bi) => (
                    <div key={bi} className="mb-4">
                      {b.h && <h2 className="text-[13.5px] font-bold text-brand-700 mb-2">{b.h}</h2>}
                      {b.p && <p className="text-[12px] leading-relaxed text-neutral-700">{b.p}</p>}
                      {b.list && <ul className="list-disc ps-5 space-y-1 text-[12px] text-neutral-700">{b.list.map((li, i) => <li key={i}>{li}</li>)}</ul>}
                      {b.table && (
                        <table className="w-full text-[11.5px] border border-neutral-200">
                          <tbody>{b.table.map((row, ri) => (
                            <tr key={ri} className={ri === 0 && b.table!.length > 5 ? 'bg-neutral-100 font-semibold' : 'border-t border-neutral-200'}>
                              {row.map((c, ci) => <td key={ci} className={`px-2.5 py-1.5 ${ci === 0 && row.length === 2 ? 'text-neutral-500 w-40' : ''}`}>{c}</td>)}
                            </tr>
                          ))}</tbody>
                        </table>
                      )}
                    </div>
                  ))}
                  <p className="absolute bottom-5 inset-x-0 text-center text-[10px] text-neutral-400">{pi + 1} / {pages.length}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
