/* ══════════════════════════════════════════════
   Lesson path — Home's "Keep learning" section

   One module's lessons as a winding trail of diamond nodes, ported from the Expo app's
   src/lessonPath/ (geometry.ts, PathNode.tsx, LessonPath.tsx).

   The trade it makes is guidance without a cage: the recommended lesson is unmistakable
   (saturated fill, pulsing halo, dots running into it, gold outline on its module header)
   while every other node keeps FULL contrast and stays clickable, including ones far ahead.
   Nothing here is ever dimmed, because a dimmed node is indistinguishable from a locked one
   and nothing in this app is locked. `current` wins by having things ADDED to it, never by
   the others being taken away.

   One module is on screen at a time, opening on whichever holds the recommended lesson,
   with chevrons paging through the catalog.

   ── Two deliberate divergences from mobile, both because the web's model differs ──

   1. The real-life sub-quest is NOT optional here. On mobile it's `isLifeTask` and carries an
      'optional' state with a star glyph and an "OPTIONAL EXTRA" label. On the web it is a
      required 9th lesson: moduleUnits() includes it, and module completion, mastery, the X/9
      progress everywhere and the continue-card's next-lesson pointer all key off it (see the
      comment on moduleUnits in app.js). Labelling it optional here would tell people they can
      skip a lesson that gates their module completion — a false statement, not a port.

      What IS kept is the part that makes it read as "elsewhere" rather than "ahead": the
      dashed spur, and the position further off the centre line. Mobile keys both of those off
      `isLifeTask` rather than off the state for its own reasons, which is exactly what lets
      the two be separated here. So it still looks aside; it just doesn't claim to be skippable.

   2. Module ordering follows the web's, not mobile's. Mobile orders the carousel by the
      survey track; the web deliberately keeps modules in fixed numeric order and lets
      personalization affect only which one gets the "Recommended" highlight (see
      getTrackModuleIds in app.js). The invariant that matters — the path's highlighted node
      and Home's continue-card can never point at different lessons — is preserved by taking
      the recommended module from the same MODULES.find(m => !isModuleFullyDone(m)) that
      renderHomeMascotCard uses.

   Hover/press handling is a fraction of mobile's, on purpose. PathNode.tsx carries three
   redundant routes into its hover state to work around react-native-web's useHover dropping
   events once a pointer gets classified as touch. That bug doesn't exist here — :hover and
   :focus-visible are the platform's own, so they're used directly.
   ══════════════════════════════════════════════ */

/* ─────────────────────────── geometry ───────────────────────────
   Pure math, ported verbatim from mobile/src/lessonPath/geometry.ts. Kept identical rather
   than re-tuned so the trail has the same shape on both platforms. */

/** Vertical distance between consecutive nodes. */
const LP_NODE_GAP = 96;
/** Rendered width of a node's diamond BEFORE rotation. Rotated 45°, its bounding box is
 *  this × √2 ≈ 82px, which is also the click target — comfortably over the 44px floor. */
const LP_NODE_SIZE = 58;
const LP_NODE_BOX = Math.ceil(LP_NODE_SIZE * Math.SQRT2);
/** Radians of phase per node. ~0.85 gives roughly seven nodes per full left-right-left
 *  cycle, which reads as a wandering trail rather than a zigzag or a near-straight line. */
const LP_PHASE_STEP = 0.85;
/** The trail's column, capped rather than filling the page. */
const LP_MAX_COL = 640;
/** How far a node swings from the centre line at the extremes, as a FRACTION of the column.
 *
 * Mobile hardcodes 78px against a ~390px phone. Carrying that number over literally is what
 * flattens the trail here: the same 78px swung across a desktop column reads as a rule with
 * a slight lean, not a path — the sine is still there, it's just a sixth of the width instead
 * of a fifth. Keeping mobile's RATIO (78/390 = 0.2) rather than its pixel value is what
 * actually ports the shape, and it holds at any column width. */
const LP_AMPLITUDE_RATIO = 0.2;

