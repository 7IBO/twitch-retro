import { DAY } from './stats';
import { i18n, t, dateFmt, weekdayName } from './i18n/index.svelte';

const nfCache = new Map<string, Intl.NumberFormat>();
function nf(digits = 0) {
  const k = i18n.locale + digits;
  let f = nfCache.get(k);
  if (!f) nfCache.set(k, (f = new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: digits })));
  return f;
}

export const n = (x: number) => nf().format(Math.round(x));
export const n1 = (x: number) => nf(1).format(x);
/** Minutes as hours: "4 226", or "1,5" under 10 h. */
export const h = (min: number) => (min < 600 ? nf(1).format(min / 60) : nf().format(Math.round(min / 60)));
/** A duration: "45 min" under an hour, otherwise hours. */
export const dur = (min: number) => (min < 59.5 ? `${Math.max(1, Math.round(min))} min` : `${h(min)} h`);
export const day = (d: number) => dateFmt({ day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(d * DAY));
export const date = (ts: number) => dateFmt({ day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ts));
export const dateTime = (ts: number) => dateFmt({ day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
/** "42 %" in French, "42%" in English. */
export const pc = (x: number | string) => (i18n.lang === 'en' ? `${x}%` : `${x} %`);
/** Share as text, 'under 1' instead of a misleading 0. */
export const share = (a: number, b: number) => (b && a > 0 && (a / b) * 100 < 1 ? t('under 1') : String(pct(a, b)));
export const lang = (code: string) => {
  try {
    return new Intl.DisplayNames([i18n.locale], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
};
/** "3 days" / "3 jours": both words go through the dictionary. */
export const plural = (x: number, one: string, many: string) => `${n(x)} ${t(Math.round(x) > 1 ? many : one)}`;

export function duration(days: number) {
  if (days >= 365) return plural(Math.floor(days / 365.25), 'year', 'years');
  if (days >= 60) return plural(Math.round(days / 30.4), 'month', 'months');
  return plural(Math.max(1, days), 'day', 'days');
}

export { weekdayName };
