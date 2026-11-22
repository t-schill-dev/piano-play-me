<script lang="ts">
  import { listener } from '../lib/listener.svelte';
  import { router } from '../lib/router.svelte';

  function go(path: string): void {
    listener.start(); // starts inside the tap, as Safari requires
    router.go(path);
  }
</script>

<div class="hello">
  <div class="big">Hi! What do you want to do today?</div>
  <p>Tap a picture. The iPad will listen to your piano.</p>
</div>
<div class="tiles">
  <button class="tile" onclick={() => go('discover')}><div class="ico">🔍</div><b>Discover</b><span>Play any key, or find the glowing one</span></button>
  <button class="tile" onclick={() => go('songs')}><div class="ico">🎵</div><b>Play a Song</b><span>Pick a song and play along</span></button>
  <button class="tile" onclick={() => go('adventure')}><div class="ico">🗺️</div><b>Adventure</b><span>Help Pip and friends, one lesson at a time</span></button>
</div>
