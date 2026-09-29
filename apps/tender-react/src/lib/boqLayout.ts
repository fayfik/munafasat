// A/B switch for the Bill of Quantities step:
//   'cards' (A) — grouped rows + "Add BOQ Item" form (the original design)
//   'sheet' (B) — one spreadsheet-style table, every cell editable in place
// Pick it with ?boq=sheet / ?boq=cards in the URL, or with the switch on the step.
import { useSyncExternalStore } from 'react';

export type BoqLayout = 'cards' | 'sheet';
const KEY = 'boq-layout';

function initial(): BoqLayout {
  try {
    const q = new URLSearchParams(window.location.search).get('boq');
    if (q === 'sheet' || q === 'cards') return q;
  } catch { /* no URL access */ }
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === 'sheet' || v === 'cards') return v;
  } catch { /* storage blocked */ }
  return 'cards';
}

let current: BoqLayout = initial();
const listeners = new Set<() => void>();

export function setBoqLayout(v: BoqLayout) {
  current = v;
  try { window.localStorage.setItem(KEY, v); } catch { /* storage blocked */ }
  listeners.forEach((l) => l());
}

export function useBoqLayout(): BoqLayout {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => current,
  );
}
