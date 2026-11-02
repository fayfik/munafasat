// App-wide loading feedback: a thin progress bar under the header plus skeleton
// placeholders. Prototype data is local, so loads are simulated with a short delay
// to show the real-world states (network fetch from the Work Engine / SAP).
import { useEffect, useState, useSyncExternalStore, type DependencyList, type ReactNode } from 'react';

let active = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
function begin() { active++; emit(); let done = false; return () => { if (done) return; done = true; active = Math.max(0, active - 1); emit(); }; }

/** Simulates a data load whenever `deps` change; returns true while loading. */
export function useLoading(deps: DependencyList, ms = 450) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const end = begin();
    const id = window.setTimeout(() => { setLoading(false); end(); }, ms);
    return () => { window.clearTimeout(id); end(); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return loading;
}

/** Thin indeterminate bar shown at the top of the app while anything is loading. */
export function TopProgress() {
  const busy = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => active > 0);
  return (
    <div className={`pointer-events-none fixed top-0 inset-x-0 z-[100] h-[3px] overflow-hidden transition-opacity duration-300 ${busy ? 'opacity-100' : 'opacity-0'}`} role="progressbar" aria-busy={busy} aria-label="Loading">
      <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-[#E7C35A] to-transparent ld-bar" />
    </div>
  );
}

export function Sk({ className = '' }: { className?: string }) {
  return <span className={`block rounded-md bg-neutral-200/70 ld-shimmer ${className}`} />;
}

/** Skeleton rows for list/table views. */
export function SkeletonRows({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-neutral-100" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-5 px-4 py-4">
          <Sk className="w-4 h-4 rounded" />
          {Array.from({ length: cols }, (_, c) => (
            <div key={c} className={`flex-1 ${c === 1 ? 'flex-[2]' : ''}`}>
              <Sk className={`h-3 ${['w-24', 'w-3/4', 'w-16', 'w-20', 'w-28', 'w-20'][c % 6]}`} />
              {c === 1 && <Sk className="h-2.5 w-20 mt-2" />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Skeleton for card/detail content. */
export function SkeletonCards({ cards = 2 }: { cards?: number }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
          <Sk className="h-5 w-48" />
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            {Array.from({ length: 6 }, (_, k) => (
              <div key={k}><Sk className="h-2.5 w-24" /><Sk className="h-3.5 w-40 mt-2.5" /></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Shows a skeleton while a page's data loads, then the page. */
export function PageLoad({ children, cards = 2 }: { children: ReactNode; cards?: number }) {
  const loading = useLoading([], 500);
  if (!loading) return <>{children}</>;
  return (
    <div className="px-4 sm:px-6 py-7 max-w-[1400px] mx-auto">
      <Sk className="h-7 w-56" /><Sk className="h-3.5 w-80 mt-3 mb-7" />
      <SkeletonCards cards={cards} />
    </div>
  );
}
