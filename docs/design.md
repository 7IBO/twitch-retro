# Reference design: Rétro Twitch

Method (boards, proposals, approval, recapture): `docs/regles.md` in this
repository, part on the reference design. Here, only the links and this
app's state.

## Direction

From the unslop method (Damir Sokolovsky, CC BY 4.0), written at the top of
`src/style.css`:

- Product: a retrospective of everything someone watched on Twitch,
  computed in their browser.
- Character: nocturnal, archival, a little playful.
- World: late evenings in front of a stream, the chat scrolling by.
- Moments: the hours chart and the wall of box art.
- Signature: chat lines (a mono timestamp above the text), for quotes and
  dates.

Graphite surfaces (`--bg #141415`, `--card #19191b`), a single violet
accent `#a970ff`, self-hosted Inter and JetBrains Mono. The only looping
animation is the loading bar while the export is read; pages fade in over
0.2 s when the page changes, filters update in place.

## Links

| What | Link |
|---|---|
| Design system | no board yet: the tokens live in `src/style.css` |
| Boards by area | to create before the first large visible change |

## Last recapture

No board yet. Interface folders to compare: `src/pages/`,
`src/components/`, `src/style.css`.

## Rule for this app

"Large changes only" (the shared rule, written in `docs/regles.md`).

## Pages and states

States from `docs/regles.md` (part on the interface); "n/a" when a state
does not exist for the page. Observed by hand on the sample export, in
French and English, at 390 and 1280 px, on 27/11/2026: no board, capture
or automated test backs this table yet.

| Page | Board | Empty | Little | A lot | Partial | Loading | Error | Success | 390 | 1280 | Dark |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Landing (drop the zip) | no | n/a | n/a | n/a | n/a | yes | yes | n/a | yes | yes | yes |
| Overview | no | yes | no | yes | yes | n/a | n/a | n/a | yes | yes | yes |
| Streamers, streamer page | no | yes | no | yes | yes | n/a | n/a | n/a | yes | yes | yes |
| Categories, category page | no | yes | no | yes | yes | n/a | n/a | n/a | yes | yes | yes |
| Calendar | no | no | no | yes | yes | n/a | n/a | n/a | yes | yes | yes |
| Chat | no | yes | no | yes | yes | yes | yes | n/a | yes | yes | yes |
| Follows, Support, My channel | no | yes | no | yes | n/a | n/a | n/a | n/a | yes | yes | yes |
| Share (PNG card) | no | no | no | yes | n/a | yes | yes | n/a | yes | yes | yes |

"Little" was seen on no page: a small test export is missing (a few hours,
no chat, no follow).
