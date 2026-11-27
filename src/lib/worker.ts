/// <reference lib="webworker" />
import { unzipSync, strFromU8 } from 'fflate';
import { readCsv } from './csv';
import type { Channel, ChatMsg, FollowEvent, RetroData, Sub, Bits, WatchRow, WorkerMsg, Platform, OwnVod, WatchedVod } from './types';

/**
 * The only files ever decompressed. Everything else in the export (security
 * logs, page views, ads, email/phone in users/*.json...) stays compressed and
 * is never read.
 */
const FILES = [
  'metadata.json',
  'account/info/login_rename.csv',
  'site_history/minute_watched.csv',
  'site_history/video_play.csv',
  'site_history/chat_messages.csv',
  'site_history/minute_broadcast.csv',
  'community/follows/follow.csv',
  'community/follows/unfollow.csv',
  'community/follows/follow_game.csv',
  'commerce/subs/subscriptions.csv',
  'commerce/bits/bits_cheered.csv',
  'vod/vod_create.csv',
  'users/user/',
  'ads/video_ad_impression.csv',
] as const;
type FileKey = (typeof FILES)[number];

const post = (m: WorkerMsg) => (self as unknown as Worker).postMessage(m);

self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  try {
    post({ type: 'done', data: build(new Uint8Array(e.data)) });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};

// ---------- time helpers ----------

const DAY = 86400000;

/** "YYYY-MM-DD HH:MM:SS" as UTC. */
function parseUtc(s: string): number {
  if (s.length < 10) return NaN;
  const y = +s.slice(0, 4), mo = +s.slice(5, 7), d = +s.slice(8, 10);
  const h = s.length >= 13 ? +s.slice(11, 13) : 0;
  const mi = s.length >= 16 ? +s.slice(14, 16) : 0;
  const se = s.length >= 19 ? +s.slice(17, 19) : 0;
  return Date.UTC(y, mo - 1, d, h, mi, se);
}

/** nth Sunday of a month (UTC date at 10:00 UTC = 02:00 PT). */
function nthSunday(y: number, month: number, n: number): number {
  const first = new Date(Date.UTC(y, month, 1)).getUTCDay();
  const day = 1 + ((7 - first) % 7) + (n - 1) * 7;
  return Date.UTC(y, month, day);
}

/** The export's "time" column is US Pacific time. Convert it to UTC. */
function parsePacific(s: string): number {
  const local = parseUtc(s);
  if (Number.isNaN(local)) return NaN;
  const y = new Date(local).getUTCFullYear();
  const dstStart = nthSunday(y, 2, 2) + 2 * 3600000; // 2nd Sunday of March, 02:00
  const dstEnd = nthSunday(y, 10, 1) + 2 * 3600000; // 1st Sunday of November, 02:00
  const offsetH = local >= dstStart && local < dstEnd ? 7 : 8;
  return local + offsetH * 3600000;
}

function ts(timeUtc: string, time: string): number {
  if (timeUtc) {
    const t = parseUtc(timeUtc);
    if (!Number.isNaN(t)) return t;
  }
  return parsePacific(time);
}

const dayOf = (s: string) => Math.floor(parseUtc(s) / DAY);

// ---------- channels ----------

const BAD_NAMES = new Set(['', 'null', '0', 'undefined', '--redacted_channel--']);

class Registry {
  channels: Channel[] = [];
  private byId = new Map<string, number>();
  /** login -> observations of that login by channel */
  private byName = new Map<string, { idx: number; first: number; last: number }[]>();
  /** per channel: login -> last seen */
  private seen: Map<string, { first: number; last: number; n: number }>[] = [];

  private create(id: string): number {
    const idx = this.channels.length;
    this.channels.push({ id, name: '', oldNames: [] });
    this.seen.push(new Map());
    this.byId.set(id, idx);
    return idx;
  }

  /** Record that channel `id` was called `name` at time `t`. */
  observe(id: string, rawName: string, t: number): number {
    const name = rawName.trim().toLowerCase();
    if (!id || id === '0' || id.toLowerCase() === 'null') return this.resolve(name, t);
    let idx = this.byId.get(id);
    if (idx === undefined) idx = this.create(id);
    if (!BAD_NAMES.has(name)) {
      const m = this.seen[idx];
      const o = m.get(name);
      if (!o) m.set(name, { first: t, last: t, n: 1 });
      else {
        o.n++;
        if (t < o.first) o.first = t;
        if (t > o.last) o.last = t;
      }
    }
    return idx;
  }

