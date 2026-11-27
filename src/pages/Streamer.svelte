<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { t } from '../lib/i18n/index.svelte';
  import { channelDetail, subMonths } from '../lib/stats';
  import { timeline, DAY } from '../lib/stats';
  import { h, n, day, date, dateTime, plural, share, duration, lang, dur } from '../lib/format';
  import Avatar from '../components/Avatar.svelte';
  import BoxArt from '../components/BoxArt.svelte';
  import Bars from '../components/Bars.svelte';
  import Stat from '../components/Stat.svelte';
  import Meter from '../components/Meter.svelte';
  import Empty from '../components/Empty.svelte';
  import ChatText from '../components/ChatText.svelte';
  import { analyseChat } from '../lib/words';

  let { ch }: { ch: number } = $props();
  const all = $derived(app.data ? app.stats : null);
  const exists = $derived(!!app.data?.channels[ch]);
  // Rank is all-time, independent of the year filter.
  const idx = $derived(app.index!);
  const rank = $derived(idx.rank.get(ch) ?? 0);
  const watchedCount = $derived(idx.total.size);
  const tl = $derived.by(() => {
    const days = new Map<number, number>();
    for (const w of idx.watch.get(ch) ?? []) days.set(w.day, (days.get(w.day) ?? 0) + w.min);
    return timeline(days, { endDay: Math.floor(app.data!.user.end / DAY), year: null, fmt: dur });
  });
  const det = $derived(exists ? channelDetail(app.data!, ch, rank, idx) : null);
  const u = $derived(app.user(ch));
  const old = $derived(app.oldNames(ch));
  const total = $derived(idx.allMin);
  const myMsgs = $derived(idx.chat.get(ch) ?? []);
  // The emote count reads every message of the channel: done after the first paint,
  // so opening the page shows the profile at once instead of waiting for it.
  let ready = $state(false);
  $effect(() => {
    void ch;
    ready = false;
    const t = setTimeout(() => (ready = true), 60);
    return () => clearTimeout(t);
  });
  const emo = $derived(ready ? analyseChat(myMsgs, app.data!.channels, app.emoteMap, app.knownEmotes) : null);
  const clips = $derived.by(() => {
    let c = 0;
    for (let i = 0; i < app.data!.clipCh.length; i++) if (app.data!.clipCh[i] === ch) c++;
    return c;
  });
  const vodCount = $derived(app.data!.watchedVods.filter((v) => v.ch === ch).length);
  // Your subscriber badge in this chat, from the last message that shows it.
  const subBadge = $derived.by(() => {
    let key = '';
    let months = 0;
    for (const m of myMsgs) {
      const b = m.badges?.find((x) => x.startsWith('subscriber/'));
      if (b) (key = b), (months = Math.max(months, m.subMonths ?? 0));
    }
    if (!key) return null;
    const best = { key, months };
    const id = app.data!.channels[ch]?.id;
    return { ...best, img: (id ? app.enrich?.channelBadges?.[id]?.[best.key] : undefined) ?? app.enrich?.badges?.[best.key] };
  });
  const TYPES: Record<string, string> = { partner: 'Partner', affiliate: 'Affiliate', '': 'No program' };
  const yearRow = $derived(app.year !== null && all ? all.channels.find((c) => c.ch === ch) : undefined);
</script>

