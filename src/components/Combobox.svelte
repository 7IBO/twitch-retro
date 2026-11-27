<script lang="ts">
  /** A select you can type into: filters as you type, arrows and Enter to pick, Escape to close. */
  import Avatar from './Avatar.svelte';
  import { t } from '../lib/i18n/index.svelte';
  import { ChevronDown, X } from '@lucide/svelte';

  interface Option {
    value: number;
    label: string;
    meta?: string;
    ch?: number;
  }
  let {
    options,
    value = $bindable(-1),
    allLabel,
    label,
    onchange,
  }: { options: Option[]; value?: number; allLabel: string; label: string; onchange?: () => void } = $props();

  let open = $state(false);
  let q = $state('');
  let active = $state(0);
  let root: HTMLDivElement | undefined = $state();
  let input: HTMLInputElement | undefined = $state();
  const id = 'cb' + Math.random().toString(36).slice(2, 8);

  const selected = $derived(options.find((o) => o.value === value));
  const list = $derived.by(() => {
    const query = q.trim().toLowerCase();
    const all = [{ value: -1, label: allLabel } as Option, ...options];
    return (query ? all.filter((o) => o.label.toLowerCase().includes(query)) : all).slice(0, 60);
  });

  function pick(o: Option) {
    value = o.value;
    q = '';
    open = false;
    onchange?.();
    input?.blur();
  }
  function key(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      open = true;
      active = Math.min(active + 1, list.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      active = Math.max(active - 1, 0);
    } else if (e.key === 'Enter' && open && list[active]) {
      e.preventDefault();
      pick(list[active]);
    } else if (e.key === 'Escape') {
      open = false;
      q = '';
    }
  }
  $effect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (root && !root.contains(e.target as Node)) {
        open = false;
        q = '';
      }
    };
    addEventListener('pointerdown', close);
    return () => removeEventListener('pointerdown', close);
  });
</script>

<div class="combo" bind:this={root}>
  <div class="combo-field" class:open>
    {#if selected?.ch !== undefined && !q}<Avatar ch={selected.ch} size={20} />{/if}
    <input
      bind:this={input}
      role="combobox"
      aria-label={label}
      aria-expanded={open}
      aria-controls={id}
      aria-autocomplete="list"
      placeholder={selected ? selected.label : allLabel}
      class:has-value={!!selected}
      bind:value={q}
      onfocus={() => ((open = true), (active = 0))}
      oninput={() => ((open = true), (active = 0))}
      onkeydown={key}
    />
    {#if selected}
      <button class="combo-icon" aria-label={t('Clear filter')} onclick={() => pick({ value: -1, label: allLabel })}><X size={14} strokeWidth={1.5} /></button>
    {:else}
      <span class="combo-icon" aria-hidden="true"><ChevronDown size={14} strokeWidth={1.5} /></span>
    {/if}
  </div>
  {#if open}
    <ul class="combo-list" role="listbox" {id}>
      {#each list as o, i (o.value)}
        <li
          role="option"
          aria-selected={o.value === value}
          class:active={i === active}
          onpointerdown={(e) => (e.preventDefault(), pick(o))}
          onpointerenter={() => (active = i)}
        >
          {#if o.ch !== undefined}<Avatar ch={o.ch} size={20} />{/if}
          <span class="combo-label">{o.label}</span>
          {#if o.meta}<span class="combo-meta">{o.meta}</span>{/if}
        </li>
      {:else}
        <li class="combo-empty">{t('No results')}</li>
      {/each}
    </ul>
  {/if}
</div>
