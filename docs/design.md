# Design de référence : Rétro Twitch

Méthode (toiles, propositions, validation, recapture) : `docs/regles.md`
de ce dépôt, partie sur le design de référence. Ici, seulement les liens et
l'état de cette app.

## Direction

Tirée de la méthode unslop (Damir Sokolovsky, CC BY 4.0), écrite en tête de
`src/style.css` :

- Produit : une rétrospective de tout ce qu'une personne a regardé sur
  Twitch, calculée dans son navigateur.
- Caractère : nocturne, archiviste, un peu joueur.
- Monde : les soirées devant un stream, le chat qui défile.
- Moments : le graphique des heures et le mur de jaquettes.
- Signature : les lignes de chat (horodatage en mono au-dessus du texte),
  pour les citations et les dates.

Surfaces graphite (`--bg #141415`, `--card #19191b`), un seul accent violet
`#a970ff`, Inter et JetBrains Mono auto-hébergées, aucune animation qui
boucle, un fondu de 0,2 s au changement de page.

## Liens

| Quoi | Lien |
|---|---|
| Système de design | pas encore de toile : les jetons vivent dans `src/style.css` |
| Toiles par zone | à créer avant le premier gros changement visible |

## Dernière recapture

Aucune toile encore. Dossiers d'interface à comparer : `src/pages/`,
`src/components/`, `src/style.css`.

## Règle propre à cette app

« Gros changements seulement » (la règle commune, écrite dans
`docs/regles.md`).

## Grille pages × états

États de `docs/regles.md` (partie sur l'interface) ; « s.o. » quand un état
n'existe pas pour la page.

| Page | Toile | Vide | Peu | Beaucoup | Incomplet | Chargement | Erreur | Succès | 390 | 1280 | Sombre |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Accueil (dépôt du zip) | non | s.o. | s.o. | s.o. | s.o. | oui | oui | s.o. | oui | oui | oui |
| Aperçu | non | oui | non | oui | oui | s.o. | s.o. | s.o. | oui | oui | oui |
| Streamers, fiche streamer | non | oui | non | oui | oui | s.o. | s.o. | s.o. | oui | oui | oui |
| Catégories, fiche catégorie | non | oui | non | oui | oui | s.o. | s.o. | s.o. | oui | oui | oui |
| Calendrier | non | non | non | oui | oui | s.o. | s.o. | s.o. | oui | oui | oui |
| Chat | non | oui | non | oui | oui | oui | oui | s.o. | oui | oui | oui |
| Follows, Soutien, Ma chaîne | non | oui | non | oui | s.o. | s.o. | s.o. | s.o. | oui | oui | oui |
| Partager (carte PNG) | non | non | non | oui | s.o. | oui | oui | s.o. | oui | oui | oui |

« Peu » n'a été vu sur aucune page : il manque un petit export de test
(quelques heures, sans chat ni follow).
