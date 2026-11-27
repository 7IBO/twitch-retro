/**
 * Enrichment endpoint: turns channel ids and game names into avatars, current
 * logins, box art and emotes. Nothing is stored or logged: requests only go
 * to Twitch's public API and to the 7TV, BTTV and FFZ public APIs, and the
 * only memory kept is a short in-process cache of their public answers.
 */

export interface Env {
  TWITCH_CLIENT_ID?: string;
  TWITCH_CLIENT_SECRET?: string;
}

export interface EnrichRequest {
  channels?: string[]; // Twitch user ids
  games?: string[]; // game names
  emoteChannels?: string[]; // user ids whose channel emotes are wanted
  vods?: string[]; // video ids
  badges?: boolean; // global chat badges
  badgeChannels?: string[]; // user ids whose subscriber badges are wanted
}

export interface Emote {
  name: string;
  url: string;
  provider: 'twitch' | '7tv' | 'bttv' | 'ffz';
}

export interface EnrichResponse {
  twitch: boolean; // false when the server has no Twitch credentials
  users: Record<string, { login: string; displayName: string; avatar: string; type: string; createdAt: string; lang: string }>;
  games: Record<string, { id: string; name: string; boxArt: string } | null>; // keyed by lowercase name, null when Twitch has no such category
  emotes: { global: Emote[]; channels: Record<string, Emote[]> };
  vods: Record<string, { title: string; createdAt: string; duration: string; type: string; thumb: string }>;
  badges: Record<string, { title: string; url: string }>; // "set/version"
  channelBadges: Record<string, Record<string, { title: string; url: string }>>;
}

const LIMITS = { channels: 500, games: 400, emoteChannels: 40, vods: 300, badgeChannels: 40 };
const TTL = 6 * 3600 * 1000;
const cache = new Map<string, { exp: number; val: unknown }>();
let token: { value: string; exp: number } | null = null;

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.val as T;
  const val = await fn();
  cache.set(key, { exp: Date.now() + TTL, val });
  if (cache.size > 20000) cache.delete(cache.keys().next().value!);
  return val;
}

async function getJson(url: string, init?: RequestInit): Promise<any> {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  return r.json();
}

async function appToken(env: Env): Promise<string | null> {
  if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) return null;
  if (token && token.exp > Date.now() + 60000) return token.value;
  const body = new URLSearchParams({
    client_id: env.TWITCH_CLIENT_ID,
    client_secret: env.TWITCH_CLIENT_SECRET,
    grant_type: 'client_credentials',
  });
  const j = await getJson('https://id.twitch.tv/oauth2/token', { method: 'POST', body });
  if (!j?.access_token) return null;
  token = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return token.value;
}

