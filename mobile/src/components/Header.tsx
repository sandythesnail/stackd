import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font } from '@/theme';
import { Txt } from './Txt';
import { Coin, Diamond } from './Currency';
import { IconButton } from './IconButton';

/** Currency chip (coin / diamond count) used in the header and balances. */
export function CurrencyChip({ kind, value }: { kind: 'coin' | 'diamond'; value: number }) {
  return (
    <View style={styles.chip}>
      {kind === 'coin' ? <Coin /> : <Diamond />}
      <Txt style={styles.chipVal}>{value}</Txt>
    </View>
  );
}

/** Level tier badge (avatar + name + level). */
export function TierBadge({ level, name }: { level: number; name: string }) {
  return (
    <View style={styles.tier}>
      <LinearGradient
        colors={[colors.greenSoft, colors.green]}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.tierIc}
      >
        <Txt style={styles.tierIcTxt}>{level}</Txt>
      </LinearGradient>
      <View>
        <Txt style={styles.tierName}>{name}</Txt>
        <Txt style={styles.tierLvl}>LEVEL {level}</Txt>
      </View>
    </View>
  );
}

/** Standard app header: tier badge on the left, currency chips on the right. */
export function Header({
  level = 4,
  name = 'Sophomore Saver',
  coins = 340,
  diamonds = 8,
  title,
  onGear,
}: {
  level?: number;
  name?: string;
  coins?: number;
  diamonds?: number;
  title?: string;
  onGear?: () => void;
}) {
  return (
    <View style={styles.hdr}>
      {title ? <Txt variant="disp" style={{ fontSize: 23 }}>{title}</Txt> : <TierBadge level={level} name={name} />}
      <View style={styles.chips}>
        <CurrencyChip kind="coin" value={coins} />
        <CurrencyChip kind="diamond" value={diamonds} />
        {onGear ? <IconButton name="settings" size={36} iconSize={18} color={colors.muted3} onPress={onGear} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  chips: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.borderCool,
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 9,
    paddingRight: 12,
  },
  chipVal: { fontFamily: font.extra, fontSize: 14, color: colors.ink },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.borderCool,
    borderRadius: 24,
    paddingVertical: 4,
    paddingLeft: 5,
    paddingRight: 14,
  },
  tierIc: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierIcTxt: { fontFamily: font.display, fontSize: 15, color: colors.white },
  tierName: { fontFamily: font.extra, fontSize: 14, lineHeight: 15, color: colors.ink },
  tierLvl: { fontFamily: font.bold, fontSize: 10.5, color: colors.muted4, letterSpacing: 0.2 },
});
