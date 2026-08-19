/* ══════════════════════════════════════════════
   Final assessment — the post-test

   Ported from the Expo app's src/postTest.ts (the bank) and src/app/learn/post-test.tsx
   (the screen). Unlocked once every module is mastered; sits at the top of the Modules
   page rather than after eleven rows, because by the time it exists the list behind it is
   entirely ticked off and this is the only thing left to do on the screen.

   The result overwrites on a retake (see state.postTest), because a second sitting of
   questions now seen twice is not comparable to the first.

   Feedback is collected on the same screen rather than as a separate prompt somewhere else:
   finishing the course is the one moment someone has all of it in mind, and the last moment
   the app can ask them anything at all. It writes to the same `feedback` table Settings
   already uses (supabase/feedback.sql), tagged page 'post-test' so the two can be told apart.
   ══════════════════════════════════════════════ */

/**
 * The assessment's own question bank: two per module, twenty-two in all.
 *
 * WHY THIS EXISTS SEPARATELY from the lesson questions in MODULES, which is the obvious
 * place to sample from and the wrong one:
 *
 *   - LENGTH GIVES THE ANSWER AWAY. In the lesson bank the correct option is very often the
 *     longest one, because it is the one carrying the full explanation — "Gross is what you
 *     earned before deductions; net is what hits your bank account" sitting beside "They are
 *     the same". You can score well on that pattern without knowing any of the material,
 *     which makes the result meaningless as a measure. Every option here is written to
 *     roughly the same length as its siblings, so the only way to pick the right one is to
 *     know it.
 *   - LENGTH ALSO MEANT SCROLLING. A long stem plus four long options doesn't fit a phone,
 *     so every question became a scroll before it could be answered. These are trimmed.
 *
 * Rules this bank holds itself to, worth keeping if questions are added:
 *   - Stem under about 70 characters, and a real question rather than a scenario paragraph.
 *   - Four options, each 2-6 words, and no option more than about twice the shortest.
 *   - The correct answer is never the longest option in its group.
 *   - `exp` is one sentence: what the answer is, not a lecture.
 *
 * Kept byte-identical to mobile/src/postTest.ts so a student who sat it on their phone and
 * again on a laptop is answering the same assessment. scripts/check-post-test.js enforces it.
 */
