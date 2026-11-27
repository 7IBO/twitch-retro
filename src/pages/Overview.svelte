<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { yearly, timeline, DAY } from '../lib/stats';
  import { h, n, day, plural, pct, duration, WEEKDAYS, dur } from '../lib/format';
  import Stat from '../components/Stat.svelte';
  import Bars from '../components/Bars.svelte';
  import Avatar from '../components/Avatar.svelte';
  import BoxArt from '../components/BoxArt.svelte';
  import Meter from '../components/Meter.svelte';
  import Empty from '../components/Empty.svelte';

  const s = $derived(app.stats!);
  const years = $derived(app.year === null ? yearly(app.data!) : []);
  const tl = $derived(timeline(s.dayMin, { endDay: Math.floor(app.data!.user.end / DAY), year: app.year, fmt: dur }));
  const favWd = $derived(s.weekdays.indexOf(Math.max(...s.weekdays)));
  const plays = $derived(s.hours.reduce((a, b) => a + b, 0));
  const favH = $derived(s.hours.indexOf(Math.max(...s.hours)));
  const night = $derived(s.hours.slice(0, 6).reduce((a, b) => a + b, 0));
  const plat = $derived(
    [
      { key: 'web', label: 'Ordinateur', min: s.platforms.web },
      { key: 'mobile', label: 'Mobile', min: s.platforms.mobile },
      { key: 'tv', label: 'TV et consoles', min: s.platforms.tv },
    ].filter((p) => p.min > 0),
  );
</script>

