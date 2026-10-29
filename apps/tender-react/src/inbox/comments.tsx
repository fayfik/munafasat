// Inline review comments — reusable across the Inbox.
//
// Wrap any reviewable content in <CommentLayer> and mark targets with
// <Commentable id label>. In comment mode, hovering a target shows a comment
// button; clicking it opens a popover beside the element (Office-style). On
// save, the comment card floats into the Comments pane — the element marked
// data-comment-dock="pane" (open Comments pane) or data-comment-dock="rail"
// (the Comments button), and the target keeps a marker + tint.

import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState,
  cloneElement, isValidElement, type ReactElement, type ReactNode, type MouseEvent as RMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import type { Bilingual } from './types';

export interface CommentAnchor { id: string; label: Bilingual }
export interface CommentReply { id: string; text: string; author: string; at: string; kind?: 'reply' | 'edit' }
export interface AnchoredComment { id: string; anchor: CommentAnchor; text: string; author: string; at: string; replies?: CommentReply[]; resolved?: boolean }

interface Ctx {
  mode: boolean;
  isAr: boolean;
  counts: Record<string, number>;
  register: (id: string, el: HTMLElement | null, label: Bilingual) => void;
  hover: (id: string | null) => void;
  open: (id: string, v?: 'thread' | 'edit') => void;
}
const CommentCtx = createContext<Ctx | null>(null);

/** Element rect clipped by every scrolling/overflow-hidden ancestor (e.g. wide tables). */
function visibleRect(el: HTMLElement): DOMRect | null {
  let { left, top, right, bottom } = el.getBoundingClientRect();
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
      const r = p.getBoundingClientRect();
      left = Math.max(left, r.left); right = Math.min(right, r.right);
      top = Math.max(top, r.top); bottom = Math.min(bottom, r.bottom);
    }
  }
  if (right - left < 8 || bottom - top < 4) return null;
  return new DOMRect(left, top, right - left, bottom - top);
}

const asLabel = (l: string | Bilingual): Bilingual => (typeof l === 'string' ? { en: l, ar: l } : l);
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ── Target wrapper ─────────────────────────────────────────────────────────────
/** Marks a single child element as commentable. Passes through when no layer is active. */
export function Commentable({ id, label, children }: { id: string; label: string | Bilingual; children: ReactElement }) {
  const ctx = useContext(CommentCtx);
  const lbl = asLabel(label);
  const refCb = useCallback((el: HTMLElement | null) => ctx?.register(id, el, lbl), // eslint-disable-line react-hooks/exhaustive-deps
    [ctx?.register, id, lbl.en, lbl.ar]);
  if (!ctx || !isValidElement(children)) return children;
  const p = children.props as { onMouseOver?: (e: RMouseEvent) => void };
  return cloneElement(children as ReactElement<Record<string, unknown>>, {
    ref: refCb,
    'data-comment-id': id,
    'data-cm-has': ctx.counts[id] ? '' : undefined,
    onMouseOver: (e: RMouseEvent) => { p.onMouseOver?.(e); if (ctx.mode) { e.stopPropagation(); ctx.hover(id); } },
  });
}

// ── Layer ──────────────────────────────────────────────────────────────────────
export interface RespondHandlers {
  onReply: (rootId: string, text: string) => void;
  onResolve: (rootId: string, resolved: boolean) => void;
}

