#!/usr/bin/env node
/**
 * Generates the intro's two sound effects into assets/sfx/:
 *
 *   coins.wav   the piggy bank bursting open
 *   oink.wav    Hammy, once per line of dialogue
 *
 * Synthesised rather than licensed, so they can be re-tuned and re-generated instead of being
 * binaries nobody can touch. Seeded PRNG, so a re-run is byte-identical.
 *
 *   npm run gen:sfx
 *
 * WHY THE FIRST VERSION SOUNDED BAD, since it is the whole reason this file was rewritten:
 * it rendered at 22050 Hz (Nyquist 11025) with fundamentals up to 3200 Hz and a partial at
 * 8.93x — 28.5 kHz, nearly three times Nyquist. Everything above Nyquist folds back down the
 * spectrum as inharmonic noise at frequencies that have nothing to do with the note, which is
 * exactly the harsh, cheap, slightly detuned "digital" edge you hear and cannot place. Fixed
 * three ways at once: render at 44.1 kHz, drop fundamentals about an octave, and skip any
 * partial that would land near Nyquist rather than letting it alias.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const RATE = 44100;
const NYQUIST = RATE / 2;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'sfx');

/** Mulberry32 — small, seedable, good enough for scattering coins. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One-pole lowpass. Takes the glassy edge off without dulling the attack. */
function lowpass(buf, cutoff) {
  const dt = 1 / RATE;
  const rc = 1 / (2 * Math.PI * cutoff);
  const a = dt / (rc + dt);
  let y = 0;
  for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; }
}

/** Resonant band-pass biquad (RBJ cookbook) — used as a vocal-tract formant for the oink. */
function bandpass(buf, freq, q, gain) {
  const w = 2 * Math.PI * freq / RATE;
  const alpha = Math.sin(w) / (2 * q);
  const b0 = alpha, b1 = 0, b2 = -alpha;
  const a0 = 1 + alpha, a1 = -2 * Math.cos(w), a2 = 1 - alpha;
  const out = new Float64Array(buf.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x0 = buf[i];
    const y0 = (b0 / a0) * x0 + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
    out[i] = y0 * gain;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
  }
  return out;
}

function normalise(buf, peakTarget, fadeSec) {
  let peak = 0;
  for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
  const norm = peak > 0 ? peakTarget / peak : 1;
  const fade = Math.floor(fadeSec * RATE);
  for (let i = 0; i < buf.length; i++) {
    buf[i] *= norm;
    if (i > buf.length - fade) buf[i] *= (buf.length - i) / fade;
    // A 2ms fade-IN as well: starting mid-waveform is a click on some decoders.
    if (i < RATE * 0.002) buf[i] *= i / (RATE * 0.002);
  }
}

function wav(buf) {
  const pcm = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) {
    pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(buf[i] * 32767))), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/* ------------------------------------------------------------------ coins */
/* Bell-like inharmonic partials (ratio, amplitude, decay multiplier). Metal is inharmonic —
 * its overtones are not integer multiples — and using bell ratios rather than octaves is the
 * single thing that decides whether this reads as metal or as a music box. */
const PARTIALS = [
  [1.00, 1.00, 1.00],
  [2.76, 0.48, 0.70],
  [5.40, 0.20, 0.48],
  [8.93, 0.08, 0.34],
];

function renderCoins() {
  const dur = 1.25;
  const n = Math.floor(RATE * dur);
  const buf = new Float64Array(n);
  const rand = rng(20260814);

  // A low body thump for the bank itself giving way — without it the burst is all treble and
  // sounds like a wind chime rather than something breaking.
  for (let i = 0; i < RATE * 0.30; i++) {
    const t = i / RATE;
    const env = Math.exp(-t / 0.075);
    buf[i] += 0.75 * env * Math.sin(2 * Math.PI * (150 - 60 * t / 0.30) * t);
  }

  // Nine coins, an octave lower than the first attempt (they were piercing) and front-loaded
  // so most land together with a few trailing off.
  for (let c = 0; c < 9; c++) {
    const start = Math.pow(rand(), 1.6) * 0.50;
    const f0 = 780 + rand() * 900;
    const decay = 0.10 + rand() * 0.13;
    const gain = 0.45 + rand() * 0.42;
    const s0 = Math.floor(start * RATE);

    for (let i = 0; i < n - s0; i++) {
      const t = i / RATE;
      let v = 0;
      for (const [ratio, amp, decayMul] of PARTIALS) {
        // Skip rather than alias — see the header.
        if (f0 * ratio >= NYQUIST * 0.92) continue;
        const env = Math.exp(-t / (decay * decayMul));
        if (env < 0.0004) continue;
        v += amp * env * Math.sin(2 * Math.PI * f0 * ratio * t);
      }
      // Contact transient: quieter and shorter than before, where it was a 0.9-amplitude
      // click that dominated the hit it was supposed to introduce.
      if (t < 0.0025) v += (rand() * 2 - 1) * 0.28 * (1 - t / 0.0025);
      buf[s0 + i] += v * gain;
    }
  }

  lowpass(buf, 7200);
  normalise(buf, 0.82, 0.10);
  return buf;
}

/* ------------------------------------------------------------------ oink */
/**
 * A pig grunt, built the way a voice is: a buzzy harmonic source (the vocal folds) pushed
 * through two resonant band-passes (the vocal tract). The nasal quality that makes it read as
 * "oink" rather than "buzz" comes from those two formants sitting low and close — around 640
 * and 1250 Hz — plus a pitch contour that rises and then drops, which is the shape of the
 * sound as an actual pig makes it.
 */
function renderOink() {
  const dur = 0.42;
  const n = Math.floor(RATE * dur);
  const src = new Float64Array(n);
  const rand = rng(777);

  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const p = t / dur;
    // Rise then fall: 165 -> 215 -> 130 Hz.
    const f = p < 0.35 ? 165 + (215 - 165) * (p / 0.35) : 215 - (215 - 130) * ((p - 0.35) / 0.65);
    phase += (2 * Math.PI * f) / RATE;
    // Harmonic-rich source, rolled off 1/n and stopped short of Nyquist.
    let v = 0;
    for (let h = 1; h <= 14; h++) {
      if (f * h >= NYQUIST * 0.9) break;
      v += Math.sin(phase * h) / h;
    }
    v += (rand() * 2 - 1) * 0.05;                       // breath
    const env = Math.min(1, p / 0.06) * Math.pow(1 - p, 0.85);  // fast in, tapered out
    src[i] = v * env;
  }

  const f1 = bandpass(src, 640, 4.5, 1.0);
  const f2 = bandpass(src, 1250, 6.0, 0.55);
  const buf = new Float64Array(n);
  for (let i = 0; i < n; i++) buf[i] = f1[i] + f2[i] + src[i] * 0.16;

  lowpass(buf, 3400);
  normalise(buf, 0.72, 0.05);
  return buf;
}

/* ------------------------------------------------------------------ main */
fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [name, render] of [['coins', renderCoins], ['oink', renderOink]]) {
  const out = wav(render());
  const file = path.join(OUT_DIR, `${name}.wav`);
  fs.writeFileSync(file, out);
  console.log(`✓ ${name}.wav — ${(out.length / 1024).toFixed(1)}KB, ${RATE}Hz mono`);
}
