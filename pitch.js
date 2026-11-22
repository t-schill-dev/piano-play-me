/*
 * Single-note pitch detector (McLeod Pitch Method / normalized square difference).
 * No dependencies. Works in the browser (window.PitchDetect) and in Node (module.exports).
 *
 * detect(buffer, sampleRate, opts) -> { freq, clarity, rms }
 *   freq    : detected fundamental in Hz (0 if nothing confident)
 *   clarity : 0..1, how "periodic" the sound is (higher = more confident)
 *   rms     : loudness of the frame
 */
(function (root) {
  const DEFAULTS = {
    minFreq: 80,    // a bit below C3 (130.8 Hz) so low notes have headroom
    maxFreq: 1100,  // a bit above C6
    minRms: 0.01,   // silence gate
    peakK: 0.9      // MPM "pick the first peak at least this close to the best one"
  };

  let work = null; // reused scratch buffers

  function detect(input, sampleRate, options) {
    const o = Object.assign({}, DEFAULTS, options || {});
    const n = input.length;
    if (!work || work.length !== n) work = new Float32Array(n);
    const x = work;

    // Remove DC offset and measure loudness.
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

    // Find key maxima: the highest point between each positive-going zero
    // crossing and the next negative-going one (skipping the lobe at lag 0).
    const peaks = [];
    let tau = 1;
    while (tau <= maxLag && nsdf[tau] > 0) tau++;  // leave the lag-0 lobe
    while (tau <= maxLag && nsdf[tau] <= 0) tau++; // first positive region
    while (tau <= maxLag) {
      let best = tau;
      while (tau <= maxLag && nsdf[tau] > 0) {
        if (nsdf[tau] > nsdf[best]) best = tau;
        tau++;
      }
      if (best >= minLag && best < maxLag) peaks.push(best);
      while (tau <= maxLag && nsdf[tau] <= 0) tau++;
    }
    if (!peaks.length) return { freq: 0, clarity: 0, rms };

    let highest = 0;
    for (const p of peaks) if (nsdf[p] > highest) highest = nsdf[p];
    const cut = o.peakK * highest;
    let chosen = peaks[0];
    for (const p of peaks) { if (nsdf[p] >= cut) { chosen = p; break; } }

    // Parabolic interpolation for sub-sample accuracy.
    const a = nsdf[chosen - 1], b = nsdf[chosen], c = nsdf[chosen + 1];
    const denom = a - 2 * b + c;
    let shift = 0, peakVal = b;
    if (denom !== 0) {
      shift = 0.5 * (a - c) / denom;
      if (Math.abs(shift) > 1) shift = 0;
      peakVal = b - 0.25 * (a - c) * shift;
    }
    const period = chosen + shift;
    return { freq: sampleRate / period, clarity: Math.min(1, peakVal), rms };
  }

  const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  function freqToMidi(f) { return 69 + 12 * Math.log2(f / 440); }
  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function midiName(m) { return NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
  function midiLetter(m) { return NAMES[((m % 12) + 12) % 12]; }

  const api = { detect, freqToMidi, midiToFreq, midiName, midiLetter, DEFAULTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PitchDetect = api;
})(typeof window !== 'undefined' ? window : globalThis);
