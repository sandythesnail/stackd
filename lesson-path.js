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

   ── Where this differs from mobile, and why ──

   Module ordering follows the web's, not mobile's. Mobile orders the carousel by the survey
   track; the web deliberately keeps modules in fixed numeric order and lets personalization
   affect only which one gets the "Recommended" highlight (see getTrackModuleIds in app.js).
   The invariant that matters — the path's highlighted node and Home's continue-card can never
   point at different lessons — is preserved by taking the recommended module from the same
   MODULES.find(m => !isModuleFullyDone(m)) that renderHomeMascotCard uses.

   Hover/press handling is a fraction of mobile's, on purpose. PathNode.tsx carries three
   redundant routes into its hover state to work around react-native-web's useHover dropping
   events once a pointer gets classified as touch. That bug doesn't exist here — :hover and
   :focus-visible are the platform's own, so they're used directly.
   ══════════════════════════════════════════════ */

/* ─────────────────────────── geometry ───────────────────────────
   The SHAPE is ported verbatim from mobile/src/lessonPath/geometry.ts — same sine, same
   phase step, same node-gap-to-node-size ratio — so the trail winds the same way on both
   platforms. The SCALE is not, and deliberately: see LP_SCALE. */

/** How much bigger a node is here than on the phone.
 *
 * Mobile's 58px diamond is drawn against a ~390pt screen — about a seventh of its width. The
 * same 58 CSS pixels on a 1440px desktop is a fifteenth, and the path came out as a row of
 * small tokens on a lot of empty page: the one control on Home that the whole screen is
 * pointing at was also the smallest thing on it, and the onboarding tour's "tap this one"
 * step had to draw a highlight around something the size of a favicon.
 *
 * This is the same argument LP_AMPLITUDE_RATIO already makes below about the swing, applied
 * to the nodes themselves — carrying a phone's pixel values onto a desktop unchanged is not
 * what porting the design means. Everything derived from it (gap, stroke weights, glyph size,
 * the halo and ripple) scales together, and the CSS reads the result rather than repeating
 * it, so there is one number to change and nothing that can drift from it. */
const LP_SCALE = 1.3;

/** Vertical distance between consecutive nodes. */
const LP_NODE_GAP = Math.round(96 * LP_SCALE);
/** Rendered width of a node's diamond BEFORE rotation. Rotated 45°, its bounding box is
 *  this × √2, which is also the click target — comfortably over the 44px floor. */
const LP_NODE_SIZE = Math.round(58 * LP_SCALE);
const LP_NODE_BOX = Math.ceil(LP_NODE_SIZE * Math.SQRT2);
/** Radians of phase per node. ~0.85 gives roughly seven nodes per full left-right-left
 *  cycle, which reads as a wandering trail rather than a zigzag or a near-straight line. */
const LP_PHASE_STEP = 0.85;
/** The trail's column, capped rather than filling the page. Scaled with the nodes so the
 *  bigger diamonds keep the same room to swing rather than crowding the centre line. */
const LP_MAX_COL = Math.round(640 * LP_SCALE);
/** How far a node swings from the centre line at the extremes, as a FRACTION of the column.
 *
 * Mobile hardcodes 78px against a ~390px phone. Carrying that number over literally is what
 * flattens the trail here: the same 78px swung across a desktop column reads as a rule with
 * a slight lean, not a path — the sine is still there, it's just a sixth of the width instead
 * of a fifth. Keeping mobile's RATIO (78/390 = 0.2) rather than its pixel value is what
 * actually ports the shape, and it holds at any column width. */
const LP_AMPLITUDE_RATIO = 0.2;

/** A stroke weight, tuned against mobile's node size and scaled to this one. The trail's
 * strokes have to grow with the diamonds they connect — left at their original weights
 * against 30% bigger nodes they read as thread between beads rather than as a path. */
function lpStroke(w) { return Math.round(w * LP_SCALE * 10) / 10; }

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

/** One distinct expression per module — eleven modules, eleven different faces.
 *
 * Ported from mobile's MODULE_FACE. Two of these are the quest player's own answer reactions,
 * which a student already knows from answering questions: happy on Saving, gentle on Loans.
 * Both are mouth-only overlays — Hammy keeps his eyes, cheeks and snout and only the mouth
 * changes — so they read subtler than the nine full-face swaps around them.
 *
 * The nine full faces are the same mood classes Home's mascot uses (see app.css's .mood-*);
 * the two mouth-only ones get .face-happy / .face-gentle, which are the same artwork the
 * quest companion wears, unscoped from it so anything can use them. */
