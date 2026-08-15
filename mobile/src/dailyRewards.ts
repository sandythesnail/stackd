/**
 * The daily-login reward cycle — a seven-day ladder that climbs, pays a real prize on day 7,
 * and starts over.
 *
 * What this replaces: the old drip was `10 + 2 * (dayNumber - 1)` capped at 20, where
 * `dayNumber` counted every day the player had EVER claimed. Two things were wrong with it.
 * The cap arrived on the sixth day and never left, so from then on every single day paid a
 * flat 20 forever — the "reward for coming back" stopped rewarding anything in particular
 * about coming back. And because the counter was lifetime-cumulative rather than positional,
 * there was nothing to show the player: no week, no shape, no "two more days until the big
 * one", just a number that used to grow and then didn't.
 *
 * The ladder below is positional instead. `streak` (the app's existing count of consecutive
 * days, advanced once per calendar day by runDailyCheck) decides where in the week you are,
 * so day 1 of the cycle is genuinely your first day back and day 7 is genuinely your
 * seventh. It's a shape the player can see and plan around, which is the entire point of
 * showing them a seven-tile calendar.
 */

/** Seven slots, and the last one is the reason to reach it: 35 is a third of the whole
 * week's take in a single day, and it's the only rung that jumps rather than steps. The
 * six before it climb gently (8 → 22) so that missing a day costs something real without
 * the early days feeling like a rounding error. A full first week pays 120. */
export const DAILY_REWARD_LADDER = [8, 10, 12, 15, 18, 22, 0] as const;

/** Day 7 pays DIAMONDS instead of coins.
 *
 * It was 35 coins, which is a third of the week in one day but still the same currency as
 * every other rung - a bigger number, not a different kind of prize. Diamonds are the
 * scarce currency (streaks, level-ups, and now this), and they are the only way to reach
 * the Diamond Exclusives, so ending the week on them makes day 7 worth planning around
 * rather than merely worth more. Ten is half a mystery box.
 *
 * Its coin rung is 0 rather than a small consolation: two currencies on one tile reads as
 * a receipt, and the tile has room for one number. */
export const DAILY_REWARD_DIAMONDS = 10;

/** Which rung of the ladder pays in diamonds - the last one. */
const DIAMOND_DAY_INDEX = 6;
export const DAILY_REWARD_CYCLE_DAYS = DAILY_REWARD_LADDER.length;

/** Every completed week adds this to each of the next week's seven rungs — "a little bit
 * increasing", deliberately small. One extra coin per rung would be invisible; anything
 * near double turns week five into a coin printer and makes the shop meaningless. */
const CYCLE_BONUS_PER_WEEK = 2;
/** ...and it stops climbing after three weeks. Uncapped, a devoted player's cycle bonus
 * would eventually dwarf the ladder itself and the day-7 payoff would stop reading as the
 * prize. At the cap a week pays 162 against the first week's 120 — better for showing up
 * every day, not a different economy. For comparison, the old flat-20 drip paid 140 a week
 * forever, so this lands either side of it rather than above it everywhere. */
const CYCLE_BONUS_CAP = 6;

export type DailyRewardDayState =
  /** Collected, on the real calendar day it belonged to. */
  | 'claimed'
  /** The day happened and the coins were never collected. Only reachable when a player
   * opens the app (which advances the streak) without tapping to collect. */
  | 'missed'
  /** Today, still uncollected — the one tile the modal keeps face-down. */
  | 'today'
  /** Hasn't happened yet. Shown with its amount visible on purpose: the climb toward day 7
   * is the thing worth looking at. */
  | 'upcoming';

export type DailyRewardDay = {
  /** 1-based position in the cycle, i.e. the "Day 3" the tile is labelled with. */
  day: number;
  coins: number;
  /** Diamonds this slot pays. Only day 7 is non-zero - see DAILY_REWARD_DIAMONDS. */
  diamonds: number;
  /** toDateString() of the calendar day this slot falls on — real for past slots, projected
   * for future ones. Past slots are looked up in dailyLoginLog by exactly this key. */
  date: string;
  state: DailyRewardDayState;
};

