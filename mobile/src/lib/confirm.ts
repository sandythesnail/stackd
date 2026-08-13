import { Alert, Platform } from 'react-native';

/* READ THIS BEFORE REACHING FOR Alert.alert.
 *
 * Alert.alert is a total no-op on web — react-native-web's implementation
 * (node_modules/react-native-web/dist/exports/Alert/index.js) is a literal empty function, so
 * an action gated behind one silently does nothing at all (no dialog, no callback, nothing)
 * instead of failing loudly. That is not a corner case here: /m/ IS the web build, for every
 * phone that visits the site. It's the bug that was reported as "the reset progress button
 * doesn't work" in a browser. Whatever you write must have a web path.
 *
 * The CONFIRM half of this file is gone. It used to be `confirmDestructive`, which fell back
 * to window.confirm on web — correct in that it always asked, but what the student saw was
 * the browser's grey system box, which looks nothing like Stacked and is easy to dismiss
 * unread. Settings now draws its own dialog for both of its serious actions (ConfirmDialog in
 * (tabs)/settings.tsx), the same per-screen <Modal> pattern the quest player uses for "Leave
 * this lesson?". Note that a GLOBAL dialog host was tried for both and reverted — it broke
 * the confirm on the web build. Per-screen is the shape that works; copy that, not this.
 */

/** One-button "here's what just happened" notice. Kept on the platform alert because it only
 * announces — there is nothing to get wrong by tapping the one button — and because it can
 * fire when no particular screen is mounted to draw it. Same web/native split as above: a
 * single-button Alert.alert is just as much of a no-op under react-native-web as a
 * multi-button one, hence the window.alert path.
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