/** Where each node sits, as a sine wave down the column.
 *
 * A sine rather than an alternating left/right pattern on purpose: alternating puts every
 * node at one of two x values, which reads as two columns with a line stitched between them.
 * A sine passes THROUGH the centre on the way between extremes, so the trail actually curves.
 *
 * `outdent` pushes individual nodes further off the line than the wave would take them —
 * used for the real-life sub-quest at the end of each module, so "not on the main line" is
 * expressed by position and not only by styling. */
function lpSnakePositions(count, colW, outdent) {
  const swingOf = outdent || function () { return 1; };
  const centerX = colW / 2;
  // Held back from the column edge by half a node's bounding box, so the outdented spur
  // (1.5× the swing) still lands inside the column instead of being clipped by it.
  const amplitude = Math.min(colW * LP_AMPLITUDE_RATIO, (colW - LP_NODE_BOX) / 2 / 1.5);
  const pts = [];
  for (let i = 0; i < count; i++) {
    const swing = Math.sin(i * LP_PHASE_STEP) * amplitude * swingOf(i);
    pts.push({ x: centerX + swing, y: LP_NODE_BOX / 2 + i * LP_NODE_GAP });
  }
  return pts;
}

/** Total height a section's path body needs to hold `count` nodes. */
function lpPathHeight(count) {
  return count > 0 ? (count - 1) * LP_NODE_GAP + LP_NODE_BOX : 0;
}

/** The cubic control points for the segment from pts[i] to pts[i+1], using exactly the same
 *  Catmull-Rom formula lpSmoothPath draws with — so anything built on these lands on the
 *  drawn line rather than near it. */
function lpSegmentControls(pts, i) {
  const p0 = pts[i - 1] || pts[i];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[i + 2] || p2;
  return {
    p1: p1,
    p2: p2,
    c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
    c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
  };
}

/** Points sampled along the drawn curve from pts[i] to pts[i+1].
 *
 * The travelling dots interpolate along the same bézier the SVG draws, not along a straight
 * line between the two node centres — the whole point of them is to run ALONG the trail into
 * the next node, and a straight interpolation visibly leaves it wherever that stretch bows. */
function lpSegmentSamples(pts, i, samples) {
  const n = samples || 24;
  if (i < 0 || i + 1 >= pts.length) return [];
  const c = lpSegmentControls(pts, i);
  const out = [];
  for (let s = 0; s < n; s++) {
    const t = s / (n - 1);
    const u = 1 - t;
    out.push({
      x: u * u * u * c.p1.x + 3 * u * u * t * c.c1.x + 3 * u * t * t * c.c2.x + t * t * t * c.p2.x,
      y: u * u * u * c.p1.y + 3 * u * u * t * c.c1.y + 3 * u * t * t * c.c2.y + t * t * t * c.p2.y,
    });
  }
  return out;
}

/** An SVG `d` that runs smoothly through every point (Catmull-Rom converted to cubic
 * béziers). Straight segments between nodes would defeat the sine — the trail has to curve
 * as much as the nodes do or the whole thing reads as a zigzag.
 *
 * `through` stops the pen after that many points while still computing every control point
 * from the FULL array, which is the only way to draw a shorter stroke that lies exactly on
 * top of a longer one. Slicing the array first doesn't work: a Catmull-Rom tangent depends on
 * the point AFTER the segment's end, so a slice makes the last segment bend differently from
 * the same segment in the full path — visible as the green walked-so-far stroke peeling off
 * the grey trail as it approaches its head. */
function lpSmoothPath(pts, through) {
  const end = Math.min(through === undefined ? pts.length : through, pts.length);
  if (pts.length < 2 || end < 2) return '';
  let d = 'M ' + pts[0].x.toFixed(2) + ' ' + pts[0].y.toFixed(2);
  for (let i = 0; i < end - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ' C ' + c1x.toFixed(2) + ' ' + c1y.toFixed(2) + ', ' +
         c2x.toFixed(2) + ' ' + c2y.toFixed(2) + ', ' +
         p2.x.toFixed(2) + ' ' + p2.y.toFixed(2);
  }
  return d;
}

/* ─────────────────────────── state ─────────────────────────── */

