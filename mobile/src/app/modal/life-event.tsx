import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt, Button, Tag, Option } from '@/components';
import { colors, font } from '@/theme';
import { useStore } from '@/store';

/** Screen 21 — "Life happens…" life-event card. Real scenarios ported from the website's
 * LIFE_EVENTS/LIFE_EVENT_UNLOCKS, triggered by the store after a lesson completes. */
export default function LifeEvent() {
  const router = useRouter();
  const { pendingLifeEvent, resolveLifeEvent } = useStore();
  const [event] = useState(() => pendingLifeEvent());
  const [answeredId, setAnsweredId] = useState<string | null>(null);
  const answeredChoice = event?.choices.find((c) => c.id === answeredId);

  const done = () => {
    router.dismissAll();
    router.replace('/(tabs)/home');
  };

  const pick = (choiceId: string) => {
    setAnsweredId(choiceId);
    resolveLifeEvent(choiceId);
  };

  if (!event) {
    return (
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={done}>
          <View style={styles.scrim} />
        </Pressable>
        <SafeAreaView edges={['bottom']} style={styles.anchor}>
          <View style={styles.sheet}>
            <Txt variant="h1">All quiet for now</Txt>
            <Button label="Close" onPress={done} style={{ marginTop: 16 }} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={answeredChoice ? done : undefined}>
        <View style={styles.scrim} />
      </Pressable>
      <SafeAreaView edges={['bottom']} style={styles.anchor}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={{ alignItems: 'center', gap: 6 }}>
            <View style={styles.emoji}>
              <Txt style={{ fontSize: 38 }}>{answeredChoice ? (answeredChoice.coinDelta ? '🎉' : '😬') : '⚠️'}</Txt>
            </View>
            <Tag tone="warm" style={{ marginTop: 6 }}>✨ {event.tag.toUpperCase()}</Tag>
            <Txt variant="disp" style={{ marginTop: 4, textAlign: 'center' }}>{event.title}</Txt>
            <Txt variant="lead" style={{ textAlign: 'center' }}>
              {answeredChoice ? answeredChoice.result : event.scenario}
            </Txt>
          </View>

          {!answeredChoice ? (
            <View style={{ gap: 10, marginTop: 18 }}>
              {event.choices.map((c) => (
                <Option
                  key={c.id}
                  label={c.label}
                  state="default"
                  onPress={() => pick(c.id)}
                  right={c.coinDelta ? <Tag tone="green">🪙 +{c.coinDelta}</Tag> : undefined}
                />
              ))}
            </View>
          ) : (
            <Button label="Continue" onPress={done} style={{ marginTop: 16 }} />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { flex: 1, backgroundColor: 'rgba(22,32,23,0.62)' },
  anchor: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.screen,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 22,
  },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#D6DFCF', alignSelf: 'center', marginBottom: 16 },
  emoji: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F9E6C6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: '#FBF3E4',
  },
});
