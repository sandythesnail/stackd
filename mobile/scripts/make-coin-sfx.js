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
// 1.6s, up from 1.0. The old file ended while the coins were still ringing, so it stopped
// rather than finished — the "cuts off immediately" complaint. Nothing is added to the front;
// the extra time is tail, which is where a sound gets to sound satisfied with itself.
const DURATION = 1.6;      // seconds
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

/** A quiet major arpeggio under the coins — C5 E5 G5 C6, the shape every game uses to say
 * "you earned that".
 *
 * The coins alone are an EVENT (metal landing) with no opinion about whether the event was
 * good. Rising harmonic notes are the opinion. They sit well under the hits — this is still a
 * coin jangle, not a jingle with coins on top — and their decays run long, so the phrase is
 * what remains once the metal has stopped clattering, and the sound ends on a held note
 * instead of a cut. */
const ARPEGGIO = [523.25, 659.25, 783.99, 1046.50];
const ARP_GAP = 0.10;      // seconds between note onsets
// Up from 0.26. The arpeggio is the part that says "good thing happened", and under the old
// mix it was a hint rather than a statement — audible in isolation, lost under eleven coins.
const ARP_GAIN = 0.42;     // still under the coins, but now clearly present

/** C major, two octaves of it — C E G, from C6 up. Coin-sized fundamentals (metal this small
 * rings high) that happen to spell the same chord the arpeggio plays. */
const COIN_NOTES = [
  1046.50, 1318.51, 1567.98,   // C6  E6  G6
  2093.00, 2637.02, 3135.96,   // C7  E7  G7
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
    // TUNED, not random. This is what makes the jangle major rather than vaguely ominous.
    //
    // Random fundamentals across 1500-3200 Hz land wherever they land, and eleven of them at
    // once produce every interval at once — including the minor thirds and tritones that are
    // exactly what "minor key" sounds like. The ear does not need a melody to hear a key; a
    // cluster of pitches is enough, and an untuned cluster averages out gloomy.
    //
    // So each coin takes a note from a C major triad spread over two octaves. The partials
    // above it stay inharmonic (that is still what makes it metal, not a bell choir) but the
    // fundamentals now agree with each other and with the arpeggio underneath.
    const f0 = COIN_NOTES[Math.floor(rand() * COIN_NOTES.length)];
    // Longer than the old 0.07-0.17. Real coins on a hard surface ring for a good while after
    // the strike, and the short decays are the other half of why this stopped dead.
    const decay = 0.11 + rand() * 0.20;       // seconds to 1/e
    const gain = 0.55 + rand() * 0.45;
    const pan = 0;                             // mono; the burst is centred on screen
    const s0 = Math.floor(start * RATE);

    for (let i = 0; i < n - s0; i++) {
      const t = i / RATE;
      let v = 0;
      for (const [ratio, amp, decayMul] of PARTIALS) {
        // Nyquist guard, and it matters more here than anywhere else in this file. At 22050 the
        // ceiling is 11025, and the 8.93 partial of a high coin lands near 28 kHz — which does
        // not vanish, it FOLDS back down as a partial at some unrelated frequency. Inharmonic
        // metal hides that better than anything else, which is why it was never obvious; but a
        // pile of folded partials is a pile of pitches nobody chose, and it is a large part of
        // why a tuned major chord still came out sounding sour.
        if (f0 * ratio >= RATE / 2 * 0.9) continue;
        const env = Math.exp(-t / (decay * decayMul));
        if (env < 0.0005) continue;
        v += amp * env * Math.sin(2 * Math.PI * f0 * ratio * t);
      }
      // Impact transient: 4ms of filtered noise, the sound of contact before the ring.
      if (t < 0.004) v += (rand() * 2 - 1) * 0.9 * (1 - t / 0.004);
      buf[s0 + i] += v * gain * (1 - pan);
    }
  }

  // The arpeggio, laid under everything above. Harmonic partials (integer multiples), unlike
  // the coins' inharmonic ones — that difference is exactly what the ear hears as "a note"
  // rather than "an object being hit", and it is what makes this read as earning something.
  ARPEGGIO.forEach((f0, idx) => {
    const last = idx === ARPEGGIO.length - 1;
    const s0 = Math.floor((0.06 + idx * ARP_GAP) * RATE);
    const decay = last ? 0.75 : 0.34;
    for (let i = 0; i < n - s0; i++) {
      const t = i / RATE;
      const env = Math.min(1, t / 0.008) * Math.exp(-t / decay);
      if (env < 0.0004) break;
      let v = 0;
      for (const [mult, amp] of [[1, 1.0], [2, 0.30], [3, 0.12]]) {
        // Nyquist guard. At 22050 the ceiling is 11025, and a partial past it folds back down
        // the spectrum as noise that has nothing to do with the note.
        if (f0 * mult >= RATE / 2 * 0.9) continue;
        v += amp * Math.sin(2 * Math.PI * f0 * mult * t);
      }
      buf[s0 + i] += v * env * ARP_GAIN * (last ? 1.15 : 1);
    }
  });

  // Normalise to just under full scale, then fade the last 60ms so the file can't end on a
  // discontinuity (which would click on every platform).
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(buf[i]));
  const norm = peak > 0 ? 0.86 / peak : 1;
  // A long fade, not the old 60ms. 60ms is a click-guard; this is a decrescendo, and it is
  // what turns "the file ended" into "the sound finished".
  const fade = Math.floor(0.34 * RATE);
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
