<script lang="ts">
  let { value, label, sub = '' }: { value: string; label: string; sub?: string } = $props();
</script>

<div class="stat">
  <div class="stat-label">{label}</div>
  <div class="stat-value">{value}</div>
  {#if sub}<div class="stat-sub">{sub}</div>{/if}
</div>
