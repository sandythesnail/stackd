import { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Screen, Txt, Button, Option, ProgressBar, IconButton } from '@/components';
import { colors, font } from '@/theme';
import { moduleById } from '@/data';
import { moduleContentById } from '@/content';

/** Screen 18 — Quiz. Real questions: loops through the lesson's qIndices into the
 * module's flat questions array, then hands the score off to Results. */
export default function Quiz() {
  const router = useRouter();
  const { moduleId, lessonIndex } = useLocalSearchParams<{ moduleId: string; lessonIndex: string }>();
  const mod = moduleById(moduleId ?? 'saving') ?? moduleById('saving')!;
  const content = moduleContentById(mod.id);
  const li = Number(lessonIndex ?? 0);
  const lesson = content?.lessons[li];
  const qIndices = lesson?.qIndices ?? [];

  const [pos, setPos] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const question = content?.questions[qIndices[pos]];
  const answered = sel !== null;
  const right = question ? sel === question.correct : false;
  const total = qIndices.length;

  const stateFor = (i: number) => {
    if (!answered || !question) return 'default' as const;
    if (i === question.correct) return 'correct' as const;
    if (i === sel) return 'wrong' as const;
    return 'default' as const;
  };

  const next = () => {
    const tally = right ? correctCount + 1 : correctCount;
    if (pos + 1 >= total) {
      router.replace({
        pathname: '/learn/results',
        params: { moduleId: mod.id, lessonIndex: String(li), correctCount: String(tally), total: String(total) },
      });
      return;
    }
    setCorrectCount(tally);
    setPos(pos + 1);
    setSel(null);
  };

  if (!question) {
    return (
      <Screen edges={['top']}>
        <View style={styles.content}>
          <Txt variant="h1">No questions found for this lesson.</Txt>
          <Button label="Back" onPress={() => router.back()} style={{ marginTop: 14 }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <View style={styles.stick}>
        <IconButton name="x" size={34} iconSize={16} onPress={() => router.back()} />
        <ProgressBar value={(pos + (answered ? 1 : 0)) / total} style={{ flex: 1 }} height={10} />
        <Txt style={styles.step}>Q{pos + 1} / {total}</Txt>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Txt variant="h1">{question.q}</Txt>
        <View style={{ gap: 10, marginTop: 4 }}>
          {question.opts.map((c, i) => {
            const st = stateFor(i);
            return (
              <Option
                key={c}
                label={c}
                control="letter"
                letter={['A', 'B', 'C', 'D'][i]}
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
            {question.exp}
          </Txt>
          <Button label="Got it →" variant={right ? 'green' : 'pink'} onPress={next} />
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
