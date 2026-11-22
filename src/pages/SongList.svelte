<script lang="ts">
  import { SONGS, allNotes } from '../lib/songs';
  import { progress } from '../lib/progress.svelte';
  import { router } from '../lib/router.svelte';
</script>

<h2>🎵 Pick a song</h2>
<p class="lead">Songs with a 🏅 are ones you finished in the Adventure.</p>
<div class="cards">
  {#each SONGS as s (s.id)}
    <button class="card" class:done={progress.songDone(s)} onclick={() => router.go('play/' + s.id)}>
      <span class="ico">{s.emoji}</span>
      <span><b>{s.title} {progress.songDone(s) ? '🏅' : ''}</b><small>{allNotes(s).length} notes</small></span>
    </button>
  {/each}
</div>
