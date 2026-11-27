# Rétro Twitch

An all-time Twitch retrospective built from the data export Twitch sends
you (the `request-*.zip` file), in French and English.

Everything is computed in the browser: the zip is read in a Web Worker and
is never sent to a server.

## Privacy

- Only these files of the zip are decompressed: `metadata.json`,
  `login_rename.csv`, `minute_watched.csv`, `video_play.csv`,
  `chat_messages.csv`, `minute_broadcast.csv`, the follow files, the subs,
  the bits, `vod_create.csv`, `video_ad_impression.csv` (date and channel of
  each ad) and `users/user/<id>.json`, of which only the `displayname` field
  is read with a pattern: the email and phone number it holds are never
  parsed. The other files (security, page views, other ads…) stay
  compressed.
- In the files that are read, only the needed columns are extracted
  (`src/lib/csv.ts`): IP, city, country, device and browser never become
  JavaScript strings.
- For avatars, box art and emotes, the ids of the channels you watched,
  followed or chatted in, game names and watched VOD ids go to the site's
  own `/api/enrich`, which asks Twitch, 7TV, BTTV and FFZ and keeps
  nothing. A box on the landing page turns this off.
- The built site carries a Content Security Policy that forbids any network
  call except its own API and images from the public CDNs of Twitch, 7TV,
  BTTV and FFZ.

## Development

```sh
npm install
npm run dev
npm run build
npm run check:all   # needs Bun
```

`TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` (a Twitch app) go in
`.env.local`; see `.env.example`. More in `CLAUDE.md`.
