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
  import Legal from './pages/Legal.svelte';
  import { LayoutGrid, Users, Gamepad2, CalendarDays, MessageSquare, Heart, Gift, Radio, Share2 } from '@lucide/svelte';

  const NAV = [
    { path: '', page: 'overview', label: 'Overview', icon: LayoutGrid },
    { path: 'streamers', page: 'streamers', label: 'Streamers', icon: Users },
    { path: 'categories', page: 'categories', label: 'Categories', icon: Gamepad2 },
    { path: 'calendrier', page: 'calendar', label: 'Calendar', icon: CalendarDays },
    { path: 'chat', page: 'chat', label: 'Chat', icon: MessageSquare },
    { path: 'follows', page: 'follows', label: 'Follows', icon: Heart },
    { path: 'soutien', page: 'support', label: 'Support', icon: Gift },
    { path: 'chaine', page: 'channel', label: 'My channel', icon: Radio },
    { path: 'partager', page: 'share', label: 'Share', icon: Share2 },
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

{#if r.page === 'legal' || r.page === 'privacy'}
  <Legal kind={r.page} />
{:else if !app.data && app.booting}
  <div class="boot" aria-live="polite"><span class="brand"><span class="brand-mark" aria-hidden="true"></span>Rétro Twitch</span><span class="progress" aria-hidden="true"><span></span></span><span class="sr-only">{t('Opening your export')}</span></div>
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
          {t('Data up to {date}.', { date: date(app.data.user.end) })}
          {#if app.offline}{t('Offline mode.')}{:else if app.enrichState === 'loading'}{t('Loading images…')}{:else if app.enrichState === 'failed'}{t('Images unavailable.')}{/if}
        </p>
        {#if app.storedUntil}<p class="muted small">{t('Kept in this browser until {date}.', { date: date(app.storedUntil) })}</p>{/if}
        <button class="btn ghost small" onclick={() => app.reset()} title={app.stored ? t('Deletes the copy kept in this browser') : undefined}>{t('Change export')}</button>
        <LangSwitch />
      </div>
    </aside>

    <div class="main">
      <div class="yearbar" role="group" aria-label={t('Period')} use:slide>
        <button class:on={app.year === null} onclick={() => (app.setYear(null))}>{t('All')}</button>
        {#each years as y (y)}
          <button class:on={app.year === y} onclick={() => (app.setYear(y))}>{y}</button>
        {/each}
      </div>
      {#if app.year !== null}
        <div class="monthbar" role="group" aria-label={t('Month')} use:slide>
          <button class:on={app.month === null} onclick={() => app.setMonth(null)}>{t('Whole year')}</button>
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
          {t('Everything is computed in your browser, your export is never sent to a server.')}
          {app.stored ? t('A copy stays in this browser for 30 days at most, “Change export” deletes it.') : t('Nothing is kept: reloading the page clears everything.')}
          {t('Avatars, box art and emotes: Twitch, 7TV, BTTV and FFZ. Not affiliated with Twitch.')}
          <a href="#/mentions-legales">{t('Legal notice')}</a> · <a href="#/confidentialite">{t('Privacy')}</a>
          <span class="foot-lang"><LangSwitch /></span>
        </footer>
      </main>
    </div>
  </div>
{/if}
