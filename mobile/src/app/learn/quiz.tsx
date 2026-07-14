import { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Screen, Txt, Button, Option, ProgressBar, IconButton } from '@/components';
import { colors, font } from '@/theme';

const CHOICES = [
  'Nothing — she earned it, spend it',
  'Around 20%',
  'Exactly half of it',
  "It doesn't matter",
];
const CORRECT = 1;

/** Screen 18 — Quiz (default / correct / incorrect states). */
export default function Quiz() {
  const router = useRouter();
  const [sel, setSel] = useState<number | null>(null);
  const answered = sel !== null;
  const right = sel === CORRECT;

  const stateFor = (i: number) => {
    if (!answered) return 'default' as const;
    if (i === CORRECT) return 'correct' as const;
    if (i === sel) return 'wrong' as const;
    return 'default' as const;
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.stick}>
        <IconButton name="x" size={34} iconSize={16} onPress={() => router.back()} />
        <ProgressBar value={0.66} style={{ flex: 1 }} height={10} />
        <Txt style={styles.step}>Q4 / 6</Txt>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Txt variant="h1">Maya gets her first $1,200 paycheck. How much should she aim to save?</Txt>
        <View style={{ gap: 10, marginTop: 4 }}>
          {CHOICES.map((c, i) => {
            const st = stateFor(i);
            return (
              <Option
                key={c}
                label={c}
                control="radio"
                state={st}
                onPress={() => !answered && setSel(i)}
                right={
                  st === 'correct' ? (
                    <Feather name="check" size={22} color={colors.greenDark} />
                  ) : st === 'wrong' ? (
                    <Feather name="x" size={22} color={colors.danger} />
                  ) : undefined
                }
              />
            );
          })}
        </View>
      </ScrollView>

      {answered ? (
        <View style={[styles.feedback, right ? styles.feedbackOk : styles.feedbackBad]}>
          <Txt style={[styles.feedH, { color: right ? colors.greenDark : colors.pinkDark }]}>
            {right ? 'Nice work!' : 'So close!'}
          </Txt>
          <Txt style={[styles.feedBody, { color: right ? colors.greenDark : colors.pinkText }]}>
            Saving ~20% builds the habit without starving your fun budget. Even $10 counts.
          </Txt>
          <Button label="Got it →" variant={right ? 'green' : 'pink'} onPress={() => router.replace('/learn/results')} />
        </View>
      ) : null}
    </Screen>
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
  feedback: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, borderTopWidth: 1.5, gap: 11 },
  feedbackBad: { backgroundColor: colors.pinkBg2, borderTopColor: colors.pinkBorder },
  feedbackOk: { backgroundColor: colors.tagGreenBg, borderTopColor: '#CBE3C2' },
  feedH: { fontFamily: font.display, fontSize: 16 },
  feedBody: { fontFamily: font.semi, fontSize: 13, lineHeight: 18 },
});
