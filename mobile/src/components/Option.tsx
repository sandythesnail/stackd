import { ReactNode, useEffect } from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming,
} from 'react-native-reanimated';
import { colors, font } from '@/theme';
import { Txt } from './Txt';

type State = 'default' | 'on' | 'correct' | 'wrong';

const STATE: Record<State, { border: string; bg: string }> = {
  default: { border: colors.borderOpt, bg: colors.white },
  on: { border: colors.green, bg: '#F1F6EF' },
  correct: { border: colors.green, bg: colors.tagGreenBg },
  wrong: { border: '#D98A9E', bg: colors.pinkBg2 },
};

/** Checkbox square — used for real yes/no toggles (e.g. the signup T&C agreement), not
 * quiz options (see LetterBadge for those). */
export function CheckBox({ on }: { on?: boolean }) {
  return (
    <View style={[styles.box, on && styles.boxOn]}>
      {on ? <Feather name="check" size={15} color={colors.white} /> : null}
    </View>
  );
}

/** Letter badge (A/B/C/D) — ported from the website's .opt-letter, used only for real
 * graded multiple-choice questions (buildQuestionBlock). Recolors solid on correct/wrong
 * instead of a separate checkmark/x icon. */
export function LetterBadge({ letter, state = 'default' }: { letter: string; state?: State }) {
  const s = STATE[state];
  const filled = state === 'correct' || state === 'wrong';
  return (
    <View style={[styles.letter, { borderColor: s.border }, filled && { backgroundColor: state === 'correct' ? colors.green : '#D98A9E', borderColor: state === 'correct' ? colors.green : '#D98A9E' }]}>
      <Txt style={[styles.letterTxt, filled && { color: colors.white }]}>{letter}</Txt>
    </View>
  );
}

/** A selectable row. `control="plain"` (default) is a flat bordered button with no
 * leading checkbox/radio at all — matches the website's .option-btn for narrative choices
 * (decisions, boss battle, simulator) that aren't real graded multiple-choice questions.
 * `control="letter"` shows an A/B/C/D badge (see LetterBadge) for real quiz questions.
 * `control="check"` keeps the checkbox square, for genuine multi-select pickers (the
 * onboarding survey's goal list). */
export function Option({
  label,
  control = 'plain',
  letter,
  state = 'default',
  right,
  onPress,
  style,
}: {
  label: string;
  control?: 'plain' | 'letter' | 'check';
  letter?: string;
  state?: State;
  right?: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const s = STATE[state];
  // Two separate channels so they can't fight each other: `press` is the finger-down squeeze,
  // `verdict` is the one-shot reaction when this row turns out to be right or wrong. Both are
  // transform-only, so they run on the UI thread and never disturb the rows around them.
  const press = useSharedValue(0);
  const verdict = useSharedValue(0);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (state === 'correct') {
      // A confident pop — this is the row the eye should land on.
      verdict.value = withSequence(
        withSpring(1, { damping: 9, stiffness: 320 }),
        withSpring(0, { damping: 14, stiffness: 260 }),
      );
    } else if (state === 'wrong') {
      // Deliberately smaller than the correct row's pop and sideways rather than bigger:
      // the wrong answer should register without becoming the loudest thing on screen.
      shake.value = withSequence(
        withTiming(-4, { duration: 55 }),
        withTiming(4, { duration: 55 }),
        withTiming(-2.5, { duration: 50 }),
        withTiming(0, { duration: 45 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 - press.value * 0.025 + verdict.value * 0.04 },
      { translateX: shake.value },
    ],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { press.value = withTiming(1, { duration: 70 }); }}
      onPressOut={() => { press.value = withSpring(0, { damping: 18, stiffness: 400 }); }}
      style={[styles.opt, { borderColor: s.border, backgroundColor: s.bg }, style, animStyle]}
    >
      {control === 'letter' && letter ? <LetterBadge letter={letter} state={state} /> : null}
      {control === 'check' ? <CheckBox on={state !== 'default'} /> : null}
      <Txt style={styles.label}>{label}</Txt>
      {right ? <View style={{ marginLeft: 'auto' }}>{right}</View> : null}
    </AnimatedPressable>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
  // Sized so four options, their question and an explanation card fit one screen together in
  // the quest player, which is the densest thing this component is asked to do (Quick Check —
  // see TALL_CHAPTER_TYPES in learn/quest.tsx). paddingVertical was 15 and the row 2px-bordered;
  // at 12/1.75 a four-option question gives back ~28px, which is most of what that screen was
  // over by, without the row dropping below a comfortable 46px tap target.
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1.75,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  label: { fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: colors.ink, flexShrink: 1 },
  letter: {
    minWidth: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    backgroundColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  letterTxt: { fontFamily: font.extra, fontSize: 11, color: colors.ink },
  box: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D3DECE',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.green, borderColor: colors.green },
});
