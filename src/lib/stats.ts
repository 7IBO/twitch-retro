import type { FollowEvent, Platform, RetroData, Sub, WatchedVod } from './types';

export const DAY = 86400000;

export interface ChannelStat {
  ch: number;
  min: number;
  days: number;
  first: number; // day
  last: number; // day
  topGame: number;
}

export interface GameStat {
  game: number;
  min: number;
  channels: number;
  topCh: number;
}

export interface YearStat {
  year: number;
  min: number;
  days: number;
  topCh: number;
  topChMin: number;
  topGame: number;
  newChannels: number;
  chat: number;
}

export interface Stats {
  year: number | null;
  totalMin: number;
  liveMin: number;
  vodMin: number;
  activeDays: number;
  spanDays: number;
  firstDay: number;
  lastDay: number;
  channels: ChannelStat[];
  games: GameStat[];
  newChannels: number;
  /** Per year (all time) or per month (one year). */
  periods: { key: string; label: string; min: number }[];
  dayMin: Map<number, number>;
  weekdays: number[]; // minutes, Monday first
  hours: number[]; // video plays per local hour
  platforms: Record<Platform, number>;
  biggestDay: { day: number; min: number; topCh: number } | null;
  streak: { len: number; from: number; to: number };
  loyal: ChannelStat | null;
  chat: {
    msgs: RetroData['chat'];
    channels: { ch: number; n: number }[];
    busiest: { day: number; n: number } | null;
    avgLen: number;
  };
  follows: FollowEvent[];
  unfollows: number;
  subs: Sub[];
  subChannels: { ch: number; months: number }[];
  bits: { total: number; channels: { ch: number; n: number }[] };
  ads: { count: number; channels: { ch: number; n: number }[] };
  watchedVods: WatchedVod[];
}

export const yearOfDay = (day: number) => new Date(day * DAY).getUTCFullYear();
export const yearOfTs = (t: number) => new Date(t).getFullYear();
export const localDay = (t: number) => Math.floor((t - new Date(t).getTimezoneOffset() * 60000) / DAY);

function inc<K>(m: Map<K, number>, k: K, v = 1) {
  m.set(k, (m.get(k) ?? 0) + v);
}

export function argmax<K>(m: Map<K, number>): [K | -1, number] {
  let best: K | -1 = -1, bv = -Infinity;
  for (const [k, v] of m) if (v > bv) { bv = v; best = k; }
  return [best, bv];
}

