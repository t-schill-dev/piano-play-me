<script lang="ts">
  import { songById, allNotes, songBreaks, starsFor, titleIn } from '../lib/songs';
  import type { Lang } from '../lib/lists';
  import { router } from '../lib/router.svelte';
  import NoteRunner from '../components/NoteRunner.svelte';

  let { id, lang }: { id: string; lang?: Lang } = $props();
  const song = $derived(songById(id));
  let result = $state<number | null>(null); // stars earned, once finished
  let runKey = $state(0);

  function again(): void { result = null; runKey++; }
</script>

{#if !song}
  <p>Hmm, I can't find that song. <button class="pill" onclick={() => router.go('songs')}>Back to songs</button></p>
{:else}
  <div class="stage fill">
    <h2 class="center">{song.emoji} {titleIn(song, lang)}</h2>
    {#if result != null}
      <div class="finish">
        <div class="big">You played the whole song! 🎉</div>
        <div class="stars">{'⭐'.repeat(result)}</div>
        <div class="row center">
          <button class="pill go" onclick={again}>↺ Play it again</button>
          <button class="pill" onclick={() => router.go('songs')}>🎵 Pick another song</button>
        </div>
      </div>
    {:else}
      {#key runKey}
        <NoteRunner notes={allNotes(song)} bpm={song.bpm} breaks={songBreaks(song)} ondone={(m) => (result = starsFor(m))} />
      {/key}
    {/if}
  </div>
{/if}
