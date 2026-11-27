<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { t } from '../lib/i18n/index.svelte';
  import { yearOfDay, yearOfTs } from '../lib/stats';
  import { h, n, day, date, plural, dur } from '../lib/format';
  import Stat from '../components/Stat.svelte';
  import Bars from '../components/Bars.svelte';
  import BoxArt from '../components/BoxArt.svelte';
  import Meter from '../components/Meter.svelte';
  import Empty from '../components/Empty.svelte';

  const d = $derived(app.data!);
  const b = $derived(app.year === null ? d.broadcast : d.broadcast.filter((x) => app.period.inDay(x.day)));
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
    if (ys.length) for (let y = Math.min(...ys); y <= Math.max(...ys); y++) out.push({ label: String(y), value: m.get(y) ?? 0, mark: y === app.year, title: `${y} : ${dur(m.get(y) ?? 0)}` });
    return out;
  });
  const vods = $derived(app.year === null ? d.ownVods : d.ownVods.filter((v) => app.period.inTs(v.ts)));
  const names = $derived(d.user.renames.length ? [d.user.renames[0].from, ...d.user.renames.map((r) => r.to)] : [d.user.login].filter(Boolean));
  const mins = (sec: number) => `${Math.floor(sec / 3600)} h ${String(Math.round((sec % 3600) / 60)).padStart(2, '0')}`;
</script>

<header class="page-head">
  <h1>{t('My channel')}</h1>
  <p class="lead">{t('Your streamer side: your streams, your VODs and your names.')}</p>
</header>

<div class="split">
  <section class="panel">
    <header class="panel-head"><h2>{t('Your names')}</h2></header>
    {#if names.length}
      <ol class="timeline">
        {#each names as name, i (i)}
          <li>
            <span class="tl-name">{d.user.displayNames?.[name.toLowerCase()] ?? name}</span>
            <span class="tl-date">{i === 0 ? (Number.isFinite(d.user.start) ? t('account created on {date}', { date: date(d.user.start) }) : t('at the start')) : t('since {date}', { date: date(d.user.renames[i - 1].ts) })}</span>
          </li>
        {/each}
      </ol>
    {:else}
      <Empty text={t('No name change.')} />
    {/if}
  </section>

  <section class="panel">
    <header class="panel-head"><h2>{t('Your streams')}</h2></header>
    {#if total}
      <div class="stats two">
        <Stat value={dur(total)} label={t('Streamed')} sub={plural(days.size, 'day', 'days')} />
        <Stat value={day(Math.min(...days))} label={t('First stream')} sub={t('last on {date}', { date: day(Math.max(...days)) })} />
      </div>
      {#if perYear.length > 1}<Bars height={120} items={perYear} />{/if}
    {:else}
      <Empty text={app.year === null ? t('You never streamed according to the export.') : t('No streams') + app.periodEn + '.'} />
    {/if}
  </section>
</div>

{#if games.length}
  <section class="panel">
    <header class="panel-head"><h2>{t('Categories streamed')}</h2></header>
    <ol class="rank">
      {#each games.slice(0, 10) as [g, m] (g)}
        <li>
          <BoxArt game={g} w={52} h={72} cls="thumb" />
          <span class="rank-name">{app.gameName(g)}</span>
          <Meter value={m} max={games[0][1]} />
          <span class="rank-val">{dur(m)}</span>
        </li>
      {/each}
    </ol>
  </section>
{/if}

{#if vods.length}
  <section class="panel flush">
    <header class="panel-head pad"><h2>{t('Your VODs')}</h2><span class="hint">{n(vods.length)}</span></header>
    <table class="table-plain">
      <thead><tr><th>{t('Title')}</th><th>{t('Date')}</th><th>{t('Length')}</th><th>{t('Category')}</th></tr></thead>
      <tbody>
        {#each vods as v (v.id)}
          <tr>
            <td><a href="https://www.twitch.tv/videos/{v.id}" target="_blank" rel="noopener noreferrer">{v.title || t('Untitled')}</a></td>
            <td>{date(v.ts)}</td>
            <td class="num">{mins(v.seconds)}</td>
            <td>{app.gameName(v.game)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <p class="note pad">{t('Links work as long as Twitch keeps the VOD.')}</p>
  </section>
{/if}
