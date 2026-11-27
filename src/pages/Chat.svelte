<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { analyseChat } from '../lib/words';
  import { yearOfTs } from '../lib/stats';
  import { h, n, day, dateTime, plural, pct } from '../lib/format';
  import Stat from '../components/Stat.svelte';
  import Bars from '../components/Bars.svelte';
  import Avatar from '../components/Avatar.svelte';
  import Meter from '../components/Meter.svelte';
  import Empty from '../components/Empty.svelte';
  import ChatText from '../components/ChatText.svelte';

  const s = $derived(app.stats!);
  const msgs = $derived(s.chat.msgs);
  const a = $derived(analyseChat(msgs, app.data!.channels, app.emoteMap));
  const PROVIDERS = { twitch: 'Twitch', '7tv': '7TV', bttv: 'BTTV', ffz: 'FFZ' } as const;

  const periods = $derived.by(() => {
    const m = new Map<number, number>();
    if (app.year === null) {
      for (const x of msgs) m.set(yearOfTs(x.ts), (m.get(yearOfTs(x.ts)) ?? 0) + 1);
      const ys = [...m.keys()];
      if (!ys.length) return [];
      const out = [];
      for (let y = Math.min(...ys); y <= Math.max(...ys); y++) out.push({ label: String(y), value: m.get(y) ?? 0 });
      return out;
    }
    for (const x of msgs) m.set(new Date(x.ts).getMonth(), (m.get(new Date(x.ts).getMonth()) ?? 0) + 1);
    return ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'].map((label, i) => ({ label, value: m.get(i) ?? 0 }));
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
  const maxW = $derived(a.words[0]?.n ?? 1);
</script>

<header class="page-head">
  <h1>Chat</h1>
  <p class="lead">Tout ce que tu as écrit{app.year !== null ? ` en ${app.year}` : ''}, et les emotes que tu utilises.</p>
</header>

{#if !msgs.length}
  <Empty text={app.year === null ? "Ton export ne contient aucun message." : `Aucun message en ${app.year}.`} />
{:else}
  <div class="stats four">
    <Stat value={n(msgs.length)} label="Messages" sub="{Math.round(s.chat.avgLen)} caractères en moyenne" />
    <Stat value={n(s.chat.channels.length)} label="Chats différents" />
    {#if s.chat.busiest}<Stat value={n(s.chat.busiest.n)} label="Messages en un jour" sub="le {day(s.chat.busiest.day)}" />{/if}
    {#if app.emoteMap}
      <Stat value={n(a.emotesUsed)} label="Emotes envoyées" sub="dans {pct(a.msgsWithEmote, msgs.length)} % de tes messages" />
    {/if}
  </div>

  <section class="panel">
    <header class="panel-head"><h2>Tes emotes</h2>
      {#if app.emoteMap}<span class="hint">{Object.entries(a.providers).filter(([, v]) => v).map(([k, v]) => `${PROVIDERS[k as keyof typeof PROVIDERS]} ${pct(v, a.emotesUsed)} %`).join(' · ')}</span>{/if}
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
        <Empty text="Aucune emote reconnue." />
      {/if}
      <p class="note">Emotes reconnues : les globales de Twitch, 7TV, BTTV et FFZ, et celles de chaque chat où tu as écrit ({n(app.enrich ? Object.keys(app.enrich.emotes.channels).length : 0)} chats chargés). Pour 7TV, les anciens sets d'emotes des chaînes comptent aussi. Une emote retirée et introuvable aujourd'hui n'est plus reconnue.</p>
    {:else if app.enrichState === 'loading'}
      <p class="muted">Chargement des emotes…</p>
    {:else}
      <p class="muted">Les emotes demandent les listes de Twitch, 7TV, BTTV et FFZ{app.offline ? ', désactivées en mode hors ligne' : ", qui n'ont pas pu être chargées"}. Elles restent visibles dans tes mots ci-dessous.</p>
    {/if}
  </section>

  <div class="split">
    <section class="panel">
      <header class="panel-head"><h2>Là où tu parles</h2></header>
      <ol class="rank">
        {#each s.chat.channels.slice(0, 12) as c, i (c.ch)}
          <li>
            <span class="rank-n">{i + 1}</span>
            <Avatar ch={c.ch} size={28} />
            <a class="rank-name" href="#/streamers/{c.ch}">{app.chName(c.ch)}</a>
            <Meter value={c.n} max={s.chat.channels[0].n} />
            <span class="rank-val">{n(c.n)}</span>
          </li>
        {/each}
      </ol>
    </section>
    <section class="panel">
      <header class="panel-head"><h2>Messages par {app.year === null ? 'année' : 'mois'}</h2></header>
      <Bars height={180} items={periods} unit=" messages" />
    </section>
  </div>

  <section class="panel">
    <header class="panel-head"><h2>Tes mots</h2></header>
    <div class="cloud">
      {#each a.words as w (w.w)}
        <span style:--w={0.85 + (w.n / maxW) * 1.3} title="{n(w.n)} messages">{w.w}</span>
      {/each}
    </div>
  </section>

  <div class="split">
    <section class="panel">
      <header class="panel-head"><h2>{app.year === null ? 'Ton tout premier message' : `Ton premier message de ${app.year}`}</h2></header>
      <figure class="chatline">
        <figcaption>{dateTime(msgs[0].ts)} · chez {app.chName(msgs[0].ch)}</figcaption>
        <p><ChatText body={msgs[0].body} ch={msgs[0].ch} /></p>
      </figure>
      <header class="panel-head"><h2>Un message au hasard</h2><button class="btn small" onclick={() => (random = Math.floor(Math.random() * msgs.length))}>Tirer</button></header>
      {#if random !== null && msgs[random]}
        <figure class="chatline">
          <figcaption>{dateTime(msgs[random].ts)} · chez {app.chName(msgs[random].ch)}</figcaption>
          <p><ChatText body={msgs[random].body} ch={msgs[random].ch} /></p>
        </figure>
      {/if}
    </section>
    <section class="panel">
      <header class="panel-head"><h2>Tes messages</h2><span class="hint">{plural(log.length, 'message', 'messages')}</span></header>
      <div class="log-tools">
        <input class="search" type="search" placeholder="Chercher" bind:value={q} aria-label="Chercher dans tes messages" oninput={() => (logLimit = 100)} />
        <select class="search" bind:value={chFilter} aria-label="Filtrer par chat" onchange={() => (logLimit = 100)}>
          <option value={-1}>Tous les chats</option>
          {#each s.chat.channels as c (c.ch)}<option value={c.ch}>{app.chName(c.ch)} ({n(c.n)})</option>{/each}
        </select>
      </div>
      <ul class="chatlog">
        {#each log.slice(0, logLimit) as m, i (i)}
          <li><span class="chatlog-meta">{dateTime(m.ts)} · {app.chName(m.ch)}</span><ChatText body={m.body} ch={m.ch} /></li>
        {/each}
      </ul>
      {#if log.length > logLimit}<button class="btn small" onclick={() => (logLimit += 200)}>Afficher plus</button>{/if}
    </section>
  </div>
{/if}
