import './style.css';
import type { RetroData, WorkerMsg } from './types';
import { availableYears, compute, yearly, type Stats } from './stats';

const app = document.querySelector<HTMLDivElement>('#app')!;
const DAY = 86400000;

// ---------- formatting ----------

const nf = new Intl.NumberFormat('fr-FR');
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const hours = (min: number) => nf.format(Math.round(min / 60));
const hoursFine = (min: number) => (min < 600 ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(min / 60) : hours(min));
const n = (x: number) => nf.format(x);
const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const dateLocal = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
const fmtDay = (day: number) => dateFmt.format(new Date(day * DAY));
const fmtTs = (t: number) => dateLocal.format(new Date(t));
const plural = (x: number, one: string, many: string) => `${n(x)} ${x > 1 ? many : one}`;

// ---------- state ----------

let data: RetroData | null = null;
let year: number | null = null;
let showAllChannels = false;
let showAllGames = false;

// ---------- landing ----------

function landing(error?: string) {
  app.innerHTML = `
  <main class="landing">
    <div class="landing-inner">
      <p class="eyebrow">Rétrospective all-time</p>
      <h1>Toutes tes années Twitch,<br/>en une page.</h1>
      <p class="lead">Dépose le zip de ton export de données Twitch. Tes heures, tes streamers, tes jeux, ton chat : tout est calculé ici, dans ton navigateur.</p>
      <label class="drop" id="drop">
        <input type="file" id="file" accept=".zip,application/zip" hidden />
        <span class="drop-icon" aria-hidden="true">⬇</span>
        <span class="drop-title">Glisse ton fichier <code>.zip</code> ici</span>
        <span class="drop-sub">ou clique pour le choisir</span>
      </label>
      ${error ? `<p class="error">${esc(error)}</p>` : ''}
      <p class="muted howto">Pas encore de zip ? Demande-le dans <a href="https://www.twitch.tv/settings/security" target="_blank" rel="noopener noreferrer">Paramètres Twitch › Sécurité et confidentialité</a>, bouton « Télécharger vos données ». Twitch peut mettre plusieurs semaines à l'envoyer.</p>
      <ul class="promises">
        <li><strong>Rien ne quitte ton ordinateur.</strong> Pas de serveur, pas de stockage, pas de compte. Ferme l'onglet et tout disparaît.</li>
        <li><strong>Tes données privées restent fermées.</strong> Seuls les fichiers de visionnage, de chat, de follows et de subs sont ouverts. Les IP, villes, appareils et pages vues ne sont jamais lus.</li>
        <li><strong>Seules les jaquettes des jeux</strong> sont chargées depuis le CDN public de Twitch.</li>
      </ul>
    </div>
  </main>`;
  const input = app.querySelector<HTMLInputElement>('#file')!;
  const drop = app.querySelector<HTMLLabelElement>('#drop')!;
  input.addEventListener('change', () => input.files?.[0] && load(input.files[0]));
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    const f = e.dataTransfer?.files[0];
    if (f) load(f);
  });
}

function loading(step: string) {
  app.innerHTML = `<main class="landing"><div class="loading"><div class="spinner"></div><p>${esc(step)}…</p></div></main>`;
}

async function load(file: File) {
  loading('Lecture du fichier');
  const buf = await file.arrayBuffer();
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
    const m = e.data;
    if (m.type === 'progress') loading(m.step);
    else if (m.type === 'error') {
      worker.terminate();
      landing(m.message);
    } else {
      worker.terminate();
      data = m.data;
      console.info('Rétro Twitch: unzip %d ms, parse %d ms', m.data.timings.unzip, m.data.timings.parse);
      year = null;
      render();
      window.scrollTo(0, 0);
    }
  };
  worker.onerror = (e) => landing(e.message || 'Erreur pendant la lecture du fichier.');
  worker.postMessage(buf, [buf]);
}

// ---------- building blocks ----------

