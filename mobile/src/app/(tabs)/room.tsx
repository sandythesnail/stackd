import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Screen, Header, Txt, Button, Hammy, Slot } from '@/components';
import { colors, font } from '@/theme';
import { user } from '@/data';
import { shopItemById } from '@/content';

/** Screen 12 — Room (Hammy's scene & outfit). */
export default function Room() {
  const router = useRouter();
  const equipped = user.equippedItemIds.map(shopItemById).filter((i) => i !== undefined);
  const wearingLabel = equipped.length ? equipped.map((i) => i.name).join(' + ') : 'Nothing yet';

  return (
    <Screen edges={['top']}>
      <Header level={user.level} name="Hammy's Room" coins={user.coins} diamonds={user.diamonds} />
      <View style={styles.wrap}>
        <View style={styles.scene}>
          <LinearGradient colors={['#FBEFF3', '#FBEFF3', '#EADFC8']} locations={[0, 0.62, 0.62]} style={StyleSheet.absoluteFill} />
          <Slot width={66} height={86} radius={12} style={styles.poster} colors={['#F4E9DC', '#E7D4BE']} />
          <Slot width={64} height={64} radius={14} style={styles.plant} colors={['#DFF0DA', '#BFE0B6']} />

          <View style={styles.shadow} />
          <Hammy size={218} ring equipped={equipped} style={styles.hammy} />

          <View style={styles.wearing}>
            <Txt style={styles.wearingTxt}>Wearing: {wearingLabel} 🐷</Txt>
          </View>
        </View>

        <View style={styles.actions}>
          <Button label="Change outfit" variant="ghost" size="sm" style={{ flex: 1 }} />
          <Button label="Visit shop →" variant="pink" size="sm" onPress={() => router.push('/(tabs)/shop')} style={{ flex: 1 }} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 16, paddingTop: 6 },
  scene: {
    flex: 1,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#EFE4D6',
  },
  poster: { position: 'absolute', top: 18, left: 18 },
  plant: { position: 'absolute', top: 20, right: 18 },
  shadow: {
    position: 'absolute',
    bottom: 38,
    alignSelf: 'center',
    width: 210,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(107,143,101,0.22)',
  },
  hammy: { position: 'absolute', bottom: 44, alignSelf: 'center' },
  wearing: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#EFE4D6',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  wearingTxt: { fontFamily: font.extra, fontSize: 12, color: colors.pinkDark },
  actions: { flexDirection: 'row', gap: 10, paddingVertical: 14 },
});