export function CommentLayer({ mode, isAr, comments, onAdd, children, authorLabel, respond, editing, renderEdit }: {
  mode: boolean;
  isAr: boolean;
  comments: AnchoredComment[];
  onAdd: (anchor: CommentAnchor, text: string) => void;
  children: ReactNode;
  authorLabel?: string;
  /** Respond mode (the requester): reply to and resolve existing comments. */
  respond?: RespondHandlers;
  /** When true, commented targets that have an edit form show an Edit action. */
  editing?: boolean;
  /** Edit form for a commented target, or null if that target has no editable fields. */
  renderEdit?: (anchorId: string, close: () => void) => ReactNode | null;
}) {
  const reg = useRef(new Map<string, { el: HTMLElement; label: Bilingual }>());
  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<'thread' | 'edit'>('thread');
  const [draft, setDraft] = useState('');
  const [, setTick] = useState(0);
  const clearTimer = useRef<number | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const x of comments) c[x.anchor.id] = (c[x.anchor.id] ?? 0) + 1;
    return c;
  }, [comments]);
  const openCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const x of comments) if (!x.resolved) c[x.anchor.id] = (c[x.anchor.id] ?? 0) + 1;
    return c;
  }, [comments]);

  const register = useCallback((id: string, el: HTMLElement | null, label: Bilingual) => {
    if (el) reg.current.set(id, { el, label }); else reg.current.delete(id);
  }, []);

  // Outline the hovered/open target directly (works for any element, incl. <tr>).
  const prevHover = useRef<string | null>(null);
  useEffect(() => {
    if (prevHover.current) reg.current.get(prevHover.current)?.el.classList.remove('cm-hover');
    const active = openId ?? (mode ? hoverId : null);
    if (active) reg.current.get(active)?.el.classList.add('cm-hover');
    prevHover.current = active;
  }, [hoverId, openId, mode]);

  const hover = useCallback((id: string | null) => {
    if (clearTimer.current) { window.clearTimeout(clearTimer.current); clearTimer.current = null; }
    if (id) setHoverId(id);
    else clearTimer.current = window.setTimeout(() => setHoverId(null), 180);
  }, []);
  const open = useCallback((id: string, v: 'thread' | 'edit' = 'thread') => { setOpenId(id); setView(v); setDraft(''); }, []);
  const close = useCallback(() => { setOpenId(null); setDraft(''); setView('thread'); }, []);

  useEffect(() => { if (!mode) { setHoverId(null); } }, [mode]);

  useEffect(() => {
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setTick((n) => n + 1)); };
    window.addEventListener('scroll', on, true);
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on, true); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    if (!openId) return;
    const onDown = (e: MouseEvent) => {
      const tgt = e.target as Node;
      if (popRef.current?.contains(tgt)) return;
      if ((tgt as HTMLElement).closest?.('[data-cm-ui]')) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [openId, close]);

  const ctx = useMemo<Ctx>(() => ({ mode, isAr, counts, register, hover, open }), [mode, isAr, counts, register, hover, open]);

  function save() {
    if (!openId || !draft.trim()) return;
    const entry = reg.current.get(openId);
    if (!entry) return;
    const from = popRef.current?.getBoundingClientRect();
    const text = draft.trim();
    const commit = () => onAdd({ id: openId, label: entry.label }, text);
    // The comment is recorded as the card lands in Comments, so the two read as one motion.
    if (from) flyToDock(from, isAr ? entry.label.ar : entry.label.en, text, isAr, commit); else commit();
    close();
  }

  const clip = (rootRef.current?.closest('.overflow-y-auto') as HTMLElement | null)?.getBoundingClientRect();
  const hovered = mode && hoverId && hoverId !== openId ? reg.current.get(hoverId) : null;
  const opened = openId ? reg.current.get(openId) : null;
  const thread = openId ? comments.filter((c) => c.anchor.id === openId) : [];
  const editFor = (id: string) => (editing && renderEdit ? renderEdit(id, close) : null);
  const t = (en: string, ar: string) => (isAr ? ar : en);

  return (
    <CommentCtx.Provider value={ctx}>
      <div ref={rootRef} className={mode ? 'cm-on' : undefined} onMouseLeave={() => hover(null)}>{children}</div>
      {createPortal(
        <>
          {/* Markers on commented targets (always visible, Office-style); green once all resolved */}
          {Object.keys(counts).map((id) => {
            const e = reg.current.get(id); if (!e) return null;
            const r = visibleRect(e.el); if (!r) return null;
            const done = !openCounts[id];
            const top = e.el.getBoundingClientRect().top < r.top - 1 ? r.top + 2 : r.top - 8;
            const canEdit = !!editFor(id);
            return (
              <div key={id} data-cm-ui className="fixed z-[60] flex items-center gap-1" style={{ top, left: isAr ? r.left - 6 : r.right - (canEdit ? 66 : 14) }}>
                {canEdit && (
                  <button type="button" onClick={() => open(id, 'edit')} title={t('Edit', 'تعديل')}
                    className="h-5 ps-1 pe-1.5 rounded-full bg-white border border-brand-300 text-brand-700 text-[10px] font-bold flex items-center gap-0.5 shadow-md hover:bg-brand-50">
                    <PencilIcon className="w-2.5 h-2.5" />{t('Edit', 'تعديل')}
                  </button>
                )}
                <button type="button" onClick={() => open(id)} title={t('View comments', 'عرض التعليقات')}
                  className={`h-5 min-w-[20px] px-1 rounded-full rounded-ee-sm text-white text-[10px] font-bold flex items-center justify-center gap-0.5 shadow-md hover:scale-110 transition-transform ${done ? 'bg-success-600' : 'bg-[#2A6193]'}`}>
                  {done ? <CheckIcon className="w-2.5 h-2.5" /> : <BubbleIcon className="w-2.5 h-2.5" />}{done ? counts[id] : openCounts[id]}
                </button>
              </div>
            );
          })}

          {hovered && (() => {
            const r = visibleRect(hovered.el); if (!r) return null;
            return (
              <button type="button" data-cm-ui onMouseEnter={() => hover(hoverId)} onMouseLeave={() => hover(null)}
                onClick={() => open(hoverId!)}
                className="cm-pop-in fixed z-[61] h-7 ps-1.5 pe-2 rounded-lg bg-[#2A6193] text-white shadow-lg flex items-center gap-1 text-[11px] font-semibold hover:bg-[#21507A]"
                style={{ top: r.top + 6, left: isAr ? r.left + 6 : r.right - 92 }}>
                <BubbleIcon className="w-3.5 h-3.5" />{t('Comment', 'تعليق')}
              </button>
            );
          })()}

          {opened && (() => {
            const label = isAr ? opened.label.ar : opened.label.en;
            const edit = editFor(openId!);
            if (view === 'edit' && edit) {
              return (
                <PopShell key={openId + 'e'} popRef={popRef} el={opened.el} clip={clip} isAr={isAr} width={380} label={label} onClose={close} accent="brand"
                  headRight={thread.length ? <button type="button" onClick={() => setView('thread')} className="text-[11px] font-semibold text-[#21507A] hover:underline">{t(`${thread.length} comment${thread.length > 1 ? 's' : ''}`, `${thread.length} تعليق`)}</button> : null}>
                  {edit}
                </PopShell>
              );
            }
            if (respond) {
              return (
                <PopShell key={openId} popRef={popRef} el={opened.el} clip={clip} isAr={isAr} width={340} label={label} onClose={close}
                  headRight={edit ? <button type="button" onClick={() => setView('edit')} className="inline-flex items-center gap-1 rounded-md border border-brand-300 bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700 hover:bg-brand-100"><PencilIcon className="w-3 h-3" />{t('Edit', 'تعديل')}</button> : null}>
                  <ul className="space-y-2.5 max-h-[360px] overflow-y-auto pe-1">
                    {thread.map((c) => <ThreadCard key={c.id} c={c} isAr={isAr} respond={respond} />)}
                  </ul>
                </PopShell>
              );
            }
            return (
              <PopShell key={openId} popRef={popRef} el={opened.el} clip={clip} isAr={isAr} width={312} label={label} onClose={close}>
                {thread.length > 0 && (
                  <ul className="space-y-2 max-h-36 overflow-y-auto pe-1">
                    {thread.map((c) => (
                      <li key={c.id} className="rounded-lg bg-neutral-50 border border-neutral-100 px-2.5 py-1.5">
                        <p className="text-[10.5px] font-semibold text-neutral-500">{c.author} · {fmtT(c.at, isAr)}</p>
                        <p className="text-[12.5px] text-neutral-800 mt-0.5 whitespace-pre-line">{c.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} rows={3}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); } }}
                  placeholder={thread.length ? t('Reply…', 'رد…') : t(`Comment as ${authorLabel ?? 'reviewer'}…`, 'اكتب تعليقك…')}
                  className={`${thread.length ? 'mt-2.5' : ''} w-full resize-none text-[13px] rounded-lg border border-neutral-300 px-2.5 py-2 focus:border-[#2A6193] focus:ring-2 focus:ring-[#2A6193]/20 outline-none`} />
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10.5px] text-neutral-400">Ctrl + Enter</span>
                  <button type="button" onClick={close} className="ms-auto px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-neutral-600 hover:bg-neutral-100">{t('Cancel', 'إلغاء')}</button>
                  <button type="button" onClick={save} disabled={!draft.trim()}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-[#2A6193] hover:bg-[#21507A] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
                    <SendIcon className="w-3.5 h-3.5" />{t('Comment', 'تعليق')}
                  </button>
                </div>
              </PopShell>
            );
          })()}
        </>,
        document.body,
      )}
    </CommentCtx.Provider>
  );
}

