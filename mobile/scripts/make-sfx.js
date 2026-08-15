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

/* ------------------------------------------------------------------ main */
fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [name, render] of [['levelup', renderLevelUp]]) {
  const out = wav(render());
  const file = path.join(OUT_DIR, `${name}.wav`);
  fs.writeFileSync(file, out);
  console.log(`✓ ${name}.wav — ${(out.length / 1024).toFixed(1)}KB, ${RATE}Hz mono`);
}
