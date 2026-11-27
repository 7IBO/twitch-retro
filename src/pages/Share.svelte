<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { t } from '../lib/i18n/index.svelte';
  import { slide } from '../lib/slide';
  import { drawCard, canvasBlob, type CardData } from '../lib/card';
  import { analyseChat } from '../lib/words';
  import { h, n, dur, day, plural, pc, share as sharePct } from '../lib/format';
  import { availableYears, compute, channelDetail, gameDetail } from '../lib/stats';

  let { target }: { target?: { kind: 'streamer' | 'category'; key: string } } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let format = $state<'post' | 'story'>('post');
  let busy = $state(false);
  let error = $state('');

  const s = $derived(app.stats!);
  const d = $derived(app.data!);
  const big = (min: number) => (min < 60 ? { big: String(Math.max(1, Math.round(min))), unit: t('minutes') } : { big: h(min), unit: t('hours') });
  const big3x = (url: string) => url.replace(/\/1(x|\.0)(\.webp)?$/, (_m, a1, w) => (a1 === 'x' ? '/3x' + (w ?? '') : '/3.0'));
  const yearSpan = (ys: number[]) => (ys.length ? (ys[0] === ys[ys.length - 1] ? String(ys[0]) : `${ys[0]} – ${ys[ys.length - 1]}`) : '');
  const topEmote = (msgs: typeof d.chat) => {
    const e = app.emoteMap ? analyseChat(msgs, d.channels, app.emoteMap, app.knownEmotes).emotes[0] : undefined;
    return e ? { name: e.emote.name, url: big3x(e.emote.url), count: n(e.n) } : undefined;
  };
  const stories = $derived(format === 'story' ? 7 : 5);

  const ch = $derived(target?.kind === 'streamer' ? app.resolveCh(target.key) : -1);
  const game = $derived(target?.kind === 'category' ? app.resolveGame(target.key) : -1);

  const card = $derived.by((): CardData | null => {
    if (target?.kind === 'streamer') {
      if (ch < 0) return null;
      const all = compute(d, null);
      const rank = all.channels.findIndex((c) => c.ch === ch) + 1;
      const det = channelDetail(d, ch, rank);
      const ys = det.byYear.filter((y) => y.min > 0).map((y) => y.year);
      return {
        title: t('My Twitch retro'),
        period: yearSpan(ys),
        hero: { name: app.chName(ch), img: app.user(ch)?.avatar, shape: 'circle', caption: rank ? t('#{rank} of my {n} streamers', { rank, n: n(all.channels.length) }) : t('Streamer') },
        ...big(det.min),
        subline: t('together, since {date}', { date: day(det.first) }),
        facts: [
          { value: n(det.days), label: t('days together') },
          { value: n(det.chat), label: t('messages sent') },
          { value: pc(sharePct(det.min, all.totalMin)), label: t('of my time') },
        ],
        lists: [
          { title: t('What I watched'), items: det.games.slice(0, 3).map((g) => ({ name: app.gameName(g.game), value: dur(g.min), img: app.boxArt(g.game, 285, 380), shape: 'cover' as const })) },
          { title: t('Per year'), items: [...det.byYear].filter((y) => y.min > 0).reverse().slice(0, stories).map((y) => ({ name: String(y.year), value: dur(y.min), shape: 'none' as const })) },
        ],
        emote: topEmote(d.chat.filter((m) => m.ch === ch)),
      };
    }
    if (target?.kind === 'category') {
      if (game < 0) return null;
      const all = compute(d, null);
      const rank = all.games.findIndex((g) => g.game === game) + 1;
      const det = gameDetail(d, game, null);
      const ys = det.byYear.filter((y) => y.min > 0).map((y) => y.year);
      return {
        title: t('My Twitch retro'),
        period: yearSpan(ys),
        hero: { name: app.gameName(game), img: app.boxArt(game, 285, 380), shape: 'cover', caption: rank ? t('#{rank} of my {n} categories', { rank, n: n(all.games.length) }) : t('Category') },
        ...big(det.min),
        subline: t('with {n}', { n: plural(det.channels.length, 'streamer', 'streamers') }),
        facts: [
          { value: n(det.channels.length), label: t('streamers') },
          { value: String(ys[0] ?? '—'), label: t('first year') },
          { value: pc(sharePct(det.min, all.totalMin)), label: t('of my time') },
        ],
        lists: [
          { title: t('With whom'), items: det.channels.slice(0, stories).map((c) => ({ name: app.chName(c.ch), value: dur(c.min), img: app.user(c.ch)?.avatar, shape: 'circle' as const })) },
          { title: t('Per year'), items: [...det.byYear].filter((y) => y.min > 0).reverse().slice(0, stories).map((y) => ({ name: String(y.year), value: dur(y.min), shape: 'none' as const })) },
        ],
      };
    }
    const ys = availableYears(d);
    return {
      title: t('My Twitch retro'),
      period: app.periodName ?? yearSpan(ys),
      ...big(s.totalMin),
      subline: d.user.login ? t('watched by {name}', { name: d.user.displayNames?.[d.user.login.toLowerCase()] ?? d.user.login }) : t('watched on Twitch'),
      facts: [
        { value: n(s.channels.length), label: t('channels') },
        { value: n(s.activeDays), label: t('active days') },
        { value: n(s.chat.msgs.length), label: t('messages') },
      ],
      lists: [
        { title: t('Streamers'), items: s.channels.slice(0, stories).map((c) => ({ name: app.chName(c.ch), value: dur(c.min), img: app.user(c.ch)?.avatar, shape: 'circle' as const })) },
        { title: t('Categories'), items: s.games.slice(0, format === 'story' ? 5 : 3).map((g) => ({ name: app.gameName(g.game), value: dur(g.min), img: app.boxArt(g.game, 285, 380), shape: 'cover' as const })) },
      ],
      emote: topEmote(s.chat.msgs),
    };
  });

  const fileName = $derived(
    `retro-twitch-${target ? app.slug(target.key) : (app.periodName ? app.slug(app.periodName) : 'all-time')}-${format}.png`,
  );

  $effect(() => {
    const c = canvas, data = card, f = format;
    if (!c || !data) return;
    busy = true;
    drawCard(c, data, f).finally(() => (busy = false));
  });

  async function download() {
    error = '';
    try {
      const blob = await canvasBlob(canvas!);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      error = t('The image could not be exported.');
    }
  }

  async function share() {
    error = '';
    try {
      const blob = await canvasBlob(canvas!);
      const file = new File([blob], 'retro-twitch.png', { type: 'image/png' });
      await navigator.share({ files: [file] });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') error = t("Sharing isn't available here, download the image instead.");
    }
  }
  const canShare = typeof navigator !== 'undefined' && 'canShare' in navigator;
