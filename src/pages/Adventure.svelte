<script lang="ts">
  import { lessonCount, titleIn, type Song } from '../lib/songs';
  import { progress } from '../lib/progress.svelte';
  import { router } from '../lib/router.svelte';
  import { LANGS, asLang, adventureSongs } from '../lib/lists';
  import Pip from '../components/Pip.svelte';

  const lang = $derived(asLang(router.route.params[0]));
  const path: Song[] = $derived(lang ? adventureSongs(lang) : []);
  const nextIndex = $derived(path.findIndex((s, i) => progress.songUnlocked(path, i) && !progress.songDone(s)));
</script>

{#if !lang}
  <h2>🗺️ Adventure: pick a language</h2>
  <Pip>Hi, I'm Pip! Which songs shall we learn together?</Pip>
  <div class="cards">
    {#each LANGS as g (g.id)}
      <button class="card" onclick={() => router.go('adventure/' + g.id)}>
        <span class="ico">{g.emoji}</span>
        <span><b>{g.title}</b></span>
      </button>
    {/each}
  </div>
{:else}
  <h2>🗺️ Adventure: {LANGS.find((g) => g.id === lang)?.title}</h2>
  <Pip>
    {#if progress.totalStars() === 0}
      Hi, I'm Pip! I'm a little mouse who lives inside a piano. My friends all need songs. Will you help me learn them?
    {:else}
      Welcome back! You have {progress.totalStars()} stars. Where shall we go next?
    {/if}
  </Pip>
  {#if !progress.saving}
    <p class="muted small" style="margin:0 0 8px">Playing as Guest, so stars are not saved. To keep stars, pick or add a player.</p>
  {:else if progress.status === 'offline'}
    <p class="muted small" style="margin:0 0 8px">No internet right now. Stars will be saved when it is back.</p>
  {/if}
  <div class="path">
    {#each path as s, i (s.id)}
      {@const open = progress.songUnlocked(path, i)}
      {@const earned = Array.from({ length: lessonCount(s) }, (_, l) => progress.starsOf(s.id, l)).reduce((a, b) => a + b, 0)}
      <button class="step" class:locked={!open} class:next={i === nextIndex} disabled={!open}
        onclick={() => router.go('journey/' + lang + '/' + s.id)}>
        <span class="num">{open ? s.emoji : '🔒'}</span>
        <span><b>{s.place}</b><small>{titleIn(s, lang)}</small></span>
        <span class="st">{progress.songDone(s) ? '🏅 ' : ''}{earned ? '⭐ ' + earned : ''}</span>
      </button>
    {/each}
  </div>
{/if}