const LP_STATE_WORDS = {
  completed: 'completed',
  current: 'recommended next',
  available: 'available',
};
const LP_STATE_LABEL = {
  completed: 'COMPLETED',
  current: 'RECOMMENDED NEXT',
  available: 'NOT STARTED',
};
/** The hover card's much shorter wording, and the dot colour that carries it.
 *
 * Deliberately not LP_STATE_LABEL: that set is written for the preview modal's pill, where a
 * four-syllable all-caps phrase has a whole panel to sit in. On a card that floats over the
 * path while the cursor is moving, the same words read as a paragraph. Two quiet words plus a
 * coloured dot say the same thing at a glance. */
const LP_STATE_TIP = {
  completed: { label: 'Completed', tone: 'var(--green-light)' },
  current: { label: 'Up next', tone: 'var(--green)' },
  available: { label: 'Not started', tone: '#9DAE99' },
};

/** Which module the path is showing. Sticky once the user pages the carousel, so a re-render
 *  (finishing a lesson, claiming a reward) doesn't yank them back to the recommended module. */
let lpPickedModule = null;
/** Cancels the running comet animation. One path is on screen at a time, so one handle. */
let lpCometStop = null;

function lpReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Every lesson in a module, in display order, with the state each node should wear.
 *
 * `recommended` is the {moduleId, unitId} the path should highlight, computed once by the
 * caller from the same source Home's continue-card uses — see the divergence note at the top
 * of this file for why that matters. */
function lpSection(m, recommended) {
  const quest = hasQuest(m);
  const units = quest ? moduleUnits(m) : [];
  const sub = quest ? moduleSubQuest(m) : null;

  const nodes = units.map(function (q, i) {
    const qp = state.questProgress[questKey(m.id, q.id)];
    const done = !!(qp && qp.done);
    const isRec = recommended && recommended.moduleId === m.id && recommended.unitId === q.id;
    const isLife = !!(sub && q.id === sub.id);
    return {
      key: m.id + '-' + q.id,
      moduleId: m.id,
      questId: q.id,
      index: i,
      // Exactly what the module list's lesson tiles show, prefix included, so the same lesson
      // can't be called two different things on two screens.
      title: (isLife ? 'Real-life sub-quest: ' : '') +
        (q.topic || (q.character && q.character.name) || ('Lesson ' + (i + 1))),
      // What the preview is for — a title alone rarely says what a lesson is actually about.
      // The web's per-quest descriptor is character.tagline (the module list's .lt-meta);
      // mobile reads a per-lesson `hook` paragraph, which has no equivalent here. Falls back
      // to the module's own hook rather than leaving the panel with a bare title.
      hook: (q.character && q.character.tagline) || m.hook || '',
      // Its own field rather than being read back off the state: the node's state becomes
      // 'completed' once it's finished, so anything keying off state would silently stop
      // being true for exactly the lessons that have been played — which on mobile used to
      // pull the sub-quest back onto the main line the moment you completed it.
      isLifeTask: isLife,
      state: done ? 'completed' : isRec ? 'current' : 'available',
    };
  });

  const doneCount = nodes.filter(function (n) { return n.state === 'completed'; }).length;
  return {
    module: m,
    nodes: nodes,
    done: doneCount,
    total: nodes.length,
    mastered: nodes.length > 0 && doneCount >= nodes.length,
  };
}

/** The lesson the whole screen points at.
 *
 * Taken from the same search renderHomeMascotCard runs, so the highlighted node and the
 * continue-card are incapable of naming different lessons. */
function lpRecommended() {
  const mod = MODULES.find(function (m) { return !isModuleFullyDone(m); });
  if (!mod || !hasQuest(mod)) return null;
  const units = moduleUnits(mod);
  const next = units.find(function (q) {
    const qp = state.questProgress[questKey(mod.id, q.id)];
    return !(qp && qp.done);
  });
  return next ? { moduleId: mod.id, unitId: next.id } : null;
}

/* ─────────────────────────── render ─────────────────────────── */

/** Builds Home's lesson path into `containerId`. Safe to call on every render — it tears
 *  down the previous comet loop and rebuilds from current state. */
