import type { RetroData, WorkerMsg } from './types';
import type { EnrichResponse, Emote } from '../../server/enrich';
import { compute, type Stats } from './stats';
// Inlined so a page left open during a site update still has its worker.
import ParseWorker from './worker.ts?worker&inline';

export type Route =
  | { page: 'overview' }
  | { page: 'streamers' }
  | { page: 'streamer'; ch: number }
  | { page: 'categories' }
  | { page: 'category'; game: number }
  | { page: 'calendar' }
  | { page: 'chat' }
  | { page: 'follows' }
  | { page: 'support' }
  | { page: 'channel' }
  | { page: 'share' };

function parseRoute(hash: string): Route {
  const [, a, b] = hash.replace(/^#/, '').split('/');
  const id = b !== undefined && /^\d+$/.test(b) ? +b : -1;
  switch (a) {
    case 'streamers':
      return id >= 0 ? { page: 'streamer', ch: id } : { page: 'streamers' };
    case 'categories':
      return id >= 0 ? { page: 'category', game: id } : { page: 'categories' };
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
      return { page: 'share' };
    default:
      return { page: 'overview' };
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
  year = $state<number | null>(null);
  route = $state<Route>(parseRoute(location.hash));
  loading = $state<string | null>(null);
  error = $state<string | null>(null);
  offline = $state(readOffline());
  enrich = $state.raw<EnrichResponse | null>(null);
  enrichState = $state<'idle' | 'loading' | 'done' | 'failed'>('idle');

  stats: Stats | null = $derived(this.data ? compute(this.data, this.year) : null);

  constructor() {
    addEventListener('hashchange', () => {
      this.route = parseRoute(location.hash);
      scrollTo(0, 0);
    });
  }

  setOffline(v: boolean) {
    this.offline = v;
    try {
      localStorage.setItem(OFFLINE_KEY, v ? '1' : '0');
    } catch {
      /* private mode: preference simply not kept */
    }
  }

  async load(file: File) {
    this.error = null;
    this.loading = 'Lecture du fichier';
    let buf: ArrayBuffer;
    try {
      buf = await file.arrayBuffer();
    } catch {
      this.loading = null;
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
        if (m.type === 'error') this.error = m.message;
        else {
          this.year = null;
          this.enrich = null;
          this.data = m.data;
          location.hash = '#/';
          if (!this.offline) void this.fetchEnrich();
        }
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      this.loading = null;
      // An empty message usually means the worker script itself failed to load,
      // for example after the site was updated while the page stayed open.
      this.error = e.message || 'Le site a été mis à jour pendant que la page était ouverte. Recharge la page et réessaie.';
    };
    worker.postMessage(buf, [buf]);
  }

  reset() {
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
    const games = all.games.slice(0, 400).map((g) => d.games[g.game].name);
    this.enrichState = 'loading';
    try {
      const r = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: [...ids], games, emoteChannels, vods: d.watchedVods.slice(0, 300).map((v) => v.id) }),
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

  // ---- lookups used across pages ----

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
