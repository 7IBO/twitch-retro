<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { yearOfDay, yearOfTs } from '../lib/stats';
  import { h, n, day, date, plural } from '../lib/format';
  import Stat from '../components/Stat.svelte';
  import Bars from '../components/Bars.svelte';
  import BoxArt from '../components/BoxArt.svelte';
  import Meter from '../components/Meter.svelte';
  import Empty from '../components/Empty.svelte';

  const d = $derived(app.data!);
  const b = $derived(app.year === null ? d.broadcast : d.broadcast.filter((x) => yearOfDay(x.day) === app.year));
  const total = $derived(b.reduce((a, x) => a + x.min, 0));
  const days = $derived(new Set(b.map((x) => x.day)));
  const games = $derived.by(() => {
    const m = new Map<number, number>();
    for (const x of b) m.set(x.game, (m.get(x.game) ?? 0) + x.min);
    return [...m].sort((a, c) => c[1] - a[1]);
  });
  const perYear = $derived.by(() => {
    const m = new Map<number, number>();
    for (const x of d.broadcast) m.set(yearOfDay(x.day), (m.get(yearOfDay(x.day)) ?? 0) + x.min);
    const ys = [...m.keys()];
    const out = [];
    if (ys.length) for (let y = Math.min(...ys); y <= Math.max(...ys); y++) out.push({ label: String(y), value: m.get(y) ?? 0, mark: y === app.year, title: `${y} : ${h(m.get(y) ?? 0)} h` });
    return out;
  });
  const vods = $derived(app.year === null ? d.ownVods : d.ownVods.filter((v) => yearOfTs(v.ts) === app.year));
  const names = $derived(d.user.renames.length ? [d.user.renames[0].from, ...d.user.renames.map((r) => r.to)] : [d.user.login].filter(Boolean));
  const mins = (sec: number) => `${Math.floor(sec / 3600)} h ${String(Math.round((sec % 3600) / 60)).padStart(2, '0')}`;
</script>

<header class="page-head">
  <h1>Ma chaîne</h1>
  <p class="lead">Ton côté streamer : tes lives, tes VOD et tes pseudos.</p>
</header>

<div class="split">
  <section class="panel">
    <header class="panel-head"><h2>Tes pseudos</h2></header>
    {#if names.length}
      <ol class="timeline">
        {#each names as name, i (i)}
          <li>
            <span class="tl-name">{name}</span>
            <span class="tl-date">{i === 0 ? (Number.isFinite(d.user.start) ? `compte créé le ${date(d.user.start)}` : 'au début') : `depuis le ${date(d.user.renames[i - 1].ts)}`}</span>
          </li>
        {/each}
      </ol>
    {:else}
      <Empty text="Aucun changement de pseudo." />
    {/if}
  </section>

  <section class="panel">
    <header class="panel-head"><h2>Tes lives</h2></header>
    {#if total}
      <div class="stats two">
        <Stat value="{h(total)} h" label="En live" sub={plural(days.size, 'jour', 'jours')} />
        <Stat value={day(Math.min(...days))} label="Premier live" sub="dernier le {day(Math.max(...days))}" />
      </div>
      {#if perYear.length > 1}<Bars height={120} items={perYear} />{/if}
    {:else}
      <Empty text={app.year === null ? "Tu n'as jamais streamé d'après l'export." : `Aucun live en ${app.year}.`} />
    {/if}
  </section>
</div>

{#if games.length}
  <section class="panel">
    <header class="panel-head"><h2>Catégories streamées</h2></header>
    <ol class="rank">
      {#each games.slice(0, 10) as [g, m] (g)}
        <li>
          <BoxArt game={g} w={52} h={72} cls="thumb" />
          <span class="rank-name">{app.gameName(g)}</span>
          <Meter value={m} max={games[0][1]} />
          <span class="rank-val">{h(m)} h</span>
        </li>
      {/each}
    </ol>
  </section>
{/if}

{#if vods.length}
  <section class="panel flush">
    <header class="panel-head pad"><h2>Tes VOD</h2><span class="hint">{n(vods.length)}</span></header>
    <table class="table-plain">
      <thead><tr><th>Titre</th><th>Date</th><th>Durée</th><th>Catégorie</th></tr></thead>
      <tbody>
        {#each vods as v (v.id)}
          <tr>
            <td><a href="https://www.twitch.tv/videos/{v.id}" target="_blank" rel="noopener noreferrer">{v.title || 'Sans titre'}</a></td>
            <td>{date(v.ts)}</td>
            <td class="num">{mins(v.seconds)}</td>
            <td>{app.gameName(v.game)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <p class="note pad">Les liens marchent tant que Twitch garde la VOD.</p>
  </section>
{/if}
