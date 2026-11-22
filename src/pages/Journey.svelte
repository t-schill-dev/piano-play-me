<script lang="ts">
  import { songById, lessonsFor, SONGS } from '../lib/songs';
  import { progress } from '../lib/progress.svelte';
  import { router } from '../lib/router.svelte';
  import Pip from '../components/Pip.svelte';

  let { id }: { id: string } = $props();
  const song = $derived(songById(id));
  const lessons = $derived(song ? lessonsFor(song) : []);
  const songIndex = $derived(SONGS.findIndex((s) => s.id === id));
</script>

{#if !song || !progress.songUnlocked(songIndex)}
  <p>This place isn't open yet. <button class="pill" onclick={() => router.go('adventure')}>Back to the map</button></p>
{:else}
  <h2>{song.emoji} {song.place}</h2>
  <Pip>{progress.songDone(song) ? song.done + ' You can play this song any time in Play a Song.' : song.intro}</Pip>
  <div class="path">
    {#each lessons as l, i (i)}
      {@const open = progress.lessonUnlocked(song.id, i)}
      {@const st = progress.starsOf(song.id, i)}
      {@const isNext = open && st === 0 && (i === 0 || progress.starsOf(song.id, i - 1) > 0)}
      <button class="step" class:locked={!open} class:next={isNext} disabled={!open}
        onclick={() => router.go(`lesson/${song.id}/${i}`)}>
        <span class="num">{open ? l.icon : '🔒'}</span>
        <span><b>Lesson {i + 1}: {l.title}</b><small>{l.kind === 'whole' ? 'Play ' + song.title + ' from start to end' : l.kind === 'notes' ? 'Find the notes of the song' : 'Learn a piece of the song'}</small></span>
        <span class="st">{st ? '⭐'.repeat(st) : ''}</span>
      </button>
    {/each}
  </div>
  <div class="row" style="margin-top:14px"><button class="pill" onclick={() => router.go('adventure')}>🗺️ Back to the map</button></div>
{/if}
