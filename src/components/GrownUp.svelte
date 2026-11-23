<script lang="ts">
  import { listener } from '../lib/listener.svelte';
  import { progress } from '../lib/progress.svelte';
  import { freqToMidi, midiName } from '../lib/pitch';

  const f = $derived(listener.frame);
  const mf = $derived(f && f.r.freq ? freqToMidi(f.r.freq) : null);
  const s = listener.settings;
  let confirmReset = $state(false);
</script>

<section class="debug">
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
      <button class="pill stop" onclick={() => { progress.reset(); confirmReset = false; }}>Yes, erase all stars</button>
      <button class="pill" onclick={() => (confirmReset = false)}>Keep them</button>
    {:else}
      <button class="pill" onclick={() => (confirmReset = true)}>Reset Adventure progress</button>
    {/if}
  </div>
  <div class="log">{listener.log.length ? 'Steady notes heard (newest first):\n' + listener.log.join('\n') : ''}</div>
  <p class="tips">{listener.sampleRate ? `Sample rate: ${listener.sampleRate} Hz · ` : ''}{navigator.userAgent}</p>
  <p class="tips">To judge accuracy: in Discover, play each key from low C to high C slowly. "Raw note" should match right away, and "Steady note" should settle quickly without flickering. If it misses soft notes, lower the gate. If keys light up when nobody plays, raise it. "Piano only" ignores sounds that don't start with a key strike or whose pitch wobbles, like talking. If it ignores real piano notes, raise "Pitch wobble allowed".</p>
</section>
