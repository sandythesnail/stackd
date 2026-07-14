import { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/theme';
import { Txt } from './Txt';

/** Read-only styled field used across the auth + tools mockups. */
export function Field({
  label,
  value,
  placeholder,
  focus,
  right,
  style,
}: {
  label?: string;
  value?: string;
  placeholder?: string;
  focus?: boolean;
  right?: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={style}>
      {label ? <Txt variant="label" style={styles.lbl}>{label}</Txt> : null}
      <View style={[styles.field, focus && styles.focus]}>
        <Txt
          style={[styles.val, !value && { color: colors.muted6 }]}
          numberOfLines={1}
        >
          {value ?? placeholder}
        </Txt>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lbl: { marginBottom: 7 },
  field: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.borderField,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  focus: {
    borderColor: colors.green,
  },
  val: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.ink, flexShrink: 1 },
});
