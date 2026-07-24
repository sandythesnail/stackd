import { ReactNode } from 'react';
import { View, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { SvgXml } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors, font, radius } from '@/theme';
import { mixHex, hexToRgba } from '@/colorMix';
import { Txt } from './Txt';

const ROW_PRESS_SPRING = { damping: 16, stiffness: 380 };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Rounded module icon badge — a pale background with its paired darker foreground number
 * ("01".."11"), matching the website's `.mod-icon` chip exactly (never white-on-color). */
export function MIcon({
  abbr,
  color,
  textColor = colors.white,
  size = 42,
  r = 13,
  fontSize = 16,
}: {
  abbr: string;
  color: string;
  textColor?: string;
  size?: number;
  r?: number;
  fontSize?: number;
}) {
  return (
    <View style={[styles.micon, { width: size, height: size, borderRadius: r, backgroundColor: color }]}>
      <Txt style={{ fontFamily: font.display, fontSize, color: textColor }}>{abbr}</Txt>
    </View>
  );
}

/** Grid tile for a module. `recommended` draws the yellow "part of your track" outline
 * ported from the website's `.module-row.recommended` (see renderModuleList in app.js). */
export function ModuleTile({
  children,
  locked,
  recommended,
  onPress,
  style,
}: {
  children: ReactNode;
  locked?: boolean;
  recommended?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.mtile, recommended && styles.mtileRecommended, locked && styles.mtileLock, style]}
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
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.98, ROW_PRESS_SPRING); }}
      onPressOut={() => { scale.value = withSpring(1, ROW_PRESS_SPRING); }}
      style={[styles.lrow, locked && styles.lrowLock, style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

/** A single achievement icon — the exact Feather-style SVG geometry ported from the
 * website's ACHIEVEMENTS (see @/achievements), rendered via react-native-svg's SvgXml so the
 * path/circle/line markup is used as-is rather than hand-converted per icon. */
export function BadgeIcon({ icon, color, size = 24 }: { icon: string; color: string; size?: number }) {
  const xml = `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}

/** Circular badge medal — ported from the website's .ach-icon: a pale tint of the badge's
 * own color as the circle fill (not a per-tier gradient), a darkened tone of that same color
 * for the icon stroke, and the raw color as the border; locked badges go flat gray. Diamond
 * tier gets a soft glow ring when unlocked (the website's animated shine sweep is skipped —
 * a static glow reads as "rare" without pulling in an animation dependency). */
export function BadgeMedal({
  icon,
  color,
  tier,
  size = 64,
  locked,
}: {
  icon: string;
  color: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  size?: number;
  locked?: boolean;
}) {
  const bg = locked ? '#F2F2F2' : mixHex(color, '#FFFFFF', 20);
  const iconColor = locked ? '#C2C2C2' : mixHex(color, '#000000', 75);
  const border = locked ? mixHex(color, '#E8E8E8', 40) : color;
  const glow = tier === 'diamond' && !locked;
  return (
    <View
      style={[
        glow && { padding: 3, borderRadius: (size + 6) / 2, backgroundColor: hexToRgba(color, 0.18) },
      ]}
    >
      <View
        style={[
          styles.medal,
          {
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: bg, borderWidth: locked ? 1.5 : 1.5, borderColor: border,
          },
        ]}
      >
        <BadgeIcon icon={icon} color={iconColor} size={size * 0.42} />
      </View>
    </View>
  );
}

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
  mtileRecommended: {
    borderWidth: 2,
    borderColor: colors.reward,
    backgroundColor: colors.rewardBg,
    shadowColor: colors.reward,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
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