function chunks<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const clean = (arr: unknown, max: number, re: RegExp) =>
  [...new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string' && re.test(x)) : [])].slice(0, max);

export async function enrich(input: EnrichRequest, env: Env): Promise<EnrichResponse> {
  const ids = clean(input.channels, LIMITS.channels, /^\d{1,12}$/);
  const gameNames = clean(input.games, LIMITS.games, /^.{1,120}$/s);
  const emoteIds = clean(input.emoteChannels, LIMITS.emoteChannels, /^\d{1,12}$/);
  const vodIds = clean(input.vods, LIMITS.vods, /^\d{1,14}$/);

  const tok = await appToken(env);
  const helix = async (path: string) => {
    if (!tok) return null;
    return getJson('https://api.twitch.tv/helix/' + path, {
      headers: { 'Client-Id': env.TWITCH_CLIENT_ID!, Authorization: 'Bearer ' + tok },
    });
  };

  const res: EnrichResponse = { twitch: !!tok, users: {}, games: {}, emotes: { global: [], channels: {} }, vods: {}, badges: {}, channelBadges: {} };

  const usersTask = (async () => {
    if (!tok) return;
    const missing = ids.filter((id) => !cache.has('u:' + id));
    await Promise.all(
      chunks(missing, 100).map(async (batch) => {
        const q = batch.map((id) => 'id=' + id).join('&');
        const [u, c] = await Promise.all([helix('users?' + q), helix('channels?' + q.replace(/id=/g, 'broadcaster_id='))]);
        const lang = new Map<string, string>((c?.data ?? []).map((x: any) => [x.broadcaster_id, x.broadcaster_language]));
        for (const x of u?.data ?? []) {
          cache.set('u:' + x.id, {
            exp: Date.now() + TTL,
            val: {
              login: x.login,
              displayName: x.display_name,
              avatar: x.profile_image_url,
              type: x.broadcaster_type,
              createdAt: x.created_at,
              lang: lang.get(x.id) ?? '',
            },
          });
        }
        // Remember deleted/banned channels too, so they are not asked again.
        for (const id of batch) if (!cache.has('u:' + id)) cache.set('u:' + id, { exp: Date.now() + TTL, val: null });
      }),
    );
    for (const id of ids) {
      const v = cache.get('u:' + id)?.val as EnrichResponse['users'][string] | null;
      if (v) res.users[id] = v;
    }
  })();

  const gamesTask = (async () => {
    if (!tok) return;
    const missing = gameNames.filter((n) => !cache.has('g:' + n.toLowerCase()));
    await Promise.all(
      chunks(missing, 100).map(async (batch) => {
        const j = await helix('games?' + batch.map((n) => 'name=' + encodeURIComponent(n)).join('&'));
        for (const g of j?.data ?? []) {
          cache.set('g:' + g.name.toLowerCase(), {
            exp: Date.now() + TTL,
            val: { id: g.id, name: g.name, boxArt: String(g.box_art_url).replace('{width}x{height}', '{w}x{h}') },
          });
        }
      }),
    );
    // Names Twitch does not match exactly (renamed or odd casing): try its category search,
    // and keep a result only when its name is the same once punctuation and case are ignored.
    const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '');
    const notFound = missing.filter((n) => !cache.has('g:' + n.toLowerCase())).slice(0, 60);
    await Promise.all(
      notFound.map(async (n) => {
        const j = await helix('search/categories?first=10&query=' + encodeURIComponent(n));
        const hit = (j?.data ?? []).find((g: any) => norm(g.name) === norm(n));
        let val: EnrichResponse['games'][string] = hit
          ? { id: hit.id, name: hit.name, boxArt: String(hit.box_art_url).replace(/\d+x\d+/, '{w}x{h}') }
          : null;
        // Old categories Twitch renamed (CS:GO became "Counter-Strike") keep their art under the old name.
        if (!val) {
          const byName = `https://static-cdn.jtvnw.net/ttv-boxart/${encodeURIComponent(n)}-{w}x{h}.jpg`;
          const r = await fetch(byName.replace('{w}x{h}', '52x72'), { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(5000) }).catch(() => null);
          if (r?.status === 200) val = { id: '', name: n, boxArt: byName };
        }
        cache.set('g:' + n.toLowerCase(), { exp: Date.now() + TTL, val });
      }),
    );
    for (const n of gameNames) {
      const c = cache.get('g:' + n.toLowerCase());
      if (c) res.games[n.toLowerCase()] = (c.val as EnrichResponse['games'][string]) ?? null;
    }
  })();

  const emotesTask = (async () => {
    if (!emoteIds.length && !input.emoteChannels) return;
    const [g, ...per] = await Promise.all([
      cached('e:global', () => globalEmotes(helix)),
      ...emoteIds.map((id) => cached('e:' + id + (tok ? ':t' : ''), () => channelEmotes(id, helix))),
    ]);
    res.emotes.global = g;
    emoteIds.forEach((id, i) => (res.emotes.channels[id] = per[i]));
  })();

  // Titles of watched VODs that still exist (most expire after a few weeks).
  const vodsTask = (async () => {
    if (!tok || !vodIds.length) return;
    const missing = vodIds.filter((id) => !cache.has('v:' + id));
    await Promise.all(
      chunks(missing, 100).map(async (batch) => {
        const j = await helix('videos?' + batch.map((id) => 'id=' + id).join('&'));
        for (const v of j?.data ?? [])
          cache.set('v:' + v.id, {
            exp: Date.now() + TTL,
            val: { title: v.title, createdAt: v.created_at, duration: v.duration, type: v.type, thumb: String(v.thumbnail_url ?? '') },
          });
        for (const id of batch) if (!cache.has('v:' + id)) cache.set('v:' + id, { exp: Date.now() + TTL, val: null });
      }),
    );
    for (const id of vodIds) {
      const v = cache.get('v:' + id)?.val as EnrichResponse['vods'][string] | null;
      if (v) res.vods[id] = v;
    }
  })();

  const badgeIds = clean(input.badgeChannels, LIMITS.badgeChannels, /^\d{1,12}$/);
  const readBadges = (j: any) => {
    const out: Record<string, { title: string; url: string }> = {};
    for (const set of j?.data ?? []) for (const v of set.versions ?? []) out[set.set_id + '/' + v.id] = { title: v.title, url: v.image_url_2x };
    return out;
  };
  const badgesTask = (async () => {
    if (!tok) return;
    if (input.badges) res.badges = await cached('b:global', async () => readBadges(await helix('chat/badges/global')));
    await Promise.all(
      badgeIds.map(async (id) => {
        res.channelBadges[id] = await cached('b:' + id, async () => readBadges(await helix('chat/badges?broadcaster_id=' + id)));
      }),
    );
  })();

  await Promise.all([usersTask, gamesTask, emotesTask, vodsTask, badgesTask]);
  return res;
}

