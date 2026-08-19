/* ══════════════════════════════════════════════
   Daily rewards — a seven-day ladder, not a flat drip

   Ported from mobile/src/dailyRewards.ts and src/components/DailyRewardsModal.tsx.

   WHAT THIS REPLACES: the old web drip was `10 + 2 * (dayNumber - 1)` capped at 20, where
   `dayNumber` counted every day the player had EVER claimed. Two things were wrong with it.
   The cap arrived on the sixth day and never left, so from then on every single day paid a
   flat 20 forever — the "reward for coming back" stopped rewarding anything in particular
   about coming back. And because the counter was lifetime-cumulative rather than positional,
   there was nothing to show the player: no week, no shape, no "two more days until the big
   one", just a number that used to grow and then didn't. It also meant a player who missed a
   week came back to a BIGGER reward than they'd left with.

   The ladder here is positional instead. state.streak (the app's existing count of
   consecutive days, advanced once per calendar day by updateStreak) decides where in the week
   you are, so day 1 of the cycle is genuinely your first day back and day 7 is genuinely your
   seventh. That's a shape the player can see and plan around, which is the entire point of
   showing them a seven-tile calendar.
   ══════════════════════════════════════════════ */

/** Seven slots, and the last one is the reason to reach it. The six before it climb gently
 *  (8 → 22) so that missing a day costs something real without the early days feeling like a
 *  rounding error. Day 7's coin rung is 0 because it pays diamonds instead — see below. */
const DAILY_REWARD_LADDER = [8, 10, 12, 15, 18, 22, 0];

/** Day 7 pays DIAMONDS instead of coins.
 *
 * A bigger coin number would still be the same currency as every other rung — more, not
 * different. Diamonds are the scarce currency (streak milestones, level-ups, and now this),
 * and the only way to reach the Diamond Exclusives, so ending the week on them makes day 7
 * worth planning around rather than merely worth more. Ten is half a mystery box.
 *
 * Its coin rung is 0 rather than a small consolation: two currencies on one tile reads as a
 * receipt, and the tile has room for one number. */
const DAILY_REWARD_DIAMONDS = 10;
/** Which rung pays in diamonds — the last one. */
const DIAMOND_DAY_INDEX = 6;
const DAILY_REWARD_CYCLE_DAYS = DAILY_REWARD_LADDER.length;

/** Every completed week adds this to each of the next week's seven rungs — "a little bit
 *  increasing", deliberately small. One extra coin per rung would be invisible; anything near
 *  double turns week five into a coin printer and makes the shop meaningless. */
const CYCLE_BONUS_PER_WEEK = 2;
/** ...and it stops climbing after three weeks. Uncapped, a devoted player's cycle bonus would
 *  eventually dwarf the ladder itself and the day-7 payoff would stop reading as the prize.
 *
 *  Measured rather than assumed (scripts/check-daily-rewards.js prints both): a first week
 *  pays 85 coins plus the day-7 diamonds, and a capped week pays 121 coins. The old flat drip
 *  paid 140 coins a week forever and no diamonds, so this is fewer coins and a scarce-currency
 *  prize on top — a different shape, not simply more.
 *
 *  NOTE: mobile/src/dailyRewards.ts still says "a full first week pays 120" and "at the cap a
 *  week pays 162". Those figures are from before day 7 became diamonds, when its rung was 35
 *  coins (8+10+12+15+18+22+35 = 120). The constants are the source of truth and they agree
 *  across both apps; only that prose is stale. */
const CYCLE_BONUS_CAP = 6;

/** One present per day of the week.
 *
 * Deliberately NOT in rainbow order. Adjacent days want to look as unlike each other as
 * possible, and a spectrum puts its most similar neighbours side by side — red beside orange,
 * blue beside indigo — which is the opposite of what a row of seven small boxes needs. Hues
 * jump instead: red, blue, purple, green, yellow, orange, pink. */
