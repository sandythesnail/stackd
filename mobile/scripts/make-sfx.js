#!/usr/bin/env node
/**
 * Generates the intro's sound effect into assets/sfx/:
 *
 *   levelup.wav   the piggy bank bursting open, as an XP level-up jingle
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

/** One-pole lowpass. Takes the glassy edge off without dulling the attack. */
function lowpass(buf, cutoff) {
  const dt = 1 / RATE;
  const rc = 1 / (2 * Math.PI * cutoff);
  const a = dt / (rc + dt);
  let y = 0;
  for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; }
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

/* ------------------------------------------------------------------ level up */
/**
 * The piggy bank bursting, as an XP level-up rather than a pile of loose change.
 *
 * A spill of coins is what physically happens, and it was rendered that way — nine inharmonic
 * metal hits at random pitches. It sounded like dropped money, which is to say it sounded like
 * losing money. A level-up says the opposite with the same event: something was earned.
 *
 * What makes a jingle read as "level up":
 *   - It goes UP. Four notes climbing a major arpeggio (C-E-G-C), which is the most
 *     unambiguously positive shape in twelve-tone music and why every game uses it.
 *   - The notes are HARMONIC (integer multiples), not inharmonic like struck metal. Harmonic
 *     partials are what the ear hears as a musical note rather than an object being hit.
 *   - It lands. The last note is held longer than the three that lead to it, with an octave
 *     of shimmer on top, so the phrase resolves instead of just stopping.
 */
const ARPEGGIO = [523.25, 659.25, 783.99, 1046.50];   // C5 E5 G5 C6
const NOTE_GAP = 0.085;                                // seconds between note onsets

function renderLevelUp() {
  const dur = 1.35;
  const n = Math.floor(RATE * dur);
  const buf = new Float64Array(n);

  // A soft swell underneath the whole phrase, so the arpeggio sits on something rather than
  // floating in silence. Two octaves below the root, barely audible on its own.
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.04) * Math.exp(-t / 0.55);
    buf[i] += 0.22 * env * Math.sin(2 * Math.PI * 130.81 * t);
  }

  ARPEGGIO.forEach((f0, idx) => {
    const last = idx === ARPEGGIO.length - 1;
    const s0 = Math.floor(idx * NOTE_GAP * RATE);
    const decay = last ? 0.62 : 0.26;
    const gain = last ? 1.0 : 0.78;

    for (let i = 0; i < n - s0; i++) {
      const t = i / RATE;
      const env = Math.min(1, t / 0.006) * Math.exp(-t / decay);
      if (env < 0.0004) break;
      let v = 0;
      // Harmonic series, rolled off fast so it stays bell-bright rather than organ-thick.
      for (const [mult, amp] of [[1, 1.0], [2, 0.34], [3, 0.14], [4, 0.07]]) {
        if (f0 * mult >= NYQUIST * 0.92) continue;
        v += amp * Math.sin(2 * Math.PI * f0 * mult * t);
      }
      // Shimmer on the final note only: an octave up, delayed and quiet, which is the sparkle
      // that says "and it's done" without adding another note to the phrase.
      if (last && t > 0.05) {
        v += 0.20 * Math.exp(-(t - 0.05) / 0.32) * Math.sin(2 * Math.PI * f0 * 2 * t);
      }
      buf[s0 + i] += v * gain * env;
    }
  });

  lowpass(buf, 9000);
  normalise(buf, 0.84, 0.14);
  return buf;
}


