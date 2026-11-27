<script lang="ts">
  import { i18n } from '../lib/i18n/index.svelte';
  import { slide } from '../lib/slide';
</script>

<div class="seg lang-switch" role="group" aria-label="Langue / Language" use:slide>
  <button class:on={i18n.lang === 'fr'} onclick={() => i18n.set('fr')} lang="fr">FR</button>
  <button class:on={i18n.lang === 'en'} onclick={() => i18n.set('en')} lang="en">EN</button>
</div>