const GIFT_COLORS = [
  { box: '#FFB3B8', lid: '#FF8F98', line: '#5E1622' }, // red
  { box: '#A9DCF5', lid: '#7CC7EE', line: '#0D3B54' }, // blue
  { box: '#DCB6EE', lid: '#C48FE2', line: '#3D1852' }, // purple
  { box: '#B6E5AE', lid: '#8FD684', line: '#1C4A18' }, // green
  { box: '#FFE7A0', lid: '#FFD764', line: '#5E4708' }, // yellow
  { box: '#FFCBA1', lid: '#FFAE74', line: '#5E300E' }, // orange
  { box: '#FFC2DE', lid: '#FF9CC6', line: '#5E1A3D' }, // pink, and day 7 is the big one
];
/** The same present with the colour drained out, for a day that was missed. */
const GIFT_MISSED = { box: '#E4E0D6', lid: '#D5D0C4', line: '#A39D8F' };

/** The present, drawn once. The ribbon stays gold on every one, which is what keeps seven
 *  different colours reading as one set. */
function giftSvg(size, c) {
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true">' +
    '<rect x="4" y="11" width="16" height="8.5" rx="1" fill="' + c.box + '" stroke="' + c.line + '" stroke-width="1.4"/>' +
    '<rect x="3" y="8" width="18" height="3.4" rx="0.9" fill="' + c.lid + '" stroke="' + c.line + '" stroke-width="1.4"/>' +
    '<rect x="10.7" y="8" width="2.6" height="11.5" fill="#FFD23F" stroke="#8A5A00" stroke-width="0.8"/>' +
    '<path d="M12 8c-1.6-3.2-5.4-3.2-5.4-0.2 0 1.7 2.5 1 5.4 0.2z" fill="#FFD23F" stroke="#8A5A00" stroke-width="0.8" stroke-linejoin="round"/>' +
    '<path d="M12 8c1.6-3.2 5.4-3.2 5.4-0.2 0 1.7-2.5 1-5.4 0.2z" fill="#FFD23F" stroke="#8A5A00" stroke-width="0.8" stroke-linejoin="round"/>' +
    '<rect x="4" y="11" width="16" height="1.6" fill="#ffffff" opacity="0.25"/>' +
    '</svg>';
}

/** Bonus added to every rung this week. Also drives the modal's footnote. */
function cycleBonus(weeksCompleted) {
  return Math.min(weeksCompleted * CYCLE_BONUS_PER_WEEK, CYCLE_BONUS_CAP);
}

/** What a given streak day pays in coins. `streak` is 1-based (updateStreak seeds it to 1 on
 *  the player's first day), and anything below that is treated as day 1 rather than trusted —
 *  a 0 or negative streak would otherwise index the ladder out of bounds and pay NaN. */
function dailyRewardCoins(streak) {
  const day = Math.max(1, Math.floor(streak));
  const idx = (day - 1) % DAILY_REWARD_CYCLE_DAYS;
  // The diamond day pays no coins at all, so the cycle bonus must not conjure some: it is a
  // bonus ON the coin rung, and that rung is zero.
  if (idx === DIAMOND_DAY_INDEX) return 0;
  return DAILY_REWARD_LADDER[idx] + cycleBonus(Math.floor((day - 1) / DAILY_REWARD_CYCLE_DAYS));
}

/** What a given streak day pays in diamonds. Zero on six days out of seven. */
function dailyRewardDiamonds(streak) {
  const day = Math.max(1, Math.floor(streak));
  return (day - 1) % DAILY_REWARD_CYCLE_DAYS === DIAMOND_DAY_INDEX ? DAILY_REWARD_DIAMONDS : 0;
}

/** The whole seven-tile week around today, ready to render.
 *
 * `log` is state.dailyLoginLog (toDateString() → a truthy value). It's what separates a
 * 'claimed' past day from a 'missed' one; slots are dated by counting calendar days back from
 * today, so the lookup is exact rather than inferred from the streak length.
 *
 * `now` is injectable purely so this is testable without waiting for midnight. */
