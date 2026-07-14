import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme';

/** Round white icon button (used for back / close chrome). */
export function IconButton({
  name,
  onPress,
  size = 40,
  color = colors.ink,
  iconSize,
  style,
  bare,
}: {
  name: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  size?: number;
  color?: string;
  iconSize?: number;
  style?: ViewStyle;
  bare?: boolean; // no white bg/border (for dark overlays where caller styles it)
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[
        styles.btn,
        { width: size, height: size, borderRadius: size / 2 },
        bare ? { backgroundColor: 'transparent', borderWidth: 0 } : null,
        style,
      ]}
    >
      <Feather name={name} size={iconSize ?? Math.round(size * 0.5)} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.borderCool,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
