import { useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { aiErrorMessage } from './claudeRuntime';

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
    // Manual (no-AI) build: never call AI — insert the standard text / template straight away.
    void call; void apply; void isAr; void aiErrorMessage;
    setError('');
    fallback();
    setUsedSample(false);
  }, [isAr]);

  return { loading, error, usedSample, run };
}

/** Small status line under an AI-generated field. Only surfaces genuine errors;
 *  the "demo content / fixed example" notes are intentionally not shown. */
export function AiNote({ error, usedSample }: { error: string; usedSample: boolean }) {
  void usedSample;
  if (error) return <p className="mt-2 text-xs text-error-600">{error}</p>;
  return null;
}

export const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : ''; };
export const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));
export const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