function dailyRewardCycleFor(streak, log, now) {
  const when = now || new Date();
  const streakDay = Math.max(1, Math.floor(streak));
  const todayIndex = (streakDay - 1) % DAILY_REWARD_CYCLE_DAYS;
  const weeksCompleted = Math.floor((streakDay - 1) / DAILY_REWARD_CYCLE_DAYS);
  const bonus = cycleBonus(weeksCompleted);
  const todayKey = when.toDateString();
  const claimedToday = !!(log && log[todayKey]);

  const days = DAILY_REWARD_LADDER.map(function (base, i) {
    // Calendar arithmetic, not `now - n * 86400000`. A fixed-24h subtraction lands on the
    // wrong calendar day either side of a DST transition — the same bug updateStreak
    // documents at length — and here it would mismatch the dailyLoginLog key and report a
    // collected day as missed.
    const offset = todayIndex - i;
    const date = new Date(when.getFullYear(), when.getMonth(), when.getDate() - offset).toDateString();
    let dayState;
    if (i < todayIndex) dayState = (log && log[date]) ? 'claimed' : 'missed';
    else if (i === todayIndex) dayState = claimedToday ? 'claimed' : 'today';
    else dayState = 'upcoming';
    const isDiamondDay = i === DIAMOND_DAY_INDEX;
    return {
      day: i + 1,
      coins: isDiamondDay ? 0 : base + bonus,
      diamonds: isDiamondDay ? DAILY_REWARD_DIAMONDS : 0,
      date: date,
      state: dayState,
    };
  });

  return {
    days: days,
    todayIndex: todayIndex,
    weeksCompleted: weeksCompleted,
    todayCoins: days[todayIndex].coins,
    claimedToday: claimedToday,
  };
}

/* ─────────────────────────── the modal ─────────────────────────── */

/** The seven-day reward calendar — the week laid out as tiles, with today's face-down until
 * the player collects it.
 *
 * Why a face-down tile and not just a number: the ladder is public (every other day shows a
 * present, and day 7's payout is the reason to come back on day 6) but the day you're actually
 * here for is worth one beat of suspense. That beat is also what makes "Claim" a real action
 * rather than an OK button — before this, collecting the daily coins silently incremented a
 * balance behind a modal that only announced it.
 *
 * Every number here comes from dailyRewardCycleFor, and the claim itself comes from
 * claimDailyLoginBonus, so what the tiles promise and what the state credits cannot disagree.
 *
 * `pendingDiamonds` is any streak-milestone diamonds already credited at boot and merely
 * waiting to be announced — see the note on `collected` below. */
function showDailyRewardsModal(pendingDiamonds) {
  const modal = getDailyRewardsModal();
  // Frozen at open. Claiming rewrites the live cycle (today's slot flips to 'claimed'), and
  // rendering straight off that would snap the tile to its collected state on the same frame
  // the reveal is trying to play it.
  const cycle = dailyRewardCycleFor(state.streak, state.dailyLoginLog || {});
  const waiting = pendingDiamonds || 0;

  /* Whether Claim has anything left to do.
   *
   * Deliberately not `cycle.claimedToday` alone: there are TWO things a claim can collect and
   * only one of them is coins. A streak-diamond milestone is credited automatically by
   * updateStreak and merely waits here to be announced, so a player who collected their coins
   * earlier in the day and then crossed a milestone has nothing to uncover but still has
   * something to be told. Keying the button off the coins alone would leave them looking at a
   * finished modal with no way to acknowledge the diamonds. */
  const st = {
    cycle: cycle,
    pendingDiamonds: waiting,
    collected: cycle.claimedToday && waiting === 0,
    paid: null,
  };
  renderDailyRewards(modal, st);
  modal.classList.add('show');
  makeModalAccessible(modal, function () { closeDailyRewardsModal(modal); });
}

