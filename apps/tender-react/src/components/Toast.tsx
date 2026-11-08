// App-wide toast. Call toast('…') from anywhere; <ToastHost /> renders the stack.
import { useEffect, useState } from 'react';

type ToastItem = { id: number; text: string; tone: 'success' | 'info' };
const EVT = 'munafasat:toast';
let seq = 0;

export function toast(text: string, tone: ToastItem['tone'] = 'success') {
  window.dispatchEvent(new CustomEvent<ToastItem>(EVT, { detail: { id: ++seq, text, tone } }));
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const it = (e as CustomEvent<ToastItem>).detail;
      setItems((p) => [...p.slice(-2), it]);
      window.setTimeout(() => setItems((p) => p.filter((x) => x.id !== it.id)), 3600);
    };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  if (!items.length) return null;
  return (
    <div className="fixed bottom-5 inset-x-0 z-[120] flex flex-col items-center gap-2 pointer-events-none px-4" role="status" aria-live="polite">
      {items.map((it) => (
        <div key={it.id} data-toast className="pointer-events-auto slide-up inline-flex items-center gap-2.5 max-w-[560px] rounded-xl bg-neutral-900 text-white text-[13px] font-medium ps-3 pe-4 py-2.5 shadow-lg">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${it.tone === 'success' ? 'bg-success-500' : 'bg-[#2A6193]'}`}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" /></svg>
          </span>
          <span>{it.text}</span>
        </div>
      ))}
    </div>
  );
}
