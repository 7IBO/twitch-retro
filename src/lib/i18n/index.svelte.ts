/**
 * Two languages. French text is the key: t('Streamers') returns the English
 * entry when the site is in English, the French text otherwise. Placeholders
 * look like {name}.
 */
import { EN } from './en';

export type Lang = 'fr' | 'en';
const KEY = 'retro-lang';

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'fr' || saved === 'en') return saved;
  } catch {
    /* no storage: fall back to the browser language */
  }
  return (navigator.languages?.[0] ?? navigator.language ?? 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

class I18n {
  lang = $state<Lang>(detect());
  constructor() {
    document.documentElement.lang = this.lang;
  }
  set(l: Lang) {
    this.lang = l;
    document.documentElement.lang = l;
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* preference not kept */
    }
  }
  get locale() {
    return this.lang === 'en' ? 'en-GB' : 'fr-FR';
  }
}

export const i18n = new I18n();

export function t(fr: string, params?: Record<string, string | number>): string {
  let s = i18n.lang === 'en' ? (EN[fr] ?? fr) : fr;
  if (params) s = s.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? ''));
  return s;
}

const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(opts: Intl.DateTimeFormatOptions) {
  const k = i18n.locale + JSON.stringify(opts);
  let f = cache.get(k);
  if (!f) cache.set(k, (f = new Intl.DateTimeFormat(i18n.locale, opts)));
  return f;
}
/** Month names in the current language: monthName(5) = "juin" / "June". */
export const monthName = (m: number) => fmt({ month: 'long', timeZone: 'UTC' }).format(Date.UTC(2020, m, 15));
export const monthShort = (m: number) => fmt({ month: 'short', timeZone: 'UTC' }).format(Date.UTC(2020, m, 15));
/** Monday-first weekday names. */
export const weekdayName = (i: number) => fmt({ weekday: 'long', timeZone: 'UTC' }).format(Date.UTC(2024, 0, 1 + i));
export const weekdayShort = (i: number) => fmt({ weekday: 'short', timeZone: 'UTC' }).format(Date.UTC(2024, 0, 1 + i));
export const dateFmt = fmt;
