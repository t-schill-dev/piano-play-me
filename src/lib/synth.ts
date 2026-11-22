/* A tiny piano-ish synth for "Listen first". */
import { midiToFreq } from './pitch';
import type { Note } from './songs';

let audioCtx: AudioContext | null = null;

function ac(): AudioContext {
  const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone(c: AudioContext, midi: number, when: number, dur: number): void {
  const f = midiToFreq(midi);
  const g = c.createGain();
  const len = Math.max(0.35, dur);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.25, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, when + len);
  g.connect(c.destination);
  const partials: [number, OscillatorType, number][] = [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]];
  for (const [mult, type, amp] of partials) {
    const o = c.createOscillator();
    const og = c.createGain();
    o.type = type; o.frequency.value = f * mult; og.gain.value = amp;
    o.connect(og); og.connect(g);
    o.start(when); o.stop(when + len + 0.05);
  }
}

export interface Playback { duration: number; stop(): void; }

/** Play notes at a tempo. onStep(i) fires as note i starts, and onStep(-1) when finished. */
export function playNotes(notes: Note[], bpm: number, onStep?: (i: number) => void): Playback {
  const c = ac();
  const spb = 60 / (bpm || 100);
  const start = c.currentTime + 0.15;
  let t = start;
  const timers: ReturnType<typeof setTimeout>[] = [];
  notes.forEach((n, i) => {
    const dur = n.beats * spb;
    tone(c, n.midi, t, dur * 0.95);
    timers.push(setTimeout(() => onStep?.(i), (t - c.currentTime) * 1000));
    t += dur;
  });
  const duration = (t - start) * 1000 + 150;
  let done = false;
  const endTimer = setTimeout(() => { done = true; onStep?.(-1); }, duration);
  return {
    duration,
    stop() {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout); clearTimeout(endTimer);
      try { audioCtx?.close(); } catch { /* ignore */ }
      audioCtx = null;
      onStep?.(-1);
    },
  };
}
