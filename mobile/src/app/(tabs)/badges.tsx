import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Screen, Header, Txt, BadgeMedal, AchievementDetailModal } from '@/components';
import { colors, font } from '@/theme';
import { useStore, type AchievementView } from '@/store';

const FILTERS = ['All', 'Bronze', 'Silver', 'Gold', 'Diamond'] as const;

/** Screen 11 — Badges (filter by tier & status). Real 23-achievement list ported from the
 * website's ACHIEVEMENTS, with earned status computed from real app state where available.
 * Every badge is shown and tappable — locked ones open the same detail modal as earned ones,
 * previewing how to unlock them (ported from the website's showAchievementDetail). */
export default function Badges() {
  const { level, tierName, state, achievements } = useStore();
  const [filter, setFilter] = useState(0);
  const [selected, setSelected] = useState<AchievementView | null>(null);
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
            <Pressable key={b.id} style={styles.cell} onPress={() => setSelected(b)}>
              <BadgeMedal icon={b.icon} color={b.color} tier={b.tier} size={64} locked={!b.earned} />
              {/* Two lines' worth of height always, whether the label needs them or not — the
                  long ones ("Future Millionaire", "No Hints Needed") wrap and the short ones
                  don't, and a row is as tall as its tallest cell, so letting each label size
                  itself left uneven vertical gaps between rows. */}
              <Txt numberOfLines={2} style={[styles.lbl, !b.earned && { color: '#A8A296' }]}>{b.label}</Txt>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <AchievementDetailModal achievement={selected} onClose={() => setSelected(null)} />
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
  // A plain three-column grid: every cell is exactly a third wide and rows pack from the left.
  // This used to be `justify-content: space-between` over 31%-wide cells, which is only even
  // while a row is full — the last row of a filtered tier is usually short (Bronze has 11
  // badges, so it ends on a row of 2) and its badges were pushed out to the far edges with a
  // badge-sized hole between them.
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 },
  cell: { width: '33.333%', paddingHorizontal: 4, alignItems: 'center', gap: 7 },
  lbl: { fontFamily: font.extra, fontSize: 10.5, lineHeight: 13, height: 26, color: colors.muted1, textAlign: 'center' },
});
