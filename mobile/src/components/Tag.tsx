import { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, font } from '@/theme';
import { Txt } from './Txt';

type Tone = 'green' | 'pink' | 'lock' | 'warm';

const TONES: Record<Tone, { bg: string; text: string }> = {
  green: { bg: colors.tagGreenBg, text: colors.tagGreenText },
  pink: { bg: colors.tagPinkBg, text: colors.tagPinkText },
  lock: { bg: colors.tagLockBg, text: colors.tagLockText },
  warm: { bg: colors.tagWarmBg, text: colors.tagWarmText },
};

export function Tag({
  children,
  tone = 'green',
  textColor,
  style,
}: {
  children: ReactNode;
  tone?: Tone;
  textColor?: string;
  style?: ViewStyle;
}) {
  const t = TONES[tone];
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }, style]}>
      <Txt style={{ fontFamily: font.extra, fontSize: 12, color: textColor ?? t.text }}>{children}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
});
