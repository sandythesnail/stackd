import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Screen, Spacer, Txt, Button, Option, ProgressBar, IconButton, MIcon } from '@/components';
import { colors, font, radius } from '@/theme';
import { modules } from '@/data';
import { SURVEY_GOALS, SURVEY_FAMILIARITY_LABELS, SURVEY_TRACKS, getRecommendedTrack, trackReason, type SurveyAnswers } from '@/survey';
import { useStore } from '@/store';

type Step = 0 | 1 | 2;

/** Screen 6 — Onboarding survey. Real per-module familiarity + goals (SURVEY_FAMILIARITY_
 * LABELS/SURVEY_GOALS) feeding the website's real track-recommendation scoring, as three
 * steps: familiarity sliders, then the goals ("financial toolkit") multiple-choice, then
 * the recommended-track results — instead of the website's 12-step wizard. */
export default function Survey() {
  const router = useRouter();
  const { setOnboardingTrack } = useStore();
  const [step, setStep] = useState<Step>(0);
  const [familiarity, setFamiliarity] = useState<Record<string, number>>(
    () => Object.fromEntries(modules.map((m) => [m.id, 3])),
  );
  const [focusGoals, setFocusGoals] = useState<Set<string>>(new Set());
  const [trackId, setTrackId] = useState<string | null>(null);

  const toggleGoal = (id: string) =>
    setFocusGoals((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const answers: SurveyAnswers = { moduleFamiliarity: familiarity, focusGoals: [...focusGoals] };
  const activeTrack = SURVEY_TRACKS.find((t) => t.id === trackId) ?? getRecommendedTrack(answers);

  const finish = () => {
    setOnboardingTrack(activeTrack.id);
    // push, not replace — this screen lives in the (onboarding) nested navigator, and
    // replace() doesn't reliably cross into a different top-level branch like (tabs) (see
    // results.tsx's continuePress for the full story of the "route doesn't exist"/
    // blank-screen crash this causes).
    router.push('/(tabs)/home');
  };

  const back = () => {
    if (step === 0) { router.back(); return; }
    setStep((step - 1) as Step);
  };
  const next = () => {
    if (step === 2) { finish(); return; }
    setStep((step + 1) as Step);
  };

  return (
    <Screen style={{ paddingHorizontal: 22 }}>
      <View style={styles.topbar}>
        <IconButton name="chevron-left" onPress={back} />
        <ProgressBar value={(step + 1) / 3} style={{ flex: 1 }} />
        <Txt style={styles.step}>{step + 1} / 3</Txt>
      </View>

      {step === 0 ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          <View style={{ gap: 6, marginTop: 8 }}>
            <Txt style={styles.eyebrow}>GET TO KNOW YOU</Txt>
            <Txt variant="h1">How familiar are you with each topic?</Txt>
            <Txt variant="lead">Drag each slider — there are no wrong answers, we just meet you where you are.</Txt>
          </View>

          <View style={{ gap: 18, marginTop: 14 }}>
            {modules.map((m) => {
              const [lo, hi] = SURVEY_FAMILIARITY_LABELS[m.id] ?? ['', ''];
              return (
                <View key={m.id} style={{ gap: 6 }}>
                  <View style={styles.modRow}>
                    <MIcon abbr={m.icon} color={m.color} textColor={m.textColor} size={26} r={8} fontSize={11} />
                    <Txt style={styles.modName}>{m.name}</Txt>
                  </View>
                  <Slider
                    minimumValue={1}
                    maximumValue={5}
                    step={1}
                    value={familiarity[m.id] ?? 3}
                    onValueChange={(v) => setFamiliarity((prev) => ({ ...prev, [m.id]: v }))}
                    minimumTrackTintColor={colors.green}
                    maximumTrackTintColor={colors.track}
                    thumbTintColor={colors.green}
                  />
                  <View style={styles.tickRow}>
                    {[1, 2, 3, 4, 5].map((n) => <Txt key={n} style={styles.tick}>{n}</Txt>)}
                  </View>
                  <View style={styles.labelRow}>
                    <Txt style={styles.endLabel} numberOfLines={2}>{lo}</Txt>
                    <Txt style={[styles.endLabel, { textAlign: 'right' }]} numberOfLines={2}>{hi}</Txt>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : step === 1 ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          <View style={{ gap: 6, marginTop: 8 }}>
            <Txt style={styles.eyebrow}>YOUR FINANCIAL TOOLKIT</Txt>
            <Txt variant="h1">What are you hoping to get out of Stackd?</Txt>
            <Txt variant="lead">Select all that apply — this helps us recommend where to start.</Txt>
          </View>

          <View style={{ gap: 10, marginTop: 14 }}>
            {SURVEY_GOALS.map((g) => (
              <Option key={g.id} label={g.label} control="check" state={focusGoals.has(g.id) ? 'on' : 'default'} onPress={() => toggleGoal(g.id)} />
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          <View style={{ gap: 6, marginTop: 8 }}>
            <Txt style={styles.eyebrow}>YOU'RE ALL SET</Txt>
            <Txt variant="h1">Your starting track</Txt>
          </View>

          <LinearGradient
            colors={[colors.pink, colors.pinkDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroTag}>
              <Txt style={styles.heroTagTxt}>RECOMMENDED FOR YOU</Txt>
            </View>
            <Txt style={styles.heroTitle}>{activeTrack.title}</Txt>
            <Txt style={styles.heroBlurb}>{trackReason(activeTrack, answers)}</Txt>
          </LinearGradient>

          <View style={{ marginTop: 22 }}>
            <Txt style={styles.pathLabel}>YOUR PATH</Txt>
            <Txt style={styles.pathCaption}>These {activeTrack.moduleIds.length} modules, in order — you can always explore the rest later.</Txt>
            <View style={{ marginTop: 12 }}>
              {activeTrack.moduleIds.map((id, i) => {
                const m = modules.find((x) => x.id === id);
                if (!m) return null;
                const isLast = i === activeTrack.moduleIds.length - 1;
                return (
                  <View key={id} style={styles.pathRow}>
                    <View style={styles.pathRail}>
                      <View style={styles.pathDot}><Txt style={styles.pathDotTxt}>{i + 1}</Txt></View>
                      {!isLast ? <View style={styles.pathLine} /> : null}
                    </View>
                    <View style={styles.pathCard}>
                      <MIcon abbr={m.icon} color={m.color} textColor={m.textColor} size={34} r={10} fontSize={13} />
                      <Txt style={styles.modName}>{m.name}</Txt>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <Txt style={[styles.pathLabel, { marginTop: 6 }]}>PREFER A DIFFERENT TRACK?</Txt>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingTop: 10, paddingRight: 6 }}
          >
            {SURVEY_TRACKS.filter((t) => t.id !== activeTrack.id).map((t) => (
              <Pressable key={t.id} onPress={() => setTrackId(t.id)} style={styles.altCard}>
                <Txt style={styles.altCardTitle}>{t.title}</Txt>
                <Txt style={styles.altCardBlurb} numberOfLines={3}>{t.blurb}</Txt>
              </Pressable>
            ))}
          </ScrollView>
        </ScrollView>
      )}

      <Spacer />
      <View style={styles.actions}>
        <Button label="Back" variant="ghost" onPress={back} style={{ paddingHorizontal: 22 }} />
        <Button
          label={step === 0 ? 'Next →' : step === 1 ? 'See my starting track →' : 'Start learning'}
          onPress={next}
          style={{ flex: 1 }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 2 },
  step: { fontFamily: font.bold, fontSize: 12, color: colors.green },
  eyebrow: { fontFamily: font.extra, fontSize: 12, color: colors.pinkDark, letterSpacing: 0.9, textTransform: 'uppercase' },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  modRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modName: { fontFamily: font.extra, fontSize: 13.5, color: colors.ink },
  tickRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 },
  tick: { fontFamily: font.bold, fontSize: 10, color: colors.muted5 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  endLabel: { fontFamily: font.semi, fontSize: 10.5, color: colors.muted3, flex: 1 },
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
  pathLabel: { fontFamily: font.extra, fontSize: 12, color: colors.muted5, letterSpacing: 0.5 },
  pathCaption: { fontFamily: font.semi, fontSize: 13, color: colors.muted2, marginTop: 4 },
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
  altCard: {
    width: 200,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    gap: 6,
  },
  altCardTitle: { fontFamily: font.extra, fontSize: 14, color: colors.ink },
  altCardBlurb: { fontFamily: font.medium, fontSize: 12, lineHeight: 16.5, color: colors.muted2 },
});
