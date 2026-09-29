// Thin wrappers around the claude.ai artifact runtime (window.claude.use).
// Every capability may be absent (e.g. running outside claude.ai), so each
// helper resolves null and callers fall back to the original demo behaviour.

type SampleFn = ((input: string, opts?: Record<string, unknown>) => Promise<{ text: string }>) & {
  json: <T = unknown>(input: string, opts?: Record<string, unknown>) => Promise<T>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function runtime(): Any | null {
  return (typeof window !== 'undefined' && (window as Any).claude?.use) ? (window as Any).claude : null;
}

let samplePromise: Promise<SampleFn | null> | null = null;
export function getSample(): Promise<SampleFn | null> {
  if (!samplePromise) {
    const r = runtime();
    samplePromise = r ? r.use('sample').catch(() => null) : Promise.resolve(null);
  }
  return samplePromise!;
}

let dbPromise: Promise<Any | null> | null = null;
export function getDb(): Promise<Any | null> {
  if (!dbPromise) {
    const r = runtime();
    dbPromise = r ? r.use('db').catch(() => null) : Promise.resolve(null);
  }
  return dbPromise!;
}

let userPromise: Promise<Any | null> | null = null;
export function getUser(): Promise<Any | null> {
  if (!userPromise) {
    const r = runtime();
    userPromise = r ? r.use('user').catch(() => null) : Promise.resolve(null);
  }
  return userPromise!;
}

/** Codes after which AI should stop being offered for this page load. */
const PERMANENT = new Set([
  'not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed',
]);
let aiBlocked = false;
export function isAiBlocked() { return aiBlocked; }

/**
 * DEMO MODE: every AI button inserts the built-in sample content after a
 * short pause, and Claude is never called, so no usage is spent.
 * Set to false to switch the AI buttons back to real Claude generation.
 */
export const AI_DEMO_MODE = true;
const demoPause = () => new Promise((r) => setTimeout(r, 900 + Math.random() * 700));

export class AiUnavailable extends Error {}

export function aiErrorMessage(e: Any, isAr: boolean): string {
  const code = e?.code;
  if (code === 'rate_limited') return isAr ? 'تم تجاوز حد الاستخدام مؤقتاً. حاول لاحقاً.' : 'Claude is busy or your usage limit was reached. Try again in a moment.';
  if (code === 'invalid_json' || code === 'empty_completion') return isAr ? 'لم يُرجِع الذكاء الاصطناعي نتيجة صالحة. حاول مرة أخرى.' : 'Claude returned an answer the form could not read. Try again.';
  if (code === 'refused') return isAr ? 'رفض الذكاء الاصطناعي هذا الطلب.' : 'Claude declined this request. Adjust the project details and try again.';
  if (code === 'session_expired') return isAr ? 'انتهت الجلسة. سجّل الدخول مجدداً.' : 'Your session expired. Sign in again to use AI.';
  if (code === 'cancelled') return '';
  return isAr ? 'تعذّر الاتصال بالذكاء الاصطناعي. حاول مرة أخرى.' : 'Could not reach Claude. Try again.';
}

/**
 * Ask Claude for JSON. Resolves null when AI is not available in this view
 * (caller should fall back to demo content). Rejects with the runtime's
 * error object on a real failure.
 */
export async function askJson<T>(prompt: string, tier: 'quick' | 'default' = 'default'): Promise<T | null> {
  if (AI_DEMO_MODE) { await demoPause(); return null; }
  if (aiBlocked) return null;
  const sample = await getSample();
  if (!sample) return null;
  try {
    return await sample.json<T>(prompt, { modelTier: tier, cache: false });
  } catch (e: Any) {
    if (PERMANENT.has(e?.code)) { aiBlocked = true; return null; }
    throw e;
  }
}

export async function askText(prompt: string, tier: 'quick' | 'default' = 'default'): Promise<string | null> {
  if (AI_DEMO_MODE) { await demoPause(); return null; }
  if (aiBlocked) return null;
  const sample = await getSample();
  if (!sample) return null;
  try {
    const { text } = await sample(prompt, { modelTier: tier, cache: false });
    return text.trim();
  } catch (e: Any) {
    if (PERMANENT.has(e?.code)) { aiBlocked = true; return null; }
    throw e;
  }
}

/** Offer a generated file through the viewer's download permission; falls
 *  back to a normal browser download outside claude.ai. */
export async function saveFile(filename: string, data: ArrayBuffer, mime: string, fallback: () => void): Promise<'saved' | 'declined' | 'fallback'> {
  const r = runtime();
  const dl = r ? await r.use('downloads').catch(() => null) : null;
  if (!dl) { fallback(); return 'fallback'; }
  try {
    await dl.save({ filename, data: new Blob([data], { type: mime }) });
    return 'saved';
  } catch (e: Any) {
    if (e?.code === 'unavailable') { fallback(); return 'fallback'; }
    return 'declined';
  }
}
