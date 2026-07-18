import { ReactNode } from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, font, radius } from '@/theme';
import { Txt } from './Txt';

/** Small stat cell (XP / streak / coins). */
export function Stat({ value, label, style }: { value: ReactNode; label: string; style?: ViewStyle }) {
  return (
    <View style={[styles.stat, style]}>
      <View style={styles.statVal}>
        {typeof value === 'string' || typeof value === 'number' ? (
          <Txt style={styles.statb}>{value}</Txt>
        ) : (
          value
        )}
      </View>
      <Txt style={styles.statEm}>{label}</Txt>
    </View>
  );
}

/** Section header with optional "see all" action. */
export function SectionHead({
  title,
  action,
  onAction,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.sechead, style]}>
      <Txt variant="h2">{title}</Txt>
      {action ? (
        <Pressable onPress={onAction}>
          <Txt style={styles.seeall}>{action}</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Speech bubble with a left-pointing tail. */
export function Speech({ children, style, numberOfLines }: { children: ReactNode; style?: ViewStyle; numberOfLines?: number }) {
  return (
    <View style={[styles.speech, style]}>
      <View style={styles.tail} />
      <Txt style={styles.speechTxt} numberOfLines={numberOfLines}>{children}</Txt>
    </View>
  );
}

/** Pink info callout. */
export function Callout({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.callout, style]}>
      <Txt style={styles.calloutTxt}>{children}</Txt>
    </View>
  );
}

/** Segmented control. */
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: number;
  onChange?: (i: number) => void;
}) {
  return (
    <View style={styles.seg}>
      {options.map((o, i) => {
        const on = i === value;
        return (
          <Pressable key={o} style={[styles.segItem, on && styles.segOn]} onPress={() => onChange?.(i)}>
            <Txt style={[styles.segTxt, on && { color: colors.ink }]}>{o}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Pagination dots. */
export function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.dot, i === active && styles.dotOn]} />
      ))}
    </View>
  );
}

/** Labelled divider (design's `.sep`). */
export function Divider({ children }: { children?: ReactNode }) {
  return (
    <View style={styles.sep}>
      <View style={styles.sepLine} />
      {children ? <Txt style={styles.sepTxt}>{children}</Txt> : null}
      <View style={styles.sepLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 2,
  },
  statVal: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statb: { fontFamily: font.display, fontSize: 19, color: colors.ink },
  statEm: { fontFamily: font.extra, fontSize: 9.5, color: colors.muted5, textTransform: 'uppercase', letterSpacing: 0.4 },
  sechead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeall: { fontFamily: font.extra, fontSize: 13, color: colors.green },
  speech: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  speechTxt: { fontFamily: font.bold, fontSize: 13.5, color: colors.inkSoft, lineHeight: 18 },
  tail: {
    position: 'absolute',
    left: -7,
    top: 22,
    width: 13,
    height: 13,
    backgroundColor: colors.white,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
  callout: {
    backgroundColor: colors.calloutBg,
    borderWidth: 1.5,
    borderColor: colors.calloutBorder,
    borderRadius: radius.md,
    padding: 14,
  },
  calloutTxt: { fontFamily: font.bold, fontSize: 13.5, color: colors.calloutText, lineHeight: 19 },
  seg: {
    flexDirection: 'row',
    backgroundColor: '#EDF0E9',
    borderRadius: 15,
    padding: 4,
    gap: 4,
  },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 },
  segOn: { backgroundColor: colors.white },
  segTxt: { fontFamily: font.extra, fontSize: 13.5, color: colors.muted4 },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#D6DFCF' },
  dotOn: { width: 26, backgroundColor: colors.green },
  sep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sepLine: { flex: 1, height: 1.5, backgroundColor: colors.borderField },
  sepTxt: { fontFamily: font.extra, fontSize: 12, color: colors.muted6 },
});
