<script lang="ts">
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
</script>

<div class="pip"><div class="face" aria-hidden="true">🐭</div><p>{@render children()}</p></div>
