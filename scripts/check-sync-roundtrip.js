/**
 * Runs the real translation layer between the two apps and checks what it does with a blob.
 *
 * scripts/check-sync-fields.js reads mobile/src/lib/webState.ts as TEXT and asserts that every
 * field has a home and that shared fields are touched in both directions. That is a coverage
 * check, and it cannot see what the code actually DOES with a field it can see being named.
 * This compiles webState.ts and its dependency graph and runs it.
 *
 * What it was written after: "Reset all progress" did not reset lesson progress for anyone
 * signed in. Every push in mobileToWeb is deliberately additive — it merges onto the last-seen
 * remote so the website's own fields survive, and questProgress only ever gains entries — and
 * resetProgress leaves the ordinary debounced push to carry the reset up. So the empty state
 * merged onto a row still holding every finished lesson, the row kept all of it, and the next
 * device rebuilt moduleProgress straight back out of it. Coins, XP and badges reset; every
 * lesson ever finished, the assessment result and the survey did not. check-sync-fields passed
 * throughout, because every field involved was named in both directions exactly as it should
 * be.
 *
 * Needs mobile's own TypeScript, which it compiles into a scratch directory. react,
 * react-native and AsyncStorage are stubbed — nothing here renders anything, it only calls the
 * two pure translation functions.
 *
 * DELIBERATELY NOT wired into `npm run check`: it compiles a few hundred files, which is not
 * a cost worth paying on every Vercel deploy for a layer that changes rarely. Run it when you
 * touch the sync layer, alongside check-sync-fields (which IS wired in, being instant).
 *
 *   node scripts/check-sync-roundtrip.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const MOBILE = path.join(ROOT, 'mobile');
const TSC = path.join(MOBILE, 'node_modules', 'typescript', 'bin', 'tsc');

if (!fs.existsSync(TSC)) {
  console.log('check-sync-roundtrip: skipped, mobile/node_modules/typescript is not installed.');
  console.log('  cd mobile && npm ci');
  process.exit(0);
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackd-sync-'));
const tsconfig = path.join(outDir, 'tsconfig.json');
fs.writeFileSync(tsconfig, JSON.stringify({
  compilerOptions: {
    outDir: path.join(outDir, 'out'),
    rootDir: path.join(MOBILE, 'src'),
    module: 'commonjs',
    target: 'es2020',
    jsx: 'react-jsx',
    moduleResolution: 'bundler',
    resolveJsonModule: true,
    skipLibCheck: true,
    noEmitOnError: false,
    esModuleInterop: true,
    strict: false,
    ignoreDeprecations: '6.0',
    paths: { '@/*': [path.join(MOBILE, 'src', '*')] },
  },
  include: [path.join(MOBILE, 'src', 'lib', 'webState.ts')],
}));

try {
  // Type errors are expected and irrelevant here (strict is off and the RN types are not
  // being checked); what matters is that JS came out the other side.
  try { execFileSync(process.execPath, [TSC, '-p', tsconfig], { stdio: 'pipe' }); } catch (e) { /* emit-on-error */ }
  const OUT = path.join(outDir, 'out');
  if (!fs.existsSync(path.join(OUT, 'lib', 'webState.js'))) {
    console.error('check-sync-roundtrip: webState.ts did not compile. Output:');
    console.error(fs.existsSync(OUT) ? fs.readdirSync(OUT).join(', ') : '(nothing emitted)');
    process.exit(1);
  }

  /* ── stub the runtime so the module graph loads under plain node ────────── */
  const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => ({}) });
  const STUBS = {
    react: { createContext: () => ({ Provider: stub }), useContext: () => ({}), useEffect() {}, useMemo: (f) => f && f(), useRef: () => ({ current: null }), useState: (v) => [v, () => {}] },
    'react/jsx-runtime': { jsx: () => null, jsxs: () => null, Fragment: 'F' },
    'react-native': stub,
    '@react-native-async-storage/async-storage': { default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } },
    'expo-audio': stub, 'expo-router': stub, 'react-native-reanimated': stub, 'expo-haptics': stub,
  };
  const origResolve = Module._resolveFilename;
  Module._resolveFilename = function (req, ...rest) {
    if (STUBS[req]) return 'STUB:' + req;
    if (req.startsWith('@/')) return origResolve.call(this, path.join(OUT, req.slice(2)), ...rest);
    return origResolve.call(this, req, ...rest);
  };
  const origLoad = Module._load;
  Module._load = function (req, ...rest) { return STUBS[req] || origLoad.call(this, req, ...rest); };

  const { mobileToWeb, webToMobile } = require(path.join(OUT, 'lib', 'webState.js'));
  const { DEFAULT_STATE } = require(path.join(OUT, 'store.js'));
  if (!DEFAULT_STATE) throw new Error('store.js does not export DEFAULT_STATE');

  const problems = [];
  const ok = (cond, name, extra) => { if (!cond) problems.push(name + (extra ? `\n      ${extra}` : '')); };
  const eq = (name, got, want) => ok(JSON.stringify(got) === JSON.stringify(want), name,
    `got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`);

  /* ── a populated cloud row, shaped like the website writes one ─────────── */
  const cloudRow = () => ({
    resetToken: 100,
    coins: 500, diamonds: 30, xp: 900, level: 5, streak: 4,
    lastPlayedDate: 'Mon Sep 07 2026',
    lastModuleActivityDate: 'Mon Sep 07 2026',
    hasSeenOnboardingTour: true,
    postTest: { score: 19, total: 22, takenAt: '2026-09-01T10:00:00.000Z' },
    onboardingSurvey: { completed: true, trackId: 'debt_freedom', moduleFamiliarity: { saving: 3 }, focusGoals: ['build_credit'], completedAt: 1756000000000 },
    questProgress: { 'saving::first_dollar': { done: true, chapterIdx: 9 } },
    completedLessons: { saving_0: { score: 1, total: 1, xpEarned: 0 } },
    completedModules: {},
    unlockedAchievements: ['on_fire'],
    ownedItems: ['party_hat'], equippedItems: ['party_hat'],
    ownedRoomItems: ['rug_jute'], equippedRoom: { rug: 'rug_jute' },
    questBossesWon: ['credit'], dailyLoginLog: { 'Mon Sep 07 2026': 8 },
    // Web-only fields mobile has no concept of. An ordinary push must preserve every one.
    hadPerfect: true, metHammy: true, lastSeenTier: 'Budget Boss',
    financialState: { creditScore: 700 }, lifeEvents: { history: ['car_repair'], sessionCount: 9, lastTriggeredSession: 7 },
    claimedBadgeRewards: ['on_fire'], referralClaimAttempted: true,
  });

  /* ── 1. an ordinary push preserves everything the web owns ─────────────── */
  const WEB_ONLY = ['hadPerfect', 'metHammy', 'lastSeenTier', 'financialState', 'lifeEvents',
    'claimedBadgeRewards', 'referralClaimAttempted'];
  const remote1 = cloudRow();
  const mobile1 = { ...DEFAULT_STATE, resetToken: 100, coins: 600, xp: 950, moduleProgress: {}, completedLifeTaskIds: [] };
  const pushed1 = mobileToWeb(mobile1, remote1);
  for (const k of WEB_ONLY) {
    eq(`an ordinary push preserves web-only \`${k}\``, pushed1[k], remote1[k]);
  }
  ok(pushed1.questProgress['saving::first_dollar'], 'an ordinary push preserves existing questProgress');
  eq('an ordinary push preserves the web survey answers', pushed1.onboardingSurvey.moduleFamiliarity, { saving: 3 });

  /* ── 2. a RESET push replaces the row ──────────────────────────────────── */
  const remote2 = cloudRow();
  const reset = { ...DEFAULT_STATE, resetToken: 200 }; // newer than the row's 100
  const pushed2 = mobileToWeb(reset, remote2);
  eq('a reset clears questProgress', pushed2.questProgress, {});
  eq('a reset clears completedLessons', pushed2.completedLessons, {});
  eq('a reset clears completedModules', pushed2.completedModules, {});
  eq('a reset clears the assessment result', pushed2.postTest, null);
  eq('a reset clears the coins', pushed2.coins, 0);
  eq('a reset clears the XP', pushed2.xp, 0);
  eq('a reset clears owned items', pushed2.ownedItems, []);
  eq('a reset clears unlocked achievements', pushed2.unlockedAchievements, []);
  ok(!pushed2.hasSeenOnboardingTour, 'a reset clears the tour flag', String(pushed2.hasSeenOnboardingTour));
  ok(!pushed2.onboardingSurvey.completed, 'a reset clears the survey', JSON.stringify(pushed2.onboardingSurvey));
  eq('a reset clears the chosen track', pushed2.onboardingSurvey.trackId, null);
  eq('a reset clears the last module activity day', pushed2.lastModuleActivityDate, null);
  for (const k of WEB_ONLY) {
    ok(pushed2[k] === undefined, `a reset clears web-only \`${k}\` too`, `still ${JSON.stringify(pushed2[k])}`);
  }
  eq('a reset carries its own token up', pushed2.resetToken, 200);

  // ...and the round trip back must not resurrect any of it.
  const back = webToMobile(pushed2);
  eq('after a reset, no module reads as having progress', back.moduleProgress, {});
  eq('after a reset, no life task reads as done', back.completedLifeTaskIds, []);
  eq('after a reset, the assessment reads as untaken', back.postTest, null);
  ok(!back.hasCompletedOnboarding, 'after a reset, onboarding is owed again');
  eq('after a reset, there is no track', back.onboardingTrackId, null);

  /* ── 3. an EQUAL token is not a reset ──────────────────────────────────── */
  const remote3 = cloudRow();
  const same = { ...DEFAULT_STATE, resetToken: 100, moduleProgress: {}, completedLifeTaskIds: [] };
  const pushed3 = mobileToWeb(same, remote3);
  ok(pushed3.questProgress['saving::first_dollar'], 'a matching token is an ordinary push, not a reset',
    JSON.stringify(pushed3.questProgress));
  ok(pushed3.hadPerfect === true, 'a matching token preserves web-only fields');

  /* ── 4. the shared fields, both directions ─────────────────────────────── */
  const inbound = webToMobile(cloudRow());
  eq('the assessment reaches the phone', inbound.postTest, { score: 19, total: 22, takenAt: '2026-09-01T10:00:00.000Z' });
  eq('the track reaches the phone', inbound.onboardingTrackId, 'debt_freedom');
  ok(inbound.hasCompletedOnboarding, 'onboarding is not re-asked on the phone');
  ok(inbound.hasSeenOnboardingTour, 'the tour is not replayed on the phone');

  const phone = {
    ...DEFAULT_STATE, resetToken: 100,
    postTest: { score: 21, total: 22, takenAt: '2026-09-05T09:00:00.000Z' },
    onboardingTrackId: 'building_wealth', hasCompletedOnboarding: true, hasSeenOnboardingTour: true,
    lastModuleId: 'saving', moduleProgress: {}, completedLifeTaskIds: [],
  };
  const up = mobileToWeb(phone, cloudRow());
  eq('a later sitting wins', up.postTest.score, 21);
  eq('the track reaches the web', up.onboardingSurvey.trackId, 'building_wealth');
  eq('lastModuleId rides along under _mobile', up._mobile.lastModuleId, 'saving');

  const older = { ...phone, postTest: { score: 3, total: 22, takenAt: '2026-08-01T09:00:00.000Z' } };
  eq('an earlier sitting cannot unseat a later one', mobileToWeb(older, cloudRow()).postTest.score, 19);

  const blank = { ...DEFAULT_STATE, resetToken: 100, moduleProgress: {}, completedLifeTaskIds: [] };
  const up2 = mobileToWeb(blank, cloudRow());
  eq('a phone that never onboarded cannot blank the track', up2.onboardingSurvey.trackId, 'debt_freedom');
  eq('...nor the assessment', up2.postTest.score, 19);
  ok(up2.hasSeenOnboardingTour, '...nor the tour flag');

  /* ── 5. activity day only moves forward ────────────────────────────────── */
  const stale = { ...blank, lastModuleActivityDate: 'Fri Sep 04 2026' };
  eq('an older activity day does not walk the shared one back',
    mobileToWeb(stale, cloudRow()).lastModuleActivityDate, 'Mon Sep 07 2026');
  const fresh = { ...blank, lastModuleActivityDate: 'Tue Sep 08 2026' };
  eq('a newer activity day moves it forward',
    mobileToWeb(fresh, cloudRow()).lastModuleActivityDate, 'Tue Sep 08 2026');

  /* ── report ────────────────────────────────────────────────────────────── */
  if (problems.length) {
    console.error('Sync round-trip FAILED:\n');
    for (const p of problems) console.error('  - ' + p);
    console.error('\nmobile/src/lib/webState.ts is the translation layer. A reset REPLACES the');
    console.error('row (see mobileToWeb\'s isResetPush); every other push merges onto it.\n');
    process.exit(1);
  }
  console.log('Sync round-trip OK — an ordinary push preserves all '
    + `${WEB_ONLY.length} web-only fields, a reset replaces the row outright and cannot be `
    + 'undone by a round trip, and the shared fields survive in both directions.');
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}
