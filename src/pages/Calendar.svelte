<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { t, weekdayShort } from '../lib/i18n/index.svelte';
  import { availableYears, yearOfDay, localDay, DAY } from '../lib/stats';
  import { h, day as fmtDay, plural, dur } from '../lib/format';
  import Heatmap from '../components/Heatmap.svelte';
  import Avatar from '../components/Avatar.svelte';

  const s = $derived(app.stats!);
  const years = $derived(app.year !== null ? [app.year] : availableYears(app.data!).filter((y) => [...s.dayMin.keys()].some((d) => yearOfDay(d) === y)).reverse());
  let picked = $state<number | null>(null);
  // Quartiles of all active days, all-time, so colours mean the same thing in every year.
  const steps = $derived.by(() => {
    const all = new Map<number, number>();
    for (const w of app.data!.watch) all.set(w.day, (all.get(w.day) ?? 0) + w.min);
    const v = [...all.values()].sort((a, b) => a - b);
    const q = (p: number) => v[Math.min(v.length - 1, Math.floor(v.length * p))] ?? 60;
    return [q(0.25), q(0.5), q(0.75)];
  });

  const level = (m: number) => (m === 0 ? 0 : m < steps[0] ? 1 : m < steps[1] ? 2 : m < steps[2] ? 3 : 4);

  // One month selected: a big month grid, Monday first.
  const monthGrid = $derived.by(() => {
    if (app.year === null || app.month === null) return null;
    const start = Math.floor(Date.UTC(app.year, app.month, 1) / DAY);
    const len = new Date(Date.UTC(app.year, app.month + 1, 0)).getUTCDate();
    const lead = (new Date(start * DAY).getUTCDay() + 6) % 7;
    const end = Math.floor(app.data!.user.end / DAY);
    const cells: ({ d: number; n: number; m: number; after: boolean } | null)[] = Array(lead).fill(null);
    for (let i = 0; i < len; i++) cells.push({ d: start + i, n: i + 1, m: s.dayMin.get(start + i) ?? 0, after: start + i > end });
    return cells;
  });

  // Biggest days of the period, with the channel you watched most each day.
  const topDays = $derived.by(() => {
    const days = [...s.dayMin].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const want = new Set(days.map(([d]) => d));
    const per = new Map<number, Map<number, number>>();
    for (const w of app.data!.watch) {
      if (!want.has(w.day)) continue;
      const m = per.get(w.day) ?? new Map<number, number>();
      m.set(w.ch, (m.get(w.ch) ?? 0) + w.min);
      per.set(w.day, m);
    }
    return days.map(([d, min]) => {
      const top = [...(per.get(d) ?? new Map<number, number>())].sort((a, b) => b[1] - a[1])[0];
      return { d, min, ch: top ? top[0] : -1, channels: per.get(d)?.size ?? 0 };
    });
  });

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
  <h1>{t('Calendrier')}</h1>
  <p class="lead">{t('Une case par jour, plus elle est claire plus tu as regardé. Clique un jour pour le détail.')}</p>
</header>

<div class="legend-row">
  <span>{t('Moins')}</span>
  {#each [0, 1, 2, 3, 4] as l (l)}<span class="hm-key l{l}"></span>{/each}
  <span>{t('Plus')}</span>
  <span class="muted">{t("(rien · moins de {a} · jusqu'à {b} · jusqu'à {c} · plus, d'après tes propres journées)", { a: dur(steps[0]), b: dur(steps[1]), c: dur(steps[2]) })}</span>
</div>

<div class="calendar-layout">
  <div class="calendar-years">
    {#if monthGrid}
      <section class="panel">
        <header class="panel-head">
          <h2>{app.periodName!.replace(/^./, (c) => c.toUpperCase())}</h2>
          <span class="hint">{dur([...s.dayMin.values()].reduce((a, m) => a + m, 0))}</span>
        </header>
        <div class="month-grid">
          {#each [0, 1, 2, 3, 4, 5, 6] as i (i)}<span class="mg-head">{weekdayShort(i)}</span>{/each}
          {#each monthGrid as c, i (i)}
            {#if c}
              <button class="mg-cell l{level(c.m)}" class:sel={picked === c.d} class:after={c.after} disabled={!c.m} onclick={() => (picked = c.d)}>
                <span class="mg-n">{c.n}</span>
                {#if c.m}<span class="mg-h">{dur(c.m)}</span>{/if}
              </button>
            {:else}
              <span></span>
            {/if}
          {/each}
        </div>
      </section>
    {:else}
      {#each years as y (y)}
        <section class="panel">
          <header class="panel-head">
            <h2>{y}</h2>
            <span class="hint">{dur([...s.dayMin].filter(([d]) => yearOfDay(d) === y).reduce((a, [, m]) => a + m, 0))}</span>
          </header>
          <Heatmap year={y} dayMin={s.dayMin} {steps} selected={picked} onpick={(d) => (picked = d)} />
        </section>
      {/each}
    {/if}
  </div>

  {#if detail}
    <aside class="panel day-detail">
      <header class="panel-head">
        <h2>{fmtDay(detail.day)}</h2>
        <button class="icon-btn" onclick={() => (picked = null)} aria-label={t('Fermer')}>×</button>
      </header>
      <p class="muted">{t('{d} regardées', { d: dur(s.dayMin.get(detail.day) ?? 0) })}{detail.msgs ? `, ${plural(detail.msgs, 'message envoyé', 'messages envoyés')}` : ''}</p>
      <ol class="rank">
        {#each detail.chs as [ch, e] (ch)}
          <li>
            <Avatar {ch} size={28} />
            <span class="rank-main">
              <a class="rank-name" href={app.chHref(ch)}>{app.chName(ch)}</a>
              <span class="rank-meta">{[...e.games].map((g) => app.gameName(g)).join(', ')}</span>
            </span>
            <span class="rank-val">{dur(e.min)}</span>
          </li>
        {/each}
      </ol>
    </aside>
  {:else if topDays.length}
    <aside class="panel day-detail">
      <header class="panel-head"><h2>{t('Tes plus grosses journées')}</h2></header>
      <ol class="rank">
        {#each topDays as x, i (x.d)}
          <li>
            <span class="rank-n">{i + 1}</span>
            {#if x.ch >= 0}<Avatar ch={x.ch} size={28} />{/if}
            <span class="rank-main">
              <button class="rank-name linklike" onclick={() => (picked = x.d)}>{fmtDay(x.d)}</button>
              <span class="rank-meta">{x.ch >= 0 ? t('surtout {name}', { name: app.chName(x.ch) }) : ''} · {plural(x.channels, 'chaîne', 'chaînes')}</span>
            </span>
            <span class="rank-val">{dur(x.min)}</span>
          </li>
        {/each}
      </ol>
    </aside>
  {/if}
</div>
