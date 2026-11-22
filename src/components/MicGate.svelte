<script lang="ts">
  import { listener } from '../lib/listener.svelte';
</script>

{#if !listener.running}
  <div class="micgate">
    <button class="pill go big" onclick={() => listener.start()} disabled={listener.starting}>
      🎤 {listener.starting ? 'Starting…' : 'Tap to start listening'}
    </button>
  </div>
{/if}