  private nameIndexBuilt = false;

  /**
   * Names a channel really had. The export has a little noise (a row of
   * kamet0's id labelled "etoiles"), so a name seen only once or twice, or
   * under 1 % of a channel's rows, is ignored unless it is the only one.
   */
  private reliable(idx: number) {
    const all = [...this.seen[idx].entries()];
    const total = all.reduce((a, [, o]) => a + o.n, 0);
    const ok = all.filter(([, o]) => o.n >= 3 && o.n >= total * 0.01);
    return ok.length ? ok : all.sort((a, b) => b[1].n - a[1].n).slice(0, 1);
  }

  /** Build name -> channel index once all id-bearing files are read. */
  buildNameIndex() {
    this.byName.clear();
    this.seen.forEach((_, idx) => {
      for (const [name, o] of this.reliable(idx)) {
        let arr = this.byName.get(name);
        if (!arr) this.byName.set(name, (arr = []));
        arr.push({ idx, first: o.first, last: o.last });
      }
    });
    this.nameIndexBuilt = true;
  }

  /** Channel for a login at time t (for files that only give a login). */
  resolve(rawName: string, t: number): number {
    const name = rawName.trim().toLowerCase();
    if (BAD_NAMES.has(name)) return -1;
    if (this.nameIndexBuilt) {
      const arr = this.byName.get(name);
      if (arr && arr.length) {
        if (arr.length === 1 || Number.isNaN(t)) return arr[0].idx;
        let best = arr[0], bestDist = Infinity;
        for (const o of arr) {
          const dist = t < o.first ? o.first - t : t > o.last ? t - o.last : 0;
          if (dist < bestDist) { bestDist = dist; best = o; }
        }
        return best.idx;
      }
    }
    const pseudo = 'name:' + name;
    let idx = this.byId.get(pseudo);
    if (idx === undefined) {
      idx = this.create(pseudo);
      this.seen[idx].set(name, { first: t, last: t, n: 1 });
    }
    return idx;
  }

  finish() {
    this.channels.forEach((c, idx) => {
      const names = this.reliable(idx).sort((a, b) => b[1].last - a[1].last);
      c.name = names[0]?.[0] ?? (c.id.startsWith('name:') ? c.id.slice(5) : '#' + c.id);
      c.oldNames = names.slice(1).map((n) => n[0]);
    });
  }
}

// ---------- games ----------

class Games {
  names: { name: string }[] = [];
  private byKey = new Map<string, number>();
  private proper = new Map<string, string>();

  key(name: string) {
    return name.trim().toLowerCase();
  }

  /** Remember a correctly-cased game name (from files that keep the casing). */
  teach(name: string) {
    const n = name.trim();
    if (!n) return;
    const k = this.key(n);
    if (n !== k || !this.proper.has(k)) {
      // Prefer a version with capitals over an all-lowercase one.
      if (!this.proper.has(k) || this.proper.get(k) === k) this.proper.set(k, n);
    }
  }

  get(name: string): number {
    const k = this.key(name);
    if (!k || k === 'null') return -1;
    let idx = this.byKey.get(k);
    if (idx === undefined) {
      idx = this.names.length;
      this.names.push({ name: k });
      this.byKey.set(k, idx);
    }
    return idx;
  }

  finish() {
    for (const g of this.names) {
      const k = g.name;
      g.name = this.proper.get(k) ?? titleCase(k);
    }
  }
}

/**
 * Recent messages keep their IRC tags. Only these are read: emotes (ids and
 * positions), badges, subscriber tenure and the login replied to. Message ids,
 * nonces and the rest are ignored.
 */
function readTags(tags: string, body: string, msg: ChatMsg) {
  const get = (k: string) => {
    const m = new RegExp('(?:^|;)' + k + '=([^;]*)').exec(tags);
    return m ? m[1] : '';
  };
  const em = get('emotes');
  if (em) {
    const cps = Array.from(body); // positions count code points
    const list: { id: string; name: string }[] = [];
    for (const part of em.split('/')) {
      const [id, ranges] = part.split(':');
      if (!id || !ranges) continue;
      for (const range of ranges.split(',')) {
        const [a, b] = range.split('-').map(Number);
        const name = cps.slice(a, b + 1).join('');
        if (name && !/\s/.test(name)) list.push({ id, name });
      }
    }
    if (list.length) msg.emotes = list;
  }
  const badges = get('badges');
  if (badges) msg.badges = badges.split(',').filter(Boolean);
  const sub = /subscriber\/(\d+)/.exec(get('badge-info'));
  if (sub) msg.subMonths = +sub[1];
  const reply = get('reply-parent-user-login');
  if (reply) msg.replyTo = reply;
}

