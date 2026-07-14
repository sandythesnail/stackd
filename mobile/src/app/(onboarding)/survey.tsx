import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Spacer, Txt, Button, Option, ProgressBar, IconButton } from '@/components';
import { colors, font } from '@/theme';

const CHOICES = [
  'A checking account',
  'A debit card',
  'A credit card',
  'A monthly budget',
  'Some money saved up',
  'None of these yet',
];

/** Screen 6 — Onboarding survey (step 2 of 6). */
export default function Survey() {
  const router = useRouter();
  const [sel, setSel] = useState<Set<number>>(new Set([0, 1]));

  const toggle = (i: number) =>
    setSel((prev) => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });

  return (
    <Screen style={{ paddingHorizontal: 22 }}>
      <View style={styles.topbar}>
        <IconButton name="chevron-left" onPress={() => router.back()} />
        <ProgressBar value={0.33} style={{ flex: 1 }} />
        <Txt style={styles.step}>2 / 6</Txt>
      </View>

      <View style={{ gap: 6, marginTop: 8 }}>
        <Txt style={styles.eyebrow}>YOUR FINANCIAL TOOLKIT</Txt>
        <Txt variant="h1">Which of these do you already have?</Txt>
        <Txt variant="lead">Select all that apply — there are no wrong answers, we just meet you where you are.</Txt>
      </View>

      <View style={{ gap: 10, marginTop: 18 }}>
        {CHOICES.map((c, i) => (
          <Option key={c} label={c} state={sel.has(i) ? 'on' : 'default'} onPress={() => toggle(i)} />
        ))}
      </View>

      <Spacer />
      <View style={styles.actions}>
        <Button label="Back" variant="ghost" onPress={() => router.back()} style={{ paddingHorizontal: 22 }} />
        <Button label="Next" onPress={() => router.replace('/(tabs)/home')} style={{ flex: 1 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 2 },
  step: { fontFamily: font.bold, fontSize: 12, color: colors.green },
  eyebrow: { fontFamily: font.extra, fontSize: 12, color: colors.pinkDark, letterSpacing: 0.9, textTransform: 'uppercase' },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
});