const POST_TEST_QUESTIONS = [
  // ---- 01 Earning
  {
    moduleId: 'earning',
    q: 'What is net pay?',
    opts: ['Your salary before tax', 'What lands in your account', 'Your hourly rate', 'Your total yearly offer'],
    correct: 1,
    exp: 'Net pay is take-home: gross pay minus tax and other deductions.',
  },
  {
    moduleId: 'earning',
    q: 'What does FICA on a payslip fund?',
    opts: ['Health insurance', 'State income tax', 'Social Security and Medicare', 'Your retirement fund'],
    correct: 2,
    exp: 'FICA is the payroll tax that funds Social Security and Medicare.',
  },

  // ---- 02 Spending
  {
    moduleId: 'spending',
    q: 'In a 50/30/20 budget, what is the 20?',
    opts: ['Needs', 'Wants', 'Saving and debt', 'Rent'],
    correct: 2,
    exp: 'Half to needs, a third to wants, and 20% to saving and paying down debt.',
  },
  {
    moduleId: 'spending',
    q: 'Which of these is a fixed cost?',
    opts: ['Groceries', 'Rent', 'Petrol', 'Nights out'],
    correct: 1,
    exp: 'Fixed costs are the same each month; rent is the classic one.',
  },

  // ---- 03 Saving
  {
    moduleId: 'saving',
    q: 'How big should an emergency fund be?',
    opts: ['One week of pay', 'Three to six months', 'Two full years', 'Whatever is spare'],
    correct: 1,
    exp: 'Three to six months of essential costs is the standard target.',
  },
  {
    moduleId: 'saving',
    q: 'What does compound interest pay you on?',
    opts: ['Only what you put in', 'Interest already earned too', 'Your monthly income', 'The bank’s profits'],
    correct: 1,
    exp: 'Compounding pays interest on your interest, which is why time matters most.',
  },

  // ---- 04 Investing
  {
    moduleId: 'investing',
    q: 'What does an index fund hold?',
    opts: ['One company', 'A whole market', 'Only bonds', 'Cash savings'],
    correct: 1,
    exp: 'An index fund buys the whole market at once, which spreads the risk.',
  },
  {
    moduleId: 'investing',
    q: 'Why start investing early?',
    opts: ['Fees are lower', 'Time compounds returns', 'Shares cost less', 'Tax is waived'],
    correct: 1,
    exp: 'Years in the market do more than the amount you start with.',
  },

  // ---- 05 Managing Credit
  {
    moduleId: 'credit',
    q: 'What most affects a credit score?',
    opts: ['Paying on time', 'Your salary', 'Your age', 'Your postcode'],
    correct: 0,
    exp: 'Payment history is the single biggest factor in a credit score.',
  },
  {
    moduleId: 'credit',
    q: 'What is credit utilisation?',
    opts: ['Cards you own', 'Limit you are using', 'Interest you owe', 'Length of history'],
    correct: 1,
    exp: 'It is the share of your limit in use; under 30% is the usual advice.',
  },

  // ---- 06 Managing Risk
  {
    moduleId: 'risk',
    q: 'What is an insurance deductible?',
    opts: ['Your monthly premium', 'What you pay first', 'The insurer’s profit', 'Your total cover'],
    correct: 1,
    exp: 'The deductible is what you pay before the insurer pays anything.',
  },
  {
    moduleId: 'risk',
    q: 'A higher deductible usually means what?',
    opts: ['A lower premium', 'A higher premium', 'No cover at all', 'Faster claims'],
    correct: 0,
    exp: 'Taking on more of the first loss lowers what you pay each month.',
  },

  // ---- 07 Loans
  {
    moduleId: 'loans',
    q: 'What does APR describe?',
    opts: ['The yearly cost', 'The monthly payment', 'The loan size', 'The credit limit'],
    correct: 0,
    exp: 'APR is the yearly cost of borrowing, including fees as well as interest.',
  },
  {
    moduleId: 'loans',
    q: 'Which loan is usually cheapest?',
    opts: ['Payday loan', 'Credit card debt', 'Federal student loan', 'Store card'],
    correct: 2,
    exp: 'Federal student loans carry the lowest rates and the best protections.',
  },

  // ---- 08 Taxes
  {
    moduleId: 'taxes',
    q: 'What is a tax deduction?',
    opts: ['Money off your bill', 'Money off your income', 'A refund cheque', 'A payroll tax'],
    correct: 1,
    exp: 'A deduction lowers taxable income; a credit lowers the bill itself.',
  },
  {
    moduleId: 'taxes',
    q: 'What does a W-2 report?',
    opts: ['Your yearly wages', 'Your bank balance', 'Your credit score', 'Your rent paid'],
    correct: 0,
    exp: 'A W-2 reports what an employer paid you and withheld for the year.',
  },

  // ---- 09 Consumer Psychology
  {
    moduleId: 'psychology',
    q: 'What is an anchor price?',
    opts: ['The cheapest option', 'A first number shown', 'The average price', 'A delivery fee'],
    correct: 1,
    exp: 'The first price you see sets what every later price feels like.',
  },
  {
    moduleId: 'psychology',
    q: 'Why do shops show a countdown timer?',
    opts: ['To rush the decision', 'To be transparent', 'To reduce fraud', 'To help budgeting'],
    correct: 0,
    exp: 'Urgency cuts the time you would spend thinking, which is the point of it.',
  },

  // ---- 10 Career & Salary
  {
    moduleId: 'career',
    q: 'When is the best time to negotiate?',
    opts: ['On day one', 'After the offer', 'At your review', 'When you resign'],
    correct: 1,
    exp: 'Once they have chosen you and before you accept is the strongest moment.',
  },
  {
    moduleId: 'career',
    q: 'What is a 401(k) employer match?',
    opts: ['A yearly bonus', 'Free money you earn', 'A loan from work', 'A tax refund'],
    correct: 1,
    exp: 'Your employer adds to your retirement account; not taking it leaves pay behind.',
  },

  // ---- 11 Scams & Fraud
  {
    moduleId: 'scams',
    q: 'What is the clearest sign of a scam?',
    opts: ['A spelling mistake', 'Urgency plus payment', 'An unknown sender', 'A long message'],
    correct: 1,
    exp: 'Pressure to act now, combined with a way to pay, is the pattern.',
  },
  {
    moduleId: 'scams',
    q: 'A caller asks for your bank code. Do what?',
    opts: ['Read it back', 'Hang up and call back', 'Text it instead', 'Give a partial code'],
    correct: 1,
    exp: 'Hang up and dial the number on your card; no real bank asks for a code.',
  },
];

/* ─────────────────────────── sitting ─────────────────────────── */

/** The one in-flight sitting. Null when the assessment isn't open. */
let ptSitting = null;