function renderLessonPath(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (lpCometStop) { lpCometStop(); lpCometStop = null; }
  container.innerHTML = '';

  const recommended = lpRecommended();
  const sections = MODULES.map(function (m) { return lpSection(m, recommended); })
    .filter(function (s) { return s.nodes.length > 0; });
  if (!sections.length) return;

  const shownId = lpPickedModule || (recommended && recommended.moduleId) || sections[0].module.id;
  let shownIdx = sections.findIndex(function (s) { return s.module.id === shownId; });
  if (shownIdx < 0) shownIdx = 0;
  const section = sections[shownIdx];

  const trackIds = getTrackModuleIds();
  const recommendedTrack = trackIds.indexOf(section.module.id) >= 0 && !section.mastered
    && recommended && recommended.moduleId === section.module.id;

  container.appendChild(lpSectionEl(section, shownIdx, sections, recommendedTrack));
}

function lpSectionEl(section, shownIdx, sections, recommendedTrack) {
  const mod = section.module;
  const nodes = section.nodes;
  const reduced = lpReducedMotion();

  const wrap = document.createElement('div');
  wrap.className = 'lp-section';
  wrap.setAttribute('data-mod', mod.id);

  /* The recommended row is always rendered at a fixed height and only its CONTENTS are
     conditional. Mounting and unmounting it moved the module name, the trail and everything
     under it on every page — which reads as the page jumping. */
  const pct = section.total ? Math.round((section.done / section.total) * 100) : 0;
  const head = document.createElement('div');
  head.className = 'lp-head-block';
  head.innerHTML =
    '<div class="lp-rec-row">' +
      (recommendedTrack
        ? '<span class="lp-rec-pill">★ RECOMMENDED FOR YOU</span>' +
          '<span class="lp-rec-note">picked from your track</span>'
        : '') +
    '</div>' +
    '<div class="lp-head' + (recommendedTrack ? ' lp-head-rec' : '') + '">' +
      '<button type="button" class="lp-pager" data-lp-page="-1" aria-label="Previous module">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>' +
      '</button>' +
      '<div class="mod-icon" data-mod="' + mod.id + '">' + mod.icon + '</div>' +
      '<div class="lp-head-main">' +
        '<div class="lp-head-name">' + escapeHtml(mod.title) + '</div>' +
        '<div class="lp-head-meta">' +
          '<span class="lp-head-count">' + section.done + '/' + section.total + '</span>' +
          '<span class="lp-bar-track"><span class="lp-bar-fill' + (section.mastered ? ' lp-bar-done' : '') + '" style="width:' + pct + '%"></span></span>' +
        '</div>' +
      '</div>' +
      (section.mastered ? '<span class="lp-done-pill">DONE</span>' : '') +
      '<button type="button" class="lp-pager" data-lp-page="1" aria-label="Next module">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>' +
      '</button>' +
    '</div>' +
    '<div class="lp-position">MODULE ' + (shownIdx + 1) + ' OF ' + sections.length + '</div>';
  wrap.appendChild(head);

  head.querySelectorAll('[data-lp-page]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const delta = parseInt(btn.getAttribute('data-lp-page'), 10);
      const next = (shownIdx + delta + sections.length) % sections.length;
      lpPickedModule = sections[next].module.id;
      renderLessonPath('home-lesson-path');
    });
  });

  /* ── the trail ── */
  const lastIdx = nodes.length - 1;
  const hasSpur = !!(nodes[lastIdx] && nodes[lastIdx].isLifeTask) && nodes.length >= 2;
  const h = lpPathHeight(nodes.length);
  const colW = LP_MAX_COL;

  const body = document.createElement('div');
  body.className = 'lp-body';
  body.style.height = h + 'px';
  body.style.width = colW + 'px';

  // The sub-quest swings 1.5× further off the line than the wave would take it, so "not on
  // the main line" is said by position and not only by styling. Keyed off isLifeTask, not
  // state, so finishing it doesn't pull it back onto the trail.
  const pts = lpSnakePositions(nodes.length, colW, function (i) {
    return nodes[i] && nodes[i].isLifeTask ? 1.5 : 1;
  });

  /* Two separate strokes, so two separate point sets — and everything drawn ON either stroke
     (the walked-so-far overlay, the travelling dots) is derived from the SAME set as the
     stroke it has to lie on. Mixing them is what puts the dots beside the trail rather than
     on it: a Catmull-Rom control point depends on its neighbours, so the identical pair of
     nodes bends differently depending on which array it was taken from. */
  const mainPts = hasSpur ? pts.slice(0, -1) : pts;
  const spurPts = hasSpur ? pts.slice(-2) : [];
  const mainD = lpSmoothPath(mainPts);
  const spurD = hasSpur ? lpSmoothPath(spurPts) : '';

  // The stretch already walked, drawn in green over the grey — progress becomes the shape of
  // the path rather than a number in the header, which is the reason to draw a path at all.
  let firstUndone = nodes.findIndex(function (n) { return n.state !== 'completed'; });
  const walked = firstUndone === -1 ? nodes.length : firstUndone;
  const walkedD = lpSmoothPath(mainPts, hasSpur ? Math.min(walked, mainPts.length) : walked);
  const spurWalked = hasSpur && nodes[lastIdx].state === 'completed';

  const gid = 'lp-walked-' + mod.id;
  body.insertAdjacentHTML('beforeend',
    '<svg class="lp-svg" width="' + colW + '" height="' + h + '" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#84AB7B"/><stop offset="1" stop-color="#4F9D52"/>' +
      '</linearGradient></defs>' +
      // A wider pale under-stroke so the trail sits ON the page rather than being a rule
      // ruled across it.
      '<path d="' + mainD + '" stroke="#EAF0E8" stroke-width="15" stroke-linecap="round" fill="none"/>' +
      '<path d="' + mainD + '" stroke="#E2E9DC" stroke-width="9" stroke-linecap="round" fill="none"/>' +
      (walkedD ? '<path d="' + walkedD + '" stroke="url(#' + gid + ')" stroke-width="9" stroke-linecap="round" fill="none"/>' : '') +
      (spurD ? '<path d="' + spurD + '" stroke="' + (spurWalked ? '#B2C9AE' : '#E9EFE5') + '" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 12" fill="none"/>' : '') +
    '</svg>');

  /* ── nodes ── */
  const accent = modColorDeep(mod.id);
  nodes.forEach(function (n, i) {
    const slot = document.createElement('div');
    slot.className = 'lp-slot';
    slot.style.left = (pts[i].x - LP_NODE_BOX / 2) + 'px';
    slot.style.top = (pts[i].y - LP_NODE_BOX / 2) + 'px';
    if (!reduced) slot.style.animationDelay = (i * 55) + 'ms';

    const isCurrent = n.state === 'current';
    const isDone = n.state === 'completed';

    /* The four states are separated on THREE channels at once — fill, border treatment and
       glyph — rather than on brightness alone. That is the whole ballgame for this screen:
       the usual way to make one node dominant is to mute the others, and a muted node is
       indistinguishable from a locked one. Nothing here is ever dimmed. */
    const fill = isCurrent ? 'var(--green)' : isDone ? 'var(--green-pale)' : '#fff';
    const border = isCurrent ? 'var(--green-dark)' : isDone ? 'var(--green-light)' : accent;
    const glyphColor = isCurrent ? '#fff' : isDone ? 'var(--green-dark)' : accent;
    // The node's own accent, so the glow belongs to the diamond it's under rather than
    // tinting every node on the path the same green.
    const glow = isCurrent ? 'var(--green)' : isDone ? 'var(--green-light)' : accent;

    const glyph = isDone
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><polyline points="20 6 9 17 4 12"/></svg>'
      : isCurrent
        ? '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><polygon points="6 4 20 12 6 20"/></svg>'
        : '<span class="lp-num">' + (i + 1) + '</span>';

    slot.innerHTML =
      '<span class="lp-lift" style="background:' + glow + '"></span>' +
      (isCurrent ? '<span class="lp-ripple"></span><span class="lp-halo"></span>' : '') +
      '<button type="button" class="lp-hit"' +
        ' aria-label="' + escapeHtml(n.title) + '. ' + LP_STATE_WORDS[n.state] + '."' +
        (isCurrent ? ' aria-current="true"' : '') + '>' +
        '<span class="lp-diamond" style="background:' + fill + ';border-color:' + border + ';--lp-glow:' + glow + '">' +
          '<span class="lp-glyph" style="color:' + glyphColor + '">' + glyph + '</span>' +
        '</span>' +
      '</button>' +
      (isCurrent ? '<span class="lp-start-tag">START</span>' : '');

    if (n.isLifeTask) slot.classList.add('lp-slot-spur');

    const hit = slot.querySelector('.lp-hit');
    hit.addEventListener('click', function () { lpOpenPreview(n, section); });
    // Hover/focus card. :hover alone can't build the card (it needs the node's data), so the
    // pointer events drive a shared tip element positioned against this node.
    hit.addEventListener('mouseenter', function () { lpShowTip(n, pts[i], body, colW, h); });
    hit.addEventListener('mouseleave', lpHideTip);
    hit.addEventListener('focus', function () { lpShowTip(n, pts[i], body, colW, h); });
    hit.addEventListener('blur', lpHideTip);

    body.appendChild(slot);
  });

  /* ── the comet ── */
  const currentIdx = nodes.findIndex(function (n) { return n.state === 'current'; });
  if (!reduced && currentIdx > 0) {
    // The dots run the last stretch of trail into the recommended node, so they follow
    // whichever stroke that stretch actually is — the dashed spur when the sub-quest is next.
    const samples = (hasSpur && currentIdx === lastIdx)
      ? lpSegmentSamples(spurPts, 0)
      : lpSegmentSamples(mainPts, currentIdx - 1);
    if (samples.length >= 2) lpCometStop = lpStartComet(body, samples);
  }

  wrap.appendChild(body);
  return wrap;
}

