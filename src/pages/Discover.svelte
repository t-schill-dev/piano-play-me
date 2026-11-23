<script lang="ts">
  import { onDestroy } from 'svelte';
  import { listener } from '../lib/listener.svelte';
  import { isBlack, midiLetter, midiName } from '../lib/pitch';
  import Piano from '../components/Piano.svelte';
  import Meter from '../components/Meter.svelte';
  import MicGate from '../components/MicGate.svelte';

  let tab = $state<'free' | 'find'>('free');
  let pool = $state<'five' | 'white' | 'all'>('five');
  let target = $state<number | null>(null);
  let celebrating = false;
  let stars = $state(0);
  let msg = $state<{ big: string; small: string; cls: string }>({ big: 'Play a key!', small: "I'm listening.", cls: '' });

  // Free play: show the letter of whatever is sounding.
  $effect(() => {
    if (tab !== 'free') return;
    const m = listener.stableMidi;
    if (m == null) msg = { big: 'Play a key!', small: "I'm listening.", cls: '' };
    else if (m >= 48 && m <= 72) msg = { big: midiLetter(m), small: 'I heard ' + midiLetter(m) + '!', cls: '' };
    else msg = { big: midiLetter(m), small: `That key is off this little keyboard (${midiName(m)}).`, cls: '' };
  });

  function keys(): number[] {
    if (pool === 'five') return [60, 62, 64, 65, 67];
    const all: number[] = [];
    for (let m = 48; m <= 72; m++) all.push(m);
    return pool === 'white' ? all.filter((m) => !isBlack(m)) : all;
  }
  function setTarget(m: number): void {
    target = m; celebrating = false;
    msg = { big: 'Find ' + midiLetter(m) + '!', small: 'Play the glowing key when you are ready.', cls: '' };
  }
  function pickTarget(): void {
    const p = keys().filter((m) => m !== target);
    setTarget(p[Math.floor(Math.random() * p.length)]);
  }
  function setTab(t: 'free' | 'find'): void {
    tab = t;
    if (t === 'find') { stars = 0; pickTarget(); } else target = null;
  }

  const WRONG = [
    (h: string, t: string) => ['Ooh, that was ' + h + '!', 'Nice sound. Now try the glowing ' + t + '.'],
    (h: string, t: string) => ['Close by!', 'That was ' + h + '. Look for the glowing ' + t + '.'],
    (h: string, t: string) => ['Good try!', 'I heard ' + h + '. Can you find ' + t + '?'],
  ];
  let wrongIdx = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const off = listener.onNote((m) => {
    if (tab !== 'find' || target == null || celebrating) return;
    const t = midiLetter(target);
    if (m === target || (m - target) % 12 === 0) {
      celebrating = true; stars++;
      msg = m === target
        ? { big: 'Yes! 🎉', small: 'That was ' + t + '!', cls: 'yes' }
        : { big: 'Yes, that is ' + t + '! 🎉', small: 'It was a different ' + t + ' on the piano. Great ears!', cls: 'yes' };
      timer = setTimeout(() => { if (tab === 'find') pickTarget(); }, 1900);
    } else {
      const [big, small] = WRONG[wrongIdx++ % WRONG.length](midiLetter(m), t);
      msg = { big, small, cls: 'soft' };
    }
  });
  onDestroy(() => { off(); clearTimeout(timer); });
</script>

<div class="stage fill">
  <div class="sub-tabs">
    <button class="pill" class:on={tab === 'free'} onclick={() => setTab('free')}>🎹 Just play</button>
    <button class="pill" class:on={tab === 'find'} onclick={() => setTab('find')}>🔍 Find the key</button>
  </div>
  <MicGate />
  <div class="bubble">
    <div class="big {msg.cls}">{msg.big}</div>
    <div class="say">{msg.small}</div>
  </div>
  {#if tab === 'find'}
    <div class="stars" aria-live="polite">{'⭐'.repeat(Math.min(stars, 10))}{stars > 10 ? ' ×' + stars : ''}</div>
  {/if}
  <Meter />
  {#if tab === 'find'}
    <div class="row center" style="margin-top:6px">
      <label for="pool" class="muted">Practice keys:</label>
      <select id="pool" class="pill" bind:value={pool} onchange={pickTarget}>
        <option value="five">C D E F G (middle C hand)</option>
        <option value="white">All white keys</option>
        <option value="all">All keys</option>
      </select>
      <button class="pill" onclick={pickTarget}>New key</button>
      <span class="muted small">Tip: tap a key on screen to pick it.</span>
    </div>
  {/if}
  <Piano target={tab === 'find' ? target : null} heard={listener.stableMidi} ontap={(m) => { if (tab === 'find') setTarget(m); }} />
</div>
