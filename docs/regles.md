# Règles du dépôt

Repris de 7IBO/socle au commit `27483aa`, le 27/11/2026.

Les règles communes à toutes les apps de Thibault, copiées ici pour que ce
dépôt se suffise. Elles s'appliquent à Rétro Twitch telles qu'écrites ; là où
`CLAUDE.md` en dit plus pour cette app, c'est lui qui gagne. Les relevés et
écarts cités concernent les autres apps : ils restent comme exemples de ce
que la règle évite. Une règle qui change dans le socle arrive ici par une PR
de synchronisation.

## Règles qui ne se discutent pas

1. **Aucune attribution à Claude ni à Anthropic**, dans aucun projet : ni
   `Co-Authored-By`, ni `Claude-Session`, ni « Generated with », ni lien de
   session, ni bloc « Requested by », dans les commits, les PR, les
   commentaires GitHub, les noms de branches et les dépôts. Jamais de branche
   `claude/…`. Le corps de chaque PR est relu juste après sa création : un
   outil y ajoute un pied, qu'on retire avant de la rendre.
2. **Aucun secret dans un dépôt ni en mémoire.** Ici, on écrit le nom d'une
   clé et l'endroit où elle vit, jamais sa valeur.
3. **Rien d'irréversible sans le mot de Thibault** : production, serveur,
   suppression en masse, message envoyé hors du projet. Les commandes sur le
   serveur se valident par bloc, d'un go écrit de Thibault dans le fil du
   VPS (`ops/vps.md`, « Accès »). Une écriture dans une base de
   production (script, seed, requête, migration à la main), même lancée du
   PC avec le `DATABASE_URL` de son `.env`, attend le go écrit de Thibault
   dans le fil (24/11 : un fil d'emblem.run l'a fait sans, le 22/11).
4. **Une règle qui vaut pour plusieurs apps s'écrit ici**, par une PR, dans le
   fil qui la décide, puis se copie dans le dépôt de chaque app (« Pour une
   app »). Pas dans la mémoire d'un projet : elle n'est pas partagée entre
   projets, et ne suit pas le dépôt.
5. **Chaque choix se remet en question** avant d'être codé
   ([remise-en-question.md](remise-en-question.md)), puis Claude tranche seul.
6. **Pas d'avocat ni de comptable** : une question juridique ou fiscale se
   vérifie avec sa source primaire, marquée [A] lue, [B] résumé, [C] connue
   non relue, et un risque résiduel en une phrase.

## Git, branches et commits

### Identité et attribution

- Une seule identité de commit pour tous les dépôts :
  `Thibault <71017357+7IBO@users.noreply.github.com>` (`decisions.md`, 21/11).
  Les squash faits par GitHub prennent l'adresse du compte : « Keep my email
  addresses private » doit être coché dans les réglages GitHub de Thibault,
  pour que ce soit la même adresse noreply (geste de Thibault, dans le
  ticket des comptes, THI-1012). Le conteneur cloud signe « Claude » par défaut : régler
  `git config user.name` et `user.email` dans chaque clone, avant le premier
  commit (un hook de démarrage de session le fait, modèle :
  `scripts/session-start.sh` de Koleko). Relevé du 24/11 : 39 ou 40 des 40
  derniers commits de `main` du socle, d'emblem.run, d'inlinr-web et de
  Koleko portent une adresse Gmail, par les squash de GitHub, et tous
  ceux des trois outils d'Inlinr, qui sont publics. Les commits des PR,
  eux, portent bien la noreply. Koleko garde la sienne par choix
  (`decisions.md`, 21/11).
- Aucune attribution à Claude ni à Anthropic (CLAUDE.md, règle 1). Chaque
  dépôt a un hook `commit-msg` et un contrôle en CI qui refusent
  `Co-Authored-By: Claude`, `Claude-Session`, « Generated with » et les
  branches `claude/` (modèle : `scripts/commit-message.ts` de Koleko, ou
  `.githooks/commit-msg` d'inlinr-cli en shell). La CI lit aussi le titre
  et le corps de la PR, au moment où elle passe prête : l'événement porte
  alors le corps du moment, une fois le pied de l'outil remplacé (Koleko
  et emblem.run, `scripts/commit-message.ts`). Une relance garde le corps
  de l'événement : après une correction, repasser en brouillon puis en
  prête. Écart au 24/11 : le shell des quatre dépôts d'Inlinr ne lit que
  les commits et la branche (THI-2185). Dans tous les cas, le corps se
  relit à la main juste après la création.
  `.claude/settings.json` coupe l'attribution de Claude Code
  (`"attribution": {"commit": "", "pr": ""}` et `"includeCoAuthoredBy": false`, comme emblem.run).

### Branches

- Une branche par ticket : le `gitBranchName` de Linear, sans le changer.
  Renommer le ticket avant de créer la branche.
- Partir du dernier `origin/main` (`git fetch origin main`) : le `main` local
  d'un clone neuf peut dater de plusieurs semaines.
- Jamais de push forcé sur `main`, jamais de réécriture d'une branche
  partagée.
- Une branche fusionnée est supprimée : « Automatically delete head
  branches » coché dans les réglages de chaque dépôt. Relevé du 24/11 : 37
  branches fusionnées restent dans le socle, 46 dans les cinq dépôts
  d'Inlinr, et 9 branches sans PR ouverte dans Koleko, dont
  `docs/migration-export`, à garder : c'est le seul endroit de son export
  (`decisions.md`, 21/11). Le réglage est un geste de Thibault (THI-1012).

### Commits

[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), en
anglais :

```
type(scope): summary

Why the change, what it changes, wrapped at 72 columns.

Refs: THI-NN
```

- `type` : feat, fix, perf, refactor, docs, test, build, ci, chore, revert,
  style ; `!` pour un changement cassant.
- `summary` : impératif, minuscules, sans point final, en-tête de 72
  caractères au plus.
- Pas de tiret de pause dans un message (règles de `textes.md`).

### Identifiants de tickets

- L'id Linear vit dans Linear, le nom de branche, le titre et le corps de la
  PR, le message de commit. Jamais dans le code, les commentaires, les noms,
  les tests, la doc ou un chemin : le pourquoi s'écrit en mots (règle de
  Koleko, `check:ids`, à reprendre partout).

## Pull requests

### Le cycle

1. Ticket Linear prêt : problème, pour qui, proposition, « fait quand »
   vérifiable, mesure après sortie, déploiement.
2. Branche, PR **en brouillon** dès le premier push. Tout le travail et les
   relectures se font sur le brouillon : un push sur un brouillon ne coûte
   rien.
3. Les contrôles de l'app passent dans la session avant chaque push.
4. Deux relectures indépendantes (`review.md`), leurs remarques corrigées ou
   répondues dans le corps. Une seule suffit pour une PR de moins de 200
   lignes changées, sans migration, sans sécurité ni donnée personnelle, et
   pour une PR qui ne touche que du contenu (article, guide, doc).
5. PR marquée prête **une seule fois**, à la fin : un seul passage de CI.
6. Merge en squash quand la CI est verte, sans conflit, sans remarque
   ouverte. Ticket en Done. Ce qui reste à déployer est écrit.
7. Personne ne laisse une PR ouverte sans propriétaire : un fil qui s'arrête
   laisse une note de passation en commentaire du ticket (fait, reste,
   prochaine action, qui la porte).

### Titre

`type(scope): summary (THI-NN)`, en anglais, 100 caractères au plus, hors
le numéro de PR que le squash ajoute. Il devient le commit sur main. Une
PR sans ticket (le socle et marketing en ont) n'a pas de `(THI-NN)`.

### Corps

Le modèle commun est `modeles/pull_request_template.md` : Summary, Changes,
Design, Verification, Reviews, Deployment, puis `Refs: THI-NN` (ou `Closes THI-NN`
là où l'intégration Linear le lit).

- Des phrases simples : ce qui change pour l'utilisateur, et pourquoi.
- **Verification** dit ce qui a tourné et ce que ça a donné (commandes,
  chiffres, captures avant et après pour une page), et ce que les relectures
  ont changé.
- **Deployment** dit l'ordre (migration, worker, site) ou « aucun ».
- Aucune attribution. Le connecteur GitHub ajoute un pied au corps à la
  création : ouvrir en brouillon, remplacer le corps, puis marquer prête. Un
  corps se corrige avec l'outil MCP `update_pull_request` (un PATCH par
  `gh api` remet le pied).
- Pas de case cochée qui n'a pas été faite. Une case qui ne s'applique pas
  est supprimée.

### Merge

