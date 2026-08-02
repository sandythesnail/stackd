import { useEffect, useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSpring, cancelAnimation, Easing,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme';
import { T } from './bits';
import { NODE_SIZE, NODE_BOX } from './geometry';

export type NodeState = 'completed' | 'current' | 'available' | 'optional';

const STATE_WORDS: Record<NodeState, string> = {
  completed: 'completed',
  current: 'recommended next',
  available: 'available',
  optional: 'optional extra',
};

/** One diamond on the path.
 *
 * The four states are separated on THREE channels at once — fill, border treatment, and
 * glyph — rather than on brightness alone. That is the whole ballgame for this screen: the
 * usual way to make one node dominant is to mute the others, and a muted node is
 * indistinguishable from a locked one. Nothing here is ever dimmed. `current` wins by having
 * things ADDED to it (a saturated fill, a pulsing halo, a label) while every other node keeps
 * full contrast and stays tappable.
 *
 * `optional` is the one state that reads as "aside" rather than "ahead" — a dashed border and
 * a star glyph, plus its position further off the centre line (see snakePositions' outdent).
 * It is not weaker, it is elsewhere.
 */
export function PathNode({
  title, state, index, accentBg, accentFg, reducedMotion, onPress,
}: {
  title: string;
  state: NodeState;
  /** 1-based label shown on an unvisited main-line node. */
  index: number;
  /** The owning module's pastel background and its darker paired foreground (@/theme). */
  accentBg: string;
  accentFg: string;
  reducedMotion: boolean;
  onPress: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const press = useSharedValue(0);
  const pulse = useSharedValue(0);
  const ripple = useSharedValue(0);

  useEffect(() => {
    if (state !== 'current' || reducedMotion) {
      cancelAnimation(pulse);
      // Parked mid-way rather than at 0, so with motion off the halo is still visibly there —
      // reduced motion should cost the animation, not the affordance.
      pulse.value = 0.5;
      return;
    }
    pulse.value = 0;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, reducedMotion]);

  useEffect(() => {
    if (state !== 'current' || reducedMotion) {
      cancelAnimation(ripple);
      ripple.value = 0;
      return;
    }
    ripple.value = 0;
    ripple.value = withRepeat(
      withTiming(1, { duration: 2100, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
    return () => cancelAnimation(ripple);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, reducedMotion]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: '45deg' },
      // Breathes with the halo so the node itself is alive, not just its glow.
      { scale: (1 + pulse.value * 0.045) * (1 - press.value * 0.06) },
    ],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.13 + pulse.value * 0.2,
    transform: [{ rotate: '45deg' }, { scale: 1.06 + pulse.value * 0.16 }],
  }));
  // A ring thrown off the node and out into the page — the one effect here that leaves the
  // node's own footprint, so the recommendation reads at the edge of vision rather than
  // only when you're looking straight at it.
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: (1 - ripple.value) * 0.5,
    transform: [{ rotate: '45deg' }, { scale: 1 + ripple.value * 1.15 }],
  }));

  const isCurrent = state === 'current';
  const isDone = state === 'completed';
  const isOptional = state === 'optional';

  const fill = isCurrent ? colors.green : isDone ? colors.greenPale : colors.white;
  const border = isCurrent ? colors.greenDark : isDone ? colors.greenSoft : isOptional ? colors.muted5 : accentFg;
  const glyphColor = isCurrent ? colors.white : isDone ? colors.greenDark : isOptional ? colors.muted2 : accentFg;

  return (
    <View style={styles.slot}>
      {isCurrent ? (
        <>
          <Reanimated.View pointerEvents="none" style={[styles.ripple, rippleStyle]} />
          <Reanimated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
        </>
      ) : null}

      <Pressable
        onPress={onPress}
        onPressIn={() => { press.value = withTiming(1, { duration: 80 }); }}
        onPressOut={() => { press.value = withSpring(0, { damping: 18, stiffness: 400 }); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        focusable
        accessibilityRole="button"
        // Announces title AND state, so the path is navigable without seeing it.
        accessibilityLabel={`${title}. ${STATE_WORDS[state]}.`}
        accessibilityHint="Opens this lesson"
        accessibilityState={{ selected: isCurrent }}
        style={styles.hit}
      >
        {/* A real, visible focus ring. react-native-web gives a Pressable no default outline
            worth keeping, so this is drawn rather than inherited — same diamond, offset out. */}
        {focused ? <View pointerEvents="none" style={styles.focusRing} /> : null}

        <Reanimated.View
          style={[
            styles.body,
            {
              backgroundColor: fill,
              borderColor: border,
              borderStyle: isOptional ? 'dashed' : 'solid',
              borderWidth: isCurrent ? 3 : 2.25,
            },
            bodyStyle,
          ]}
        >
          {/* Counter-rotated, so the diamond is a diamond but its contents stay upright. */}
          <View style={styles.glyph}>
            {isDone ? (
              <Feather name="check" size={24} color={glyphColor} />
            ) : isOptional ? (
              <Feather name="star" size={19} color={glyphColor} />
            ) : isCurrent ? (
              <Feather name="play" size={20} color={glyphColor} />
            ) : (
              <T weight="display" size={17} color={glyphColor}>{index}</T>
            )}
          </View>
        </Reanimated.View>
      </Pressable>

      {isCurrent ? (
        <View pointerEvents="none" style={styles.nextTag}>
          <T weight="extra" size={9.5} color={colors.white} style={{ letterSpacing: 0.7 }}>START HERE</T>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { width: NODE_BOX, height: NODE_BOX, alignItems: 'center', justifyContent: 'center' },
  // The Pressable is the full bounding box of the rotated diamond (~82px), not the diamond
  // itself — the whole square is tappable, which keeps the target well clear of 44px even at
  // the diamond's pinched corners.
  hit: { width: NODE_BOX, height: NODE_BOX, alignItems: 'center', justifyContent: 'center' },
  body: {
    width: NODE_SIZE, height: NODE_SIZE, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  glyph: { transform: [{ rotate: '-45deg' }], alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute', width: NODE_SIZE, height: NODE_SIZE,
    borderRadius: 18, backgroundColor: colors.green,
  },
  ripple: {
    position: 'absolute', width: NODE_SIZE, height: NODE_SIZE,
    borderRadius: 18, borderWidth: 2.5, borderColor: colors.green,
  },
  focusRing: {
    position: 'absolute', width: NODE_SIZE + 14, height: NODE_SIZE + 14, borderRadius: 19,
    borderWidth: 3, borderColor: colors.ink, transform: [{ rotate: '45deg' }],
  },
  nextTag: {
    position: 'absolute', bottom: -6, backgroundColor: colors.greenDark,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
});