const LP_MODULE_FACE = {
  earning: 'mood-wink',
  spending: 'mood-surprise',
  saving: 'face-happy',
  investing: 'mood-star',
  credit: 'mood-sleepy',
  risk: 'mood-nervy',
  loans: 'face-gentle',
  taxes: 'mood-sad',
  psychology: 'mood-love',
  career: 'mood-curious',
  scams: 'mood-angry',
};

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
  // A lesson stepped into and left. Flatly wrong to call it "not started", which is what it
  // read as before. Not a state of its own — see the note on `inProgress`. Mobile's word for
  // the same idea, so the two apps don't have separate vocabulary for one situation.
  started: 'IN PROGRESS',
  // The sub-quest, when it is neither finished nor the recommended next. It is genuinely
  // optional — moduleRequiredUnits leaves it out, so a module completes, masters and reads
  // 8/8 without it — and the label says so, because a student who doesn't want to go and
  // open a real account should be able to see that they aren't giving anything up.
  lifeTask: 'OPTIONAL · REAL LIFE SUB-QUEST',
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
  started: { label: 'In progress', tone: 'var(--green)' },
  lifeTask: { label: 'Optional sub-quest', tone: '#F0C22E' },
};

/** Which label a node wears, which is NOT the same question as which state it is in.
 *
 * The state drives the node's shape and colour on the path, and there are four of those.
 * These two extra labels are orthogonal to it: a lesson can be started and also be the
 * recommended next one, and the sub-quest is a normal node that happens to be elsewhere.
 * Neither should change how the diamond looks, only what it is called. */
function lpLabelKey(n) {
  if (n.state === 'completed' || n.state === 'current') return n.state;
  if (n.isLifeTask) return 'lifeTask';
  return n.inProgress ? 'started' : 'available';
}

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
  // Display order — the 8 counted lessons plus the optional sub-quest, which the path does
  // show (as a node off the main line) even though nothing counts it. done/total below are
  // taken off the counted ones only, so an untouched sub-quest never holds the ring at 8/9.
  const units = quest ? moduleAllUnits(m) : [];
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
      // A lesson stepped into and left. The web's resume point is qp.chapterIdx, the same
      // signal the module list reads to offer "Resume" instead of "Begin". Only meaningful
      // while the lesson is unfinished — a completed lesson keeps no resume point worth
      // announcing, and "Started" under a green tick would read as a contradiction.
      inProgress: !done && !!(qp && qp.chapterIdx > 0),
      state: done ? 'completed' : isRec ? 'current' : 'available',
    };
  });

  const counted = nodes.filter(function (n) { return !n.isLifeTask; });
  const doneCount = counted.filter(function (n) { return n.state === 'completed'; }).length;
  return {
    module: m,
    nodes: nodes,
    done: doneCount,
    total: counted.length,
    mastered: counted.length > 0 && doneCount >= counted.length,
  };
}

/** The lesson the whole screen points at.
 *
 * Taken from the same search renderHomeMascotCard runs, so the highlighted node and the
 * continue-card are incapable of naming different lessons. */
function lpRecommended() {
  // nextModuleForUser (app.js) puts the survey's recommended track first, so the path opens
  // on the module the track actually leads with rather than on whatever sits first in the
  // fixed 01-11 catalog.
  const mod = nextModuleForUser();
  if (!mod || !hasQuest(mod)) return null;
  const units = moduleRequiredUnits(mod);
  const next = units.find(function (q) {
    const qp = state.questProgress[questKey(mod.id, q.id)];
    return !(qp && qp.done);
  });
  return next ? { moduleId: mod.id, unitId: next.id } : null;
}

/* ─────────────────────────── render ─────────────────────────── */

/** The column the trail actually gets, which is LP_MAX_COL only when there is room for it.
 *
 * Every node position, the SVG's own width and the header block are all derived from this one
 * number, and it used to be the constant itself — fine while the constant was 640 and narrower
 * than any desktop content area, and not fine once LP_SCALE widened it: on a laptop-width
 * window the trail swung past the right edge of the page and the outermost nodes were clipped.
 * A stylesheet max-width cannot fix that, because the node coordinates are computed in JS and
 * would keep pointing outside the box.
 *
 * The floor is two node-boxes: below that the sine has nowhere to swing and the "trail" is a
 * vertical stack, which is worse than a slightly cramped one. A measurement of 0 means the
 * container has not been laid out yet (jsdom, or a render before first paint) — take the full
 * column rather than the floor, since that is what it will get once it is on screen. */
function lpColumnWidth(container) {
  const avail = container ? container.clientWidth : 0;
  if (!avail) return LP_MAX_COL;
  return Math.max(LP_NODE_BOX * 2, Math.min(LP_MAX_COL, avail));
}

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

  container.appendChild(lpSectionEl(section, shownIdx, sections, recommendedTrack, lpColumnWidth(container)));
}

