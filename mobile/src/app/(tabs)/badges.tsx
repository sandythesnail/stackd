import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Screen, Header, Txt, BadgeMedal } from '@/components';
import { colors, font } from '@/theme';
import { useStore } from '@/store';

const FILTERS = ['All', 'Bronze', 'Silver', 'Gold', 'Diamond'] as const;

/** Screen 11 — Badges (filter by tier & status). Real 23-achievement list ported from the
 * website's ACHIEVEMENTS, with earned status computed from real app state where available. */
export default function Badges() {
  const { level, tierName, state, achievements } = useStore();
  const [filter, setFilter] = useState(0);
  const active = FILTERS[filter];
  const all = achievements();
  const shown = active === 'All' ? all : all.filter((b) => b.tier === active.toLowerCase());
  const earnedCount = all.filter((b) => b.earned).length;

  return (
    <Screen edges={['top']}>
      <Header level={level} name={tierName} coins={state.coins} diamonds={state.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Txt variant="disp" style={{ fontSize: 23 }}>Badges</Txt>
          <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.green }}>{earnedCount} / {all.length} earned</Txt>
        </View>

        <View style={styles.filters}>
          {FILTERS.map((f, i) => {
            const on = i === filter;
            return (
              <Pressable key={f} onPress={() => setFilter(i)} style={[styles.fchip, on && styles.fchipOn]}>
                <Txt style={[styles.fchipTxt, on && { color: colors.white }]}>{f}</Txt>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.grid}>
          {shown.map((b) => (
            <View key={b.id} style={styles.cell}>
              <BadgeMedal icon={b.icon} color={b.color} tier={b.tier} size={64} locked={!b.earned} />
              <Txt style={[styles.lbl, !b.earned && { color: '#A8A296' }]}>{b.label}</Txt>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 28, gap: 14 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filters: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  fchip: {
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.borderOpt,
  },
  fchipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  fchipTxt: { fontFamily: font.extra, fontSize: 12.5, color: colors.muted3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 18 },
  cell: { width: '31%', alignItems: 'center', gap: 7 },
  lbl: { fontFamily: font.extra, fontSize: 10.5, color: colors.muted1, textAlign: 'center' },
});
