import { ReactNode } from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
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
  return (
    <Pressable
      onPress={onPress}
      style={[styles.opt, { borderColor: s.border, backgroundColor: s.bg }, style]}
    >
      {control === 'letter' && letter ? <LetterBadge letter={letter} state={state} /> : null}
      {control === 'check' ? <CheckBox on={state !== 'default'} /> : null}
      <Txt style={styles.label}>{label}</Txt>
      {right ? <View style={{ marginLeft: 'auto' }}>{right}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 2,
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  label: { fontFamily: font.bold, fontSize: 15.5, color: colors.ink, flexShrink: 1 },
  letter: {
    minWidth: 24,
    height: 24,
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
