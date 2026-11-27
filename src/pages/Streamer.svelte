<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { channelDetail, subMonths } from '../lib/stats';
  import { h, n, day, date, dateTime, plural, share, duration, lang, dur } from '../lib/format';
  import Avatar from '../components/Avatar.svelte';
  import BoxArt from '../components/BoxArt.svelte';
  import Bars from '../components/Bars.svelte';
  import Stat from '../components/Stat.svelte';
  import Meter from '../components/Meter.svelte';
  import Empty from '../components/Empty.svelte';
  import ChatText from '../components/ChatText.svelte';

  let { ch }: { ch: number } = $props();
  const all = $derived(app.data ? app.stats : null);
  const exists = $derived(!!app.data?.channels[ch]);
  // Rank is all-time, independent of the year filter.
  const rank = $derived.by(() => {
    const d = app.data!;
    const totals = new Map<number, number>();
    for (const w of d.watch) totals.set(w.ch, (totals.get(w.ch) ?? 0) + w.min);
    const mine = totals.get(ch) ?? 0;
    let r = 1;
    for (const v of totals.values()) if (v > mine) r++;
    return mine ? r : 0;
  });
  const watchedCount = $derived(new Set(app.data!.watch.map((w) => w.ch)).size);
  const det = $derived(exists ? channelDetail(app.data!, ch, rank) : null);
  const u = $derived(app.user(ch));
  const old = $derived(app.oldNames(ch));
  const total = $derived(app.data!.watch.reduce((a, w) => a + w.min, 0));
  const yearRow = $derived(app.year !== null && all ? all.channels.find((c) => c.ch === ch) : undefined);
</script>

{#if !det || !all}
  <Empty text="Chaîne introuvable." />
{:else}
  <a class="back" href="#/streamers">← Streamers</a>
  <header class="profile">
    <Avatar {ch} size={88} />
    <div>
      <h1>{app.chName(ch)}</h1>
      <p class="lead">
        {[det.rank ? `N° ${n(det.rank)} sur ${n(watchedCount)} chaînes` : 'Jamais regardé', det.min ? `${dur(det.min)} ensemble` : '', det.min ? `${share(det.min, total)} % de ton temps de visionnage` : ''].filter(Boolean).join(' · ')}
      </p>
      <p class="muted">
        {#if old.length}Anciens pseudos : {old.join(', ')} · {/if}
        <a href="https://www.twitch.tv/{app.login(ch)}" target="_blank" rel="noopener noreferrer">twitch.tv/{app.login(ch)} ↗</a>
      </p>
    </div>
  </header>

  <div class="stats four">
    <Stat value={n(det.days)} label="Jours ensemble" sub="du {day(det.first)} au {day(det.last)}" />
    {#if app.year !== null}
      <Stat value="{yearRow ? h(yearRow.min) : '0'} h" label="En {app.year}" sub={yearRow ? plural(yearRow.days, 'jour', 'jours') : 'pas vu cette année'} />
    {:else}
      <Stat value={duration(det.last - det.first)} label="Depuis ta première fois" />
    {/if}
    <Stat value={n(det.chat)} label="Messages dans son chat" />
    {#if det.follow}
      <Stat value={det.follow.following ? 'Suivi' : 'Plus suivi'} label="Follow" sub="depuis le {date(det.follow.since)}" />
    {:else}
      <Stat value="—" label="Follow" sub="aucun follow dans l'export" />
    {/if}
  </div>

  <section class="panel">
    <header class="panel-head"><h2>Heures par année</h2></header>
    <Bars height={200} items={det.byYear.map((y) => ({ label: String(y.year), value: y.min, title: `${y.year} : ${dur(y.min)}`, mark: y.year === app.year }))} />
  </section>

  <div class="split">
    <section class="panel">
      <header class="panel-head"><h2>Ce que tu regardais chez {app.chName(ch)}</h2></header>
      <ol class="rank">
        {#each det.games.slice(0, 10) as g (g.game)}
          <li>
            <BoxArt game={g.game} w={52} h={72} cls="thumb" />
            <a class="rank-name" href="#/categories/{g.game}">{app.gameName(g.game)}</a>
            <Meter value={g.min} max={det.games[0].min} />
            <span class="rank-val">{dur(g.min)}</span>
          </li>
        {/each}
      </ol>
    </section>
    <section class="panel">
      <header class="panel-head"><h2>Moments</h2></header>
      <dl class="facts">
        {#if det.biggestDay}<dt>Plus grosse journée</dt><dd>{dur(det.biggestDay.min)} le {day(det.biggestDay.day)}</dd>{/if}
        {#if det.vodMin}<dt>En rediffusion</dt><dd>{dur(det.vodMin)}</dd>{/if}
        {#if det.subs.length}
          <dt>Subs</dt>
          <dd>{plural(det.subs.reduce((a, s) => a + subMonths(s), 0), 'mois', 'mois')}, depuis le {date(det.subs[0].start)}</dd>
        {/if}
        {#if det.bits}<dt>Bits</dt><dd>{n(det.bits)}</dd>{/if}
        {#if det.ads}<dt>Pubs vues</dt><dd>{n(det.ads)}</dd>{/if}
        {#if u?.lang}<dt>Langue de la chaîne aujourd'hui</dt><dd>{lang(u.lang)}</dd>{/if}
      </dl>
      {#if det.firstMsg}
        <figure class="chatline">
          <figcaption>Ton premier message chez {app.chName(ch)}, le {dateTime(det.firstMsg.ts)}</figcaption>
          <p><ChatText body={det.firstMsg.body} {ch} /></p>
        </figure>
      {/if}
    </section>
  </div>
{/if}