function lpSectionEl(section, shownIdx, sections, recommendedTrack, colW) {
  const mod = section.module;
  const nodes = section.nodes;
  const reduced = lpReducedMotion();

  const wrap = document.createElement('div');
  wrap.className = 'lp-section';
  // The header block reads its width from here rather than repeating LP_MAX_COL as a literal,
  // which is what let the two drift the moment the column was widened: the stylesheet said
  // 640px, the trail below it was 832px, and a header narrower than its own path reads as two
  // separate things stacked.
  wrap.style.setProperty('--lp-col', colW + 'px');
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
      // Hammy, wearing this module's own face. Mobile puts him here and it is the one
      // thing that made the header read as a module rather than a row of numbers.
      //
      // The face class is applied by revealFaceOverlay after this is in the DOM, not written
      // in here. Two reasons, and the second one was a real defect: it waits for the
      // illustration to decode before anything is taken off his face, and it knows that
      // face-happy/face-gentle are MOUTH-only overlays. Saving and Loans use those two, and
      // pairing them with has-face-overlay — which hides the eyes, cheeks and snout for an
      // illustration that is only ever a 32x37 mouth — left those two module headers showing
      // a permanently faceless pig with a mouth floating on it.
      '<div class="lp-head-hammy">' +
        withFaceOverlay(getHammyFaceMarkup(0.14)) +
      '</div>' +
      (section.mastered ? '<span class="lp-done-pill">DONE</span>' : '') +
      '<button type="button" class="lp-pager" data-lp-page="1" aria-label="Next module">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>' +
      '</button>' +
    '</div>' +
    '<div class="lp-position">MODULE ' + (shownIdx + 1) + ' OF ' + sections.length + '</div>';
  wrap.appendChild(head);
  revealFaceOverlay(head.querySelector('.lp-head-hammy'), LP_MODULE_FACE[mod.id] || 'mood-star');

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

  const body = document.createElement('div');
  body.className = 'lp-body';
  body.style.height = h + 'px';
  body.style.width = colW + 'px';
  // The stylesheet sizes every part of a node off these rather than repeating the numbers,
  // so LP_SCALE is the only place a node's size is written down. Set on .lp-body because
  // that is the nearest common ancestor of the slots, the halo/ripple and the comet layer.
  body.style.setProperty('--lp-node', LP_NODE_SIZE + 'px');
  body.style.setProperty('--lp-box', LP_NODE_BOX + 'px');
  body.style.setProperty('--lp-scale', String(LP_SCALE));

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
      '<path d="' + mainD + '" stroke="#EAF0E8" stroke-width="' + lpStroke(15) + '" stroke-linecap="round" fill="none"/>' +
      '<path d="' + mainD + '" stroke="#E2E9DC" stroke-width="' + lpStroke(9) + '" stroke-linecap="round" fill="none"/>' +
      (walkedD ? '<path d="' + walkedD + '" stroke="url(#' + gid + ')" stroke-width="' + lpStroke(9) + '" stroke-linecap="round" fill="none"/>' : '') +
      (spurD ? '<path d="' + spurD + '" stroke="' + (spurWalked ? '#B2C9AE' : '#E9EFE5') + '" stroke-width="' + lpStroke(6) + '" stroke-linecap="round" stroke-dasharray="' + lpStroke(2) + ' ' + lpStroke(12) + '" fill="none"/>' : '') +
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
        ' aria-label="' + escapeHtml(n.title) + '. ' + LP_STATE_TIP[lpLabelKey(n)].label.toLowerCase() + '."' +
        (isCurrent ? ' aria-current="true"' : '') + '>' +
        '<span class="lp-diamond" style="background:' + fill + ';border-color:' + border + ';--lp-glow:' + glow + '">' +
          '<span class="lp-glyph" style="color:' + glyphColor + '">' + glyph + '</span>' +
        '</span>' +
      '</button>' +
      (isCurrent ? '<span class="lp-start-tag">START</span>' : '');

    if (n.isLifeTask) slot.classList.add('lp-slot-spur');

    const hit = slot.querySelector('.lp-hit');
    hit.addEventListener('click', function () {
      lpOpenPreview(n, section);
      // Opened FIRST, then the tour advances — the tour's next step spotlights the preview
      // card's own start button, so that button has to exist by the time it measures.
      advanceTourOnRealClick('lesson-node');
    });
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
  const tip = LP_STATE_TIP[lpLabelKey(node)];
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
        '<span class="lp-preview-pill ' + pillClass + '">' + LP_STATE_LABEL[lpLabelKey(node)] + '</span>' +
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
    // The tour's last step waits on this exact button; anywhere else, starting a lesson just
    // closes the tour (dismissTourForLessonStart, called from the module tiles).
    advanceTourOnRealClick('lesson-start');
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
