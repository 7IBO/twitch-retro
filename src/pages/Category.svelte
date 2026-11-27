<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { t } from '../lib/i18n/index.svelte';
  import { gameDetail } from '../lib/stats';
  import { timeline, dayMinOf, DAY } from '../lib/stats';
  import { h, n, plural, dur } from '../lib/format';
  import BoxArt from '../components/BoxArt.svelte';
  import Bars from '../components/Bars.svelte';
  import Avatar from '../components/Avatar.svelte';
  import Meter from '../components/Meter.svelte';
  import Empty from '../components/Empty.svelte';

  let { game }: { game: number } = $props();
  const tl = $derived(app.data ? timeline(dayMinOf(app.data, (w) => w.game === game), { endDay: Math.floor(app.data.user.end / DAY), year: null, fmt: dur }) : null);
  const det = $derived(app.data?.games[game] ? gameDetail(app.data, game, app.year, app.month) : null);
  let limit = $state(50);
</script>

{#if !det}
  <Empty text={t('Category not found.')} />
{:else}
  <a class="back" href="#/categories">← {t('Categories')}</a>
  <header class="profile">
    <BoxArt {game} w={144} h={192} cls="profile-art" />
    <div>
      <h1>{app.gameName(game)}</h1>
      <p class="lead">{dur(det.min)}{app.periodEn}, {t('with {n}', { n: plural(det.channels.length, 'streamer', 'streamers') })}</p>
      <a class="btn small profile-share" href="#/partager/categories/{app.slug(app.data!.games[game].name)}">{t('Make a card to share')}</a>
    </div>
  </header>

  <section class="panel">
    <header class="panel-head"><h2>{t(tl?.unit === 'day' ? 'Hours per day' : tl?.unit === 'month' ? 'Hours per month' : 'Hours per year')}</h2></header>
    <Bars height={180} items={(tl?.items ?? []).map((it) => ({ ...it, mark: tl?.unit === 'year' && app.year !== null && parseInt(it.label) === app.year }))} />
    {#if tl?.partial}<p class="chart-note">{tl.partial}</p>{/if}
  </section>

  <section class="panel flush">
    <header class="panel-head pad"><h2>{t('Who streamed it')}</h2></header>
    {#if det.channels.length}
      <ol class="rank table">
        {#each det.channels.slice(0, limit) as c, i (c.ch)}
          <li>
            <span class="rank-n">{i + 1}</span>
            <Avatar ch={c.ch} size={32} />
            <a class="rank-name" href={app.chHref(c.ch)}>{app.chName(c.ch)}</a>
            <Meter value={c.min} max={det.channels[0].min} />
            <span class="rank-val">{dur(c.min)}</span>
          </li>
        {/each}
      </ol>
    {:else}
      <Empty text={t('Nothing in this category for this period.')} />
    {/if}
  </section>
  {#if det.channels.length > limit}
    <button class="btn" onclick={() => (limit += 100)}>{t('Show more ({n} left)', { n: n(det.channels.length - limit) })}</button>
  {/if}
{/if}
