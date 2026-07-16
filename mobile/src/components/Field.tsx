import { ReactNode } from 'react';
import { View, TextInput, StyleSheet, ViewStyle, KeyboardTypeOptions } from 'react-native';
import { colors } from '@/theme';
import { Txt } from './Txt';

/**
 * Styled field. Read-only by default (renders `value`/`placeholder` as text). Pass
 * `onChangeText` to turn it into a real editable TextInput — used by the auth forms.
 */
export function Field({
  label,
  value,
  placeholder,
  focus,
  right,
  style,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  editable = true,
}: {
  label?: string;
  value?: string;
  placeholder?: string;
  focus?: boolean;
  right?: ReactNode;
  style?: ViewStyle;
  onChangeText?: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'password' | 'name' | 'off';
  editable?: boolean;
}) {
  const interactive = typeof onChangeText === 'function';
  return (
    <View style={style}>
      {label ? <Txt variant="label" style={styles.lbl}>{label}</Txt> : null}
      <View style={[styles.field, focus && styles.focus]}>
        {interactive ? (
          <TextInput
            style={styles.input}
            value={value}
            placeholder={placeholder}
            placeholderTextColor={colors.muted6}
            onChangeText={onChangeText}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoComplete={autoComplete}
            editable={editable}
          />
        ) : (
          <Txt style={[styles.val, !value && { color: colors.muted6 }]} numberOfLines={1}>
            {value ?? placeholder}
          </Txt>
        )}
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
  input: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.ink, flex: 1, padding: 0 },
});
