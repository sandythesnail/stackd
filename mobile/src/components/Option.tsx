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

/** Checkbox square. */
export function CheckBox({ on }: { on?: boolean }) {
  return (
    <View style={[styles.box, on && styles.boxOn]}>
      {on ? <Feather name="check" size={15} color={colors.white} /> : null}
    </View>
  );
}

/** Radio dot. */
export function Radio({ on, color = colors.green }: { on?: boolean; color?: string }) {
  return <View style={[styles.radio, on && { borderWidth: 8, borderColor: color }]} />;
}

export function Option({
  label,
  control = 'check',
  state = 'default',
  right,
  onPress,
  style,
}: {
  label: string;
  control?: 'check' | 'radio';
  state?: State;
  right?: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const s = STATE[state];
  const on = state !== 'default';
  const radioColor = state === 'wrong' ? '#D98A9E' : colors.green;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.opt, { borderColor: s.border, backgroundColor: s.bg }, style]}
    >
      {control === 'check' ? (
        <CheckBox on={on} />
      ) : (
        <Radio on={on} color={radioColor} />
      )}
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
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#D3DECE',
    backgroundColor: colors.white,
  },
});
