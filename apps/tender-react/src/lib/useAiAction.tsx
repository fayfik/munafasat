import { useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { aiErrorMessage, AI_DEMO_MODE } from './claudeRuntime';

/**
 * One AI button's lifecycle. `call` asks Claude and resolves null when AI is
 * unavailable in this view; then `fallback` applies the original sample
 * content so the prototype still demonstrates the flow.
 */
export function useAiAction() {
  const { isAr } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usedSample, setUsedSample] = useState(false);

  const run = useCallback(async <T,>(call: () => Promise<T | null>, apply: (r: T) => void, fallback: () => void) => {
    setLoading(true);
    setError('');
    try {
      const r = await call();
      if (r === null || r === undefined) { fallback(); setUsedSample(true); }
      else { apply(r); setUsedSample(false); }
    } catch (e) {
      setError(aiErrorMessage(e, isAr));
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  return { loading, error, usedSample, run };
}

/** Small status line under an AI-generated field. */
export function AiNote({ error, usedSample }: { error: string; usedSample: boolean }) {
  const { isAr } = useLanguage();
  if (error) return <p className="mt-2 text-xs text-error-600">{error}</p>;
  if (usedSample && AI_DEMO_MODE) {
    return (
      <p className="mt-2 text-xs text-neutral-500">
        {isAr
          ? 'محتوى تجريبي: مثال ثابت، دون استخدام الذكاء الاصطناعي.'
          : 'Demo content: a fixed example, no AI used.'}
      </p>
    );
  }
  if (usedSample) {
    return (
      <p className="mt-2 text-xs text-warning-700">
        {isAr
          ? 'الذكاء الاصطناعي غير متاح في هذا العرض، لذا أُدرج مثال ثابت. افتح الصفحة في Claude واسمح باستخدامه للحصول على محتوى مخصص.'
          : 'AI is not available in this view, so a fixed example was inserted. Open the page in Claude and allow AI to get content written for this project.'}
      </p>
    );
  }
  return null;
}

export const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : ''; };
export const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));
export const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
