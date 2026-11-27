# Rétro Twitch

Une rétrospective Twitch « de tous les temps » construite à partir de l'export de données Twitch (le zip `request-*.zip`).

Tout est calculé dans le navigateur : le zip est lu dans un Web Worker, rien n'est envoyé à un serveur ni stocké.

## Vie privée

- Seuls ces fichiers du zip sont décompressés : `metadata.json`, `login_rename.csv`, `minute_watched.csv`, `video_play.csv`, `chat_messages.csv`, `minute_broadcast.csv`, les follows, les subs, les bits et `vod_create.csv`. Les autres (sécurité, pages vues, pubs, `users/*.json` avec email et téléphone…) restent compressés.
- Dans les fichiers lus, seules les colonnes utiles sont extraites (`src/csv.ts`) : IP, ville, pays, appareil et navigateur ne deviennent jamais des chaînes JavaScript.
- Le site construit porte une Content Security Policy qui interdit toute requête réseau, sauf les images du CDN public de Twitch (`static-cdn.jtvnw.net`) pour les jaquettes des jeux.

## Développement

```
npm install
npm run dev
npm run build
```
