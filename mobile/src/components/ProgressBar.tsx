import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';

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
  return (
    <View
      style={[
        { height, borderRadius: 8, backgroundColor: track, overflow: 'hidden' },
        style,
      ]}
    >
      <LinearGradient
        colors={grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: '100%', width: `${Math.max(0, Math.min(1, value)) * 100}%`, borderRadius: 8 }}
      />
    </View>
  );
}
