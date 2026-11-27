<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { localDay } from '../lib/stats';
  import { n, day, plural } from '../lib/format';
  import Stat from '../components/Stat.svelte';
  import Empty from '../components/Empty.svelte';

  const s = $derived(app.stats!);
  const msgs = $derived(s.chat.msgs);
  const badges = $derived.by(() => {
    const sets = new Map<string, { key: string; n: number; first: number; last: number }>();
    const subs = new Map<number, { key: string; months: number; last: number }>();
    for (const m of msgs) {
      for (const b of m.badges ?? []) {
        const set = b.split('/')[0];
        if (set === 'subscriber') {
          const e = subs.get(m.ch);
          if (!e || m.ts > e.last) subs.set(m.ch, { key: b, months: Math.max(e?.months ?? 0, m.subMonths ?? 0), last: m.ts });
          else e.months = Math.max(e.months, m.subMonths ?? 0);
          continue;
        }
        const e = sets.get(set);
        if (!e) sets.set(set, { key: b, n: 1, first: m.ts, last: m.ts });
        else {
          e.n++;
          if (m.ts > e.last) (e.last = m.ts), (e.key = b);
        }
      }
    }
    return {
      global: [...sets.values()].sort((x, y) => y.n - x.n),
      subs: [...subs.entries()].map(([ch, v]) => ({ ch, ...v })).sort((x, y) => y.months - x.months),
    };
  });
  const badgeInfo = (key: string, ch = -1) => {
    const id = ch >= 0 ? app.data!.channels[ch]?.id : undefined;
    return (id ? app.enrich?.channelBadges?.[id]?.[key] : undefined) ?? app.enrich?.badges?.[key];
  };
  const tagged = $derived(msgs.filter((m) => m.badges).length);
</script>

<header class="page-head">
  <h1>Badges</h1>
  <p class="lead">Les badges affichés à côté de ton pseudo dans le chat{app.year !== null ? ` en ${app.year}` : ''}. Twitch ne les a gardés que pour tes messages depuis 2023.</p>
</header>

{#if !tagged}
  <Empty text={app.year === null ? "Ton export n'a gardé aucun badge (seulement pour les messages depuis 2023)." : `Aucun badge enregistré en ${app.year}.`} />
{:else}
  <div class="stats four">
    <Stat value={n(badges.global.length)} label="Badges différents" />
    <Stat value={n(badges.subs.length)} label="Badges d'abonné" sub="un par chaîne" />
    {#if badges.subs[0]?.months}<Stat value={plural(badges.subs[0].months, 'mois', 'mois')} label="Ton plus long abonnement affiché" sub="chez {app.chName(badges.subs[0].ch)}" />{/if}
    <Stat value={n(tagged)} label="Messages avec un badge" />
  </div>
  <div class="split">
    <section class="panel">
      <header class="panel-head"><h2>Badges</h2><span class="hint">en nombre de messages</span></header>
      {#if badges.global.length}
        <ul class="badges">
          {#each badges.global as b (b.key)}
            {@const info = badgeInfo(b.key)}
            <li>
              {#if info}<img src={info.url} alt="" width="36" height="36" loading="lazy" referrerpolicy="no-referrer" />{:else}<span class="badge-empty"></span>{/if}
              <span class="rank-main"><span class="rank-name">{info?.title ?? b.key.split('/')[0]}</span><span class="rank-meta">{day(localDay(b.first))} → {day(localDay(b.last))}</span></span>
              <span class="rank-val">{n(b.n)}</span>
            </li>
          {/each}
        </ul>
      {:else}
        <Empty text="Aucun badge en dehors des abonnements." />
      {/if}
    </section>
    <section class="panel">
      <header class="panel-head"><h2>Badges d'abonné</h2><span class="hint">ancienneté affichée</span></header>
      {#if badges.subs.length}
        <ul class="badges">
          {#each badges.subs as b (b.ch)}
            {@const info = badgeInfo(b.key, b.ch)}
            <li>
              {#if info}<img src={info.url} alt="" width="36" height="36" loading="lazy" referrerpolicy="no-referrer" />{:else}<span class="badge-empty"></span>{/if}
              <a class="rank-name" href={app.chHref(b.ch)}>{app.chName(b.ch)}</a>
              <span class="rank-val">{b.months ? plural(b.months, 'mois', 'mois') : '—'}</span>
            </li>
          {/each}
        </ul>
      {:else}
        <Empty text="Aucun badge d'abonné sur cette période." />
      {/if}
    </section>
  </div>
{/if}
