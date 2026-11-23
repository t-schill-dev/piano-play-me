<script lang="ts">
  import { songById, lessonsFor, titleIn } from '../lib/songs';
  import { adventureSongs, type Lang } from '../lib/lists';
  import { progress } from '../lib/progress.svelte';
  import { router } from '../lib/router.svelte';
  import Pip from '../components/Pip.svelte';

  let { lang, id }: { lang: Lang; id: string } = $props();
  const path = $derived(adventureSongs(lang));
  const song = $derived(songById(id));
  const lessons = $derived(song ? lessonsFor(song) : []);
  const songIndex = $derived(path.findIndex((s) => s.id === id));
</script>

{#if !song || songIndex < 0 || !progress.songUnlocked(path, songIndex)}
  <p>This place isn't open yet. <button class="pill" onclick={() => router.go('adventure/' + lang)}>Back to the map</button></p>
{:else}
  <h2>{song.emoji} {song.place}</h2>
  <Pip>{progress.songDone(song) ? song.done + ' You can play this song any time in Play a Song.' : song.intro}</Pip>
  <div class="path">
    {#each lessons as l, i (i)}
      {@const open = progress.lessonUnlocked(song.id, i)}
      {@const st = progress.starsOf(song.id, i)}
      {@const isNext = open && st === 0 && (i === 0 || progress.starsOf(song.id, i - 1) > 0)}
      <button class="step" class:locked={!open} class:next={isNext} disabled={!open}
        onclick={() => router.go(`lesson/${lang}/${song.id}/${i}`)}>
        <span class="num">{open ? l.icon : '🔒'}</span>
        <span><b>Lesson {i + 1}: {l.title}</b><small>{l.kind === 'whole' ? 'Play ' + titleIn(song, lang) + ' from start to end' : l.kind === 'notes' ? 'Find the notes of the song' : 'Learn a piece of the song'}</small></span>
        <span class="st">{st ? '⭐'.repeat(st) : ''}</span>
      </button>
    {/each}
  </div>
  <div class="row" style="margin-top:14px"><button class="pill" onclick={() => router.go('adventure/' + lang)}>🗺️ Back to the map</button></div>
{/if}
