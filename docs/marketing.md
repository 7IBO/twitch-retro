# Marketing

What Rétro Twitch says about itself. **This file is the reference** (shared
rule of 21/11): 7IBO/marketing proposes its changes to this file in a PR. A
promise written here is checked in the code before it goes into any text.
Nothing beyond what follows is decided yet: positioning, audience and
launch are settled with Thibault before the public release.

## What the app is

- An all-time Twitch retrospective, since the first stream watched, built
  from the data export anyone can request from Twitch.
- More complete than Twitch's yearly recap: every year, filters by year and
  month, a page per streamer and per category, a calendar, chat and emotes
  (Twitch, 7TV, BTTV, FFZ), follows, subs and ads, the user's own channel,
  PNG cards to share.
- French and English.
- Free, no account.

## Promises to keep (checked in the code)

- The zip is read in the browser and sent to no server
  (`src/lib/worker.ts`, `src/lib/state.svelte.ts`).
- The IPs, cities, devices, browsers, page views, email and phone number of
  the export are never read or shown (`src/lib/csv.ts`, file list in
  `src/lib/worker.ts`).
- For images and emotes, the server receives part of the viewing history:
  the ids of the channels watched, followed or chatted in, game names and
  watched VOD ids, without times, counts or messages. A box on the landing
  page turns this off (`src/pages/Landing.svelte`, the `offline` flag of
  `src/lib/state.svelte.ts`); the server keeps none of it
  (`server/enrich.ts`).
- The export is only kept in the browser, for 30 days at most, and "Change
  export" deletes it (`src/lib/store.ts`).

## What we do not say

- Not "official" or "by Twitch": the site is not affiliated with Twitch,
  and says so at the bottom of every page.
- No watch time presented as exact: Twitch counts every device and every
  tab, and the page explains it.

## To decide

- Name and domain, target audience, channels and launch date.
