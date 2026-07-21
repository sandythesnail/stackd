import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, font, radius } from '@/theme';
import { BADGE_TIER_REWARD, TIER_LABELS, type Achievement } from '@/achievements';
import type { AchievementView } from '@/store';
import { Txt } from './Txt';
import { Button } from './Button';
import { BadgeMedal } from './ModuleBits';
import { Coin, Diamond } from './Currency';

/** Pastel tier chip colors — ported from the website's .achievement-modal-tier-chip.tier-*
 * (app.css). Separate from each badge's own per-badge color (used on the icon/border). */
const TIER_CHIP: Record<Achievement['tier'], { bg: string; text: string }> = {
  bronze: { bg: '#F5E3D0', text: '#8A5A24' },
  silver: { bg: '#EAEEF1', text: '#4A5560' },
  gold: { bg: '#FFF3CE', text: '#7A5A00' },
  diamond: { bg: '#DEF7FC', text: '#0B5F74' },
};

/** Tap-to-preview achievement detail, ported from the website's showAchievementDetail —
 * every badge, earned or not, opens the same card: tier chip, icon, unlocked/locked status,
 * title, the "how to earn it" description, and the reward payout. Shared by the Badges tab
 * grid and Home's "Recent badges" row so both behave identically. */
export function AchievementDetailModal({
  achievement,
  onClose,
}: {
  achievement: AchievementView | null;
  onClose: () => void;
}) {
  if (!achievement) return null;
  const a = achievement;
  const reward = BADGE_TIER_REWARD[a.tier];
  const chip = TIER_CHIP[a.tier];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={[styles.tierChip, { backgroundColor: chip.bg }]}>
            <Txt style={[styles.tierChipTxt, { color: chip.text }]}>{TIER_LABELS[a.tier].toUpperCase()} TIER</Txt>
          </View>

          <View style={{ marginBottom: 14 }}>
            <BadgeMedal icon={a.icon} color={a.color} tier={a.tier} size={84} locked={!a.earned} />
          </View>

          <View style={styles.statusRow}>
            <Feather name={a.earned ? 'check-circle' : 'lock'} size={13} color={a.earned ? colors.greenDark : colors.muted4} />
            <Txt style={[styles.statusTxt, { color: a.earned ? colors.greenDark : colors.muted4 }]}>
              {a.earned ? 'Unlocked' : 'Locked'}
            </Txt>
          </View>

          <Txt variant="h1" style={styles.title}>{a.label}</Txt>
          <Txt style={styles.desc}>{a.desc}</Txt>

          <View style={[styles.rewardTag, a.earned && styles.rewardTagClaimed]}>
            {reward.type === 'diamonds' ? <Diamond size={13} /> : <Coin size={13} />}
            <Txt style={[styles.rewardTxt, a.earned && styles.rewardTxtClaimed]}>
              +{reward.amount} {a.earned ? 'claimed' : 'on unlock'}
            </Txt>
          </View>

          <Button label="Close" onPress={onClose} style={{ width: '100%' }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(22,32,23,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  tierChip: { paddingVertical: 5, paddingHorizontal: 13, borderRadius: 999, marginBottom: 16 },
  tierChipTxt: { fontFamily: font.extra, fontSize: 11, letterSpacing: 0.8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statusTxt: { fontFamily: font.extra, fontSize: 11.5, letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { textAlign: 'center', marginBottom: 8 },
  desc: { fontFamily: font.semi, fontSize: 14, lineHeight: 21, color: colors.muted2, textAlign: 'center', marginBottom: 16 },
  rewardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.screen,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  rewardTagClaimed: { backgroundColor: colors.tagGreenBg, borderColor: colors.greenSoft },
  rewardTxt: { fontFamily: font.extra, fontSize: 12, color: colors.muted2 },
  rewardTxtClaimed: { color: colors.greenDark },
});
