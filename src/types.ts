export interface Channel {
  id: string; // Twitch channel id, or "name:<login>" when the export gave no id
  name: string; // most recent login seen
  oldNames: string[]; // earlier logins, newest first
}

export interface Game {
  name: string; // display name (best casing found in the export)
}

/** One aggregated viewing line: a day, a channel, a category. */
export interface WatchRow {
  day: number; // days since 1970-01-01
  ch: number;
  game: number; // -1 when unknown
  min: number;
  vod: boolean;
}

export interface ChatMsg {
  ts: number;
  ch: number;
  body: string;
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

export interface RetroData {
  user: {
    login: string;
    start: number;
    end: number;
    renames: { ts: number; from: string; to: string }[];
  };
  channels: Channel[];
  games: Game[];
  watch: WatchRow[];
  /** Start of each video play: [utc ms, channel] — used for hour-of-day stats. */
  playTs: Float64Array;
  playCh: Int32Array;
  chat: ChatMsg[];
  follows: FollowEvent[];
  gameFollows: { ts: number; game: number }[];
  subs: Sub[];
  bits: Bits[];
  broadcast: { minutes: number; days: number; games: { game: number; min: number }[]; firstTs: number; lastTs: number };
  vods: number;
  timings: { unzip: number; parse: number };
}

export type WorkerMsg =
  | { type: 'progress'; step: string }
  | { type: 'done'; data: RetroData }
  | { type: 'error'; message: string };
