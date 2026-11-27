<script lang="ts">
  /** A chat message with its emotes drawn as images, like in the chat itself. */
  import { app } from '../lib/state.svelte';
  let { body, ch }: { body: string; ch: number } = $props();
  const parts = $derived.by(() => {
    const m = app.emoteMap;
    const local = m?.perChannel.get(app.data?.channels[ch]?.id ?? '');
    return body.split(/(\s+)/).map((t) => {
      const e = m && t.trim() ? (local?.get(t) ?? m.global.get(t)) : undefined;
      return e ? { emote: e, t } : { t };
    });
  });
</script>

<span class="chattext">{#each parts as p, i (i)}{#if p.emote}<img class="emote" src={p.emote.url} alt={p.t} title={p.t} loading="lazy" referrerpolicy="no-referrer" />{:else}{p.t}{/if}{/each}</span>
