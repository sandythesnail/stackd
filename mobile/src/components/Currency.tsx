import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';

/** Gold coin token. */
export function Coin({ size = 19 }: { size?: number }) {
  return (
    <LinearGradient
      colors={[colors.coinLight, colors.coin]}
      start={{ x: 0.3, y: 0.2 }}
      end={{ x: 0.8, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: colors.coinBorder,
      }}
    />
  );
}

/** Blue diamond token. */
export function Diamond({ size = 16 }: { size?: number }) {
  return (
    <LinearGradient
      colors={[colors.diamondLight, colors.diamond]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: colors.diamondBorder,
        transform: [{ rotate: '45deg' }],
      }}
    />
  );
}

/** Orange streak flame token. */
export function Flame({ size = 17 }: { size?: number }) {
  const h = size * 1.12;
  return (
    <View style={{ transform: [{ rotate: '-6deg' }] }}>
      <LinearGradient
        colors={[colors.flameLight, colors.flame]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={{
          width: size,
          height: h,
          borderTopLeftRadius: size * 0.5,
          borderTopRightRadius: size * 0.5,
          borderBottomLeftRadius: size * 0.5,
          borderBottomRightRadius: size * 0.5,
        }}
      />
    </View>
  );
}