function renderDailyRewards(modal, st) {
  const cycle = st.cycle;
  const nextDay = ((cycle.todayIndex + 1) % DAILY_REWARD_CYCLE_DAYS) + 1;
  const bonus = cycleBonus(cycle.weeksCompleted);

  const tile = function (d) {
    const isToday = d.day === cycle.todayIndex + 1;
    // Today's tile is the only one that changes while the modal is open, and it has two looks
    // rather than one: face-down (a present), then collected.
    const look = isToday && !st.collected ? 'today' : isToday ? 'claimed' : d.state;
    const colors = look === 'missed' ? GIFT_MISSED : GIFT_COLORS[(d.day - 1) % GIFT_COLORS.length];
    const big = d.day === DAILY_REWARD_CYCLE_DAYS;

    let face;
    if (isToday) {
      /* Both layers are always in the DOM and stacked; opacity does the swapping. Swapping
         the rendered content instead would resize the tile mid-animation, since a present
         glyph and a coin-plus-number are not the same width. */
      face =
        '<span class="dr-layer dr-cover">' + giftSvg(34, colors) + '</span>' +
        '<span class="dr-layer dr-prize">' +
          (d.diamonds > 0 ? diamondIconSvg(16) : coinIconSvg(17)) +
          '<span class="dr-amount">' + (d.diamonds > 0 ? d.diamonds : d.coins) + '</span>' +
        '</span>';
    } else {
      /* Present only, no amount. Printing every day's payout up front turned a week of
         presents back into a price list, and it spoiled the one tile that is worth opening. */
      face = '<span class="dr-layer">' + giftSvg(30, colors) + '</span>';
    }

    return '<div class="dr-tile dr-' + look + (big ? ' dr-big' : '') + (isToday ? ' dr-today-tile' : '') +
      (isToday && st.collected ? ' dr-revealed' : '') + '">' +
      '<span class="dr-day">DAY ' + d.day + '</span>' +
      '<span class="dr-face">' + face + '</span>' +
      (look === 'claimed' ? '<span class="dr-tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" width="10" height="10"><polyline points="20 6 9 17 4 12"/></svg></span>' : '') +
      '</div>';
  };

  const paidCoins = st.paid ? st.paid.coins : 0;
  const paidDiamonds = st.paid ? st.paid.diamonds : 0;
  const showResult = !!st.paid && (paidCoins > 0 || paidDiamonds > 0);

  /* The result chips report what the claim ACTUALLY paid rather than what today's slot is
     worth. On a diamonds-only claim those are different numbers, and showing the slot's value
     would credit the player, in writing, with coins they were paid hours ago. */
  const footer = showResult
    ? '<div class="dr-result">' +
        (paidCoins > 0 ? '<span class="dr-chip">' + coinIconSvg(15) + '<span>+' + paidCoins + '</span></span>' : '') +
        (paidDiamonds > 0 ? '<span class="dr-chip">' + diamondIconSvg(14) + '<span>+' + paidDiamonds + '</span></span>' : '') +
      '</div>'
    : '<p class="dr-hint">' +
        (st.collected
          ? 'All collected for today. Come back tomorrow for day ' + nextDay + '.'
          : cycle.todayIndex + 1 === DAILY_REWARD_CYCLE_DAYS
            ? 'Last day of the week, and the biggest. Collect it and the cycle starts over at day 1.'
            // Just the invitation back. The "day 7 pays the most" half is dropped once it's
            // collected: it sells a future payout at the one moment there's nothing to act on.
            : 'Come back tomorrow for day ' + nextDay + '.') +
      '</p>';

  modal.innerHTML =
    '<div class="dr-card">' +
      '<h2 class="dr-title">Daily rewards</h2>' +
      '<div class="dr-sub">Day ' + (cycle.todayIndex + 1) + ' of ' + DAILY_REWARD_CYCLE_DAYS +
        (state.streak > 1 ? ' · ' + state.streak + '-day streak' : '') +
        (bonus > 0 ? ' · +' + bonus + ' per day' : '') +
      '</div>' +
      // Four then three. Day 7 takes the extra width its payout deserves — it's the one rung
      // that jumps rather than steps, so it shouldn't look like the other six.
      '<div class="dr-grid">' +
        '<div class="dr-row">' + cycle.days.slice(0, 4).map(tile).join('') + '</div>' +
        '<div class="dr-row">' + cycle.days.slice(4).map(tile).join('') + '</div>' +
      '</div>' +
      footer +
      '<button type="button" class="btn-primary dr-cta" id="dr-cta">' +
        (st.collected ? 'Nice!' : 'Claim') +
      '</button>' +
    '</div>';

  document.getElementById('dr-cta').addEventListener('click', function () {
    if (st.collected) { closeDailyRewardsModal(modal); return; }
    const paid = claimDailyLoginBonus(st.pendingDiamonds);
    st.paid = paid;
    st.collected = true;
    st.pendingDiamonds = 0;
    // Tells the closer that Home genuinely needs rebuilding.
    modal.dataset.claimed = '1';
    // Re-read so the tiles show today as claimed, then let the CSS reveal play.
    st.cycle = dailyRewardCycleFor(state.streak, state.dailyLoginLog || {});
    renderDailyRewards(modal, st);
    // Only the currency readouts, NOT renderHome(). renderHome calls showPage, showPage calls
    // closeAllModals, and this modal is one of them — so refreshing Home from inside the claim
    // tore down the modal on the same frame the reveal was starting, and the player never saw
    // what they had just uncovered. Home is refreshed on close instead (see
    // closeDailyRewardsModal), by which point there is nothing left on screen to destroy.
    refreshCurrencyReadouts();
  });
}

