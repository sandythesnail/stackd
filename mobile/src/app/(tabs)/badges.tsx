import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Screen, Header, Txt, BadgeMedal, MEDAL_GRAD } from '@/components';
import { colors, font } from '@/theme';
import { badges, user } from '@/data';
import { useStore } from '@/store';

const FILTERS = ['All', 'Bronze', 'Silver', 'Gold', 'Diamond'] as const;

/** Screen 11 — Badges (filter by tier & status). */
export default function Badges() {
  const { state } = useStore();
  const [filter, setFilter] = useState(0);
  const active = FILTERS[filter];
  const shown = active === 'All' ? badges : badges.filter((b) => b.tier === active.toLowerCase());

  return (
    <Screen edges={['top']}>
      <Header level={state.level} name={user.tier} coins={state.coins} diamonds={state.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Txt variant="disp" style={{ fontSize: 23 }}>Badges</Txt>
          <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.green }}>9 / 32 earned</Txt>
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
            <View key={b.name} style={styles.cell}>
              <BadgeMedal char={b.char} grad={MEDAL_GRAD[b.tier]} size={64} fontSize={20} locked={!b.earned} />
              <Txt style={[styles.lbl, !b.earned && { color: '#A8A296' }]}>{b.name}</Txt>
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
