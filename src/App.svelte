<script lang="ts">
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

  const r = $derived(router.route);
  const key = $derived(r.name + '/' + r.params.join('/'));
</script>

<main>
  <header class="top">
    <div class="brand">
      {#if r.name !== 'home'}
        <button class="pill" onclick={() => router.go('')} aria-label="Home">🏠 Home</button>
      {/if}
      <h1>🎹 Piano Play</h1>
    </div>
    <div class="row">
      {#if listener.running}
        <button class="pill stop" onclick={() => listener.stop()}>■ Stop listening</button>
      {:else if r.name !== 'home'}
        <button class="pill go" onclick={() => listener.start()} disabled={listener.starting}>🎤 Start listening</button>
      {/if}
    </div>
  </header>
  {#if listener.error}<div class="err">{listener.error}</div>{/if}

  {#key key}
    {#if r.name === 'discover'}<Discover />
    {:else if r.name === 'songs'}<SongList />
    {:else if r.name === 'play'}<PlaySong id={r.params[0]} />
    {:else if r.name === 'adventure'}<Adventure />
    {:else if r.name === 'journey'}<Journey id={r.params[0]} />
    {:else if r.name === 'lesson'}<Lesson id={r.params[0]} n={Number(r.params[1]) || 0} />
    {:else}<Home />
    {/if}
  {/key}

  <GrownUp />
</main>
