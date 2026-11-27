import { tick } from 'svelte';
import type { RetroData, WorkerMsg } from './types';
import type { EnrichResponse, Emote } from '../../server/enrich';
import { compute, indexChannels, type Stats } from './stats';
import { taggedEmoteIds } from './words';
// Inlined so a page left open during a site update still has its worker.
import ParseWorker from './worker.ts?worker&inline';
import { saveExport, readExport, clearExport, KEEP_DAYS } from './store';

export type Route =
  | { page: 'overview' }
  | { page: 'streamers' }
  | { page: 'streamer'; key: string }
  | { page: 'categories' }
  | { page: 'category'; key: string }
  | { page: 'calendar' }
  | { page: 'chat' }
  | { page: 'follows' }
  | { page: 'support' }
  | { page: 'channel' }
  | { page: 'share'; target?: { kind: 'streamer' | 'category'; key: string } };

/** Top of the page now, and again once the new page has rendered (it can be taller). */
/**
 * Back to the top once the new page is in the DOM (it starts transparent and fades in),
 * so the old page never visibly jumps to its top before being replaced.
 */
function toTop() {
  void tick().then(() => scrollTo({ top: 0, behavior: 'instant' }));
}

/** Year filter carried in the URL: #/streamers?y=2023 */
function yearFromHash(hash: string): number | null {
  const m = /[?&]y=(\d{4})/.exec(hash);
  return m ? +m[1] : null;
}

function parseRoute(hash: string): Route {
  const [, a, b, c] = hash.replace(/^#/, '').split('?')[0].split('/').map((x) => {
    try {
      return decodeURIComponent(x);
    } catch {
      return x;
    }
  });
  switch (a) {
    case 'streamers':
      return b ? { page: 'streamer', key: b } : { page: 'streamers' };
    case 'categories':
      return b ? { page: 'category', key: b } : { page: 'categories' };
    case 'calendrier':
      return { page: 'calendar' };
    case 'chat':
      return { page: 'chat' };
    case 'follows':
      return { page: 'follows' };
    case 'soutien':
      return { page: 'support' };
    case 'chaine':
      return { page: 'channel' };
    case 'partager':
      return b === 'streamers' && c ? { page: 'share', target: { kind: 'streamer', key: c } }
        : b === 'categories' && c ? { page: 'share', target: { kind: 'category', key: c } }
        : { page: 'share' };
    default:
      return { page: 'overview' };
  }
}

function readPref(key: string, fallback: boolean) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}
function writePref(key: string, v: boolean) {
  try {
    localStorage.setItem(key, v ? '1' : '0');
  } catch {
    /* preference simply not kept */
  }
}

const OFFLINE_KEY = 'retro-offline';
function readOffline() {
  try {
    return localStorage.getItem(OFFLINE_KEY) === '1';
  } catch {
    return false;
  }
}

class AppState {
  data = $state.raw<RetroData | null>(null);
  year = $state<number | null>(yearFromHash(location.hash));
  route = $state<Route>(parseRoute(location.hash));
  remember = $state(readPref('retro-remember', true));
  /** Date the browser copy of the export expires, or null when there is none. */
  storedUntil = $state<number | null>(null);
  /** True while we look for a copy kept in this browser, so the home page does not flash. */
  booting = $state(true);
  get stored() {
    return this.storedUntil !== null;
  }
  loading = $state<string | null>(null);
  error = $state<string | null>(null);
  offline = $state(readOffline());
  enrich = $state.raw<EnrichResponse | null>(null);
  enrichState = $state<'idle' | 'loading' | 'done' | 'failed'>('idle');

  stats: Stats | null = $derived(this.data ? compute(this.data, this.year) : null);
  /** Per-channel rows, totals and all-time ranks, built once per export. */
  index = $derived(this.data ? indexChannels(this.data) : null);
  /** Twitch emote ids seen in message tags, by name (works for retired emotes too). */
  knownEmotes = $derived(this.data ? taggedEmoteIds(this.data.chat) : new Map<string, string>());

