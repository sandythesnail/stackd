import { ReactNode } from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, radius } from '@/theme';
import { Txt } from './Txt';

/** Rounded colored module icon with a short abbreviation. */
export function MIcon({
  abbr,
  color,
  size = 42,
  r = 13,
  fontSize = 16,
}: {
  abbr: string;
  color: string;
  size?: number;
  r?: number;
  fontSize?: number;
}) {
  return (
    <View style={[styles.micon, { width: size, height: size, borderRadius: r, backgroundColor: color }]}>
      <Txt style={{ fontFamily: font.display, fontSize, color: colors.white }}>{abbr}</Txt>
    </View>
  );
}

/** Grid tile for a module. */
export function ModuleTile({
  children,
  locked,
  onPress,
  style,
}: {
  children: ReactNode;
  locked?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.mtile, locked && styles.mtileLock, style]}
    >
      {children}
    </Pressable>
  );
}

/** Horizontal list row (quests, module progress rows, settings-lite). */
export function ListRow({
  children,
  locked,
  onPress,
  style,
}: {
  children: ReactNode;
  locked?: boolean;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
}) {
  return (
    <Pressable onPress={onPress} style={[styles.lrow, locked && styles.lrowLock, style]}>
      {children}
    </Pressable>
  );
}

/** Circular badge medal. */
export function BadgeMedal({
  char,
  grad,
  size = 64,
  fontSize = 22,
  locked,
}: {
  char: string;
  grad: [string, string];
  size?: number;
  fontSize?: number;
  locked?: boolean;
}) {
  return (
    <LinearGradient
      colors={grad}
      start={{ x: 0.2, y: 0.1 }}
      end={{ x: 0.8, y: 1 }}
      style={[
        styles.medal,
        { width: size, height: size, borderRadius: size / 2 },
        locked && { opacity: 0.4 },
      ]}
    >
      <Txt style={{ fontSize, color: colors.white }}>{char}</Txt>
    </LinearGradient>
  );
}

export const MEDAL_GRAD: Record<string, [string, string]> = {
  gold: ['#EFC85A', '#E0961B'],
  bronze: ['#D89B6A', '#B87333'],
  silver: ['#BFC6CC', '#8B949C'],
  diamond: ['#7ED0EC', '#46A8D6'],
  orange: ['#F0994C', '#D97534'],
};

const styles = StyleSheet.create({
  micon: { alignItems: 'center', justifyContent: 'center' },
  mtile: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 14,
    gap: 10,
  },
  mtileLock: { backgroundColor: colors.lockBg, borderColor: colors.lockBorder },
  lrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  lrowLock: { backgroundColor: colors.lockBg, borderColor: colors.lockBorder },
  medal: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2C3E2D',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
});
