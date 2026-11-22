/*
 * Microphone -> steady piano notes, as reactive Svelte state.
 * - listener.stableMidi: the note sounding right now (for lighting a key), or null
 * - listener.onNote(fn): fires once per recognised key strike (again for the same key struck twice)
 * - "Piano only" mode ignores sounds that don't start with a strike or whose pitch wobbles (voices)
 */
import { detectPitch, freqToMidi, midiName, type PitchFrame } from './pitch';

const DETECT_LOW = 45, DETECT_HIGH = 84; // A2..C6: a little wider than the keyboard on screen
const ONSET_WINDOW_MS = 400;             // a piano note must settle within this long after a strike
const HOLD_MS = 220;                     // keep a note lit through brief dropouts

export interface FrameInfo {
  r: PitchFrame;
  rawMidi: number | null;
  spread: number | null;
}

export interface ListenerSettings {
  gate: number; clarity: number; stable: number; spread: number; pianoOnly: boolean;
}

type NoteFn = (midi: number) => void;

class PianoListener {
  running = $state(false);
  starting = $state(false);
  error = $state<string | null>(null);
  stableMidi = $state<number | null>(null);
  frame = $state<FrameInfo | null>(null);
  ignored = $state(0);
  log = $state<string[]>([]);
  sampleRate = $state(0);
  settings = $state<ListenerSettings>({ gate: 0.012, clarity: 0.85, stable: 4, spread: 18, pianoOnly: true });

  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private buf = new Float32Array(2048);
  private stream: MediaStream | null = null;
  private loopGen = 0;
  private wakeLock: { release(): Promise<void> } | null = null;
  private visibilityHooked = false;
  private mutedUntil = 0;
  private noteFns = new Set<NoteFn>();

  // tracking state (not reactive: changes every frame)
  private candMidi: number | null = null;
  private candFrames: number[] = [];
  private candStartAt = 0;
  private lastHeardAt = 0;
  private levelAvg = 0;
  private lastOnsetAt = 0;
  private onsetPending = false;
  private onsetPeak = 0;
  private onsetLo = Infinity;
  private onsetHi = -Infinity;
  private spoiled = false;

  onNote(fn: NoteFn): () => void {
    this.noteFns.add(fn);
    return () => this.noteFns.delete(fn);
  }

