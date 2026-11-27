<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { followState, yearOfTs } from '../lib/stats';
  import { h, n, date } from '../lib/format';
  import Stat from '../components/Stat.svelte';
  import Bars from '../components/Bars.svelte';
  import Avatar from '../components/Avatar.svelte';
  import BoxArt from '../components/BoxArt.svelte';
  import Empty from '../components/Empty.svelte';

  const d = $derived(app.data!);
  const s = $derived(app.stats!);
  const fstate = $derived(followState(d));
  const watched = $derived.by(() => {
    const m = new Map<number, number>();
    for (const w of d.watch) m.set(w.ch, (m.get(w.ch) ?? 0) + w.min);
    return m;
  });
  const stillFollowing = $derived([...fstate.values()].filter((x) => x.following).length);
  const neverWatched = $derived([...fstate].filter(([ch, x]) => x.following && !watched.get(ch)).length);

  let filter = $state<'all' | 'on' | 'off'>('all');
  let q = $state('');
  let limit = $state(100);
  const rows = $derived.by(() => {
    const query = q.trim().toLowerCase();
    return [...s.follows]
      .reverse()
      .filter((f) => {
        const st = fstate.get(f.ch);
        if (filter === 'on' && !st?.following) return false;
        if (filter === 'off' && st?.following) return false;
        return !query || app.chName(f.ch).toLowerCase().includes(query) || d.channels[f.ch].name.includes(query);
      });
  });
  const perYear = $derived.by(() => {
    const m = new Map<number, number>();
    for (const f of d.follows) if (!f.unfollow) m.set(yearOfTs(f.ts), (m.get(yearOfTs(f.ts)) ?? 0) + 1);
    const ys = [...m.keys()];
    const out = [];
    if (ys.length) for (let y = Math.min(...ys); y <= Math.max(...ys); y++) out.push({ label: String(y), value: m.get(y) ?? 0, mark: y === app.year });
    return out;
  });
</script>

<header class="page-head">
  <h1>Follows</h1>
  <p class="lead">Les chaînes que tu as suivies{app.year !== null ? ` en ${app.year}` : ''}, et celles que tu suivais encore à la date de l'export.</p>
</header>

{#if !d.follows.length}
  <Empty text="Ton export ne contient aucun follow." />
{:else}
  <div class="stats four">
    <Stat value={n(s.follows.length)} label="Follows" sub={app.year !== null ? `en ${app.year}` : ''} />
    <Stat value={n(s.unfollows)} label="Unfollows" />
    <Stat value={n(stillFollowing)} label="Suivies à la fin de l'export" />
    <Stat value={n(neverWatched)} label="Suivies sans jamais les regarder" sub="d'après l'historique de visionnage" />
  </div>

  {#if perYear.length > 1}
    <section class="panel">
      <header class="panel-head"><h2>Follows par année</h2></header>
      <Bars height={160} items={perYear} unit=" follows" />
    </section>
  {/if}

  <div class="toolbar">
    <input class="search" type="search" placeholder="Chercher" bind:value={q} aria-label="Chercher une chaîne" />
    <div class="seg" role="group" aria-label="Filtrer">
      <button class:on={filter === 'all'} onclick={() => (filter = 'all')}>Tous</button>
      <button class:on={filter === 'on'} onclick={() => (filter = 'on')}>Encore suivies</button>
      <button class:on={filter === 'off'} onclick={() => (filter = 'off')}>Plus suivies</button>
    </div>
  </div>

  <section class="panel flush">
    {#if rows.length}
      <ol class="rank table">
        {#each rows.slice(0, limit) as f, i (i)}
          {@const st = fstate.get(f.ch)}
          <li>
            <Avatar ch={f.ch} size={32} />
            <span class="rank-main">
              <a class="rank-name" href="#/streamers/{f.ch}">{app.chName(f.ch)}</a>
              <span class="rank-meta">suivie le {date(f.ts)}{st && !st.following ? ' · plus suivie' : ''}</span>
            </span>
            <span class="rank-val">{watched.get(f.ch) ? `${h(watched.get(f.ch)!)} h` : 'jamais regardée'}</span>
          </li>
        {/each}
      </ol>
    {:else}
      <Empty text="Aucun follow ne correspond." />
    {/if}
  </section>
  {#if rows.length > limit}
    <button class="btn" onclick={() => (limit += 200)}>Afficher plus ({n(rows.length - limit)} restants)</button>
  {/if}

  {#if d.gameFollows.length}
    <section class="panel">
      <header class="panel-head"><h2>Catégories suivies</h2></header>
      <div class="covers">
        {#each d.gameFollows as g, i (i)}
          <a class="cover" href="#/categories/{g.game}">
            <BoxArt game={g.game} w={144} h={192} />
            <span class="cover-name">{app.gameName(g.game)}</span>
            <span class="cover-meta">{date(g.ts)}</span>
          </a>
        {/each}
      </div>
    </section>
  {/if}
{/if}
