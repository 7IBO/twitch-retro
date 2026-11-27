<script lang="ts">
  import { DAY } from '../lib/stats';
  import { h, day as fmtDay } from '../lib/format';

  let {
    year,
    dayMin,
    selected = null,
    onpick,
    steps,
  }: { year: number; dayMin: Map<number, number>; selected?: number | null; onpick?: (day: number) => void; steps: number[] } = $props();

  const CELL = 12, GAP = 3, STEP = CELL + GAP;
  const start = $derived(Math.floor(Date.UTC(year, 0, 1) / DAY));
  const end = $derived(Math.floor(Date.UTC(year, 11, 31) / DAY));
  // Monday-first column offset of Jan 1st.
  const offset = $derived((new Date(start * DAY).getUTCDay() + 6) % 7);
  const cells = $derived.by(() => {
    const out: { d: number; x: number; y: number; m: number }[] = [];
    for (let d = start; d <= end; d++) {
      const i = d - start + offset;
      out.push({ d, x: Math.floor(i / 7) * STEP, y: (i % 7) * STEP, m: dayMin.get(d) ?? 0 });
    }
    return out;
  });
  // Levels from the person's own quartiles (same for every year), so heavy and light viewers both get contrast.
  const level = (m: number) => (m === 0 ? 0 : m < steps[0] ? 1 : m < steps[1] ? 2 : m < steps[2] ? 3 : 4);
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const monthX = $derived(
    months.map((label, m) => {
      const d = Math.floor(Date.UTC(year, m, 1) / DAY);
      return { label, x: Math.floor((d - start + offset) / 7) * STEP };
    }),
  );
  const width = $derived(Math.ceil((end - start + offset + 1) / 7) * STEP);
</script>

<div class="heatmap-scroll">
  <svg class="heatmap" viewBox="-28 -18 {width + 28} {7 * STEP + 18}" width="100%" style:max-width="{(width + 28) * 1.5}px" style:min-width="{width + 28}px" role="img" aria-label="Calendrier {year}">
    {#each monthX as m (m.label)}
      <text class="hm-label" x={m.x} y="-6">{m.label}</text>
    {/each}
    {#each ['lun', '', 'mer', '', 'ven', '', ''] as l, i (i)}
      {#if l}<text class="hm-label" x="-28" y={i * STEP + 10}>{l}</text>{/if}
    {/each}
    {#each cells as c (c.d)}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <rect
        x={c.x}
        y={c.y}
        width={CELL}
        height={CELL}
        rx="3"
        class="hm-cell l{level(c.m)}"
        class:sel={selected === c.d}
        role={onpick ? 'button' : undefined}
        tabindex={onpick && c.m ? 0 : undefined}
        onclick={onpick && c.m ? () => onpick(c.d) : undefined}
        onkeydown={onpick && c.m ? (e) => e.key === 'Enter' && onpick(c.d) : undefined}
      ><title>{fmtDay(c.d)} : {c.m ? h(c.m) + ' h' : 'rien'}</title></rect>
    {/each}
  </svg>
</div>
