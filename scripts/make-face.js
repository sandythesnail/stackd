#!/usr/bin/env node
/**
 * Builds one of Hammy's illustrated face overlays (faces/*.png) out of a source artwork sheet.
 *
 * app.css has always pointed at a `process_faces.js` that was never committed, so this is a
 * reimplementation measured off the crops it produced — hammy-gentle.png, sad-face.png and
 * nervy-face.png all share the exact same oval alpha falloff, and matching it is what makes a
 * new face sit in the CSS pig's skin instead of reading as a pasted rectangle.
 * faces/README.md explains the framing rules; the short version is that a crop only drops into
 * an existing overlay box unchanged if BOTH the illustrated head's rendered width and the eye
 * line's relative height in the box match the face being replaced.
 *
 *   node scripts/make-face.js                    rebuild hammy-mouth-confused.png (web + mobile)
 *   node scripts/make-face.js --face             rebuild the full-face crop hammy-confused.png
 *   node scripts/make-face.js --profile <png>    print a PNG's mid-row/col alpha falloff
 *
 * No dependencies — PNG in/out is done here with zlib, since the repo deliberately has none.
 */
'use strict';
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/** The wrong-answer face: bottom-left pig of the four on newconfusedface.png (the other three
 *  are scribbled out). Crop box is in source pixels; see faces/README.md for how it was
 *  derived — eyes sit at y=349.5 (x=62.5 and x=134) and the head spans x=35..161. */
const CONFUSED = {
  src: 'faces/newconfusedface.png',
  out: ['faces/hammy-confused.png', 'mobile/assets/images/hammy-faces/hammy-confused.png'],
  box: { x: 29.25, y: 307.4, w: 138, h: 106 },
  size: { w: 520, h: 400 },
  // This sheet gives ~170px per pig where the older sources gave ~950, so the crop is upscaled
  // rather than downscaled into the overlay box. Without the unsharp pass the eye rims and the
  // mouth line go mushy; the rest of the art is smooth gradient it leaves alone.
  unsharp: { sigma: 2.2, amount: 0.85 },
};

/** The wrong-answer MOUTH: the same pig's mouth only, lifted off its skin as an alpha mask so it
 *  composites onto the CSS pig's resting face (which keeps its own eyes/cheeks/snout).
 *
 *  Why a mask and not a crop: the mouth is a ~16x12px stroke whose core only reaches 63% coverage
 *  (downscaling averaged a thin dark line into the pink), and the CSS pig's skin is a slightly
 *  different pink from the artwork's. Cropping a rectangle of artwork would drop a faintly
 *  off-hue patch onto the cheek; solving for coverage against the artwork's own skin and keeping
 *  only the ink means nothing but the stroke lands on Hammy.
 *
 *  Box/placement maths (source px -> the pig's 440x460 frame) live in faces/README.md. */
const MOUTH = {
  src: 'faces/newconfusedface.png',
  out: ['faces/hammy-mouth-confused.png', 'mobile/assets/images/hammy-faces/hammy-mouth-confused.png'],
  // Ink spans x 98..113, y 377..388; this box adds a small margin on every side. The top edge
  // starts at 377 on purpose — row 376 still catches the snout's shadow at ~11% coverage, which
  // shows up as a smudge above the mouth.
  box: { x: 95, y: 377, w: 22, h: 14 },
  scale: 6,
  // Darkest ink in this artwork (its eyes bottom out at rgb 33,14,24; the same pig's mouth in the
  // older high-res confused.png is 39,0,14). Any ink at least this dark reproduces the stroke,
  // since the solved coverage compensates — see README.
  ink: [40, 14, 26],
  // Kills the snout's lower shading, which creeps into the top rows as a few percent of coverage.
  floor: 0.07, band: 0.08,
};

/* Oval cut-out, shared by every face in faces/. Fully opaque inside normalised elliptical
 * radius R_IN, eased to fully transparent at R_OUT. */
const R_IN = 0.72, R_OUT = 1.03, EASE = 1.08;

/* The cream paper the artwork sits on. Pink has r noticeably above g; the paper does not. */
const isPaper = (r, g, b) => r - g < 14 && r > 225 && g > 218;

// ─────────────────────────────── minimal PNG codec ───────────────────────────────

function readChunks(buf) {
  let off = 8; const out = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    out.push({ type: buf.toString('ascii', off + 4, off + 8), data: buf.slice(off + 8, off + 8 + len) });
    off += 12 + len;
  }
  return out;
}

