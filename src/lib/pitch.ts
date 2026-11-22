/**
 * Single-note pitch detector (McLeod Pitch Method / normalized square difference).
 * No dependencies. Returns the fundamental, a 0..1 clarity score and loudness.
 */
export interface PitchFrame { freq: number; clarity: number; rms: number; }
export interface DetectOptions { minFreq?: number; maxFreq?: number; minRms?: number; peakK?: number; }

const DEFAULTS: Required<DetectOptions> = { minFreq: 80, maxFreq: 1100, minRms: 0.01, peakK: 0.9 };
let work: Float32Array | null = null;

export function detectPitch(input: Float32Array, sampleRate: number, options: DetectOptions = {}): PitchFrame {
  const o = { ...DEFAULTS, ...options };
  const n = input.length;
  if (!work || work.length !== n) work = new Float32Array(n);
  const x = work;

  let mean = 0;
  for (let i = 0; i < n; i++) mean += input[i];
  mean /= n;
  let energy = 0;
  for (let i = 0; i < n; i++) { const v = input[i] - mean; x[i] = v; energy += v * v; }
  const rms = Math.sqrt(energy / n);
  if (rms < o.minRms) return { freq: 0, clarity: 0, rms };

  const minLag = Math.max(2, Math.floor(sampleRate / o.maxFreq));
  const maxLag = Math.min(Math.ceil(sampleRate / o.minFreq), Math.floor(n / 2));

  // NSDF(tau) = 2 * sum x[i]x[i+tau] / sum (x[i]^2 + x[i+tau]^2)
  const nsdf = new Float32Array(maxLag + 2);
  let m = 2 * energy;
  for (let tau = 0; tau <= maxLag + 1; tau++) {
    if (tau > 0) m -= x[n - tau] * x[n - tau] + x[tau - 1] * x[tau - 1];
    let acf = 0;
    const lim = n - tau;
    for (let i = 0; i < lim; i++) acf += x[i] * x[i + tau];
    nsdf[tau] = m > 0 ? (2 * acf) / m : 0;
  }

  // Key maxima: highest point in each positive lobe after the lag-0 lobe.
  const peaks: number[] = [];
  let tau = 1;
  while (tau <= maxLag && nsdf[tau] > 0) tau++;
  while (tau <= maxLag && nsdf[tau] <= 0) tau++;
  while (tau <= maxLag) {
    let best = tau;
    while (tau <= maxLag && nsdf[tau] > 0) { if (nsdf[tau] > nsdf[best]) best = tau; tau++; }
    if (best >= minLag && best < maxLag) peaks.push(best);
    while (tau <= maxLag && nsdf[tau] <= 0) tau++;
  }
  if (!peaks.length) return { freq: 0, clarity: 0, rms };

  let highest = 0;
  for (const p of peaks) if (nsdf[p] > highest) highest = nsdf[p];
  const cut = o.peakK * highest;
  let chosen = peaks[0];
  for (const p of peaks) { if (nsdf[p] >= cut) { chosen = p; break; } }

  const a = nsdf[chosen - 1], b = nsdf[chosen], c = nsdf[chosen + 1];
  const denom = a - 2 * b + c;
  let shift = 0, peakVal = b;
  if (denom !== 0) {
    shift = 0.5 * (a - c) / denom;
    if (Math.abs(shift) > 1) shift = 0;
    peakVal = b - 0.25 * (a - c) * shift;
  }
  return { freq: sampleRate / (chosen + shift), clarity: Math.min(1, peakVal), rms };
}

const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const freqToMidi = (f: number) => 69 + 12 * Math.log2(f / 440);
export const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export const midiLetter = (m: number) => NAMES[((m % 12) + 12) % 12];
export const midiName = (m: number) => midiLetter(m) + (Math.floor(m / 12) - 1);
export const isBlack = (m: number) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
export const samePitchClass = (a: number, b: number) => ((a - b) % 12 + 12) % 12 === 0;

/** Gentle, consistent colour per note letter (keys and note bubbles). */
export const NOTE_COLORS: Record<string, string> = {
  C: '#e8776b', D: '#f0a04b', E: '#e9c547', F: '#7cbf6a', G: '#5fa8d3', A: '#9a83d1', B: '#e58bb4',
};
export const colorOf = (m: number) => NOTE_COLORS[midiLetter(m).charAt(0)];
