<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { t } from '../lib/i18n/index.svelte';
  import { subMonths } from '../lib/stats';
  import { n, date, plural, pct } from '../lib/format';
  import Stat from '../components/Stat.svelte';
  import Avatar from '../components/Avatar.svelte';
  import Meter from '../components/Meter.svelte';
  import Empty from '../components/Empty.svelte';

  const s = $derived(app.stats!);
  const KIND = { paid: 'Paid', gift: 'Gifted', prime: 'Prime', other: 'Other' } as const;
  const count = (k: keyof typeof KIND) => s.subs.filter((x) => x.kind === k).length;
  const months = $derived(s.subs.reduce((a, x) => a + subMonths(x), 0));
</script>

<header class="page-head">
  <h1>{t('Support')}</h1>
  <p class="lead">{t('Your subs, your bits, and the ads you watched')}{app.periodEn}.</p>
</header>

{#if !s.subs.length && !s.bits.total && !s.ads.count}
  <Empty text={t('Nothing in this period.')} />
{:else}
  <div class="stats four">
    <Stat value={n(s.subs.length)} label={t('Subs')} sub={[count('paid') && t('{n} paid', { n: n(count('paid')) }), count('gift') && t('{n} gifted', { n: n(count('gift')) }), count('prime') && t('{n} Prime', { n: n(count('prime')) })].filter(Boolean).join(' · ')} />
    <Stat value={plural(months, 'month', 'months')} label={t('Of subs in total')} />
    <Stat value={n(s.bits.total)} label={t('Bits sent')} sub={s.bits.channels.slice(0, 2).map((x) => app.chName(x.ch)).join(', ')} />
    <Stat value={n(s.ads.count)} label={t('Ads seen')} sub={s.ads.channels[0] ? t('mostly with {name}', { name: app.chName(s.ads.channels[0].ch) }) : ''} />
  </div>

  <div class="split">
    {#if s.subChannels.length}
      <section class="panel">
        <header class="panel-head"><h2>{t('Channels supported')}</h2><span class="hint">{t('in months of subs')}</span></header>
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
        <header class="panel-head"><h2>{t('Where you saw the most ads')}</h2></header>
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
        <p class="note">{t('{p}% of your ads come from 5 channels.', { p: pct(s.ads.channels.slice(0, 5).reduce((a, c) => a + c.n, 0), s.ads.count) })}</p>
      </section>
    {/if}
  </div>

  {#if s.subs.length}
    <section class="panel flush">
      <header class="panel-head pad"><h2>{t('All your subs')}</h2></header>
      <table class="table-plain">
        <thead><tr><th>{t('Channel')}</th><th>{t('Start')}</th><th>{t('Length')}</th><th>{t('Type')}</th></tr></thead>
        <tbody>
          {#each [...s.subs].reverse() as x (x.start + ':' + x.ch)}
            <tr>
              <td><a href={app.chHref(x.ch)}>{app.chName(x.ch)}</a></td>
              <td>{date(x.start)}</td>
              <td class="num">{plural(subMonths(x), 'month', 'months')}</td>
              <td>{t(KIND[x.kind])}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/if}
{/if}
