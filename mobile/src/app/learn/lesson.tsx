import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Txt, Card, Button, ProgressBar, IconButton } from '@/components';
import { colors, font } from '@/theme';

/** Screen 17 — Quest / lesson (reading + interactive). */
export default function Lesson() {
  const router = useRouter();
  return (
    <Screen edges={['top']}>
      <View style={styles.stick}>
        <IconButton name="chevron-left" size={34} onPress={() => router.back()} />
        <ProgressBar value={0.37} style={{ flex: 1 }} height={10} />
        <Txt style={styles.step}>3 / 8</Txt>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Txt style={styles.eyebrow}>CHAPTER 3 · EMERGENCY FUNDS</Txt>
        <Txt variant="h1">How big should your fund actually be?</Txt>
        <Txt variant="lead">
          The old rule says &quot;3–6 months of expenses.&quot; As a student, that can feel impossible — and it is, for now. So start smaller.
        </Txt>
        <Txt variant="lead">
          A great first target is <Txt style={styles.strong}>one month&apos;s essentials</Txt>: rent, food, phone, transport. For Maya that&apos;s about $900.
        </Txt>

        <View style={styles.callout}>
          <View style={styles.calloutHead}>
            <Txt style={{ fontSize: 16 }}>💡</Txt>
            <Txt style={styles.calloutTag}>TRY IT</Txt>
          </View>
          <Txt style={styles.calloutBody}>The price is right: what do you think a laptop screen repair costs on average?</Txt>
        </View>

        <Card>
          <Slider value={0.52} label="$180" min="$50" max="$400" />
          <Button label="Lock in my guess" size="sm" style={{ marginTop: 14 }} />
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Continue" onPress={() => router.push('/learn/quiz')} />
      </View>
    </Screen>
  );
}

function Slider({ value, label, min, max }: { value: number; label: string; min: string; max: string }) {
  return (
    <View>
      <View style={styles.track}>
        <View style={[styles.bubble, { left: `${value * 100}%` }]}>
          <Txt style={styles.bubbleTxt}>{label}</Txt>
        </View>
        <View style={[styles.fill, { width: `${value * 100}%` }]} />
        <View style={[styles.knob, { left: `${value * 100}%` }]} />
      </View>
      <View style={styles.range}>
        <Txt variant="tiny">{min}</Txt>
        <Txt variant="tiny">{max}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#EFEFE7',
  },
  step: { fontFamily: font.bold, fontSize: 12, color: colors.green },
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 24, gap: 14 },
  eyebrow: { fontFamily: font.extra, fontSize: 11, color: '#4FA3B8', letterSpacing: 0.8, textTransform: 'uppercase' },
  strong: { fontFamily: font.extra, color: colors.ink },
  callout: { backgroundColor: colors.calloutBg, borderWidth: 1.5, borderColor: colors.calloutBorder, borderRadius: 16, padding: 14 },
  calloutHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  calloutTag: { fontFamily: font.extra, fontSize: 11, color: colors.pinkDark, letterSpacing: 0.6, textTransform: 'uppercase' },
  calloutBody: { fontFamily: font.bold, fontSize: 13.5, color: colors.calloutText, lineHeight: 19 },
  track: { height: 9, borderRadius: 6, backgroundColor: colors.track, marginTop: 30, marginBottom: 8, marginHorizontal: 4 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 6, backgroundColor: colors.green },
  knob: {
    position: 'absolute',
    top: '50%',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
    borderWidth: 4,
    borderColor: colors.green,
    marginLeft: -13,
    marginTop: -13,
  },
  bubble: {
    position: 'absolute',
    top: -30,
    marginLeft: -22,
    backgroundColor: colors.green,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  bubbleTxt: { fontFamily: font.extra, fontSize: 13, color: colors.white },
  range: { flexDirection: 'row', justifyContent: 'space-between' },
  footer: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1.5, borderTopColor: '#EFEFE7' },
});
