<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { slide } from '../lib/slide';
  import { h, n, day, dur } from '../lib/format';
  import Avatar from '../components/Avatar.svelte';
  import Meter from '../components/Meter.svelte';
  import Empty from '../components/Empty.svelte';

  const s = $derived(app.stats!);
  let q = $state('');
  let sort = $state<'min' | 'days' | 'first' | 'last'>('min');
  let limit = $state(50);
  let vodLimit = $state(15);
  let vodOnline = $state(false);
  const onlineCount = $derived(s.watchedVods.filter((v) => app.enrich?.vods?.[v.id]).length);
  const vodRows = $derived(vodOnline ? s.watchedVods.filter((v) => app.enrich?.vods?.[v.id]) : s.watchedVods);

  const rows = $derived.by(() => {
    const ranked = s.channels.map((c, i) => ({ ...c, rank: i + 1 }));
    const query = q.trim().toLowerCase();
    let list = query
      ? ranked.filter((c) => {
          const ch = app.data!.channels[c.ch];
          return [app.chName(c.ch), ch.name, ...app.oldNames(c.ch)].some((x) => x.toLowerCase().includes(query));
        })
      : ranked;
    if (sort === 'days') list = [...list].sort((a, b) => b.days - a.days);
    else if (sort === 'first') list = [...list].sort((a, b) => a.first - b.first);
    else if (sort === 'last') list = [...list].sort((a, b) => b.last - a.last);
    return list;
  });
  const max = $derived(s.channels[0]?.min ?? 1);
</script>

<header class="page-head">
  <h1>Streamers</h1>
  <p class="lead">{n(s.channels.length)} chaînes regardées{app.year !== null ? ` en ${app.year}` : ''}. Les changements de pseudo sont regroupés.</p>
</header>

<div class="toolbar">
  <input class="search" type="search" placeholder="Chercher" bind:value={q} aria-label="Chercher un streamer" />
  <div class="seg" role="group" aria-label="Trier" use:slide>
    <button class:on={sort === 'min'} onclick={() => (sort = 'min')}>Heures</button>
    <button class:on={sort === 'days'} onclick={() => (sort = 'days')}>Jours</button>
    <button class:on={sort === 'first'} onclick={() => (sort = 'first')}>Plus anciens</button>
    <button class:on={sort === 'last'} onclick={() => (sort = 'last')}>Plus récents</button>
  </div>
</div>

{#if !rows.length}
  <Empty text="Aucun streamer ne correspond." />
{:else}
  <section class="panel flush">
    <ol class="rank table">
      {#each rows.slice(0, limit) as c (c.ch)}
        {@const old = app.oldNames(c.ch)}
        <li>
          <span class="rank-n">{c.rank}</span>
          <Avatar ch={c.ch} size={36} />
          <span class="rank-main">
            <a class="rank-name" href={app.chHref(c.ch)}>{app.chName(c.ch)}</a>
            <span class="rank-meta">
              {day(c.first)} → {day(c.last)}{c.topGame >= 0 ? ` · ${app.gameName(c.topGame)}` : ''}{old.length ? ` · ex ${old.join(', ')}` : ''}
            </span>
          </span>
          <Meter value={c.min} {max} />
          <span class="rank-val">{dur(c.min)}<small>{n(c.days)} j</small></span>
        </li>
      {/each}
    </ol>
  </section>
  {#if rows.length > limit}
    <button class="btn" onclick={() => (limit += 200)}>Afficher plus ({n(rows.length - limit)} restants)</button>
  {/if}
{/if}

{#if s.watchedVods.length && !q}
  <section class="panel flush">
    <header class="panel-head pad">
      <h2>Rediffusions les plus regardées</h2>
      <div class="seg" role="group" aria-label="Filtrer les rediffusions" use:slide>
        <button class:on={!vodOnline} onclick={() => ((vodOnline = false), (vodLimit = 15))}>Toutes ({n(s.watchedVods.length)})</button>
        <button class:on={vodOnline} onclick={() => ((vodOnline = true), (vodLimit = 15))}>Encore en ligne ({n(onlineCount)})</button>
      </div>
    </header>
    <ol class="rank table">
      {#each vodRows.slice(0, vodLimit) as v (v.id)}
        {@const i = s.watchedVods.indexOf(v)}
        {@const info = app.enrich?.vods?.[v.id]}
        <li>
          <span class="rank-n">{i + 1}</span>
          <Avatar ch={v.ch} size={28} />
          <span class="rank-main">
            {#if info}
              <a class="rank-name" href="https://www.twitch.tv/videos/{v.id}" target="_blank" rel="noopener noreferrer">{info.title || 'Sans titre'} ↗</a>
              <span class="rank-meta">{app.chName(v.ch)} · vue le {day(v.day)} · encore en ligne</span>
            {:else}
              <a class="rank-name" href={app.chHref(v.ch)}>VOD de {app.chName(v.ch)}</a>
              <span class="rank-meta">vue le {day(v.day)} · {app.enrich ? 'expirée ou supprimée sur Twitch, le lien mène à la fiche de la chaîne' : 'titre inconnu'}</span>
            {/if}
          </span>
          <span class="rank-val">{dur(v.min)}</span>
        </li>
      {/each}
    </ol>
  </section>
  {#if vodRows.length > vodLimit}
    <button class="btn" onclick={() => (vodLimit += 50)}>Afficher plus de rediffusions</button>
  {/if}
{/if}
