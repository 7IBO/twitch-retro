<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { Upload, Lock, ImageIcon, Clock } from '@lucide/svelte';
  import { t } from '../lib/i18n/index.svelte';
  import LangSwitch from '../components/LangSwitch.svelte';

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
    <div class="brand"><span class="brand-mark" aria-hidden="true"></span>Twitch Retro</div>
    <LangSwitch />
  </header>

  <main class="hero">
    <div class="hero-text">
      <h1>{t('All your Twitch years, since your very first stream')}</h1>
      <p class="lead">{t('Drop the data export Twitch sends you. Get back your hours, streamers, categories, chat and emotes, year by year.')}</p>

      {#if app.loading}
        <div class="drop busy" aria-live="polite"><span>{t('Reading your export')}</span><span class="progress" aria-hidden="true"><span></span></span></div>
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
          <span><strong>{t('Choose the .zip file')}</strong> {t('or drop it here')}</span>
        </button>
        <input bind:this={input} type="file" accept=".zip,application/zip" hidden onchange={(e) => pick(e.currentTarget.files?.[0])} />
      {/if}
      {#if app.error}<p class="error">{app.error}</p>{/if}

      <label class="toggle">
        <input type="checkbox" checked={!app.offline} onchange={(e) => app.setOffline(!e.currentTarget.checked)} />
        <span>{t('Load avatars, box art and emotes')}</span>
      </label>
      <label class="toggle">
        <input type="checkbox" checked={app.remember} onchange={(e) => app.setRemember(e.currentTarget.checked)} />
        <span>{t("Keep the export in this browser for 30 days, so you don't have to drop it again")}</span>
      </label>

      <ul class="facts-list">
        <li><Lock size={16} strokeWidth={1.5} /><span>{t('The zip is read in your browser and sent nowhere. The IPs, cities, devices and page views it contains are never opened.')}</span></li>
        <li><ImageIcon size={16} strokeWidth={1.5} /><span>{t("For images, only the ids of your channels and VODs and the names of your games go to our server, which asks Twitch, 7TV, BTTV and FFZ and keeps nothing. Untick the box to keep everything on your side.")}</span></li>
        <li><Clock size={16} strokeWidth={1.5} /><span>{t('No export yet? Request it in')} <a href="https://www.twitch.tv/settings/security" target="_blank" rel="noopener noreferrer">{t('Settings › Security and Privacy')}</a>{t(', “Download your data”. Twitch can take several weeks, and the export stops on the day you asked.')}</span></li>
      </ul>
    </div>

    <figure class="hero-preview" aria-label={t('Sample result with made-up data')}>
      <div class="pv-window">
        <div class="pv-head"><span>{t('Overview')}</span><span class="pv-years">{t('All')} · 2023 · 2024 · 2025</span></div>
        <div class="pv-figure"><span class="pv-big">7 412</span> {t('hours watched')}</div>
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
      <figcaption>{t('Sample with made-up data')}</figcaption>
    </figure>
  </main>

  <footer class="landing-foot">
    <a href="#/legal">{t('Legal notice')}</a>
    <a href="#/privacy">{t('Privacy')}</a>
    <span>{t('Not affiliated with Twitch.')}</span>
  </footer>
</div>