/** Every question in module order, each with its module's display name attached for the
 *  label above it. Built once per sitting rather than per render — rebuilding it under the
 *  finger of whoever just answered is how a question swaps mid-tap. */
function ptDrawQuestions() {
  return POST_TEST_QUESTIONS.map(function (q) {
    const mod = MODULES.find(function (m) { return m.id === q.moduleId; });
    return {
      moduleId: q.moduleId,
      moduleName: mod ? mod.title : '',
      q: q.q,
      opts: q.opts,
      correct: q.correct,
      exp: q.exp,
    };
  });
}

/** Whether the assessment is available at all: every module mastered. */
function postTestUnlocked() {
  return MODULES.every(function (m) { return isModuleFullyDone(m); });
}

function startPostTest() {
  ptSitting = {
    questions: ptDrawQuestions(),
    idx: 0,
    picked: null,
    score: 0,
    // Guards the state write: it must happen once, not once per render of the result screen.
    recorded: false,
  };
  showScreen('screen-posttest');
  renderPostTest();
}

function exitPostTest() {
  ptSitting = null;
  showPage('modules');
  renderModulesPage();
}

function renderPostTest() {
  const wrap = document.getElementById('posttest-wrap');
  if (!wrap || !ptSitting) return;
  const s = ptSitting;
  const q = s.questions[s.idx];
  const answered = s.picked !== null;
  const isRight = answered && s.picked === q.correct;
  const isLast = s.idx + 1 >= s.questions.length;
  const pct = Math.round(((s.idx + 1) / s.questions.length) * 100);

  const opts = q.opts.map(function (opt, i) {
    /* Once answered, the right answer is ALWAYS shown as correct — including when it wasn't
       the one picked. A test that only tells you that you were wrong teaches nothing on the
       way out. */
    let cls = 'pt-opt';
    if (answered) {
      if (i === q.correct) cls += ' pt-opt-correct';
      else if (i === s.picked) cls += ' pt-opt-wrong';
      cls += ' pt-opt-locked';
    }
    return '<button type="button" class="' + cls + '" data-pt-opt="' + i + '"' +
      (answered ? ' disabled' : '') + '>' +
      '<span class="pt-opt-letter">' + String.fromCharCode(65 + i) + '</span>' +
      '<span class="pt-opt-label">' + escapeHtml(opt) + '</span>' +
      '</button>';
  }).join('');

  wrap.innerHTML =
    '<div class="pt-topbar">' +
      '<button type="button" class="exit-btn" id="pt-exit" aria-label="Leave the assessment">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>' +
      '<div class="pt-prog-track"><div class="pt-prog-fill" style="width:' + pct + '%"></div></div>' +
      '<span class="pt-step">' + (s.idx + 1) + ' / ' + s.questions.length + '</span>' +
    '</div>' +
    '<div class="pt-body">' +
      '<div class="pt-q" data-mod="' + q.moduleId + '">' +
        '<div class="pt-eyebrow">' + escapeHtml(q.moduleName.toUpperCase()) + '</div>' +
        '<h1 class="pt-stem">' + escapeHtml(q.q) + '</h1>' +
        '<div class="pt-opts">' + opts + '</div>' +
        (answered
          ? '<div class="pt-exp">' +
              '<div class="pt-exp-verdict ' + (isRight ? 'pt-right' : 'pt-wrong') + '">' +
                (isRight ? 'Correct' : 'Not quite') + '</div>' +
              '<div class="pt-exp-txt">' + escapeHtml(q.exp) + '</div>' +
            '</div>'
          : '') +
      '</div>' +
    '</div>' +
    '<div class="pt-actions">' +
      '<button type="button" class="btn-primary pt-next" id="pt-next"' + (answered ? '' : ' disabled') + '>' +
        (isLast ? 'See my result' : 'Next') +
      '</button>' +
    '</div>';

  document.getElementById('pt-exit').addEventListener('click', exitPostTest);
  wrap.querySelectorAll('[data-pt-opt]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (ptSitting.picked !== null) return;
      const choice = parseInt(btn.getAttribute('data-pt-opt'), 10);
      ptSitting.picked = choice;
      if (choice === q.correct) ptSitting.score++;
      renderPostTest();
    });
  });
  document.getElementById('pt-next').addEventListener('click', function () {
    if (ptSitting.picked === null) return;
    if (isLast) {
      if (!ptSitting.recorded) {
        ptSitting.recorded = true;
        recordPostTest(ptSitting.score, ptSitting.questions.length);
      }
      renderPostTestResult();
      return;
    }
    ptSitting.idx++;
    ptSitting.picked = null;
    renderPostTest();
  });
}

