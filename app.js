(function () {
  const P = window.PitchDetect;
  const LOW = 48, HIGH = 72;          // C3 .. C5 shown on screen
  const DETECT_LOW = 45, DETECT_HIGH = 84; // listen a little wider so near-misses are reported
  const $ = (id) => document.getElementById(id);

  // ---------- Piano drawing ----------
  const svg = $('piano');
  const NS = 'http://www.w3.org/2000/svg';
  const keyEls = {};
  const WHITE_W = 60, WHITE_H = 300, BLACK_W = 36, BLACK_H = 188;
  const isBlack = (m) => [1, 3, 6, 8, 10].includes(m % 12);
  function drawPiano() {
    let x = 1;
    const blacks = [];
    for (let m = LOW; m <= HIGH; m++) {
      if (isBlack(m)) { blacks.push({ m, x: x - BLACK_W / 2 }); continue; }
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', x); r.setAttribute('y', 1);
      r.setAttribute('width', WHITE_W); r.setAttribute('height', WHITE_H);
      r.setAttribute('rx', 6); r.setAttribute('class', 'key wk');
      r.dataset.midi = m; svg.appendChild(r); keyEls[m] = r;
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', x + WHITE_W / 2); t.setAttribute('y', WHITE_H - 18);
      t.setAttribute('class', 'lbl' + (m === 60 ? ' mid' : '')); t.textContent = P.midiLetter(m);
      svg.appendChild(t);
      if (m === 60) {
        const t2 = document.createElementNS(NS, 'text');
        t2.setAttribute('x', x + WHITE_W / 2); t2.setAttribute('y', WHITE_H - 46);
        t2.setAttribute('class', 'midc'); t2.textContent = 'middle';
        svg.appendChild(t2);
      }
      x += WHITE_W;
    }
    for (const b of blacks) {
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', b.x); r.setAttribute('y', 1);
      r.setAttribute('width', BLACK_W); r.setAttribute('height', BLACK_H);
      r.setAttribute('rx', 4); r.setAttribute('class', 'key bk');
      r.dataset.midi = b.m; svg.appendChild(r); keyEls[b.m] = r;
    }
    svg.addEventListener('click', (e) => {
      const m = e.target && e.target.dataset && e.target.dataset.midi;
      if (m && mode === 'target') setTarget(Number(m));
    });
  }
  drawPiano();

  // ---------- Settings ----------
  const settings = { gate: 0.012, clarity: 0.85, stable: 4 };
  function bindSlider(id, valId, key, fmt) {
    const el = $(id), out = $(valId);
    const sync = () => { settings[key] = Number(el.value); out.textContent = fmt(settings[key]); };
    el.addEventListener('input', sync); sync();
  }
  bindSlider('sGate', 'vGate', 'gate', (v) => v.toFixed(3));
  bindSlider('sClar', 'vClar', 'clarity', (v) => Math.round(v * 100) + '%');
  bindSlider('sStable', 'vStable', 'stable', (v) => String(v));

  // ---------- Modes ----------
  let mode = 'free', target = null, celebrating = false, stars = 0;
  function setMode(m) {
    mode = m;
    $('mode-free').setAttribute('aria-pressed', m === 'free');
    $('mode-target').setAttribute('aria-pressed', m === 'target');
    $('targetCtrls').classList.toggle('hidden', m !== 'target');
    if (m === 'target') { stars = 0; $('stars').textContent = ''; pickTarget(); }
    else { setTarget(null); say('Play a key!', "I'm listening."); }
  }
  $('mode-free').addEventListener('click', () => setMode('free'));
  $('mode-target').addEventListener('click', () => setMode('target'));
  $('skip').addEventListener('click', () => pickTarget());
  $('pool').addEventListener('change', () => pickTarget());

  function pool() {
    const v = $('pool').value;
    if (v === 'five') return [60, 62, 64, 65, 67];
    const all = []; for (let m = LOW; m <= HIGH; m++) all.push(m);
    return v === 'white' ? all.filter((m) => !isBlack(m)) : all;
  }
  function pickTarget() {
    const p = pool().filter((m) => m !== target);
    setTarget(p[Math.floor(Math.random() * p.length)]);
  }
  function setTarget(m) {
    if (target != null && keyEls[target]) keyEls[target].classList.remove('target');
    target = m; celebrating = false; evaluated = true;
    if (m != null) {
      keyEls[m].classList.add('target');
      say('Find ' + P.midiLetter(m) + '!', 'Play the glowing key when you are ready.');
    }
  }
  function say(big, small, cls) {
    const b = $('bigText');
    b.textContent = big; b.className = 'big' + (cls ? ' ' + cls : '');
    $('sayText').textContent = small || '';
  }

  // ---------- Audio ----------
  let ctx, analyser, buf, running = false;
  $('start').addEventListener('click', start);

  async function start() {
    const err = $('err'); err.classList.add('hidden');
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();                       // must be created inside the tap on Safari
      if (ctx.state === 'suspended') await ctx.resume();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('This browser cannot use the microphone here. The page must be opened over https.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      const src = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;              // ~43 ms window at 48 kHz
      analyser.smoothingTimeConstant = 0;
      src.connect(analyser);                // not connected to speakers: no feedback
      buf = new Float32Array(analyser.fftSize);
      running = true;
      $('start').classList.add('hidden');
      ['stage', 'modes', 'debug'].forEach((id) => $(id).classList.remove('hidden'));
      $('envInfo').textContent = 'Sample rate: ' + ctx.sampleRate + ' Hz · window: ' + analyser.fftSize + ' samples · ' + navigator.userAgent;
      keepAwake();
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && ctx.state !== 'running') ctx.resume();
        if (!document.hidden) keepAwake();
      });
      requestAnimationFrame(loop);
    } catch (e) {
      err.textContent = 'Could not start the microphone: ' + (e && e.message ? e.message : e) +
        '. On iPad, tap "Allow" when Safari asks. If you said no before, tap "aA" in the address bar, then Website Settings, then Microphone, then Allow.';
      err.classList.remove('hidden');
    }
  }

  let wakeLock = null;
  async function keepAwake() {
    try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (_) {}
  }

  // ---------- Stability / note tracking ----------
  let candMidi = null, candCount = 0, stableMidi = null, lastHeardAt = 0;
  let levelAvg = 0, evaluated = true, lastOnsetAt = 0, onsetPending = false;
  const HOLD_MS = 220;
  const logLines = [];

  function loop(now) {
    if (!running) return;
    if (analyser.getFloatTimeDomainData) analyser.getFloatTimeDomainData(buf);
    else { const b = new Uint8Array(buf.length); analyser.getByteTimeDomainData(b); for (let i = 0; i < b.length; i++) buf[i] = (b[i] - 128) / 128; }

    const r = P.detect(buf, ctx.sampleRate, { minRms: settings.gate });

    // Onset: a sudden jump in loudness means a new key press (even the same key again).
    if (r.rms > settings.gate * 1.5 && r.rms > levelAvg * 1.8 && now - lastOnsetAt > 120) {
      lastOnsetAt = now; onsetPending = true; candCount = 0;
    }
    levelAvg = levelAvg * 0.85 + r.rms * 0.15;

    let rawMidi = null;
    if (r.freq > 0 && r.clarity >= settings.clarity) {
      const mf = P.freqToMidi(r.freq);
      rawMidi = Math.round(mf);
      if (rawMidi < DETECT_LOW || rawMidi > DETECT_HIGH) rawMidi = null;
    }

    if (rawMidi != null) {
      if (rawMidi === candMidi) candCount++; else { candMidi = rawMidi; candCount = 1; }
      if (candCount >= settings.stable) {
        if (stableMidi !== rawMidi) { stableMidi = rawMidi; evaluated = false; onsetPending = false; logNote(rawMidi, r); }
        else if (onsetPending) { evaluated = false; onsetPending = false; logNote(rawMidi, r); }
        lastHeardAt = now;
      }
    } else {
      candCount = 0;
      if (stableMidi != null && now - lastHeardAt > HOLD_MS) { stableMidi = null; evaluated = true; }
    }

    render(r, rawMidi);
    if (mode === 'target' && target != null && stableMidi != null && !evaluated && !celebrating) judge(stableMidi);
    requestAnimationFrame(loop);
  }

  let shown = null;
  function render(r, rawMidi) {
    if (shown !== stableMidi) {
      if (shown != null && keyEls[shown]) keyEls[shown].classList.remove('heard');
      if (stableMidi != null && keyEls[stableMidi]) keyEls[stableMidi].classList.add('heard');
      shown = stableMidi;
      if (mode === 'free') {
        if (stableMidi == null) say('Play a key!', "I'm listening.");
        else if (keyEls[stableMidi]) say(P.midiLetter(stableMidi), 'I heard ' + P.midiLetter(stableMidi) + '!');
        else say(P.midiLetter(stableMidi), 'That key is off this little keyboard (' + P.midiName(stableMidi) + ').');
      }
    }
    // Meter + debug readout
    const lvl = Math.min(1, r.rms / 0.15);
    $('meterBar').style.width = (lvl * 100).toFixed(0) + '%';
    $('dRms').textContent = r.rms.toFixed(3);
    $('dClar').textContent = r.freq ? Math.round(r.clarity * 100) + '%' : '–';
    if (r.freq) {
      const mf = P.freqToMidi(r.freq), m = Math.round(mf);
      $('dFreq').textContent = r.freq.toFixed(1) + ' Hz';
      $('dNote').textContent = P.midiName(m) + (rawMidi == null ? ' ?' : '');
      const cents = Math.round((mf - m) * 100);
      $('dCents').textContent = (cents > 0 ? '+' : '') + cents;
    } else {
      $('dFreq').textContent = '–'; $('dNote').textContent = '–'; $('dCents').textContent = '–';
    }
    $('dStable').textContent = stableMidi != null ? P.midiName(stableMidi) : '–';
  }

  function logNote(m, r) {
    const t = new Date();
    logLines.unshift(t.toLocaleTimeString() + '  ' + P.midiName(m).padEnd(4) + '  ' + r.freq.toFixed(1).padStart(7) + ' Hz  conf ' + Math.round(r.clarity * 100) + '%');
    if (logLines.length > 30) logLines.pop();
    $('log').textContent = 'Steady notes heard (newest first):\n' + logLines.join('\n');
  }

  // ---------- Target mode ----------
  const WRONG = [
    (h, t) => ['Ooh, that was ' + h + '!', 'Nice sound. Now try the glowing ' + t + '.'],
    (h, t) => ['Close by!', 'That was ' + h + '. Look for the glowing ' + t + '.'],
    (h, t) => ['Good try!', 'I heard ' + h + '. Can you find ' + t + '?']
  ];
  let wrongIdx = 0;
  function judge(m) {
    evaluated = true;
    const t = P.midiLetter(target);
    if (m === target) {
      celebrating = true; stars++;
      say('Yes! 🎉', 'That was ' + t + '!', 'yes');
      $('stars').textContent = '⭐'.repeat(Math.min(stars, 10)) + (stars > 10 ? ' ×' + stars : '');
      setTimeout(() => { if (mode === 'target') pickTarget(); }, 1800);
    } else if (m % 12 === target % 12) {
      // Right letter, different octave: count it kindly but say so.
      celebrating = true; stars++;
      say('Yes, that is ' + t + '! 🎉', 'It was a different ' + t + ' on the piano. Great ears!', 'yes');
      $('stars').textContent = '⭐'.repeat(Math.min(stars, 10)) + (stars > 10 ? ' ×' + stars : '');
      setTimeout(() => { if (mode === 'target') pickTarget(); }, 2200);
    } else {
      const [big, small] = WRONG[wrongIdx++ % WRONG.length](P.midiLetter(m), t);
      say(big, small, 'soft');
    }
  }
})();
