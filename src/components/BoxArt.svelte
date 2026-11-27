<script lang="ts">
  import { app } from '../lib/state.svelte';
  let { game, w = 144, h = 192, cls = '' }: { game: number; w?: number; h?: number; cls?: string } = $props();
  const src = $derived(game >= 0 ? app.boxArt(game, w, h) : '');
  let loaded = $state(false);
  $effect(() => {
    void src;
    loaded = false;
  });
  $effect(() => {
    const name = game >= 0 ? app.data?.games[game]?.name : undefined;
    if (name && app.enrich && app.enrich.games[name.toLowerCase()] === undefined) app.want('game', name);
  });
</script>

{#if src}
  <img class="boxart {cls}" class:loaded {src} alt="" width={w} height={h} loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onload={() => (loaded = true)} />
{:else}
  <span class="boxart empty {cls}" aria-hidden="true"><span>{game >= 0 && app.enrich?.games[app.data?.games[game]?.name.toLowerCase() ?? ''] === null ? app.gameName(game) : ''}</span></span>
{/if}