{#if !det || !all}
  <Empty text={t('Channel not found.')} />
{:else}
  <a class="back" href="#/streamers">← {t('Streamers')}</a>
  <header class="profile">
    <Avatar {ch} size={88} />
    <div>
      <h1>{app.chName(ch)}</h1>
      <p class="lead">
        {[det.rank ? t('#{rank} of {total} channels', { rank: n(det.rank), total: n(watchedCount) }) : t('Never watched'), det.min ? t('{d} together', { d: dur(det.min) }) : '', det.min ? t('{p}% of your watch time', { p: share(det.min, total) }) : ''].filter(Boolean).join(' · ')}
      </p>
      <p class="muted">
        {#if old.length}{t('Former names:')} {old.join(', ')} · {/if}
        {#if app.gone(ch)}<span>{t('This channel no longer exists on Twitch (deleted or banned), hence no picture')}</span>{:else}<a href="https://www.twitch.tv/{app.login(ch)}" target="_blank" rel="noopener noreferrer">twitch.tv/{app.login(ch)} ↗</a>{/if}
      </p>
      <a class="btn small profile-share" href="#/share/streamers/{encodeURIComponent(app.login(ch))}">{t('Make a card to share')}</a>
    </div>
  </header>

  <div class="stats four">
    <Stat value={n(det.days)} label={t('Days together')} sub={t('from {from} to {to}', { from: day(det.first), to: day(det.last) })} />
    {#if app.year !== null}
      <Stat value="{yearRow ? h(yearRow.min) : '0'} h" label={t('In {period}', { period: app.periodName ?? '' })} sub={yearRow ? plural(yearRow.days, 'day', 'days') : t('not watched in this period')} />
    {:else}
      <Stat value={duration(det.last - det.first)} label={t('Since your first time')} />
    {/if}
    <Stat value={n(det.chat)} label={t('Messages in their chat')} />
    {#if det.follow}
      <Stat value={t(det.follow.following ? 'Followed' : 'Unfollowed')} label={t('Follow')} sub={t('since {date}', { date: date(det.follow.since) })} />
    {:else}
      <Stat value="—" label={t('Follow')} sub={t('no follow in the export')} />
    {/if}
  </div>

  <section class="panel">
    <header class="panel-head"><h2>{t(tl?.unit === 'day' ? 'Hours per day' : tl?.unit === 'month' ? 'Hours per month' : 'Hours per year')}</h2></header>
    <Bars height={200} items={(tl?.items ?? []).map((it) => ({ ...it, mark: tl?.unit === 'year' && app.year !== null && parseInt(it.label) === app.year }))} />
    {#if tl?.partial}<p class="chart-note">{tl.partial}</p>{/if}
  </section>

  <div class="split">
    <section class="panel">
      <header class="panel-head"><h2>{t("What you watched on {name}'s channel", { name: app.chName(ch) })}</h2></header>
      <ol class="rank">
        {#each det.games.slice(0, 10) as g (g.game)}
          <li>
            <BoxArt game={g.game} w={52} h={72} cls="thumb" />
            <a class="rank-name" href={app.gameHref(g.game)}>{app.gameName(g.game)}</a>
            <Meter value={g.min} max={det.games[0].min} />
            <span class="rank-val">{dur(g.min)}</span>
          </li>
        {/each}
      </ol>
    </section>
    <section class="panel">
      <header class="panel-head"><h2>{t('In detail')}</h2></header>
      <dl class="facts">
        {#if det.biggestDay}<dt>{t('Biggest day')}</dt><dd>{t('{d} on {date}', { d: dur(det.biggestDay.min), date: day(det.biggestDay.day) })}</dd>{/if}
        {#if det.vodMin}<dt>{t('As replays')}</dt><dd>{dur(det.vodMin)}</dd>{/if}
        {#if det.subs.length}
          <dt>{t('Subs')}</dt>
          <dd>{plural(det.subs.reduce((a, s) => a + subMonths(s), 0), 'month', 'months')}, {t('since {date}', { date: date(det.subs[0].start) })}</dd>
        {/if}
        {#if det.bits}<dt>{t('Bits')}</dt><dd>{n(det.bits)}</dd>{/if}
        {#if det.ads}<dt>{t('Ads seen')}</dt><dd>{n(det.ads)}</dd>{/if}
        {#if subBadge}<dt>{t('Your sub badge')}</dt><dd class="badge-dd">{#if subBadge.img}<img src={subBadge.img.url} alt="" width="20" height="20" />{/if}{subBadge.months ? plural(subBadge.months, 'month', 'months') : t('shown')}</dd>{/if}
        {#if vodCount}<dt>{t('Replays opened')}</dt><dd>{n(vodCount)}</dd>{/if}
        {#if clips}<dt>{t('Clips watched')}</dt><dd>{n(clips)}</dd>{/if}
        {#if u}<dt>{t('Channel')}</dt><dd>{t(TYPES[u.type] ?? u.type)}{u.createdAt ? ', ' + t('created on {date}', { date: date(Date.parse(u.createdAt)) }) : ''}</dd>{/if}
        {#if u?.lang}<dt>{t('Language today')}</dt><dd>{lang(u.lang)}</dd>{/if}
      </dl>
      {#if det.firstMsg}
        <figure class="chatline">
          <figcaption>{t("Your first message in {name}'s chat, on {date}", { name: app.chName(ch), date: dateTime(det.firstMsg.ts) })}</figcaption>
          <p><ChatText body={det.firstMsg.body} {ch} msg={det.firstMsg} /></p>
        </figure>
      {/if}
    </section>
  </div>

  {#if emo?.emotes.length}
    <section class="panel">
      <header class="panel-head"><h2>{t("Your emotes in {name}'s chat", { name: app.chName(ch) })}</h2><span class="hint">{t('{n} sent in {m}', { n: n(emo.emotesUsed), m: plural(myMsgs.length, 'message', 'messages') })}</span></header>
      <ol class="emotes">
        {#each emo.emotes.slice(0, 15) as e, i (e.emote.name)}
          <li title={e.emote.name}>
            <span class="emote-n">{i + 1}</span>
            <img src={e.emote.url} alt={e.emote.name} height="28" loading="lazy" referrerpolicy="no-referrer" />
            <span class="emote-name">{e.emote.name}</span>
            <span class="emote-count">{n(e.n)}</span>
          </li>
        {/each}
      </ol>
    </section>
  {/if}
{/if}
