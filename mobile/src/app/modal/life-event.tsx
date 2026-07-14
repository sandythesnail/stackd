import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt, Button, Tag, Option } from '@/components';
import { colors, font } from '@/theme';

/** Screen 21 — "Life happens…" life-event card. */
export default function LifeEvent() {
  const router = useRouter();
  const [sel, setSel] = useState(0);
  return (
    <View style={styles.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()}>
        <View style={styles.scrim} />
      </Pressable>
      <SafeAreaView edges={['bottom']} style={styles.anchor}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={{ alignItems: 'center', gap: 6 }}>
            <View style={styles.emoji}>
              <Txt style={{ fontSize: 38 }}>🧥</Txt>
            </View>
            <Tag tone="warm" style={{ marginTop: 6 }}>✨ LIFE HAPPENS…</Tag>
            <Txt variant="disp" style={{ marginTop: 4 }}>You found $40!</Txt>
            <Txt variant="lead" style={{ textAlign: 'center' }}>
              Digging through your winter coat, you find a crumpled $40 you forgot about. Nice. What&apos;s the move?
            </Txt>
          </View>

          <View style={{ gap: 10, marginTop: 18 }}>
            <Option
              label="Move it to savings"
              state={sel === 0 ? 'on' : 'default'}
              onPress={() => setSel(0)}
              right={<Tag tone="green">+30 XP</Tag>}
            />
            <Option
              label="Treat yourself tonight"
              state={sel === 1 ? 'on' : 'default'}
              onPress={() => setSel(1)}
              right={<Tag tone="pink">+5 XP</Tag>}
            />
          </View>

          <Button label="Confirm choice" onPress={() => router.back()} style={{ marginTop: 16 }} />
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
