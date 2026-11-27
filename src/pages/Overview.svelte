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
  const UNIT = { day: 'Hours per day', month: 'Hours per month', year: 'Hours per year' } as const;
  const favWd = $derived(s.weekdays.indexOf(Math.max(...s.weekdays)));
  const plays = $derived(s.hours.reduce((a, b) => a + b, 0));
  const favH = $derived(s.hours.indexOf(Math.max(...s.hours)));
  const night = $derived(s.hours.slice(0, 6).reduce((a, b) => a + b, 0));
  const plat = $derived(
    [
      { key: 'web', label: 'Computer', min: s.platforms.web },
      { key: 'mobile', label: 'Mobile', min: s.platforms.mobile },
      { key: 'tv', label: 'TV and consoles', min: s.platforms.tv },
    ].filter((p) => p.min > 0),
  );
  const cap = (x: string) => x.replace(/^./, (c) => c.toUpperCase());
</script>

{#if !s.totalMin}
  <Empty text={app.year === null ? t('Your export has no watch time at all.') : t('Nothing watched') + app.periodEn + '.'} />
{:else}
  <section class="lede">
    <p class="period">
      {app.year === null ? t('From {from} to {to}', { from: day(s.firstDay), to: day(s.lastDay) }) : app.month !== null ? cap(app.periodName!) : t('Year {year}', { year: app.year })}
    </p>
    <h1><span class="figure">{h(s.totalMin)}</span> {t('hours watched')}</h1>
    <p class="lead">
      {t("That's {days} of streams, across {active} and {channels}.", {
        days: plural(Math.floor(s.totalMin / 1440), 'full day', 'full days'),
        active: plural(s.activeDays, 'separate day', 'separate days'),
        channels: plural(s.channels.length, 'channel', 'channels'),
      })}
    </p>
  </section>

  <div class="stats four">
    <Stat
      value={n(s.channels.length)}
      label={t('Channels watched')}
      sub={app.year !== null ? t(app.month !== null ? '{n} discovered this month' : '{n} discovered this year', { n: n(s.newChannels) }) : ''}
    />
    <Stat value={n(s.games.length)} label={t('Categories')} />
    <Stat value={n(s.activeDays)} label={t('Active days')} sub={s.spanDays ? t('{p}% of the days in the period', { p: pct(s.activeDays, s.spanDays) }) : ''} />
    <Stat value={n(s.chat.msgs.length)} label={t('Chat messages')} sub={s.chat.channels.length ? t('in {n}', { n: plural(s.chat.channels.length, 'chat', 'chats') }) : ''} />
  </div>

  <section class="panel">
    <header class="panel-head">
      <h2>{t(UNIT[tl.unit])}</h2>
      {#if app.year === null && tl.unit === 'year'}<span class="hint">{t('Click a year to explore it')}</span>{/if}
    </header>
    <Bars height={260} items={tl.items} onpick={app.year === null && tl.unit === 'year' ? (i) => app.setYear(parseInt(tl.items[i].label), true) : undefined} />
    {#if tl.partial}<p class="chart-note">{tl.partial}</p>{/if}
  </section>

  <div class="split">
    <section class="panel">
      <header class="panel-head"><h2>{t('Streamers')}</h2><a class="more" href="#/streamers">{t('See all')}</a></header>
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
      <header class="panel-head"><h2>{t('Categories')}</h2><a class="more" href="#/categories">{t('See all')}</a></header>
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
          label={t('Your biggest day')}
          sub={t('on {date}, mostly with {name}', { date: day(s.biggestDay.day), name: app.chName(s.biggestDay.topCh) })}
        />
      {/if}
      {#if s.streak.len > 1}
        <Stat value={plural(s.streak.len, 'day', 'days')} label={t('In a row, not a day off')} sub={t('from {from} to {to}', { from: day(s.streak.from), to: day(s.streak.to) })} />
      {/if}
      {#if s.loyal}
        <Stat
          value={duration(s.loyal.last - s.loyal.first)}
          label={t('With {name}', { name: app.chName(s.loyal.ch) })}
          sub={t('your longest loyalty, since {date}', { date: day(s.loyal.first) })}
        />
      {/if}
      <Stat value={pc(pct(s.liveMin, s.totalMin))} label={t('Live')} sub={t('{d} as replays', { d: dur(s.vodMin) })} />
    </div>
    <p class="note">{t('Twitch counts the minutes of every device and every open tab: two streams watched at the same time count twice.')}</p>
  </section>

  {#if s.busiestDay && s.busiestDay.channels > 1}
    <section class="panel">
      <header class="panel-head"><h2>{t('Streams side by side')}</h2><span class="hint">{t('several channels open at once')}</span></header>
      <div class="split">
        <div>
          <div class="stats two">
            <Stat value={n1(s.avgChannels)} label={t('Channels per active day')} sub={t('on average')} />
            <Stat value={n(s.overDays)} label={t('Days over 24 h')} sub={s.activeDays ? t('{p}% of your active days', { p: pct(s.overDays, s.activeDays) }) : ''} />
          </div>
          <p class="note">
            {t('A day only has 24 hours: beyond that, several streams were necessarily running at once (several tabs, or phone and computer together). The export gives minutes per day and per channel, but not the time of each minute. So we can see how many streams overlapped, not exactly which ones at what time.')}
          </p>
        </div>
        <div>
          <h3 class="sub-h first">
            {t('The day you opened the most channels: {n} on {date}', { n: plural(s.busiestDay.channels, 'channel', 'channels'), date: day(s.busiestDay.day) })}
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
      <header class="panel-head"><h2>{t('Your week')}</h2><span class="hint">{t('mostly on {day}s', { day: weekdayName(favWd) })}</span></header>
      <Bars height={140} items={s.weekdays.map((v, i) => ({ label: weekdayShort(i), value: v, title: `${weekdayName(i)} : ${dur(v)}` }))} />
    </section>
    <section class="panel">
      <header class="panel-head">
        <h2>{t('Your hours')}</h2>
        {#if plays}<span class="hint">{t('peak around {h}:00', { h: favH })}{night / plays > 0.1 ? ', ' + t('{p}% at night', { p: pct(night, plays) }) : ''}</span>{/if}
      </header>
      {#if plays}
        <Bars height={140} items={s.hours.map((v, i) => ({ label: i % 3 === 0 ? `${i}h` : '', value: v, title: t('{h}:00: {n} streams started', { h: i, n: n(v) }) }))} />
      {:else}
        <Empty text={t('No times for this period.')} />
      {/if}
    </section>
  </div>

  {#if plat.length > 1}
    <section class="panel">
      <header class="panel-head"><h2>{t('Your screens')}</h2></header>
      <div class="stack" role="img" aria-label={t('Split by screen')}>
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
      <header class="panel-head"><h2>{t('Year by year')}</h2></header>
      <div class="years">
        {#each years as y (y.year)}
          <button class="year-card" onclick={() => app.setYear(y.year, true)}>
            <span class="year-n">{y.year}</span>
            <span class="year-h">{dur(y.min)}</span>
            {#if y.topGame >= 0}<BoxArt game={y.topGame} w={144} h={192} cls="year-art" />{/if}
            <dl>
              <dt>{t('Streamer')}</dt>
              <dd>{y.topCh >= 0 ? app.chName(y.topCh) : '?'}</dd>
              <dt>{t('Category')}</dt>
              <dd>{app.gameName(y.topGame)}</dd>
              <dt>{t('New channels')}</dt>
              <dd>{n(y.newChannels)}</dd>
            </dl>
          </button>
        {/each}
      </div>
    </section>
  {/if}
  {#if months.length}
    <section class="panel">
      <header class="panel-head"><h2>{t('Month by month')}</h2><span class="hint">{app.year}</span></header>
      <div class="years">
        {#each months as m (m.month)}
          <button class="year-card" onclick={() => app.setMonth(m.month, true)} title={t('See {month} in detail', { month: monthName(m.month) })}>
            <span class="year-n month-n">{monthName(m.month)}</span>
            <span class="year-h">{dur(m.min)}</span>
            {#if m.topGame >= 0}<BoxArt game={m.topGame} w={144} h={192} cls="year-art" />{/if}
            <dl>
              <dt>{t('Streamer')}</dt>
              <dd>{m.topCh >= 0 ? app.chName(m.topCh) : '?'}</dd>
              <dt>{t('Category')}</dt>
              <dd>{app.gameName(m.topGame)}</dd>
              <dt>{t('Active days')}</dt>
              <dd>{n(m.days)}{m.newChannels ? ` · ${plural(m.newChannels, 'channel discovered', 'channels discovered')}` : ''}</dd>
            </dl>
          </button>
        {/each}
      </div>
    </section>
  {/if}
{/if}
