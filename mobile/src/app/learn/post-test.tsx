import { useMemo, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, TextInput } from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Screen, Txt, Button, Option, ProgressBar, IconButton, Hammy, Card } from '@/components';
import { colors, font, radius, selectableInput } from '@/theme';
import { modules } from '@/data';
import { POST_TEST_QUESTIONS, type PostTestQuestion } from '@/postTest';
import { useStore } from '@/store';
import { RequireAuth } from '@/lib/RequireAuth';
import { authEnabled } from '@/lib/env';
import { makeSupabase } from '@/lib/supabase';
import { MOOD_FACES } from '@/hammyFaces';

/**
 * The final assessment, unlocked once every module is mastered.
 *
 * TWENTY-TWO QUESTIONS, two per module, from the assessment's own bank (@/postTest) rather
 * than sampled from the 132 lesson questions. Those are written to teach, which makes the
 * correct option the longest one far too often — you can score well on that pattern without
 * knowing the material, and four long options don't fit a phone without scrolling.
 *
 * The material is all taught, which is the point of a post-test: it measures what the course
 * left behind. The result overwrites on a retake (see AppState.postTest), because a second
 * sitting of questions now seen twice is not comparable to the first.
 *
 * Feedback is collected on the same screen rather than as a separate prompt somewhere else:
 * finishing the course is the one moment someone has all of it in mind, and the last moment
 * the app can ask them anything at all.
 */

type Drawn = PostTestQuestion & { moduleName: string };

/** The assessment's own bank (see @/postTest), in module order, with each question's module
 * name attached for the label above it.
 *
 * It no longer samples the lesson questions. Those are written to teach — the correct option
 * carries the explanation, which routinely makes it the longest of the four — so a student
 * could score well by picking the long one every time without knowing any of it. */
function drawQuestions(): Drawn[] {
  return POST_TEST_QUESTIONS.map((q) => ({
    ...q,
    moduleName: modules.find((m) => m.id === q.moduleId)?.name ?? '',
  }));
}

export default function PostTestScreen() {
  return (
    <RequireAuth>
      <PostTest />
    </RequireAuth>
  );
}

