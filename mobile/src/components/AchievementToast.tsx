import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font } from '@/theme';
import { useStore } from '@/store';
import { Txt } from './Txt';
import { BadgeMedal } from './ModuleBits';

/** Global "Achievement unlocked!" toast — appears over whatever screen is active whenever
 * the store reports a newly-unlocked badge (mirrors the website's toast on achievement
 * unlock), auto-dismissing after 3.5s like showToast(). */
export function AchievementToast() {
  const { newAchievements, dismissNewAchievements } = useStore();
  const unlocked = newAchievements();
  const first = unlocked[0];
  const y = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (!first) return;
    // This component stays mounted for the app's lifetime (rendered once at the root) —
    // when `first` is falsy it just returns null rather than unmounting, so `y` (a ref)
    // persists across toasts. Without resetting it back off-screen here first, only the
    // very FIRST achievement toast of the session ever actually slides in: every
    // subsequent one starts the spring from wherever the previous toast left `y` (already
    // 0), which is a no-op — the toast just pops into place with no animation.
    y.setValue(-120);
    Animated.spring(y, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    const t = setTimeout(dismissNewAchievements, 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first?.id]);

  if (!first) return null;

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.root}>
      <Animated.View style={[styles.toastWrap, { transform: [{ translateY: y }] }]}>
        <Pressable style={styles.toast} onPress={dismissNewAchievements}>
          <BadgeMedal icon={first.icon} color={first.color} tier={first.tier} size={44} />
          <View style={{ flex: 1 }}>
            <Txt style={styles.eyebrow}>ACHIEVEMENT UNLOCKED</Txt>
            <Txt style={styles.label}>{first.label}</Txt>
          </View>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  toastWrap: { width: '92%', marginTop: 6 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#2C3E2D',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  eyebrow: { fontFamily: font.extra, fontSize: 10, color: colors.pinkDark, letterSpacing: 0.5 },
  label: { fontFamily: font.display, fontSize: 16, color: colors.ink, marginTop: 1 },
});