export type DailyRewardCycle = {
  days: DailyRewardDay[];
  /** 0-based index into `days` of today's slot. */
  todayIndex: number;
  /** How many full weeks are already behind this one. 0 during the player's first week. */
  weeksCompleted: number;
  /** What today pays if it hasn't been collected yet. */
  todayCoins: number;
  claimedToday: boolean;
};

/** Bonus added to every rung this week. Exported for the modal's "+N per day" footnote. */
export function cycleBonus(weeksCompleted: number): number {
  return Math.min(weeksCompleted * CYCLE_BONUS_PER_WEEK, CYCLE_BONUS_CAP);
}

/** What a given streak day pays. `streak` is 1-based (runDailyCheck seeds it to 1 on the
 * player's first day), and anything below that is treated as day 1 rather than trusted —
 * a 0 or negative streak here would otherwise index the ladder out of bounds and pay NaN. */
export function dailyRewardCoins(streak: number): number {
  const day = Math.max(1, Math.floor(streak));
  const idx = (day - 1) % DAILY_REWARD_CYCLE_DAYS;
  // The diamond day pays no coins at all, so the cycle bonus must not conjure some: it is
  // a bonus ON the coin rung, and that rung is zero.
  if (idx === DIAMOND_DAY_INDEX) return 0;
  return DAILY_REWARD_LADDER[idx] + cycleBonus(Math.floor((day - 1) / DAILY_REWARD_CYCLE_DAYS));
}

/** What a given streak day pays in diamonds. Zero on six days out of seven. */
export function dailyRewardDiamonds(streak: number): number {
  const day = Math.max(1, Math.floor(streak));
  return (day - 1) % DAILY_REWARD_CYCLE_DAYS === DIAMOND_DAY_INDEX ? DAILY_REWARD_DIAMONDS : 0;
}

/** The whole seven-tile week around today, ready to render.
 *
 * `log` is the store's dailyLoginLog (toDateString() → coins paid). It's what separates a
 * 'claimed' past day from a 'missed' one; slots are dated by counting calendar days back
 * from today, so the lookup is exact rather than inferred from the streak length.
 *
 * `now` is injectable purely so this is testable without waiting for midnight.
 */
export function dailyRewardCycleFor(
  streak: number,
  log: Record<string, number>,
  now: Date = new Date(),
): DailyRewardCycle {
  const streakDay = Math.max(1, Math.floor(streak));
  const todayIndex = (streakDay - 1) % DAILY_REWARD_CYCLE_DAYS;
  const weeksCompleted = Math.floor((streakDay - 1) / DAILY_REWARD_CYCLE_DAYS);
  const bonus = cycleBonus(weeksCompleted);
  const todayKey = now.toDateString();
  const claimedToday = !!log[todayKey];

  const days = DAILY_REWARD_LADDER.map((base, i) => {
    // Calendar arithmetic, not `now - n * 86400000`. A fixed-24h subtraction lands on the
    // wrong calendar day either side of a DST transition, which is the same bug runDailyCheck
    // documents at length — and here it would mismatch the dailyLoginLog key and report a
    // collected day as missed.
    const offset = todayIndex - i;
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset).toDateString();
    let state: DailyRewardDayState;
    if (i < todayIndex) state = log[date] ? 'claimed' : 'missed';
    else if (i === todayIndex) state = claimedToday ? 'claimed' : 'today';
    else state = 'upcoming';
    const isDiamondDay = i === DIAMOND_DAY_INDEX;
    return {
      day: i + 1,
      coins: isDiamondDay ? 0 : base + bonus,
      diamonds: isDiamondDay ? DAILY_REWARD_DIAMONDS : 0,
      date,
      state,
    };
  });

  return {
    days,
    todayIndex,
    weeksCompleted,
    todayCoins: days[todayIndex].coins,
    claimedToday,
  };
}