function getDailyRewardsModal() {
  let modal = document.getElementById('daily-login-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'daily-login-modal';
    modal.className = 'achievement-modal-overlay dr-overlay';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeDailyRewardsModal(modal);
    });
  }
  return modal;
}

function closeDailyRewardsModal(modal) {
  const wasClaimed = modal.dataset.claimed === '1';
  modal.dataset.claimed = '';
  modal.classList.remove('show');
  if (modal._a11yCleanup) modal._a11yCleanup();
  // Deferred to here rather than run at claim time — see the note in renderDailyRewards.
  // Guarded so merely looking at the week doesn't rebuild Home for nothing.
  if (wasClaimed) renderHome();
}

/** The header and sidebar currency figures, without rebuilding the page around them.
 *  updateSidebarStats owns the sidebar; Home's own header badges are separate elements that
 *  only renderHome would otherwise touch. */
function refreshCurrencyReadouts() {
  updateSidebarStats();
  const coinEl = document.getElementById('home-hdr-coins');
  const diamondEl = document.getElementById('home-hdr-diamonds');
  if (coinEl) coinEl.textContent = (state.coins || 0).toLocaleString();
  if (diamondEl) diamondEl.textContent = (state.diamonds || 0).toLocaleString();
}

/* The two currency glyphs, matching the ones already in app.html's header badges. Inlined
   here rather than cloned from the DOM so the modal can be built before those exist. */
function coinIconSvg(size) {
  return '<svg class="icon-coin" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="10" fill="#FFC400" stroke="#8A5A00" stroke-width="1.6"/>' +
    '<circle cx="12" cy="12" r="7.3" fill="none" stroke="#8A5A00" stroke-width="1" opacity="0.55"/>' +
    '<text x="12" y="16.2" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="800" fill="#8A5A00">$</text>' +
    '</svg>';
}
function diamondIconSvg(size) {
  return '<svg class="icon-diamond" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true">' +
    '<polygon points="8,6 16,6 20,10.5 12,19 4,10.5" fill="#159CDE" stroke="#0A4A6E" stroke-width="1.2" stroke-linejoin="round"/>' +
    '<polygon points="4,10.5 12,19 12,10.5" fill="#0A4A6E" opacity="0.18"/>' +
    '<polygon points="8,6 16,6 20,10.5 4,10.5" fill="#ffffff" opacity="0.3"/>' +
    '</svg>';
}
