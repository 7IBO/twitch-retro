<script lang="ts">
  let { value, max }: { value: number; max: number } = $props();
</script>

<span class="meter"><span style:width="{max ? (value / max) * 100 : 0}%"></span></span>
