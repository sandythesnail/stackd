import { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';
import { colors, radius } from '@/theme';

export function Card({
  children,
  style,
}: {
  children?: ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderWidth: 1.5,
          borderColor: colors.border,
          borderRadius: radius.card,
          padding: 18,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
