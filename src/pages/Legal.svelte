<script lang="ts">
  import { i18n, t } from '../lib/i18n/index.svelte';
  import LangSwitch from '../components/LangSwitch.svelte';

  let { kind }: { kind: 'legal' | 'privacy' } = $props();

  import { SITE } from '../lib/site';

  const MAIL = SITE.mail;
  const fr = $derived(i18n.lang === 'fr');
</script>

<div class="landing">
  <header class="landing-top">
    <a class="brand" href="#/"><span class="brand-mark" aria-hidden="true"></span>Rétro Twitch</a>
    <LangSwitch />
  </header>

  <main class="legal">
    <p><a href="#/">{t('Back to the site')}</a></p>
    {#if kind === 'legal'}
      <h1>{t('Legal notice')}</h1>
      {#if fr}
        <h2>Éditeur</h2>
        <p>
          Ce site est édité par Thibault Fayard, particulier, à titre non professionnel. Comme la loi pour la
          confiance dans l'économie numérique (LCEN) le permet à un éditeur non professionnel, son adresse et son
          numéro de téléphone ne sont pas publiés : ses éléments d'identification ont été communiqués à Vercel Inc.,
          qui héberge le site (voir « Hébergement »).
        </p>
        <p>Directeur de la publication : Thibault Fayard. Contact : <a href="mailto:{MAIL}">{MAIL}</a></p>
        <h2>Hébergement</h2>
        <p>
          Le site et son petit serveur d'images sont hébergés par Vercel Inc., 440 N Barranca Ave #4133, Covina,
          CA 91723, États-Unis (<a href="https://vercel.com" target="_blank" rel="noreferrer">vercel.com</a>).
        </p>
        <h2>Marques et données</h2>
        <p>
          Ce site n'est affilié ni à Twitch ni à 7TV, BetterTTV ou FrankerFaceZ, et n'est pas approuvé par eux.
          Twitch est une marque de Twitch Interactive, Inc. Les avatars, jaquettes, badges et emotes affichés
          appartiennent à leurs auteurs et sont chargés depuis les services publics de ces plateformes.
        </p>
        <h2>Données personnelles</h2>
        <p>Ce que le site fait de vos données est décrit dans la <a href="#/privacy">politique de confidentialité</a>.</p>
      {:else}
        <p>This text exists in French and English. If they differ, the French version prevails.</p>
        <h2>Publisher</h2>
        <p>
          This site is published by Thibault Fayard, a private individual acting in a non-professional capacity.
          The French law on confidence in the digital economy (LCEN) allows a non-professional publisher not to
          publish their address and phone number: the publisher's identification details have been given to
          Vercel Inc., which hosts the site (see "Hosting").
        </p>
        <p>Publication director: Thibault Fayard. Contact: <a href="mailto:{MAIL}">{MAIL}</a></p>
        <h2>Hosting</h2>
        <p>
          The site and its small image server are hosted by Vercel Inc., 440 N Barranca Ave #4133, Covina,
          CA 91723, United States (<a href="https://vercel.com" target="_blank" rel="noreferrer">vercel.com</a>).
        </p>
        <h2>Trademarks and data</h2>
        <p>
          This site is not affiliated with or endorsed by Twitch, 7TV, BetterTTV or FrankerFaceZ. Twitch is a
          trademark of Twitch Interactive, Inc. The avatars, box art, badges and emotes shown belong to their
          creators and are loaded from these platforms' public services.
        </p>
        <h2>Personal data</h2>
        <p>What the site does with your data is described in the <a href="#/privacy">privacy policy</a>.</p>
      {/if}
    {:else}
      <h1>{t('Privacy')}</h1>
      {#if fr}
        <p>
          Responsable : Thibault Fayard (voir les <a href="#/legal">mentions légales</a>). Contact :
          <a href="mailto:{MAIL}">{MAIL}</a>. Le site n'a pas de compte, pas de cookie, pas de mesure d'audience
          et pas de publicité.
        </p>
        <h2>Votre export Twitch</h2>
        <p>
          Le zip est lu dans votre navigateur et n'est envoyé à aucun serveur. Seuls les fichiers utiles sont
          ouverts : heures regardées, lectures de vidéos, messages du chat, follows, subs, bits, pubs (date et
          chaîne), vos lives et vos pseudos. Les IP, villes, appareils, navigateurs, pages vues, l'email et le
          téléphone qu'il contient ne sont jamais lus.
        </p>
        <h2>Ce qui reste sur votre appareil</h2>
        <p>
          Si la case « Garder l'export dans ce navigateur pendant 30 jours » est cochée (elle l'est par défaut), une copie du zip est
          gardée dans ce navigateur (IndexedDB) pendant 30 jours au plus ; « Changer d'export » l'efface. Vos
          réglages (langue, cases de l'accueil) sont gardés dans le stockage local du navigateur. Rien de tout cela
          ne quitte votre appareil.
        </p>
        <h2>Ce qui part vers notre serveur</h2>
        <p>
          Pour afficher les avatars, les jaquettes et les emotes, le site envoie à son propre serveur
          (<code>/api/enrich</code>, hébergé par Vercel) les identifiants des chaînes que vous avez regardées,
          suivies ou où vous avez écrit, les noms des jeux et les identifiants des VOD regardées. Ni heures, ni
          durées, ni messages. Le serveur demande ces informations publiques à Twitch, 7TV, BetterTTV et
          FrankerFaceZ en son nom, pas au vôtre, et n'enregistre rien. Décochez « Charger les avatars, jaquettes et
          emotes » sur l'accueil pour que rien ne parte.
        </p>
        <h2>Les images</h2>
        <p>
          Votre navigateur charge les images directement depuis les serveurs publics de Twitch
          (static-cdn.jtvnw.net), 7TV, BetterTTV et FrankerFaceZ, qui voient alors votre adresse IP comme pour
          n'importe quelle image. Pour la carte à partager, certaines images passent par notre relais
          (<code>/api/img</code>), qui ne garde rien.
        </p>
        <h2>Vercel</h2>
        <p>
          Comme tout hébergeur, Vercel reçoit l'adresse IP et le navigateur de chaque visite pour servir les pages
          et garde des journaux techniques pendant une durée courte. Vercel est situé aux États-Unis ; les
          transferts reposent sur les clauses contractuelles types de la Commission européenne.
        </p>
        <h2>Vos droits</h2>
        <p>
          Comme le site ne garde aucune donnée sur son serveur, il n'y a rien à effacer de notre côté : la copie
          locale s'efface avec « Changer d'export » ou en vidant les données du site dans votre navigateur. Pour
          toute question, écrivez à <a href="mailto:{MAIL}">{MAIL}</a>. Vous pouvez aussi saisir la CNIL
          (<a href="https://www.cnil.fr" target="_blank" rel="noreferrer">cnil.fr</a>).
        </p>
      {:else}
        <p>This text exists in French and English. If they differ, the French version prevails.</p>
        <p>
          Controller: Thibault Fayard (see the <a href="#/legal">legal notice</a>). Contact:
          <a href="mailto:{MAIL}">{MAIL}</a>. The site has no account, no cookie, no audience measurement and no
          advertising.
        </p>
        <h2>Your Twitch export</h2>
        <p>
          The zip is read in your browser and sent to no server. Only the useful files are opened: hours watched,
          video plays, chat messages, follows, subs, bits, ads (date and channel), your streams and your names.
          The IPs, cities, devices, browsers, page views, email and phone number it contains are never read.
        </p>
        <h2>What stays on your device</h2>
        <p>
          If the box "Keep the export in this browser for 30 days" is ticked (it is by default), a copy of the zip is kept in
          this browser (IndexedDB) for 30 days at most; "Change export" deletes it. Your settings (language, the
          landing page's boxes) are kept in the browser's local storage. None of this leaves your device.
        </p>
        <h2>What goes to our server</h2>
        <p>
          To show avatars, box art and emotes, the site sends its own server (<code>/api/enrich</code>, hosted by
          Vercel) the ids of the channels you watched, followed or chatted in, the names of the games and the ids
          of the VODs you watched. No times, durations or messages. The server asks Twitch, 7TV, BetterTTV and
          FrankerFaceZ for this public information in its own name, not yours, and records nothing. Untick "Load
          avatars, box art and emotes" on the landing page and nothing is sent.
        </p>
        <h2>Images</h2>
        <p>
          Your browser loads images directly from the public servers of Twitch (static-cdn.jtvnw.net), 7TV,
          BetterTTV and FrankerFaceZ, which then see your IP address as for any image. For the share card, some
          images go through our relay (<code>/api/img</code>), which keeps nothing.
        </p>
        <h2>Vercel</h2>
        <p>
          Like any host, Vercel receives the IP address and browser of each visit to serve the pages and keeps
          technical logs for a short time. Vercel is based in the United States; transfers rely on the European
          Commission's standard contractual clauses.
        </p>
        <h2>Your rights</h2>
        <p>
          As the site keeps no data on its server, there is nothing to delete on our side: the local copy is
          deleted with "Change export" or by clearing the site's data in your browser. For any question, write to
          <a href="mailto:{MAIL}">{MAIL}</a>. You can also contact the CNIL, the French data protection authority
          (<a href="https://www.cnil.fr" target="_blank" rel="noreferrer">cnil.fr</a>).
        </p>
      {/if}
    {/if}
  </main>
</div>