export function sortMap<K>(m: Map<K, number>): [K, number][] {
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export function availableYears(d: RetroData): number[] {
  const ys = new Set<number>();
  for (const w of d.watch) ys.add(yearOfDay(w.day));
  for (const m of d.chat) ys.add(yearOfTs(m.ts));
  for (const b of d.broadcast) ys.add(yearOfDay(b.day));
  return [...ys].sort((a, b) => a - b);
}

export function yearly(d: RetroData): YearStat[] {
  const map = new Map<number, { min: number; days: Set<number>; ch: Map<number, number>; g: Map<number, number> }>();
  const firstSeen = new Map<number, number>();
  for (const w of d.watch) {
    const y = yearOfDay(w.day);
    let e = map.get(y);
    if (!e) map.set(y, (e = { min: 0, days: new Set(), ch: new Map(), g: new Map() }));
    e.min += w.min;
    e.days.add(w.day);
    inc(e.ch, w.ch, w.min);
    if (w.game >= 0) inc(e.g, w.game, w.min);
    if (!firstSeen.has(w.ch)) firstSeen.set(w.ch, y);
  }
  const newBy = new Map<number, number>();
  for (const y of firstSeen.values()) inc(newBy, y);
  const chatBy = new Map<number, number>();
  for (const m of d.chat) inc(chatBy, yearOfTs(m.ts));
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, e]) => {
      const [topCh, topChMin] = argmax(e.ch);
      return {
        year,
        min: e.min,
        days: e.days.size,
        topCh: topCh as number,
        topChMin,
        topGame: argmax(e.g)[0] as number,
        newChannels: newBy.get(year) ?? 0,
        chat: chatBy.get(year) ?? 0,
      };
    });
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function compute(d: RetroData, year: number | null): Stats {
  const inDay = (day: number) => year === null || yearOfDay(day) === year;
  const inTs = (t: number) => year === null || yearOfTs(t) === year;

  const watch = year === null ? d.watch : d.watch.filter((w) => inDay(w.day));

  let totalMin = 0, vodMin = 0;
  const dayMin = new Map<number, number>();
  const dayCh = new Map<number, Map<number, number>>();
  const chAgg = new Map<number, { min: number; days: Set<number>; first: number; last: number; g: Map<number, number> }>();
  const gAgg = new Map<number, { min: number; ch: Map<number, number> }>();
  const periods = new Map<string, number>();
  const weekdays = [0, 0, 0, 0, 0, 0, 0];
  const platforms: Record<Platform, number> = { web: 0, mobile: 0, tv: 0, other: 0 };

  for (const w of watch) {
    totalMin += w.min;
    if (w.vod) vodMin += w.min;
    platforms[w.platform] += w.min;
    inc(dayMin, w.day, w.min);
    let dc = dayCh.get(w.day);
    if (!dc) dayCh.set(w.day, (dc = new Map()));
    inc(dc, w.ch, w.min);

    let c = chAgg.get(w.ch);
    if (!c) chAgg.set(w.ch, (c = { min: 0, days: new Set(), first: w.day, last: w.day, g: new Map() }));
    c.min += w.min;
    c.days.add(w.day);
    if (w.day < c.first) c.first = w.day;
    if (w.day > c.last) c.last = w.day;
    if (w.game >= 0) {
      inc(c.g, w.game, w.min);
      let g = gAgg.get(w.game);
      if (!g) gAgg.set(w.game, (g = { min: 0, ch: new Map() }));
      g.min += w.min;
      inc(g.ch, w.ch, w.min);
    }
    const dt = new Date(w.day * DAY);
    const key = year === null ? String(dt.getUTCFullYear()) : String(dt.getUTCMonth());
    inc(periods, key, w.min);
    weekdays[(dt.getUTCDay() + 6) % 7] += w.min;
  }

  const periodList: Stats['periods'] = [];
  if (year !== null) {
    for (let m = 0; m < 12; m++) periodList.push({ key: String(m), label: MONTHS[m], min: periods.get(String(m)) ?? 0 });
  } else {
    const ys = [...periods.keys()].map(Number);
    if (ys.length)
      for (let y = Math.min(...ys); y <= Math.max(...ys); y++)
        periodList.push({ key: String(y), label: String(y), min: periods.get(String(y)) ?? 0 });
  }

  const channels: ChannelStat[] = [...chAgg.entries()]
    .map(([ch, c]) => ({ ch, min: c.min, days: c.days.size, first: c.first, last: c.last, topGame: argmax(c.g)[0] as number }))
    .sort((a, b) => b.min - a.min);
  const games: GameStat[] = [...gAgg.entries()]
    .map(([game, g]) => ({ game, min: g.min, channels: g.ch.size, topCh: argmax(g.ch)[0] as number }))
    .sort((a, b) => b.min - a.min);

  let biggestDay: Stats['biggestDay'] = null;
  for (const [day, min] of dayMin) if (!biggestDay || min > biggestDay.min) biggestDay = { day, min, topCh: -1 };
  if (biggestDay) biggestDay.topCh = argmax(dayCh.get(biggestDay.day)!)[0] as number;

  const days = [...dayMin.keys()].sort((a, b) => a - b);
  let streak = { len: 0, from: 0, to: 0 };
  let runStart = days[0], prev = days[0] - 1;
  for (const dd of days) {
    if (dd !== prev + 1) runStart = dd;
    const len = dd - runStart + 1;
    if (len > streak.len) streak = { len, from: runStart, to: dd };
    prev = dd;
  }

  const top = channels.slice(0, 30);
  const loyal = top.length ? top.reduce((a, b) => (b.last - b.first > a.last - a.first ? b : a)) : null;

  let newChannels = channels.length;
  if (year !== null) {
    const firstEver = new Map<number, number>();
    for (const w of d.watch) if (!firstEver.has(w.ch)) firstEver.set(w.ch, w.day);
    newChannels = channels.filter((c) => inDay(firstEver.get(c.ch)!)).length;
  }

  const hours = new Array(24).fill(0);
  for (let i = 0; i < d.playTs.length; i++) {
    const t = d.playTs[i];
    if (inTs(t)) hours[new Date(t).getHours()]++;
  }

  // Chat
  const msgs = year === null ? d.chat : d.chat.filter((m) => inTs(m.ts));
  const chatCh = new Map<number, number>();
  const chatDay = new Map<number, number>();
  let totalLen = 0;
  for (const m of msgs) {
    inc(chatCh, m.ch);
    inc(chatDay, localDay(m.ts));
    totalLen += m.body.length;
  }
  const [busyDay, busyN] = argmax(chatDay);

  const fol = d.follows.filter((f) => inTs(f.ts));
  const subs = d.subs.filter((s) => inTs(s.start));
  const subCh = new Map<number, number>();
  for (const s of subs) inc(subCh, s.ch, subMonths(s));
  const bitsCh = new Map<number, number>();
  let bitsTotal = 0;
  for (const b of d.bits) if (inTs(b.ts)) { inc(bitsCh, b.ch, b.amount); bitsTotal += b.amount; }
  const adCh = new Map<number, number>();
  let adCount = 0;
  for (let i = 0; i < d.adTs.length; i++) {
    if (!inTs(d.adTs[i])) continue;
    adCount++;
    if (d.adCh[i] >= 0) inc(adCh, d.adCh[i]);
  }

  return {
    year,
    totalMin,
    liveMin: totalMin - vodMin,
    vodMin,
    activeDays: dayMin.size,
    spanDays: days.length ? days[days.length - 1] - days[0] + 1 : 0,
    firstDay: days[0] ?? 0,
    lastDay: days[days.length - 1] ?? 0,
    channels,
    games,
    newChannels,
    periods: periodList,
    dayMin,
    weekdays,
    hours,
    platforms,
    biggestDay,
    streak,
    loyal,
    chat: {
      msgs,
      channels: sortMap(chatCh).map(([ch, n]) => ({ ch, n })),
      busiest: busyDay !== -1 ? { day: busyDay as number, n: busyN } : null,
      avgLen: msgs.length ? totalLen / msgs.length : 0,
    },
    follows: fol.filter((f) => !f.unfollow),
    unfollows: fol.filter((f) => f.unfollow).length,
    subs,
    subChannels: sortMap(subCh).map(([ch, months]) => ({ ch, months })),
    bits: { total: bitsTotal, channels: sortMap(bitsCh).map(([ch, n]) => ({ ch, n })) },
    ads: { count: adCount, channels: sortMap(adCh).map(([ch, n]) => ({ ch, n })) },
    watchedVods: year === null ? d.watchedVods : d.watchedVods.filter((v) => inDay(v.day)),
  };
}

