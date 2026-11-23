<script lang="ts">
  import { SONGS, lessonCount } from '../lib/songs';
  import { progress } from '../lib/progress.svelte';
  import { router } from '../lib/router.svelte';
  import Pip from '../components/Pip.svelte';

  const nextIndex = $derived(SONGS.findIndex((s, i) => progress.songUnlocked(i) && !progress.songDone(s)));
</script>

<h2>🗺️ Adventure</h2>
<Pip>
  {#if progress.totalStars() === 0}
    Hi, I'm Pip! I'm a little mouse who lives inside a piano. My friends all need songs. Will you help me learn them?
  {:else}
    Welcome back! You have {progress.totalStars()} stars. Where shall we go next?
  {/if}
</Pip>
{#if !progress.code}
  <p class="muted small" style="margin:0 0 8px">Stars are not being saved yet. A grown-up can turn this on with ⚙️.</p>
{/if}
<div class="path">
  {#each SONGS as s, i (s.id)}
    {@const open = progress.songUnlocked(i)}
    {@const earned = Array.from({ length: lessonCount(s) }, (_, l) => progress.starsOf(s.id, l)).reduce((a, b) => a + b, 0)}
    <button class="step" class:locked={!open} class:next={i === nextIndex} disabled={!open}
      onclick={() => router.go('journey/' + s.id)}>
      <span class="num">{open ? s.emoji : '🔒'}</span>
      <span><b>{s.place}</b><small>{open ? s.title : 'Finish the place before to open it'}</small></span>
      <span class="st">{progress.songDone(s) ? '🏅 ' : ''}{earned ? '⭐ ' + earned : ''}</span>
    </button>
  {/each}
</div>
