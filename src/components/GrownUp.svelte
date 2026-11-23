<script lang="ts">
  import { listener } from '../lib/listener.svelte';
  import { progress } from '../lib/progress.svelte';
  import { family, avatarColor } from '../lib/family.svelte';
  import PlayerForm from './PlayerForm.svelte';
  import { freqToMidi, midiName } from '../lib/pitch';

  const f = $derived(listener.frame);
  const mf = $derived(f && f.r.freq ? freqToMidi(f.r.freq) : null);
  const s = listener.settings;
  let confirmReset = $state(false);
  let editing = $state<string | null>(null);
  let removing = $state<string | null>(null);
  const STATUS: Record<string, string> = {
    none: 'Not saved (Guest).',
    loading: 'Loading stars…', saving: 'Saving…', saved: 'Saved online ✓',
    offline: 'Offline. Stars will be saved when the internet is back.', error: 'Could not save.',
  };
</script>

<section class="debug">
  <h3 style="margin:0 0 6px">Family login and players</h3>
  {#if family.code}
    <p class="muted" style="margin:0">Logged in with family code <b>{family.code}</b>.
      {#if progress.saving}Stars for {family.current?.name}: {STATUS[progress.status]}{/if}</p>
    {#if progress.status === 'error' && progress.problem}<p class="err">{progress.problem}</p>{/if}
    {#if family.problem}<p class="err">{family.problem}</p>{/if}
    <div class="plist">
      {#each family.players as p (p.id)}
        {#if editing === p.id}
          <PlayerForm name={p.name} avatar={p.avatar} onsave={async (n, a) => { if (await family.updatePlayer(p.id, n, a)) editing = null; }} oncancel={() => (editing = null)} />
        {:else}
          <div class="row">
            <span class="mini big" style="background: {avatarColor(p)}">{p.avatar}</span><b style="min-width:120px">{p.name}</b>
            <button class="pill" onclick={() => { editing = p.id; removing = null; }}>Change</button>
            {#if removing === p.id}
              <button class="pill stop" onclick={() => { void family.removePlayer(p.id); removing = null; }}>Yes, remove {p.name} and their stars</button>
              <button class="pill" onclick={() => (removing = null)}>Keep</button>
            {:else}
              <button class="pill" onclick={() => { removing = p.id; editing = null; }}>Remove</button>
            {/if}
          </div>
        {/if}
      {/each}
      {#if !family.players.length}<p class="muted" style="margin:0">No players yet. Add one on the "Who's playing?" screen.</p>{/if}
    </div>
    <div class="row" style="margin-top:8px">
      <button class="pill" onclick={() => { family.choose(null); }}>Switch player</button>
      <button class="pill" onclick={() => family.disconnect()}>Log out on this device</button>
    </div>
  {:else}
    <p class="muted" style="margin:0">Not logged in, so only Guest can play and stars are not saved.
      Use "Family login" on the "Who's playing?" screen to add players.</p>
  {/if}
  <h3 style="margin:18px 0 0">Listening</h3>
  <p class="muted" style="margin:0">Live accuracy readout and listening settings.</p>
  <div class="grid">
    <div class="cell"><span>Frequency</span><b>{f && f.r.freq ? f.r.freq.toFixed(1) + ' Hz' : '–'}</b></div>
    <div class="cell"><span>Raw note</span><b>{mf != null ? midiName(Math.round(mf)) + (f?.rawMidi == null ? ' ?' : '') : '–'}</b></div>
    <div class="cell"><span>Cents off</span><b>{mf != null ? (Math.round((mf - Math.round(mf)) * 100) > 0 ? '+' : '') + Math.round((mf - Math.round(mf)) * 100) : '–'}</b></div>
    <div class="cell"><span>Confidence</span><b>{f && f.r.freq ? Math.round(f.r.clarity * 100) + '%' : '–'}</b></div>
    <div class="cell"><span>Steady note</span><b>{listener.stableMidi != null ? midiName(listener.stableMidi) : '–'}</b></div>
    <div class="cell"><span>Level (RMS)</span><b>{f ? f.r.rms.toFixed(3) : '–'}</b></div>
    <div class="cell"><span>Pitch wobble</span><b>{f?.spread != null ? Math.round(f.spread) + '¢' : '–'}</b></div>
    <div class="cell"><span>Ignored (not piano)</span><b>{listener.ignored}</b></div>
  </div>
  <label class="ctrl"><span>Piano only (ignore voices)</span><input type="checkbox" bind:checked={s.pianoOnly} class="check" /><span>{s.pianoOnly ? 'on' : 'off'}</span></label>
  <label class="ctrl"><span>Pitch wobble allowed</span><input type="range" min="5" max="60" step="1" bind:value={s.spread} /><span>{s.spread}¢</span></label>
  <label class="ctrl"><span>Quiet-sound gate</span><input type="range" min="0.002" max="0.08" step="0.001" bind:value={s.gate} /><span>{s.gate.toFixed(3)}</span></label>
  <label class="ctrl"><span>Confidence needed</span><input type="range" min="0.5" max="0.98" step="0.01" bind:value={s.clarity} /><span>{Math.round(s.clarity * 100)}%</span></label>
  <label class="ctrl"><span>Steady frames</span><input type="range" min="1" max="12" step="1" bind:value={s.stable} /><span>{s.stable}</span></label>
  <div class="row" style="margin-top:12px">
    <button class="pill" onclick={() => progress.openAll()} disabled={progress.data.openAll}>{progress.data.openAll ? 'All Adventure places are open' : 'Open all Adventure places'}</button>
    {#if confirmReset}
      <button class="pill stop" onclick={() => { progress.reset(); confirmReset = false; }}>Yes, erase this player's stars</button>
      <button class="pill" onclick={() => (confirmReset = false)}>Keep them</button>
    {:else}
      <button class="pill" onclick={() => (confirmReset = true)}>Reset this player's stars</button>
    {/if}
  </div>
  <div class="log">{listener.log.length ? 'Steady notes heard (newest first):\n' + listener.log.join('\n') : ''}</div>
  <p class="tips">{listener.sampleRate ? `Sample rate: ${listener.sampleRate} Hz · ` : ''}{navigator.userAgent}</p>
  <p class="tips">To judge accuracy: in Discover, play each key from low C to high C slowly. "Raw note" should match right away, and "Steady note" should settle quickly without flickering. If it misses soft notes, lower the gate. If keys light up when nobody plays, raise it. "Piano only" ignores sounds that don't start with a key strike or whose pitch wobbles, like talking. If it ignores real piano notes, raise "Pitch wobble allowed".</p>
</section>
