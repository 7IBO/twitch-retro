<script lang="ts">
  import { app } from '../lib/state.svelte';
  let { game, w = 144, h = 192, cls = '' }: { game: number; w?: number; h?: number; cls?: string } = $props();
  const src = $derived(game >= 0 ? app.boxArt(game, w, h) : '');
</script>

{#if src}
  <img class="boxart {cls}" {src} alt="" width={w} height={h} loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" />
{:else}
  <span class="boxart empty {cls}"></span>
{/if}
