// Changes the requester makes to a request from its view page (cancel),
// kept for the browser session like the rest of the prototype.
import { useSyncExternalStore } from 'react';

const KEY = 'munafasat-theme-overrides-v1';
let state = (() => { try { return JSON.parse(sessionStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } })();
const subs = new Set();

export function setOverride(id, patch) {
  state = { ...state, [id]: { ...(state[id] || {}), ...patch } };
  try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  subs.forEach((f) => f());
}
export const useOverrides = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state);
