import { DAY } from './stats';

const nf = new Intl.NumberFormat('fr-FR');
const nf1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const dShort = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const dLong = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const dTime = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export const n = (x: number) => nf.format(Math.round(x));
/** Minutes as hours: "4 226", or "1,5" under 10 h. */
export const h = (min: number) => (min < 600 ? nf1.format(min / 60) : nf.format(Math.round(min / 60)));
/** A duration: "45 min" under an hour, otherwise hours. */
export const dur = (min: number) => (min < 59.5 ? `${Math.max(1, Math.round(min))} min` : `${h(min)} h`);
export const day = (d: number) => dShort.format(new Date(d * DAY));
export const date = (t: number) => dLong.format(new Date(t));
export const dateTime = (t: number) => dTime.format(new Date(t));
export const month = (d: number) => dMonth.format(new Date(d * DAY));
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
/** Share as text, "moins d'1" instead of a misleading 0. */
export const share = (a: number, b: number) => (b && a > 0 && (a / b) * 100 < 1 ? "moins d'1" : String(pct(a, b)));
const langNames = new Intl.DisplayNames(['fr'], { type: 'language' });
export const lang = (code: string) => {
  try {
    return langNames.of(code) ?? code;
  } catch {
    return code;
  }
};
export const plural = (x: number, one: string, many: string) => `${n(x)} ${Math.round(x) > 1 ? many : one}`;

export function duration(days: number) {
  if (days >= 365) return plural(Math.floor(days / 365.25), 'an', 'ans');
  if (days >= 60) return plural(Math.round(days / 30.4), 'mois', 'mois');
  return plural(Math.max(1, days), 'jour', 'jours');
}

export const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
