<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { gameDetail } from '../lib/stats';
  import { h, n, plural, dur } from '../lib/format';
  import BoxArt from '../components/BoxArt.svelte';
  import Bars from '../components/Bars.svelte';
  import Avatar from '../components/Avatar.svelte';
  import Meter from '../components/Meter.svelte';
  import Empty from '../components/Empty.svelte';

  let { game }: { game: number } = $props();
  const det = $derived(app.data?.games[game] ? gameDetail(app.data, game, app.year) : null);
  let limit = $state(50);
</script>

{#if !det}
  <Empty text="Catégorie introuvable." />
{:else}
  <a class="back" href="#/categories">← Catégories</a>
  <header class="profile">
    <BoxArt {game} w={144} h={192} cls="profile-art" />
    <div>
      <h1>{app.gameName(game)}</h1>
      <p class="lead">{dur(det.min)}{app.year !== null ? ` en ${app.year}` : ''}, chez {plural(det.channels.length, 'streamer', 'streamers')}</p>
      <a class="btn small profile-share" href="#/partager/categories/{app.slug(app.data!.games[game].name)}">Créer sa carte à partager</a>
    </div>
  </header>

  <section class="panel">
    <header class="panel-head"><h2>Heures par année</h2></header>
    <Bars height={180} items={det.byYear.map((y) => ({ label: String(y.year), value: y.min, mark: y.year === app.year, title: `${y.year} : ${dur(y.min)}` }))} />
  </section>

  <section class="panel flush">
    <header class="panel-head pad"><h2>Les streamers</h2></header>
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
      <Empty text="Rien dans cette catégorie sur cette période." />
    {/if}
  </section>
  {#if det.channels.length > limit}
    <button class="btn" onclick={() => (limit += 100)}>Afficher plus ({n(det.channels.length - limit)} restants)</button>
  {/if}
{/if}
