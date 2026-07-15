import { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { Screen, Spacer, Txt, Button, Option, ProgressBar, IconButton, Card, MIcon } from '@/components';
import { colors, font } from '@/theme';
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
    router.replace('/(tabs)/home');
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
                    <MIcon abbr={m.abbr} color={m.color} size={26} r={8} fontSize={11} />
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
              <Option key={g.id} label={g.label} state={focusGoals.has(g.id) ? 'on' : 'default'} onPress={() => toggleGoal(g.id)} />
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          <View style={{ gap: 6, marginTop: 8 }}>
            <Txt style={styles.eyebrow}>YOU'RE ALL SET</Txt>
            <Txt variant="h1">Your starting track</Txt>
          </View>

          <Card style={{ marginTop: 16, gap: 10 }}>
            <Txt variant="h2">{activeTrack.title}</Txt>
            <Txt variant="lead" style={{ fontSize: 13 }}>{trackReason(activeTrack, answers)}</Txt>
            <View style={{ gap: 8, marginTop: 4 }}>
              {activeTrack.moduleIds.map((id, i) => {
                const m = modules.find((x) => x.id === id);
                if (!m) return null;
                return (
                  <View key={id} style={styles.trackRow}>
                    <View style={styles.trackStep}><Txt style={styles.trackStepTxt}>{i + 1}</Txt></View>
                    <MIcon abbr={m.abbr} color={m.color} size={30} r={9} fontSize={12} />
                    <Txt style={styles.modName}>{m.name}</Txt>
                  </View>
                );
              })}
            </View>
          </Card>

          <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.muted5, marginTop: 18 }}>PREFER A DIFFERENT TRACK?</Txt>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {SURVEY_TRACKS.filter((t) => t.id !== activeTrack.id).map((t) => (
              <Button key={t.id} label={t.title} variant="ghost" size="sm" onPress={() => setTrackId(t.id)} />
            ))}
          </View>
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
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trackStep: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  trackStepTxt: { fontFamily: font.extra, fontSize: 11, color: colors.white },
});
