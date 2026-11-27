import type { RetroData } from './types';

const DAY = 86400000;

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
  channelCount: number;
  gameCount: number;
  channels: ChannelStat[];
  games: GameStat[];
  months: { key: string; min: number }[];
  weekdays: number[]; // minutes, Monday first
  hours: number[]; // video plays per local hour
  biggestDay: { day: number; min: number; topCh: number } | null;
  streak: { len: number; from: number; to: number };
  loyal: ChannelStat | null; // longest first->last span among top channels
  newChannels: number;
  chat: {
    count: number;
    channels: { ch: number; n: number }[];
    first: { ts: number; ch: number; body: string } | null;
    busiest: { day: number; n: number } | null;
    words: { w: string; n: number }[];
    avgLen: number;
  };
  follows: { count: number; unfollows: number; first: { ts: number; ch: number } | null; last: { ts: number; ch: number } | null };
  subs: { total: number; paid: number; gift: number; prime: number; channels: { ch: number; months: number }[] };
  bits: { total: number; channels: { ch: number; n: number }[] };
}

export const yearOfDay = (day: number) => new Date(day * DAY).getUTCFullYear();
const yearOfTs = (t: number) => new Date(t).getFullYear();

const STOP = new Set(
  (
    'le la les un une des de du et en à a au aux ce ces cet cette il ils elle elles on je tu nous vous me te se ' +
    'mon ma mes ton ta tes son sa ses leur leurs que qui quoi dont où ou mais donc or ni car pas ne plus pour par ' +
    'sur sous dans avec sans est es suis sont été être ai as avons avez ont avoir fait faire va vais vas ça ca c ' +
    "j l d n s t qu y oui non si là la bien très tout tous toute toutes comme même aussi alors encore déjà c'est " +
    "j'ai t'as y'a il y the a an and or of to in is it you i me my we he she they this that for on be are was " +
    'so just like what no yes lol mdr ptdr xd ah oh euh bah ben hein ' +
    'moi toi lui eux quand juste rien trop faut dire vrai vraiment chat play reel quoi comment pourquoi parce ' +
    "qu'il qu'on qu'elle c'était j'suis jsp chui peut peux veut veux sais sait vois voir vient viens ici mtn " +
    'maintenant après avant jamais toujours rien encore fois gros mec bon beaucoup peu tant non avoir être pas ' +
    'can not but all your his her its our was were have has had will would there here then than with from'
  ).split(/\s+/),
);

export function availableYears(d: RetroData): number[] {
  const ys = new Set<number>();
  for (const w of d.watch) ys.add(yearOfDay(w.day));
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
    e.ch.set(w.ch, (e.ch.get(w.ch) ?? 0) + w.min);
    if (w.game >= 0) e.g.set(w.game, (e.g.get(w.game) ?? 0) + w.min);
    if (!firstSeen.has(w.ch)) firstSeen.set(w.ch, y);
  }
  const newBy = new Map<number, number>();
  for (const y of firstSeen.values()) newBy.set(y, (newBy.get(y) ?? 0) + 1);
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, e]) => {
      const [topCh, topChMin] = argmax(e.ch);
      return { year, min: e.min, days: e.days.size, topCh, topChMin, topGame: argmax(e.g)[0], newChannels: newBy.get(year) ?? 0 };
    });
}

function argmax(m: Map<number, number>): [number, number] {
  let best = -1, bv = -Infinity;
  for (const [k, v] of m) if (v > bv) { bv = v; best = k; }
  return [best, bv];
}

