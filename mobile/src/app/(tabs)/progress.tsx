import { View, ScrollView, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Screen, Header, Txt, Card, Stat, ProgressBar, MIcon } from '@/components';
import { colors, font } from '@/theme';
import { modules, user } from '@/data';

const ROWS = ['earning', 'career', 'spending', 'saving', 'investing'];

/** Screen 8 — Progress (overall + per-module). */
export default function Progress() {
  return (
    <Screen edges={['top']}>
      <Header level={user.level} name={user.tier} coins={user.coins} diamonds={user.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Txt variant="disp" style={{ fontSize: 23 }}>Your progress</Txt>

        <Card style={styles.ringCard}>
          <Ring pct={0.42} />
          <View style={styles.statRow}>
            <Stat value="3/11" label="Modules" style={styles.softStat} />
            <Stat value="24" label="Quests" style={styles.softStat} />
            <Stat value="1,240" label="Total XP" style={styles.softStat} />
          </View>
        </Card>

        <Txt variant="h2">By module</Txt>
        <View style={{ gap: 8 }}>
          {ROWS.map((id) => {
            const m = modules.find((x) => x.id === id)!;
            const locked = m.status === 'locked';
            const pct = m.quests ? m.done / m.quests : 0;
            const complete = m.status === 'done';
            return (
              <View key={id} style={[styles.row, locked && styles.rowLock]}>
                <MIcon abbr={m.abbr} color={m.color} size={34} r={10} fontSize={13} />
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <Txt style={styles.rowName}>{m.name}</Txt>
                    <Txt style={[styles.rowCount, complete && { color: colors.green }]}>
                      {locked ? '🔒 Locked' : `${m.done} / ${m.quests}`}
                    </Txt>
                  </View>
                  <ProgressBar
                    value={locked ? 0 : pct}
                    tone={complete ? 'green' : 'pink'}
                    height={8}
                    track={locked ? '#E4E0D6' : colors.track}
                    style={{ marginTop: 6 }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Ring({ pct }: { pct: number }) {
  const size = 154;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track2} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.green}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringInner}>
        <Txt style={styles.ringPct}>{Math.round(pct * 100)}%</Txt>
        <Txt style={styles.ringLbl}>COMPLETE</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 28, gap: 16 },
  ringCard: { backgroundColor: '#EDF4E9', borderColor: '#D9E7D3', alignItems: 'center', gap: 14 },
  statRow: { flexDirection: 'row', gap: 8, width: '100%' },
  softStat: { backgroundColor: 'rgba(255,255,255,0.55)' },
  ringInner: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: { fontFamily: font.display, fontSize: 38, color: colors.greenDark },
  ringLbl: { fontFamily: font.bold, fontSize: 12, color: colors.muted5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  rowLock: { backgroundColor: colors.lockBg, borderColor: colors.lockBorder },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  rowName: { fontFamily: font.extra, fontSize: 13.5, color: colors.ink },
  rowCount: { fontFamily: font.bold, fontSize: 12, color: colors.muted5 },
});
