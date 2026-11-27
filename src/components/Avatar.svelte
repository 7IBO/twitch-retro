<script lang="ts">
  import { app } from '../lib/state.svelte';
  let { ch, size = 32 }: { ch: number; size?: number } = $props();
  const url = $derived(app.user(ch)?.avatar);
  const name = $derived(app.chName(ch));
  let failed = $state(false);
  $effect(() => {
    const id = app.data?.channels[ch]?.id;
    if (!url && app.enrich && id && /^\d+$/.test(id)) app.want('user', id);
  });
  function hue(s: string) {
    let x = 0;
    for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0;
    return x % 360;
  }
</script>

{#if url && !failed}
  <img class="avatar" src={url} alt="" width={size} height={size} style:--s="{size}px" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror={() => (failed = true)} />
{:else}
  <span class="avatar initials" style:--s="{size}px" style:--h={hue(app.data?.channels[ch]?.id ?? name)} aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
{/if}
