<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { drawCard, canvasBlob, type CardData } from '../lib/card';
  import { analyseChat } from '../lib/words';
  import { h, n } from '../lib/format';
  import { availableYears } from '../lib/stats';

  let canvas: HTMLCanvasElement | undefined = $state();
  let format = $state<'post' | 'story'>('post');
  let busy = $state(false);
  let error = $state('');

  const s = $derived(app.stats!);
  const card = $derived.by((): CardData => {
    const ys = availableYears(app.data!);
    const a = app.emoteMap ? analyseChat(s.chat.msgs, app.data!.channels, app.emoteMap) : null;
    const top = a?.emotes[0];
    return {
      title: 'Ma rétro Twitch',
      period: app.year !== null ? String(app.year) : `${ys[0]} – ${ys[ys.length - 1]}`,
      login: app.data!.user.login,
      hours: h(s.totalMin),
      facts: [
        { value: n(s.channels.length), label: 'chaînes' },
        { value: n(s.activeDays), label: 'jours actifs' },
        { value: n(s.chat.msgs.length), label: 'messages' },
      ],
      streamers: s.channels.slice(0, 5).map((c) => ({ name: app.chName(c.ch), hours: h(c.min), avatar: app.user(c.ch)?.avatar })),
      games: s.games.slice(0, 3).map((g) => ({ name: app.gameName(g.game), hours: h(g.min), art: app.boxArt(g.game, 285, 380) })),
      emote: top ? { name: top.emote.name, url: top.emote.url.replace(/\/1(x|\.0)(\.webp)?$/, (m, a1, w) => (a1 === 'x' ? '/3x' + (w ?? '') : '/3.0')), count: n(top.n) } : undefined,
    };
  });

  $effect(() => {
    const c = canvas, d = card, f = format;
    if (!c) return;
    busy = true;
    drawCard(c, d, f).finally(() => (busy = false));
  });

  async function download() {
    error = '';
    try {
      const blob = await canvasBlob(canvas!);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `retro-twitch-${app.year ?? 'all-time'}-${format}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      error = "L'image n'a pas pu être exportée.";
    }
  }

  async function share() {
    error = '';
    try {
      const blob = await canvasBlob(canvas!);
      const file = new File([blob], 'retro-twitch.png', { type: 'image/png' });
      await navigator.share({ files: [file] });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') error = "Le partage n'est pas disponible ici, télécharge l'image.";
    }
  }
  const canShare = typeof navigator !== 'undefined' && 'canShare' in navigator;
</script>

<header class="page-head">
  <h1>Carte à partager</h1>
  <p class="lead">Une image générée dans ton navigateur, pour {app.year !== null ? app.year : 'tout ton historique'}. Change d'année en haut pour une autre carte.</p>
</header>

<div class="toolbar">
  <div class="seg" role="group" aria-label="Format">
    <button class:on={format === 'post'} onclick={() => (format = 'post')}>Post 4:5</button>
    <button class:on={format === 'story'} onclick={() => (format = 'story')}>Story 9:16</button>
  </div>
  <button class="btn primary" onclick={download} disabled={busy}>Télécharger le PNG</button>
  {#if canShare}<button class="btn" onclick={share} disabled={busy}>Partager</button>{/if}
</div>
{#if error}<p class="error">{error}</p>{/if}

<div class="card-preview" class:story={format === 'story'}>
  <canvas bind:this={canvas}></canvas>
</div>