/** Overwrites on a retake: a second sitting of questions now seen twice isn't comparable to
 *  the first, so keeping both would invite comparing two things that don't compare. */
function recordPostTest(score, total) {
  state.postTest = { score: score, total: total, takenAt: new Date().toISOString() };
  saveState();
}

function renderPostTestResult() {
  const wrap = document.getElementById('posttest-wrap');
  if (!wrap || !ptSitting) return;
  const score = ptSitting.score;
  const total = ptSitting.questions.length;

  /* The same face and the same words at every score, on purpose. Banding the reaction meant
     the app's last word to someone who had just finished all eleven modules could be a
     consolation face and "worth another pass" — a verdict on them, delivered at the moment
     they finished. The score is still shown; it just isn't graded back at them. */
  wrap.innerHTML =
    '<div class="pt-result">' +
      '<div class="pt-result-pig">' + getPigWithItemMarkup(0.34, getEquippedItems()) + '</div>' +
      '<div class="pt-eyebrow">FINAL ASSESSMENT</div>' +
      '<div class="pt-score">' + score + ' / ' + total + '</div>' +
      '<p class="pt-thanks">Thank you so much for completing Stacked!</p>' +
      '<div class="pt-fb" id="pt-fb">' +
        '<div class="pt-fb-head">How was the course?</div>' +
        '<p class="pt-fb-sub">You’ve finished everything. Anything that confused you, dragged, or was worth the time?</p>' +
        '<textarea class="pt-fb-input" id="pt-fb-msg" rows="4" placeholder="What worked, what didn’t..."></textarea>' +
        '<button type="button" class="btn-primary pt-fb-send" id="pt-fb-send">Send feedback</button>' +
        '<div class="pt-fb-status" id="pt-fb-status" role="status"></div>' +
      '</div>' +
      '<button type="button" class="pt-done" id="pt-done">Done</button>' +
    '</div>';

  document.getElementById('pt-done').addEventListener('click', exitPostTest);
  wirePostTestFeedback(score, total);
}

/** Writes to the same `feedback` table Settings uses, tagged page 'post-test'.
 *
 * The score rides along with the comment: "the quizzes were too easy" means something
 * different from someone who scored 22/22 than from someone who scored 9. */
function wirePostTestFeedback(score, total) {
  const btn = document.getElementById('pt-fb-send');
  const msg = document.getElementById('pt-fb-msg');
  const status = document.getElementById('pt-fb-status');
  if (!btn || !msg || !status) return;

  btn.addEventListener('click', async function () {
    const message = msg.value.trim();
    if (!message) return;
    if (!window.stackdSupabase || !window.Clerk || !window.Clerk.user) {
      status.textContent = 'Sign in to send feedback.';
      status.classList.add('error');
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Sending…';
    const { error } = await window.stackdSupabase.from('feedback').insert({
      clerk_user_id: window.Clerk.user.id,
      category: 'feedback',
      message: '[post-test ' + score + '/' + total + '] ' + message,
      app: 'web',
      page: 'post-test',
    });
    btn.disabled = false;
    btn.textContent = 'Send feedback';
    if (error) {
      console.error('Failed to send post-test feedback:', error);
      status.classList.add('error');
      status.textContent = "Couldn't send that. Check your connection and try again.";
    } else {
      status.classList.remove('error');
      document.getElementById('pt-fb').innerHTML =
        '<div class="pt-fb-sent">Sent. Thank you so much for your feedback!</div>';
    }
  });
}

/* ─────────────────────────── the way in ─────────────────────────── */

/** The card at the top of the Modules page, once all eleven are done. Returns '' before
 *  then, so the page is unchanged for anyone still working through the list. */
function postTestCardHtml() {
  if (!postTestUnlocked()) return '';
  const taken = state.postTest;
  return '<button type="button" class="pt-card" id="pt-card">' +
    '<div class="pt-card-main">' +
      '<div class="pt-card-eyebrow">' + (taken ? 'FINAL ASSESSMENT' : 'ALL ELEVEN COMPLETE') + '</div>' +
      '<div class="pt-card-title">' +
        (taken ? 'You scored ' + taken.score + ' / ' + taken.total : 'Take the final assessment') +
      '</div>' +
      '<div class="pt-card-sub">' +
        (taken
          ? 'Take it again, or send more feedback.'
          : 'Two questions from every module, and a chance to tell us how it went.') +
      '</div>' +
    '</div>' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>' +
    '</button>';
}

function wirePostTestCard() {
  const card = document.getElementById('pt-card');
  if (card) card.addEventListener('click', startPostTest);
}
