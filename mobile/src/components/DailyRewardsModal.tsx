import { useEffect, useState } from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, cancelAnimation, Easing,
} from 'react-native-reanimated';
import { colors, font, radius } from '@/theme';
import { useStore } from '@/store';
import { DAILY_REWARD_CYCLE_DAYS, type DailyRewardDay } from '@/dailyRewards';
import { useReducedMotion } from '@/lessonPath/bits';
import { Txt } from './Txt';
import { Button } from './Button';
import { Coin, Diamond, Gift } from './Currency';

const REVEAL_MS = 420;

/** The seven-day reward calendar — the week laid out as tiles, with today's face-down until
 * the player collects it.
 *
 * Why a face-down tile and not just a number: the ladder is public (every other day shows
 * its amount, because seeing 35 sitting on day 7 is the reason to come back on day 6) but
 * the day you're actually here for is worth one beat of suspense. That beat is also what
 * makes "Claim" a real action rather than an OK button — before this, collecting the daily
 * coins was a tap on a stat tile that silently incremented a balance.
 *
 * The numbers all come from the store's dailyRewardCycle (see @/dailyRewards); nothing here
 * computes a payout, so what the tiles promise and what the store credits cannot disagree.
 */
export function DailyRewardsModal({ onClose }: { onClose: () => void }) {
  const {
    dailyRewardCycle, claimDailyLoginBonus, dailyLoginBanner, dismissDailyLoginBanner,
    loginBonusPending, state,
  } = useStore();
  const reducedMotion = useReducedMotion();

  // Frozen at open. Claiming rewrites the live cycle (today's slot flips to 'claimed'), and
  // rendering straight off that would snap the tile to its collected state on the same frame
  // the reveal animation is trying to play it. The tile's appearance is driven by `collected`
  // below instead, so the animation owns that transition.
  const [cycle] = useState(dailyRewardCycle);

  // Whether the Claim button has anything left to do — snapshotted, for the same reason the
  // cycle is.
  //
  // This is loginBonusPending rather than `cycle.claimedToday`, because there are TWO things
  // a claim can collect and only one of them is coins. A streak-diamond milestone is credited
  // automatically at boot (runDailyCheck) and merely waits here to be announced, so a player
  // who collected their coins earlier in the day and then crossed a diamond milestone has
  // nothing to uncover but still has something to be told. Keying the button off the coins
  // alone left that player looking at a finished-looking modal with no way to acknowledge the
  // diamonds — and since acknowledging them is what clears the pending flag, the Streak tile
  // stayed lit up "come collect" for the rest of the day with nothing behind it.
  const [collected, setCollected] = useState(!loginBonusPending);

  // Only today's COINS decide whether there's a face-down tile. A diamonds-only claim has
  // nothing to uncover, so its tile starts revealed.
  const reveal = useSharedValue(cycle.claimedToday ? 1 : 0);

  const onClaim = () => {
    if (collected) return;
    claimDailyLoginBonus();
    setCollected(true);
  };

  // The uncover runs from an effect on `claimed` rather than from inside onClaim, and the
  // shared value is deliberately NOT in the dependency array — both for the same reason, and
  // it's the same shape every other animation in this app uses (see LessonPath's CTA pulse).
  // The React Compiler freezes anything listed as a dependency, so naming `reveal` there
  // makes writing to it an error ("this value cannot be modified"); a shared value is a
  // stable handle, so it has no business in a dep list anyway.
  // Opening an already-collected day animates 1 → 1, which is a no-op.
  useEffect(() => {
    if (!collected) return;
    reveal.value = reducedMotion
      ? 1
      : withTiming(1, { duration: REVEAL_MS, easing: Easing.out(Easing.back(1.6)) });
    return () => cancelAnimation(reveal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collected, reducedMotion]);

  // Dismissed together: the store's dailyLoginBanner is the payload of the claim that just
  // happened (coins, and any streak diamonds that were auto-credited at boot), which this
  // modal reads for its result chips instead of the separate "Welcome back!" card Home used
  // to stack on top of everything. Leaving it set would pop that card again on the next
  // screen that looks at it.
  const close = () => { dismissDailyLoginBanner(); onClose(); };

  // The result chips report what the claim ACTUALLY paid, straight from the banner, rather
  // than what today's slot is worth. On a diamonds-only claim those are different numbers,
  // and showing the slot's value would credit the player, in writing, with coins they were
  // paid hours ago. Null banner = no claim has happened in this session of the modal.
  const paidCoins = dailyLoginBanner?.loginCoins ?? 0;
  const paidDiamonds = dailyLoginBanner?.streakDiamonds ?? 0;
  const showResult = !!dailyLoginBanner && (paidCoins > 0 || paidDiamonds > 0);
  const nextDay = ((cycle.todayIndex + 1) % DAILY_REWARD_CYCLE_DAYS) + 1;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Txt variant="h1" style={styles.title}>Daily rewards</Txt>
          <Txt style={styles.sub}>
            Day {cycle.todayIndex + 1} of {DAILY_REWARD_CYCLE_DAYS}
            {state.streak > 1 ? ` · ${state.streak}-day streak` : ''}
          </Txt>

          {/* Four then three. Day 7 takes the extra width its payout deserves — it's the one
              rung that jumps rather than steps, so it shouldn't look like the other six. */}
          <View style={styles.grid}>
            <View style={styles.row}>
              {cycle.days.slice(0, 4).map((d) => (
                <DayTile
                  key={d.day} day={d} flex={1}
                  isToday={d.day === cycle.todayIndex + 1}
                  revealed={cycle.claimedToday || collected}
                  reveal={reveal} reducedMotion={reducedMotion}
                />
              ))}
            </View>
            <View style={styles.row}>
              {cycle.days.slice(4).map((d) => (
                <DayTile
                  key={d.day} day={d} flex={d.day === DAILY_REWARD_CYCLE_DAYS ? 1.6 : 1}
                  isToday={d.day === cycle.todayIndex + 1}
                  revealed={cycle.claimedToday || collected}
                  reveal={reveal} reducedMotion={reducedMotion}
                />
              ))}
            </View>
          </View>

          {showResult ? (
            <View style={styles.resultRow}>
              {paidCoins > 0 ? (
                <View style={styles.chip}>
                  <Coin size={15} />
                  <Txt style={styles.chipTxt}>+{paidCoins}</Txt>
                </View>
              ) : null}
              {paidDiamonds > 0 ? (
                <View style={styles.chip}>
                  <Diamond size={14} />
                  <Txt style={styles.chipTxt}>+{paidDiamonds}</Txt>
                </View>
              ) : null}
            </View>
          ) : (
            <Txt style={styles.hint}>
              {collected
                ? `All collected for today. Come back tomorrow for day ${nextDay}.`
                : cycle.todayIndex + 1 === DAILY_REWARD_CYCLE_DAYS
                  ? 'Last day of the week, and the biggest. Collect it and the cycle starts over at day 1.'
                  : `Come back tomorrow for day ${nextDay}. Day ${DAILY_REWARD_CYCLE_DAYS} pays the most.`}
            </Txt>
          )}

          <Button
            label={collected ? 'Nice!' : 'Claim'}
            onPress={collected ? close : onClaim}
            style={{ width: '100%', marginTop: 16 }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DayTile({
  day, flex, isToday, revealed, reveal, reducedMotion,
}: {
  day: DailyRewardDay;
  flex: number;
  isToday: boolean;
  /** Whether today's tile is face-up. Only meaningful for the today tile; every other tile's
   * look comes from `day.state`, which is settled before the modal opens. */
  revealed: boolean;
  reveal: ReturnType<typeof useSharedValue<number>>;
  reducedMotion: boolean;
}) {
  // Today's tile is the only one that changes while the modal is open, and it has two looks
  // rather than one: face-down (a gift), then collected. Every other state maps straight to
  // a static style.
  const state = isToday && !revealed ? 'today' : isToday ? 'claimed' : day.state;

  // A slow breath on the tile that's waiting to be opened, for the same reason the tour's
  // ring pulses: on a grid of seven near-identical tiles, movement is what says "this one".
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (state !== 'today' || reducedMotion) { cancelAnimation(pulse); pulse.value = 0; return; }
    pulse.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(pulse);
  }, [state, reducedMotion, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.035 }] }));

  // The two halves of the flip. The gift shrinks away as the prize springs in; they cross
  // over rather than cutting, which is what makes it read as uncovering something.
  const coverStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, reveal.value * 2),
    transform: [{ scale: 1 - reveal.value * 0.5 }],
  }));
  const prizeStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ scale: 0.5 + reveal.value * 0.5 }],
  }));

  const isTodayTile = isToday;
  return (
    <Reanimated.View style={[styles.tile, TILE_STYLE[state], { flex }, isTodayTile && pulseStyle]}>
      <Txt style={[styles.tileDay, state === 'missed' && styles.tileDayMissed]}>DAY {day.day}</Txt>

      {isTodayTile ? (
        // Both layers are always mounted and stacked; opacity does the swapping. Swapping the
        // rendered tree instead would resize the tile mid-animation, since a gift glyph and a
        // coin-plus-number are not the same width.
        <View style={styles.tileFace}>
          <Reanimated.View style={[styles.tileLayer, coverStyle]}>
            <Gift size={22} />
          </Reanimated.View>
          <Reanimated.View style={[styles.tileLayer, prizeStyle]}>
            <Coin size={16} />
            <Txt style={styles.tileCoins}>{day.coins}</Txt>
          </Reanimated.View>
        </View>
      ) : (
        <View style={styles.tileFace}>
          <View style={styles.tileLayer}>
            {state === 'missed' ? (
              <Feather name="x" size={15} color={colors.lockText} />
            ) : (
              <Coin size={state === 'claimed' ? 14 : 15} />
            )}
            <Txt style={[styles.tileCoins, state === 'missed' && styles.tileCoinsMissed]}>{day.coins}</Txt>
          </View>
        </View>
      )}

      {state === 'claimed' ? (
        <View style={styles.tick}>
          <Feather name="check" size={10} color={colors.white} />
        </View>
      ) : null}
    </Reanimated.View>
  );
}

