// ─── HAMMY ONBOARDING INTRO ───
// The animated "meet Hammy" sequence that replaced the static "A new piggy was
// born!" popup. runFirstLoadSequence (app.js) calls startHammyIntro() once,
// as the first step of onboarding (before the survey); onDone fires exactly
// once whether the user watches the whole thing or taps Skip, and by then the
// overlay, timers, and audio are fully torn down.
//
// Depends on globals from app.js (loaded first): getPigMarkup, withFaceOverlay,
// ICON_COIN, ICON_DIAMOND. Styles live in hammy-intro.css.
(function () {
  'use strict';

  /* Piggy-bank artwork (user-commissioned SVG; classes pb-* styled in
     hammy-intro.css). Rendered twice — the .hi-bank-half clip-paths split it
     down the coin slot so it can crack apart. */
  var BANK_ART = '' +
    '<path class="pb-body" d="M 125,113 C 118,67 148,53 162,91 Z" />' +
    '<path class="pb-inner" d="M 132,107 C 127,77 146,67 155,89 Z" />' +
    '<path class="pb-outline" d="M 132,107 C 127,77 146,67 155,89" />' +
    '<rect class="pb-body" x="135" y="215" width="32" height="35" rx="12" />' +
    '<rect class="pb-body" x="225" y="215" width="32" height="35" rx="12" />' +
    '<path class="pb-outline" d="M 312,165 C 335,165 342,135 322,135 C 305,135 308,158 322,154" />' +
    '<ellipse class="pb-body" cx="210" cy="165" rx="105" ry="78" />' +
    '<rect class="pb-body" x="155" y="218" width="32" height="35" rx="12" />' +
    '<rect class="pb-body" x="245" y="218" width="32" height="35" rx="12" />' +
    '<path class="pb-body" d="M 150,118 C 142,70 178,56 192,96 Z" />' +
    '<path class="pb-inner" d="M 158,112 C 152,78 175,68 184,96 Z" />' +
    '<path class="pb-outline" d="M 158,112 C 152,78 175,68 184,96" />' +
    '<rect class="pb-dark" x="192" y="100" width="48" height="8" rx="4" />' +
    '<ellipse class="pb-body" cx="102" cy="180" rx="18" ry="24" />' +
    '<ellipse class="pb-inner" cx="102" cy="180" rx="12" ry="17" />' +
    '<ellipse class="pb-dark" cx="97" cy="180" rx="2.5" ry="6" />' +
    '<ellipse class="pb-dark" cx="107" cy="180" rx="2.5" ry="6" />' +
    '<circle class="pb-cheek" cx="150" cy="184" r="14" />' +
    '<circle class="pb-dark" cx="136" cy="144" r="8.5" />' +
    '<circle fill="#ffffff" cx="133.5" cy="141.5" r="3" />' +
    '<path fill="#ffffff" opacity="0.5" d="M 285,130 C 270,110 240,108 220,110 C 245,108 275,117 288,138 Z" />';

  var CRACK_ART = '<svg viewBox="0 0 34 120" preserveAspectRatio="none">' +
    '<path d="M17 0 L10 20 L23 38 L9 60 L21 80 L11 100 L17 120" fill="none" stroke="#4e353b" stroke-width="4.5" stroke-linejoin="round"/></svg>';

  /* Face overlay geometry — same values as app.css .mood-* / .hammy-side-avatar
     rules and mobile/src/hammyFaces.ts, in the pig's 440x460 frame. */
  var FACES = {
    streak: { image: 'faces/hammy-happy.png', top: 145, left: 90, width: 260, height: 155 },
    wink:   { image: 'faces/wink-face.png',   top: 143, left: 102, width: 237, height: 160 },
    star:   { image: 'faces/star-face.png',   top: 143, left: 117, width: 206, height: 160 }
  };

  /* Hammy line → tappable player reply → next line; null reply = last line,
     after which Hammy hops off and the sequence ends. */
  var SCRIPT = [
    { hammy: 'Hi, I’m Hammy!', face: 'streak', reply: 'Hi Hammy! Who are you?' },
    { hammy: 'I’ll be guiding you along your journey with financial literacy!', face: 'wink', reply: 'Sounds good, I’m excited!' },
    { hammy: 'Let’s go!', face: 'star', reply: null }
  ];

  window.startHammyIntro = function (onDone) {
    var overlay = document.createElement('div');
    overlay.className = 'hammy-intro-overlay';
    overlay.innerHTML =
      '<div class="hi-stage">' +
        '<div class="hi-anchor">' +
          '<div class="hi-bank">' +
            '<div class="hi-bank-half l"><svg viewBox="0 0 400 320">' + BANK_ART + '</svg></div>' +
            '<div class="hi-bank-half r"><svg viewBox="0 0 400 320">' + BANK_ART + '</svg></div>' +
            '<div class="hi-crack">' + CRACK_ART + '</div>' +
          '</div>' +
          '<div class="hi-ring"></div>' +
          '<div class="hi-ring hi-ring2"></div>' +
          '<div class="hi-hammy"><div class="hi-hammy-rig"><div class="has-face-overlay">' +
            withFaceOverlay(getPigMarkup(0.62)) +
          '</div></div></div>' +
          '<div class="hi-bubble"></div>' +
        '</div>' +
        '<div class="hi-choice"><button type="button"></button></div>' +
      '</div>' +
      '<div class="hi-flash"></div>' +
      '<button class="hi-skip" type="button">Skip &rarr;</button>';
    document.body.appendChild(overlay);

    var q = function (sel) { return overlay.querySelector(sel); };
    var stage = q('.hi-stage');
    var bank = q('.hi-bank');
    var ring1 = q('.hi-ring');
    var ring2 = q('.hi-ring2');
    var flash = q('.hi-flash');
    var hammy = q('.hi-hammy');
    var faceOverlay = q('.hammy-face-overlay');
    var bubble = q('.hi-bubble');
    var choice = q('.hi-choice');
    var choiceBtn = q('.hi-choice button');
    var anchor = q('.hi-anchor');

    var timers = [];
    var finished = false;
    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }

    /* ── Coin jingle: PLACEHOLDER synthesized with WebAudio (no audio assets in
       the repo yet — swap for a real licensed SFX file later). By this point
       the user has clicked through the survey, so the context is normally
       allowed to run; if the browser still blocks audio we skip silently. ── */
    var audioCtx = null;
    function unlockAudio() {
      try {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtx) audioCtx = new Ctx();
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(function () {});
      } catch (e) { /* no audio available — fine */ }
    }
    document.addEventListener('pointerdown', unlockAudio);
    unlockAudio();

    function playJingle() {
      if (!audioCtx || audioCtx.state !== 'running') return;
      try {
        var t0 = audioCtx.currentTime;
        var master = audioCtx.createGain();
        master.gain.value = 0.5;
        master.connect(audioCtx.destination);
        var freqs = [2093, 2637, 3136, 2349, 2794, 3520, 2093];
        for (var i = 0; i < freqs.length; i++) {
          var t = t0 + i * 0.06 + Math.random() * 0.025;
          var osc = audioCtx.createOscillator();
          var g = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freqs[i] * (0.98 + Math.random() * 0.04);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.22, t + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
          osc.connect(g);
          g.connect(master);
          osc.start(t);
          osc.stop(t + 0.35);
        }
      } catch (e) { /* never let audio break the intro */ }
    }

    function setFace(name) {
      var f = FACES[name];
      faceOverlay.style.backgroundImage = 'url("' + f.image + '")';
      faceOverlay.style.top = f.top + 'px';
      faceOverlay.style.left = f.left + 'px';
      faceOverlay.style.width = f.width + 'px';
      faceOverlay.style.height = f.height + 'px';
    }

    /* Burst origin ≈ the bank body's center, 4vh above the anchor (see CSS). */
    function burstOriginY() { return window.innerHeight * 0.04; }

    function spawnParticle(el, size) {
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.left = (-size / 2) + 'px';
      el.style.top = (-size / 2 - burstOriginY()) + 'px';
      anchor.appendChild(el);
      at(1800, function () { el.remove(); });
    }

    function spawnCurrency() {
      for (var i = 0; i < 36; i++) {
        var isCoin = i % 5 !== 3; // ~4:1 coins to diamonds
        var el = document.createElement('div');
        el.className = 'hi-particle';
        el.innerHTML = (isCoin ? ICON_COIN : ICON_DIAMOND)
          .replace('width="1.15em"', 'width="100%"')
          .replace('height="1.15em"', 'height="100%"');
        spawnParticle(el, 34 + Math.random() * 26);

        var angle = (-Math.PI / 2) + (Math.random() - 0.5) * 3.0;
        var speed = 340 + Math.random() * 440;
        var vx = Math.cos(angle) * speed;
        var vy = Math.sin(angle) * speed;
        var spin = (Math.random() - 0.5) * 1100;
        var dur = 1.0 + Math.random() * 0.5;
        el.animate([
          { transform: 'translate(0px, 0px) rotate(0deg) scale(1)', opacity: 1 },
          { transform: 'translate(' + vx * 0.5 + 'px, ' + (vy * 0.5 + 220) + 'px) rotate(' + spin + 'deg) scale(0.95)', opacity: 1, offset: 0.65 },
          { transform: 'translate(' + vx * 0.75 + 'px, ' + (vy * 0.75 + 620) + 'px) rotate(' + spin * 1.4 + 'deg) scale(0.8)', opacity: 0 }
        ], { duration: dur * 1000, easing: 'cubic-bezier(0.15, 0.6, 0.5, 1)', fill: 'forwards' });
      }
    }

    function spawnSparkles() {
      var colors = ['#FF96B8', '#FFC400', '#FFFFFF', '#FFD9E7'];
      for (var i = 0; i < 26; i++) {
        var el = document.createElement('div');
        el.className = 'hi-particle hi-sparkle';
        el.style.background = colors[i % colors.length];
        spawnParticle(el, 10 + Math.random() * 14);

        var angle = Math.random() * Math.PI * 2;
        var dist = 90 + Math.random() * 320;
        var dx = Math.cos(angle) * dist;
        var dy = Math.sin(angle) * dist * 0.8 - 60;
        var dur = 0.5 + Math.random() * 0.45;
        el.animate([
          { transform: 'translate(0px, 0px) scale(0.2) rotate(0deg)', opacity: 1 },
          { transform: 'translate(' + dx * 0.6 + 'px, ' + dy * 0.6 + 'px) scale(1.25) rotate(90deg)', opacity: 1, offset: 0.35 },
          { transform: 'translate(' + dx * 0.8 + 'px, ' + dy * 0.8 + 'px) scale(0.7) rotate(140deg)', opacity: 0.9, offset: 0.6 },
          { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(1.1) rotate(180deg)', opacity: 0 }
        ], { duration: dur * 1000, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)', fill: 'forwards' });
      }
    }

    function showLine(text) {
      bubble.textContent = text;
      bubble.classList.remove('pop-in');
      void bubble.offsetWidth; // restart the pop animation
      bubble.classList.add('pop-in');
    }

    function replayWave() {
      hammy.classList.remove('wave');
      void hammy.offsetWidth;
      hammy.classList.add('settled', 'wave');
    }

    function hammyLine(idx) {
      var line = SCRIPT[idx];
      setFace(line.face);
      showLine(line.hammy);
      replayWave();

      if (line.reply !== null) {
        at(1300, function () {
          choiceBtn.textContent = line.reply;
          choiceBtn.onclick = function () {
            choice.classList.remove('show');
            choiceBtn.onclick = null;
            at(280, function () { hammyLine(idx + 1); });
          };
          choice.classList.add('show');
        });
      } else {
        // hold "Let's go!" long enough to read, then Hammy hops off-screen
        at(1600, function () {
          bubble.classList.remove('pop-in');
          hammy.classList.remove('wave');
          void hammy.offsetWidth;
          hammy.classList.add('hop-off');
        });
        at(2600, function () { stage.classList.add('exit'); });
        at(3050, finish);
      }
    }

    /* Single teardown path for both the natural ending and Skip: nothing —
       timers, audio, DOM — may survive past onDone. */
    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      timers = [];
      document.removeEventListener('pointerdown', unlockAudio);
      if (audioCtx) { try { audioCtx.close(); } catch (e) {} audioCtx = null; }
      overlay.remove();
      if (typeof onDone === 'function') onDone();
    }

    q('.hi-skip').addEventListener('click', finish);

    /* Timeline:
       0.00  piggy bank drops in
       0.80  wobble + crack flash
       1.35  POP — flash, rings, shake, jingle, coin/diamond/sparkle burst
       1.45  Hammy springs up
       2.30  line 1; each later line waits for the user's tapped reply */
    setFace(SCRIPT[0].face);
    bank.classList.add('drop-in');
    at(800, function () {
      bank.classList.remove('drop-in');
      bank.classList.add('wobble');
    });
    at(1350, function () {
      bank.classList.remove('wobble');
      bank.classList.add('popped');
      ring1.classList.add('go');
      ring2.classList.add('go');
      flash.classList.add('go');
      stage.classList.add('shake');
      playJingle();
      spawnCurrency();
      spawnSparkles();
    });
    at(1450, function () { hammy.classList.add('emerge'); });
    at(2300, function () { hammyLine(0); });
  };
})();