{#if !s.totalMin}
  <Empty text={app.year === null ? "Ton export ne contient aucune minute de visionnage." : `Aucun visionnage enregistré en ${app.year}.`} />
{:else}
  <section class="lede">
    <p class="period">{app.year === null ? `Du ${day(s.firstDay)} au ${day(s.lastDay)}` : `Année ${app.year}`}</p>
    <h1><span class="figure">{h(s.totalMin)}</span> heures regardées</h1>
    <p class="lead">
      Soit {plural(Math.floor(s.totalMin / 1440), 'jour entier', 'jours entiers')} de streams, sur {plural(s.activeDays, 'journée', 'journées')}
      différentes et {plural(s.channels.length, 'chaîne', 'chaînes')}.
    </p>
  </section>

  <div class="stats four">
    <Stat value={n(s.channels.length)} label="Chaînes regardées" sub={app.year !== null ? `dont ${n(s.newChannels)} découvertes cette année` : ''} />
    <Stat value={n(s.games.length)} label="Catégories" />
    <Stat value={n(s.activeDays)} label="Jours actifs" sub={s.spanDays ? `${pct(s.activeDays, s.spanDays)} % des jours de la période` : ''} />
    <Stat value={n(s.chat.msgs.length)} label="Messages dans le chat" sub={s.chat.channels.length ? `dans ${plural(s.chat.channels.length, 'chat', 'chats')}` : ''} />
  </div>

  <section class="panel">
    <header class="panel-head">
      <h2>Heures par {tl.unit}</h2>
      {#if app.year === null && tl.unit === 'année'}<span class="hint">Clique une année pour l'explorer</span>{/if}
    </header>
    <Bars height={260} items={tl.items} onpick={app.year === null && tl.unit === 'année' ? (i) => app.setYear(parseInt(tl.items[i].label)) : undefined} />
    {#if tl.partial}<p class="chart-note">{tl.partial}</p>{/if}
  </section>

  <div class="split">
    <section class="panel">
      <header class="panel-head"><h2>Streamers</h2><a class="more" href="#/streamers">Tout voir</a></header>
      <ol class="rank">
        {#each s.channels.slice(0, 12) as c, i (c.ch)}
          <li>
            <span class="rank-n">{i + 1}</span>
            <Avatar ch={c.ch} size={32} />
            <a class="rank-name" href={app.chHref(c.ch)}>{app.chName(c.ch)}</a>
            <Meter value={c.min} max={s.channels[0].min} />
            <span class="rank-val">{dur(c.min)}</span>
          </li>
        {/each}
      </ol>
    </section>
    <section class="panel">
      <header class="panel-head"><h2>Catégories</h2><a class="more" href="#/categories">Tout voir</a></header>
      <div class="covers four">
        {#each s.games.slice(0, 8) as g, i (g.game)}
          <a class="cover" href={app.gameHref(g.game)}>
            <BoxArt game={g.game} w={144} h={192} />
            <span class="cover-name">{i + 1}. {app.gameName(g.game)}</span>
            <span class="cover-meta">{dur(g.min)}</span>
          </a>
        {/each}
      </div>
    </section>
  </div>

  <section class="panel">
    <header class="panel-head"><h2>Records</h2></header>
    <div class="stats auto">
      {#if s.biggestDay}
        <Stat value={dur(s.biggestDay.min)} label="Ta plus grosse journée" sub="le {day(s.biggestDay.day)}, surtout chez {app.chName(s.biggestDay.topCh)}" />
      {/if}
      {#if s.streak.len > 1}
        <Stat value={plural(s.streak.len, 'jour', 'jours')} label="D'affilée, sans un jour sans" sub="du {day(s.streak.from)} au {day(s.streak.to)}" />
      {/if}
      {#if s.loyal}
        <Stat value={duration(s.loyal.last - s.loyal.first)} label="Avec {app.chName(s.loyal.ch)}" sub="ta plus longue fidélité, depuis le {day(s.loyal.first)}" />
      {/if}
      {#if s.busiestDay && s.busiestDay.channels > 1}
        <Stat value={plural(s.busiestDay.channels, 'chaîne', 'chaînes')} label="Le plus de chaînes en un jour" sub="le {day(s.busiestDay.day)}" />
      {/if}
      <Stat value="{pct(s.liveMin, s.totalMin)} %" label="En direct" sub="{dur(s.vodMin)} en rediffusion" />
    </div>
    <p class="note">Twitch compte les minutes de chaque appareil et de chaque onglet ouvert : deux streams regardés en même temps comptent deux fois.{s.overDays ? ` Tu dépasses 24 h de visionnage sur ${plural(s.overDays, 'journée', 'journées')}, signe de streams en parallèle.` : ''}</p>
  </section>

  <div class="split">
    <section class="panel">
      <header class="panel-head"><h2>Ta semaine</h2><span class="hint">surtout le {WEEKDAYS[favWd]}</span></header>
      <Bars height={140} items={s.weekdays.map((v, i) => ({ label: WEEKDAYS[i].slice(0, 3), value: v, title: `${WEEKDAYS[i]} : ${dur(v)}` }))} />
    </section>
    <section class="panel">
      <header class="panel-head">
        <h2>Tes heures</h2>
        {#if plays}<span class="hint">pic vers {favH} h{night / plays > 0.1 ? `, ${pct(night, plays)} % la nuit` : ''}</span>{/if}
      </header>
      {#if plays}
        <Bars height={140} items={s.hours.map((v, i) => ({ label: i % 3 === 0 ? `${i}h` : '', value: v, title: `${i} h : ${n(v)} streams lancés` }))} />
      {:else}
        <Empty text="Pas d'horaires sur cette période." />
      {/if}
    </section>
  </div>

  {#if plat.length > 1}
    <section class="panel">
      <header class="panel-head"><h2>Tes écrans</h2></header>
      <div class="stack" role="img" aria-label="Répartition par écran">
        {#each plat as p, i (p.key)}
          <span class="stack-part p{i}" style:flex-grow={p.min}></span>
        {/each}
      </div>
      <ul class="legend">
        {#each plat as p, i (p.key)}
          <li><span class="dot p{i}"></span>{p.label}<span class="legend-val">{pct(p.min, s.totalMin)} % · {dur(p.min)}</span></li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if years.length > 1}
    <section class="panel">
      <header class="panel-head"><h2>Année par année</h2></header>
      <div class="years">
        {#each years as y (y.year)}
          <button class="year-card" onclick={() => (app.setYear(y.year))}>
            <span class="year-n">{y.year}</span>
            <span class="year-h">{dur(y.min)}</span>
            {#if y.topGame >= 0}<BoxArt game={y.topGame} w={144} h={192} cls="year-art" />{/if}
            <dl>
              <dt>Streamer</dt>
              <dd>{y.topCh >= 0 ? app.chName(y.topCh) : '?'}</dd>
              <dt>Catégorie</dt>
              <dd>{app.gameName(y.topGame)}</dd>
              <dt>Nouvelles chaînes</dt>
              <dd>{n(y.newChannels)}</dd>
            </dl>
          </button>
        {/each}
      </div>
    </section>
  {/if}
{/if}