const paeth = (a, b, c) => {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** Decodes an 8-bit PNG (gray/RGB/palette/alpha variants) to flat RGBA. */
function decode(file) {
  const cs = readChunks(fs.readFileSync(file));
  const ihdr = cs.find(c => c.type === 'IHDR').data;
  const width = ihdr.readUInt32BE(0), height = ihdr.readUInt32BE(4);
  const depth = ihdr[8], colorType = ihdr[9];
  if (depth !== 8) throw new Error(`${file}: only 8-bit PNGs supported (got ${depth}-bit)`);
  if (ihdr[12]) throw new Error(`${file}: interlaced PNGs not supported`);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`${file}: unsupported colour type ${colorType}`);
  const plte = cs.find(c => c.type === 'PLTE');
  const trns = cs.find(c => c.type === 'tRNS');

  const idat = zlib.inflateSync(Buffer.concat(cs.filter(c => c.type === 'IDAT').map(c => c.data)));
  const stride = width * channels;
  const raw = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = idat[pos++];
    const line = idat.slice(pos, pos + stride); pos += stride;
    const cur = raw.slice(y * stride, (y + 1) * stride);
    const prev = y > 0 ? raw.slice((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a; else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1; else if (filter === 4) v += paeth(a, b, c);
      cur[x] = v & 0xff;
    }
  }

  const data = new Uint8Array(width * height * 4);
  for (let i = 0, n = width * height; i < n; i++) {
    const s = i * channels, d = i * 4;
    if (colorType === 6) { data[d] = raw[s]; data[d + 1] = raw[s + 1]; data[d + 2] = raw[s + 2]; data[d + 3] = raw[s + 3]; }
    else if (colorType === 2) { data[d] = raw[s]; data[d + 1] = raw[s + 1]; data[d + 2] = raw[s + 2]; data[d + 3] = 255; }
    else if (colorType === 0) { data[d] = data[d + 1] = data[d + 2] = raw[s]; data[d + 3] = 255; }
    else if (colorType === 4) { data[d] = data[d + 1] = data[d + 2] = raw[s]; data[d + 3] = raw[s + 1]; }
    else { const p = raw[s] * 3;
      data[d] = plte.data[p]; data[d + 1] = plte.data[p + 1]; data[d + 2] = plte.data[p + 2];
      data[d + 3] = trns && raw[s] < trns.data.length ? trns.data[raw[s]] : 255; }
  }
  return { width, height, data };
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    let c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encode(file, { width, height, data }) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const o = y * (stride + 1);
    raw[o] = 1; // Sub filter — cheap and effective on this kind of smooth artwork.
    for (let x = 0; x < stride; x++) {
      raw[o + 1 + x] = (data[y * stride + x] - (x >= 4 ? data[y * stride + x - 4] : 0)) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]));
}

// ─────────────────────────────────── the build ───────────────────────────────────

/** Floods the cream paper with the nearest pink so the oval's soft edge fades pink-to-transparent.
 *  The oval is deliberately a touch wider than the head (every existing face does this too), so
 *  without the bleed its outer ring carries ~35% cream across the pig's cheeks. */
