<script lang="ts">
  import { app } from './lib/state.svelte';
  import { availableYears } from './lib/stats';
  import { date } from './lib/format';
  import { slide, rankDigits } from './lib/slide';
  import Search from './components/Search.svelte';
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  import Badges from './pages/Badges.svelte';
  import { LayoutGrid, Users, Gamepad2, CalendarDays, MessageSquare, Heart, Gift, Radio, Share2, Award } from '@lucide/svelte';

  const NAV = [
    { path: '', page: 'overview', label: 'Aperçu', icon: LayoutGrid },
    { path: 'streamers', page: 'streamers', label: 'Streamers', icon: Users },
    { path: 'categories', page: 'categories', label: 'Catégories', icon: Gamepad2 },
    { path: 'calendrier', page: 'calendar', label: 'Calendrier', icon: CalendarDays },
    { path: 'chat', page: 'chat', label: 'Chat', icon: MessageSquare },
    { path: 'badges', page: 'badges', label: 'Badges', icon: Award },
    { path: 'follows', page: 'follows', label: 'Follows', icon: Heart },
    { path: 'soutien', page: 'support', label: 'Soutien', icon: Gift },
    { path: 'chaine', page: 'channel', label: 'Ma chaîne', icon: Radio },
    { path: 'partager', page: 'share', label: 'Partager', icon: Share2 },
  ] as const;

  const years = $derived(app.data ? availableYears(app.data) : []);
  const active = $derived(
    app.route.page === 'streamer' ? 'streamers' : app.route.page === 'category' ? 'categories' : app.route.page,
  );
  const r = $derived(app.route);
</script>

{#if !app.data && app.booting}
  <div class="boot" aria-live="polite"><span class="brand"><span class="brand-mark" aria-hidden="true"></span>Rétro Twitch</span><span class="progress" aria-hidden="true"><span></span></span><span class="sr-only">Ouverture de ton export</span></div>
{:else if !app.data}
  <Landing />
{:else}
  <div class="shell">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark" aria-hidden="true"></span>Rétro Twitch</div>
      <Search pages={NAV.map((x) => ({ path: x.path, label: x.label }))} />
      <nav class="nav" aria-label="Sections" use:slide>
        {#each NAV as item (item.path)}
          <a href="#/{item.path}" class:on={active === item.page} aria-current={active === item.page ? 'page' : undefined}>
            <item.icon size={16} strokeWidth={1.5} />
            <span>{item.label}</span>
          </a>
        {/each}
      </nav>
      <div class="side-foot">
        <p class="muted small">
          Données jusqu'au {date(app.data.user.end)}.
          {#if app.offline}Mode hors ligne.{:else if app.enrichState === 'loading'}Chargement des images…{:else if app.enrichState === 'failed'}Images indisponibles.{/if}
        </p>
        {#if app.storedUntil}<p class="muted small">Gardé dans ce navigateur jusqu'au {date(app.storedUntil)}.</p>{/if}
        <button class="btn ghost small" onclick={() => app.reset()} title={app.stored ? "Efface la copie gardée dans ce navigateur" : undefined}>Changer d'export</button>
      </div>
    </aside>

    <div class="main">
      <div class="yearbar" role="group" aria-label="Période" use:slide>
        <button class:on={app.year === null} onclick={() => (app.setYear(null))}>Tout</button>
        {#each years as y (y)}
          <button class:on={app.year === y} onclick={() => (app.setYear(y))}>{y}</button>
        {/each}
      </div>

      <main class="content" use:rankDigits>
        {#key JSON.stringify(r) + ':' + app.year}
        <div class="page" in:fly={{ y: 8, duration: still ? 0 : 320, easing: quintOut }}>
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
        {:else if r.page === 'badges'}<Badges />
        {/if}
        </div>
        {/key}
        <footer class="foot">
          Tout est calculé dans ton navigateur, ton export n'est envoyé à aucun serveur.
          {app.stored ? "Une copie reste dans ce navigateur pendant 30 jours au plus, « Changer d'export » l'efface." : 'Rien n’est gardé : recharger la page efface tout.'}
          Avatars, jaquettes et emotes : Twitch, 7TV, BTTV et FFZ. Site non affilié à Twitch.
        </footer>
      </main>
    </div>
  </div>
{/if}
