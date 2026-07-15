import { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Header, Txt, Card, Field, Tag, Segmented, ProgressBar } from '@/components';
import { colors, font } from '@/theme';
import { user } from '@/data';
import { useStore } from '@/store';

const BARS = [
  { label: 'Y1', h: 0.22 },
  { label: 'Y2', h: 0.44 },
  { label: 'Y3', h: 0.7 },
  { label: 'Y4', h: 1, gold: true },
];

const BUDGET = [
  { label: 'Needs (50%)', amt: '$600', pct: 0.5, tone: 'green' as const },
  { label: 'Wants (30%)', amt: '$360', pct: 0.3, tone: 'pink' as const },
  { label: 'Savings (20%)', amt: '$240', pct: 0.2, tone: 'green' as const },
];

/** Screen 10 — Tools (Budget / Compound Interest). */
export default function Tools() {
  const { state, level, tierName } = useStore();
  const [tab, setTab] = useState(1);
  return (
    <Screen edges={['top']}>
      <Header level={level} name={tierName} coins={state.coins} diamonds={state.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Txt variant="disp" style={{ fontSize: 23 }}>Tools</Txt>
        <Segmented options={['Budget', 'Compound Interest']} value={tab} onChange={setTab} />

        {tab === 1 ? (
          <>
            <Card style={{ gap: 12 }}>
              <Field label="MONTHLY DEPOSIT" value="$50" right={<Txt style={styles.hint}>from a campus job</Txt>} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Field label="YEARS" value="4" style={{ flex: 1 }} />
                <Field label="RETURN" value="7%" style={{ flex: 1 }} />
              </View>
            </Card>

            <Card>
              <View style={styles.chartHead}>
                <Txt style={styles.chartTitle}>Growth over 4 years</Txt>
                <Tag tone="green">+$360 interest</Tag>
              </View>
              <View style={styles.bars}>
                {BARS.map((b) => (
                  <View key={b.label} style={styles.bcol}>
                    <LinearGradient
                      colors={b.gold ? [colors.coin, colors.coinBorder] : [colors.greenBright, colors.green]}
                      style={{ width: '100%', height: `${b.h * 100}%`, borderTopLeftRadius: 7, borderTopRightRadius: 7, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }}
                    />
                    <Txt style={styles.bcolLbl}>{b.label}</Txt>
                  </View>
                ))}
              </View>
            </Card>

            <Card style={styles.resultCard}>
              <Txt style={styles.resultCap}>YOU&apos;D HAVE</Txt>
              <Txt style={styles.resultBig}>$2,760</Txt>
              <Txt variant="lead" style={{ fontSize: 13, textAlign: 'center' }}>You put in $2,400 — interest did the rest.</Txt>
            </Card>
          </>
        ) : (
          <>
            <Card style={{ gap: 12 }}>
              <Field label="MONTHLY TAKE-HOME" value="$1,200" />
              <Txt variant="lead" style={{ fontSize: 13 }}>The 50 / 30 / 20 rule splits every dollar into needs, wants, and savings.</Txt>
            </Card>
            <Card style={{ gap: 16 }}>
              {BUDGET.map((b) => (
                <View key={b.label} style={{ gap: 6 }}>
                  <View style={styles.chartHead}>
                    <Txt style={{ fontFamily: font.extra, fontSize: 13.5, color: colors.ink }}>{b.label}</Txt>
                    <Txt style={{ fontFamily: font.display, fontSize: 15, color: colors.ink }}>{b.amt}</Txt>
                  </View>
                  <ProgressBar value={b.pct} tone={b.tone} height={9} />
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 28, gap: 15 },
  hint: { fontFamily: font.bold, fontSize: 12, color: colors.green },
  chartHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  chartTitle: { fontFamily: font.displayMed, fontSize: 14, color: colors.ink },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 150 },
  bcol: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 6 },
  bcolLbl: { fontFamily: font.extra, fontSize: 10, color: colors.muted5 },
  resultCard: { backgroundColor: '#EFF5EC', borderColor: '#D9E7D3', alignItems: 'center', gap: 2 },
  resultCap: { fontFamily: font.bold, fontSize: 12, color: colors.muted5, letterSpacing: 0.3 },
  resultBig: { fontFamily: font.display, fontSize: 36, color: colors.greenDark },
});
