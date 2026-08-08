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
  label,
}: {
  name: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  size?: number;
  color?: string;
  iconSize?: number;
  style?: ViewStyle;
  bare?: boolean; // no white bg/border (for dark overlays where caller styles it)
  /** Spoken name for the control. Defaults from the icon, which covers the two this is
   * actually used for (x = Close, chevron-left = Back); pass one for anything else. */
  label?: string;
}) {
  // An icon-only control announces nothing on its own — the glyph is a font character, not
  // text — so this was previously an unlabelled, role-less tap target. That includes the X
  // that leaves a lesson and the chevron that backs out of a module, i.e. the two ways out of
  // the app's deepest screens.
  const fallback = name === 'x' ? 'Close' : name === 'chevron-left' ? 'Back' : name;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label ?? fallback}
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
