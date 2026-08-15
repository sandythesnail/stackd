import { Modal, View, Pressable, StyleSheet } from 'react-native';
import Reanimated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { colors, font, radius } from '@/theme';
import { useStore } from '@/store';
import { MOOD_FACES } from '@/hammyFaces';
import { Txt } from './Txt';
import { Button } from './Button';
import { Hammy } from './Hammy';
import { Diamond } from './Currency';

/**
 * "You levelled up", said out loud and paid for.
 *
 * Levelling used to be silent. XP accumulated, the number in the header changed, and nothing
 * marked the moment — so the one recurring progression the app has ran entirely without
 * acknowledgement, while much smaller things (a daily coin drip, a badge) got their own
 * screens. The diamonds are what make it more than a message: they are the second source of
 * the currency that buys Diamond Exclusives, alongside streaks, which is why the shop now
 * says so.
 *
 * Mounted once at the root (see _layout.tsx) rather than on the screen that grants the XP,
 * because XP is granted in two different places and could be granted in more later. It reads
 * the banner the store sets and shows itself, wherever the player happens to be.
 */
export function LevelUpModal() {
  const { state, dismissLevelUpBanner } = useStore();
  const banner = state.levelUpBanner;
  if (!banner) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismissLevelUpBanner}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissLevelUpBanner} accessibilityLabel="Close" />
        <Reanimated.View entering={ZoomIn.springify().damping(14).stiffness(180)} style={styles.card}>
          <Hammy size={110} bob={false} face={MOOD_FACES.star} />

          <Txt variant="h1" style={styles.title}>Congratulations!</Txt>
          <Txt style={styles.sub}>You&apos;ve levelled up to level {banner.level}.</Txt>

          {banner.diamonds > 0 ? (
            <Reanimated.View entering={FadeIn.delay(180).duration(260)} style={styles.reward}>
              <Diamond size={20} />
              <Txt style={styles.rewardTxt}>+{banner.diamonds} diamonds</Txt>
            </Reanimated.View>
          ) : null}

          <Button label="Nice!" onPress={dismissLevelUpBanner} style={{ alignSelf: 'stretch', marginTop: 18 }} />
        </Reanimated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(22,32,23,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 26,
  },
  card: {
    width: '100%', maxWidth: 340, alignItems: 'center',
    backgroundColor: colors.white, borderRadius: radius.card,
    borderWidth: 1.5, borderColor: colors.border, padding: 22,
  },
  title: { marginTop: 6 },
  sub: { fontFamily: font.semi, fontSize: 14.5, lineHeight: 20, color: colors.muted2, textAlign: 'center', marginTop: 4 },
  reward: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14,
    backgroundColor: colors.tagGreenBg, borderRadius: radius.pill,
    paddingVertical: 8, paddingHorizontal: 16,
  },
  rewardTxt: { fontFamily: font.extra, fontSize: 15, color: colors.tagGreenText },
});
