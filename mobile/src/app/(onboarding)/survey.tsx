import { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import Reanimated, { FadeIn, FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Txt, Button, Option, ProgressBar, IconButton, MIcon } from '@/components';
import { colors, font, radius } from '@/theme';
import { modules } from '@/data';
import { SURVEY_GOALS, SURVEY_FAMILIARITY_LABELS, SURVEY_TRACKS, getRecommendedTrack, trackReason, type SurveyAnswers } from '@/survey';
import { useStore } from '@/store';

/**
 * Screen 6 — onboarding survey.
 *
 * Rebuilt from three long scrolling steps into one question per screen, because the first of
 * those three was ELEVEN sliders stacked in a single scroll view. Every one of them started at
 * the midpoint, so the fastest way through — and the way most people took — was to scroll past
 * all eleven without touching any, which recorded "moderately familiar with everything" as if
 * it were an answer. A survey whose default output is a lie is worse than no survey: this is
 * what picks your starting track.
 *
 * So: one module per screen, five tappable answers, nothing pre-selected, and a tap advances
 * on its own. Eleven taps is about fifteen seconds and reads as a quiz rather than a form.
 * Skipping is still allowed, but it is now a deliberate act (the "Not sure yet" button) rather
 * than the path of least resistance, and a skipped module records nothing at all — which the
 * scoring already handles, since computeModulePriority ignores undefined familiarity.
 *
 * The familiarity SCALE is generic and uniform across modules; each module's own two end
 * labels (the website's, which are written in the student's voice) sit under the question as
 * anchors. Putting those two long lines in as options 1 and 5 and inventing short ones for
 * 2-4 made every screen a different shape.
 */

type Familiarity = Record<string, number>;

/** The five answers, same 1-5 scale the scoring expects (see computeModulePriority). */
const SCALE: { value: number; label: string }[] = [
  { value: 1, label: 'Never heard of it' },
  { value: 2, label: 'I’ve heard of it' },
  { value: 3, label: 'I kind of get it' },
  { value: 4, label: 'Pretty comfortable' },
  { value: 5, label: 'I could explain it' },
];

const GOALS_STEP = modules.length;
const RESULT_STEP = modules.length + 1;
const TOTAL_STEPS = modules.length + 2;

/** Long enough to see the row you picked light up, short enough that eleven of them don't
 * add up to a wait. */
const ADVANCE_MS = 260;

export default function Survey() {
  const router = useRouter();
  // Set by Settings' "Retake onboarding survey" row — see finish() below for what changes.
  const { retake } = useLocalSearchParams<{ retake?: string }>();
  const isRetake = retake === '1';
  const { setOnboardingTrack } = useStore();

  const [step, setStep] = useState(0);
  // Deliberately empty. Nothing is pre-answered — see the note at the top of the file.
  const [familiarity, setFamiliarity] = useState<Familiarity>({});
  const [focusGoals, setFocusGoals] = useState<Set<string>>(new Set());
  const [trackId, setTrackId] = useState<string | null>(null);

  const answers: SurveyAnswers = { moduleFamiliarity: familiarity, focusGoals: [...focusGoals] };
  const recommended = getRecommendedTrack(answers);
  const activeTrack = SURVEY_TRACKS.find((t) => t.id === trackId) ?? recommended;

  // The auto-advance after an answer. Held in a ref so a second tap (or leaving the screen)
  // cancels the pending one instead of racing it.
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearAdvance = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  };
  useEffect(() => clearAdvance, []);

  const answer = (moduleId: string, value: number) => {
    setFamiliarity((prev) => ({ ...prev, [moduleId]: value }));
    clearAdvance();
    advanceTimer.current = setTimeout(() => setStep((s) => Math.min(s + 1, RESULT_STEP)), ADVANCE_MS);
  };

  const toggleGoal = (id: string) =>
    setFocusGoals((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // Every Clerk handler in signin.tsx/signup.tsx guards against a double-tap firing twice;
  // this screen had no equivalent. A fast double-tap on "Start learning" used to call
  // finish() twice, pushing two hammy-intro instances onto the stack — each one's own
  // (correctly ref-guarded) finish handler then pushes Home separately, leaving a
  // duplicate Home entry and a stray hammy-intro replay reachable via back-navigation.
  const finishing = useRef(false);
  // Un-spend the guard whenever this screen is on top again. It's a one-shot latch and it was
  // never reset, so backing into this screen after finishing (from hammy-intro, which sat in
  // history until it started using replace) left "Start learning" permanently inert — the
  // double-tap guard doing its job forever instead of for one tap.
  useFocusEffect(() => { finishing.current = false; });

  const finish = () => {
    if (finishing.current) return;
    finishing.current = true;
    clearAdvance();
    setOnboardingTrack(activeTrack.id);
    // A retake from Settings just saves the new track and goes back where it came from.
    // It used to fall through to the same branch as first-run onboarding, which replayed the
    // whole animated piggy-born intro at someone who has been using the app for weeks — and
    // then pushed a SECOND (tabs) entry on top of the one they started from, the same
    // duplicate-stack problem results.tsx documents at length.
    if (isRetake) {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/settings');
      return;
    }
    // First run: the animated hammy-intro plays here, on "Start learning", before landing on
    // Home — see hammy-intro.tsx's own finish handler.
    router.push('/(onboarding)/hammy-intro');
  };

  const back = () => {
    clearAdvance();
    if (step === 0) { router.back(); return; }
    setStep(step - 1);
  };
  const next = () => {
    clearAdvance();
    if (step === RESULT_STEP) { finish(); return; }
    setStep(step + 1);
  };

  const module = step < GOALS_STEP ? modules[step] : null;

  return (
    <Screen style={{ paddingHorizontal: 22 }}>
      <View style={styles.topbar}>
        <IconButton name="chevron-left" onPress={back} />
        <ProgressBar value={(step + 1) / TOTAL_STEPS} style={{ flex: 1 }} />
        <Txt style={styles.step}>{step + 1} / {TOTAL_STEPS}</Txt>
      </View>

      {/* Keyed on the step so each question animates in as its own screen rather than the
          text swapping in place — the difference between "next question" and "the same form
          changed". */}
      <Reanimated.View key={step} entering={FadeInRight.duration(240)} style={{ flex: 1 }}>
        {module ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <View style={styles.qHead}>
              <MIcon abbr={module.icon} color={module.color} textColor={module.textColor} size={46} r={14} fontSize={17} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt style={styles.eyebrow}>{`TOPIC ${step + 1} OF ${modules.length}`}</Txt>
                <Txt style={styles.qModule}>{module.name}</Txt>
              </View>
            </View>

            <Txt variant="h1" style={{ marginTop: 14 }}>How much do you know about this?</Txt>
            <Txt variant="lead" style={{ marginTop: 4 }}>Rate yourself from 1 to 5.</Txt>

            <ScalePicker value={familiarity[module.id]} onPick={(v) => answer(module.id, v)} />

            <View style={styles.anchors}>
              <Anchor n="1" text={SURVEY_FAMILIARITY_LABELS[module.id]?.[0] ?? ''} />
              <Anchor n="5" text={SURVEY_FAMILIARITY_LABELS[module.id]?.[1] ?? ''} />
            </View>
          </ScrollView>
        ) : step === GOALS_STEP ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <View style={{ gap: 6 }}>
              <Txt style={styles.eyebrow}>ALMOST THERE</Txt>
              <Txt variant="h1">What are you hoping to get out of Stacked?</Txt>
              <Txt variant="lead">Pick as many as you like — it helps us choose where to start.</Txt>
            </View>

            <View style={{ gap: 10, marginTop: 18 }}>
              {SURVEY_GOALS.map((g) => (
                <Option
                  key={g.id}
                  label={g.label}
                  control="check"
                  state={focusGoals.has(g.id) ? 'on' : 'default'}
                  onPress={() => toggleGoal(g.id)}
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <View style={{ gap: 6 }}>
              <Txt style={styles.eyebrow}>YOU’RE ALL SET</Txt>
              <Txt variant="h1">Your starting track</Txt>
            </View>

            {/* Keyed on the track: picking a different one re-plays this card rather than
                silently rewriting its text, which is the whole feedback that a choice
                registered. */}
            <Reanimated.View key={activeTrack.id} entering={ZoomIn.springify().damping(15).stiffness(160)}>
              <LinearGradient
                colors={[colors.pink, colors.pinkDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={styles.heroTag}>
                  <Txt style={styles.heroTagTxt}>
                    {activeTrack.id === recommended.id ? 'RECOMMENDED FOR YOU' : 'YOUR PICK'}
                  </Txt>
                </View>
                <Txt style={styles.heroTitle}>{activeTrack.title}</Txt>
                <Txt style={styles.heroBlurb}>{trackReason(activeTrack, answers)}</Txt>
              </LinearGradient>
            </Reanimated.View>

            <View style={{ marginTop: 20 }}>
              <Txt style={styles.sectionLabel}>YOUR PATH</Txt>
              <Txt style={styles.sectionCaption}>
                These {activeTrack.moduleIds.length} modules, in order. You can explore the rest whenever you like.
              </Txt>
              <View style={{ marginTop: 12 }}>
                {activeTrack.moduleIds.map((id, i) => {
                  const m = modules.find((x) => x.id === id);
                  if (!m) return null;
                  const isLast = i === activeTrack.moduleIds.length - 1;
                  return (
                    // Keyed on track+module and staggered, so switching tracks deals the new
                    // path in one card at a time instead of swapping three rows at once.
                    <Reanimated.View
                      key={`${activeTrack.id}-${id}`}
                      entering={FadeInDown.duration(280).delay(60 + i * 70)}
                      style={styles.pathRow}
                    >
                      <View style={styles.pathRail}>
                        <View style={styles.pathDot}><Txt style={styles.pathDotTxt}>{i + 1}</Txt></View>
                        {!isLast ? <View style={styles.pathLine} /> : null}
                      </View>
                      <View style={styles.pathCard}>
                        <MIcon abbr={m.icon} color={m.color} textColor={m.textColor} size={34} r={10} fontSize={13} />
                        <Txt style={styles.modName}>{m.name}</Txt>
                      </View>
                    </Reanimated.View>
                  );
                })}
              </View>
            </View>

            <Txt style={[styles.sectionLabel, { marginTop: 4 }]}>PREFER A DIFFERENT TRACK?</Txt>
            {/* A vertical list of ALL four, not a horizontal strip of the other three. The
                strip put every option but the first off the edge of a phone with nothing to
                say so, and clipped its blurb to three lines mid-sentence; and because it
                excluded the current track, choosing one re-ordered the list under the finger
                that had just tapped it. */}
            <View style={{ gap: 9, marginTop: 10 }}>
              {SURVEY_TRACKS.map((t) => {
                const on = t.id === activeTrack.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setTrackId(t.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={({ pressed }) => [
                      styles.altRow,
                      on && styles.altRowOn,
                      pressed && { transform: [{ scale: 0.985 }] },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={styles.altTitleRow}>
                        <Txt style={[styles.altTitle, on && { color: colors.greenDark }]}>{t.title}</Txt>
                        {t.id === recommended.id ? (
                          <View style={styles.recTag}><Txt style={styles.recTagTxt}>PICKED FOR YOU</Txt></View>
                        ) : null}
                      </View>
                      <Txt style={styles.altBlurb}>{t.blurb}</Txt>
                    </View>
                    {on ? (
                      <Reanimated.View entering={ZoomIn.duration(200)} style={styles.altCheck}>
                        <Feather name="check" size={14} color={colors.white} />
                      </Reanimated.View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </Reanimated.View>

      {/* No <Spacer/> here. The animated wrapper above is already flex:1, so a second flex:1
          sibling split the screen 50/50 with it: the questions were crushed into the top half
          and the bottom half was a blank cream slab, with the whole recommended-track step
          scrolling inside a viewport half the height it should have been. */}
      <View style={styles.actions}>
        {module ? (
          // No "Next" on a question screen — answering IS next. This is the deliberate way
          // past a topic you can't place, and it records nothing rather than a middling guess.
          <Button label="Not sure yet" variant="ghost" onPress={next} style={{ flex: 1 }} />
        ) : (
          <>
            <Button label="Back" variant="ghost" onPress={back} style={{ paddingHorizontal: 22 }} />
            <Button
              label={step === GOALS_STEP ? 'See my starting track →' : isRetake ? 'Save my track' : 'Start learning'}
              onPress={next}
              style={{ flex: 1 }}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

/**
 * The 1-5 scale as an actual scale: five numbered points on one line, low on the left and
 * high on the right, rather than five stacked rows of prose.
 *
 * The number is the answer — it's what gets stored and what the track scoring reads
 * (computeModulePriority maps 1-5 onto a 0-30 point priority), so it should be the thing the
 * eye lands on and the thing the finger hits. Stacked rows made the WORDS the answer and hid
 * the number in a badge, which left no sense of where an answer sat on a range: whether "I
 * kind of get it" was the middle or the fourth of five was something you had to work out.
 * A line of numbers with the two extremes labelled at its ends says it without being read.
 */
function ScalePicker({ value, onPick }: { value?: number; onPick: (n: number) => void }) {
  const picked = SCALE.find((s) => s.value === value);
  return (
    <View style={{ marginTop: 18 }}>
      <View style={styles.scaleRow}>
        {/* The rail the points sit on. Behind them, inset so it doesn't poke out either end. */}
        <View style={styles.scaleRail} pointerEvents="none" />
        {SCALE.map((s) => {
          const on = value === s.value;
          return (
            <Pressable
              key={s.value}
              onPress={() => onPick(s.value)}
              accessibilityRole="button"
              accessibilityLabel={`${s.value} — ${s.label}`}
              accessibilityState={{ selected: on }}
              hitSlop={6}
              style={({ pressed }) => [pressed && { transform: [{ scale: 0.92 }] }]}
            >
              <View style={[styles.scaleDot, on && styles.scaleDotOn]}>
                <Txt style={[styles.scaleNum, on && styles.scaleNumOn]}>{s.value}</Txt>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.scaleEnds}>
        <Txt style={styles.scaleEnd}>Nothing yet</Txt>
        <Txt style={[styles.scaleEnd, { textAlign: 'right' }]}>I could explain it</Txt>
      </View>

      {/* Reads back what the number means, keyed so it re-animates as you move along the
          scale — the words are confirmation here, not the control. */}
      <View style={styles.scalePickWrap}>
        {picked ? (
          <Reanimated.View key={picked.value} entering={FadeIn.duration(180)}>
            <Txt style={styles.scalePick}>{picked.label}</Txt>
          </Reanimated.View>
        ) : (
          <Txt style={styles.scaleHint}>Tap a number</Txt>
        )}
      </View>
    </View>
  );
}

/** One end of the 1-5 scale, in the module's own words. */
function Anchor({ n, text }: { n: string; text: string }) {
  if (!text) return null;
  return (
    <Reanimated.View entering={FadeIn.duration(300)} style={styles.anchorRow}>
      <Txt style={styles.anchorNum}>{n}</Txt>
      <Txt style={styles.anchorTxt}>{text}</Txt>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 2 },
  step: { fontFamily: font.bold, fontSize: 12, color: colors.green },
  body: { paddingTop: 10, paddingBottom: 18 },
  eyebrow: { fontFamily: font.extra, fontSize: 12, color: colors.pinkDark, letterSpacing: 0.9 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  modName: { fontFamily: font.extra, fontSize: 13.5, color: colors.ink },

  qHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qModule: { fontFamily: font.display, fontSize: 20, color: colors.ink },

  scaleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scaleRail: {
    position: 'absolute', left: 26, right: 26, height: 3, top: 25,
    backgroundColor: colors.track, borderRadius: 2,
  },
  scaleDot: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.white,
    borderWidth: 2, borderColor: colors.borderOpt,
    alignItems: 'center', justifyContent: 'center',
  },
  scaleDotOn: {
    backgroundColor: colors.green, borderColor: colors.green,
    shadowColor: colors.greenDark, shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  scaleNum: { fontFamily: font.display, fontSize: 20, color: colors.muted3 },
  scaleNumOn: { color: colors.white },
  scaleEnds: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  scaleEnd: { flex: 1, fontFamily: font.bold, fontSize: 11, color: colors.muted4 },
  // Fixed height so the line appearing doesn't shove the anchors down under the finger.
  scalePickWrap: { height: 26, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  scalePick: { fontFamily: font.extra, fontSize: 15, color: colors.greenDark },
  scaleHint: { fontFamily: font.semi, fontSize: 13, color: colors.muted5 },

  anchors: { gap: 5, marginTop: 12 },
  anchorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  anchorNum: {
    fontFamily: font.extra, fontSize: 10.5, color: colors.muted3,
    backgroundColor: colors.canvas, borderRadius: 999,
    minWidth: 18, height: 18, lineHeight: 18, textAlign: 'center', overflow: 'hidden',
  },
  anchorTxt: { flex: 1, fontFamily: font.semi, fontSize: 11.5, lineHeight: 16, color: colors.muted3 },

  hero: {
    marginTop: 16,
    borderRadius: radius.card,
    padding: 20,
    shadowColor: colors.pinkDark,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.24)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  heroTagTxt: { fontFamily: font.extra, fontSize: 11, color: colors.white, letterSpacing: 0.7 },
  heroTitle: { fontFamily: font.display, fontSize: 27, color: colors.white, marginTop: 12 },
  heroBlurb: { fontFamily: font.semi, fontSize: 14.5, lineHeight: 21, color: 'rgba(255,255,255,0.94)', marginTop: 8 },

  sectionLabel: { fontFamily: font.extra, fontSize: 12, color: colors.muted5, letterSpacing: 0.5 },
  sectionCaption: { fontFamily: font.semi, fontSize: 13, color: colors.muted2, marginTop: 4 },
  pathRow: { flexDirection: 'row', gap: 12 },
  pathRail: { width: 28, alignItems: 'center' },
  pathDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  pathDotTxt: { fontFamily: font.extra, fontSize: 12, color: colors.white },
  pathLine: { width: 2, flex: 1, minHeight: 18, backgroundColor: colors.greenSoft, marginVertical: 3 },
  pathCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },

  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.borderOpt,
    borderRadius: radius.lg,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  altRowOn: { borderColor: colors.green, backgroundColor: '#F1F6EF' },
  altTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  altTitle: { fontFamily: font.extra, fontSize: 14.5, color: colors.ink },
  altBlurb: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 17, color: colors.muted2 },
  recTag: {
    backgroundColor: colors.tagGreenBg,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  recTagTxt: { fontFamily: font.extra, fontSize: 9, color: colors.tagGreenText, letterSpacing: 0.4 },
  altCheck: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center',
  },
});
