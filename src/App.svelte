<script lang="ts">
  import Logo from './components/Logo.svelte';
  import { lastSongsPath, asLang } from './lib/lists';
  import { listener } from './lib/listener.svelte';
  import { router } from './lib/router.svelte';
  import Home from './pages/Home.svelte';
  import Discover from './pages/Discover.svelte';
  import SongList from './pages/SongList.svelte';
  import PlaySong from './pages/PlaySong.svelte';
  import Adventure from './pages/Adventure.svelte';
  import Journey from './pages/Journey.svelte';
  import Lesson from './pages/Lesson.svelte';
  import GrownUp from './components/GrownUp.svelte';
  import Who from './pages/Who.svelte';
  import { family, avatarColor } from './lib/family.svelte';

  const r = $derived(router.route);
  const key = $derived(r.name + '/' + r.params.join('/'));
  let grownUp = $state(false);
  /** Where the back arrow goes from the current page. Null on the home screen. */
  const backPath = $derived.by((): string | null => {
    const p = r.params;
    switch (r.name) {
      case 'home': return null;
      case 'songs': return p.length <= 1 ? '' : p.length === 2 ? 'songs/' + p[0] : '';
      case 'play': return lastSongsPath();
      case 'adventure': return p.length ? 'adventure' : '';
      case 'journey': return 'adventure/' + p[0];
      case 'lesson': return 'journey/' + p[0] + '/' + p[1];
      default: return '';
    }
  });
</script>

<main>
  <header class="top">
    <div class="brand">
      {#if backPath !== null}
        <button class="pill back" onclick={() => router.go(backPath ?? '')} aria-label="Back">← Back</button>
      {/if}
      <h1><button class="title" onclick={() => router.go('')} aria-label="Piano Playtime, go to the home screen"><Logo /><span class="wordmark"><span class="w1">Piano</span> <span class="w2">Playtime</span></span></button></h1>
    </div>
    <div class="row">
      {#if family.current}
        <button class="pill me" onclick={() => { family.choose(null); router.go(''); }} aria-label="Switch player">
          <span class="mini" style="background: {avatarColor(family.current)}">{family.current.avatar}</span>{family.current.name}
        </button>
      {/if}
      <button class="pill gear" onclick={() => (grownUp = true)} aria-label="Grown-up corner">⚙️</button>
      {#if family.code}
        <button class="pill" onclick={() => { family.disconnect(); grownUp = false; router.go(''); }}>Log out</button>
      {/if}
      {#if listener.running}
        <button class="pill stop" onclick={() => listener.stop()}>■ Stop listening</button>
      {:else if r.name !== 'home' && family.current}
        <button class="pill go" onclick={() => listener.start()} disabled={listener.starting}>🎤 Start listening</button>
      {/if}
    </div>
  </header>
  {#if listener.error}<div class="err">{listener.error}</div>{/if}

  <div class="view">
  {#if !family.current}
    <Who />
  {:else}
  {#key key}
    {#if r.name === 'discover'}<Discover />
    {:else if r.name === 'songs'}<SongList />
    {:else if r.name === 'play'}<PlaySong id={r.params[0]} />
    {:else if r.name === 'adventure'}<Adventure />
    {:else if r.name === 'journey'}<Journey lang={asLang(r.params[0]) ?? 'en'} id={r.params[1]} />
    {:else if r.name === 'lesson'}<Lesson lang={asLang(r.params[0]) ?? 'en'} id={r.params[1]} n={Number(r.params[2]) || 0} />
    {:else}<Home />
    {/if}
  {/key}
  {/if}
  </div>
</main>

{#if grownUp}
  <div class="overlay" role="dialog" aria-label="Grown-up corner">
    <div class="sheet">
      <div class="row" style="justify-content: space-between">
        <h2 style="margin:0">Grown-up corner</h2>
        <button class="pill" onclick={() => (grownUp = false)}>✕ Close</button>
      </div>
      <GrownUp />
    </div>
  </div>
{/if}