export const subMonths = (s: Sub) => Math.max(1, Math.round((s.end - s.start) / (30 * DAY)));

/** Is the channel still followed at the end of the export? */
export function followState(d: RetroData): Map<number, { since: number; following: boolean; count: number }> {
  const m = new Map<number, { since: number; following: boolean; count: number }>();
  for (const f of d.follows) {
    const e = m.get(f.ch);
    if (!f.unfollow) {
      if (!e) m.set(f.ch, { since: f.ts, following: true, count: 1 });
      else {
        if (!e.following) e.since = f.ts;
        e.following = true;
        e.count++;
      }
    } else if (e) e.following = false;
    else m.set(f.ch, { since: f.ts, following: false, count: 0 });
  }
  return m;
}

export interface ChannelDetail {
  ch: number;
  rank: number;
  min: number;
  days: number;
  first: number;
  last: number;
  byYear: { year: number; min: number }[];
  games: { game: number; min: number }[];
  chat: number;
  firstMsg: RetroData['chat'][number] | null;
  biggestDay: { day: number; min: number } | null;
  subs: Sub[];
  bits: number;
  ads: number;
  vodMin: number;
  follow: { since: number; following: boolean } | null;
}

export function channelDetail(d: RetroData, ch: number, rank: number): ChannelDetail {
  let min = 0, vodMin = 0;
  const days = new Map<number, number>();
  const byYear = new Map<number, number>();
  const games = new Map<number, number>();
  for (const w of d.watch) {
    if (w.ch !== ch) continue;
    min += w.min;
    if (w.vod) vodMin += w.min;
    inc(days, w.day, w.min);
    inc(byYear, yearOfDay(w.day), w.min);
    if (w.game >= 0) inc(games, w.game, w.min);
  }
  const dayKeys = [...days.keys()];
  const [bd, bm] = argmax(days);
  const msgs = d.chat.filter((m) => m.ch === ch);
  let ads = 0;
  for (let i = 0; i < d.adCh.length; i++) if (d.adCh[i] === ch) ads++;
  const years = [...byYear.keys()];
  const yearList: { year: number; min: number }[] = [];
  if (years.length) for (let y = Math.min(...years); y <= Math.max(...years); y++) yearList.push({ year: y, min: byYear.get(y) ?? 0 });
  const f = followState(d).get(ch);
  return {
    ch,
    rank,
    min,
    days: days.size,
    first: dayKeys.length ? Math.min(...dayKeys) : 0,
    last: dayKeys.length ? Math.max(...dayKeys) : 0,
    byYear: yearList,
    games: sortMap(games).map(([game, min]) => ({ game, min })),
    chat: msgs.length,
    firstMsg: msgs[0] ?? null,
    biggestDay: bd !== -1 ? { day: bd as number, min: bm } : null,
    subs: d.subs.filter((s) => s.ch === ch),
    bits: d.bits.filter((b) => b.ch === ch).reduce((a, b) => a + b.amount, 0),
    ads,
    vodMin,
    follow: f && f.count ? { since: f.since, following: f.following } : null,
  };
}

export interface GameDetail {
  game: number;
  min: number;
  byYear: { year: number; min: number }[];
  channels: { ch: number; min: number }[];
}

export function gameDetail(d: RetroData, game: number, year: number | null): GameDetail {
  let min = 0;
  const byYear = new Map<number, number>();
  const chs = new Map<number, number>();
  for (const w of d.watch) {
    if (w.game !== game) continue;
    const y = yearOfDay(w.day);
    inc(byYear, y, w.min);
    if (year !== null && y !== year) continue;
    min += w.min;
    inc(chs, w.ch, w.min);
  }
  const years = [...byYear.keys()];
  const yearList: { year: number; min: number }[] = [];
  if (years.length) for (let y = Math.min(...years); y <= Math.max(...years); y++) yearList.push({ year: y, min: byYear.get(y) ?? 0 });
  return { game, min, byYear: yearList, channels: sortMap(chs).map(([ch, min]) => ({ ch, min })) };
}
