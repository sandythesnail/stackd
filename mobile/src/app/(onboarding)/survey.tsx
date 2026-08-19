import { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import Reanimated, {
  FadeIn, FadeInDown, FadeInRight, ZoomIn,
  useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen, Txt, Button, Option, ProgressBar, IconButton, MIcon, Hammy } from '@/components';
import { colors, font, radius } from '@/theme';
import { mixHex } from '@/colorMix';
import { modules } from '@/data';
import { SURVEY_GOALS, SURVEY_TRACKS, getRecommendedTrack, trackReason, type SurveyAnswers } from '@/survey';
import { useStore } from '@/store';
import { MOOD_FACES, REACTION_FACES, type FaceOverlay } from '@/hammyFaces';

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
 * So: one module per screen, a five-point scale, nothing pre-selected. The button below the
 * scale is white until a number is picked and green once one is, which is both the receipt for
 * the tap and the way forward. A module you skip records nothing at all, which the scoring
 * already handles, since computeModulePriority ignores an undefined familiarity.
 *
 * The scale is generic and uniform across modules. The website's two per-module end quotes
 * ("I never spend a cent" / "After every paycheck, shopping time!") used to sit under the
 * question as anchors and are gone: they said in two long, differently-shaped sentences what
 * the five labelled points already say, and they were the only reason this screen ever needed
 * to scroll.
 */

type Familiarity = Record<string, number>;

/** Hammy's own resting face, used for "I've heard of it" - a shrug is the honest reaction
 * to a half-answer, and the nervy face made a perfectly reasonable one look like a wince. */
const RESTING_FACE = MOOD_FACES.satisfied;

/** The five answers, same 1-5 scale the scoring expects (see computeModulePriority).
 *
 * Each carries a face, so Hammy reacts to the answer as it's given. The run climbs the way
 * the scale does: sad at "never heard of it", nervy, then the same confused-mouth face the
 * quest player uses for a near miss, then the happy mouth it uses for a correct answer, and
 * the star face at the top. Nothing here judges the student — 1 is a perfectly good answer to
 * give — but a face that doesn't move is worse than no face, so it moves. */
const SCALE: { value: number; label: string; face: FaceOverlay }[] = [
  { value: 1, label: 'Never heard of it', face: MOOD_FACES.sad },
  { value: 2, label: 'I’ve heard of it', face: RESTING_FACE },
  { value: 3, label: 'I kind of get it', face: REACTION_FACES.gentle },
  { value: 4, label: 'Pretty comfortable', face: REACTION_FACES.happy },
  { value: 5, label: 'I could explain it', face: MOOD_FACES.star },
];

/** Before anything is picked. Curious reads as "well?", which is the question being asked. */
const UNANSWERED_FACE = MOOD_FACES.curious;


const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

/** How much of the module's own chip colour survives into the card behind it. Low enough that
 * the full-strength chip still reads as the brightest thing on the card. */
const CARD_TINT_PCT = 26;

const GOALS_STEP = modules.length;
const RESULT_STEP = modules.length + 1;
const TOTAL_STEPS = modules.length + 2;

export default function Survey() {
  const router = useRouter();
  const { setOnboardingTrack, markOnboardingComplete } = useStore();

  const [step, setStep] = useState(0);
  // Deliberately empty. Nothing is pre-answered — see the note at the top of the file.
  const [familiarity, setFamiliarity] = useState<Familiarity>({});
  const [focusGoals, setFocusGoals] = useState<Set<string>>(new Set());
  const [trackId, setTrackId] = useState<string | null>(null);

  const answers: SurveyAnswers = { moduleFamiliarity: familiarity, focusGoals: [...focusGoals] };
  const recommended = getRecommendedTrack(answers);
  const activeTrack = SURVEY_TRACKS.find((t) => t.id === trackId) ?? recommended;

  // Answering no longer advances on its own. The button below goes from white to green the
  // moment a number is picked, which is both the confirmation that the tap registered and the
  // invitation to move on, and it leaves the pace with the person answering.
  const answer = (moduleId: string, value: number) => {
    setFamiliarity((prev) => ({ ...prev, [moduleId]: value }));
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
    setOnboardingTrack(activeTrack.id);
    // Onboarding counts as seen the moment the survey is answered, not when the intro
    // animation finishes. The animation is a reward, not a step: someone who answers the
    // questions and then force-quits during the piggy bank has seen this screen once and
    // should never be handed it again. hammy-intro sets the same flag for the path where the
    // survey is skipped entirely.
    markOnboardingComplete();
    // The animated hammy-intro plays here, on "Start learning", before landing on Home — see
    // hammy-intro.tsx's own finish handler, which REPLACES rather than pushes.
    //
    // Every entry into this screen now runs the whole thing, first run or not. A retake used
    // to skip the intro and hop straight back to Settings, on the reasoning that replaying the
    // piggy bank at someone who has used the app for weeks is an imposition — but asking to
    // retake onboarding is asking for onboarding, and the animation is the half people
    // actually remember. Both entrances (Settings' retake row, and the reset that wipes
    // progress) are deliberate, one-tap-and-confirmed requests for exactly this.
    //
    // It plays ONCE per request either way: markOnboardingComplete() above sets the flag again
    // the moment the questions are answered, so nothing here re-arms itself. Both callers
    // REPLACE their way in, so Settings isn't left underneath and hammy-intro's own replace
    // lands on a clean stack rather than the duplicate (tabs) entry results.tsx documents.
    router.push('/(onboarding)/hammy-intro');
  };

  const back = () => {
    if (step === 0) { router.back(); return; }
    setStep(step - 1);
  };
  const next = () => {
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
          // No ScrollView: with the anchor quotes gone this fits any phone, and a flex column
          // lets the topic card and the scale share the height instead of huddling at the top.
          <View style={styles.qBody}>
            {/* The topic sits below the question rather than at the very top of the screen —
                it was tucked under the progress bar where the eye passes over it on the way
                down, and it is the one thing that changes between these eleven screens. */}
            <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
              <View style={styles.qAsk}>
                {/* Hammy reacts to the answer as it is given. He is the only thing on this
                    screen that responds to a tap besides the number itself, which is what
                    turns eleven identical questions into something with a face on it. */}
                <ReactingHammy face={SCALE.find((s) => s.value === familiarity[module.id])?.face ?? UNANSWERED_FACE} />
                <Txt variant="h1" style={{ flex: 1 }}>How much do you know about this?</Txt>
              </View>

              {/* The card is a LIGHTER wash of the chip sitting on it — the same hue as the
                  numbered square in the middle, mixed down into white, so the two read as one
                  object rather than two colours that happen to be near each other. The chip
                  keeps the full-strength tone and stays the brightest thing on the card, which
                  is what makes the number the thing you look at first.

                  Text goes back to the module's ink. White words need a dark ground and this
                  one is deliberately pale, so ink is the only readable choice here; the white
                  text that matters — the number on the chip — is untouched. */}
              <View style={[styles.qCard, {
                backgroundColor: mixHex(module.color, colors.white, CARD_TINT_PCT),
                borderColor: module.color,
              }]}>
                {/* The square, ringed. It used to be drawn as a WHITE tile carrying the
                    module's number colour, which is a pale tint of the module's own hue — so
                    loans, whose number is very nearly white, showed a blank white square, and
                    risk showed a barely-there one. The module with no icon on its own topic
                    card is not a subtle bug.
                    Now the tile is the module's real chip, exactly as it appears everywhere
                    else in the app, and the white ring is what separates it from the card
                    behind it — which is that same colour. Outline for contrast, chip for
                    identity, rather than recolouring the chip to solve the contrast. */}
                <View style={styles.qIconRing}>
                  <MIcon abbr={module.icon} color={module.color} textColor={module.textColor} size={54} r={16} fontSize={20} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Txt style={styles.qTopic}>
                    {`MODULE ${step + 1} OF ${modules.length}`}
                  </Txt>
                  <Txt style={styles.qModule}>{module.name}</Txt>
                </View>
              </View>

              <ScalePicker value={familiarity[module.id]} onPick={(v) => answer(module.id, v)} />
            </View>
          </View>
        ) : step === GOALS_STEP ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <View style={{ gap: 6 }}>
              <Txt style={styles.eyebrow}>ALMOST THERE</Txt>
              <Txt variant="h1">What are you hoping to get out of Stacked?</Txt>
              <Txt variant="lead">Pick as many as you like. It helps us choose where to start.</Txt>
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
                colors={[colors.greenBrand, colors.greenDark]}
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
      {/* One button, full width, on every step. The old Back sat next to it duplicating the
          chevron already in the top bar, and spent a third of the row saying so. */}
      <View style={styles.actions}>
        <Button
          label={
            module ? 'Next'
              : step === GOALS_STEP ? 'See my starting track'
                // "Start learning" on every path now, including a retake: the button leads
                // into the intro and then Home, so "Save my track" would name the smaller
                // half of what it does.
                : 'Start learning'
          }
          // White until a number is picked, green once one is. The colour IS the receipt for
          // the tap, which is what the auto-advance used to be; unanswered, the button simply
          // doesn't go anywhere rather than looking broken.
          variant={module && familiarity[module.id] === undefined ? 'ghost' : 'green'}
          onPress={() => { if (!module || familiarity[module.id] !== undefined) next(); }}
          style={{ flex: 1 }}
        />
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
/**
 * Hammy, reacting when his face changes.
 *
 * A face that swaps silently reads as a bug — the drawing is identical apart from the eyes and
 * mouth, so at a glance nothing appears to have happened. He reacts, which is what makes the
 * swap read as HIM responding rather than as an image being replaced.
 *
 * The reaction is Hammy's OWN 'happy' one — the exact animation the quest player plays when
 * you get a question right (hammyBounce, ported from the website's keyframes; see Hammy.tsx).
 * This screen used to hand-roll its own instead: a spring that lifted him 9px, tilted him 5
 * degrees and scaled him up 6%. The tilt is what made it look wrong — it is a resting pose
 * held at an angle for the length of a spring, not a beat of movement, so between answers he
 * simply sat there crooked. Reusing the real one means he rests straight and only ever moves
 * as part of a reaction, and the survey stops being the one place in the app with its own
 * private idea of how the mascot responds to you.
 */
function ReactingHammy({ face }: { face: FaceOverlay }) {
  // Bumped rather than derived from the face, so picking the SAME number twice still replays
  // the reaction — the identical rule Hammy's own reactionKey exists for in the quest player.
  const [reactionKey, setReactionKey] = useState(0);
  const first = useRef(true);
  useEffect(() => {
    // Not on mount: the unanswered face is the resting state, not a reaction to anything.
    if (first.current) { first.current = false; return; }
    setReactionKey((k) => k + 1);
  }, [face]);

  return (
    <View style={styles.qHammy}>
      <Hammy size={92} bob={false} face={face} reaction="happy" reactionKey={reactionKey} />
    </View>
  );
}

/**
 * One point on the scale.
 *
 * Selection SPRINGS rather than switching: the chosen number swells past its resting size and
 * settles back, which is what makes a tap feel like it landed on something. Its own press
 * squeeze runs on a separate channel so the two can't fight — the same two-channel shape
 * Option uses for its press-versus-verdict animations.
 */
function ScaleDot({
  value, label, on, onPick,
}: { value: number; label: string; on: boolean; onPick: (n: number) => void }) {
  const press = useSharedValue(0);
  const select = useSharedValue(on ? 1 : 0);

  useEffect(() => {
    select.value = on
      // Overshoot and settle. Low damping on the way in is the "pop"; the resting spring is
      // stiffer so it doesn't wobble afterwards.
      ? withSequence(withSpring(1.18, { damping: 9, stiffness: 320 }), withSpring(1, { damping: 15, stiffness: 260 }))
      : withTiming(0, { duration: 160 });
  }, [on, select]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: (1 - press.value * 0.08) * (1 + select.value * 0.12) }],
  }));

  return (
    <AnimatedPressable
      onPress={() => onPick(value)}
      onPressIn={() => { press.value = withTiming(1, { duration: 70 }); }}
      onPressOut={() => { press.value = withSpring(0, { damping: 18, stiffness: 420, overshootClamping: true }); }}
      accessibilityRole="button"
      accessibilityLabel={`${value}, ${label}`}
      accessibilityState={{ selected: on }}
      hitSlop={6}
      style={style}
    >
      <View style={[styles.scaleDot, on && styles.scaleDotOn]}>
        <Txt style={[styles.scaleNum, on && styles.scaleNumOn]}>{value}</Txt>
      </View>
    </AnimatedPressable>
  );
}

