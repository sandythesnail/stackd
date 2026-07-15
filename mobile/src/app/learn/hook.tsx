import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt, Button, Tag, IconButton, Spacer } from '@/components';
import { colors, font } from '@/theme';
import { moduleById } from '@/data';
import { moduleContentById } from '@/content';

/** Screen 16 — Hook (scenario intro, one CTA). Real hook text per lesson. */
export default function Hook() {
  const router = useRouter();
  const { moduleId, lessonIndex } = useLocalSearchParams<{ moduleId: string; lessonIndex: string }>();
  const mod = moduleById(moduleId ?? 'saving') ?? moduleById('saving')!;
  const content = moduleContentById(mod.id);
  const i = Number(lessonIndex ?? 0);
  const lesson = content?.lessons[i];

  return (
    <View style={{ flex: 1, backgroundColor: '#2C3E2D' }}>
      <StatusBar style="light" />
      {/* scenario art placeholder */}
      <LinearGradient colors={['#7C8E78', '#556355']} style={StyleSheet.absoluteFill} />
      {/* legibility scrim */}
      <LinearGradient
        colors={['rgba(44,62,45,0.15)', 'rgba(44,62,45,0.55)', 'rgba(30,42,31,0.94)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.wrap}>
        <IconButton name="chevron-left" size={36} color={colors.white} onPress={() => router.back()} style={styles.back} />
        <Spacer />
        <Tag tone="pink" textColor={colors.white} style={styles.tag}>📖 SCENARIO</Tag>
        <Txt style={styles.title}>{lesson?.title ?? mod.name}</Txt>
        <Txt style={styles.body}>{lesson?.hook ?? content?.hook ?? ''}</Txt>
        <Button
          label="Start quest →"
          variant="pink"
          onPress={() => router.push({ pathname: '/learn/quiz', params: { moduleId: mod.id, lessonIndex: String(i) } })}
          style={{ marginTop: 22 }}
        />
        <Txt style={styles.foot}>LESSON {i + 1} · {mod.name.toUpperCase()}</Txt>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 22, paddingBottom: 22 },
  back: { backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 0, marginTop: 6 },
  tag: { backgroundColor: 'rgba(255,150,184,0.9)' },
  title: { fontFamily: font.display, fontSize: 34, color: colors.white, marginTop: 12, lineHeight: 37 },
  body: { fontFamily: font.semi, fontSize: 15, color: 'rgba(250,246,237,0.92)', marginTop: 10, lineHeight: 22 },
  foot: { fontFamily: font.extra, fontSize: 12, color: 'rgba(250,246,237,0.75)', marginTop: 12, textAlign: 'center' },
});
