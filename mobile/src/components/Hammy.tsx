import { useEffect, useRef } from 'react';
import { Animated, Easing, ViewStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Hammy the pig — placeholder mascot that drops into the design's image slots.
 * Swap for final art later; keeps the pink "hslot" look and a gentle bob.
 */
export function Hammy({
  size = 120,
  ring = false,
  bob = true,
  pig = '#E27EA0',
  style,
}: {
  size?: number;
  ring?: boolean;
  bob?: boolean;
  pig?: string;
  style?: ViewStyle;
}) {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!bob) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -8, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob, y]);

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          transform: [{ translateY: y }],
        },
        ring
          ? {
              shadowColor: '#FF96B8',
              shadowOpacity: 0.4,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 0 },
              elevation: 6,
            }
          : null,
        style,
      ]}
    >
      <LinearGradient
        colors={['#FFE7EF', '#FBD3E0']}
        start={{ x: 0.5, y: 0.2 }}
        end={{ x: 0.5, y: 1 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <MaterialCommunityIcons name="pig-variant" size={size * 0.56} color={pig} />
      </LinearGradient>
    </Animated.View>
  );
}

/** Rounded-rect image slot placeholder (posters, illustrations). */
export function Slot({
  width,
  height,
  radius = 20,
  label,
  colors = ['#FFF3F7', '#FBE0EA'],
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  label?: string;
  colors?: [string, string];
  style?: ViewStyle;
}) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0.5, y: 0.2 }}
      end={{ x: 0.5, y: 1 }}
      style={[
        { width: width ?? '100%', height, borderRadius: radius, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
        style,
      ]}
    >
      {label ? (
        <View style={{ opacity: 0.6 }}>
          <MaterialCommunityIcons name="pig-variant" size={Math.min(64, height * 0.4)} color="#E27EA0" />
        </View>
      ) : null}
    </LinearGradient>
  );
}