function bleedPaper(img) {
  const rgb = new Uint8Array(img.data);
  const paper = new Uint8Array(img.width * img.height);
  for (let i = 0; i < paper.length; i++) {
    paper[i] = isPaper(rgb[i * 4], rgb[i * 4 + 1], rgb[i * 4 + 2]) ? 1 : 0;
  }
  const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  for (let pass = 0; pass < 24; pass++) {
    const filled = [];
    for (let y = 1; y < img.height - 1; y++) for (let x = 1; x < img.width - 1; x++) {
      const i = y * img.width + x;
      if (!paper[i]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (const [dx, dy] of NEIGHBOURS) {
        const j = (y + dy) * img.width + (x + dx);
        if (paper[j]) continue;
        r += rgb[j * 4]; g += rgb[j * 4 + 1]; b += rgb[j * 4 + 2]; n++;
      }
      if (n) filled.push([i, r / n, g / n, b / n]);
    }
    if (!filled.length) break;
    for (const [i, r, g, b] of filled) {
      rgb[i * 4] = r; rgb[i * 4 + 1] = g; rgb[i * 4 + 2] = b; paper[i] = 0;
    }
  }
  return rgb;
}

/** Catmull-Rom resample of `box` (source pixels, may be fractional) into a w x h RGB buffer. */
function resample(img, rgb, box, w, h) {
  const k = [
    t => ((-0.5 * t + 1) * t - 0.5) * t,
    t => (1.5 * t - 2.5) * t * t + 1,
    t => ((-1.5 * t + 2) * t + 0.5) * t,
    t => (0.5 * t - 0.5) * t * t,
  ];
  const at = (x, y, c) => rgb[(Math.min(img.height - 1, Math.max(0, y)) * img.width
    + Math.min(img.width - 1, Math.max(0, x))) * 4 + c];

  const data = new Uint8Array(w * h * 4);
  for (let oy = 0; oy < h; oy++) {
    const sy = box.y + (oy + 0.5) * (box.h / h) - 0.5;
    const iy = Math.floor(sy), wy = k.map(f => f(sy - iy));
    for (let ox = 0; ox < w; ox++) {
      const sx = box.x + (ox + 0.5) * (box.w / w) - 0.5;
      const ix = Math.floor(sx), wx = k.map(f => f(sx - ix));
      const d = (oy * w + ox) * 4;
      for (let c = 0; c < 3; c++) {
        let v = 0;
        for (let m = 0; m < 4; m++) for (let n = 0; n < 4; n++) v += wy[m] * wx[n] * at(ix - 1 + n, iy - 1 + m, c);
        data[d + c] = Math.max(0, Math.min(255, Math.round(v)));
      }
    }
  }
  return data;
}

/** In-place unsharp mask: out = in + amount * (in - gaussianBlur(in)). Alpha is untouched. */
function unsharp(data, w, h, { sigma, amount }) {
  const radius = Math.ceil(sigma * 3);
  const kernel = [];
  for (let i = -radius; i <= radius; i++) kernel.push(Math.exp(-(i * i) / (2 * sigma * sigma)));
  const sum = kernel.reduce((s, v) => s + v, 0);
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;

  const pass = (read, write, horizontal) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
      let v = 0;
      for (let i = -radius; i <= radius; i++) {
        const sx = horizontal ? Math.min(w - 1, Math.max(0, x + i)) : x;
        const sy = horizontal ? y : Math.min(h - 1, Math.max(0, y + i));
        v += kernel[i + radius] * read(sx, sy, c);
      }
      write(x, y, c, v);
    }
  };
  const tmp = new Float32Array(w * h * 3), blur = new Float32Array(w * h * 3);
  pass((x, y, c) => data[(y * w + x) * 4 + c], (x, y, c, v) => { tmp[(y * w + x) * 3 + c] = v; }, true);
  pass((x, y, c) => tmp[(y * w + x) * 3 + c], (x, y, c, v) => { blur[(y * w + x) * 3 + c] = v; }, false);
  for (let i = 0, n = w * h; i < n; i++) for (let c = 0; c < 3; c++) {
    const orig = data[i * 4 + c];
    data[i * 4 + c] = Math.max(0, Math.min(255, Math.round(orig + amount * (orig - blur[i * 3 + c]))));
  }
}

/** Applied last, so the unsharp pass never sees (and never rings against) the transparent surround. */
function ovalCutout(data, w, h) {
  const a = w / 2, b = h / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (x + 0.5 - a) / a, dy = (y + 0.5 - b) / b;
    const t = Math.max(0, Math.min(1, (R_OUT - Math.sqrt(dx * dx + dy * dy)) / (R_OUT - R_IN)));
    data[(y * w + x) * 4 + 3] = Math.round(255 * Math.pow(t, EASE));
  }
}

/** Per-pixel estimate of the skin *under* the ink: a max-luma dilation (radius > the stroke's
 *  width, so the stroke disappears into it) followed by a box blur, which leaves the cheek's own
 *  shading intact. Solving coverage against this rather than one flat skin colour is what keeps
 *  the snout's shadow gradient from reading as ink. */
function estimateSkin(img, radius = 4) {
  const { width: w, height: h, data } = img;
  const L = i => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  const dilated = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let best = -1, bi = (y * w + x) * 4;
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const i = (ny * w + nx) * 4, l = L(i);
      if (l > best) { best = l; bi = i; }
    }
    for (let c = 0; c < 3; c++) dilated[(y * w + x) * 3 + c] = data[bi + c];
  }
  const out = new Float32Array(w * h * 3);
  const br = 3;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
    let sum = 0, n = 0;
    for (let dy = -br; dy <= br; dy++) for (let dx = -br; dx <= br; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      sum += dilated[(ny * w + nx) * 3 + c]; n++;
    }
    out[(y * w + x) * 3 + c] = sum / n;
  }
  return out;
}

/** Builds a mouth-only overlay: solve each pixel's ink coverage, then upscale that coverage as
 *  an alpha mask over a flat ink colour. Nothing but the stroke ends up in the PNG. */