</script>

<header class="page-head">
  <h1>{t('Card to share')}</h1>
  {#if target?.kind === 'streamer'}
    <p class="lead">{t('Your card with {name}, over your whole history.', { name: ch >= 0 ? app.chName(ch) : t('this streamer') })} <a class="more" href="#/partager">{t('Back to your overall card')}</a></p>
  {:else if target?.kind === 'category'}
    <p class="lead">{t('Your {name} card, over your whole history.', { name: game >= 0 ? app.gameName(game) : '' })} <a class="more" href="#/partager">{t('Back to your overall card')}</a></p>
  {:else}
    <p class="lead">{t("An image made in your browser, for {period}. Change the period at the top, or open a streamer's or a category's page for its card.", { period: app.periodName ?? t('your whole history') })}</p>
  {/if}
</header>
{#if target && !card}<p class="error">{t('Nothing to show for this card.')}</p>{/if}

<div class="toolbar">
  <div class="seg" role="group" aria-label="Format" use:slide>
    <button class:on={format === 'post'} onclick={() => (format = 'post')}>Post 4:5</button>
    <button class:on={format === 'story'} onclick={() => (format = 'story')}>Story 9:16</button>
  </div>
  <button class="btn primary" onclick={download} disabled={busy}>{t('Download PNG')}</button>
  {#if canShare}<button class="btn" onclick={share} disabled={busy}>{t('Share')}</button>{/if}
</div>
{#if error}<p class="error">{error}</p>{/if}

<div class="card-preview" class:story={format === 'story'}>
  <canvas bind:this={canvas}></canvas>
</div>