function PostTest() {
  const router = useRouter();
  const { recordPostTest } = useStore();

  // Drawn once per sitting. Re-drawing on every render would swap the question under the
  // finger of anyone whose answer triggers a re-render, which is all of them.
  const questions = useMemo(() => drawQuestions(), []);

  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<'test' | 'result'>('test');
  const recorded = useRef(false);

  const q = questions[idx];
  const answered = picked !== null;
  const isRight = answered && picked === q?.correct;

  const submit = (choice: number) => {
    if (answered) return;
    setPicked(choice);
    if (choice === q.correct) setScore((s) => s + 1);
  };

  const advance = () => {
    if (idx + 1 >= questions.length) {
      // Guarded: the store write must happen once, not once per render of the result screen.
      if (!recorded.current) {
        recorded.current = true;
        recordPostTest(score, questions.length);
      }
      setPhase('result');
      return;
    }
    setIdx(idx + 1);
    setPicked(null);
  };

  if (phase === 'result') return <PostTestResult score={score} total={questions.length} onDone={() => router.replace('/(tabs)/home')} />;
  if (!q) return null;

  return (
    <Screen style={{ paddingHorizontal: 22 }}>
      <View style={styles.topbar}>
        <IconButton name="chevron-left" onPress={() => router.back()} />
        <ProgressBar value={(idx + 1) / questions.length} style={{ flex: 1 }} />
        <Txt style={styles.step}>{idx + 1} / {questions.length}</Txt>
      </View>

      {/* The ScrollView is the outer element and it does NOT slide.
          A Reanimated wrapper with FadeInRight used to sit here, holding the scroll view
          inside it: the incoming question translated in from the right, so mid-animation the
          content sat partly outside its own container and the question was clipped down one
          side. Cross-fading in place has the same "this is a new question" effect and never
          moves anything horizontally. */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
        style={{ flex: 1 }}
      >
        <Reanimated.View key={idx} entering={FadeIn.duration(200)}>
          <Txt style={styles.eyebrow}>{q.moduleName.toUpperCase()}</Txt>
          <Txt variant="h1" style={{ marginTop: 6 }}>{q.q}</Txt>

          <View style={{ gap: 10, marginTop: 18 }}>
            {q.opts.map((opt, i) => (
              <Option
                key={i}
                label={opt}
                control="letter"
                letter={String.fromCharCode(65 + i)}
                // Once answered, the right answer is always shown as correct — including when
                // it wasn't the one picked. A test that only tells you that you were wrong
                // teaches nothing on the way out.
                state={
                  !answered ? 'default'
                    : i === q.correct ? 'correct'
                      : i === picked ? 'wrong' : 'default'
                }
                onPress={() => submit(i)}
              />
            ))}
          </View>

          {answered ? (
            <Reanimated.View entering={FadeIn.duration(200)} style={styles.expWrap}>
              <Txt style={[styles.expVerdict, { color: isRight ? colors.tagGreenText : colors.dangerDeep }]}>
                {isRight ? 'Correct' : 'Not quite'}
              </Txt>
              <Txt style={styles.expTxt}>{q.exp}</Txt>
            </Reanimated.View>
          ) : null}
        </Reanimated.View>
      </ScrollView>

      <View style={styles.actions}>
        <Button
          label={idx + 1 >= questions.length ? 'See my result' : 'Next'}
          variant={answered ? 'green' : 'ghost'}
          onPress={() => { if (answered) advance(); }}
          style={{ flex: 1 }}
        />
      </View>
    </Screen>
  );
}

function PostTestResult({ score, total, onDone }: { score: number; total: number; onDone: () => void }) {
  // The same face and the same words at every score, on purpose. Banding the reaction meant
  // the app's last word to someone who had just finished all eleven modules could be a
  // consolation face and "worth another pass" — a verdict on them, delivered at the moment
  // they finished. The score is still shown; it just isn't graded back at them.
  return (
    <Screen style={{ paddingHorizontal: 22 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={{ alignItems: 'center', gap: 12, marginTop: 10 }}>
          <Hammy size={120} bob={false} face={MOOD_FACES.satisfied} />
          <Txt style={styles.eyebrow}>FINAL ASSESSMENT</Txt>
          <Txt variant="disp">{score} / {total}</Txt>
          <Txt variant="lead" style={{ textAlign: 'center' }}>
            Thank you so much for completing Stacked!
          </Txt>
        </View>

        <PostTestFeedback score={score} total={total} />
      </ScrollView>

      <View style={styles.actions}>
        <Button label="Done" onPress={onDone} style={{ flex: 1 }} />
      </View>
    </Screen>
  );
}

/** Asked here and nowhere else, because this is the last moment the app has their attention
 * and the only moment they've seen all of it. Writes to the same `feedback` table Settings
 * uses, tagged with page 'post-test' so the two can be told apart. */
function PostTestFeedback({ score, total }: { score: number; total: number }) {
  if (!authEnabled) return null;
  return <ClerkPostTestFeedback score={score} total={total} />;
}

function ClerkPostTestFeedback({ score, total }: { score: number; total: number }) {
  const { getToken, userId } = useAuth();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const send = async () => {
    if (!userId || !message.trim() || status === 'sending') return;
    setStatus('sending');
    // Built here rather than memoised at the top of the component: this screen makes at most
    // one request in its whole life, so a client held across every render is a cost with no
    // payer — and building it on demand keeps `getToken` out of a render-time ref.
    const supabase = makeSupabase(() => getToken());
    // The score rides along with the comment. "The quizzes were too easy" means something
    // different from someone who scored 22/22 than from someone who scored 9.
    const { error } = await supabase.from('feedback').insert({
      clerk_user_id: userId,
      category: 'feedback',
      message: `[post-test ${score}/${total}] ${message.trim()}`,
      app: 'mobile',
      page: 'post-test',
    });
    setStatus(error ? 'error' : 'sent');
  };

  return (
    <Card style={styles.fb}>
      <Txt style={styles.fbHead}>How was the course?</Txt>
      <Txt variant="lead" style={{ fontSize: 13 }}>
        You&apos;ve finished everything. Anything that confused you, dragged, or was worth the time?
      </Txt>
      {status === 'sent' ? (
        <Txt style={styles.fbSent}>Sent. Thank you so much for your feedback!</Txt>
      ) : (
        <>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="What worked, what didn't..."
            placeholderTextColor={colors.muted5}
            multiline
            style={[styles.fbInput, selectableInput]}
          />
          <Button
            label={status === 'sending' ? 'Sending…' : 'Send feedback'}
            variant={message.trim() ? 'green' : 'ghost'}
            onPress={send}
            style={{ marginTop: 10 }}
          />
          {status === 'error' ? <Txt style={styles.fbErr}>Couldn&apos;t send that. Try again in a moment.</Txt> : null}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 2 },
  step: { fontFamily: font.bold, fontSize: 12, color: colors.green },
  body: { paddingTop: 10, paddingBottom: 20 },
  eyebrow: { fontFamily: font.extra, fontSize: 12, color: colors.greenDark, letterSpacing: 0.9 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  expWrap: {
    marginTop: 16, padding: 14, borderRadius: radius.lg,
    backgroundColor: colors.canvas, gap: 4,
  },
  expVerdict: { fontFamily: font.extra, fontSize: 13.5 },
  expTxt: { fontFamily: font.semi, fontSize: 13, lineHeight: 19, color: colors.muted1 },
  fb: { marginTop: 24, gap: 6 },
  fbHead: { fontFamily: font.displayMed, fontSize: 17, color: colors.ink },
  fbInput: {
    marginTop: 10, minHeight: 88, textAlignVertical: 'top',
    backgroundColor: colors.screen, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.borderField,
    padding: 12, fontFamily: font.semi, fontSize: 13.5, color: colors.ink,
  },
  fbSent: { fontFamily: font.extra, fontSize: 13.5, color: colors.tagGreenText, marginTop: 10 },
  fbErr: { fontFamily: font.bold, fontSize: 12.5, color: colors.dangerDeep, marginTop: 8 },
});
