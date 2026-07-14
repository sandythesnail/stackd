import { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors } from '@/theme';

/** Full-bleed screen surface with safe-area padding. */
export function Screen({
  children,
  bg = colors.screen,
  edges = ['top', 'bottom'],
  style,
}: {
  children?: ReactNode;
  bg?: string;
  edges?: Edge[];
  style?: ViewStyle;
}) {
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: bg }, style]}>
      {children}
    </SafeAreaView>
  );
}

/** Spacer that grows to fill available space (design's `.f1`). */
export function Spacer() {
  return <View style={{ flex: 1 }} />;
}
