import { useState } from 'react';
import { View, StyleSheet, useWindowDimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { Txt, Button, LifeEventCard } from '@/components';
import { colors } from '@/theme';
import { useStore } from '@/store';
import { LIFE_EVENT_SHEET_HEIGHT_PCT } from '@/lifeEventLayout';

/** Screen 21 — "Life happens…" life-event card. Real scenarios ported from the website's
 * LIFE_EVENTS/LIFE_EVENT_UNLOCKS, triggered by the store after a lesson completes. Presented
 * as a bottom sheet; the card body itself (LifeEventCard) is shared with the ambient
 * mid-lesson popup in learn/quest.tsx so the two always look identical. */
export default function LifeEvent() {
  const router = useRouter();
  const { pendingLifeEvent, resolveLifeEvent } = useStore();
  const [event] = useState(() => pendingLifeEvent());

  // Return to the Modules tab (where the lesson was launched from). That tab lives in a
  // different nested navigator than this root-Stack screen — replace() across that boundary
  // is unreliable (see results.tsx's continuePress for the full story of the "broken route"
  // this caused); push() instead.
  const done = () => {
    router.push('/(tabs)/modules');
  };

  const { height: winH } = useWindowDimensions();
  const sheetHeight = winH * LIFE_EVENT_SHEET_HEIGHT_PCT;

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, styles.scrim]} />
      </View>
      <SafeAreaView edges={['bottom']} style={styles.anchor}>
        <Animated.View entering={SlideInDown.duration(320)} style={[styles.sheet, { height: sheetHeight }]}>
          <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
            {event ? (
              <LifeEventCard event={event} onResolve={resolveLifeEvent} onDone={done} />
            ) : (
              <View style={{ gap: 16 }}>
                <Txt variant="h1">All quiet for now</Txt>
                <Button label="Close" onPress={done} />
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: 'rgba(22,32,23,0.55)' },
  anchor: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
  },
  sheetContent: { paddingHorizontal: 22, paddingBottom: 24 },
});
