#!/usr/bin/env node
/**
 * Generates assets/sfx/coins.wav — the sound of coins spilling out of the piggy bank when it
 * breaks open in the intro (hammy-intro.tsx).
 *
 * Synthesised rather than sourced. A commissioned or stock sample would need a licence, a
 * provenance note and a binary nobody in this repo can regenerate or adjust; this is a few
 * hundred lines of arithmetic that anyone can re-run and re-tune, and it commits a 40KB WAV
 * instead of a megabyte of MP3.
 *
 * How it makes a "coin" sound, which is worth stating because the parameters look arbitrary:
 *
 *   - Metal is INHARMONIC. A struck coin's overtones are not integer multiples of the
 *     fundamental (which is what makes a flute sound like a flute); they sit at irrational-ish
 *     ratios. The PARTIALS ratios below are bell-like, and using them instead of 2x/3x is the
 *     single thing that decides whether this reads as metal or as a music box.
 *   - Each clink starts with a very short noise transient — the physical impact before the
 *     body of the coin rings. Without it the sound is a tone that fades in, not a hit.
 *   - Decay is exponential and SHORT, and higher partials decay faster than lower ones, which
 *     is what real struck metal does. A flat decay sounds synthetic.
 *   - Coins land at random times over ~400ms with random pitches, so it reads as several
 *     coins rather than one; a regular interval sounds like a machine.
 *
 * Deterministic: the PRNG is seeded, so re-running produces byte-identical output and the
 * committed asset can be verified rather than trusted. Change SEED to roll a different spill.
 *
 * Usage: npm run gen:sfx
 */
'use strict';

const fs = require('fs');
const path = require('path');

const RATE = 22050;        // plenty for a short metallic hit; halves the file vs 44.1k
const DURATION = 1.0;      // seconds
const SEED = 20260813;
const COINS = 11;
const OUT = path.join(__dirname, '..', 'assets', 'sfx', 'coins.wav');

/** Bell-like inharmonic partials (ratio, relative amplitude, decay multiplier). */
const PARTIALS = [
  [1.00, 1.00, 1.00],
  [2.76, 0.62, 0.72],
  [5.40, 0.34, 0.52],
  [8.93, 0.16, 0.38],
];

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

function render() {
  const n = Math.floor(RATE * DURATION);
  const buf = new Float64Array(n);
  const rand = rng(SEED);

  for (let c = 0; c < COINS; c++) {
    // Front-loaded: the bank bursts, so most coins land at once and a few trail off.
    const start = Math.pow(rand(), 1.7) * 0.42;
    const f0 = 1500 + rand() * 1700;          // coin-sized fundamentals
    const decay = 0.07 + rand() * 0.10;       // seconds to 1/e
    const gain = 0.55 + rand() * 0.45;
    const pan = 0;                             // mono; the burst is centred on screen
    const s0 = Math.floor(start * RATE);

    for (let i = 0; i < n - s0; i++) {
      const t = i / RATE;
      let v = 0;
      for (const [ratio, amp, decayMul] of PARTIALS) {
        const env = Math.exp(-t / (decay * decayMul));
        if (env < 0.0005) continue;
        v += amp * env * Math.sin(2 * Math.PI * f0 * ratio * t);
      }
      // Impact transient: 4ms of filtered noise, the sound of contact before the ring.
      if (t < 0.004) v += (rand() * 2 - 1) * 0.9 * (1 - t / 0.004);
      buf[s0 + i] += v * gain * (1 - pan);
    }
  }

  // Normalise to just under full scale, then fade the last 60ms so the file can't end on a
  // discontinuity (which would click on every platform).
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(buf[i]));
  const norm = peak > 0 ? 0.86 / peak : 1;
  const fade = Math.floor(0.06 * RATE);
  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    let v = buf[i] * norm;
    if (i > n - fade) v *= (n - i) / fade;
    pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), i * 2);
  }
  return pcm;
}

function wav(pcm) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);        // PCM chunk size
  header.writeUInt16LE(1, 20);         // format = PCM
  header.writeUInt16LE(1, 22);         // channels = mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);  // byte rate
  header.writeUInt16LE(2, 32);         // block align
  header.writeUInt16LE(16, 34);        // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const out = wav(render());
fs.writeFileSync(OUT, out);
console.log(`✓ wrote ${path.relative(path.join(__dirname, '..'), OUT)} (${(out.length / 1024).toFixed(1)}KB, ${DURATION}s, ${RATE}Hz mono)`);
