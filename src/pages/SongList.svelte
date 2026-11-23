<script lang="ts">
  import { songById, allNotes, titleIn } from '../lib/songs';
  import { progress } from '../lib/progress.svelte';
  import { router } from '../lib/router.svelte';
  import { LEVELS, LANGS, LISTS, asLevel, asLang, rememberSongs } from '../lib/lists';

  const level = $derived(asLevel(router.route.params[0]));
  const lang = $derived(asLang(router.route.params[1]));
  const levelInfo = $derived(LEVELS.find((l) => l.id === level));
  const langInfo = $derived(LANGS.find((l) => l.id === lang));
  const songs = $derived(level && lang ? LISTS[level][lang].map((id) => songById(id)).filter((s) => !!s) : []);
</script>

{#if !levelInfo}
  <h2>🎵 Pick a level</h2>
  <div class="cards">
    {#each LEVELS as l (l.id)}
      <button class="card" onclick={() => router.go('songs/' + l.id)}>
        <span class="ico">{l.emoji}</span>
        <span><b>{l.title}</b><small>{l.hint}</small></span>
      </button>
    {/each}
  </div>
{:else if !langInfo}
  <h2>{levelInfo.emoji} {levelInfo.title}: pick a language</h2>
  <div class="cards">
    {#each LANGS as g (g.id)}
      <button class="card" onclick={() => router.go('songs/' + levelInfo.id + '/' + g.id)}>
        <span class="ico">{g.emoji}</span>
        <span><b>{g.title}</b></span>
      </button>
    {/each}
  </div>
{:else}
  <h2>{levelInfo.emoji} {levelInfo.title}: {langInfo.title} songs</h2>
  <p class="lead">Songs with a 🏅 are ones you finished in the Adventure.</p>
  <div class="cards">
    {#each songs as s (s.id)}
      {#if s}
        <button class="card" class:done={progress.songDone(s)}
          onclick={() => { rememberSongs('songs/' + levelInfo.id + '/' + langInfo.id); router.go('play/' + s.id + '/' + langInfo.id); }}>
          <span class="ico">{s.emoji}</span>
          <span><b>{titleIn(s, langInfo.id)} {progress.songDone(s) ? '🏅' : ''}</b><small>{allNotes(s).length} notes</small></span>
        </button>
      {/if}
    {/each}
  </div>
{/if}