function hue(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

function avatar(ch: number, size = 40) {
  const c = data!.channels[ch];
  const name = c?.name ?? '?';
  return `<span class="avatar" style="--h:${hue(c?.id ?? name)};--s:${size}px" aria-hidden="true">${esc(name.slice(0, 1).toUpperCase())}</span>`;
}

function chName(ch: number) {
  const c = data!.channels[ch];
  return c ? esc(c.name) : '?';
}

function chLink(ch: number) {
  const c = data!.channels[ch];
  if (!c) return '?';
  return `<a href="https://www.twitch.tv/${encodeURIComponent(c.name)}" target="_blank" rel="noopener noreferrer">${esc(c.name)}</a>`;
}

function gameName(g: number) {
  return g >= 0 ? esc(data!.games[g].name) : 'Catégorie inconnue';
}

function boxart(g: number, w = 144, h = 192) {
  if (g < 0) return `<div class="boxart empty" style="aspect-ratio:${w}/${h}"></div>`;
  const name = data!.games[g].name;
  const src = `https://static-cdn.jtvnw.net/ttv-boxart/${encodeURIComponent(name)}-${w}x${h}.jpg`;
  return `<img class="boxart" src="${src}" alt="" loading="lazy" referrerpolicy="no-referrer" width="${w}" height="${h}" />`;
}

function barChart(items: { label: string; value: number; title: string }[], cls = '') {
  const max = Math.max(1, ...items.map((i) => i.value));
  return `<div class="bars ${cls}">${items
    .map(
      (i) => `<div class="bar" title="${esc(i.title)}">
        <div class="bar-fill" style="height:${(i.value / max) * 100}%"></div>
        <span class="bar-label">${esc(i.label)}</span>
      </div>`,
    )
    .join('')}</div>`;
}

const card = (value: string, label: string, sub = '') =>
  `<div class="stat"><div class="stat-value">${value}</div><div class="stat-label">${label}</div>${sub ? `<div class="stat-sub">${sub}</div>` : ''}</div>`;

// ---------- sections ----------

function hero(s: Stats) {
  const login = data!.user.login || data!.channels[0]?.name || '';
  const fullDays = Math.floor(s.totalMin / 1440);
  const period = year === null ? `Depuis le ${fmtDay(s.firstDay)}` : `En ${year}`;
  return `
  <section class="hero">
    <p class="eyebrow">${esc(period)}${login ? `, ${esc(login)}` : ''}</p>
    <h1><span class="big">${hours(s.totalMin)}</span> heures de Twitch</h1>
    <p class="lead">Soit <strong>${plural(fullDays, 'jour entier', 'jours entiers')}</strong> devant des streams, répartis sur ${plural(s.activeDays, 'journée', 'journées')} différentes.</p>
    <div class="stats">
      ${card(n(s.channelCount), 'chaînes regardées', year !== null ? `dont ${n(s.newChannels)} découvertes cette année` : '')}
      ${card(n(s.gameCount), 'catégories')}
      ${card(n(s.activeDays), 'jours actifs', s.spanDays ? `${Math.round((s.activeDays / s.spanDays) * 100)} % des jours de la période` : '')}
      ${card(hoursFine(s.totalMin / Math.max(1, s.activeDays)), 'heures par jour actif')}
      ${card(n(s.chat.count), 'messages dans le chat')}
      ${card(n(s.follows.count), 'follows')}
    </div>
  </section>`;
}

function yearTabs() {
  const ys = availableYears(data!);
  const tab = (y: number | null, label: string) =>
    `<button class="tab ${year === y ? 'active' : ''}" data-year="${y ?? ''}">${label}</button>`;
  return `<nav class="tabs" aria-label="Période">${tab(null, 'Tout')}${ys.map((y) => tab(y, String(y))).join('')}</nav>`;
}

function timeline(s: Stats) {
  const items = s.months.map((m) => ({
    label: year === null ? m.key.slice(2) : monthFmt.format(new Date(m.key + '-01T00:00:00Z')).replace('.', ''),
    value: m.min,
    title: `${year === null ? m.key : m.key}: ${hours(m.min)} h`,
  }));
  return `<section class="panel"><h2>${year === null ? 'Heures par année' : 'Heures par mois'}</h2>${barChart(items, 'tall')}</section>`;
}

function topChannels(s: Stats) {
  if (!s.channels.length) return '';
  const [first, ...rest] = s.channels;
  const list = rest.slice(0, showAllChannels ? 99 : 19);
  const max = first.min;
  const c0 = data!.channels[first.ch];
  return `
  <section class="panel" id="streamers">
    <h2>Tes streamers</h2>
    <div class="champion">
      ${avatar(first.ch, 96)}
      <div>
        <p class="eyebrow">Numéro 1</p>
        <h3>${chLink(first.ch)}</h3>
        <p><strong>${hours(first.min)} h</strong> ensemble, sur ${plural(first.days, 'jour', 'jours')}, soit ${Math.round((first.min / s.totalMin) * 100)} % de ton temps de visionnage.</p>
        <p class="muted">Du ${fmtDay(first.first)} au ${fmtDay(first.last)}${first.topGame >= 0 ? `, surtout en ${gameName(first.topGame)}` : ''}.</p>
        ${c0.oldNames.length ? `<p class="muted">Anciens pseudos : ${c0.oldNames.map(esc).join(', ')}</p>` : ''}
      </div>
    </div>
    <ol class="rank" start="2">
      ${list
        .map((c) => {
          const ch = data!.channels[c.ch];
          return `<li>
            <span class="rank-n"></span>
            ${avatar(c.ch)}
            <div class="rank-body">
              <div class="rank-top"><span class="rank-name">${chLink(c.ch)}</span><span class="rank-val">${hours(c.min)} h</span></div>
              <div class="meter"><div style="width:${(c.min / max) * 100}%"></div></div>
              <div class="rank-meta">${plural(c.days, 'jour', 'jours')} · ${fmtDay(c.first)} → ${fmtDay(c.last)}${c.topGame >= 0 ? ` · ${gameName(c.topGame)}` : ''}${ch.oldNames.length ? ` · ex ${ch.oldNames.map(esc).join(', ')}` : ''}</div>
            </div>
          </li>`;
        })
        .join('')}
    </ol>
    ${rest.length > 19 ? `<button class="more" data-toggle="channels">${showAllChannels ? 'Voir moins' : 'Voir le top 100'}</button>` : ''}
  </section>`;
}

function topGames(s: Stats) {
  if (!s.games.length) return '';
  const grid = s.games.slice(0, 12);
  const list = s.games.slice(12, showAllGames ? 100 : 30);
  const max = s.games[0].min;
  return `
  <section class="panel" id="jeux">
    <h2>Tes catégories</h2>
    <div class="games">
      ${grid
        .map(
          (g, i) => `<figure class="game">
            <div class="game-art">${boxart(g.game, 285, 380)}<span class="game-rank">${i + 1}</span></div>
            <figcaption><strong>${gameName(g.game)}</strong><span>${hours(g.min)} h · ${plural(g.channels, 'chaîne', 'chaînes')}</span>${g.topCh >= 0 ? `<span class="muted">surtout chez ${chName(g.topCh)}</span>` : ''}</figcaption>
          </figure>`,
        )
        .join('')}
    </div>
    ${
      list.length
        ? `<ol class="rank small" start="13">${list
            .map(
              (g) => `<li><span class="rank-n"></span>${boxart(g.game, 52, 72)}<div class="rank-body">
                <div class="rank-top"><span class="rank-name">${gameName(g.game)}</span><span class="rank-val">${hoursFine(g.min)} h</span></div>
                <div class="meter"><div style="width:${(g.min / max) * 100}%"></div></div>
              </div></li>`,
            )
            .join('')}</ol>`
        : ''
    }
    ${s.games.length > 30 ? `<button class="more" data-toggle="games">${showAllGames ? 'Voir moins' : 'Voir le top 100'}</button>` : ''}
  </section>`;
}

function years() {
  if (year !== null) return '';
  const ys = yearly(data!);
  return `
  <section class="panel">
    <h2>Année par année</h2>
    <div class="years">
      ${ys
        .map(
          (y) => `<button class="year-card" data-year="${y.year}">
            <div class="year-head"><span class="year-n">${y.year}</span><span class="year-h">${hours(y.min)} h</span></div>
            ${y.topGame >= 0 ? `<div class="year-art">${boxart(y.topGame, 144, 192)}</div>` : ''}
            <dl>
              <dt>Streamer</dt><dd>${y.topCh >= 0 ? chName(y.topCh) : '?'}</dd>
              <dt>Jeu</dt><dd>${gameName(y.topGame)}</dd>
              <dt>Nouvelles chaînes</dt><dd>${n(y.newChannels)}</dd>
            </dl>
          </button>`,
        )
        .join('')}
    </div>
  </section>`;
}

function rhythm(s: Stats) {
  const wd = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
  const favWd = s.weekdays.indexOf(Math.max(...s.weekdays));
  const favH = s.hours.indexOf(Math.max(...s.hours));
  const totalPlays = s.hours.reduce((a, b) => a + b, 0);
  const night = s.hours.slice(0, 6).reduce((a, b) => a + b, 0);
  const wdFull = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  return `
  <section class="panel two">
    <div>
      <h2>Ta semaine</h2>
      <p class="muted">Ton jour préféré : <strong>le ${wdFull[favWd]}</strong>.</p>
      ${barChart(s.weekdays.map((v, i) => ({ label: wd[i], value: v, title: `${wdFull[i]}: ${hours(v)} h` })))}
    </div>
    <div>
      <h2>Tes heures</h2>
      <p class="muted">${totalPlays ? `Tu lances le plus de streams vers <strong>${favH} h</strong>${night / totalPlays > 0.1 ? `, et ${Math.round((night / totalPlays) * 100)} % entre minuit et 6 h` : ''}.` : 'Pas de données horaires sur cette période.'}</p>
      ${barChart(s.hours.map((v, i) => ({ label: i % 3 === 0 ? `${i}h` : '', value: v, title: `${i} h: ${n(v)} lancements` })), 'hours')}
    </div>
  </section>`;
}

function records(s: Stats) {
  const items: string[] = [];
  if (s.biggestDay)
    items.push(
      card(`${hoursFine(s.biggestDay.min)} h`, 'ta plus grosse journée', `le ${fmtDay(s.biggestDay.day)}, surtout chez ${chName(s.biggestDay.topCh)}`),
    );
  if (s.streak.len > 1) items.push(card(plural(s.streak.len, 'jour', 'jours'), "d'affilée sans rater un jour", `du ${fmtDay(s.streak.from)} au ${fmtDay(s.streak.to)}`));
  if (s.loyal) {
    const span = s.loyal.last - s.loyal.first;
    const dur = span >= 365 ? plural(Math.floor(span / 365.25), 'an', 'ans') : plural(Math.max(1, Math.round(span / 30)), 'mois', 'mois');
    items.push(card(dur, `de fidélité à ${chName(s.loyal.ch)}`, `depuis le ${fmtDay(s.loyal.first)}`));
  }
  if (s.totalMin) items.push(card(`${Math.round((s.liveMin / s.totalMin) * 100)} %`, 'en direct', `${hours(s.vodMin)} h en rediffusion`));
  return items.length ? `<section class="panel"><h2>Tes records</h2><div class="stats">${items.join('')}</div></section>` : '';
}

function chat(s: Stats) {
  const c = s.chat;
  if (!c.count) return '';
  const maxW = c.words[0]?.n ?? 1;
  return `
  <section class="panel" id="chat">
    <h2>Ton chat</h2>
    <div class="stats">
      ${card(n(c.count), 'messages envoyés', `${Math.round(c.avgLen)} caractères en moyenne`)}
      ${c.busiest ? card(n(c.busiest.n), 'messages en un jour', `le ${fmtDay(c.busiest.day)}`) : ''}
      ${card(n(c.channels.length), 'chats différents')}
    </div>
    <div class="two">
      <div>
        <h3>Là où tu parles le plus</h3>
        <ol class="rank small">
          ${c.channels
            .slice(0, 10)
            .map(
              (x) => `<li><span class="rank-n"></span>${avatar(x.ch, 32)}<div class="rank-body">
              <div class="rank-top"><span class="rank-name">${chLink(x.ch)}</span><span class="rank-val">${n(x.n)}</span></div>
              <div class="meter"><div style="width:${(x.n / c.channels[0].n) * 100}%"></div></div></div></li>`,
            )
            .join('')}
        </ol>
      </div>
      <div>
        <h3>Tes mots</h3>
        <div class="cloud">${c.words
          .map((w) => `<span style="--w:${0.8 + (w.n / maxW) * 1.4}" title="${n(w.n)} messages">${esc(w.w)}</span>`)
          .join('')}</div>
        ${
          c.first
            ? `<h3>${year === null ? 'Ton tout premier message' : `Ton premier message de ${year}`}</h3>
          <blockquote class="quote">« ${esc(c.first.body)} »<footer>chez ${chName(c.first.ch)}, le ${fmtTs(c.first.ts)}</footer></blockquote>`
            : ''
        }
      </div>
    </div>
  </section>`;
}

function support(s: Stats) {
  const f = s.follows, sb = s.subs, b = s.bits;
  if (!f.count && !sb.total && !b.total) return '';
  return `
  <section class="panel two" id="soutien">
    <div>
      <h2>Follows</h2>
      <div class="stats">
        ${card(n(f.count), 'follows')}
        ${card(n(f.unfollows), 'unfollows')}
      </div>
      ${f.first ? `<p class="muted">${year === null ? 'Premier follow' : `Premier follow de ${year}`} : <strong>${chName(f.first.ch)}</strong>, le ${fmtTs(f.first.ts)}.</p>` : ''}
      ${f.last && f.last !== f.first ? `<p class="muted">Dernier : <strong>${chName(f.last.ch)}</strong>, le ${fmtTs(f.last.ts)}.</p>` : ''}
    </div>
    <div>
      <h2>Subs et bits</h2>
      <div class="stats">
        ${card(n(sb.total), 'subs', [sb.paid && `${n(sb.paid)} payés`, sb.gift && `${n(sb.gift)} offerts par d'autres`, sb.prime && `${n(sb.prime)} Prime`].filter(Boolean).join(' · '))}
        ${b.total ? card(n(b.total), 'bits envoyés', b.channels.slice(0, 3).map((x) => chName(x.ch)).join(', ')) : ''}
      </div>
      ${
        sb.channels.length
          ? `<p class="muted">Tes chaînes les plus soutenues : ${sb.channels
              .slice(0, 6)
              .map((x) => `<strong>${chName(x.ch)}</strong> (${plural(x.months, 'mois', 'mois')})`)
              .join(', ')}.</p>`
          : ''
      }
    </div>
  </section>`;
}

function you() {
  if (year !== null) return '';
  const u = data!.user;
  const b = data!.broadcast;
  if (!u.renames.length && !b.minutes) return '';
  const names = u.renames.length ? [u.renames[0].from, ...u.renames.map((r) => r.to)] : [];
  return `
  <section class="panel two">
    ${
      names.length
        ? `<div><h2>Tes pseudos</h2><ol class="names">${names
            .map((nm, i) => `<li><strong>${esc(nm)}</strong>${i > 0 ? `<span class="muted">depuis le ${fmtTs(u.renames[i - 1].ts)}</span>` : ''}</li>`)
            .join('')}</ol></div>`
        : ''
    }
    ${
      b.minutes
        ? `<div><h2>Ta chaîne</h2><div class="stats">
            ${card(hoursFine(b.minutes), 'heures en live', `sur ${plural(b.days, 'jour', 'jours')}`)}
            ${data!.vods ? card(n(data!.vods), 'VOD créées') : ''}
          </div>
          ${b.games.length ? `<p class="muted">Surtout en ${b.games.slice(0, 3).map((g) => `<strong>${gameName(g.game)}</strong>`).join(', ')}, du ${fmtTs(b.firstTs)} au ${fmtTs(b.lastTs)}.</p>` : ''}</div>`
        : ''
    }
  </section>`;
}

function render() {
  if (!data) return landing();
  const s = compute(data, year);
  app.innerHTML = `
  <header class="top">
    <span class="brand">Rétro Twitch</span>
    <button class="ghost" id="reset">Charger un autre export</button>
  </header>
  ${yearTabs()}
  <main class="results">
    ${hero(s)}
    ${timeline(s)}
    ${topChannels(s)}
    ${topGames(s)}
    ${years()}
    ${rhythm(s)}
    ${records(s)}
    ${chat(s)}
    ${support(s)}
    ${you()}
    <footer class="foot">
      <p>Calculé dans ton navigateur à partir de ton export. Rien n'a été envoyé ni enregistré : recharge la page et tout est effacé.</p>
      <p class="muted">Les heures viennent de <code>minute_watched.csv</code>. Les streamers sont regroupés par identifiant de chaîne, donc un changement de pseudo ne coupe pas l'historique. Les heures de la journée sont celles où tu lances une vidéo, dans ton fuseau horaire. Site non affilié à Twitch.</p>
    </footer>
  </main>`;
}

app.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-year], [data-toggle], #reset');
  if (!el) return;
  if (el.id === 'reset') {
    data = null;
    landing();
    return;
  }
  if (el.dataset.toggle === 'channels') showAllChannels = !showAllChannels;
  else if (el.dataset.toggle === 'games') showAllGames = !showAllGames;
  else if (el.dataset.year !== undefined) {
    year = el.dataset.year ? +el.dataset.year : null;
    showAllChannels = showAllGames = false;
    render();
    document.querySelector('.tabs')?.scrollIntoView({ block: 'start' });
    return;
  }
  render();
});

landing();
