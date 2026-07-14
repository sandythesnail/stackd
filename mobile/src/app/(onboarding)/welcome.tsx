import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Spacer, Txt, Button, Dots, Slot } from '@/components';
import { colors, font } from '@/theme';

const SLIDES = [
  {
    title: 'Learn money,\nthe fun way.',
    body: 'Bite-sized quests turn budgeting, saving, and investing into a daily habit you actually keep.',
  },
  {
    title: 'Money skills,\nminus the stress.',
    body: 'Quick quests across 11 modules — from your first paycheck to filing taxes. Learn a little every day, no finance degree required.',
  },
  {
    title: 'Meet Hammy,\nyour money buddy.',
    body: 'Feed him good habits and watch your piglet grow up right alongside your savings.',
  },
];

/** Screen 2 — Welcome / value prop (swipeable, 3 slides). */
export default function Welcome() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];

  const next = () => (last ? router.push('/(onboarding)/signup') : setI(i + 1));

  return (
    <Screen style={{ paddingHorizontal: 22 }}>
      <View style={styles.top}>
        <Pressable onPress={() => router.push('/(onboarding)/signup')} hitSlop={10}>
          <Txt style={styles.skip}>Skip</Txt>
        </Pressable>
      </View>

      <Slot height={300} radius={28} label="hammy" style={{ marginTop: 6 }} />

      <View style={{ gap: 14, marginTop: 30 }}>
        <Txt variant="disp" style={{ fontSize: 32 }}>{slide.title}</Txt>
        <Txt variant="lead">{slide.body}</Txt>
      </View>

      <Spacer />
      <Dots count={SLIDES.length} active={i} />
      <Button label={last ? 'Get started' : 'Next'} variant="pink" onPress={next} style={{ marginTop: 20, marginBottom: 12 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 4 },
  skip: { fontFamily: font.extra, fontSize: 14, color: colors.muted5 },
});
