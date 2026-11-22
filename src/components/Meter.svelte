<script lang="ts">
  import { listener } from '../lib/listener.svelte';
  const level = $derived(Math.min(1, (listener.frame?.r.rms ?? 0) / 0.15));
</script>

<div class="meter" aria-hidden="true"><div style="width: {(level * 100).toFixed(0)}%"></div></div>
