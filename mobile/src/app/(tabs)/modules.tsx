import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Header, Txt, Tag, ProgressBar, MIcon, ModuleTile } from '@/components';
import { colors, font } from '@/theme';
import { modules } from '@/data';
import { useStore } from '@/store';
import { SURVEY_TRACKS } from '@/survey';

/** Screen 9 — Modules (all 11, locked/unlocked). Done/total/status derived live from the
 * store + real lesson content, not static mock fields. */
export default function Modules() {
  const router = useRouter();
  const { state, level, tierName, moduleDone, moduleTotal, moduleStatus } = useStore();
  const doneCount = modules.filter((m) => moduleStatus(m.id, m.unlockLevel) === 'done').length;
  const activeTrack = SURVEY_TRACKS.find((t) => t.id === state.onboardingTrackId);
  const trackModuleIds = activeTrack?.moduleIds ?? [];

  return (
    <Screen edges={['top']}>
      <Header level={level} name={tierName} coins={state.coins} diamonds={state.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Txt variant="disp" style={{ fontSize: 23 }}>All modules</Txt>
          <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.green }}>{doneCount} / {modules.length} done</Txt>
        </View>

        <View style={styles.grid}>
          {modules.map((m) => {
            const done = moduleDone(m.id);
            const total = moduleTotal(m.id);
            const pct = total ? done / total : 0;
            const status = moduleStatus(m.id, m.unlockLevel);
            const locked = status === 'locked';
            const recommended = status === 'active' && trackModuleIds.includes(m.id);
            return (
              <ModuleTile
                key={m.id}
                locked={locked}
                recommended={recommended}
                onPress={() => !locked && router.push(`/learn/module/${m.id}`)}
                style={styles.item}
              >
                <View style={styles.top}>
                  <MIcon abbr={m.abbr} color={m.color} />
                  {status === 'done' ? (
                    <Tag tone="green" style={styles.tag}>✓</Tag>
                  ) : recommended ? (
                    <Tag tone="gold" style={styles.tag}>★ Recommended</Tag>
                  ) : status === 'active' ? (
                    <Tag tone="pink" style={styles.tag}>{Math.round(pct * 100)}%</Tag>
                  ) : (
                    <Tag tone="lock" style={styles.tag}>🔒{m.unlockLevel}</Tag>
                  )}
                </View>
                <Txt style={[styles.name, locked && { color: colors.lockText }]}>{m.name}</Txt>
                {status === 'active' ? (
                  <ProgressBar value={pct} tone="pink" height={7} />
                ) : (
                  <Txt style={styles.sub}>
                    {status === 'done' ? `${done}/${total} quests` : `Unlock at Lvl ${m.unlockLevel}`}
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
