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
  // Changing players, Guest or stars needs the family code typed again (unlock lasts until ⚙️ closes).
  let unlocked = $state(false);
  let codeCheck = $state('');
  let wrongCode = $state(false);
  let newCode = $state('');
  let newCode2 = $state('');
  let codeMsg = $state('');
  const STATUS: Record<string, string> = {
    none: 'Not saved (Guest).',
    loading: 'Loading stars…', saving: 'Saving…', saved: 'Saved online ✓',
    offline: 'Offline. Stars will be saved when the internet is back.', error: 'Could not save.',
  };
</script>

<section class="debug">
  <h3 style="margin:0 0 6px">Family and players</h3>
  {#if !family.code}
    {#if family.notice}<p class="notice" style="margin:0 0 8px">{family.notice}</p>{/if}
    <p class="muted" style="margin:0">Not logged in. Guest can play, but nothing is saved and nothing here can be changed or erased.
      To see your family, tap "Family login" on the "Who's playing?" screen.</p>
  {:else}
    <p class="muted" style="margin:0">Logged in on this device.
      {#if progress.saving}Stars for {family.current?.name}: {STATUS[progress.status]}{/if}</p>
    {#if progress.status === 'error' && progress.problem}<p class="err">{progress.problem}</p>{/if}
    {#if family.problem}<p class="err">{family.problem}</p>{/if}
    <div class="plist">
      {#each family.players as p (p.id)}
        {#if unlocked && editing === p.id}
          <PlayerForm name={p.name} avatar={p.avatar} onsave={async (n, a) => { if (await family.updatePlayer(p.id, n, a)) editing = null; }} oncancel={() => (editing = null)} />
        {:else}
          <div class="row">
            <span class="mini big" style="background: {avatarColor(p)}">{p.avatar}</span><b style="min-width:120px">{p.name}</b>
            {#if unlocked}
              <button class="pill" onclick={() => { editing = p.id; removing = null; }}>Change</button>
              {#if removing === p.id}
                <button class="pill stop" onclick={() => { void family.removePlayer(p.id); removing = null; }}>Yes, remove {p.name} and their stars</button>
                <button class="pill" onclick={() => (removing = null)}>Keep</button>
              {:else}
                <button class="pill" onclick={() => { removing = p.id; editing = null; }}>Remove</button>
              {/if}
            {/if}
          </div>
        {/if}
      {/each}
      {#if !family.players.length}<p class="muted" style="margin:0">No players yet. Add one on the "Who's playing?" screen.</p>{/if}
    </div>

    {#if !unlocked}
      <form class="row" style="margin-top:10px" onsubmit={(e) => { e.preventDefault(); if (family.checkCode(codeCheck)) { unlocked = true; codeCheck = ''; wrongCode = false; } else wrongCode = true; }}>
        <input class="pill" type="password" bind:value={codeCheck} placeholder="Family code" autocomplete="off" aria-label="Family code to make changes" />
        <button class="pill" type="submit">🔒 Unlock changes</button>
      </form>
      <p class="muted small" style="margin:4px 0 0">{wrongCode ? 'That is not the family code.' : 'To change players, Guest or stars, type the family code first. This keeps stars safe from accidental erasing.'}</p>
    {:else}
      <label class="ctrl"><span>Show Guest on "Who's playing?"</span>
        <input type="checkbox" class="check" checked={family.showGuest} onchange={(e) => void family.setShowGuest((e.currentTarget as HTMLInputElement).checked)} />
        <span>{family.showGuest ? 'shown' : 'hidden'}</span></label>
      {#if progress.saving}
        <div class="row" style="margin-top:10px">
          <button class="pill" onclick={() => progress.openAll()} disabled={progress.data.openAll}>{progress.data.openAll ? `All Adventure places are open for ${family.current?.name}` : `Open all Adventure places for ${family.current?.name}`}</button>
          {#if confirmReset}
            <button class="pill stop" onclick={() => { progress.reset(); confirmReset = false; }}>Yes, erase {family.current?.name}'s stars</button>
            <button class="pill" onclick={() => (confirmReset = false)}>Keep them</button>
          {:else}
            <button class="pill" onclick={() => (confirmReset = true)}>Erase {family.current?.name}'s stars</button>
          {/if}
        </div>
      {/if}
      <h3 style="margin:16px 0 4px">Change family code</h3>
      <p class="muted small" style="margin:0">All players and stars move to the new code. Then every device is logged out, and you log in again with the new code.</p>
      <form class="row" style="margin-top:6px" onsubmit={async (e) => { e.preventDefault(); codeMsg = ''; if (newCode.trim() !== newCode2.trim()) { codeMsg = 'The two new codes are not the same.'; return; } if (await family.changeCode(newCode)) { newCode = ''; newCode2 = ''; unlocked = false; } }}>
        <input class="pill" type="password" bind:value={newCode} placeholder="New family code" autocomplete="off" aria-label="New family code" />
        <input class="pill" type="password" bind:value={newCode2} placeholder="New code again" autocomplete="off" aria-label="New family code again" />
        <button class="pill" type="submit" disabled={newCode.trim().length < 6}>Change code</button>
      </form>
      {#if codeMsg}<p class="err">{codeMsg}</p>{/if}
      <div class="row" style="margin-top:10px">
        <button class="pill" onclick={() => { unlocked = false; editing = null; removing = null; confirmReset = false; }}>🔒 Lock again</button>
      </div>
    {/if}
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
  <div class="log">{listener.log.length ? 'Steady notes heard (newest first):\n' + listener.log.join('\n') : ''}</div>
  <p class="tips">{listener.sampleRate ? `Sample rate: ${listener.sampleRate} Hz · ` : ''}{navigator.userAgent}</p>
  <p class="tips">To judge accuracy: in Discover, play each key from low C to high C slowly. "Raw note" should match right away, and "Steady note" should settle quickly without flickering. If it misses soft notes, lower the gate. If keys light up when nobody plays, raise it. "Piano only" ignores sounds that don't start with a key strike or whose pitch wobbles, like talking. If it ignores real piano notes, raise "Pitch wobble allowed".</p>
</section>
