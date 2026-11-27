import type { Emote } from '../../server/enrich';
import type { ChatMsg, Channel } from './types';

const STOP = new Set(
  (
    'le la les un une des de du et en à a au aux ce ces cet cette il ils elle elles on je tu nous vous me te se ' +
    'mon ma mes ton ta tes son sa ses leur leurs que qui quoi dont où ou mais donc or ni car pas ne plus pour par ' +
    'sur sous dans avec sans est es suis sont été être ai as avons avez ont avoir fait faire va vais vas ça ca c ' +
    "j l d n s t qu y oui non si là bien très tout tous toute toutes comme même aussi alors encore déjà c'est " +
    "j'ai t'as y'a the an and or of to in is it you i me my we he she they this that for on be are was " +
    'so just like what no yes lol mdr ptdr xd ah oh euh bah ben hein moi toi lui eux quand juste rien trop faut ' +
    'dire vrai vraiment chat play reel quoi comment pourquoi parce peut peux veut veux sais sait vois voir vient ' +
    "viens ici mtn maintenant après avant jamais toujours fois gros mec bon beaucoup peu tant qu'il qu'on c'était " +
    "j'suis jsp chui t'es can not but all your his her its our were have has had will would there here then than " +
    'with from'
  ).split(/\s+/),
);

export interface EmoteCount {
  emote: Emote;
  n: number;
}

export interface ChatAnalysis {
  emotesUsed: number; // total emote occurrences
  msgsWithEmote: number;
  emotes: EmoteCount[];
  providers: Record<Emote['provider'], number>;
  words: { w: string; n: number }[];
}

type EmoteMap = { global: Map<string, Emote>; perChannel: Map<string, Map<string, Emote>> } | null;

export function analyseChat(msgs: ChatMsg[], channels: Channel[], emotes: EmoteMap): ChatAnalysis {
  const eCount = new Map<string, EmoteCount>();
  const providers: ChatAnalysis['providers'] = { twitch: 0, '7tv': 0, bttv: 0, ffz: 0 };
  const words = new Map<string, number>();
  let used = 0, withEmote = 0;
  // Emote names typed in lower case ("kekw") are not emotes, but they are not words either.
  const lowerEmotes = emotes ? new Set([...emotes.global.keys(), ...[...emotes.perChannel.values()].flatMap((m) => [...m.keys()])].map((x) => x.toLowerCase())) : null;
  for (const m of msgs) {
    const local = emotes?.perChannel.get(channels[m.ch]?.id ?? '');
    const seen = new Set<string>();
    let had = false;
    for (const raw of m.body.split(/\s+/)) {
      if (!raw) continue;
      const e = emotes ? (local?.get(raw) ?? emotes.global.get(raw)) : undefined;
      if (e) {
        used++;
        had = true;
        providers[e.provider]++;
        const k = e.name;
        const c = eCount.get(k);
        if (c) c.n++;
        else eCount.set(k, { emote: e, n: 1 });
        continue;
      }
      const w = raw.replace(/^[^\p{L}\p{N}@]+|[^\p{L}\p{N}]+$/gu, '');
      if (w.length < 3 || w.startsWith('@') || /^\d+$/.test(w)) continue;
      // Without emote lists, keep emote-like casing (KEKW, SeemsGood) apart from plain words.
      const key = !emotes && /\p{Lu}/u.test(w.slice(1)) ? w : w.toLowerCase();
      if (STOP.has(key.toLowerCase()) || seen.has(key) || lowerEmotes?.has(key.toLowerCase())) continue;
      seen.add(key);
      words.set(key, (words.get(key) ?? 0) + 1);
    }
    if (had) withEmote++;
  }
  return {
    emotesUsed: used,
    msgsWithEmote: withEmote,
    emotes: [...eCount.values()].sort((a, b) => b.n - a.n),
    providers,
    words: [...words.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([w, n]) => ({ w, n })),
  };
}