  constructor() {
    addEventListener('hashchange', () => {
      const prev = this.route;
      this.route = parseRoute(location.hash);
      const y = yearFromHash(location.hash);
      // Links inside the site have no ?y=: keep the current year and write it back in the URL.
      if (y !== null) this.year = y;
      else if (this.year !== null) this.writeYear();
      if (JSON.stringify(prev) !== JSON.stringify(this.route)) toTop();
    });
    // Any click on a link of the site goes back to the top, even to the page already shown.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    addEventListener('click', (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="#/"]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
      // Same page: no hashchange will follow, so go up here.
      const target = (a.getAttribute('href') ?? '').split('?')[0];
      if (target === location.hash.split('?')[0]) scrollTo({ top: 0, behavior: 'smooth' });
    });
    void readExport().then((saved) => {
      if (saved && !this.data && !this.loading) {
        this.storedUntil = saved.savedAt + KEEP_DAYS * 86400000;
        void this.load(new File([saved.blob], 'export.zip'), false);
      } else this.booting = false;
    });
  }

  setYear(y: number | null) {
    this.year = y;
    this.writeYear();
    toTop(); // the page is rebuilt for the new year: start from its top
  }

  private writeYear() {
    const path = location.hash.replace(/^#/, '').split('?')[0] || '/';
    history.replaceState(null, '', '#' + path + (this.year !== null ? '?y=' + this.year : ''));
  }

  async forget() {
    await clearExport();
    this.reset();
  }

  setRemember(v: boolean) {
    this.remember = v;
    writePref('retro-remember', v);
  }

  setOffline(v: boolean) {
    this.offline = v;
    try {
      localStorage.setItem(OFFLINE_KEY, v ? '1' : '0');
    } catch {
      /* private mode: preference simply not kept */
    }
  }

  async load(file: File, save = this.remember) {
    this.error = null;
    if (save) void saveExport(file).then((at) => (this.storedUntil = at === null ? null : at + KEEP_DAYS * 86400000));
    this.loading = 'Lecture du fichier';
    let buf: ArrayBuffer;
    try {
      buf = await file.arrayBuffer();
    } catch {
      this.loading = null;
      this.booting = false;
      this.error = "Le fichier n'a pas pu être lu. S'il est encore en cours de téléchargement, attends la fin et réessaie.";
      return;
    }
    const worker = new ParseWorker();
    worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
      const m = e.data;
      if (m.type === 'progress') this.loading = m.step;
      else {
        worker.terminate();
        this.loading = null;
        this.booting = false;
        if (m.type === 'error') this.error = m.message;
        else {
          this.enrich = null;
          this.data = m.data;
          // Keep the page and year from the URL (reload, shared link); drop an unknown year.
          if (this.year !== null && !m.data.watch.some((w) => new Date(w.day * 86400000).getUTCFullYear() === this.year)) this.year = null;
          this.writeYear();
          if (!this.offline) void this.fetchEnrich();
        }
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      this.loading = null;
      this.booting = false;
      // An empty message usually means the worker script itself failed to load,
      // for example after the site was updated while the page stayed open.
      this.error = e.message || 'Le site a été mis à jour pendant que la page était ouverte. Recharge la page et réessaie.';
    };
    worker.postMessage(buf, [buf]);
  }

  reset() {
    void clearExport();
    this.storedUntil = null;
    this.year = null;
    this.data = null;
    this.enrich = null;
    this.enrichState = 'idle';
    location.hash = '#/';
  }

  /** Ask our server for avatars, box art and emotes. Only ids and game names are sent. */
  async fetchEnrich() {
    const d = this.data;
    if (!d) return;
    const all = compute(d, null);
    const ids = new Set<string>();
    const add = (ch: number) => {
      const id = d.channels[ch]?.id;
      if (id && /^\d+$/.test(id)) ids.add(id);
    };
    all.channels.slice(0, 350).forEach((c) => add(c.ch));
    all.chat.channels.slice(0, 80).forEach((c) => add(c.ch));
    all.subChannels.forEach((c) => add(c.ch));
    [...d.follows].reverse().forEach((f) => ids.size < 500 && add(f.ch));
    // Emotes of every chat you wrote in, most used first, fetched in batches.
    const emoteIds = all.chat.channels
      .map((c) => d.channels[c.ch]?.id)
      .filter((id): id is string => !!id && /^\d+$/.test(id))
      .slice(0, 300);
    const emoteChannels = emoteIds.slice(0, 30);
    // Channels where a subscriber badge shows in your messages: their badge images.
    const badgeChannels = [...new Set(d.chat.filter((m) => m.badges?.some((b) => b.startsWith('subscriber/'))).map((m) => d.channels[m.ch]?.id))]
      .filter((id): id is string => !!id && /^\d+$/.test(id))
      .slice(0, 40);
    const games = all.games.slice(0, 400).map((g) => d.games[g.game].name);
    this.enrichState = 'loading';
    try {
      const r = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: [...ids], games, emoteChannels, vods: d.watchedVods.slice(0, 1000).map((v) => v.id), badges: true, badgeChannels }),
      });
      if (!r.ok) throw new Error(String(r.status));
      if (this.data !== d) return;
      this.enrich = await r.json();
      this.enrichState = 'done';
      for (let i = 30; i < emoteIds.length; i += 30) {
        const rr = await fetch('/api/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emoteChannels: emoteIds.slice(i, i + 30) }),
        });
        if (!rr.ok || this.data !== d || !this.enrich) return;
        const more = (await rr.json()) as EnrichResponse;
        this.enrich = { ...this.enrich, emotes: { ...this.enrich.emotes, channels: { ...this.enrich.emotes.channels, ...more.emotes.channels } } };
      }
    } catch {
      if (!this.enrich) this.enrichState = 'failed';
    }
  }

  // ---- lazy enrichment for anything shown that the first request did not cover ----

  private wantedUsers = new Set<string>();
  private wantedGames = new Set<string>();
  private asked = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** Called by Avatar and BoxArt when they have nothing to show yet. */
  want(kind: 'user' | 'game', key: string) {
    if (this.offline || !this.enrich?.twitch || this.asked.has(kind + key)) return;
    this.asked.add(kind + key);
    (kind === 'user' ? this.wantedUsers : this.wantedGames).add(key);
    this.timer ??= setTimeout(() => void this.flushWanted(), 150);
  }

  private async flushWanted() {
    this.timer = null;
    const channels = [...this.wantedUsers].slice(0, 500);
    const games = [...this.wantedGames].slice(0, 400);
    channels.forEach((x) => this.wantedUsers.delete(x));
    games.forEach((x) => this.wantedGames.delete(x));
    if (!channels.length && !games.length) return;
    try {
      const r = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels, games }),
      });
      if (!r.ok || !this.enrich) return;
      const more = (await r.json()) as EnrichResponse;
      this.enrich = { ...this.enrich, missing: [...(this.enrich.missing ?? []), ...(more.missing ?? [])], users: { ...this.enrich.users, ...more.users }, games: { ...this.enrich.games, ...more.games } };
    } catch {
      /* images stay as initials */
    }
    if (this.wantedUsers.size || this.wantedGames.size) this.timer ??= setTimeout(() => void this.flushWanted(), 150);
  }

  // ---- readable addresses: #/streamers/otplol_ and #/categories/counter-strike ----

  /** login (current, export or former) -> channel; the most watched channel wins a clash. */
  private loginIndex = $derived.by(() => {
    const d = this.data;
    const m = new Map<string, number>();
    if (!d) return m;
    const total = new Map<number, number>();
    for (const w of d.watch) total.set(w.ch, (total.get(w.ch) ?? 0) + w.min);
    const order = d.channels.map((_, i) => i).sort((a, b) => (total.get(a) ?? 0) - (total.get(b) ?? 0));
    for (const i of order) {
      const c = d.channels[i];
      for (const name of [...c.oldNames].reverse()) m.set(name.toLowerCase(), i);
      m.set(c.name.toLowerCase(), i);
    }
    // Current logins from Twitch take priority over old ones.
    for (const i of order) {
      const login = this.enrich?.users[d.channels[i].id]?.login;
      if (login) m.set(login.toLowerCase(), i);
    }
    return m;
  });

  slug(name: string) {
    return name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
  }

  private gameIndex = $derived.by(() => {
    const m = new Map<string, number>();
    this.data?.games.forEach((g, i) => {
      const s = this.slug(g.name);
      if (!m.has(s)) m.set(s, i);
    });
    return m;
  });

  chHref(ch: number) {
    return '#/streamers/' + encodeURIComponent(this.login(ch));
  }

  gameHref(game: number) {
    return '#/categories/' + this.slug(this.data?.games[game]?.name ?? '');
  }

  resolveCh(key: string): number {
    const hit = this.loginIndex.get(key.toLowerCase());
    if (hit !== undefined) return hit;
    return /^\d+$/.test(key) && this.data?.channels[+key] ? +key : -1; // old numeric links
  }

  resolveGame(key: string): number {
    const hit = this.gameIndex.get(this.slug(key));
    if (hit !== undefined) return hit;
    return /^\d+$/.test(key) && this.data?.games[+key] ? +key : -1;
  }

  // ---- lookups used across pages ----

  /** The channel no longer exists on Twitch (deleted or banned). */
  gone(ch: number) {
    const id = this.data?.channels[ch]?.id;
    return !!id && !!this.enrich?.missing?.includes(id);
  }

  user(ch: number) {
    const id = this.data?.channels[ch]?.id;
    return id ? this.enrich?.users[id] : undefined;
  }

  /** Current display name when known, otherwise the latest login in the export. */
  chName(ch: number) {
    return this.user(ch)?.displayName ?? this.data?.channels[ch]?.name ?? '?';
  }

  /** Logins the channel had before, including the export's latest one if Twitch now shows another. */
  oldNames(ch: number): string[] {
    const c = this.data?.channels[ch];
    if (!c) return [];
    const now = this.user(ch)?.login;
    const names = now && now !== c.name ? [c.name, ...c.oldNames] : c.oldNames;
    return names.filter((x) => x !== now);
  }

  login(ch: number) {
    return this.user(ch)?.login ?? this.data?.channels[ch]?.name ?? '';
  }

  boxArt(game: number, w: number, hgt: number) {
    const name = this.data?.games[game]?.name;
    if (!name) return '';
    const g = this.enrich?.games[name.toLowerCase()];
    if (g) return g.boxArt.replace('{w}x{h}', `${w}x${hgt}`);
    if (g === null) return ''; // Twitch has no box art for it: show our own placeholder
    // Being looked up right now: wait for the real art instead of flashing a guess.
    if (this.enrich?.twitch && !this.offline) return '';
    return `https://static-cdn.jtvnw.net/ttv-boxart/${encodeURIComponent(name)}-${w}x${hgt}.jpg`;
  }

  gameName(game: number) {
    if (game < 0) return 'Catégorie inconnue';
    const name = this.data?.games[game]?.name ?? '?';
    return this.enrich?.games[name.toLowerCase()]?.name ?? name;
  }

  /** Emotes usable in a channel's chat: globals, every Twitch emote we know, the channel's own. */
  emoteMap = $derived.by(() => {
    const e = this.enrich?.emotes;
    if (!e || !e.global.length) return null;
    const global = new Map<string, Emote>();
    for (const x of e.global) global.set(x.name, x);
    // Twitch sub emotes work in every chat once subscribed.
    for (const list of Object.values(e.channels)) for (const x of list) if (x.provider === 'twitch' && !global.has(x.name)) global.set(x.name, x);
    const perChannel = new Map<string, Map<string, Emote>>();
    for (const [id, list] of Object.entries(e.channels)) {
      const m = new Map<string, Emote>();
      for (const x of list) if (x.provider !== 'twitch') m.set(x.name, x);
      perChannel.set(id, m);
    }
    return { global, perChannel };
  });
}

export const app = new AppState();

export function go(path: string) {
  location.hash = '#/' + path;
}
