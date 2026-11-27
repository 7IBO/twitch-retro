# Rétro Twitch

An all-time Twitch retrospective built from the data export a user requests
from Twitch (Settings, Security and Privacy, "Download your data"). The zip is
read in the browser: hours, streamers, categories, calendar, chat and emotes,
follows, subs and ads, the user's own channel, and shareable PNG cards. French
and English.

This file and `docs/` hold everything needed to work on the app. The shared
rules come from 7IBO/socle, copied into `docs/regles.md`; reading the socle is
never required.

## Rules that are not discussed

1. **No credit to Claude or Anthropic** anywhere: no `Co-Authored-By`, no
   `Claude-Session`, no "Generated with", no session link, no "Requested by"
   block, in commits, PRs, GitHub comments, branch names. Never a `claude/`
   branch. A PR body is read again right after it is created. Enforced by
   `.githooks/commit-msg` and the CI (`scripts/commit-message.ts`).
2. **No secret in the repository or in memory.** Write a key's name and where
   it lives, never its value.
3. **Nothing irreversible without Thibault's word**: production deploys,
   public release, deleting data, anything sent outside the project.
4. **Privacy is the product.** The export holds IPs, cities, devices, page
   views, an email and a phone number. They are never read, shown or sent
   (see "Privacy" below). A change that reads a new file or column says so in
   its PR and in `README.md`.

## Stack and commands

- Svelte 5 (runes), Vite 8, TypeScript, no framework router (hash routes in
  `src/lib/state.svelte.ts`).
- `fflate` unzips in a Web Worker (`src/lib/worker.ts`, inlined at build).
- Two serverless functions for Vercel in `api/`, sharing code with the Vite
  dev and preview servers through `vite.config.ts`:
  - `api/enrich.ts` (`server/enrich.ts`): avatars, current logins, box art by
    id, VOD titles, chat badges, emotes from Twitch, 7TV, BTTV and FFZ.
  - `api/img.ts` (`server/img.ts`): image relay for the share card only
    (BTTV's CDN has no CORS header).
- Fonts are self-hosted (`@fontsource`), no third-party script.

```sh
npm install
npm run dev        # Vite dev server, /api/* served by vite.config.ts
npm run check      # svelte-check (types)
npm run build      # check + production build in dist/
npm run preview    # serves dist/ with /api/*
npm run check:all  # dashes, copy, ids, script tests (needs Bun)
```

Environment: `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` (a Twitch app,
client credentials flow). Locally in `.env.local` (ignored by git), in
production in the Vercel project settings. Without them the site still works,
without avatars, Twitch emotes or box art looked up by id.

## Privacy

- Only these files of the zip are decompressed: `metadata.json`,
  `login_rename.csv`, `minute_watched.csv`, `video_play.csv`,
  `chat_messages.csv`, `minute_broadcast.csv`, the follow files,
  `subscriptions.csv`, `bits_cheered.csv`, `vod_create.csv`,
  `video_ad_impression.csv` (date and channel of each ad) and
  `users/user/<id>.json`, of which only `displayname` is read with a pattern.
- In those files only the needed columns are sliced (`src/lib/csv.ts`): IP,
  city, region, ASN, device, browser never become strings. In
  `chat_messages.csv`, `filtered_tags` is read for emotes, badges, subscriber
  tenure and the login replied to only.
- What leaves the browser: channel ids, game names, VOD ids and chat channel
  ids, to `/api/enrich`, and image URLs to public CDNs. Never the export,
  never the user's own data. The toggle "Charger les avatars, jaquettes et
  emotes" turns it off.
- Storage: the zip can be kept in IndexedDB for 30 days (checked by default,
  deleted by "Changer d'export"); preferences in `localStorage`. Nothing on a
  server. `/api/enrich` keeps an in-process cache of Twitch's public answers.
- The built site carries a strict CSP (`vite.config.ts`): scripts from the
  site only, images from the four CDNs, `connect-src 'self'`.

## Data quirks of the Twitch export

- `time` columns are US Pacific time; `time_utc` is sometimes empty.
- Channels are grouped by `channel_id`; a login seen fewer than three times
  or on less than 1 % of a channel's rows is noise, not a former name.
- `follow.csv` repeats follows of a channel already followed (1 672 for one
  channel in the sample): only changes of state count.
- Cells starting with `@ + - =` are prefixed with `'` (spreadsheet guard).
- The same VOD appears as `v123` and `123`.
- Minutes are counted per device and per tab: days over 24 h are real.
- Box art by name only exists for old categories; recent ones need the
  game id from the API. A renamed category (CS:GO) keeps its art under its
  old name.
- Chat tags (emote ids, badges, replies) exist only for messages since 2023.

## Code map

| Path | What |
|---|---|
| `src/lib/worker.ts` | Unzip, CSV reading, channel registry and renames, all extraction |
| `src/lib/stats.ts` | Period filters, per-channel index, timelines, details |
| `src/lib/state.svelte.ts` | App state, routes, year and month filters, enrichment, storage |
| `src/lib/words.ts` | Emote matching (tags, channel sets, globals) and word cloud |
| `src/lib/card.ts` | Share card drawn on a canvas |
| `src/lib/i18n/` | `t()`: the French text is the key, `en.ts` holds English |
| `src/pages/`, `src/components/` | One file per page, small shared components |
| `server/`, `api/` | Enrichment and image relay |
| `scripts/` | Copied checks: attribution, dashes, copy, ids |

## Conventions

- Every visible text goes through `t()` in both languages in the same PR;
  `plural(n, one, many)` translates both words. Words identical in French
  singular and plural (`mois`, `fois`) have `#1` / `#n` English entries.
- Durations through `dur()`, numbers through `n()`, percentages through
  `pc()`: they follow the language.
- Filters (year, month) update the page in place; only a page change fades
  in and returns to the top.
- Design: graphite surfaces, one violet accent `#a970ff`, Inter and
  JetBrains Mono (`docs/design.md`).
- No Linear issue id in code, comments or docs (`npm run check:ids`).

## Git and pull requests

- Commit identity: `Thibault <71017357+7IBO@users.noreply.github.com>`.
- One branch per Linear issue (project "Rétro Twitch", team THI), named by
  its `gitBranchName`. Conventional Commits in English.
- PR in draft from the first push, template in
  `.github/pull_request_template.md`, reviewers in `.claude/agents/`, marked
  ready once. CI runs on ready PRs only, in one job.
- Details: `docs/regles.md`.

## Deployment

Not deployed yet. Planned on Vercel (issue "Publier Rétro Twitch sur
Vercel"): previews off, legal notice page before any public launch, keys in
the Vercel project, the site checked at 390 and 1280 px after each deploy.