- Squash, sous une seule forme dans tous les dépôts : en titre, celui de la
  PR suivi de son numéro (`type(scope): summary (THI-NN) (#N)`) ; en
  message, son Summary en quelques lignes, puis la ligne du ticket telle
  que le corps la porte (`Refs: THI-NN`, ou `Closes THI-NN` là où
  l'intégration Linear le lit). Une PR sans ticket garde le titre et le
  numéro, sans cette ligne. Jamais le message par défaut de GitHub ni de
  trailer. Relevé du 24/11 sur quinze fusions par dépôt : le numéro de PR
  manque sept fois chez Koleko ; la ligne du ticket manque dix fois chez
  emblem.run et huit chez inlinr-web ; treize fusions de marketing et six
  du socle n'en ont pas, la plupart faute de ticket.
- Une PR dont la base a bougé depuis sa dernière CI est mise à jour avant le
  merge.
- `main` est protégée là où un merge livre : PR obligatoire, squash seul,
  contrôle de CI requis (modèle : `.github/rulesets/main.json` de Koleko,
  qui s'importe dans les réglages d'un dépôt). Au 24/11, seul Koleko l'a :
  la règle d'inlinr-web ne vise aucune branche, et `main`
  d'inlinr-claude-code part chez les utilisateurs sans garde. C'est un
  réglage de Thibault (THI-1012).
- Réglages de chaque dépôt : titre et message de squash pris de la PR,
  branche supprimée au merge, commit de fusion et rebase coupés. Sans le
  premier, GitHub propose la liste des commits comme message (emblem.run
  #466 et #468). Ce sont des réglages de Thibault (THI-1012) : une session
  ne les change pas elle-même.
- Captures d'une PR : une branche orpheline `pr-screenshots` par dépôt, liées
  par commit, jamais par nom de branche.

## Relecture

Modèle : `.claude/rules/review.md` et `.claude/agents/` de Koleko, repris
dans chaque dépôt avec ses propres critères (`modeles/agents/`).

### Qui relit

Deux relecteurs au moins, qui n'ont pas écrit le changement, avant chaque
merge. Un seul suffit pour une PR de moins de 200 lignes changées, sans
migration, sans sécurité ni donnée personnelle, et pour une PR qui ne
touche que du contenu (article, guide, doc) : le premier relecteur de la
ligne du tableau (21/11, `pr.md`). Selon ce que la PR touche :

| La PR touche | Relecteurs |
|---|---|
| Pages, composants, styles, textes visibles | code + produit |
| Logique serveur, worker, base sans migration | code, deux fois : justesse et cas limites, puis charge |
| Migration, Docker, workflows, sécurité, données personnelles | code + ops |
| Docs ou outillage seuls | code, deux fois : les faits et commandes, puis l'effet sur les autres règles |

Un relecteur reçoit le numéro de PR, le texte du ticket et le diff, **jamais
le récit de l'auteur**, qui l'ancrerait sur sa version.

### Ce que chaque relecteur regarde, dans l'ordre

**Code** : justesse (vide, null, cas limites, concurrence, transaction qui
attend le réseau) ; données (index pour chaque filtre et tri, pas de lecture
complète d'une grosse table, pas de résultat sans borne) ; migrations
(additives, numérotées après main, sûres pendant que l'ancienne version
tourne) ; sécurité (entrée vers SQL ou shell, secret dans le code ou les
logs, donnée personnelle loguée) ; coût (appels externes, minutes, temps de
fonction) ; règles du dépôt.

**Produit** : captures avant et après à 390 et 1280 px ; planche validée
pour un gros changement (`design.md`) ; système de design ;
états (vide, peu, beaucoup, incomplet, chargement, erreur) ; textes dans
toutes les langues du site ; rien qui fasse « fait par une IA ».

**Ops** : ordre de déploiement, verrous, retour arrière, secrets, registre
des données personnelles, limites mémoire et CPU sur le serveur. Une ligne
de cron du VPS, un job qui supprime ou un nouveau planning passent par lui
(`jobs.md`).

### Comment la relecture est gardée

1. Chaque relecteur rend ses remarques, la plus grave d'abord : fichier,
   ligne, ce qui casse et quand. Il dit franchement quand il ne trouve rien
   d'important, sans gonfler la liste.
2. L'auteur les écrit dans la section Reviews du corps, avec le rôle et le
   commit lu. Jamais en commentaire GitHub : l'outil y ajoute une ligne
   d'attribution qu'on ne peut pas retirer.
3. Chaque remarque a sa réponse : corrigée (avec le commit) ou pourquoi pas.
4. Après les corrections, un relecteur vérifie les corrections seules.

### Ce qui refuse une PR, dans toutes les apps

- un secret, un id de ticket dans le code, une attribution à une IA ;
- une requête nouvelle sans index ni plan lu sur des volumes réels ;
- une migration non additive sans ordre de déploiement écrit ;
- un changement visible sans captures avant et après ;
- un gros changement visible sans planche validée par Thibault (lien et
  date dans la partie Design, `design.md`) ;
- un service qui reçoit des données personnelles sans être nommé dans la
  politique de confidentialité ;
- une page hors des budgets de `code/perfs.md`, une nouvelle violation
  d'accessibilité sérieuse (`code/accessibilite.md`) ;
- un contrôle de qualité contourné (règle désactivée, seuil remonté à la
  main, test sauté).

## Qualité du code, commentaires, refactor

Les outils qui font tenir ces règles (skills `lint`, `deps`, `refactor`,
`comments`, `structure`, `docs`, scripts `check-quality.ts` et
`check-ids.ts`) sont dans [../outils/](../outils/README.md).

### Code

- TypeScript strict partout ; pas de `any` sans commentaire qui dit pourquoi.
- Un fichier : 600 lignes au plus (un test 1 000). Au-delà, on le découpe.
- Pas de copie : un bloc de 10 lignes ou plus présent à deux endroits devient
  une fonction ou un composant partagé.
- Un formateur et un linter par dépôt, lancés en CI (Biome pour Inlinr,
  oxlint et oxfmt pour emblem.run, ESLint et Prettier pour Koleko) : on ne se
  bat pas contre eux.
- Une règle de design ou de code qui se répète en relecture devient un
  contrôle automatique (plugins GritQL d'Inlinr, `check:design` de Koleko),
  pas une phrase de plus dans un CLAUDE.md.
- Code mort : `knip` (ou équivalent) en CI ; un export gardé exprès porte
  une marque et sa raison.
- Dépendances à leur dernière version stable, vérifiées une fois par mois
  et tout de suite pour une faille (skill `deps`) ; pas de bot de mise à
  jour, qui coûte des minutes de CI à chaque PR. Écart au 24/11 : une
  seule passe datée, celle d'emblem.run le 8/11, et la skill `deps` n'est
  copiée dans aucun dépôt ; à reprendre à la prochaine synchronisation de
  chaque app (THI-2183 pour Koleko, THI-2188 pour emblem.run, THI-2185
  pour Inlinr). L'app GitHub Socket Security (`comptes.md`) pose deux
  contrôles sur chaque PR en attendant, sans commentaire.
- Structure par domaine, pas par sorte de fichier : un dossier dès trois
  modules, un nom qui dit ce que le fichier tient, le code serveur visible
  dans son nom (skill `structure`).

### Commentaires

- Un commentaire dit **pourquoi**, jamais ce que le code dit déjà.
- 12 lignes au plus par bloc ; au-delà, l'explication va dans `docs/`.
- En anglais. Pas d'id de ticket ni de numéro de PR : la raison en mots.
- Un commentaire faux est pire qu'aucun : il se corrige dans la PR qui change
  le code.

### Refactor

- Un refactor est sa propre PR (`refactor(scope): …`), sans changement de
  comportement, avec les tests qui le prouvent avant et après.
- On découpe un fichier quand il dépasse sa limite ou quand une relecture
  bute dessus, pas par goût.
- Les seuils historiques vivent dans une liste de référence (modèle :
  `scripts/quality-baseline.json` de Koleko) qui peut baisser, jamais monter.
- Pas de grand reformatage pendant que d'autres PR sont ouvertes ; un
  reformatage va dans `.git-blame-ignore-revs`.

### Docs pour agents

- Le CLAUDE.md d'une app est la carte (produit, pile, règles, index) ; le
  détail est dans `docs/`, un fichier par domaine, lu à la demande.
- Une règle qui change met son fichier à jour dans la même PR.
- Ce qui vaut pour toutes les apps est ici, et se copie dans `docs/` de
  chaque app (CLAUDE.md, « Pour une app ») ; le CLAUDE.md de l'app pointe
  vers sa copie.
- Une app qui vit longtemps tient `docs/STATE.md` : où on en est, ce qui
  reste, la passation, lu en premier par chaque fil (modèle : One piece
  Wiki). Ses choix d'architecture vont dans un journal numéroté, avec
  contexte, options et raison, mis à jour dans la même PR (`docs/DECISIONS.md`).

### Données personnelles

- Un service qui reçoit des données personnelles est nommé dans la
  politique de confidentialité dans la PR qui commence à les lui envoyer
  (règle d'emblem.run, née d'un oubli sur Stripe et Better Stack).
- La mesure se fait sans cookie : origine des inscriptions (Inlinr,
  `SignupSource`) ou analytics maison avec un HMAC journalier qui respecte
  DNT et GPC (emblem.run, `docs/platform.md`). Pas de bandeau de cookies.

### IA

- Chaque fonction qui appelle un modèle a un plafond de dépense par mois
  (Inlinr : `AiSpend`, la lecture des notes ; 100 $ au 26/11, au-dessus
  des 60 $ de son espace au 1er décembre, à ramener par THI-2264).
- Un modèle se choisit sur un banc d'essai, et un assistant se juge à
  l'aveugle (emblem.run : `ai:eval:blind`, environ 8 $ le passage).
- Le plafond du code reste sous celui de l'espace Anthropic de l'app
  (`comptes.md`), avec une marge : viser 50 $ pour un espace à 60 $. Un budget
  par jour se vérifie sur trente jours, et une réserve relevée pour un
  lancement suppose d'abord l'espace relevé. Sinon la console coupe avant
  le code, et les comptes payants perdent l'IA avec les gratuits
  (emblem.run, 25/11 ; son plafond du mois manque encore, THI-2266).
- Une clé de secours vit dans le même espace que la clé principale, ou
  n'existe pas : ailleurs, elle contourne le plafond.
- Un refus de la console pour plafond atteint se signale une fois, pas à
  chaque appel, et l'interface dit que l'IA revient le 1er du mois.
- Ce qui n'attend pas de réponse immédiate (lecture en masse, juge d'un
  banc) part par l'API Batch, à moitié prix. Un préfixe fixe (consignes,
  schéma) porte `cache_control`, d'une heure dans un lot, et chaque appel
  compte ses tokens lus et écrits en cache à leur prix.
- L'effort se mesure au banc avant de changer de modèle : un effort plus
  bas sur le même modèle peut coûter moins qu'un modèle plus petit sans
  perdre en qualité. À vérifier pour la lecture des notes d'Inlinr,
  aujourd'hui à `high` (THI-2265).
- Un banc tourne avec une clé de l'espace `tests`, jamais celle de la
  production, et écrit ce qu'a coûté son passage.

### Activation

Une app mesure son usage, pas seulement ses inscriptions : inscrit, puis
premier usage (premier envoi de l'extension, premier portfolio publié), puis
paiement. Le marketing lit ces trois étapes avant de juger un post.

## Textes : site, interface, docs, commits, PR, tickets

Une seule règle d'écriture partout : celle des textes du site vaut aussi
pour les commits, les PR, les tickets et les docs. Les règles des posts sont
dans 7IBO/marketing, `regles-textes.md`.

- Des phrases simples, comme un développeur l'expliquerait à un autre.
- Pas de tiret long (`—`) ni de tiret de pause : une virgule, deux-points, un
  point ou des parenthèses. Un tiret court seulement entre deux nombres.
- Les mots refusés ci-dessous ne sont que des exemples : la liste qui fait
  foi est `outils/scripts/check-copy.ts`, copiée dans chaque app.
- Pas d'adverbe de remplissage (`vraiment`, `simplement`, `honnêtement` ;
  `actually`, `really`, `simply`), pas de mot creux (`fluide`, `puissant`,
  `découvrez` ; `seamless`, `leverage`, `unlock your`), pas d'emoji, pas de
  point d'exclamation.
- Pas de formule de machine : « X. Jamais. », « pas X, mais Y » en chaîne,
  triades décoratives, « zéro maintenance ».
- Une promesse se dit une fois, et se vérifie dans le code.
- Titres en casse de phrase.
- Français écrit en français, pas traduit mot à mot : espace insécable avant
  `: ; ? !`, dans « », avant `%` et `€`.
- Chaque app a un test qui refuse au moins le tiret long dans ses textes
  (Inlinr `site-text.test.ts`, Koleko `check:dashes` et `check:design`,
  emblem.run `NO_EM_DASH`). Les scripts communs `check-dashes.ts` et
  `check-copy.ts` (mots d'esbroufe, adverbes de remplissage, formules
  d'assistant, emoji) et la skill `unslop-copy` sont dans
  [../outils/](../outils/README.md).
- Un texte visible change dans toutes les langues du site dans la même PR.
- Une date affichée (« mis à jour le », changelog, feuille de route) est
  celle du fait, et change dans la PR qui change le contenu : une constante
  oubliée ment (feuille de route d'Inlinr datée du 30/10 pour un fichier
  changé le 17/11).

## Interface : design, états, captures

Chaque app a son système de design dans son dépôt ; ce qui suit vaut pour
toutes.

- **Le système de design d'abord** : couleurs, tailles, champs, boutons
  viennent de ses jetons et composants. Une règle qui revient en relecture
  devient un contrôle automatique (plugins GritQL d'Inlinr, `check:design`
  de Koleko).
- **Chaque page tient ses états** : vide, peu, beaucoup, incomplet,
  chargement, erreur ; et ses largeurs, 390 px (téléphone) et 1280 px au
  moins. Le squelette de chargement a la forme de ce qui arrive.
  Jamais de spinner : une ligne fine après 300 ms, puis un squelette que
  la page dessine avec ses propres composants et sa dernière forme connue
  (Inlinr : `pendingComponent`, `rememberShape`). Un zéro ne se met pas en
  avant : une ligne dit quoi faire à la place. Une action n'échoue jamais
  en silence : l'erreur reste à l'endroit de l'action.
- **Rien qui fasse « fait par une IA »** : pas de dégradé ni de lueur
  décorative, pas d'emoji, pas de petites capitales espacées partout, pas
  d'animation qui tourne en boucle, pas de texte gonflé. La skill
  `unslop` est dans [../outils/](../outils/README.md), à adapter au
  système de design de l'app (Koleko a la sienne).
- **Responsive** : aucun défilement de côté dès 320 px, cibles tactiles de
  44 px visées (moins de 24 px refuse une PR, `accessibilite.md`), un
  tableau se replie en lignes sur téléphone au lieu de cacher des colonnes
  (skill `responsive`).
- **Le mouvement répond à un geste** : jamais à l'ouverture d'une page,
  pas de transition de page. Les durées sont des jetons (Inlinr : 100,
  160, 220 et 320 ms), un seul easing. Le survol change la couleur, jamais
  la géométrie (One piece Wiki, v12). `prefers-reduced-motion` coupe tout.
  Un contrôle refuse `animate-spin`, un `animate-pulse` nu et
  `transition-all` (modèle : `biome-plugins/motion.grit` d'Inlinr).
- **Une couleur a un sens** et le garde : le vert veut dire IA chez Inlinr,
  le jaune « non publié » dans le tableau de bord d'emblem.run. Le
  contraste s'écrit à côté de chaque jeton (One piece Wiki). Les couleurs
  hors navigateur (e-mails, images de partage) sont vérifiées contre les
  jetons par un test (modèle : `brand-colours.test.ts` d'Inlinr).
- **Captures avant et après** de chaque écran qui change, dans la PR : 390
  et 1280 px, l'élément cadré avec un peu de contexte, le même cadre avant
  et après, 8 à 12 captures au plus, 30 à 80 ko chacune, sur une branche
  orpheline du dépôt (Inlinr : `pr-screenshots`).
- **Un outil qui regarde chaque page** avant la relecture (Inlinr :
  `bun run ui:audit` à 0 erreur ; Koleko : `check:states` et les parcours).
- **Proposer avant de coder** : la méthode (toiles par zone, planches,
  validation, recapture) est dans [design.md](design.md). Depuis le
  21/11/2026, Thibault valide sur la planche une page nouvelle ou une
  direction nouvelle (mise en page d'ensemble, DA) ; le reste passe par
  l'outil d'audit et les captures, et Claude le montre après. Une app peut être plus stricte
  (Koleko demande l'accord écrit pour tout changement visible).
- **Pour l'UX, la navigation et la réactivité** (pas de chargement global,
  préchargement au survol, squelettes à la bonne taille), les
  recommandations sont dans [ux.md](ux.md).

## Accessibilité

Chaque page se lit au clavier, avec un lecteur d'écran et en grand. Les
règles sont vérifiées par des outils, pas à l'œil.

### Ce qui refuse une PR

- une nouvelle violation axe-core sérieuse ou critique (axe lancé dans
  Playwright sur les pages touchées) ;
- un score d'accessibilité Lighthouse sous 95 ;
- un contrôle sans nom accessible (bouton icône sans `aria-label`, champ
  sans label) ;
- une image porteuse de sens sans `alt`, une image décorative avec un `alt`
  bavard au lieu de `alt=""` ;
- un contraste de texte sous 4,5:1 (3:1 pour un grand titre ou une icône
  d'action) ;
- un élément cliquable plus petit que 24 × 24 px sur téléphone ;
- un focus invisible, ou un ordre de tabulation qui saute dans la page ;
- une animation qui ne s'arrête pas sous `prefers-reduced-motion`.

### À tenir

- Un seul `h1` par page, des titres qui se suivent sans sauter de niveau,
  des repères (`header`, `nav`, `main`, `footer`).
- `lang` juste sur `<html>` et sur un passage dans une autre langue.
- Les composants du système de design portent l'accessibilité (dialogue,
  menu, liste déroulante) : pas de version faite à la main d'un composant
  qui existe.
- Un message d'erreur est relié à son champ et annoncé.
- Une information ne passe jamais par la couleur seule.

### Par app

Koleko : axe dans les parcours (`AXE_STRUCTURE`). Inlinr : `bun run
ui:audit` et Lighthouse (100 sur les pages publiques le 29/10/2026).
emblem.run : `bun run quality:audit`. Les autres reprennent axe dans
Playwright au premier fil qui touche une page.

## Perfs, Lighthouse, React Doctor

Une page lente est un bug. Les budgets sont les mêmes pour toutes les apps ;
chaque dépôt les tient dans un script qui échoue quand une page en sort.

### Budgets, par type de page, téléphone et bureau

| Mesure | Plafond | Source |
|---|---|---|
| LCP simulé (Lighthouse, 4G lente) | 2,5 s | seuil « bon » des Core Web Vitals |
| TBT | 200 ms | seuil « bon » |
| CLS | 0,05 | moitié du seuil « bon » : une image ou une carte a sa taille, un décalage est un bug |
| TTFB servi du cache | 200 ms | |
| JavaScript initial compressé | fixé par app, à la mesure du jour, et qui ne monte que dans la PR qui le justifie | Koleko 330 ko, Inlinr ~200 ko |
| HTML servi | 120 ko par page, vérifié par un script qui échoue en CI ; une exception est nommée dans le script avec sa raison | 21/11 : 60 ko n'était tenu par aucune page d'emblem.run ni par 89 pages sur 139 d'Inlinr |
| Accessibilité, bonnes pratiques, SEO | 95 au moins | une page `noindex` voulue n'est pas « corrigée » |

Le score de performance se montre, il ne se juge pas : on juge les mesures
une à une.

### Mesurer

- Avant et après, sur la même machine, médiane de 3 passes, jamais deux
  Lighthouse ou un build en parallèle.
- En local, le build servi comme en production (HTTP/2, TLS, compression) :
  en HTTP/1.1, Lighthouse simule mal et les chiffres s'effondrent.
- Production : depuis le PC de Thibault (Remote Control) ; le conteneur
  cloud n'atteint pas toujours les sites, et PageSpeed n'a pas de quota
  sans clé. Remesurer après chaque déploiement qui touche le front.
- Ce qui fait gagner le plus, constaté sur Inlinr et Koleko : moins de
  requêtes avant le LCP (pas de preload inutile), l'image du LCP servie dès
  le premier rendu, les polices de secours ajustées (`size-adjust`), le code
  d'une seule page hors du paquet commun.

- Dans un conteneur cloud, Lighthouse lit un TBT plus haut que la
  production (Koleko, 12/11 : 150 à 310 ms sur main, que la production
  tient sous le budget) : on juge le TBT d'une branche contre celui de
  main mesuré au même endroit, et les autres mesures contre le budget
  (7IBO/koleko `.claude/skills/perf`).
- **Sous charge** (modèle : `scripts/load.ts` de Koleko, 16 requêtes à la
  fois pendant 15 s par page, après une requête qui chauffe le cache) :
  une requête en échec compte, et un p95 au-dessus de 300 ms pour une
  page servie du cache ou de 1 s pour une page rendue à chaque requête
  est un échec. Jamais sur la production sans l'annoncer (« Serveur »).
- Dans un script de mesure, arrêter le serveur par son PID, jamais
  `pkill -f <motif>` quand le motif est dans la ligne de commande du
  script : il tue son propre shell.
- Next.js : où se trouve le poids (analyseur par route, code chargé à la
  demande, page statique ou dynamique) dans la skill `nextjs`
  ([../outils/](../outils/README.md)).

### Par app

| App | Commande | Budgets tenus dans |
|---|---|---|
| Koleko | `/perf`, `bun run lighthouse`, `bun run doctor` | `scripts/lighthouse.ts`, `docs/product-review.md` |
| Inlinr | Lighthouse 12 à la main, `bun run ui:audit` | mémoire du projet, à passer en script |
| emblem.run | `bun run quality:audit`, `check:bundles` | `scripts/check-bundles.ts` |
| Les autres | à reprendre de Koleko au premier fil qui touche une page | |

### Pages publiques servies du cache

Une page publique (accueil, tarifs, blog, fiches) ne se rend pas à chaque
visite : elle sort du build ou d'un cache (ISR sur Vercel, cache de pages
sur le VPS, [ops/stabilite.md](../ops/stabilite.md)), et l'en-tête le dit
(`public, s-maxage=…, stale-while-revalidate=…`). Seul ce qui dépend du
visiteur (compte, préférences) se rend à la demande, ou côté client.

- Next.js : un `headers()` ou un `cookies()` lu dans une mise en page ou
  une fonction commune (langue, session) rend **toutes** les pages qui
  l'appellent dynamiques. La langue vient du chemin (segment `[locale]`
  et `generateStaticParams`, réécrit par le proxy), pas d'un en-tête.
  Le build le dit : une route publique marquée `ƒ` au lieu de `○` ou `●`
  est un bug de perf.
- Un cookie qui change le contenu (curseur anti-spoiler d'OnePiece.wiki)
  empêche le cache partagé : la page commune se sert du cache, et la
  partie qui dépend du cookie se calcule à côté (client, ou petite requête
  à part).
- Vérifier en production :
  `curl -s -o /dev/null -D - https://<site>/ | grep -iE "cache-control|x-vercel-cache|age"`.
  `private, no-store` ou `X-Vercel-Cache: MISS` à chaque appel sur une
  page publique : la page se rend à chaque visite.

#### Relevé du 22/11/2026, en production (lecture seule, curl)

| Site | Accueil | Cache | Remarque |
|---|---|---|---|
| emblem.run | 0,25 à 1,9 s | `private, no-store`, MISS à chaque appel, sur `/`, `/pricing`, `/blog`, `/templates`, `/en` | `getLocale()` lit l'en-tête `x-locale` posé par `proxy.ts` : tout le site marketing est rendu à chaque visite |
| OnePiece.wiki | 0,2 à 2,3 s | `public, max-age=0`, MISS | le contenu ne change qu'au build (SQLite), mais le cookie `web_progress` est lu par chaque page ; dernier déploiement de production en erreur (`one-piece-wiki-v4-web`) |
| inlinr.com | 0,08 à 0,8 s ; `/u/<pseudo>` 1,1 s | aucun `Cache-Control` sur les pages publiques | fichiers du build `immutable`, bien ; compression gzip seulement (Caddy) |
| koleko.app | `/en` et `/fr` : **500 après 30 s** (20 h 08 UTC) ; `/en/games` 0,15 s | | incident suivi par le fil Koleko ; HTML de `/en/games` 425 ko (34 ko compressé) |

Images : emblem.run et Koleko servent du WebP ou de l'AVIF avec tailles et
`loading="lazy"` ; les images de partage d'Inlinr (`/u/<pseudo>/og.png`) et
d'emblem.run (`/og`, `/s/[site]/og`) se dessinent à la demande, contre
`ops/stabilite.md` partie 4.

### React Doctor

Le budget de JavaScript par route vit dans un script en CI, qui ne monte
que dans la PR qui le justifie (modèle : `scripts/check-bundles.ts`
d'emblem.run).


Pour toute app React : `bunx react-doctor@<version épinglée> . -y
--no-supply-chain --no-score` (modèle : script `doctor` et `doctor.config.ts`
de Koleko). Rien n'est envoyé au site de l'outil. Une nouvelle erreur se
corrige, ou se désactive sur sa ligne avec sa raison. Un avertissement est
une hypothèse : lire le code avant d'agir.

### PostgreSQL

Leçons de Koleko (7IBO/koleko `docker/postgres/conf/postgresql.conf`,
export `migration/EXPORT-KOLEKO.md`, g, sur sa branche
`docs/migration-export`, jamais fusionnée) :

- **Une table chaude plus grosse que `shared_buffers` en est chassée en
  permanence** : chez Koleko, la vue matérialisée du catalogue,
  `catalogue_game` (172 Mo), avec `shared_buffers` à 256 Mo dans un
  conteneur de 1 Go. On compare la taille de ce que les pages lisent
  souvent avec `shared_buffers` avant de régler l'un ou l'autre.
- **Les index gonflent et l'autovacuum se règle** pour les tables très
  écrites (Koleko : `log_autovacuum_min_duration = 10s`, deux workers ;
  le réglage reste à faire, THI-1728).
- **Une liste paginée a un ordre total et un plafond** : chaque tri finit
  par l'id, pour que deux pages ne partagent aucune ligne ; l'adresse ne
  fait jamais sauter à la base plus que `plafond × taille de page` lignes
  (Koleko : 200 pages de 48, soit un `OFFSET` de 9 552 au plus). Sous ce
  plafond, un `OFFSET` sur l'index du tri suffit, si son plan est lu sur les
  volumes de production à la dernière page. Un curseur dans l'adresse
  ouvre aux robots autant d'adresses que de lignes : on ne le met que dans
  un appel interne (un « 48 de plus » qui ne passe pas par `?page=N`), et
  seulement quand ce plan ne tient pas.
- Une tâche lourde (rafraîchissement d'une vue matérialisée) prend un
  `work_mem` à elle plutôt que de monter celui de toute la base (Koleko :
  96 Mo pour le rafraîchissement de `catalogue_game`, `docs/worker.md`).

### Serveur

Sur le VPS partagé, une charge de test sur la production s'annonce dans le
fil d'abord, avec peu de connexions : les autres sites partagent la machine
(`ops/vps.md`). Un process Node à mémoire bornée :
[robustesse.md](robustesse.md), « Un process Node dans un conteneur ».

## Robustesse : services externes, configuration, données

Ce que les apps ont appris en production et qui vaut pour toutes. Relevé
du 21/11/2026 sur Inlinr, emblem.run et Koleko. Les tâches planifiées ont
leur fichier : [jobs.md](jobs.md).

### Appels à un autre service

- **Un délai à chaque appel**, dans les options du fetch :
  `fetch(url, { signal: AbortSignal.timeout(ms) })`, jamais dans un
  `new Request(url, { signal })` (undici cesse d'interrompre quand la
  Request est ramassée : neuf lectures d'emblem.run ont tourné jusqu'aux
  300 s de la fonction). Une fonction par usage le fait pour toute l'app
  (Inlinr `fetchJson`, emblem.run `sendSigned` pour R2).
- **On ne relance que ce qui peut passer** : une erreur réseau, un 5xx,
  un 408 ou un 429 (en suivant `Retry-After`), avec un délai qui grandit,
  quelques fois au plus. Les autres 4xx ne se relancent pas.
- **Chaque source a son limiteur et son budget** (appels par seconde et
  par jour, sous le quota du service, une marge pour ce qu'on ne voit
  pas) : un appel qui le contourne refuse la PR (Koleko, `docs/worker.md`).
- **Les quotas gratuits sont des budgets** : e-mails (Resend, 100 par
  jour, emblem.run `email-budget.ts`), IA (plafond par mois,
  `qualite.md`), sondes Better Stack (`ops/regles.md`). Ce qui dépasse
  attend le jour suivant, par ordre d'importance (un code de connexion
  avant un récapitulatif).

### Configuration

- **Une variable s'ajoute à trois endroits qui doivent s'accorder** : le
  code, `.env.example` (la seule référence, une ligne par variable qui dit
  ce qui se passe quand elle est vide) et ce que la CI ou le build
  laissent passer (emblem.run : `turbo.json` `globalEnv`, vérifié par
  `scripts/check-env.ts`). On lit une variable par une seule fonction
  (Inlinr `env("NOM")`).
- **Une fonction sans sa variable se coupe** au lieu de casser : elle
  répond `skipped` ou disparaît de l'écran. Le but : l'app démarre sans
  aucune variable, et la CI le vérifie (emblem.run le tient : `check:routes`
  démarre les deux apps à vide). Couper une fonction en production, c'est
  vider sa variable : sur Vercel un nouveau build facturé, sur le VPS un
  changement du serveur, avec le mot de Thibault.

### Données stockées

- **Ce qui est stocké survit au code qui l'a écrit** : une migration
  passe au merge, le code des heures après, un retour arrière remet un
  vieux build sur des données neuves. Les migrations ajoutent (`ci-cd.md`) ; un format publié reste
  lisible par chaque version (emblem.run : copies gelées dans
  `packages/db/src/frozen/`, `docs/operations.md`).
- **Une écriture qui doit arriver entière** part en une transaction, ou un
  lot unique quand le pilote n'a pas de transaction (emblem.run
  `writeAtomically`).

### Un process Node dans un conteneur

Leçons du site de Koleko sur le VPS, en novembre 2026 (7IBO/koleko
`docs/deploying.md`, « Memory », et `docker/compose.site.yml`). Les
chiffres sont les siens ; la règle vaut pour tout Node à mémoire bornée.

- **Le tas V8 se règle sous la limite du conteneur**
  (`NODE_OPTIONS=--max-old-space-size=…`), avec la place de ce que le
  process tient hors du tas : un process qui atteint son tas échoue et
  redémarre, au lieu d'être tué par le noyau. Koleko : tas de 448 Mo dans
  1 Go (512 lisait 524 Mo au total), 350 à 420 Mo mesurés hors du tas ; à
  320 Mo, cinq échecs sur le tas le 17/11. La méthode de réglage est dans
  `ops/vps.md`, « Mémoire ».
- **`MALLOC_ARENA_MAX=2`** quand le process décode des images : sharp
  travaille sur plusieurs threads, chacun prend son arène malloc, et la
  mémoire hors du tas se fragmente. Les aperçus d'images sont bornés (deux
  à la fois, une image en échec laissée dix minutes).
- **`oom_score_adj`** : si le serveur manque de mémoire, le noyau tue une
  copie du site (500) avant la base et les autres projets.
- **Le cache de Next sur disque est borné** et gardé d'un redémarrage à
  l'autre du même build (`ops/stabilite.md`, partie 2) (Koleko :
  3 Go, les plus anciennes pages d'abord, `SITE_CACHE_MAX_MB`,
  `lib/server/cache-bound.ts`). Le cache du noyau sur ces fichiers compte
  dans la limite du conteneur : on lit `anon` dans `memory.stat`, avec
  `oom_kill` et `memory.pressure`, jamais `docker stats`.
- **Un redémarrage a un prix** : cache vide, donc environ 75 s de
  connexions à la base en délai dépassé et 90 s de 500 sur `/fr` (Koleko,
  17/11). Un redémarrage n'est pas un remède : on le compte
  (`docker inspect -f '{{.RestartCount}}'`, `OOMKilled` reste faux), on
  alerte dessus, et on lit la pente de la mémoire.
- Le process écrit sa mémoire chaque minute (une ligne `[memory]` : rss,
  tas contre sa limite, external, buffers) : un tas qui monte montre ce que
  le process garde, une hausse hors du tas montre les images et les
  tampons.

### Erreurs

- **Une erreur arrive à un endroit que quelqu'un lit** : Inlinr Admin →
  Errors (serveur, crons, plugins), emblem.run `ALERT_WEBHOOK_URL`, Koleko
  /admin et `check.sh`. Sans donnée personnelle (chemin personnel remplacé
  par `~`, paramètres retirés) ; une erreur envoyée par un plugin, la même
  une fois par jour au plus (Inlinr).
- Un log ne cite jamais un secret ni une donnée personnelle (Koleko : on
  logue la cause d'une erreur Drizzle, pas son message, qui cite les
  paramètres).

## Design de référence

Comment chaque app garde un design à jour et le fait valider avant de
coder. La skill `design-change` d'[../outils/](../outils/README.md) en
donne l'ordre des étapes. Les règles d'interface (états, largeurs, captures dans la PR) sont
dans [interface.md](interface.md).

### Quelles apps

Une app active qui a une interface. Une app en pause ou sans interface n'a
rien à tenir ; elle s'y met au premier fil qui la reprend. La référence se
construit au fil de l'eau : une zone est capturée la première fois qu'un fil
la touche, pas toute l'app d'un coup.

### Ce que chaque app tient

| Quoi | Où | Contenu |
|---|---|---|
| Système de design | Un artefact claude.ai à part, et ses jetons dans le dépôt | Couleurs, typographie, espacements, composants, animations et leurs durées |
| Toile de référence | Une toile Claude Design ; une par zone (ex. Site et blog, Dashboard, Pages publiques) quand l'app dépasse une centaine d'écrans | L'état actuel seulement : chaque page, à 390 et 1280 px, clair et sombre, avec ses états |
| Propositions | Une toile « Propositions » par app | Les planches en cours, chacune avec son statut |
| Archives | Une toile « Archives » datée (une nouvelle quand elle est pleine) | Les planches livrées ou refusées |
| Index | `docs/design.md` dans le dépôt de l'app (modèle : [../modeles/design.md](../modeles/design.md)) | Les liens, la grille pages × états, le commit de la dernière recapture |

Les états d'une page sont ceux d'[interface.md](interface.md) : vide, peu,
beaucoup, incomplet, chargement, erreur, plus succès quand la page en a un
(envoi, paiement, publication) ; et ses animations (entrée, sortie, survol).
Une app qui a déjà un outil qui parcourt les états (Inlinr `ui:audit`, Koleko
`check:states`) en tire ses captures au lieu de les refaire à la main.

### La limite de fichiers d'une toile

Une toile Claude Design garde 511 fichiers par version, plus la page (celle
d'emblem.run était pleine le 20/11/2026). Pour ne pas la remplir :

- Les captures vont dans le stock d'images de la toile (upload en `asset`),
  pas dans ses fichiers (fait sur la toile d'emblem.run depuis le 12/11).
- Une recapture envoie la nouvelle image, fait pointer la page vers sa
  nouvelle adresse, puis supprime l'ancienne image : le stock ne grossit pas.
- Ce qui s'accumule (planches livrées) part dans « Archives ».
- Une toile par zone quand l'app est grande : chacune reste lisible, et deux
  fils publient moins souvent la même toile.

### Le cycle d'un changement visible

1. **Vérifier que la référence est à jour.** `git fetch origin main`, lire
   le commit de dernière recapture dans `docs/design.md`, puis
   `git log <commit>..origin/main -- <dossiers d'interface>`. Une page qui a
   changé depuis est recapturée avant de dessiner quoi que ce soit.
2. **Proposer** une planche dans « Propositions » : avant et après, 390 et
   1280 px, clair et sombre, les états touchés, et un bloc « Vérifié : UX,
   UI, DA, navigation ».
3. **Valider** (21/11). Dans le doute, on monte d'un cran.
   - **Page ou direction nouvelle** : une page qui n'existait pas, la mise
     en page d'ensemble d'une zone, la DA (palette, police, style des
     composants). Thibault valide sur la planche, par un commentaire. Pas
     de code avant.
   - **Gros changement** : la mise en page d'une page existante, une
     animation nouvelle, la valeur d'un jeton, un composant du système de
     design. Il passe par l'outil d'audit des pages et les captures avant et
     après ; Claude tranche, code, et le montre sur la toile.
   - **Retouche** : un espacement, un texte, l'emploi d'un jeton existant,
     un état manquant dessiné comme les autres, un bug qui rend la page
     conforme à sa référence. Claude tranche et code, puis montre le
     résultat sur la toile.
   - Une app peut être plus stricte dans son dépôt (Koleko : accord écrit
     pour tout changement visible).
4. **Coder.** La partie Design du corps de la PR donne le lien de la
   planche et sa date de validation, ou « retouche ». Le relecteur produit
   la vérifie (`review.md`).
5. **Après le merge**, par le fil qui a ouvert la PR, même si Thibault a
   fusionné à la main : recapturer les pages changées, mettre à jour le
   commit dans `docs/design.md`, passer la planche dans « Archives ».

Un fil qui n'atteint pas la toile (autre compte Claude, outil absent) met la
planche en captures dans la PR, statut « En attente », et la reporte sur la
toile au fil suivant qui y a accès.

### Statut d'une planche

Chaque planche porte en tête : « En attente », « Validée le JJ/MM », « Retouche
montrée » ou « Refusée ». Un fil lit les commentaires de la planche avant de
coder.

### Calibration du goût

Chaque app avec une interface tient, dans `docs/design.md` ou sa vision,
la liste des références que Thibault a aimées, trouvées tièdes ou
rejetées, avec la raison de chacune (modèle : `docs/VISION.md` §4 de One
piece Wiki). Une proposition de design ou un visuel marketing la relit
d'abord. Diagnostic qui vaut partout : cartes arrondies flottantes,
pastilles, grilles uniformes et accents lumineux se lisent comme une
maquette générée.

### Recapture

Un outil qui parcourt toutes les pages et leurs états, sur des comptes de
démo vides, peu remplis et pleins, à 390, 1280 et 1440 px, sert de base
aux recaptures (modèle : `bun run ui:audit` d'Inlinr, `docs/ui-audit.md`).

## SEO

La skill `seo` (contrôles avant une PR, ce que lit un robot) est dans
[../outils/](../outils/README.md).

### Qui fait quoi

Ce tableau est la source ; `MIGRATION.md` de 7IBO/marketing y renvoie.

| Sujet | Où se décide | Où se corrige |
|---|---|---|
| Faut-il un blog, quoi écrire, mots visés, textes des articles | Le dépôt de l'app, `docs/marketing.md` (21/11) ; 7IBO/marketing propose le plan dans `<app>/seo.md` et rédige à la demande | Le texte part dans le dépôt de l'app en PR qui ne touche que son dossier de contenu |
| Bilan tous les deux mois, pour une app lancée qui a un blog (Search Console, Bing : pages indexées, requêtes, erreurs) | 7IBO/marketing, `<app>/seo.md`, d'après Search Console, que Claude lit lui-même (voir plus bas), et l'état de Bing que Thibault colle | Les défauts deviennent des tickets label SEO dans le projet de l'app |
| SEO technique (liste ci-dessous) | Le dépôt de l'app | Le dépôt de l'app |
| Code et design des pages du blog | Le dépôt de l'app (toile « Site et blog ») | Le dépôt de l'app |

### Le blog

Il vit dans le dépôt de l'app et sur son domaine (`/blog`), jamais sur un
sous-domaine ni un outil à part : les liens gagnés profitent au site. Il
n'existe que si `<app>/seo.md` dit pour quelles recherches.

### Ce que chaque app tient (technique)

- `sitemap.xml` à jour, `robots.txt`, une adresse canonique par page.
- Titre et description propres à chaque page, visés à 60 et 160
  caractères ; un dépassement choisi est listé dans `<app>/seo.md`.
- `hreflang` quand l'app a plusieurs langues.
- Image de partage (1200 × 630) par page qui compte.
- Données structurées là où elles s'appliquent (article, produit, FAQ,
  organisation), vérifiées avec le test des résultats enrichis après
  chaque déploiement qui les change.
- Une page `noindex` est voulue et listée, jamais « corrigée ».
- Vitesse et Lighthouse SEO : budgets de [perfs.md](perfs.md).
- Search Console et Bing Webmaster Tools reliés au domaine. Claude lit
  Search Console lui-même, dans le navigateur intégré de l'app Claude sur
  le PC de Thibault, où son compte est connecté (26/11), au lieu de lui en
  demander une copie. Lecture seule : envoyer un sitemap, demander une
  indexation ou lancer « Valider la correction » attend le mot de Thibault
  dans le fil. Sans accès au PC, on lui demande l'état. Bing Webmaster
  Tools reste à Thibault : il en colle l'état dans le fil quand on le lui
  demande.
- Une adresse publique ne disparaît pas sans redirection 308 : la CI le
  refuse (modèle : `scripts/check-routes.ts` et `served-addresses.ts`
  d'emblem.run).
- Un guide déclare les zones de code qu'il décrit et une date de relecture ;
  la CI signale les guides à relire quand ce code change (modèle :
  `covers`, `reviewBy` et `scripts/guides-affected.ts` d'Inlinr). Un guide
  daté ne paraît qu'au premier déploiement de sa date (Inlinr, `BUILD_DAY`).
- Un nouvel article ou guide répond à une recherche réelle, lue dans Search
  Console. Tant que le site a moins de 50 pages indexées, il sert à la place
  une fonction de l'app ou l'activation, sinon il attend (21/11).
- Métadonnées dans chaque langue : titre vers 60 caractères, description de
  160 au plus, contrôlées par un test qui couvre toutes les langues et les
  pages générées (paquets, changelog) ; `lastmod` du sitemap tiré du dernier
  changement réel de la page.
- Maillage : chaque page produit lie au moins un article qui la sert, et
  chaque article lie sa page produit.
- Les pages publiques sont servies par le cache du CDN et purgées à la
  publication (budget « TTFB servi du cache » de [perfs.md](perfs.md)).
- `llms.txt` et une version texte des pages qui comptent, pour les agents
  (modèle : emblem.run).
- Un relevé par mois, écrit dans le dépôt de l'app : pages indexées et
  connues (Search Console), Lighthouse des pages clés, poids HTML.

### Lire Search Console

Ce que le relevé du 26/11/2026 a appris, pour les trois sites lancés
(emblem.run, Inlinr, Koleko) :

- Un index de sitemaps lu (« Opération effectuée ») ne suffit pas : ouvrir
  l'index et vérifier qu'il liste chacun de ses sitemaps avec ses pages
  découvertes. S'il n'en liste aucun, proposer à Thibault d'envoyer chaque
  sitemap à part. Inlinr : index lu le 20/11, aucun de ses quatre sitemaps
  listé, 0 page découverte, alors que les quatre fichiers sont sains.
- Les « Erreur serveur (5xx) » se datent avant de se corriger : si leurs
  dates d'exploration tombent sur des incidents Better Stack, la cause est
  la stabilité du serveur, pas les pages. On demande à Thibault de relancer
  « Valider la correction » après sept jours sans incident, jamais avant : une
  validation qui échoue repousse la suivante. Koleko : 654 pages, dates
  des pannes du 2, du 7 au 9, du 13 et des 21 et 22 novembre.
- « Détectée » ou « Explorée, actuellement non indexée » sur un domaine de
  moins de six mois n'est pas un défaut technique : le levier est les
  liens et la règle des 50 pages ci-dessus ; le code n'y peut rien.
- Une exclusion voulue (noindex, robots, canonical vers une autre page,
  redirection de `www` et `http`) se vérifie contre la liste de l'app,
  puis se laisse.
- Vérifier un site soi-même en appelant ses pages : deux requêtes à la
  fois au plus, et jamais pendant un incident Better Stack ouvert.

### Ouvrir des pages à l'indexation par paliers

Leçon de Koleko, le 12/11/2026 : le sitemap est passé en une mise en ligne
de 23 000 à 75 000 pages (les onglets de chaque fiche de jeu), Google a fait
sa plus grosse exploration le lendemain, puis les impressions sont tombées
d'environ 3 000 à 40 par jour, pages toujours indexées et sans action
manuelle (export de Koleko `migration/EXPORT-KOLEKO.md`, f.7, sur sa
branche `docs/migration-export`, jamais fusionnée ; 7IBO/koleko PR #669 a
remis les onglets en `noindex`). Le sitemap n'était pas seul à changer :
la même mise en ligne, le 10/11 à 22 h 01, a aussi changé l'hébergement
(de Vercel au serveur) et les titres avec les onglets listés.

- **Un site ne gagne jamais d'un coup des milliers de pages indexables.**
  Les nouvelles pages s'ouvrent par paliers, un plafond par jour réglé par
  une variable, les plus utiles d'abord, et le sitemap ne liste que les
  pages ouvertes. Modèle : la tâche `seo.open` de Koleko, plafonnée par
  `SEO_OPEN_PER_DAY` (100 par défaut, 0 n'en ouvre aucune), qui prévient
  IndexNow des pages ouvertes et fermées (7IBO/koleko `docs/worker.md`,
  « Search engines » ; `docker/prod.env.example`).
- Le plafond ne monte qu'à la main, après une lecture de Search Console et
  des coûts d'hébergement (Koleko : de 500 à 2 000 après deux semaines dans
  l'offre, `docs/monitoring.md`).
- Une variante d'une page qui n'apporte pas de recherche à elle est
  `noindex, follow` et sortie du sitemap (Koleko : les onglets Plateformes
  et DLC, PR #669).
- Après une chute, on coupe d'abord l'ouverture (Koleko : `SEO_OPEN_PER_DAY=0`
  posé le 16/11 pour trois semaines, lectures prévues le 23/11 et le 7/12).
- **Une seule variable SEO par mise en ligne, notée dans un journal daté**
  (hébergement, plafond d'ouverture, titre d'un type de page, règle de
  `noindex`, sitemap). Le journal est une section « Journal » de la doc
  du dépôt qui tient déjà le SEO de l'app (`docs/public-pages.md` chez
  Inlinr, `docs/public-sites.md` chez emblem.run, `docs/monitoring.md`,
  « Search engines », chez Koleko) : une ligne par changement, sa date,
  la variable, la valeur avant et après. Deux variables changées le même
  jour ne se lisent plus dans Search Console : chez Koleko, trois ont
  bougé le 10/11, et la chute du 12/11 ne s'attribue à aucune avec
  certitude (analyse du 24/11).

### Listes paginées

Validé pour le catalogue de Koleko le 22/11/2026 (chargement « auto, puis
bouton ») ; vaut pour toute liste paginée d'une app.

- **Chaque tranche est une vraie adresse** `?page=N`, rendue côté serveur,
  avec des liens `<a href>` vers la précédente et la suivante, qui marchent
  sans JS. Un chargement « 48 de plus » au défilement ou au bouton lit la
  même entrée de cache que l'adresse, jamais une requête à lui.
- **`?page=1` redirige (308) vers l'adresse sans paramètre.**
- **Canonical vers elle-même** pour une page de la liste sans filtre, avec
  son titre à elle (« Jeux, page 5 »). Une canonical vers soi et un
  `noindex` ne se contredisent pas ; une canonical vers une autre page et
  un `noindex` si : on ne les met jamais ensemble.
- **Les premières pages s'indexent, les profondes sont `noindex, follow`**,
  avec un nombre fixé par une constante (Koleko : `INDEXED_LIST_PAGES = 5`).
  Aucune `?page=N` dans le sitemap : il porte les pages de détail. Un
  `noindex` qui dure finit lu comme `nofollow` : les pages de détail se
  découvrent par le sitemap et leurs liens entre elles, pas par la page 80
  d'une liste.
- **Une liste filtrée ou triée n'est pas lue par les robots** : son
  adresse est fermée dans `robots.txt` (seul `?page=` y reste ouvert), et
  le lien qui y mène porte `nofollow`. Fermée, elle n'a pas besoin de
  `noindex` : un robot ne le lirait pas.
- **Un plafond de pages par liste**, quel que soit le total (Koleko :
  `CATALOGUE_MAX_PAGE = 200`) : au-delà, et après la dernière page, 404 (pas
  410 : le total change chaque jour), sans lire la liste. Le statut doit
  être un vrai 404 pour les robots : une page qui envoie son en-tête avant
  ses données répond 200 (Koleko : `htmlLimitedBots`, `lib/seo/bots.ts`).
- `rel="next"` et `rel="prev"` ne servent à rien : Google les ignore depuis
  2019, Bing ne dit pas les lire.

## CI et déploiement

### Ce que la CI fait, et ne fait pas

- La CI tourne sur les PR seulement, jamais sur un push vers `main` : main
  n'est vérifié que par la PR (mise à jour avant merge si sa base a bougé).
- **Un seul job** : chaque job est facturé à la minute entamée ; quatre jobs
  en parallèle coûtent plus que la somme de leur travail (mesure
  d'emblem.run et d'Inlinr : le parallélisme ne gagne rien sur 2 cœurs).
- La CI ne tourne que quand la PR devient prête (Koleko : le moins cher,
  un run par PR) ou une fois par push sur une PR prête : travailler en
  brouillon, marquer prête une fois.
  Le job porte `if: ${{ !github.event.pull_request.draft }}` et les
  déclencheurs `[opened, synchronize, reopened, ready_for_review]` : sans
  le `if`, un brouillon lance tout à chaque push (inlinr-web jusqu'au
  22/11).
- La durée d'un run se lit étape par étape avant d'y toucher
  (`gh api repos/<dépôt>/actions/runs/<id>/jobs`). Mesure d'emblem.run du
  22/11 : les tests prennent 4 min sur 6, tenus par les suites PGlite de
  `packages/db` (52 s seules sur un PC, 4 min sur les 2 cœurs du runner).
  Lancer les paquets turbo un par un n'a gagné que 20 s
  (7IBO/emblem.run#464, fermée) : le levier est le nombre de runs, puis
  le coût de ces suites.
- Chaque job a un `timeout-minutes` : un test bloqué ne brûle pas les
  6 heures par défaut. Écart au 24/11 : absent du déploiement
  d'inlinr-web (THI-2179), de `db-migrate.yml` et des trois workflows
  lancés à la main d'emblem.run (`db-seed-demo`, `db-setup`,
  `storage-migrate-data-images` ; THI-2188) et des workflows des trois
  outils d'Inlinr (THI-2185).
- Les contrôles longs (tests sur base, build, parcours, Lighthouse) tournent
  **dans la session** avant le push ; la CI garde ce qui doit être garanti à
  chaque merge.
- Une PR de docs seule saute le build et les tests (modèle :
  `scripts/ci-changes.ts` de Koleko). Le saut se fait dans le job, pas
  par `paths-ignore` : avec `paths-ignore` la PR ne lance rien, donc ni le
  contrôle d'attribution ni un contrôle requis sur `main` (emblem.run au
  24/11, THI-2188).
- Un job qui tient un jeton de publication ou une clé du serveur fige ses
  outils : les actions par leur commit, la version de bun, les outils de
  publication par le lockfile. Écarts au 24/11 : `bun-version: latest`
  dans la release d'inlinr-vscode (THI-2185) ; les actions prises par
  étiquette (`actions/checkout@v7`, `docker/login-action@v4`) dans le
  `deploy.yml` de Koleko, qui tient la clé du serveur et le jeton Vercel
  (THI-1642), et dans `db-migrate.yml` d'emblem.run, qui tient la base de
  production (THI-2188).
- Cache des dépendances et du typecheck quand l'outil le permet (turbo,
  bun).
- **Un corps de PR ne s'édite jamais avec `gh api PATCH`** : depuis un
  conteneur cloud, l'appel remet le pied « Generated by Claude Code », et
  le contrôle d'attribution refuse la PR quand elle passe prête, ce qui
  coûte un run de plus (Koleko, PR #658 du 16/11, export
  `migration/EXPORT-KOLEKO.md`, sur la branche `docs/migration-export` de
  7IBO/koleko, jamais fusionnée). On passe par l'outil MCP
  `update_pull_request`, qui le laisse (`pr.md`).
- Aucune tâche planifiée dans GitHub Actions : un cron sur le VPS installé
  par un bloc, une tâche planifiée Claude, ou un cron Vercel
  (`jobs.md`).

### Déploiement

| App | Comment | Qui décide |
|---|---|---|
| Inlinr | un merge sur `main` construit l'image et déploie sur le VPS, un merge de docs aussi | merger = déployer : jamais pendant une maintenance du serveur |
| emblem.run | cron Vercel à 11 h et 19 h UTC, sauté si main n'a pas bougé et si le jeton `DEPLOY_GITHUB_TOKEN` est posé ; migrations par workflow au merge | automatique |
| Koleko | workflow Deploy lancé à la main, par lots | accord permanent pour un lot sans changement de base ; sinon le mot de Thibault |

Règles communes :

- Deux lots par jour au plus, le second réservé aux correctifs ; jamais un
  déploiement pour « voir » un changement (les captures viennent du site lancé dans la session).
  Exception écrite le 24/11 pour Inlinr : chaque merge continue d'y
  déployer, à trois conditions. Le frein de THI-2179 est fusionné (docs
  ignorées, durée limite du job, variable de pause lue avant de
  construire, préchauffage après le contrôle de santé) ; le contrôle de CI
  est requis sur `main`, pour qu'un `main` rouge n'arrive plus en
  production (THI-1012) ; les fusions se groupent en deux lots par jour au
  plus. Tant que l'une des deux premières manque (le frein est dû le 7/12),
  l'exception ne vaut pas encore : les fusions se groupent, et une PR de
  docs attend un lot qui déploie déjà. Relevé du même jour : 137
  déploiements en novembre, dont 34 du 20 au 22/11 pendant que le serveur
  tombait, et un conteneur recréé pour deux fichiers Markdown. À revoir au
  premier incident Better Stack dans les cinq minutes qui suivent un
  déploiement, ou au-delà de dix déploiements dans une journée : le
  déploiement passe alors à la main, par lots, comme Koleko.
- Une migration est additive : elle tourne pendant que l'ancienne version
  sert encore, et une colonne n'est supprimée qu'un déploiement après celui
  qui cesse de la lire.
- Après chaque déploiement : le site vu en vrai (pages du lot, 390 et
  1280 px), la sonde et `/api/health` au vert ; sinon correctif ou retour
  arrière.
- Un retour arrière est écrit d'avance pour chaque app (commande, image ou
  commit précédent).
- Proposé, pas encore une règle (THI-2187) : après une bascule, revenir à
  la copie d'avant dès le premier contrôle de l'extérieur raté. Le 24/11,
  celui de Koleko a essayé trois fois avant de revenir : environ 5 min
  pendant lesquelles le site a mal répondu, pour un retour qui a pris 6 s.
  À régler avant : savoir distinguer une copie qui ne répond pas d'un
  Caddy tombé, que le retour ne répare pas. Ce jour-là, le premier essai
  a échoué sur toutes les adresses dans la minute où Caddy était tué
  (THI-2122).
- Les builds Vercel sont facturés : pas d'aperçu sur chaque push.
- **Vercel accepte 100 déploiements par 24 h glissantes pour tout le
  compte**, toutes apps confondues. Le 24/10, les aperçus de tous les fils
  de Koleko l'ont épuisé : statut « Deployment rate limited » sur les PR et
  un correctif de production bloqué jusqu'au lendemain (export de
  Koleko, plus haut). D'où les aperçus coupés et les
  déploiements Git désactivés (Koleko depuis le 24/10, emblem.run par son
  `vercel.json`) ; le quota est dans `comptes.md`.
- Sur Vercel, le déploiement de production passe par un cron qui appelle
  le Deploy Hook et saute quand main n'a pas bougé ; les aperçus sont
  coupés (modèle : `lib/scheduled-deploy.ts` d'emblem.run). Pour un dépôt
  privé, le cron lit `main` avec un jeton en lecture seule : sans lui, il
  ne saute jamais. Relevé du 24/11 sur emblem.run : le jeton manque, les
  deux apps sont reconstruites à chaque passage, soit une soixantaine de
  builds inutiles par mois (THI-1788).

## Linear

- Une équipe, THI. Un projet par app ; un projet en pause n'a plus de ticket
  ouvert. Ce qui est commun à plusieurs apps (serveur, comptes, socle,
  console) n'a pas de projet : un ticket sans projet, à son label de
  domaine.
- Labels, lus en deux familles (pas des groupes dans Linear, où rien
  n'empêche d'en poser deux). **Type** : Feature, Improvement, Bug, un seul
  par ticket. **Domaine** : Marketing, Légal, Ops, SEO, UI. Plus
  **Thibault** : ce que lui seul peut faire ; un geste de Thibault n'a pas
  besoin de type.
- Vues : une par app, « Marketing », « Ops et serveur », « À faire par
  Thibault » (tous projets). Le connecteur Linear ne trouve pas cette
  dernière (essai du 24/11) : une session lit à la place les tickets
  ouverts au label Thibault, tous projets.
- **Ce qu'est un ticket** : un travail à faire dans le mois, ou un geste de
  Thibault. Une idée pour plus tard va dans le document « Réserve » du
  projet Linear : un ticket replié y est copié tel quel (titre, date,
  puces) sous un sommaire, une idée neuve y tient en une ligne datée. Elle
  redevient un ticket le jour où on la prend. Un contrôle qui revient (lire
  Search Console, relever un quota) est une tâche planifiée, pas un ticket.
  Pas de ticket chapeau qui ne fait que lister d'autres tickets : un jalon
  ou un document.
- **Un geste de Thibault est une séance** : un seul endroit (un fil, un
  compte, le serveur), faite d'une traite. Label Thibault, un titre qui dit
  le geste, et dans le champ de date celle du premier geste : l'échéance
  quand il y en a une, sinon le jour prévu pour la séance, au plus tard la
  fin du mois. Un ticket Thibault sans date est un défaut ; un geste qui
  attend un événement sans date (une première vente) est une ligne de la
  Réserve, pas un ticket. Le même geste ne s'écrit que dans un ticket, les
  autres y renvoient ; le travail qui attend ce geste garde son ticket,
  sans le label. Une séance qui dépasse cinq cases ou porte deux échéances
  se coupe, par endroit ou par échéance. Relevé du 24/11 : 31 tickets au
  label Thibault dont 13 sans date, la même séance serveur écrite dans
  quatre tickets, et un ticket de plus de vingt cases (THI-1012).
- Chercher avant de créer ; un doublon se ferme vers l'original.
- **Une demande à un autre projet** est un ticket dans le projet Linear de
  ce projet, au label du domaine, cité dans le message `relay` ; vers
  Marketing, un ticket sans projet (`responsabilites.md`).
- Un ticket : titre en français à l'infinitif, 1 à 4 puces (cinq cases au
  plus pour une séance de Thibault), pas d'estimation. Backlog (prévu dans
  le mois, pas encore ordonné), Todo (prêt à être pris, ou un geste daté),
  In Progress, In Review, Done. Une date dépassée se traite dans la
  semaine par le projet qui porte le ticket : remise au jour réel, ou
  retirée. Seul un geste de Thibault en retard garde la sienne, pour que
  le retard se lise.
- Pas de « #N » nu dans une description ou un commentaire : Linear le lie
  à la PR N d'un autre dépôt (constat du projet Inlinr, remonté le
  24/11). On écrit le dépôt et le numéro en entier
  (`inlinrhq/inlinr-web#874`) ou le lien de la PR.
- Priorités : gardées là où un projet les a posées (Koleko, emblem.run),
  jamais retirées en masse ; on n'en ajoute pas où il n'y en a pas
  (Inlinr). Jalons : libres par projet.
- **Aucun assigné**, dans aucun projet (choix de Thibault du 21/11/2026,
  `decisions.md`).
- Branche = `gitBranchName` du ticket, sans le changer ; PR « Closes THI-N »
  ou « Refs: THI-N » selon le dépôt.
- Plan gratuit : 250 tickets non archivés dans tout l'espace (les archivés
  ne comptent pas). L'archivage se tient dans le projet Marketing, pour
  toutes les apps : une app ne l'archive plus elle-même. La tâche « Surveiller
  la limite de tickets Linear » compte chaque jour (4 h 13) et prévient dès
  210 (230 jusqu'au 24/11 : ce jour-là, 38 tickets ont été créés avant le
  soir, près du double de la marge de 20). Thibault écrit alors « archive
  tickets done » dans un fil du projet Marketing : on archive tous les
  fermés (Done, annulés, doublons ; son choix du 21/11/2026), jamais un
  ouvert. Une tâche planifiée n'archive pas seule : elle n'a pas son
  accord, l'archivage lui est refusé.
- Archiver un ticket archive ses sous-tickets : avant, on détache tout
  sous-ticket encore ouvert d'un parent fermé. Le connecteur Linear ne sait
  pas archiver : l'API (`issueArchive`, sans `trash`) avec `LINEAR_API_KEY`
  dans l'environnement du projet Marketing. Le réglage natif d'archivage
  automatique ne suffit pas : son délai minimal est d'un mois.
- Si les ouverts seuls passent 200, le backlog se trie : archiver les
  fermés ne suffit plus, et la tâche le dit dans son message (c'est le cas
  le 24/11 au soir : environ 200 ouverts sur 212). Sur le oui de Thibault à
  chaque fois, on replie tout ticket en Backlog qui n'est pas prévu dans le
  mois, quel que soit son âge, dans la Réserve de son projet ou dans le
  document qui tient déjà son sujet, puis on l'archive : c'est le seul cas
  où un ticket ouvert s'archive. La condition d'âge (plus de deux mois) a
  valu jusqu'au 24/11 : Koleko portait alors les trois quarts des ouverts,
  et aucun de ses tickets n'avait deux mois. Fait une première fois le
  24/11/2026 : 68 tickets archivés, de 250 à 187 avec les cinq créés
  pendant le repli.
- Une modification en masse (labels, projet) remet `updatedAt` à sa date :
  depuis celle du 20/11, « modifié récemment » ne dit plus rien. L'âge d'un
  ticket se lit à `createdAt`, à son état et à ses commentaires.
- Un rapport daté va dans un document Linear du projet, pas dans un fichier
  de plus. Ce qui est en vigueur (décisions, registre des traitements,
  plan, règles) vit dans le dépôt de l'app, et ce qui attend Thibault dans
  ses tickets : un document Linear ne tient ni règle ni liste de gestes à
  faire par Thibault (24/11 : quatre documents d'Inlinr en tenaient une).
