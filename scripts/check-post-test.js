/**
 * Guards the web's final-assessment question bank against the Expo app's.
 *
 * mobile/src/postTest.ts is the source of truth. The web duplicates the same twenty-two
 * questions in post-test.js, and a student who sits the assessment on their phone and again
 * on a laptop must be answering the same test — a question edited on one side and not the
 * other makes the two scores incomparable, silently.
 *
 * Checks every field that affects what the student sees or scores: the stem, the options in
 * order, the correct index, and the explanation.
 *
 *   node scripts/check-post-test.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

/** Both files declare the bank as an array literal of object literals; pull each entry's
 *  fields out rather than eval'ing, so this never executes either file. */
function parseBank(src, arrayName) {
  // Anchored on the assignment, not the bare name: the TS side declares
  // `POST_TEST_QUESTIONS: PostTestQuestion[] = [`, and searching for the next '[' from the
  // name alone lands on the type annotation's empty brackets and parses nothing.
  const decl = new RegExp(arrayName + '[^=]*=\\s*\\[');
  const declMatch = decl.exec(src);
  if (!declMatch) throw new Error('no ' + arrayName);
  const open = declMatch.index + declMatch[0].length - 1;
  // Walk to the matching bracket so a ']' inside a string can't end the scan early.
  let depth = 0, end = -1, inStr = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) throw new Error('unterminated ' + arrayName);
  const body = src.slice(open, end + 1);

  const out = [];
  const entryRe = /\{\s*moduleId:\s*'([^']+)',\s*q:\s*'((?:[^'\\]|\\.)*)',\s*opts:\s*\[([^\]]*)\],\s*correct:\s*(\d+),\s*exp:\s*'((?:[^'\\]|\\.)*)',?\s*\}/g;
  let m;
  while ((m = entryRe.exec(body))) {
    const opts = [];
    const optRe = /'((?:[^'\\]|\\.)*)'/g;
    let o;
    while ((o = optRe.exec(m[3]))) opts.push(o[1].replace(/\\'/g, "'"));
    out.push({
      moduleId: m[1],
      q: m[2].replace(/\\'/g, "'"),
      opts,
      correct: Number(m[4]),
      exp: m[5].replace(/\\'/g, "'"),
    });
  }
  return out;
}

const mob = parseBank(read('mobile/src/postTest.ts'), 'POST_TEST_QUESTIONS');
const web = parseBank(read('post-test.js'), 'POST_TEST_QUESTIONS');

const problems = [];

if (!mob.length) problems.push('mobile bank parsed as empty — the checker, not the bank, is probably broken');
if (mob.length !== web.length) {
  problems.push(`length: mobile has ${mob.length} questions, web has ${web.length}`);
}

const n = Math.min(mob.length, web.length);
for (let i = 0; i < n; i++) {
  const a = mob[i], b = web[i];
  const where = `[${i}] ${a.moduleId} "${a.q.slice(0, 40)}"`;
  if (a.moduleId !== b.moduleId) problems.push(`${where}: moduleId ${a.moduleId} vs ${b.moduleId}`);
  if (a.q !== b.q) problems.push(`${where}: stem differs\n      mobile: ${a.q}\n      web:    ${b.q}`);
  if (a.correct !== b.correct) problems.push(`${where}: correct index ${a.correct} vs ${b.correct}`);
  if (a.exp !== b.exp) problems.push(`${where}: explanation differs\n      mobile: ${a.exp}\n      web:    ${b.exp}`);
  if (a.opts.length !== b.opts.length) {
    problems.push(`${where}: ${a.opts.length} options vs ${b.opts.length}`);
  } else {
    for (let j = 0; j < a.opts.length; j++) {
      if (a.opts[j] !== b.opts[j]) {
        problems.push(`${where}: option ${j} differs\n      mobile: ${a.opts[j]}\n      web:    ${b.opts[j]}`);
      }
    }
  }
}

/* Deliberately NOT checking the bank's authoring rules ("the correct answer is never the
 * longest option", "options 2-6 words"). Those are guidance for whoever writes a question,
 * and the shipped bank doesn't hold to all of them strictly — several correct answers are
 * the longest of their four by a character or two, which is fine at these lengths and is
 * nothing like the lesson bank's problem of an explanation-length answer beside a
 * three-word one. Enforcing them here would fail a FAITHFUL port, which would make this
 * guard worse than useless: the one thing it exists to protect is that both apps ask the
 * same questions. Judging the questions themselves belongs upstream, in postTest.ts. */

if (problems.length) {
  console.error('Final-assessment bank has drifted:\n');
  for (const p of problems) console.error('  ' + p);
  console.error('\nmobile/src/postTest.ts is the source of truth — update post-test.js to match it.');
  process.exit(1);
}

console.log(`Final assessment OK — ${mob.length} questions identical in mobile/src/postTest.ts and post-test.js.`);
