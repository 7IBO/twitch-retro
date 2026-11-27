<script lang="ts">
  /** A chat message with its emotes drawn as images and @mentions highlighted, like in the chat itself. */
  import { app } from '../lib/state.svelte';
  import { emoteFor } from '../lib/words';
  import type { ChatMsg } from '../lib/types';
  let { body, ch, msg }: { body: string; ch: number; msg?: ChatMsg } = $props();
  const parts = $derived.by(() => {
    const m = app.emoteMap;
    const local = m?.perChannel.get(app.data?.channels[ch]?.id ?? '');
    return body.split(/(\s+)/).map((t) => {
      const e = t.trim() ? (msg ? emoteFor(msg, t, local, m) : m ? (local?.get(t) ?? m.global.get(t)) : undefined) : undefined;
      if (e) return { kind: 'emote' as const, t, e };
      if (/^@\w{2,}/.test(t)) return { kind: 'mention' as const, t };
      return { kind: 'text' as const, t };
    });
  });
</script>

<span class="chattext">{#each parts as p, i (i)}{#if p.kind === 'emote'}<img class="emote" src={p.e.url} alt={p.t} title="{p.t} · {p.e.provider === '7tv' ? '7TV' : p.e.provider.toUpperCase()}" loading="lazy" referrerpolicy="no-referrer" />{:else if p.kind === 'mention'}<span class="mention">{p.t}</span>{:else}{p.t}{/if}{/each}</span>
