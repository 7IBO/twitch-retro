<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { t } from '../lib/i18n/index.svelte';
  import { h, n, plural, dur } from '../lib/format';
  import BoxArt from '../components/BoxArt.svelte';
  import Meter from '../components/Meter.svelte';
  import Empty from '../components/Empty.svelte';

  const s = $derived(app.stats!);
  let q = $state('');
  let limit = $state(50);
  const rows = $derived.by(() => {
    const ranked = s.games.map((g, i) => ({ ...g, rank: i + 1 }));
    const query = q.trim().toLowerCase();
    return query ? ranked.filter((g) => app.gameName(g.game).toLowerCase().includes(query)) : ranked;
  });
  const max = $derived(s.games[0]?.min ?? 1);
</script>

<header class="page-head">
  <h1>{t('Catégories')}</h1>
  <p class="lead">{t('{n} catégories', { n: n(s.games.length) })}{app.periodEn}.</p>
</header>

{#if !s.games.length}
  <Empty text={t('Aucune catégorie sur cette période.')} />
{:else}
  {#if !q}
    <div class="covers big">
      {#each s.games.slice(0, 12) as g, i (g.game)}
        <a class="cover" href={app.gameHref(g.game)}>
          <BoxArt game={g.game} w={285} h={380} />
          <span class="cover-name">{i + 1}. {app.gameName(g.game)}</span>
          <span class="cover-meta">{dur(g.min)} · {plural(g.channels, 'chaîne', 'chaînes')}</span>
          {#if g.topCh >= 0}<span class="cover-meta">{t('surtout chez {name}', { name: app.chName(g.topCh) })}</span>{/if}
        </a>
      {/each}
    </div>
  {/if}

  <div class="toolbar">
    <input class="search" type="search" placeholder={t('Chercher')} bind:value={q} aria-label={t('Chercher une catégorie')} />
  </div>
  <section class="panel flush">
    <ol class="rank table">
      {#each rows.slice(q ? 0 : 12, limit) as g (g.game)}
        <li>
          <span class="rank-n">{g.rank}</span>
          <BoxArt game={g.game} w={52} h={72} cls="thumb" />
          <span class="rank-main">
            <a class="rank-name" href={app.gameHref(g.game)}>{app.gameName(g.game)}</a>
            <span class="rank-meta">{plural(g.channels, 'chaîne', 'chaînes')}{g.topCh >= 0 ? ` · ${t('surtout {name}', { name: app.chName(g.topCh) })}` : ''}</span>
          </span>
          <Meter value={g.min} {max} />
          <span class="rank-val">{dur(g.min)}</span>
        </li>
      {/each}
    </ol>
  </section>
  {#if rows.length > limit}
    <button class="btn" onclick={() => (limit += 200)}>{t('Afficher plus ({n} restantes)', { n: n(rows.length - limit) })}</button>
  {/if}
{/if}