function ScalePicker({ value, onPick }: { value?: number; onPick: (n: number) => void }) {
  const picked = SCALE.find((s) => s.value === value);
  return (
    <View style={{ marginTop: 18 }}>
      <View style={styles.scaleRow}>
        {/* The rail the points sit on. Behind them, inset so it doesn't poke out either end. */}
        <View style={styles.scaleRail} pointerEvents="none" />
        {SCALE.map((s) => (
          <ScaleDot
            key={s.value}
            value={s.value}
            label={s.label}
            on={value === s.value}
            onPick={onPick}
          />
        ))}
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

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 2 },
  step: { fontFamily: font.bold, fontSize: 12, color: colors.green },
  body: { paddingTop: 10, paddingBottom: 18 },
  eyebrow: { fontFamily: font.extra, fontSize: 12, color: colors.greenDark, letterSpacing: 0.9 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  modName: { fontFamily: font.extra, fontSize: 13.5, color: colors.ink },

  // A column rather than a scroll: the topic card sits at the top and the scale takes the
  // whole rest of the screen, which is space the anchor quotes used to spend saying in two
  // long sentences what the numbers already say.
  qBody: { flex: 1, paddingTop: 8, paddingBottom: 8 },
  qAsk: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qHammy: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center' },
  qCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: radius.card, borderWidth: 2, padding: 14,
  },
  // Padding rather than a border, so the ring is a solid band of white with the chip's own
  // rounding showing through it — a 3px border on the tile itself would sit inside the
  // corner radius and read as a hairline.
  qIconRing: { backgroundColor: colors.white, borderRadius: 19, padding: 3 },
  // 0.85 rather than the old 0.75: this is 11px of letter-spaced caps, the smallest text on
  // the card, and it is now carrying its own contrast instead of borrowing a dark ink colour.
  // Pure black, and the same black on every module including Managing Risk. These two lines
  // used to take the module's own ink — a dark tint of its hue — which is a different colour
  // eleven times over and reads as washed out against a pale card. Full opacity too: 0.85 on
  // 11px caps was throwing away contrast the card could not spare.
  qTopic: { fontFamily: font.extra, fontSize: 11, letterSpacing: 0.9, color: colors.black },
  qModule: { fontFamily: font.display, fontSize: 22, color: colors.black },

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
    shadowColor: colors.greenDark,
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
