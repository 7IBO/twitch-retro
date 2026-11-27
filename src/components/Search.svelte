<script lang="ts">
  /** Search everything (streamers, categories, pages) from anywhere. Ctrl+K or / opens it. */
  import { app } from '../lib/state.svelte';
  import { t } from '../lib/i18n/index.svelte';
  import { compute } from '../lib/stats';
  import { dur } from '../lib/format';
  import Avatar from './Avatar.svelte';
  import BoxArt from './BoxArt.svelte';
  import { Search as SearchIcon } from '@lucide/svelte';

  let { pages }: { pages: { path: string; label: string }[] } = $props();

  let open = $state(false);
  let q = $state('');
  let active = $state(0);
  let input: HTMLInputElement | undefined = $state();

  // All-time rankings, computed once per export.
  const all = $derived(app.data ? compute(app.data, null) : null);

  type Hit = { kind: 'page' | 'streamer' | 'game'; href: string; label: string; meta: string; id: number };
  const hits = $derived.by((): Hit[] => {
    const query = q.trim().toLowerCase();
    if (!all || !app.data) return [];
    const match = (...names: string[]) => names.some((x) => x.toLowerCase().includes(query));
    const pageHits: Hit[] = pages
      .filter((p) => !query || match(p.label))
      .slice(0, query ? 3 : 0)
      .map((p) => ({ kind: 'page', href: '#/' + p.path, label: p.label, meta: t('Page'), id: -1 }));
    const chHits: Hit[] = all.channels
      .filter((c) => !query || match(app.chName(c.ch), app.data!.channels[c.ch].name, ...app.oldNames(c.ch)))
      .slice(0, query ? 6 : 5)
      .map((c) => {
        const old = app.oldNames(c.ch).find((o) => query && o.toLowerCase().includes(query) && !app.chName(c.ch).toLowerCase().includes(query));
        return { kind: 'streamer', href: app.chHref(c.ch), label: app.chName(c.ch), meta: (old ? `ex ${old} · ` : '') + dur(c.min), id: c.ch };
      });
    const gameHits: Hit[] = all.games
      .filter((g) => !query || match(app.gameName(g.game)))
      .slice(0, query ? 6 : 5)
      .map((g) => ({ kind: 'game', href: app.gameHref(g.game), label: app.gameName(g.game), meta: dur(g.min), id: g.game }));
    return [...pageHits, ...chHits, ...gameHits];
  });

  function show() {
    open = true;
    q = '';
    active = 0;
    queueMicrotask(() => input?.focus());
  }
  function go(h: Hit) {
    open = false;
    if (location.hash.split('?')[0] === h.href) scrollTo({ top: 0, behavior: 'smooth' });
    location.hash = h.href;
  }
  function key(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      active = Math.min(active + 1, hits.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      active = Math.max(active - 1, 0);
    } else if (e.key === 'Enter' && hits[active]) {
      e.preventDefault();
      go(hits[active]);
    } else if (e.key === 'Escape') open = false;
  }
  function globalKey(e: KeyboardEvent) {
    const typing = (e.target as HTMLElement)?.closest?.('input, textarea, select, [contenteditable]');
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
      e.preventDefault();
      show();
    }
  }
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const titles = { page: 'Pages', streamer: 'Streamers', game: 'Catégories' } as const;
</script>

<svelte:window onkeydown={globalKey} />

<button class="search-trigger" onclick={show} aria-label={t('Rechercher')}>
  <SearchIcon size={16} strokeWidth={1.5} />
  <span class="search-trigger-label">{t('Rechercher')}</span>
  <kbd>{mac ? '⌘' : 'Ctrl'} K</kbd>
</button>

{#if open}
  <div class="palette-backdrop" onpointerdown={() => (open = false)} role="presentation"></div>
  <div class="palette" role="dialog" aria-modal="true" aria-label={t('Rechercher')}>
    <div class="palette-field">
      <SearchIcon size={18} strokeWidth={1.5} />
      <input
        bind:this={input}
        bind:value={q}
        oninput={() => (active = 0)}
        onkeydown={key}
        placeholder={t('Un streamer, une catégorie, une page')}
        role="combobox"
        aria-expanded="true"
        aria-controls="palette-list"
        aria-autocomplete="list"
      />
      <kbd>{t('Échap')}</kbd>
    </div>
    <ul class="palette-list" id="palette-list" role="listbox">
      {#each hits as h, i (h.kind + h.href)}
        {#if i === 0 || hits[i - 1].kind !== h.kind}<li class="palette-group" role="presentation">{t(titles[h.kind])}</li>{/if}
        <li
          role="option"
          aria-selected={i === active}
          class:active={i === active}
          onpointerenter={() => (active = i)}
          onpointerdown={(e) => (e.preventDefault(), go(h))}
        >
          {#if h.kind === 'streamer'}<Avatar ch={h.id} size={24} />{:else if h.kind === 'game'}<BoxArt game={h.id} w={52} h={72} cls="thumb" />{:else}<span class="palette-dot"></span>{/if}
          <span class="palette-label">{h.label}</span>
          <span class="palette-meta">{h.meta}</span>
        </li>
      {:else}
        <li class="palette-empty">{t('Aucun résultat')}</li>
      {/each}
    </ul>
  </div>
{/if}
