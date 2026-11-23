<script lang="ts">
  import { songById, lessonsFor, starsFor, SONGS } from '../lib/songs';
  import { progress } from '../lib/progress.svelte';
  import { router } from '../lib/router.svelte';
  import NoteRunner from '../components/NoteRunner.svelte';
  import Pip from '../components/Pip.svelte';

  let { id, n }: { id: string; n: number } = $props();
  const song = $derived(songById(id));
  // Build once per visit (the "meet the notes" lesson shuffles).
  const lessons = $derived(song ? lessonsFor(song) : []);
  const lesson = $derived(lessons[n]);
  const isLast = $derived(n === lessons.length - 1);
  let earned = $state<number | null>(null);
  let runKey = $state(0);

  const PRAISE = [
    'Pip does a happy little dance. You learned it!',
    'Wonderful! Pip claps her tiny paws.',
    'You did it! Every lesson makes your fingers smarter.',
  ];

  function done(misses: number): void {
    if (!song) return;
    earned = starsFor(misses);
    progress.record(song.id, n, earned);
  }
  function again(): void { earned = null; runKey++; }
  const nextSong = $derived(SONGS[SONGS.findIndex((s) => s.id === id) + 1]);
</script>

{#if !song || !lesson || !progress.lessonUnlocked(id, n)}
  <p>This lesson isn't open yet. <button class="pill" onclick={() => router.go('journey/' + id)}>Back</button></p>
{:else}
  <div class="stage fill">
    <h2 class="center">{song.emoji} Lesson {n + 1}: {lesson.title}</h2>
    {#if earned != null}
      <div class="finish">
        <div class="big">{isLast ? 'You can play ' + song.title + '! 🏅' : 'Lesson done! 🎉'}</div>
        <div class="stars">{'⭐'.repeat(earned)}</div>
        <Pip>{isLast ? song.done : PRAISE[n % PRAISE.length]}</Pip>
        <div class="row center">
          {#if !isLast}
            <button class="pill go" onclick={() => router.go(`lesson/${id}/${n + 1}`)}>Next lesson ▶</button>
          {:else if nextSong}
            <button class="pill go" onclick={() => router.go('journey/' + nextSong.id)}>Go to {nextSong.place} ▶</button>
          {/if}
          <button class="pill" onclick={again}>↺ Try again</button>
          <button class="pill" onclick={() => router.go('journey/' + id)}>Back to {song.place}</button>
        </div>
      </div>
    {:else}
      <Pip>{lesson.say}</Pip>
      {#key `${id}/${n}/${runKey}`}
        <NoteRunner notes={lesson.notes} bpm={song.bpm} breaks={lesson.breaks}
          repeatAt={lesson.kind === 'part' ? lesson.notes.length / 2 : null} ondone={done} />
      {/key}
    {/if}
  </div>
{/if}
