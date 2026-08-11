import { useState } from 'react';
import { Modal, View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, font, radius } from '@/theme';
import { Txt } from './Txt';

export type SelectOption<T> = {
  value: T;
  label: string;
  /** Optional second line — the concrete number behind a named choice ("about 8.5% a year"),
   * so picking one doesn't require already knowing what it means. */
  sub?: string;
};

/** A closed pick-list: one line showing the current choice, tapped to open a sheet of the
 * options.
 *
 * Replaces the rows of wrap-around chips the Tools calculators used for rate/term/growth.
 * Chips show every option at once, which is fine for two or three and becomes a wall at five
 * or more — and on a phone they wrapped to two or three lines each, so a calculator with two
 * of them opened as a screen of tags with the actual inputs pushed below the fold. A closed
 * field is one line whatever the option count, and it reads as "there is a decision to make
 * here" rather than as decoration.
 */
export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
}: {
  label?: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <View style={{ gap: 6 }}>
      {label ? <Txt style={styles.label}>{label}</Txt> : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${selected?.label ?? placeholder}` : undefined}
        style={styles.field}
      >
        <View style={{ flex: 1 }}>
          <Txt style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
            {selected?.label ?? placeholder}
          </Txt>
          {selected?.sub ? <Txt style={styles.fieldSub}>{selected.sub}</Txt> : null}
        </View>
        <Feather name="chevron-down" size={18} color={colors.muted4} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          {/* Swallows taps so pressing inside the sheet doesn't close it through the scrim. */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            {label ? <Txt style={styles.sheetTitle}>{label}</Txt> : null}
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {options.map((o) => {
                const on = o.value === value;
                return (
                  <Pressable
                    key={String(o.value)}
                    onPress={() => { onChange(o.value); setOpen(false); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.option, on && styles.optionOn]}
                  >
                    <View style={{ flex: 1 }}>
                      <Txt style={[styles.optionLabel, on && styles.optionLabelOn]}>{o.label}</Txt>
                      {o.sub ? <Txt style={styles.optionSub}>{o.sub}</Txt> : null}
                    </View>
                    {on ? <Feather name="check" size={17} color={colors.green} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: font.semi, fontSize: 12.5, color: colors.muted1 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.screen, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.borderOpt,
    paddingVertical: 11, paddingHorizontal: 13,
  },
  value: { fontFamily: font.extra, fontSize: 14, color: colors.ink },
  placeholder: { fontFamily: font.semi, color: colors.muted5 },
  fieldSub: { fontFamily: font.semi, fontSize: 11.5, color: colors.muted4, marginTop: 1 },

  overlay: { flex: 1, backgroundColor: 'rgba(22,32,23,0.5)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  sheet: {
    width: '100%', maxWidth: 380, backgroundColor: colors.white,
    borderRadius: radius.card, padding: 16, gap: 4,
  },
  sheetTitle: { fontFamily: font.displayMed, fontSize: 15, color: colors.ink, marginBottom: 6 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12,
  },
  optionOn: { backgroundColor: colors.tagGreenBg },
  optionLabel: { fontFamily: font.bold, fontSize: 14, color: colors.ink },
  optionLabelOn: { fontFamily: font.extra, color: colors.greenDark },
  optionSub: { fontFamily: font.semi, fontSize: 11.5, color: colors.muted4, marginTop: 1 },
});
