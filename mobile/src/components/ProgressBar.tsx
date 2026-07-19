import { useEffect, useRef } from 'react';
import { View, ViewStyle, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';

/** Gradient-filled bar that smoothly slides to its new width whenever `value` changes,
 * instead of snapping instantly — matters most for chapters with a live "meter" that moves
 * as the player makes choices (see quest.tsx's SimulatorView), but applies everywhere this
 * is used. */
export function ProgressBar({
  value, // 0..1
  tone = 'green',
  height = 12,
  track = colors.track,
  style,
  fillColors,
}: {
  value: number;
  tone?: 'green' | 'pink';
  height?: number;
  track?: string;
  style?: ViewStyle;
  fillColors?: [string, string];
}) {
  const grad: [string, string] =
    fillColors ?? (tone === 'pink' ? [colors.pinkSoft, colors.pink] : [colors.greenBright, colors.green]);
  const clamped = Math.max(0, Math.min(1, value));
  const anim = useRef(new Animated.Value(clamped)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: clamped, duration: 450, useNativeDriver: false }).start();
  }, [clamped, anim]);
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View
      style={[
        { height, borderRadius: 8, backgroundColor: track, overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View style={{ height: '100%', width, borderRadius: 8 }}>
        <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 8 }} />
      </Animated.View>
    </View>
  );
}