const twitchUrl = (id: string) => `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/1.0`;

async function globalEmotes(helix: (p: string) => Promise<any>): Promise<Emote[]> {
  const [tw, sv, bt, ff] = await Promise.all([
    helix('chat/emotes/global').catch(() => null),
    getJson('https://7tv.io/v3/emote-sets/global').catch(() => null),
    getJson('https://api.betterttv.net/3/cached/emotes/global').catch(() => null),
    getJson('https://api.frankerfacez.com/v1/set/global').catch(() => null),
  ]);
  return [
    ...(tw?.data ?? []).map((e: any) => ({ name: e.name, url: twitchUrl(e.id), provider: 'twitch' as const })),
    ...sevenTv(sv?.emotes),
    ...(bt ?? []).map((e: any) => ({ name: e.code, url: `https://cdn.betterttv.net/emote/${e.id}/1x`, provider: 'bttv' as const })),
    ...ffz(ff),
  ];
}

async function channelEmotes(id: string, helix: (p: string) => Promise<any>): Promise<Emote[]> {
  const [tw, sv, bt, ff] = await Promise.all([
    helix('chat/emotes?broadcaster_id=' + id).catch(() => null),
    getJson('https://7tv.io/v3/users/twitch/' + id).catch(() => null),
    getJson('https://api.betterttv.net/3/cached/users/twitch/' + id).catch(() => null),
    getJson('https://api.frankerfacez.com/v1/room/id/' + id).catch(() => null),
  ]);
  // 7TV: the active set, plus the channel's other sets (often older emotes it swapped out).
  const activeId = sv?.emote_set?.id;
  const otherSets = ((sv?.user?.emote_sets ?? []) as any[]).map((s) => s.id).filter((sid) => sid && sid !== activeId).slice(0, 5);
  const others = await Promise.all(otherSets.map((sid) => cached('7s:' + sid, () => getJson('https://7tv.io/v3/emote-sets/' + sid).catch(() => null))));
  const active = sevenTv(sv?.emote_set?.emotes);
  const seen = new Set(active.map((e) => e.name));
  const older = others.flatMap((s: any) => sevenTv(s?.emotes)).filter((e) => !seen.has(e.name) && (seen.add(e.name), true));
  return [
    ...(tw?.data ?? []).map((e: any) => ({ name: e.name, url: twitchUrl(e.id), provider: 'twitch' as const })),
    ...active,
    ...older,
    ...[...(bt?.channelEmotes ?? []), ...(bt?.sharedEmotes ?? [])].map((e: any) => ({
      name: e.code,
      url: `https://cdn.betterttv.net/emote/${e.id}/1x`,
      provider: 'bttv' as const,
    })),
    ...ffz(ff),
  ];
}

function sevenTv(list: any[] | undefined): Emote[] {
  return (list ?? [])
    .filter((e) => e?.data?.host?.url)
    .map((e) => ({ name: e.name, url: `https:${e.data.host.url}/1x.webp`, provider: '7tv' as const }));
}

function ffz(j: any): Emote[] {
  const out: Emote[] = [];
  for (const set of Object.values<any>(j?.sets ?? {}))
    for (const e of set?.emoticons ?? []) {
      const u = e.urls?.['1'];
      if (u) out.push({ name: e.name, url: u.startsWith('//') ? 'https:' + u : u, provider: 'ffz' });
    }
  return out;
}
