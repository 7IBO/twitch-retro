<script lang="ts">
  /** Vertical bars. The tallest bar (or the one marked) carries the accent, the rest stay neutral. */
  let {
    items,
    height = 200,
    unit = '',
    onpick,
  }: {
    items: { label: string; value: number; title?: string; mark?: boolean }[];
    height?: number;
    unit?: string;
    onpick?: (i: number) => void;
  } = $props();
  const max = $derived(Math.max(1, ...items.map((i) => i.value)));
  const peak = $derived(items.findIndex((i) => i.value === max));
  const marked = $derived(items.some((i) => i.mark));
</script>

<div class="bars" class:dense={items.length > 8} style:height="{height}px" role="list">
  {#each items as it, i (i)}
    <svelte:element
      this={onpick ? 'button' : 'div'}
      role={onpick ? undefined : 'listitem'}
      class="bar"
      class:hi={marked ? it.mark : i === peak}
      title={it.title ?? `${it.label} : ${it.value}${unit}`}
      onclick={onpick ? () => onpick(i) : undefined}
    >
      <span class="bar-fill" style:height="{(it.value / max) * 100}%"></span>
      <span class="bar-label">{it.label}</span>
    </svelte:element>
  {/each}
</div>
