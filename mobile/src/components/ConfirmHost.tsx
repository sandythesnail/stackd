import { useEffect, useState } from 'react';
import { Modal, Pressable, View, StyleSheet } from 'react-native';
import { colors, font } from '@/theme';
import { setConfirmPresenter, type ConfirmRequest } from '@/lib/confirm';
import { Txt } from './Txt';
import { Button } from './Button';

/**
 * The app's own confirmation dialog, mounted once at the root so any call to
 * confirmDestructive() anywhere can raise it — see lib/confirm.ts for why this exists rather
 * than the platform dialogs.
 *
 * A centred card on a scrim, the same shape as the quest player's hint popup, rather than a
 * bottom sheet: the sheets in this app are all content you read, and this is a question you
 * answer, so it sits in the middle where the eye already is.
 */
export function ConfirmHost() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    setConfirmPresenter(setReq);
    return () => setConfirmPresenter(null);
  }, []);

  const close = () => setReq(null);
  const confirm = () => {
    const action = req?.onConfirm;
    // Dismiss FIRST. Every caller's action navigates (leaving a lesson, signing out), and
    // running that while this Modal is still mounted means navigating out from underneath a
    // native modal window — the class of thing that leaves a stuck scrim behind.
    setReq(null);
    action?.();
  };

  return (
    <Modal visible={!!req} transparent animationType="fade" onRequestClose={close}>
      {/* Tapping the scrim cancels, matching every other dismissible overlay in the app.
          It's the safe outcome here, so there's no risk in making it the easy one. */}
      <Pressable style={styles.scrim} onPress={close}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Txt style={styles.title}>{req?.title}</Txt>
          <Txt style={styles.body}>{req?.message}</Txt>
          <View style={styles.actions}>
            {/* The destructive action carries the caller's own verb ("Leave", "Sign out")
                rather than a generic OK, which is the whole point of confirmLabel and the
                thing window.confirm threw away. */}
            <Button label={req?.confirmLabel ?? 'Confirm'} variant="pink" onPress={confirm} />
            <Button label="Cancel" variant="ghost" onPress={close} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1, backgroundColor: 'rgba(22,32,23,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 26,
  },
  card: {
    width: '100%', maxWidth: 350, backgroundColor: colors.white,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 22, padding: 22,
  },
  title: { fontFamily: font.display, fontSize: 20, lineHeight: 25, color: colors.ink },
  body: { fontFamily: font.semi, fontSize: 14, lineHeight: 20, color: colors.muted2, marginTop: 8 },
  actions: { gap: 10, marginTop: 20 },
});
