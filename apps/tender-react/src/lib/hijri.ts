// Hijri (Umm al-Qura) ↔ Gregorian helpers, built on the platform Intl calendar.
// All math uses UTC midnight so a calendar day maps to a stable Gregorian day.

export interface Hijri { y: number; m: number; d: number } // m, d are 1-based

const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', 'Rabiʿ I', 'Rabiʿ II', 'Jumada I', 'Jumada II',
  'Rajab', 'Shaʿban', 'Ramadan', 'Shawwal', 'Dhu al-Qiʿdah', 'Dhu al-Hijjah',
];
const HIJRI_MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

const DAY = 86400000;
const HFMT = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
  day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC',
});

export function hijriMonthName(m: number, ar: boolean): string {
  return (ar ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN)[m - 1] ?? '';
}

export function toHijri(d: Date): Hijri {
  const parts = HFMT.formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get('year'), m: get('month'), d: get('day') };
}

function cmp(a: Hijri, b: Hijri) { return a.y - b.y || a.m - b.m || a.d - b.d; }

/** Gregorian UTC date for a given Umm al-Qura date (binary search — Hijri is monotonic in time). */
export function fromHijri(hy: number, hm: number, hd: number): Date {
  const target = { y: hy, m: hm, d: hd };
  // Hijri year hy ≈ Gregorian year hy*0.970224 + 621.5643; search a small window around it.
  const gApprox = Math.floor(hy * 0.970224 + 621.5643);
  let lo = Date.UTC(gApprox - 2, 0, 1);
  let hi = Date.UTC(gApprox + 3, 0, 1);
  while (lo <= hi) {
    const mid = Math.floor(((lo + hi) / 2) / DAY) * DAY;
    const c = cmp(toHijri(new Date(mid)), target);
    if (c === 0) return new Date(mid);
    if (c < 0) lo = mid + DAY; else hi = mid - DAY;
  }
  return new Date(lo);
}

/** Length (29 or 30) of a Hijri month. */
export function hijriMonthLength(hy: number, hm: number): number {
  const start = fromHijri(hy, hm, 1);
  const nm = hm === 12 ? 1 : hm + 1;
  const ny = hm === 12 ? hy + 1 : hy;
  const next = fromHijri(ny, nm, 1);
  return Math.round((next.getTime() - start.getTime()) / DAY);
}

// ── Gregorian helpers on UTC-midnight dates ──
export function ymdToUTC(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}
export function utcToYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}
export function addDays(d: Date, n: number): Date { return new Date(d.getTime() + n * DAY); }

const GREG_MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const GREG_MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export function gregMonthName(m: number, ar: boolean): string { return (ar ? GREG_MONTHS_AR : GREG_MONTHS_EN)[m] ?? ''; }

/** Pretty label of a YYYY-MM-DD date in both calendars, e.g. "3 Mar 2026 · 15 Ramadan 1447 AH". */
export function formatBoth(ymd: string, ar: boolean): { greg: string; hijri: string } | null {
  const d = ymdToUTC(ymd);
  if (!d) return null;
  const h = toHijri(d);
  const greg = ar
    ? `${d.getUTCDate()} ${gregMonthName(d.getUTCMonth(), true)} ${d.getUTCFullYear()}م`
    : `${d.getUTCDate()} ${gregMonthName(d.getUTCMonth(), false).slice(0, 3)} ${d.getUTCFullYear()}`;
  const hijri = ar
    ? `${h.d} ${hijriMonthName(h.m, true)} ${h.y}هـ`
    : `${h.d} ${hijriMonthName(h.m, false)} ${h.y} AH`;
  return { greg, hijri };
}
