import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { REQUESTS } from '../data/requests.js';

const KEY = 'munafasat-theme-app-v1';

const initial = () => ({
  done: {},        // taskId -> { action, note, at }
  read: {},        // taskId -> true
  reviews: {},     // taskId -> { rowKey -> { state: 'accepted'|'modified'|'commented'|'flagged', value?, note? } }
  extra: {},       // taskId -> free-form per task (added rows, choices, notes…)
  comments: Object.fromEntries(Object.values(REQUESTS).map((r) => [r.id, r.comments.map((c) => ({ ...c, replies: [] }))])),
});

function load() {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (s && s.comments) return { ...initial(), ...s };
  } catch (e) { /* storage unavailable */ }
  return initial();
}

let seq = 1000;
const stamp = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en-GB', { month: 'short' })}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function reducer(s, a) {
  switch (a.type) {
    case 'review': {
      const cur = s.reviews[a.task] || {};
      const next = { ...cur };
      a.keys.forEach((k) => { if (a.decision === null) delete next[k]; else next[k] = { ...(cur[k] || {}), ...a.decision }; });
      return { ...s, reviews: { ...s.reviews, [a.task]: next } };
    }
    case 'extra':
      return { ...s, extra: { ...s.extra, [a.task]: { ...(s.extra[a.task] || {}), ...a.patch } } };
    case 'read':
      return s.read[a.task] ? s : { ...s, read: { ...s.read, [a.task]: true } };
    case 'complete':
      return { ...s, done: { ...s.done, [a.task]: { action: a.action, note: a.note || '', at: stamp() } } };
    case 'undo': {
      const done = { ...s.done }; delete done[a.task];
      return { ...s, done };
    }
    case 'comment': {
      const list = s.comments[a.req] || [];
      const c = { id: `n${seq++}`, author: a.author, at: stamp(), text: a.text, anchor: a.anchor || null, resolved: false, replies: [] };
      if (a.replyTo) {
        return { ...s, comments: { ...s.comments, [a.req]: list.map((x) => (x.id === a.replyTo ? { ...x, replies: [...x.replies, c] } : x)) }, lastComment: c.id };
      }
      return { ...s, comments: { ...s.comments, [a.req]: [...list, c] }, lastComment: c.id };
    }
    case 'resolve':
      return { ...s, comments: { ...s.comments, [a.req]: (s.comments[a.req] || []).map((x) => (x.id === a.id ? { ...x, resolved: !x.resolved } : x)) } };
    case 'reset':
      return initial();
    default:
      return s;
  }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }, [state]);
  const api = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

// Convenience hook for a task's review decisions.
export function useReview(taskId) {
  const { state, dispatch } = useStore();
  const decisions = state.reviews[taskId] || {};
  const extra = state.extra[taskId] || {};
  return {
    decisions,
    extra,
    set: (keys, decision) => dispatch({ type: 'review', task: taskId, keys: [].concat(keys), decision }),
    clear: (keys) => dispatch({ type: 'review', task: taskId, keys: [].concat(keys), decision: null }),
    setExtra: (patch) => dispatch({ type: 'extra', task: taskId, patch }),
  };
}