const TILE_STYLE = StyleSheet.create({
  claimed: { backgroundColor: colors.tagGreenBg, borderColor: colors.greenSoft },
  missed: { backgroundColor: colors.lockBg, borderColor: colors.lockBorder },
  today: { backgroundColor: colors.rewardBg, borderColor: colors.reward, borderWidth: 2.5 },
  upcoming: { backgroundColor: colors.white, borderColor: colors.border },
});

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(22,32,23,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: colors.white, borderRadius: radius.card, padding: 22,
    width: '100%', maxWidth: 380, alignItems: 'center',
  },
  title: { textAlign: 'center' },
  sub: { fontFamily: font.extra, fontSize: 12, color: colors.muted4, marginTop: 3, marginBottom: 16 },
  grid: { width: '100%', gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  tile: {
    borderRadius: radius.md, borderWidth: 1.5, paddingVertical: 10, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center', minHeight: 70,
  },
  tileDay: { fontFamily: font.extra, fontSize: 9, letterSpacing: 0.4, color: colors.muted4 },
  tileDayMissed: { color: colors.lockText },
  // Fixed height so the crossfading layers below can be absolutely positioned without the
  // tile collapsing around them.
  tileFace: { height: 26, alignSelf: 'stretch', marginTop: 4 },
  tileLayer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  tileCoins: { fontFamily: font.display, fontSize: 15, color: colors.ink },
  tileCoinsMissed: { color: colors.lockText },
  tick: {
    position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.white,
  },
  resultRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 6, paddingHorizontal: 13, borderRadius: radius.round,
    backgroundColor: colors.rewardBg, borderWidth: 1, borderColor: colors.reward,
  },
  chipTxt: { fontFamily: font.display, fontSize: 14, color: colors.ink },
  hint: {
    fontFamily: font.semi, fontSize: 12, lineHeight: 17, color: colors.muted3,
    textAlign: 'center', marginTop: 16, paddingHorizontal: 6,
  },
});
