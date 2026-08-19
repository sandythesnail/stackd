/**
 * Guards the web's daily-reward ladder against the Expo app's.
 *
 * Both apps credit real currency from these numbers against the SAME synced balance, so a
 * divergence isn't cosmetic — a player claiming on their phone and their laptop on alternating
 * days would be paid two different ladders out of one wallet, and nothing would report it.
 *
 * Runs the web's own functions (daily-rewards.js is plain script-scope, so it can be evaluated
 * here with a small stub for what it expects to be global) against the constants parsed out of
 * mobile/src/dailyRewards.ts, over enough streak days to cover the cycle bonus reaching its cap.
 *
 *   node scripts/check-daily-rewards.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

/* ── the mobile side: constants, read out of the TS source ── */
const ts = read('mobile/src/dailyRewards.ts');
function num(name) {
  const m = ts.match(new RegExp('(?:const|export const) ' + name + '\\s*(?::\\s*\\w+)?\\s*=\\s*(\\d+)'));
  if (!m) throw new Error('dailyRewards.ts: no ' + name);
  return Number(m[1]);
}
const ladderMatch = ts.match(/DAILY_REWARD_LADDER\s*=\s*\[([^\]]+)\]/);
if (!ladderMatch) throw new Error('dailyRewards.ts: no DAILY_REWARD_LADDER');
const MOB = {
  ladder: ladderMatch[1].split(',').map((n) => Number(n.trim())).filter((n) => !Number.isNaN(n)),
  diamonds: num('DAILY_REWARD_DIAMONDS'),
  diamondIdx: num('DIAMOND_DAY_INDEX'),
  bonusPerWeek: num('CYCLE_BONUS_PER_WEEK'),
  bonusCap: num('CYCLE_BONUS_CAP'),
};

/* ── the web side: evaluate daily-rewards.js and pull its functions out ── */
const sandbox = {
  // Everything the file touches at call time but not at parse time. The reward maths never
  // reaches any of it; the modal half does, and this only calls the maths.
  document: { getElementById: () => null, createElement: () => ({ addEventListener() {}, classList: { add() {}, remove() {} } }), body: { appendChild() {} } },
  state: { streak: 1, dailyLoginLog: {}, coins: 0, diamonds: 0 },
  saveState() {}, updateSidebarStats() {}, renderHome() {}, makeModalAccessible() {},
  console,
};
vm.createContext(sandbox);
vm.runInContext(read('daily-rewards.js'), sandbox, { filename: 'daily-rewards.js' });
const web = vm.runInContext(
  '({ coins: dailyRewardCoins, diamonds: dailyRewardDiamonds, cycle: dailyRewardCycleFor,' +
  '   bonus: cycleBonus, LADDER: DAILY_REWARD_LADDER, DIAMONDS: DAILY_REWARD_DIAMONDS,' +
  '   CYCLE_DAYS: DAILY_REWARD_CYCLE_DAYS })',
  sandbox);

const problems = [];
const eq = (what, a, b) => { if (a !== b) problems.push(`${what}: web ${a}, mobile ${b}`); };

/* ── constants ── */
eq('ladder length', web.LADDER.length, MOB.ladder.length);
MOB.ladder.forEach((v, i) => eq(`ladder[${i}]`, web.LADDER[i], v));
eq('DAILY_REWARD_DIAMONDS', web.DIAMONDS, MOB.diamonds);
eq('cycle days', web.CYCLE_DAYS, MOB.ladder.length);

/* ── the payout functions, recomputed independently from mobile's constants ── */
const mobBonus = (weeks) => Math.min(weeks * MOB.bonusPerWeek, MOB.bonusCap);
const mobCoins = (streak) => {
  const day = Math.max(1, Math.floor(streak));
  const idx = (day - 1) % MOB.ladder.length;
  if (idx === MOB.diamondIdx) return 0;
  return MOB.ladder[idx] + mobBonus(Math.floor((day - 1) / MOB.ladder.length));
};
const mobDiamonds = (streak) =>
  (Math.max(1, Math.floor(streak)) - 1) % MOB.ladder.length === MOB.diamondIdx ? MOB.diamonds : 0;

// Six weeks: long enough for the bonus to climb, hit its cap, and stay there.
for (let streak = 1; streak <= 42; streak++) {
  eq(`coins at streak ${streak}`, web.coins(streak), mobCoins(streak));
  eq(`diamonds at streak ${streak}`, web.diamonds(streak), mobDiamonds(streak));
}

/* ── the guards that stop a bad streak paying NaN ── */
for (const bad of [0, -1, -99, 0.4]) {
  const c = web.coins(bad);
  if (!Number.isFinite(c) || c !== mobCoins(bad)) {
    problems.push(`coins at streak ${bad}: web ${c}, mobile ${mobCoins(bad)}`);
  }
}

/* ── the day-7 trap: a claimed diamond day must not read back as missed ──
   Day 7 pays zero coins, so anything that writes the coin figure into dailyLoginLog and
   later tests it for truthiness marks the biggest day of the week as missed the moment it
   is collected. Both apps write `coins || dayDiamonds` for exactly this reason. */
{
  const now = new Date(2026, 7, 19);
  const log = {};
  // Walk a full week, logging each day the way claimDailyLoginBonus does.
  for (let d = 0; d < 7; d++) {
    const date = new Date(2026, 7, 19 - (6 - d)).toDateString();
    log[date] = web.coins(d + 1) || web.diamonds(d + 1);
  }
  const cyc = web.cycle(7, log, now);
  if (cyc.days[6].state !== 'claimed') {
    problems.push(`day 7 collected but reads as '${cyc.days[6].state}' — the zero-coin log trap`);
  }
  const missed = cyc.days.filter((d) => d.state === 'missed');
  if (missed.length) problems.push(`a fully-collected week reports ${missed.length} missed day(s)`);
}

/* ── the cycle's shape ── */
{
  const cyc = web.cycle(3, {}, new Date(2026, 7, 19));
  eq('todayIndex at streak 3', cyc.todayIndex, 2);
  if (cyc.days[2].state !== 'today') problems.push(`slot 2 at streak 3 is '${cyc.days[2].state}', expected 'today'`);
  if (cyc.days[3].state !== 'upcoming') problems.push(`slot 3 at streak 3 is '${cyc.days[3].state}', expected 'upcoming'`);
  if (cyc.days[0].state !== 'missed') problems.push(`slot 0 with an empty log is '${cyc.days[0].state}', expected 'missed'`);
}

if (problems.length) {
  console.error('Daily-reward ladder has drifted from mobile/src/dailyRewards.ts:\n');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

const week1 = [1, 2, 3, 4, 5, 6, 7].reduce((t, d) => t + web.coins(d), 0);
console.log(`Daily rewards OK — ladder, cycle bonus and day-7 diamonds match mobile over 6 weeks.`);
console.log(`  week 1 pays ${week1} coins + ${web.diamonds(7)} diamonds; capped week pays ${
  [36, 37, 38, 39, 40, 41, 42].reduce((t, d) => t + web.coins(d), 0)} coins.`);
