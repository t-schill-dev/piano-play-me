<script lang="ts">
  /*
   * Play-along engine shared by "Play a Song" and Adventure lessons.
   * Shows the notes as coloured bubbles, makes the next key glow, and waits for it.
   * Wrong notes get a kind nudge; the right letter in another octave counts.
   */
  import { onDestroy } from 'svelte';
  import { listener } from '../lib/listener.svelte';
  import { colorOf, midiLetter, samePitchClass } from '../lib/pitch';
  import { playNotes, type Playback } from '../lib/synth';
  import type { Note } from '../lib/songs';
  import Piano from './Piano.svelte';
  import Meter from './Meter.svelte';
  import MicGate from './MicGate.svelte';

  interface Props {
    notes: Note[];
    bpm: number;
    breaks?: number[];
    /** Index where a "play it again" repeat starts, if any. */
    repeatAt?: number | null;
    ondone: (misses: number) => void;
  }
  let { notes, bpm, breaks = [0], repeatAt = null, ondone }: Props = $props();

  let idx = $state(0);
  let misses = $state(0);
  let missedThis = false;
  let finished = $state(false);
  let playingIdx = $state(-1);
  let feedback = $state<{ text: string; cls: string }>({ text: '', cls: '' });
  let playback: Playback | null = null;

  const current = $derived(notes[idx]);
  const target = $derived(finished ? null : playingIdx >= 0 ? notes[playingIdx]?.midi ?? null : current?.midi ?? null);
  const rows = $derived.by(() => {
    const starts = [...new Set([0, ...breaks])].filter((b) => b < notes.length).sort((a, b) => a - b);
    return starts.map((s, i) => ({ start: s, end: i + 1 < starts.length ? starts[i + 1] : notes.length }));
  });

  const CHEERS = ['Yes!', 'Great!', 'Nice!', 'You got it!', 'Super!', 'Lovely!'];
  let cheerIdx = 0;

  export function restart(): void {
    stopPlayback();
    idx = 0; misses = 0; missedThis = false; finished = false;
    feedback = { text: '', cls: '' };
  }

  function handle(m: number): void {
    if (finished || playingIdx >= 0 || !current) return;
    if (samePitchClass(m, current.midi)) {
      const octaveNote = m !== current.midi ? ' (a different ' + midiLetter(m) + ', that counts!)' : '';
      idx++;
      missedThis = false;
      if (idx >= notes.length) {
        finished = true;
        feedback = { text: '', cls: '' };
        ondone(misses);
        return;
      }
      if (repeatAt != null && idx === repeatAt) feedback = { text: 'Great job! Now play it one more time.', cls: 'yes' };
      else feedback = { text: CHEERS[cheerIdx++ % CHEERS.length] + octaveNote, cls: 'yes' };
    } else {
      if (!missedThis) { misses++; missedThis = true; }
      feedback = { text: `That was ${midiLetter(m)}. Look for the glowing ${midiLetter(current.midi)}.`, cls: 'soft' };
    }
  }

  const off = listener.onNote(handle);
  onDestroy(() => { off(); stopPlayback(); });

  function listenFirst(): void {
    stopPlayback();
    // A part lesson repeats its notes; one pass is enough to hear it.
    const part = repeatAt != null ? notes.slice(0, repeatAt) : notes;
    playback = playNotes(part, bpm, (i) => { playingIdx = i; });
    listener.mute(playback.duration + 400);
  }
  function stopPlayback(): void {
    playback?.stop(); playback = null; playingIdx = -1;
  }
</script>

<MicGate />
{#if !finished}
  <div class="bubble">
    <div class="big">Play <span style="color: {current ? colorOf(current.midi) : 'inherit'}">{current ? midiLetter(current.midi) : ''}</span></div>
    <div class="say {feedback.cls}">{playingIdx >= 0 ? 'Listen…' : feedback.text || 'Find the glowing key.'}</div>
  </div>
  <div class="track">
    {#each rows as row, ri (ri)}
      <div class="phrase">
        {#each notes.slice(row.start, row.end) as n, j (row.start + j)}
          {@const i = row.start + j}
          <div class="nb" class:long={n.beats >= 2} class:done={i < idx} class:now={i === idx && playingIdx < 0}
            class:play={i === playingIdx} style="background: {colorOf(n.midi)}">{midiLetter(n.midi)}</div>
        {/each}
      </div>
    {/each}
  </div>
  <div class="player-ctrls">
    {#if playingIdx >= 0}
      <button class="pill" onclick={stopPlayback}>■ Stop the music</button>
    {:else}
      <button class="pill" onclick={listenFirst}>👂 Listen first</button>
    {/if}
    <button class="pill" onclick={restart}>↺ Start over</button>
  </div>
{/if}
<Meter />
<Piano {target} heard={listener.stableMidi} />