/* ─────────────────────────── comet ─────────────────────────── */

/** Three dots chasing each other along the last stretch of trail into the recommended node.
 *
 * They follow the drawn curve rather than a straight line between the two node centres —
 * lpSegmentSamples walks the same bézier the SVG renders, so they stay on the trail wherever
 * it bows. Plain elements moved by transform, which is the cheap path for the compositor.
 * Returns its own stop function; the caller holds exactly one. */
function lpStartComet(body, samples) {
  const layer = document.createElement('div');
  layer.className = 'lp-comet-layer';
  const dots = [0, 0.14, 0.28].map(function (lag, i) {
    const d = document.createElement('span');
    d.className = 'lp-comet' + (i ? ' lp-comet-faint' : '');
    layer.appendChild(d);
    return { el: d, lag: lag };
  });
  body.appendChild(layer);

  const n = samples.length;
  const PERIOD = 1600;
  let raf = 0;
  let start = 0;

  /** Position along the sampled curve at 0..1, linearly interpolated between samples. */
  function at(p) {
    const f = p * (n - 1);
    const i = Math.min(n - 2, Math.floor(f));
    const t = f - i;
    return {
      x: samples[i].x + (samples[i + 1].x - samples[i].x) * t,
      y: samples[i].y + (samples[i + 1].y - samples[i].y) * t,
    };
  }

  function frame(now) {
    if (!start) start = now;
    const head = ((now - start) % PERIOD) / PERIOD;
    dots.forEach(function (d) {
      const p = head - d.lag;
      if (p <= 0 || p >= 1) { d.el.style.opacity = '0'; return; }
      const pos = at(p);
      // Fades in and out at the ends so a dot doesn't pop into existence at a node's edge,
      // and swells through the middle of the run.
      const fade = p < 0.25 ? p / 0.25 : p > 0.8 ? (1 - p) / 0.2 : 1;
      const scale = p < 0.5 ? 0.5 + p : 1.4 - p;
      d.el.style.opacity = String(fade * (d.lag ? 0.5 : 1));
      d.el.style.transform = 'translate(' + (pos.x - 5) + 'px,' + (pos.y - 5) + 'px) scale(' + scale.toFixed(3) + ')';
    });
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return function stop() {
    if (raf) cancelAnimationFrame(raf);
    if (layer.parentNode) layer.parentNode.removeChild(layer);
  };
}

/* ─────────────────────────── hover card ─────────────────────────── */

/** What a diamond is, while the cursor is on it.
 *
 * Answers one question — "what is this one?" — in one line plus a state word, and that's the
 * entire brief: a three-line paragraph chasing the pointer around the path is noise, not a
 * preview. The click route into the same lesson opens the full panel with the whole scenario.
 *
 * Non-interactive (pointer-events: none in CSS), so it can never eat the click it is
 * describing. It sits above the node where there's room and flips below where there isn't
 * (the top row of every path), measuring its own height rather than assuming one — the card
 * is one or two title lines depending on the lesson, and a fixed offset would put the
 * two-line version over the node it belongs to. */
function lpShowTip(node, at, body, colW, colH) {
  lpHideTip();
  const tip = LP_STATE_TIP[node.state];
  const el = document.createElement('div');
  el.className = 'lp-tip';
  el.id = 'lp-tip';
  el.innerHTML =
    '<div class="lp-tip-state">' +
      '<span class="lp-tip-dot" style="background:' + tip.tone + '"></span>' +
      '<span class="lp-tip-label">' + tip.label.toUpperCase() + '</span>' +
    '</div>' +
    '<div class="lp-tip-title">' + escapeHtml(node.title) + '</div>';
  // Placed offscreen for one paint so its real height can be measured before it's positioned.
  el.style.visibility = 'hidden';
  body.appendChild(el);

  const h = el.offsetHeight;
  const w = el.offsetWidth;
  const above = at.y - LP_NODE_BOX / 2 - h - 9;
  const below = at.y + LP_NODE_BOX / 2 + 9;
  // Prefer above; drop below only when that would clip off the top of the column. The final
  // clamp keeps the flipped card inside the column too, for a path short enough that neither
  // side fits outright.
  el.style.top = (above >= 0 ? above : Math.min(below, Math.max(0, colH - h))) + 'px';
  el.style.left = Math.max(6, Math.min(at.x - w / 2, colW - w - 6)) + 'px';
  el.style.visibility = '';
}

function lpHideTip() {
  const old = document.getElementById('lp-tip');
  if (old && old.parentNode) old.parentNode.removeChild(old);
}

/* ─────────────────────────── preview ─────────────────────────── */

/** Look before you leap. The call to action is worded from the node's state, because
 *  "Start lesson" is wrong in two of the three cases. */
function lpOpenPreview(node, section) {
  const modal = lpGetPreviewModal();
  const done = node.state === 'completed';
  const cta = done ? 'Do it again' : node.state === 'current' ? 'Continue lesson' : 'Start lesson';
  const pillClass = done ? 'lp-pill-done' : node.state === 'current' ? 'lp-pill-rec' : 'lp-pill-new';

  modal.innerHTML =
    '<div class="lp-preview-card" data-mod="' + node.moduleId + '">' +
      '<div class="lp-preview-head">' +
        '<span class="lp-preview-pill ' + pillClass + '">' + LP_STATE_LABEL[node.state] + '</span>' +
        '<span class="lp-preview-meta">' + escapeHtml(section.module.title) +
          (section.total ? ' · Lesson ' + (node.index + 1) + ' of ' + section.total : '') + '</span>' +
      '</div>' +
      '<h2 class="lp-preview-title">' + escapeHtml(node.title) + '</h2>' +
      (node.hook ? '<p class="lp-preview-hook">' + escapeHtml(node.hook) + '</p>' : '') +
      (node.isLifeTask
        ? '<p class="lp-preview-note">★ A real-life step-by-step guide. It counts toward finishing the module.</p>'
        : '') +
      (done
        ? '<p class="lp-preview-note">✓ You already finished this one. Replaying it won\'t change your progress.</p>'
        : '') +
      '<button type="button" class="btn-primary lp-preview-cta" id="lp-preview-start">' + cta + '</button>' +
      '<button type="button" class="lp-preview-close" id="lp-preview-close">Not now</button>' +
    '</div>';
  modal.classList.add('show');

  document.getElementById('lp-preview-start').addEventListener('click', function () {
    lpClosePreview(modal);
    startQuest(node.moduleId, node.questId);
  });
  document.getElementById('lp-preview-close').addEventListener('click', function () {
    lpClosePreview(modal);
  });
  makeModalAccessible(modal, function () { lpClosePreview(modal); });
}

function lpGetPreviewModal() {
  let modal = document.getElementById('lp-preview-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'lp-preview-modal';
    modal.className = 'achievement-modal-overlay lp-preview-overlay';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) lpClosePreview(modal);
    });
  }
  return modal;
}

function lpClosePreview(modal) {
  modal.classList.remove('show');
  if (modal._a11yCleanup) modal._a11yCleanup();
}
