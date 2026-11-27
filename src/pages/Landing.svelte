<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { Upload, Lock, ImageIcon, Clock } from '@lucide/svelte';

  let over = $state(false);
  let input: HTMLInputElement | undefined = $state();

  function pick(f?: File | null) {
    if (f) void app.load(f);
  }
  // Fictional sample, only to show what the page looks like.
  const sample = [
    { y: '2019', v: 24 }, { y: '2020', v: 52 }, { y: '2021', v: 61 }, { y: '2022', v: 88 },
    { y: '2023', v: 100 }, { y: '2024', v: 79 }, { y: '2025', v: 70 },
  ];
  const rows = [
    { n: 'nuitblanche', h: '1 912', w: 100 },
    { n: 'lavande_tv', h: '1 240', w: 65 },
    { n: 'pixelgratin', h: '866', w: 45 },
  ];
</script>

<div class="landing">
  <header class="landing-top">
    <div class="brand"><span class="brand-mark" aria-hidden="true"></span>Rétro Twitch</div>
  </header>

  <main class="hero">
    <div class="hero-text">
      <h1>Toutes tes années Twitch, depuis ton premier stream</h1>
      <p class="lead">Dépose l'export de données que Twitch t'envoie. Tu retrouves tes heures, tes streamers, tes catégories, ton chat et tes emotes, année par année.</p>

      {#if app.loading}
        <div class="drop busy" aria-live="polite"><span>Lecture de ton export</span><span class="progress" aria-hidden="true"><span></span></span></div>
      {:else}
        <button
          class="drop"
          class:over
          onclick={() => input?.click()}
          ondragover={(e) => { e.preventDefault(); over = true; }}
          ondragleave={() => (over = false)}
          ondrop={(e) => { e.preventDefault(); over = false; pick(e.dataTransfer?.files[0]); }}
        >
          <Upload size={18} strokeWidth={1.5} />
          <span><strong>Choisir le fichier .zip</strong> ou le glisser ici</span>
        </button>
        <input bind:this={input} type="file" accept=".zip,application/zip" hidden onchange={(e) => pick(e.currentTarget.files?.[0])} />
      {/if}
      {#if app.error}<p class="error">{app.error}</p>{/if}

      <label class="toggle">
        <input type="checkbox" checked={!app.offline} onchange={(e) => app.setOffline(!e.currentTarget.checked)} />
        <span>Charger les avatars, jaquettes et emotes</span>
      </label>
      <label class="toggle">
        <input type="checkbox" checked={app.remember} onchange={(e) => app.setRemember(e.currentTarget.checked)} />
        <span>Garder l'export dans ce navigateur pendant 30 jours, pour le retrouver sans le redéposer</span>
      </label>

      <ul class="facts-list">
        <li><Lock size={16} strokeWidth={1.5} /><span>Le zip est lu dans ton navigateur et n'est envoyé nulle part. Les IP, villes, appareils et pages vues qu'il contient ne sont jamais ouverts.</span></li>
        <li><ImageIcon size={16} strokeWidth={1.5} /><span>Pour les images, seuls les identifiants de tes chaînes et les noms de tes jeux partent vers notre serveur, qui interroge Twitch, 7TV, BTTV et FFZ sans rien garder. Décoche la case pour tout garder chez toi.</span></li>
        <li><Clock size={16} strokeWidth={1.5} /><span>Pas encore d'export ? Demande-le dans <a href="https://www.twitch.tv/settings/security" target="_blank" rel="noopener noreferrer">Paramètres › Sécurité et confidentialité</a>, « Télécharger vos données ». Twitch peut mettre plusieurs semaines, et l'export s'arrête au jour de ta demande.</span></li>
      </ul>
    </div>

    <figure class="hero-preview" aria-label="Exemple de résultat avec des données fictives">
      <div class="pv-window">
        <div class="pv-head"><span>Aperçu</span><span class="pv-years">Tout · 2023 · 2024 · 2025</span></div>
        <div class="pv-figure"><span class="pv-big">7 412</span> heures regardées</div>
        <div class="pv-bars">
          {#each sample as s (s.y)}
            <span class="pv-bar" class:hi={s.v === 100} style:height="{s.v}%"><i>{s.y}</i></span>
          {/each}
        </div>
        <ol class="pv-rows">
          {#each rows as r, i (r.n)}
            <li><span class="pv-n">{i + 1}</span><span class="pv-av" style:--h={i * 110 + 20}></span><span class="pv-name">{r.n}</span><span class="pv-meter"><span style:width="{r.w}%"></span></span><span class="pv-h">{r.h} h</span></li>
          {/each}
        </ol>
      </div>
      <figcaption>Exemple avec des données fictives</figcaption>
    </figure>
  </main>
</div>