  /** Must be called from a tap/click: Safari only allows audio and the mic after a user gesture. */
  async start(): Promise<boolean> {
    if (this.running || this.starting) return this.running;
    this.error = null;
    this.starting = true;
    const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();               // created synchronously inside the tap
    try {
      if (ctx.state === 'suspended') await ctx.resume();
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('this browser cannot use the microphone here (the page must be opened over https)');
      }
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      try { ctx.close(); } catch { /* ignore */ }
      this.starting = false;
      const msg = e instanceof Error ? e.message : String(e);
      this.error = 'Could not start the microphone: ' + msg +
        '. On iPad, tap "Allow" when Safari asks. If you said no before, tap "aA" in the address bar, then Website Settings, then Microphone, then Allow.';
      return false;
    }
    this.ctx = ctx;
    const src = ctx.createMediaStreamSource(this.stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;            // ~43 ms window at 48 kHz
    analyser.smoothingTimeConstant = 0;
    src.connect(analyser);              // never connected to the speakers: no feedback
    this.analyser = analyser;
    this.buf = new Float32Array(analyser.fftSize);
    this.sampleRate = ctx.sampleRate;
    this.reset();
    this.running = true;
    this.starting = false;
    this.keepAwake();
    if (!this.visibilityHooked) {
      this.visibilityHooked = true;
      document.addEventListener('visibilitychange', () => {
        if (!this.running || document.hidden) return;
        if (this.ctx && this.ctx.state !== 'running') this.ctx.resume();
        this.keepAwake();
      });
    }
    const gen = ++this.loopGen;
    requestAnimationFrame((t) => this.loop(t, gen));
    return true;
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    try { this.stream?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    try { this.ctx?.close(); } catch { /* ignore */ }
    this.stream = null; this.ctx = null; this.analyser = null;
    try { this.wakeLock?.release(); } catch { /* ignore */ }
    this.wakeLock = null;
    this.reset();
    this.frame = null;
  }

  /** Ignore everything heard for the next `ms` milliseconds (e.g. while the app plays a tune). */
  mute(ms: number): void {
    this.mutedUntil = Math.max(this.mutedUntil, performance.now() + ms);
    this.stableMidi = null;
    this.candFrames = []; this.candMidi = null; this.onsetPending = false;
  }

  private reset(): void {
    this.candMidi = null; this.candFrames = []; this.candStartAt = 0; this.stableMidi = null;
    this.lastHeardAt = 0; this.levelAvg = 0; this.lastOnsetAt = 0; this.onsetPending = false;
    this.onsetPeak = 0; this.onsetLo = Infinity; this.onsetHi = -Infinity; this.spoiled = false;
  }

  private async keepAwake(): Promise<void> {
    try {
      const nav = navigator as unknown as { wakeLock?: { request(t: string): Promise<{ release(): Promise<void>; addEventListener(e: string, f: () => void): void }> } };
      if (nav.wakeLock && !this.wakeLock) {
        const lock = await nav.wakeLock.request('screen');
        this.wakeLock = lock;
        lock.addEventListener('release', () => { this.wakeLock = null; });
      }
    } catch { /* not supported or refused: fine */ }
  }

  private markSpoiled(): void { this.spoiled = true; this.ignored++; }

  private emitNote(midi: number, r: PitchFrame): void {
    const line = new Date().toLocaleTimeString() + '  ' + midiName(midi).padEnd(4) + '  ' +
      r.freq.toFixed(1).padStart(7) + ' Hz  conf ' + Math.round(r.clarity * 100) + '%';
    this.log = [line, ...this.log].slice(0, 30);
    for (const fn of this.noteFns) { try { fn(midi); } catch (e) { console.error(e); } }
  }

  private loop(now: number, gen: number): void {
    if (!this.running || gen !== this.loopGen || !this.analyser || !this.ctx) return;
    const s = this.settings;
    const buf = this.buf;
    if (this.analyser.getFloatTimeDomainData) this.analyser.getFloatTimeDomainData(buf);
    else {
      const b = new Uint8Array(buf.length); this.analyser.getByteTimeDomainData(b);
      for (let i = 0; i < b.length; i++) buf[i] = (b[i] - 128) / 128;
    }
    const r = detectPitch(buf, this.ctx.sampleRate, { minRms: s.gate });
    const muted = now < this.mutedUntil;

    // Onset: a sudden jump in loudness means a new key strike (even the same key again).
    if (!muted && r.rms > s.gate * 1.5 && r.rms > this.levelAvg * 1.8 && now - this.lastOnsetAt > 120) {
      this.lastOnsetAt = now; this.onsetPending = true; this.candFrames = []; this.candMidi = null;
      this.onsetPeak = r.rms; this.onsetLo = Infinity; this.onsetHi = -Infinity; this.spoiled = false;
    }
    this.levelAvg = this.levelAvg * 0.85 + r.rms * 0.15;

    let rawMidi: number | null = null, mf = 0, spread: number | null = null;
    if (!muted && r.freq > 0 && r.clarity >= s.clarity) {
      mf = freqToMidi(r.freq);
      rawMidi = Math.round(mf);
      if (rawMidi < DETECT_LOW || rawMidi > DETECT_HIGH) rawMidi = null;
    }

    // Piano check, measured from the strike: a piano is loudest right at the strike and its
    // pitch barely moves. Voices swell in more slowly and slide or wobble in pitch.
    const sinceOnset = now - this.lastOnsetAt;
    if (s.pianoOnly && this.lastOnsetAt > 0 && !this.spoiled && sinceOnset <= ONSET_WINDOW_MS) {
      if (r.rms > this.onsetPeak) {
        if (sinceOnset > 70 && r.rms > this.onsetPeak * 1.15) this.markSpoiled();
        this.onsetPeak = r.rms;
      }
      if (rawMidi != null && sinceOnset > 25) {
        const ref = this.candMidi ?? rawMidi;
        if (Math.abs(mf - ref) < 11) {   // skip one-frame octave slips, common in piano attacks
          this.onsetLo = Math.min(this.onsetLo, mf); this.onsetHi = Math.max(this.onsetHi, mf);
          if ((this.onsetHi - this.onsetLo) * 100 > s.spread) this.markSpoiled();
        }
      }
    }

    if (rawMidi != null) {
      if (rawMidi === this.candMidi) this.candFrames.push(mf);
      else { this.candMidi = rawMidi; this.candFrames = [mf]; this.candStartAt = now; }
      if (this.candFrames.length > 40) this.candFrames.shift();
      const need = s.pianoOnly ? Math.max(s.stable, 6) : s.stable;
      if (this.candFrames.length >= need) {
        const win = this.candFrames.slice(-need);
        spread = (Math.max(...win) - Math.min(...win)) * 100;
        let accept = true;
        if (s.pianoOnly && this.stableMidi !== rawMidi) {
          const struck = this.lastOnsetAt > 0 && this.candStartAt >= this.lastOnsetAt - 30 &&
            this.candStartAt - this.lastOnsetAt <= ONSET_WINDOW_MS;
          // Wait ~130 ms after the strike so a singing wobble has time to show itself.
          accept = struck && now - this.lastOnsetAt >= 130 && !this.spoiled && spread <= s.spread;
        }
        if (accept) {
          if (this.stableMidi !== rawMidi) {
            this.stableMidi = rawMidi; this.onsetPending = false; this.emitNote(rawMidi, r);
          } else if (this.onsetPending) {
            this.onsetPending = false; this.emitNote(rawMidi, r);
          }
          this.lastHeardAt = now;
        }
      }
    } else {
      this.candFrames = []; this.candMidi = null;
      if (this.stableMidi != null && now - this.lastHeardAt > HOLD_MS) this.stableMidi = null;
    }

    this.frame = { r, rawMidi, spread };
    requestAnimationFrame((t) => this.loop(t, gen));
  }
}

export const listener = new PianoListener();
