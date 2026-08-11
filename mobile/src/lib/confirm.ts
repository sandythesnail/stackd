import { Alert, Platform } from 'react-native';

/** Alert.alert's multi-button confirm dialog is a total no-op on web — react-native-web's
 * implementation (node_modules/react-native-web/dist/exports/Alert/index.js) is a literal
 * empty function, so tapping a destructive action there silently did nothing at all (no
 * dialog, no callback, nothing) instead of failing loudly. This is exactly the bug reported
 * as "the reset progress button doesn't work" while testing in a browser. Falls back to a
 * real window.confirm there so the action still actually asks before firing on web; native
 * keeps the richer Alert.alert (title + message + styled Cancel/destructive buttons).
 *
 * This is for the genuinely destructive actions in Settings — reset progress, sign out. The
 * quest player's "leave this lesson?" does NOT come through here: it needs to look like the
 * app rather than like the browser, so it draws its own in-screen dialog (see quest.tsx's
 * LeaveLessonDialog). A global in-app host was tried for BOTH and reverted — it broke the
 * confirm on the web build. Doing it per-screen, with the same local <Modal> pattern that
 * screen already uses for its hint and boss-verdict popups, keeps it on a path that works. */
export function confirmDestructive(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

/** One-button "here's what just happened" notice, with the same web/native split and for the
 * same reason as confirmDestructive above: a single-button Alert.alert is just as much of a
 * no-op under react-native-web as a multi-button one, and /m/ IS the web build for every
 * phone that visits the site.
 *
 * Used for rewards that arrive from the SERVER rather than from something the player just
 * did — today that's referral payouts, which can land at sign-in or minutes after a friend
 * finishes their first lesson. Everything a player earns through their own actions is
 * announced in the screen that caused it (results, the reward calendar, the achievement
 * toast); this is for the ones with no such screen to land in. */
export function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
