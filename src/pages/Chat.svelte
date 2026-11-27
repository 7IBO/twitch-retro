<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { t } from '../lib/i18n/index.svelte';
  import { analyseChat } from '../lib/words';
  import { timeline, localDay, DAY } from '../lib/stats';
  import { h, n, day, dateTime, plural, pct, pc } from '../lib/format';
  import Stat from '../components/Stat.svelte';
  import Bars from '../components/Bars.svelte';
  import Avatar from '../components/Avatar.svelte';
  import Meter from '../components/Meter.svelte';
  import Empty from '../components/Empty.svelte';
  import ChatText from '../components/ChatText.svelte';
  import Combobox from '../components/Combobox.svelte';

  const s = $derived(app.stats!);
  const msgs = $derived(s.chat.msgs);
  const a = $derived(analyseChat(msgs, app.data!.channels, app.emoteMap, app.knownEmotes));
  const PROVIDERS = { twitch: 'Twitch', '7tv': '7TV', bttv: 'BTTV', ffz: 'FFZ' } as const;

  const ctl = $derived.by(() => {
    const m = new Map<number, number>();
    for (const x of msgs) {
      const d = localDay(x.ts);
      m.set(d, (m.get(d) ?? 0) + 1);
    }
    return timeline(m, { endDay: Math.floor(app.data!.user.end / DAY), year: app.year, month: app.month, fmt: (v) => plural(v, 'message', 'messages') });
  });


  let q = $state('');
  let chFilter = $state(-1);
  let logLimit = $state(100);
  const log = $derived.by(() => {
    const query = q.trim().toLowerCase();
    const out = [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (chFilter >= 0 && m.ch !== chFilter) continue;
      if (query && !m.body.toLowerCase().includes(query)) continue;
      out.push(m);
    }
    return out;
  });
  let random = $state<number | null>(null);
  $effect(() => {
    if (random === null && msgs.length) random = Math.floor(Math.random() * msgs.length);
  });
  const maxW = $derived(a.words[0]?.n ?? 1);

  // Badges and replies come from the chat tags Twitch kept (recent messages only).
  // Only the badges shown next to your name, from messages since 2023: not your whole collection.
  const shownBadges = $derived.by(() => {
    const sets = new Map<string, { key: string; n: number; first: number; last: number }>();
    for (const m of msgs)
      for (const b of m.badges ?? []) {
        const set = b.split('/')[0];
        if (set === 'subscriber') continue;
        const e = sets.get(set);
        if (!e) sets.set(set, { key: b, n: 1, first: m.ts, last: m.ts });
        else {
          e.n++;
          if (m.ts > e.last) (e.last = m.ts), (e.key = b);
        }
      }
    return [...sets.values()].sort((x, y) => y.n - x.n);
  });
  const replies = $derived.by(() => {
    const r = new Map<string, number>();
    for (const m of msgs) if (m.replyTo) r.set(m.replyTo, (r.get(m.replyTo) ?? 0) + 1);
    return [...r.entries()].sort((x, y) => y[1] - x[1]);
  });
</script>

<header class="page-head">
  <h1>{t('Chat')}</h1>
  <p class="lead">{t('Tout ce que tu as écrit')}{app.periodEn}{t(', et les emotes que tu utilises.')}</p>
</header>

