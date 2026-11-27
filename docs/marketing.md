# Marketing

Ce que Rétro Twitch dit d'elle-même. **Ce fichier fait foi** (règle commune
du 21/11) : 7IBO/marketing propose ses changements à ce fichier par une PR.
Une promesse écrite ici se vérifie dans le code avant de partir dans un
texte. Rien n'est encore décidé au-delà de ce qui suit : le positionnement,
le public et le lancement se tranchent avec Thibault avant la mise en ligne
publique.

## Ce que l'app est

- Une rétrospective Twitch de tous les temps, depuis le premier stream
  regardé, construite à partir de l'export de données que chacun peut
  demander à Twitch.
- Plus complète que le récapitulatif annuel de Twitch : toutes les années,
  filtres par année et par mois, fiche par streamer et par catégorie,
  calendrier, chat et emotes (Twitch, 7TV, BTTV, FFZ), follows, subs et
  pubs, la chaîne de l'utilisateur, cartes PNG à partager.
- Français et anglais.
- Gratuit, sans compte.

## Promesses à tenir (vérifiées dans le code)

- Le zip est lu dans le navigateur et n'est envoyé à aucun serveur
  (`src/lib/worker.ts`, `src/lib/state.svelte.ts`).
- Les IP, villes, appareils, navigateurs, pages vues, l'email et le
  téléphone de l'export ne sont jamais lus ni affichés (`src/lib/csv.ts`,
  liste des fichiers dans `src/lib/worker.ts`).
- Seuls des identifiants de chaînes, des noms de jeux et des identifiants
  de VOD partent vers le serveur, pour les images et les emotes ; une case
  le coupe (`server/enrich.ts`).
- L'export n'est gardé que dans le navigateur, 30 jours au plus, et
  « Changer d'export » l'efface (`src/lib/store.ts`).

## Ce qu'on ne dit pas

- Pas « officiel » ni « par Twitch » : le site n'est pas affilié à Twitch,
  et le dit en bas de chaque page.
- Pas de chiffre de visionnage présenté comme exact : Twitch compte chaque
  appareil et chaque onglet, la page l'explique.

## À décider

- Nom et domaine, public visé, canaux et date de lancement.
