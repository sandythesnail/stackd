import { useMemo, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, TextInput } from 'react-native';
import Reanimated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Screen, Txt, Button, Option, ProgressBar, IconButton, Hammy, Card } from '@/components';
import { colors, font, radius, selectableInput } from '@/theme';
import { modules } from '@/data';
import { moduleContentById } from '@/content';
import { useStore } from '@/store';
import { RequireAuth } from '@/lib/RequireAuth';
import { authEnabled } from '@/lib/env';
import { makeSupabase } from '@/lib/supabase';
import { MOOD_FACES, REACTION_FACES } from '@/hammyFaces';

/**
 * The final assessment, unlocked once every module is mastered.
 *
 * WHY IT IS A SAMPLE, not the whole bank: there are 132 questions across the eleven modules,
 * and a 132-question exam is not a measure of what someone learned, it is a measure of who
 * will sit still for 132 questions. Two per module gives 22 — long enough to mean something,
 * short enough to finish — and every module is represented exactly equally, so the score says
 * something about the curriculum rather than about which modules happened to get sampled.
 *
 * The questions are the real ones from the lessons, which the student has seen before. That
 * is deliberate for a post-test: it measures retention of taught material, not the ability to
 * handle novel questions, and it is the same trade the pre-course survey makes at the other
 * end. The result overwrites on a retake (see AppState.postTest) precisely because a second
 * sitting of questions you have now seen twice is not comparable to the first.
 *
 * Feedback is collected on the same screen rather than as a separate prompt somewhere else:
 * the moment someone finishes the entire course is the one moment they have the whole thing
 * in mind, and it is the last moment the app can ask them anything at all.
 */

const QUESTIONS_PER_MODULE = 2;

type Drawn = { moduleId: string; moduleName: string; q: string; opts: string[]; correct: number; exp: string };

/** Two questions per module, evenly spaced through each module's own bank so the draw isn't
 * always the first two (which are the easiest, being the opening lesson's). */
function drawQuestions(): Drawn[] {
  const out: Drawn[] = [];
  for (const m of modules) {
    const bank = moduleContentById(m.id)?.questions ?? [];
    if (!bank.length) continue;
    const stride = Math.max(1, Math.floor(bank.length / QUESTIONS_PER_MODULE));
    for (let i = 0; i < QUESTIONS_PER_MODULE; i++) {
      const q = bank[Math.min(bank.length - 1, i * stride)];
      if (q) out.push({ moduleId: m.id, moduleName: m.name, q: q.q, opts: q.opts, correct: q.correct, exp: q.exp });
    }
  }
  return out;
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

      <Reanimated.View key={idx} entering={FadeInRight.duration(220)} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
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
        </ScrollView>
      </Reanimated.View>

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
  const pct = total ? Math.round((score / total) * 100) : 0;
  // Three bands, and the lowest one is still encouraging: someone who finished every lesson
  // in the app has already done the hard part, and the number is a measure of the course as
  // much as of them.
  const face = pct >= 80 ? MOOD_FACES.star : pct >= 55 ? REACTION_FACES.happy : REACTION_FACES.gentle;
  const verdict = pct >= 80 ? 'You know this stuff.' : pct >= 55 ? 'Solid work.' : 'Worth another pass.';

  return (
    <Screen style={{ paddingHorizontal: 22 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={{ alignItems: 'center', gap: 12, marginTop: 10 }}>
          <Hammy size={120} bob={false} face={face} />
          <Txt style={styles.eyebrow}>FINAL ASSESSMENT</Txt>
          <Txt variant="disp">{score} / {total}</Txt>
          <Txt variant="lead" style={{ textAlign: 'center' }}>{verdict}</Txt>
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
        <Txt style={styles.fbSent}>Sent. Thank you, this is genuinely read.</Txt>
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