{#if !msgs.length}
  <Empty text={app.year === null ? t('Ton export ne contient aucun message.') : t('Aucun message') + app.periodEn + '.'} />
{:else}
  <div class="stats four">
    <Stat value={n(msgs.length)} label={t('Messages')} sub={t('{n} caractères en moyenne', { n: Math.round(s.chat.avgLen) })} />
    <Stat value={n(s.chat.channels.length)} label={t('Chats différents')} />
    {#if s.chat.busiest}<Stat value={n(s.chat.busiest.n)} label={t('Messages en un jour')} sub={t('le {date}', { date: day(s.chat.busiest.day) })} />{/if}
    {#if app.emoteMap}
      <Stat value={n(a.emotesUsed)} label={t('Emotes envoyées')} sub={t('dans {p} % de tes messages', { p: pct(a.msgsWithEmote, msgs.length) })} />
    {/if}
  </div>

  <section class="panel">
    <header class="panel-head"><h2>{t('Tes emotes')}</h2>
      {#if app.emoteMap}<span class="hint">{Object.entries(a.providers).filter(([, v]) => v).map(([k, v]) => `${PROVIDERS[k as keyof typeof PROVIDERS]} ${pc(pct(v, a.emotesUsed))}`).join(' · ')}</span>{/if}
    </header>
    {#if app.emoteMap}
      {#if a.emotes.length}
        <ol class="emotes">
          {#each a.emotes.slice(0, 30) as e, i (e.emote.name)}
            <li title="{e.emote.name} · {PROVIDERS[e.emote.provider]}">
              <span class="emote-n">{i + 1}</span>
              <img src={e.emote.url} alt={e.emote.name} height="28" loading="lazy" referrerpolicy="no-referrer" />
              <span class="emote-name">{e.emote.name}</span>
              <span class="emote-count">{n(e.n)}</span>
            </li>
          {/each}
        </ol>
      {:else}
        <Empty text={t('Aucune emote reconnue.')} />
      {/if}
      <p class="note">{t("Emotes reconnues : les globales de Twitch, 7TV, BTTV et FFZ, et celles de chaque chat où tu as écrit ({n} chats chargés). Pour 7TV, les anciens sets d'emotes des chaînes comptent aussi. Une emote retirée et introuvable aujourd'hui n'est plus reconnue.", { n: n(app.enrich ? Object.keys(app.enrich.emotes.channels).length : 0) })}</p>
    {:else if app.enrichState === 'loading'}
      <p class="muted">{t('Chargement des emotes…')}</p>
    {:else}
      <p class="muted">{t('Les emotes demandent les listes de Twitch, 7TV, BTTV et FFZ')}{app.offline ? t(', désactivées en mode hors ligne') : t(", qui n'ont pas pu être chargées")}. {t('Elles restent visibles dans tes mots ci-dessous.')}</p>
    {/if}
  </section>

  <section class="panel">
    <header class="panel-head"><h2>{t(ctl.unit === 'jour' ? 'Messages par jour' : ctl.unit === 'mois' ? 'Messages par mois' : 'Messages par année')}</h2></header>
    <Bars height={200} items={ctl.items} />
    {#if ctl.partial}<p class="chart-note">{ctl.partial}</p>{/if}
  </section>

  <div class="split">
    <section class="panel">
      <header class="panel-head"><h2>{t('Là où tu parles')}</h2></header>
      <ol class="rank">
        {#each s.chat.channels.slice(0, 12) as c, i (c.ch)}
          <li>
            <span class="rank-n">{i + 1}</span>
            <Avatar ch={c.ch} size={28} />
            <a class="rank-name" href={app.chHref(c.ch)}>{app.chName(c.ch)}</a>
            <Meter value={c.n} max={s.chat.channels[0].n} />
            <span class="rank-val">{n(c.n)}</span>
          </li>
        {/each}
      </ol>
    </section>
    <section class="panel">
      <header class="panel-head"><h2>{t('Tes mots')}</h2></header>
      <div class="cloud">
        {#each a.words as w (w.w)}
          <span style:--w={0.85 + (w.n / maxW) * 1.3} title={plural(w.n, 'message', 'messages')}>{w.w}</span>
        {/each}
      </div>
    </section>
  </div>

  {#if a.retired.length}
    <section class="panel">
      <header class="panel-head"><h2>{t('Anciennes emotes')}</h2><span class="hint">{t('sans image, retirées depuis')}</span></header>
      <div class="cloud">
        {#each a.retired as r (r.name)}<span style:--w={0.85 + (r.n / a.retired[0].n) * 0.9} title={plural(r.n, "fois", "fois")}>{r.name}</span>{/each}
      </div>
      <p class="note">{t("Des noms au format des emotes de sub (comme kaydopV) qui n'existent plus aujourd'hui. Leur image n'est plus récupérable, sauf pour tes messages depuis 2023, où Twitch a gardé l'identifiant de chaque emote.")}</p>
    </section>
  {/if}

  {#if shownBadges.length}
    <section class="panel">
      <header class="panel-head"><h2>{t('Badges affichés')}</h2><span class="hint">{t('à côté de ton pseudo, dans tes messages depuis 2023')}</span></header>
      <ul class="badge-strip">
        {#each shownBadges as b (b.key)}
          {@const info = app.enrich?.badges?.[b.key]}
          <li title="{plural(b.n, 'message', 'messages')} · {day(localDay(b.first))} → {day(localDay(b.last))}">
            {#if info}<img src={info.url} alt="" width="24" height="24" loading="lazy" referrerpolicy="no-referrer" />{/if}
            <span>{info?.title ?? b.key.split('/')[0]}</span>
          </li>
        {/each}
      </ul>
      <p class="note">{t("Twitch ne garde que le badge visible au moment de chaque message, pas la liste de tous ceux que tu possèdes. Ton badge d'abonné est sur la fiche de chaque streamer.")}</p>
    </section>
  {/if}

  {#if replies.length}
  <section class="panel">
    <header class="panel-head"><h2>{t('Tu réponds le plus à')}</h2></header>
    {#if replies.length}
      <ol class="rank">
        {#each replies.slice(0, 12) as [login, c], i (login)}
          <li><span class="rank-n">{i + 1}</span><span class="rank-name mention">@{login}</span><Meter value={c} max={replies[0][1]} /><span class="rank-val">{n(c)}</span></li>
        {/each}
      </ol>
    {:else}
      <Empty text={t('Aucune réponse enregistrée sur cette période.')} />
    {/if}
  </section>
  {/if}

  <div class="split">
    <section class="panel">
      <header class="panel-head"><h2>{app.year === null ? t('Ton tout premier message') : t('Ton premier message') + app.periodEn}</h2></header>
      <figure class="chatline">
        <figcaption>{dateTime(msgs[0].ts)} · {t('chez {name}', { name: app.chName(msgs[0].ch) })}</figcaption>
        <p><ChatText body={msgs[0].body} ch={msgs[0].ch} msg={msgs[0]} /></p>
      </figure>
    </section>
    <section class="panel">
      <header class="panel-head"><h2>{t('Un message au hasard')}</h2><button class="btn small" onclick={() => (random = Math.floor(Math.random() * msgs.length))}>{t('Tirer')}</button></header>
      {#if random !== null && msgs[random]}
        <figure class="chatline">
          <figcaption>{dateTime(msgs[random].ts)} · {t('chez {name}', { name: app.chName(msgs[random].ch) })}</figcaption>
          <p><ChatText body={msgs[random].body} ch={msgs[random].ch} msg={msgs[random]} /></p>
        </figure>
      {/if}
    </section>
  </div>

  <section class="panel">
      <header class="panel-head"><h2>{t('Tes messages')}</h2><span class="hint">{plural(log.length, 'message', 'messages')}</span></header>
      <div class="log-tools">
        <input class="search" type="search" placeholder={t('Chercher')} bind:value={q} aria-label={t('Chercher dans tes messages')} oninput={() => (logLimit = 100)} />
        <Combobox
          label={t('Filtrer par chat')}
          allLabel={t('Tous les chats')}
          bind:value={chFilter}
          onchange={() => (logLimit = 100)}
          options={s.chat.channels.map((c) => ({ value: c.ch, label: app.chName(c.ch), meta: n(c.n), ch: c.ch }))}
        />
      </div>
      <ul class="chatlog">
        {#each log.slice(0, logLimit) as m, i (i)}
          <li><span class="chatlog-meta">{dateTime(m.ts)} · {app.chName(m.ch)}</span><ChatText body={m.body} ch={m.ch} msg={m} /></li>
        {/each}
      </ul>
      {#if log.length > logLimit}<button class="btn small" onclick={() => (logLimit += 200)}>Afficher plus</button>{/if}
  </section>
{/if}