export function compute(d: RetroData, year: number | null): Stats {
  const inYearDay = (day: number) => year === null || yearOfDay(day) === year;
  const inYearTs = (t: number) => year === null || yearOfTs(t) === year;

  const watch = year === null ? d.watch : d.watch.filter((w) => inYearDay(w.day));

  let totalMin = 0, vodMin = 0;
  const dayMin = new Map<number, number>();
  const dayCh = new Map<number, Map<number, number>>();
  const chAgg = new Map<number, { min: number; days: Set<number>; first: number; last: number; g: Map<number, number> }>();
  const gAgg = new Map<number, { min: number; ch: Map<number, number> }>();
  const months = new Map<string, number>();
  const weekdays = [0, 0, 0, 0, 0, 0, 0];

  for (const w of watch) {
    totalMin += w.min;
    if (w.vod) vodMin += w.min;
    dayMin.set(w.day, (dayMin.get(w.day) ?? 0) + w.min);
    let dc = dayCh.get(w.day);
    if (!dc) dayCh.set(w.day, (dc = new Map()));
    dc.set(w.ch, (dc.get(w.ch) ?? 0) + w.min);

    let c = chAgg.get(w.ch);
    if (!c) chAgg.set(w.ch, (c = { min: 0, days: new Set(), first: w.day, last: w.day, g: new Map() }));
    c.min += w.min;
    c.days.add(w.day);
    if (w.day < c.first) c.first = w.day;
    if (w.day > c.last) c.last = w.day;
    if (w.game >= 0) {
      c.g.set(w.game, (c.g.get(w.game) ?? 0) + w.min);
      let g = gAgg.get(w.game);
      if (!g) gAgg.set(w.game, (g = { min: 0, ch: new Map() }));
      g.min += w.min;
      g.ch.set(w.ch, (g.ch.get(w.ch) ?? 0) + w.min);
    }
    const dt = new Date(w.day * DAY);
    const mk = year === null ? String(dt.getUTCFullYear()) : `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
    months.set(mk, (months.get(mk) ?? 0) + w.min);
    weekdays[(dt.getUTCDay() + 6) % 7] += w.min;
  }

  // Fill empty months so the chart has no gaps.
  const monthList: { key: string; min: number }[] = [];
  if (year !== null) {
    for (let m = 1; m <= 12; m++) {
      const k = `${year}-${String(m).padStart(2, '0')}`;
      monthList.push({ key: k, min: months.get(k) ?? 0 });
    }
  } else {
    const ys = [...months.keys()].map(Number);
    if (ys.length) for (let y = Math.min(...ys); y <= Math.max(...ys); y++) monthList.push({ key: String(y), min: months.get(String(y)) ?? 0 });
  }

  const channels: ChannelStat[] = [...chAgg.entries()]
    .map(([ch, c]) => ({ ch, min: c.min, days: c.days.size, first: c.first, last: c.last, topGame: argmax(c.g)[0] }))
    .sort((a, b) => b.min - a.min);
  const games: GameStat[] = [...gAgg.entries()]
    .map(([game, g]) => ({ game, min: g.min, channels: g.ch.size, topCh: argmax(g.ch)[0] }))
    .sort((a, b) => b.min - a.min);

  // Records
  let biggestDay: Stats['biggestDay'] = null;
  for (const [day, min] of dayMin) if (!biggestDay || min > biggestDay.min) biggestDay = { day, min, topCh: -1 };
  if (biggestDay) biggestDay.topCh = argmax(dayCh.get(biggestDay.day)!)[0];

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

  // Channels discovered this period (first ever watch falls inside it)
  let newChannels = channels.length;
  if (year !== null) {
    const firstEver = new Map<number, number>();
    for (const w of d.watch) if (!firstEver.has(w.ch)) firstEver.set(w.ch, w.day);
    newChannels = channels.filter((c) => inYearDay(firstEver.get(c.ch)!)).length;
  }

  // Hours of day from video play starts (viewer's local time zone)
  const hours = new Array(24).fill(0);
  for (let i = 0; i < d.playTs.length; i++) {
    const t = d.playTs[i];
    if (!inYearTs(t)) continue;
    hours[new Date(t).getHours()]++;
  }

  // Chat
  const chatMsgs = year === null ? d.chat : d.chat.filter((m) => inYearTs(m.ts));
  const chatCh = new Map<number, number>();
  const chatDay = new Map<number, number>();
  const words = new Map<string, number>();
  let totalLen = 0;
  for (const m of chatMsgs) {
    chatCh.set(m.ch, (chatCh.get(m.ch) ?? 0) + 1);
    const day = Math.floor((m.ts - new Date(m.ts).getTimezoneOffset() * 60000) / DAY);
    chatDay.set(day, (chatDay.get(day) ?? 0) + 1);
    totalLen += m.body.length;
    const seen = new Set<string>();
    for (const raw of m.body.split(/\s+/)) {
      const w = raw.replace(/^[^\p{L}\p{N}@]+|[^\p{L}\p{N}]+$/gu, '');
      if (w.length < 3 || w.startsWith('@') || /^\d+$/.test(w)) continue;
      // Keep emote-like casing (KEKW, SeemsGood) but merge plain words.
      const key = /\p{Lu}/u.test(w.slice(1)) ? w : w.toLowerCase();
      if (STOP.has(key.toLowerCase()) || seen.has(key)) continue;
      seen.add(key);
      words.set(key, (words.get(key) ?? 0) + 1);
    }
  }
  const [busyDay, busyN] = argmax(chatDay);

  // Follows
  const fol = d.follows.filter((f) => inYearTs(f.ts));
  const follows = fol.filter((f) => !f.unfollow);

  // Subs (a sub belongs to the year it started)
  const subsIn = d.subs.filter((s) => inYearTs(s.start));
  const subCh = new Map<number, number>();
  for (const s of subsIn) subCh.set(s.ch, (subCh.get(s.ch) ?? 0) + Math.max(1, Math.round((s.end - s.start) / (30 * DAY))));

  const bitsIn = d.bits.filter((b) => inYearTs(b.ts));
  const bitsCh = new Map<number, number>();
  for (const b of bitsIn) bitsCh.set(b.ch, (bitsCh.get(b.ch) ?? 0) + b.amount);

  return {
    year,
    totalMin,
    liveMin: totalMin - vodMin,
    vodMin,
    activeDays: dayMin.size,
    spanDays: days.length ? days[days.length - 1] - days[0] + 1 : 0,
    firstDay: days[0] ?? 0,
    lastDay: days[days.length - 1] ?? 0,
    channelCount: channels.length,
    gameCount: games.length,
    channels,
    games,
    months: monthList,
    weekdays,
    hours,
    biggestDay,
    streak,
    loyal,
    newChannels,
    chat: {
      count: chatMsgs.length,
      channels: sortMap(chatCh).map(([ch, n]) => ({ ch, n })),
      first: chatMsgs[0] ?? null,
      busiest: busyDay >= 0 ? { day: busyDay, n: busyN } : null,
      words: sortMap(words).slice(0, 40).map(([w, n]) => ({ w, n })),
      avgLen: chatMsgs.length ? totalLen / chatMsgs.length : 0,
    },
    follows: {
      count: follows.length,
      unfollows: fol.length - follows.length,
      first: follows[0] ?? null,
      last: follows[follows.length - 1] ?? null,
    },
    subs: {
      total: subsIn.length,
      paid: subsIn.filter((s) => s.kind === 'paid').length,
      gift: subsIn.filter((s) => s.kind === 'gift').length,
      prime: subsIn.filter((s) => s.kind === 'prime').length,
      channels: sortMap(subCh).map(([ch, months]) => ({ ch, months })),
    },
    bits: { total: bitsIn.reduce((a, b) => a + b.amount, 0), channels: sortMap(bitsCh).map(([ch, n]) => ({ ch, n })) },
  };
}

function sortMap<K>(m: Map<K, number>): [K, number][] {
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