const fmtT = (iso: string, isAr: boolean) => new Date(iso).toLocaleString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/** One review comment with its replies, a reply box and Resolve / Reopen — shared by the popover and the Comments pane. */
export function ThreadCard({ c, isAr, respond, compact }: { c: AnchoredComment; isAr: boolean; respond?: RespondHandlers; compact?: boolean }) {
  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);
  const t = (en: string, ar: string) => (isAr ? ar : en);
  const send = () => { if (!reply.trim() || !respond) return; respond.onReply(c.id, reply.trim()); setReply(''); setReplying(false); };
  return (
    <li className={`list-none rounded-xl border ${c.resolved ? 'border-success-200 bg-success-50/40' : 'border-neutral-200 bg-white'} ${compact ? '' : 'shadow-sm'}`}>
      <div className="px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] font-semibold text-neutral-800 truncate">{c.author}</span>
          <span className="text-[10.5px] text-neutral-400 whitespace-nowrap">{fmtT(c.at, isAr)}</span>
          {c.resolved && <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-success-100 text-success-700 px-1.5 py-0.5 text-[10px] font-bold"><CheckIcon className="w-2.5 h-2.5" />{t('Resolved', 'تم الحل')}</span>}
        </div>
        <p className={`text-[12.5px] mt-1 whitespace-pre-line ${c.resolved ? 'text-neutral-500' : 'text-neutral-800'}`}>{c.text}</p>
        {(c.replies?.length ?? 0) > 0 && (
          <ul className="mt-2 space-y-1.5 border-s-2 border-neutral-200 ps-2.5">
            {c.replies!.map((r) => (
              <li key={r.id} className="list-none">
                <p className="text-[10.5px] text-neutral-500"><span className="font-semibold text-neutral-700">{r.author}</span> · {fmtT(r.at, isAr)}</p>
                {r.kind === 'edit'
                  ? <p className="text-[12px] text-brand-800 bg-brand-50 border border-brand-100 rounded-md px-2 py-1 mt-0.5 inline-flex items-start gap-1"><PencilIcon className="w-3 h-3 mt-0.5 flex-shrink-0" /><span className="whitespace-pre-line">{r.text}</span></p>
                  : <p className="text-[12px] text-neutral-700 mt-0.5 whitespace-pre-line">{r.text}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {respond && (
        <div className="px-3 pb-2.5">
          {replying ? (
            <div data-cm-ui>
              <textarea autoFocus value={reply} onChange={(e) => setReply(e.target.value)} rows={2}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } if (e.key === 'Escape') { e.stopPropagation(); setReplying(false); } }}
                placeholder={t('Reply…', 'رد…')}
                className="w-full resize-none text-[12.5px] rounded-lg border border-neutral-300 px-2.5 py-1.5 focus:border-[#2A6193] focus:ring-2 focus:ring-[#2A6193]/20 outline-none" />
              <div className="mt-1.5 flex items-center justify-end gap-1.5">
                <button type="button" onClick={() => { setReplying(false); setReply(''); }} className="px-2 py-1 rounded-md text-[11.5px] font-semibold text-neutral-600 hover:bg-neutral-100">{t('Cancel', 'إلغاء')}</button>
                <button type="button" onClick={send} disabled={!reply.trim()} className="px-2.5 py-1 rounded-md text-[11.5px] font-semibold text-white bg-[#2A6193] hover:bg-[#21507A] disabled:opacity-40">{t('Reply', 'رد')}</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setReplying(true)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-semibold text-[#21507A] hover:bg-[#EAF1F8]"><ReplyIcon className="w-3.5 h-3.5" />{t('Reply', 'رد')}</button>
              <button type="button" onClick={() => respond.onResolve(c.id, !c.resolved)}
                className={`ms-auto inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-semibold ${c.resolved ? 'text-neutral-600 hover:bg-neutral-100' : 'text-success-700 bg-success-50 border border-success-200 hover:bg-success-100'}`}>
                {c.resolved ? t('Reopen', 'إعادة فتح') : <><CheckIcon className="w-3.5 h-3.5" />{t('Resolve', 'حل')}</>}
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/** Positions a popover beside an element, inside the reviewed area. */
function PopShell({ popRef, el, clip, isAr, width: W, label, onClose, headRight, accent, children }: {
  popRef: React.RefObject<HTMLDivElement | null>; el: HTMLElement; clip?: DOMRect; isAr: boolean; width: number; label: string;
  onClose: () => void; headRight?: ReactNode; accent?: 'brand'; children: ReactNode;
}) {
  const r = visibleRect(el) ?? el.getBoundingClientRect();
  const [h, setH] = useState(220);
  useLayoutEffect(() => { if (popRef.current) setH(popRef.current.offsetHeight); });
  const vh = window.innerHeight;
  const minX = (clip?.left ?? 0) + 8, maxX = (clip?.right ?? window.innerWidth) - 8;
  const after = isAr ? r.left - 12 - W : r.right + 12;
  const before = isAr ? r.right + 12 : r.left - 12 - W;
  let left: number; let beside = true;
  if (after >= minX && after + W <= maxX) left = after;
  else if (before >= minX && before + W <= maxX) left = before;
  else { beside = false; left = Math.min(Math.max(minX, isAr ? r.left : r.right - W), maxX - W); }
  const below = r.bottom + 8;
  const top = beside ? Math.min(Math.max(8, r.top), vh - h - 8)
    : below + h <= vh - 8 ? below : Math.max(8, r.top - h - 8);
  return (
    <div ref={popRef} data-cm-ui role="dialog" aria-label={label}
      className="cm-pop-in fixed z-[70] rounded-xl bg-white border border-neutral-200 shadow-[0_12px_40px_-8px_rgba(23,35,58,0.35)] overflow-hidden flex flex-col"
      style={{ top, left, width: W, maxHeight: vh - 16 }}>
      <div className={`h-1 flex-shrink-0 ${accent === 'brand' ? 'bg-brand-600' : 'bg-[#2A6193]'}`} />
      <div className="p-3 overflow-y-auto">
        <div className="flex items-center gap-2 mb-2.5">
          <span className={`inline-flex items-center gap-1 min-w-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${accent === 'brand' ? 'bg-brand-50 text-brand-800' : 'bg-[#EAF1F8] text-[#21507A]'}`}>
            {accent === 'brand' ? <PencilIcon className="w-3 h-3 flex-shrink-0" /> : <BubbleIcon className="w-3 h-3 flex-shrink-0" />}<span className="truncate">{label}</span>
          </span>
          <span className="ms-auto flex items-center gap-1.5 flex-shrink-0">
            {headRight}
            <button type="button" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'} className="w-6 h-6 rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Floating hand-off into the Comments dock ───────────────────────────────────────
/** Animates a comment card from `from` into the Comments dock and pulses the dock. */
export function flyToDock(from: DOMRect, label: string, text: string, isAr: boolean, onLanded?: () => void) {
  const dock = (document.querySelector('[data-comment-dock="pane"]') ?? document.querySelector('[data-comment-dock="rail"]')) as HTMLElement | null;
  if (!dock) { onLanded?.(); return; }
  const to = dock.getBoundingClientRect();
  const W = Math.min(from.width, 280);
  const startX = from.left + (from.width - W) / 2, startY = from.top + 12;
  const isPane = dock.dataset.commentDock === 'pane';
  const endX = to.left + to.width / 2 - W / 2, endY = isPane ? Math.max(to.top + 20, to.bottom - 90) : to.top + Math.min(to.height / 2, 40) - 20;
  const dx = endX - startX, dy = endY - startY;

  const card = document.createElement('div');
  card.className = 'cm-fly';
  card.style.cssText = `position:fixed;left:${startX}px;top:${startY}px;width:${W}px;z-index:90;pointer-events:none;direction:${isAr ? 'rtl' : 'ltr'}`;
  const chip = document.createElement('div'); chip.className = 'cm-fly-chip'; chip.textContent = label;
  const body = document.createElement('div'); body.className = 'cm-fly-text'; body.textContent = text;
  card.append(chip, body);
  document.body.appendChild(card);

  if (reduced()) { card.remove(); onLanded?.(); pulse(dock); return; }

  const lift = Math.min(140, Math.abs(dx) * 0.25 + 60);
  const path = [
    { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1, offset: 0 },
    { transform: `translate(${dx * 0.18}px, ${dy * 0.18 - lift * 0.7}px) scale(0.96) rotate(${isAr ? 2 : -2}deg)`, opacity: 1, offset: 0.25 },
    { transform: `translate(${dx * 0.6}px, ${dy * 0.6 - lift}px) scale(0.62) rotate(${isAr ? -4 : 4}deg)`, opacity: 0.95, offset: 0.62 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.12) rotate(0deg)`, opacity: 0.15, offset: 1 },
  ];
  const anim = card.animate(path, { duration: 950, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' });

  // A short trail of glowing dots following the card.
  for (let i = 0; i < 4; i++) {
    const dot = document.createElement('div');
    dot.className = 'cm-fly-dot';
    dot.style.cssText = `position:fixed;left:${startX + W / 2 - 4}px;top:${startY + 14}px;z-index:89;pointer-events:none`;
    document.body.appendChild(dot);
    const a = dot.animate(path.map((k) => ({ ...k, opacity: (k.opacity as number) * (0.7 - i * 0.14) })), { duration: 950, delay: 70 * (i + 1), easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' });
    a.onfinish = () => dot.remove();
  }
  anim.onfinish = () => { card.remove(); onLanded?.(); pulse(dock); };
}

function pulse(dock: HTMLElement) {
  if (reduced()) return;
  if (dock.dataset.commentDock !== 'pane') dock.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(0.97)' }, { transform: 'scale(1)' }], { duration: 480, easing: 'ease-out' });
  const r = dock.getBoundingClientRect();
  const ring = document.createElement('div');
  ring.className = 'cm-ring';
  const cy = dock.dataset.commentDock === 'pane' ? Math.max(r.top + 30, r.bottom - 70) : r.top + Math.min(r.height / 2, 40);
  ring.style.cssText = `position:fixed;left:${r.left + r.width / 2 - 22}px;top:${cy - 22}px;width:44px;height:44px;z-index:91;pointer-events:none`;
  document.body.appendChild(ring);
  ring.animate([{ transform: 'scale(0.4)', opacity: 0.9 }, { transform: 'scale(1.8)', opacity: 0 }], { duration: 650, easing: 'ease-out' }).onfinish = () => ring.remove();
}

/** Briefly highlights the element a comment points to (used from the Comments chip). */
export function flashTarget(id: string) {
  const el = document.querySelector(`[data-comment-id="${CSS.escape(id)}"]`) as HTMLElement | null;
  if (!el) return false;
  el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
  el.classList.remove('cm-flash'); void el.offsetWidth; el.classList.add('cm-flash');
  window.setTimeout(() => el.classList.remove('cm-flash'), 1800);
  return true;
}

// ── Chip used in Comments / activity ───────────────────────────────────────────────
export function AnchorChip({ label, onClick, light }: { label: string; onClick?: () => void; light?: boolean }) {
  const cls = `inline-flex items-center gap-1 max-w-full rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${light ? 'bg-white/20 text-white' : 'bg-[#EAF1F8] text-[#21507A]'} ${onClick ? 'hover:underline cursor-pointer' : ''}`;
  return onClick
    ? <button type="button" onClick={onClick} className={cls}><BubbleIcon className="w-3 h-3 flex-shrink-0" /><span className="truncate">{label}</span></button>
    : <span className={cls}><BubbleIcon className="w-3 h-3 flex-shrink-0" /><span className="truncate">{label}</span></span>;
}

export function BubbleIcon({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" /></svg>;
}
function SendIcon({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>;
}
function CheckIcon({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12l5 5L20 7" /></svg>;
}
export function PencilIcon({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>;
}
function ReplyIcon({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 14 4 9l5-5" /><path d="M20 20v-7a4 4 0 00-4-4H4" /></svg>;
}
