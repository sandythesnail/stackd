import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Header, Txt, Tag, ProgressBar, MIcon, ModuleTile } from '@/components';
import { colors, font } from '@/theme';
import { modules, user } from '@/data';
import { useStore } from '@/store';

/** Screen 9 — Modules (all 11, locked/unlocked). */
export default function Modules() {
  const router = useRouter();
  const { state } = useStore();
  const doneCount = modules.filter((m) => m.status === 'done').length;

  return (
    <Screen edges={['top']}>
      <Header level={state.level} name={user.tier} coins={state.coins} diamonds={state.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Txt variant="disp" style={{ fontSize: 23 }}>All modules</Txt>
          <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.green }}>{doneCount} / {modules.length} done</Txt>
        </View>

        <View style={styles.grid}>
          {modules.map((m) => {
            const pct = m.quests ? m.done / m.quests : 0;
            const locked = m.status === 'locked';
            return (
              <ModuleTile
                key={m.id}
                locked={locked}
                onPress={() => !locked && router.push(`/learn/module/${m.id}`)}
                style={styles.item}
              >
                <View style={styles.top}>
                  <MIcon abbr={m.abbr} color={m.color} />
                  {m.status === 'done' ? (
                    <Tag tone="green" style={styles.tag}>✓</Tag>
                  ) : m.status === 'active' ? (
                    <Tag tone="pink" style={styles.tag}>{Math.round(pct * 100)}%</Tag>
                  ) : (
                    <Tag tone="lock" style={styles.tag}>🔒{m.unlockLevel}</Tag>
                  )}
                </View>
                <Txt style={[styles.name, locked && { color: colors.lockText }]}>{m.name}</Txt>
                {m.status === 'active' ? (
                  <ProgressBar value={pct} tone="pink" height={7} />
                ) : (
                  <Txt style={styles.sub}>
                    {m.status === 'done' ? `${m.done}/${m.quests} quests` : `Unlock at Lvl ${m.unlockLevel}`}
                  </Txt>
                )}
              </ModuleTile>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 28, gap: 14 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: { width: '47.5%', flexGrow: 1, minHeight: 116, justifyContent: 'flex-start' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { paddingVertical: 3, paddingHorizontal: 8 },
  name: { fontFamily: font.extra, fontSize: 13.5, color: colors.ink },
  sub: { fontFamily: font.bold, fontSize: 11, color: colors.muted5 },
});