/* ------------------------------------------------------------------ coins */
/**
 * Coins jangling — the piggy bank's contents landing, which is what the animation shows.
 *
 * The very first version of this file was also a coin spill and was thrown out for sounding
 * like DROPPED money. Two things were wrong with it, and neither was the idea:
 *
 *   1. It aliased. Partials ran past Nyquist and folded back as inharmonic mush (see the
 *      header). Struck metal is already inharmonic, so aliasing on top of it is the one case
 *      where you cannot hear that anything is broken — it just sounds cheap.
 *   2. The hits were spread at random over the whole length, so it read as coins falling one
 *      by one onto a hard floor: a slow, unlucky, money-going-away sound.
 *
 * A JANGLE is the opposite event — coins moving against each other, all at once, in a hand or
 * a jar. So the hits are front-loaded into a tight cluster (most of them inside the first
 * 180ms, a few stragglers after), which is the rhythm of a handful being shaken rather than
 * dropped. Each coin is a small metal disc: a few inharmonic partials high in the spectrum,
 * a very short decay, and a click of filtered noise at the onset for the edge-on contact.
 *
 * Pitches are drawn from a fixed set of disc sizes rather than at random across a range, so
 * the same few "coins" recur through the cluster and it sounds like one pocketful instead of
 * twelve unrelated objects.
 */
// Ratios for a small struck disc. Not a harmonic series — metal isn't — but chosen to sit
// close enough to consonant that a cluster of them rings rather than clashes.
const DISC_PARTIALS = [[1, 1.0], [2.41, 0.62], [3.86, 0.38], [5.17, 0.20], [7.02, 0.09]];
// Five coin sizes. Higher = smaller coin.
const COIN_F0 = [1180, 1420, 1650, 1980, 2360];

/** Deterministic PRNG (mulberry32), so a re-run of this script is byte-identical. */
function rng(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function renderCoins() {
  const dur = 1.15;
  const n = Math.floor(RATE * dur);
  const buf = new Float64Array(n);
  const rand = rng(20260818);

  const HITS = 14;
  for (let h = 0; h < HITS; h++) {
    // Front-loaded: t^2 over the first 0.42s packs most hits into the first third, which is
    // the shake. The last two or three trail off as the handful settles.
    const frac = h / (HITS - 1);
    const onset = frac * frac * 0.42 + rand() * 0.02;
    const s0 = Math.floor(onset * RATE);
    if (s0 >= n) break;

    // Detuned a few percent per hit so no two coins are literally the same object.
    const f0 = COIN_F0[Math.floor(rand() * COIN_F0.length)] * (0.94 + rand() * 0.12);
    const decay = 0.055 + rand() * 0.075;
    // The first hits are the loudest — a shake starts with the impact, not with a swell.
    const gain = (0.55 + rand() * 0.45) * (1 - frac * 0.45);

    for (let i = 0; i < n - s0; i++) {
      const t = i / RATE;
      const env = Math.min(1, t / 0.0009) * Math.exp(-t / decay);
      if (env < 0.0005) break;
      let v = 0;
      for (const [mult, amp] of DISC_PARTIALS) {
        const f = f0 * mult;
        // The header's rule, and the whole reason the first attempt sounded wrong: never
        // render a partial anywhere near Nyquist, drop it instead of letting it fold back.
        if (f >= NYQUIST * 0.9) continue;
        v += amp * Math.sin(2 * Math.PI * f * t);
      }
      // Contact click: 3ms of noise at the onset, the sound of two edges meeting before
      // either of them starts to ring.
      if (t < 0.003) v += (rand() * 2 - 1) * 1.5 * (1 - t / 0.003);
      buf[s0 + i] += v * gain * env;
    }
  }

  // Gentler than the jingle's 9k — coins live high, and rolling them off hard is what makes
  // a metal sound read as muffled or plastic. Just enough to take the noise burst's fizz off.
  lowpass(buf, 12500);
  normalise(buf, 0.80, 0.12);
  return buf;
}

/* ------------------------------------------------------------------ main */
fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [name, render] of [['levelup', renderLevelUp], ['coins', renderCoins]]) {
  const out = wav(render());
  const file = path.join(OUT_DIR, `${name}.wav`);
  fs.writeFileSync(file, out);
  console.log(`✓ ${name}.wav — ${(out.length / 1024).toFixed(1)}KB, ${RATE}Hz mono`);
}
