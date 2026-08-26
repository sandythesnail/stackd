/**
 * Guards the onboarding survey against drift between the two apps.
 *
 * The survey is eleven familiarity sliders and a goals step, and it ends by recommending a
 * "track" — a short ordered handful of modules that then decides which module Home opens on
 * and which one the Modules list stars. Both apps ask the same questions and run the same
 * scoring, from two copies of the same three tables: app.js's SURVEY_FAMILIARITY_LABELS /
 * SURVEY_GOALS / SURVEY_TRACKS and mobile/src/survey.ts's.
 *
 * Drift here is quiet and it matters. A track whose `moduleIds` differ sends the same student
 * to two different first lessons depending on the device. A goal whose `moduleIds` differ
 * scores the tracks differently, so the same eleven answers recommend different tracks. And
 * the blurbs are read verbatim in two places — the survey's last step and the Settings track
 * picker — so a student who saw "Debt Freedom" described one way on their laptop and another
 * on their phone has no way to tell whether it is the same thing.
 *
 * Only curly-vs-straight quotes are excluded (see normalizeQuotes). Everything else must
 * match outright.
 *
 *   node scripts/check-survey.js
 */
const fs = require('fs');
const path = require('path');
const { literal, normalizeQuotes: norm } = require('./lib/literal');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const appJs = read('app.js');
const surveyTs = read('mobile/src/survey.ts');

const web = {
  labels: literal(appJs, 'SURVEY_FAMILIARITY_LABELS', '{', 'app.js'),
  goals: literal(appJs, 'SURVEY_GOALS', '[', 'app.js'),
  tracks: literal(appJs, 'SURVEY_TRACKS', '[', 'app.js'),
};
const mob = {
  labels: literal(surveyTs, 'SURVEY_FAMILIARITY_LABELS', '{', 'survey.ts'),
  goals: literal(surveyTs, 'SURVEY_GOALS', '[', 'survey.ts'),
  tracks: literal(surveyTs, 'SURVEY_TRACKS', '[', 'survey.ts'),
};

const problems = [];
const fail = (m) => problems.push(m);
const eq = (a, b) => norm(a) === norm(b);
const list = (a) => (a || []).join(', ');

// ── Familiarity sliders ─────────────────────────────────────────────────────────────
{
  const ids = [...new Set([...Object.keys(web.labels), ...Object.keys(mob.labels)])];
  for (const id of ids) {
    const w = web.labels[id];
    const m = mob.labels[id];
    if (!w) { fail(`familiarity ${id}: missing from app.js`); continue; }
    if (!m) { fail(`familiarity ${id}: missing from mobile`); continue; }
    // [low end, high end] — the two phrases anchoring the slider.
    for (const i of [0, 1]) {
      if (!eq(w[i], m[i])) {
        fail(`familiarity ${id}[${i}]\n  app.js: ${JSON.stringify(w[i])}\n  mobile: ${JSON.stringify(m[i])}`);
      }
    }
  }
}

// ── Goals ───────────────────────────────────────────────────────────────────────────
{
  const wIds = web.goals.map((g) => g.id).join(', ');
  const mIds = mob.goals.map((g) => g.id).join(', ');
  if (wIds !== mIds) fail(`goal ids differ\n  app.js: ${wIds}\n  mobile: ${mIds}`);
  const mById = new Map(mob.goals.map((g) => [g.id, g]));
  for (const w of web.goals) {
    const m = mById.get(w.id);
    if (!m) continue;
    if (!eq(w.label, m.label)) fail(`goal ${w.id}.label\n  app.js: ${JSON.stringify(w.label)}\n  mobile: ${JSON.stringify(m.label)}`);
    // The modules a goal points at are what the track scoring runs on, so a difference here
    // changes which track the same answers recommend.
    if (list(w.moduleIds) !== list(m.moduleIds)) {
      fail(`goal ${w.id}.moduleIds\n  app.js: [${list(w.moduleIds)}]\n  mobile: [${list(m.moduleIds)}]`);
    }
  }
}

// ── Tracks ──────────────────────────────────────────────────────────────────────────
{
  const wIds = web.tracks.map((t) => t.id).join(', ');
  const mIds = mob.tracks.map((t) => t.id).join(', ');
  if (wIds !== mIds) fail(`track ids differ\n  app.js: ${wIds}\n  mobile: ${mIds}`);
  const mById = new Map(mob.tracks.map((t) => [t.id, t]));
  for (const w of web.tracks) {
    const m = mById.get(w.id);
    if (!m) continue;
    for (const key of ['title', 'blurb']) {
      if (!eq(w[key], m[key])) {
        fail(`track ${w.id}.${key}\n  app.js: ${JSON.stringify(w[key])}\n  mobile: ${JSON.stringify(m[key])}`);
      }
    }
    // Order matters: the track IS an ordering, and it decides which module comes first.
    if (list(w.moduleIds) !== list(m.moduleIds)) {
      fail(`track ${w.id}.moduleIds\n  app.js: [${list(w.moduleIds)}]\n  mobile: [${list(m.moduleIds)}]`);
    }
  }
}

if (problems.length) {
  console.error('Onboarding survey DRIFT — ' + problems.length + ' difference(s):\n');
  console.error(problems.join('\n\n'));
  process.exit(1);
}

console.log(
  `Onboarding survey OK — ${Object.keys(web.labels).length} familiarity sliders, `
  + `${web.goals.length} goals and ${web.tracks.length} tracks match between app.js and mobile.`
);
