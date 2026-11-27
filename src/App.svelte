<script lang="ts">
  import { app } from './lib/state.svelte';
  import { availableYears } from './lib/stats';
  import { date } from './lib/format';
  import { t, monthShort } from './lib/i18n/index.svelte';
  import LangSwitch from './components/LangSwitch.svelte';
  import { slide, rankDigits } from './lib/slide';
  import Search from './components/Search.svelte';
  import Landing from './pages/Landing.svelte';
  import Overview from './pages/Overview.svelte';
  import Streamers from './pages/Streamers.svelte';
  import Streamer from './pages/Streamer.svelte';
  import Categories from './pages/Categories.svelte';
  import Category from './pages/Category.svelte';
  import Calendar from './pages/Calendar.svelte';
  import Chat from './pages/Chat.svelte';
  import Follows from './pages/Follows.svelte';
  import Support from './pages/Support.svelte';
  import Channel from './pages/Channel.svelte';
  import Share from './pages/Share.svelte';
  import { LayoutGrid, Users, Gamepad2, CalendarDays, MessageSquare, Heart, Gift, Radio, Share2 } from '@lucide/svelte';

  const NAV = [
    { path: '', page: 'overview', label: 'Aperçu', icon: LayoutGrid },
    { path: 'streamers', page: 'streamers', label: 'Streamers', icon: Users },
    { path: 'categories', page: 'categories', label: 'Catégories', icon: Gamepad2 },
    { path: 'calendrier', page: 'calendar', label: 'Calendrier', icon: CalendarDays },
    { path: 'chat', page: 'chat', label: 'Chat', icon: MessageSquare },
    { path: 'follows', page: 'follows', label: 'Follows', icon: Heart },
    { path: 'soutien', page: 'support', label: 'Soutien', icon: Gift },
    { path: 'chaine', page: 'channel', label: 'Ma chaîne', icon: Radio },
    { path: 'partager', page: 'share', label: 'Partager', icon: Share2 },
  ] as const;

  const years = $derived(app.data ? availableYears(app.data) : []);
  // Months of the selected year that have something to show.
  const activeMonths = $derived.by(() => {
    const s = new Set<number>();
    if (!app.data || app.year === null) return s;
    for (const w of app.data.watch) {
      const dt = new Date(w.day * 86400000);
      if (dt.getUTCFullYear() === app.year) s.add(dt.getUTCMonth());
    }
    for (const m of app.data.chat) {
      const dt = new Date(m.ts);
      if (dt.getFullYear() === app.year) s.add(dt.getMonth());
    }
    return s;
  });
  const active = $derived(
    app.route.page === 'streamer' ? 'streamers' : app.route.page === 'category' ? 'categories' : app.route.page,
  );
  const r = $derived(app.route);
</script>

{#if !app.data && app.booting}
  <div class="boot" aria-live="polite"><span class="brand"><span class="brand-mark" aria-hidden="true"></span>Rétro Twitch</span><span class="progress" aria-hidden="true"><span></span></span><span class="sr-only">{t('Ouverture de ton export')}</span></div>
{:else if !app.data}
  <Landing />
{:else}
  <div class="shell">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark" aria-hidden="true"></span>Rétro Twitch</div>
      <Search pages={NAV.map((x) => ({ path: x.path, label: t(x.label) }))} />
      <nav class="nav" aria-label="Sections" use:slide>
        {#each NAV as item (item.path)}
          <a href="#/{item.path}" class:on={active === item.page} aria-current={active === item.page ? 'page' : undefined}>
            <item.icon size={16} strokeWidth={1.5} />
            <span>{t(item.label)}</span>
          </a>
        {/each}
      </nav>
      <div class="side-foot">
        <p class="muted small">
          {t("Données jusqu'au {date}.", { date: date(app.data.user.end) })}
          {#if app.offline}{t('Mode hors ligne.')}{:else if app.enrichState === 'loading'}{t('Chargement des images…')}{:else if app.enrichState === 'failed'}{t('Images indisponibles.')}{/if}
        </p>
        {#if app.storedUntil}<p class="muted small">{t("Gardé dans ce navigateur jusqu'au {date}.", { date: date(app.storedUntil) })}</p>{/if}
        <button class="btn ghost small" onclick={() => app.reset()} title={app.stored ? t('Efface la copie gardée dans ce navigateur') : undefined}>{t("Changer d'export")}</button>
        <LangSwitch />
      </div>
    </aside>

    <div class="main">
      <div class="yearbar" role="group" aria-label={t('Période')} use:slide>
        <button class:on={app.year === null} onclick={() => (app.setYear(null))}>{t('Tout')}</button>
        {#each years as y (y)}
          <button class:on={app.year === y} onclick={() => (app.setYear(y))}>{y}</button>
        {/each}
      </div>
      {#if app.year !== null}
        <div class="monthbar" role="group" aria-label={t('Mois')} use:slide>
          <button class:on={app.month === null} onclick={() => app.setMonth(null)}>{t("Toute l'année")}</button>
          {#each Array.from({ length: 12 }, (_, i) => i) as m (m)}
            <button class:on={app.month === m} disabled={!activeMonths.has(m)} onclick={() => app.setMonth(m)}>{monthShort(m)}</button>
          {/each}
        </div>
      {/if}

      <main class="content" use:rankDigits>
        {#key JSON.stringify(r)}
        <div class="page">
        {#if r.page === 'overview'}<Overview />
        {:else if r.page === 'streamers'}<Streamers />
        {:else if r.page === 'streamer'}<Streamer ch={app.resolveCh(r.key)} />
        {:else if r.page === 'categories'}<Categories />
        {:else if r.page === 'category'}<Category game={app.resolveGame(r.key)} />
        {:else if r.page === 'calendar'}<Calendar />
        {:else if r.page === 'chat'}<Chat />
        {:else if r.page === 'follows'}<Follows />
        {:else if r.page === 'support'}<Support />
        {:else if r.page === 'channel'}<Channel />
        {:else if r.page === 'share'}<Share target={r.target} />
        {/if}
        </div>
        {/key}
        <footer class="foot">
          {t("Tout est calculé dans ton navigateur, ton export n'est envoyé à aucun serveur.")}
          {app.stored ? t("Une copie reste dans ce navigateur pendant 30 jours au plus, « Changer d'export » l'efface.") : t('Rien n’est gardé : recharger la page efface tout.')}
          {t('Avatars, jaquettes et emotes : Twitch, 7TV, BTTV et FFZ. Site non affilié à Twitch.')}
          <span class="foot-lang"><LangSwitch /></span>
        </footer>
      </main>
    </div>
  </div>
{/if}
