export interface Channel {
  id: string; // Twitch channel id, or "name:<login>" when the export gave no id
  name: string; // most recent login seen in the export
  oldNames: string[]; // earlier logins, newest first
}

export interface Game {
  name: string; // display name (best casing found in the export)
}

export type Platform = 'web' | 'mobile' | 'tv' | 'other';

/** One aggregated viewing line: a day, a channel, a category, a platform. */
export interface WatchRow {
  day: number; // days since 1970-01-01
  ch: number;
  game: number; // -1 when unknown
  min: number;
  vod: boolean;
  platform: Platform;
}

export interface ChatMsg {
  ts: number;
  ch: number;
  body: string;
  /** From the chat tags Twitch kept for recent messages (2023+), when present. */
  emotes?: { id: string; name: string }[]; // Twitch emotes with their ids, even retired ones
  badges?: string[]; // "set/version", e.g. "zevent25/1"
  subMonths?: number; // subscriber tenure shown in that chat
  replyTo?: string; // login of the person replied to
}

export interface FollowEvent {
  ts: number;
  ch: number;
  unfollow: boolean;
}

export interface Sub {
  ch: number;
  start: number;
  end: number;
  kind: 'paid' | 'gift' | 'prime' | 'other';
}

export interface Bits {
  ts: number;
  ch: number;
  amount: number;
}

export interface OwnVod {
  id: string;
  ts: number;
  title: string;
  game: number;
  seconds: number;
}

export interface WatchedVod {
  id: string;
  ch: number;
  min: number;
  day: number; // first day watched
}

export interface RetroData {
  user: {
    login: string;
    userId: string;
    start: number;
    end: number; // end of the export period: the data is not newer than this
    renames: { ts: number; from: string; to: string }[];
    /** login -> how it was displayed (capitals), when known */
    displayNames: Record<string, string>;
  };
  channels: Channel[];
  games: Game[];
  watch: WatchRow[];
  /** Start of each video play (utc ms) and its channel, for hour-of-day stats. */
  playTs: Float64Array;
  playCh: Int32Array;
  chat: ChatMsg[];
  follows: FollowEvent[];
  gameFollows: { ts: number; game: number }[];
  subs: Sub[];
  bits: Bits[];
  /** Ads seen: utc ms and channel. */
  adTs: Float64Array;
  adCh: Int32Array;
  broadcast: { day: number; min: number; game: number }[];
  ownVods: OwnVod[];
  watchedVods: WatchedVod[];
  /** Clips played: utc ms and channel. */
  clipTs: Float64Array;
  clipCh: Int32Array;
  timings: { unzip: number; parse: number };
}

export type WorkerMsg =
  | { type: 'progress'; step: string }
  | { type: 'done'; data: RetroData }
  | { type: 'error'; message: string };
