<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { yearly, monthly, timeline, DAY } from '../lib/stats';
  import { h, n, n1, day, plural, pct, pc, duration, dur } from '../lib/format';
  import { t, monthName, weekdayName, weekdayShort } from '../lib/i18n/index.svelte';
  import Stat from '../components/Stat.svelte';
  import Bars from '../components/Bars.svelte';
  import Avatar from '../components/Avatar.svelte';
  import BoxArt from '../components/BoxArt.svelte';
  import Meter from '../components/Meter.svelte';
  import Empty from '../components/Empty.svelte';

  const s = $derived(app.stats!);
  const years = $derived(app.year === null ? yearly(app.data!) : []);
  const months = $derived(app.year !== null && app.month === null ? monthly(app.data!, app.year) : []);
  const tl = $derived(timeline(s.dayMin, { endDay: Math.floor(app.data!.user.end / DAY), year: app.year, month: app.month, fmt: dur }));
  const UNIT = { jour: 'Heures par jour', mois: 'Heures par mois', année: 'Heures par année' } as const;
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
  const cap = (x: string) => x.replace(/^./, (c) => c.toUpperCase());
</script>

{#if !s.totalMin}
  <Empty text={app.year === null ? t('Ton export ne contient aucune minute de visionnage.') : t('Aucun visionnage enregistré') + app.periodEn + '.'} />
{:else}
  <section class="lede">
    <p class="period">
      {app.year === null ? t('Du {from} au {to}', { from: day(s.firstDay), to: day(s.lastDay) }) : app.month !== null ? cap(app.periodName!) : t('Année {year}', { year: app.year })}
    </p>
    <h1><span class="figure">{h(s.totalMin)}</span> {t('heures regardées')}</h1>
    <p class="lead">
      {t('Soit {days} de streams, sur {active} différentes et {channels}.', {
        days: plural(Math.floor(s.totalMin / 1440), 'jour entier', 'jours entiers'),
        active: plural(s.activeDays, 'journée', 'journées'),
        channels: plural(s.channels.length, 'chaîne', 'chaînes'),
      })}
    </p>
  </section>

  <div class="stats four">
    <Stat
      value={n(s.channels.length)}
      label={t('Chaînes regardées')}
      sub={app.year !== null ? t(app.month !== null ? 'dont {n} découvertes ce mois-ci' : 'dont {n} découvertes cette année', { n: n(s.newChannels) }) : ''}
    />
    <Stat value={n(s.games.length)} label={t('Catégories')} />
    <Stat value={n(s.activeDays)} label={t('Jours actifs')} sub={s.spanDays ? t('{p} % des jours de la période', { p: pct(s.activeDays, s.spanDays) }) : ''} />
    <Stat value={n(s.chat.msgs.length)} label={t('Messages dans le chat')} sub={s.chat.channels.length ? t('dans {n}', { n: plural(s.chat.channels.length, 'chat', 'chats') }) : ''} />
  </div>

  <section class="panel">
    <header class="panel-head">
      <h2>{t(UNIT[tl.unit])}</h2>
      {#if app.year === null && tl.unit === 'année'}<span class="hint">{t("Clique une année pour l'explorer")}</span>{/if}
    </header>
    <Bars height={260} items={tl.items} onpick={app.year === null && tl.unit === 'année' ? (i) => app.setYear(parseInt(tl.items[i].label), true) : undefined} />
    {#if tl.partial}<p class="chart-note">{tl.partial}</p>{/if}
  </section>

  <div class="split">
    <section class="panel">
      <header class="panel-head"><h2>{t('Streamers')}</h2><a class="more" href="#/streamers">{t('Tout voir')}</a></header>
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
      <header class="panel-head"><h2>{t('Catégories')}</h2><a class="more" href="#/categories">{t('Tout voir')}</a></header>
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
    <header class="panel-head"><h2>{t('Records')}</h2></header>
    <div class="stats auto">
      {#if s.biggestDay}
        <Stat
          value={dur(s.biggestDay.min)}
          label={t('Ta plus grosse journée')}
          sub={t('le {date}, surtout chez {name}', { date: day(s.biggestDay.day), name: app.chName(s.biggestDay.topCh) })}
        />
      {/if}
      {#if s.streak.len > 1}
        <Stat value={plural(s.streak.len, 'jour', 'jours')} label={t("D'affilée, sans un jour sans")} sub={t('du {from} au {to}', { from: day(s.streak.from), to: day(s.streak.to) })} />
      {/if}
      {#if s.loyal}
        <Stat
          value={duration(s.loyal.last - s.loyal.first)}
          label={t('Avec {name}', { name: app.chName(s.loyal.ch) })}
          sub={t('ta plus longue fidélité, depuis le {date}', { date: day(s.loyal.first) })}
        />
      {/if}
      <Stat value={pc(pct(s.liveMin, s.totalMin))} label={t('En direct')} sub={t('{d} en rediffusion', { d: dur(s.vodMin) })} />
    </div>
    <p class="note">{t('Twitch compte les minutes de chaque appareil et de chaque onglet ouvert : deux streams regardés en même temps comptent deux fois.')}</p>
  </section>

  {#if s.busiestDay && s.busiestDay.channels > 1}
    <section class="panel">
      <header class="panel-head"><h2>{t('Streams en parallèle')}</h2><span class="hint">{t('plusieurs chaînes ouvertes en même temps')}</span></header>
      <div class="split">
        <div>
          <div class="stats two">
            <Stat value={n1(s.avgChannels)} label={t('Chaînes par jour actif')} sub={t('en moyenne')} />
            <Stat value={n(s.overDays)} label={t('Journées à plus de 24 h')} sub={s.activeDays ? t('{p} % de tes jours actifs', { p: pct(s.overDays, s.activeDays) }) : ''} />
          </div>
          <p class="note">
            {t("Une journée ne dure que 24 h : au-delà, c'est forcément que plusieurs streams tournaient en même temps (plusieurs onglets, ou le mobile et l'ordinateur à la fois). L'export donne les minutes par jour et par chaîne, mais pas l'heure de chaque minute. On voit donc combien de streams se superposaient, sans savoir exactement lesquels à quel moment.")}
          </p>
        </div>
        <div>
          <h3 class="sub-h first">
            {t('Le jour où tu as ouvert le plus de chaînes : {n} le {date}', { n: plural(s.busiestDay.channels, 'chaîne', 'chaînes'), date: day(s.busiestDay.day) })}
          </h3>
          <ol class="rank">
            {#each s.busiestChannels.slice(0, 8) as c (c.ch)}
              <li>
                <Avatar ch={c.ch} size={28} />
                <a class="rank-name" href={app.chHref(c.ch)}>{app.chName(c.ch)}</a>
                <Meter value={c.min} max={s.busiestChannels[0].min} />
                <span class="rank-val">{dur(c.min)}</span>
              </li>
            {/each}
          </ol>
        </div>
      </div>
    </section>
  {/if}

  <div class="split">
    <section class="panel">
      <header class="panel-head"><h2>{t('Ta semaine')}</h2><span class="hint">{t('surtout le {day}', { day: weekdayName(favWd) })}</span></header>
      <Bars height={140} items={s.weekdays.map((v, i) => ({ label: weekdayShort(i), value: v, title: `${weekdayName(i)} : ${dur(v)}` }))} />
    </section>
    <section class="panel">
      <header class="panel-head">
        <h2>{t('Tes heures')}</h2>
        {#if plays}<span class="hint">{t('pic vers {h} h', { h: favH })}{night / plays > 0.1 ? ', ' + t('{p} % la nuit', { p: pct(night, plays) }) : ''}</span>{/if}
      </header>
      {#if plays}
        <Bars height={140} items={s.hours.map((v, i) => ({ label: i % 3 === 0 ? `${i}h` : '', value: v, title: t('{h} h : {n} streams lancés', { h: i, n: n(v) }) }))} />
      {:else}
        <Empty text={t("Pas d'horaires sur cette période.")} />
      {/if}
    </section>
  </div>

  {#if plat.length > 1}
    <section class="panel">
      <header class="panel-head"><h2>{t('Tes écrans')}</h2></header>
      <div class="stack" role="img" aria-label={t('Répartition par écran')}>
        {#each plat as p, i (p.key)}
          <span class="stack-part p{i}" style:flex-grow={p.min}></span>
        {/each}
      </div>
      <ul class="legend">
        {#each plat as p, i (p.key)}
          <li><span class="dot p{i}"></span>{t(p.label)}<span class="legend-val">{pc(pct(p.min, s.totalMin))} · {dur(p.min)}</span></li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if years.length > 1}
    <section class="panel">
      <header class="panel-head"><h2>{t('Année par année')}</h2></header>
      <div class="years">
        {#each years as y (y.year)}
          <button class="year-card" onclick={() => app.setYear(y.year, true)}>
            <span class="year-n">{y.year}</span>
            <span class="year-h">{dur(y.min)}</span>
            {#if y.topGame >= 0}<BoxArt game={y.topGame} w={144} h={192} cls="year-art" />{/if}
            <dl>
              <dt>{t('Streamer')}</dt>
              <dd>{y.topCh >= 0 ? app.chName(y.topCh) : '?'}</dd>
              <dt>{t('Catégorie')}</dt>
              <dd>{app.gameName(y.topGame)}</dd>
              <dt>{t('Nouvelles chaînes')}</dt>
              <dd>{n(y.newChannels)}</dd>
            </dl>
          </button>
        {/each}
      </div>
    </section>
  {/if}
  {#if months.length}
    <section class="panel">
      <header class="panel-head"><h2>{t('Mois par mois')}</h2><span class="hint">{app.year}</span></header>
      <div class="years">
        {#each months as m (m.month)}
          <a class="year-card" href="#/calendrier" title={t('Voir {month} dans le calendrier', { month: monthName(m.month) })}>
            <span class="year-n month-n">{monthName(m.month)}</span>
            <span class="year-h">{dur(m.min)}</span>
            {#if m.topGame >= 0}<BoxArt game={m.topGame} w={144} h={192} cls="year-art" />{/if}
            <dl>
              <dt>{t('Streamer')}</dt>
              <dd>{m.topCh >= 0 ? app.chName(m.topCh) : '?'}</dd>
              <dt>{t('Catégorie')}</dt>
              <dd>{app.gameName(m.topGame)}</dd>
              <dt>{t('Jours actifs')}</dt>
              <dd>{n(m.days)}{m.newChannels ? ` · ${plural(m.newChannels, 'chaîne découverte', 'chaînes découvertes')}` : ''}</dd>
            </dl>
          </a>
        {/each}
      </div>
    </section>
  {/if}
{/if}
