<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { availableYears, yearOfDay, localDay } from '../lib/stats';
  import { h, n, day as fmtDay } from '../lib/format';
  import Heatmap from '../components/Heatmap.svelte';
  import Avatar from '../components/Avatar.svelte';

  const s = $derived(app.stats!);
  const years = $derived(app.year !== null ? [app.year] : availableYears(app.data!).filter((y) => [...s.dayMin.keys()].some((d) => yearOfDay(d) === y)).reverse());
  let picked = $state<number | null>(null);

  const detail = $derived.by(() => {
    if (picked === null) return null;
    const chs = new Map<number, { min: number; games: Set<number> }>();
    for (const w of app.data!.watch) {
      if (w.day !== picked) continue;
      const e = chs.get(w.ch) ?? { min: 0, games: new Set<number>() };
      e.min += w.min;
      if (w.game >= 0) e.games.add(w.game);
      chs.set(w.ch, e);
    }
    const msgs = app.data!.chat.filter((m) => localDay(m.ts) === picked).length;
    return { day: picked, msgs, chs: [...chs.entries()].sort((a, b) => b[1].min - a[1].min) };
  });
</script>

<header class="page-head">
  <h1>Calendrier</h1>
  <p class="lead">Une case par jour, plus elle est claire plus tu as regardé. Clique un jour pour le détail.</p>
</header>

<div class="legend-row">
  <span>Moins</span>
  {#each [0, 1, 2, 3, 4] as l (l)}<span class="hm-key l{l}"></span>{/each}
  <span>Plus</span>
  <span class="muted">(rien · moins d'1 h · 1 à 3 h · 3 à 6 h · plus de 6 h)</span>
</div>

<div class="calendar-layout">
  <div class="calendar-years">
    {#each years as y (y)}
      <section class="panel">
        <header class="panel-head">
          <h2>{y}</h2>
          <span class="hint">{h([...s.dayMin].filter(([d]) => yearOfDay(d) === y).reduce((a, [, m]) => a + m, 0))} h</span>
        </header>
        <Heatmap year={y} dayMin={s.dayMin} selected={picked} onpick={(d) => (picked = d)} />
      </section>
    {/each}
  </div>

  {#if detail}
    <aside class="panel day-detail">
      <header class="panel-head">
        <h2>{fmtDay(detail.day)}</h2>
        <button class="icon-btn" onclick={() => (picked = null)} aria-label="Fermer">×</button>
      </header>
      <p class="muted">{h(s.dayMin.get(detail.day) ?? 0)} h regardées{detail.msgs ? `, ${n(detail.msgs)} messages envoyés` : ''}</p>
      <ol class="rank">
        {#each detail.chs as [ch, e] (ch)}
          <li>
            <Avatar {ch} size={28} />
            <span class="rank-main">
              <a class="rank-name" href="#/streamers/{ch}">{app.chName(ch)}</a>
              <span class="rank-meta">{[...e.games].map((g) => app.gameName(g)).join(', ')}</span>
            </span>
            <span class="rank-val">{h(e.min)} h</span>
          </li>
        {/each}
      </ol>
    </aside>
  {/if}
</div>
