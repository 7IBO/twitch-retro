<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { subMonths } from '../lib/stats';
  import { n, date, plural, pct } from '../lib/format';
  import Stat from '../components/Stat.svelte';
  import Avatar from '../components/Avatar.svelte';
  import Meter from '../components/Meter.svelte';
  import Empty from '../components/Empty.svelte';

  const s = $derived(app.stats!);
  const KIND = { paid: 'Payé', gift: 'Offert', prime: 'Prime', other: 'Autre' } as const;
  const count = (k: keyof typeof KIND) => s.subs.filter((x) => x.kind === k).length;
  const months = $derived(s.subs.reduce((a, x) => a + subMonths(x), 0));
</script>

<header class="page-head">
  <h1>Soutien</h1>
  <p class="lead">Tes subs, tes bits, et les pubs que tu as regardées{app.year !== null ? ` en ${app.year}` : ''}.</p>
</header>

{#if !s.subs.length && !s.bits.total && !s.ads.count}
  <Empty text="Rien sur cette période." />
{:else}
  <div class="stats four">
    <Stat value={n(s.subs.length)} label="Subs" sub={[count('paid') && `${n(count('paid'))} payés`, count('gift') && `${n(count('gift'))} offerts`, count('prime') && `${n(count('prime'))} Prime`].filter(Boolean).join(' · ')} />
    <Stat value={plural(months, 'mois', 'mois')} label="De sub cumulés" />
    <Stat value={n(s.bits.total)} label="Bits envoyés" sub={s.bits.channels.slice(0, 2).map((x) => app.chName(x.ch)).join(', ')} />
    <Stat value={n(s.ads.count)} label="Pubs vues" sub={s.ads.channels[0] ? `surtout chez ${app.chName(s.ads.channels[0].ch)}` : ''} />
  </div>

  <div class="split">
    {#if s.subChannels.length}
      <section class="panel">
        <header class="panel-head"><h2>Chaînes soutenues</h2><span class="hint">en mois de sub</span></header>
        <ol class="rank">
          {#each s.subChannels.slice(0, 15) as c, i (c.ch)}
            <li>
              <span class="rank-n">{i + 1}</span>
              <Avatar ch={c.ch} size={28} />
              <a class="rank-name" href={app.chHref(c.ch)}>{app.chName(c.ch)}</a>
              <Meter value={c.months} max={s.subChannels[0].months} />
              <span class="rank-val">{n(c.months)}</span>
            </li>
          {/each}
        </ol>
      </section>
    {/if}
    {#if s.ads.channels.length}
      <section class="panel">
        <header class="panel-head"><h2>Là où tu as vu le plus de pubs</h2></header>
        <ol class="rank">
          {#each s.ads.channels.slice(0, 15) as c, i (c.ch)}
            <li>
              <span class="rank-n">{i + 1}</span>
              <Avatar ch={c.ch} size={28} />
              <a class="rank-name" href={app.chHref(c.ch)}>{app.chName(c.ch)}</a>
              <Meter value={c.n} max={s.ads.channels[0].n} />
              <span class="rank-val">{n(c.n)}</span>
            </li>
          {/each}
        </ol>
        <p class="note">{pct(s.ads.channels.slice(0, 5).reduce((a, c) => a + c.n, 0), s.ads.count)} % de tes pubs viennent de 5 chaînes.</p>
      </section>
    {/if}
  </div>

  {#if s.subs.length}
    <section class="panel flush">
      <header class="panel-head pad"><h2>Tous tes subs</h2></header>
      <table class="table-plain">
        <thead><tr><th>Chaîne</th><th>Début</th><th>Durée</th><th>Type</th></tr></thead>
        <tbody>
          {#each [...s.subs].reverse() as x (x.start + ':' + x.ch)}
            <tr>
              <td><a href={app.chHref(x.ch)}>{app.chName(x.ch)}</a></td>
              <td>{date(x.start)}</td>
              <td class="num">{plural(subMonths(x), 'mois', 'mois')}</td>
              <td>{KIND[x.kind]}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/if}
{/if}