/** Twitch prefixes cells starting with @ + - = with a quote (spreadsheet formula guard). */
function unescapeCell(s: string) {
  return s.length > 1 && s[0] === "'" && '@+-='.includes(s[1]) ? s.slice(1) : s;
}

function platformOf(p: string): Platform {
  switch (p) {
    case 'web':
    case 'desktop':
      return 'web';
    case 'android':
    case 'ios':
    case 'mobile_web':
      return 'mobile';
    case '':
      return 'other';
    default:
      return 'tv'; // tv, chromecast, consoles, set-top boxes
  }
}

function titleCase(s: string) {
  return s.replace(/(^|[\s:\-(/])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

// ---------- main ----------

function build(zipBytes: Uint8Array): RetroData {
  const t0 = performance.now();
  post({ type: 'progress', step: 'Décompression' });

  // Find the folder prefix (usually "request/") and only extract our files.
  const wanted = new Map<string, FileKey>();
  const files = unzipSync(zipBytes, {
    filter: (f) => {
      const path = f.name.replace(/\\/g, '/');
      for (const k of FILES) {
        if (path === k || path.endsWith('/' + k) || (k.endsWith('/') && path.includes('/' + k) && path.endsWith('.json'))) {
          wanted.set(f.name, k);
          return true;
        }
      }
      return false;
    },
  });
  const text = (k: FileKey): string => {
    for (const [name, key] of wanted) if (key === k) return strFromU8(files[name]);
    return '';
  };
  if (!wanted.size || ![...wanted.values()].includes('site_history/minute_watched.csv')) {
    throw new Error("Ce zip ne ressemble pas à un export de données Twitch (minute_watched.csv introuvable).");
  }
  const t1 = performance.now();

  const reg = new Registry();
  const games = new Games();

  // --- video plays (proper-cased game names + channel ids + exact times)
  post({ type: 'progress', step: 'Lectures vidéo' });
  const playTs: number[] = [];
  const playCh: number[] = [];
  // How your own login was written (capitals) over the years, for "Tes pseudos".
  const myCase = new Map<string, Map<string, number>>();
  const seeCase = (login: string) => {
    if (!login || login === login.toLowerCase()) return;
    const k = login.toLowerCase();
    const m = myCase.get(k) ?? new Map<string, number>();
    m.set(login, (m.get(login) ?? 0) + 1);
    myCase.set(k, m);
  };
  // Replays and clips started: many short ones never reach minute_watched.
  const playedVods = new Map<string, { ch: number; day: number }>();
  const clipTs: number[] = [];
  const clipCh: number[] = [];
  readCsv(text('site_history/video_play.csv'), ['time', 'time_utc', 'channel', 'channel_id', 'game', 'login', 'content_mode', 'vod_id', 'live'], (r) => {
    seeCase(r[5]);
    const t = ts(r[1], r[0]);
    if (r[4]) games.teach(r[4]);
    const ch = reg.observe(r[3], r[2], t);
    if (Number.isNaN(t) || ch < 0) return;
    if (r[6] === 'clip') {
      clipTs.push(t);
      clipCh.push(ch);
      return;
    }
    if (r[8] === 'f' && (r[6] === 'vod' || r[6] === 'vodcast') && r[7]) {
      const id = r[7].replace(/^v/, '');
      if (!playedVods.has(id)) playedVods.set(id, { ch, day: Math.floor(t / DAY) });
    }
    playTs.push(t);
    playCh.push(ch);
  });

  // --- minutes watched
  post({ type: 'progress', step: 'Minutes regardées' });
  const agg = new Map<string, WatchRow>();
  const vods = new Map<string, WatchedVod>();
  readCsv(
    text('site_history/minute_watched.csv'),
    ['day', 'channel_id', 'channel_name', 'game_name', 'minutes_watched_unadjusted', 'content_mode', 'platform', 'vod_id', 'user_login'],
    (r) => {
      seeCase(r[8]);
      const min = +r[4];
      if (!min || !r[0]) return;
      const day = dayOf(r[0]);
      if (Number.isNaN(day)) return;
      const ch = reg.observe(r[1], r[2], day * DAY);
      if (ch < 0) return;
      const game = games.get(r[3]);
      const vod = r[5] ? !r[5].startsWith('live') : false;
      const platform = platformOf(r[6]);
      const key = day + '|' + ch + '|' + game + '|' + (vod ? 1 : 0) + platform;
      const row = agg.get(key);
      if (row) row.min += min;
      else agg.set(key, { day, ch, game, min, vod, platform });
      if (vod && r[7]) {
        const vid = r[7].replace(/^v/, ''); // the export writes the same VOD as "v123" and "123"
        const v = vods.get(vid);
        if (v) v.min += min;
        else vods.set(vid, { id: vid, ch, min, day });
      }
    },
  );

  // --- follows
  post({ type: 'progress', step: 'Follows' });
  const follows: FollowEvent[] = [];
  const readFollows = (k: FileKey, unfollow: boolean) =>
    readCsv(text(k), ['time', 'time_utc', 'channel', 'channel_id', 'channel_game'], (r) => {
      const t = ts(r[1], r[0]);
      if (r[4]) games.teach(r[4]);
      const ch = reg.observe(r[3], r[2], t);
      if (ch >= 0 && !Number.isNaN(t)) follows.push({ ts: t, ch, unfollow });
    });
  readFollows('community/follows/follow.csv', false);
  readFollows('community/follows/unfollow.csv', true);

  const gameFollowsRaw: { ts: number; name: string }[] = [];
  readCsv(text('community/follows/follow_game.csv'), ['time', 'time_utc', 'game'], (r) => {
    if (!r[2]) return;
    games.teach(r[2]);
    gameFollowsRaw.push({ ts: ts(r[1], r[0]), name: r[2] });
  });

  // --- bits
  const bits: Bits[] = [];
  readCsv(
    text('commerce/bits/bits_cheered.csv'),
    ['time', 'time_utc', 'channel_login', 'channel_id', 'used_total'],
    (r) => {
      const t = ts(r[1], r[0]);
      const ch = reg.observe(r[3], r[2], t);
      if (ch >= 0) bits.push({ ts: t, ch, amount: +r[4] || 0 });
    },
  );

  // --- own broadcasts + VODs
  const bAgg = new Map<string, { day: number; min: number; game: number }>();
  readCsv(text('site_history/minute_broadcast.csv'), ['time', 'time_utc', 'game', 'minutes_broadcast'], (r) => {
    const t = ts(r[1], r[0]);
    if (Number.isNaN(t)) return;
    if (r[2]) games.teach(r[2]);
    const m = +r[3] || 1;
    const day = Math.floor(t / DAY);
    const game = games.get(r[2]);
    const key = day + '|' + game;
    const e = bAgg.get(key);
    if (e) e.min += m;
    else bAgg.set(key, { day, min: m, game });
  });
  const ownVodsRaw: { id: string; ts: number; title: string; game: string; seconds: number }[] = [];
  readCsv(text('vod/vod_create.csv'), ['vod_id', 'game', 'time', 'time_utc', 'title', 'video_duration'], (r) => {
    if (r[1]) games.teach(r[1]);
    if (r[0]) ownVodsRaw.push({ id: r[0], game: r[1], ts: ts(r[3], r[2]), title: unescapeCell(r[4]), seconds: +r[5] || 0 });
  });

  // --- ads seen (only time and channel are read)
  const adTs: number[] = [];
  const adCh: number[] = [];
  readCsv(text('ads/video_ad_impression.csv'), ['time', 'time_utc', 'channel', 'channel_id'], (r) => {
    const t = ts(r[1], r[0]);
    if (Number.isNaN(t)) return;
    adTs.push(t);
    adCh.push(reg.observe(r[3], r[2], t));
  });

  // Logins-only files are resolved once every id has been seen.
  reg.buildNameIndex();

  // --- chat
  post({ type: 'progress', step: 'Messages du chat' });
  const chat: ChatMsg[] = [];
  readCsv(text('site_history/chat_messages.csv'), ['time', 'time_utc', 'channel', 'body', 'filtered_tags'], (r) => {
    const t = ts(r[1], r[0]);
    if (Number.isNaN(t)) return;
    const ch = reg.resolve(r[2], t);
    if (ch < 0) return;
    const raw = unescapeCell(r[3]);
    const msg: ChatMsg = { ts: t, ch, body: raw.replace(/\\U000e0000/gi, '').trim() };
    if (r[4]) readTags(r[4], raw, msg);
    chat.push(msg);
  });

  // --- subs
  const subs: Sub[] = [];
  readCsv(
    text('commerce/subs/subscriptions.csv'),
    ['channel_login', 'access_start', 'access_end', 'is_paid', 'is_gift', 'is_prime_sub'],
    (r) => {
      const start = parseUtc(r[1]);
      const end = parseUtc(r[2]);
      const ch = reg.resolve(r[0], start);
      if (ch < 0 || Number.isNaN(start)) return;
      const kind: Sub['kind'] = r[5] === 't' ? 'prime' : r[4] === 't' ? 'gift' : r[3] === 't' ? 'paid' : 'other';
      subs.push({ ch, start, end: Number.isNaN(end) ? start : end, kind });
    },
  );

  // --- user
  const meta = (() => {
    try {
      const j = JSON.parse(text('metadata.json') || '{}');
      // Only these three fields are kept.
      return { login: String(j.Username ?? ''), userId: String(j.UserID ?? ''), start: Date.parse(j.StartTime), end: Date.parse(j.EndTime) };
    } catch {
      return { login: '', userId: '', start: NaN, end: NaN };
    }
  })();
  const renames: RetroData['user']['renames'] = [];
  readCsv(text('account/info/login_rename.csv'), ['time', 'time_utc', 'old_login', 'new_login'], (r) => {
    if (r[2] && r[3] && r[2] !== r[3]) renames.push({ ts: ts(r[1], r[0]), from: r[2], to: r[3] });
  });
  renames.sort((a, b) => a.ts - b.ts);
  // Current display name: only the "displayname" field of users/user/<id>.json is
  // read, with a pattern, so the rest of that file (email, phone...) is never parsed.
  const userJson = text('users/user/' as FileKey);
  const dn = /"displayname"\s*:\s*"([^"\\]{1,40})"/i.exec(userJson);
  if (dn) seeCase(dn[1]), seeCase(dn[1]), seeCase(dn[1]);
  const displayNames: Record<string, string> = {};
  for (const [k, m] of myCase) displayNames[k] = [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
  if (dn) displayNames[dn[1].toLowerCase()] = dn[1];

  reg.finish();
  const gameFollows = gameFollowsRaw.map((g) => ({ ts: g.ts, game: games.get(g.name) }));
  const ownVods: OwnVod[] = ownVodsRaw.map((v) => ({ id: v.id, ts: v.ts, title: v.title, game: games.get(v.game), seconds: v.seconds }));
  games.finish();

  const watch = [...agg.values()].sort((a, b) => a.day - b.day);
  chat.sort((a, b) => a.ts - b.ts);
  follows.sort((a, b) => a.ts - b.ts);
  // The export logs repeated "follow" events for a channel already followed
  // (1 672 for a single channel in one export). Keep only real changes of state:
  // a follow when not following, an unfollow when following.
  const following = new Map<number, boolean>();
  const cleaned = follows.filter((f) => {
    const was = following.get(f.ch);
    if (!f.unfollow && was === true) return false;
    if (f.unfollow && was === false) return false;
    following.set(f.ch, !f.unfollow);
    return true;
  });
  follows.length = 0;
  follows.push(...cleaned);
  subs.sort((a, b) => a.start - b.start);

  const t2 = performance.now();
  return {
    user: { ...meta, renames, displayNames },
    channels: reg.channels,
    games: games.names,
    watch,
    playTs: Float64Array.from(playTs),
    playCh: Int32Array.from(playCh),
    chat,
    follows,
    gameFollows,
    subs,
    bits,
    adTs: Float64Array.from(adTs),
    adCh: Int32Array.from(adCh),
    broadcast: [...bAgg.values()].sort((a, b) => a.day - b.day),
    ownVods: ownVods.sort((a, b) => b.ts - a.ts),
    watchedVods: [
      ...[...vods.values()].sort((a, b) => b.min - a.min),
      // Started but under a minute counted: still a replay you opened.
      ...[...playedVods].filter(([id]) => !vods.has(id)).map(([id, v]) => ({ id, ch: v.ch, min: 0, day: v.day })).sort((a, b) => b.day - a.day),
    ],
    clipTs: Float64Array.from(clipTs),
    clipCh: Int32Array.from(clipCh),
    timings: { unzip: Math.round(t1 - t0), parse: Math.round(t2 - t1) },
  };
}