function buildMouth(spec) {
  const img = decode(path.join(ROOT, spec.src));
  const { width: sw, data } = img;
  const skin = estimateSkin(img);
  const ink = spec.ink;

  // Coverage a solving `pixel = a*ink + (1-a)*skin`, least-squares across the three channels.
  const cov = new Float32Array(spec.box.w * spec.box.h);
  let rawPeak = 0;
  for (let y = 0; y < spec.box.h; y++) for (let x = 0; x < spec.box.w; x++) {
    const sx = spec.box.x + x, sy = spec.box.y + y;
    const i = (sy * sw + sx) * 4, s3 = (sy * sw + sx) * 3;
    let num = 0, den = 0;
    for (let c = 0; c < 3; c++) {
      const d = skin[s3 + c] - ink[c];
      num += (skin[s3 + c] - data[i + c]) * d;
      den += d * d;
    }
    let a = Math.max(0, Math.min(1, den ? num / den : 0));
    // Soft floor: fade out anything below `floor`, keeping the stroke's own peak untouched.
    const g = Math.max(0, Math.min(1, (a - spec.floor) / spec.band));
    const v = a * (g * g * (3 - 2 * g));
    cov[y * spec.box.w + x] = v;
    if (v > rawPeak) rawPeak = v;
  }
  // Stretch so the stroke's own darkest pixel reaches full ink strength. At this source's
  // resolution the mouth stroke is only ~16px wide, so even its darkest point is an AA blend
  // that solves to well under 1.0 coverage — left alone, the mouth reads as a lighter smudge
  // than the old full-face artwork's solid dark line instead of matching it.
  if (rawPeak > 0) for (let i = 0; i < cov.length; i++) cov[i] = Math.min(1, cov[i] / rawPeak);

  // Catmull-Rom the coverage up to the output size. Its slight overshoot on a thin stroke reads
  // as a touch more definition, which this 16px-wide source can use; clamped either way.
  const ow = spec.box.w * spec.scale, oh = spec.box.h * spec.scale;
  const k = [
    t => ((-0.5 * t + 1) * t - 0.5) * t,
    t => (1.5 * t - 2.5) * t * t + 1,
    t => ((-1.5 * t + 2) * t + 0.5) * t,
    t => (0.5 * t - 0.5) * t * t,
  ];
  const covAt = (x, y) => cov[Math.min(spec.box.h - 1, Math.max(0, y)) * spec.box.w
    + Math.min(spec.box.w - 1, Math.max(0, x))];

  const out = new Uint8Array(ow * oh * 4);
  for (let oy = 0; oy < oh; oy++) {
    const sy = (oy + 0.5) / spec.scale - 0.5;
    const iy = Math.floor(sy), wy = k.map(f => f(sy - iy));
    for (let ox = 0; ox < ow; ox++) {
      const sx = (ox + 0.5) / spec.scale - 0.5;
      const ix = Math.floor(sx), wx = k.map(f => f(sx - ix));
      let a = 0;
      for (let m = 0; m < 4; m++) for (let n = 0; n < 4; n++) a += wy[m] * wx[n] * covAt(ix - 1 + n, iy - 1 + m);
      const d = (oy * ow + ox) * 4;
      out[d] = ink[0]; out[d + 1] = ink[1]; out[d + 2] = ink[2];
      out[d + 3] = Math.round(255 * Math.max(0, Math.min(1, a)));
    }
  }

  let peak = 0;
  for (let i = 0; i < ow * oh; i++) peak = Math.max(peak, out[i * 4 + 3]);
  for (const o of spec.out) {
    encode(path.join(ROOT, o), { width: ow, height: oh, data: out });
    console.log(`wrote ${o}  ${ow}x${oh}  peak alpha ${(peak / 255 * 100).toFixed(0)}%`);
  }
}

function build(spec) {
  const img = decode(path.join(ROOT, spec.src));
  const { w, h } = spec.size;
  const data = resample(img, bleedPaper(img), spec.box, w, h);
  if (spec.unsharp) unsharp(data, w, h, spec.unsharp);
  ovalCutout(data, w, h);
  for (const out of spec.out) {
    encode(path.join(ROOT, out), { width: w, height: h, data });
    console.log(`wrote ${out}  ${w}x${h}`);
  }
}

/** Prints the mid-row/mid-column alpha falloff, for eyeballing a crop against its neighbours. */
function profile(file) {
  const { width: w, height: h, data } = decode(file);
  const sample = (n, get) => Array.from({ length: 6 }, (_, i) => get(Math.round(i * n / 24)));
  console.log(path.basename(file), `${w}x${h}`);
  console.log('  mid-row alpha:', sample(w, x => data[((h >> 1) * w + x) * 4 + 3]).join(' '), '...');
  console.log('  mid-col alpha:', sample(h, y => data[(y * w + (w >> 1)) * 4 + 3]).join(' '), '...');
}

const args = process.argv.slice(2);
if (args[0] === '--profile') {
  if (!args[1]) { console.error('usage: make-face.js --profile <png>'); process.exit(1); }
  args.slice(1).forEach(profile);
} else if (args[0] === '--face') {
  build(CONFUSED);
} else {
  buildMouth(MOUTH);
}
