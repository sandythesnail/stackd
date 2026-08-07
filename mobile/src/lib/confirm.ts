import { Alert, Platform } from 'react-native';

export type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
};

type Presenter = (req: ConfirmRequest) => void;

/** Set by <ConfirmHost/> while it's mounted (see components/ConfirmHost.tsx). Module-level
 * rather than a context, because confirmDestructive is called from plain event handlers that
 * aren't hooks and shouldn't have to be. */
let presenter: Presenter | null = null;

export function setConfirmPresenter(next: Presenter | null) {
  presenter = next;
}

/**
 * Asks before doing something irreversible — leaving a part-finished lesson, signing out,
 * wiping progress.
 *
 * Presented as a real in-app dialog (ConfirmHost) on every platform, which matters most on
 * web, since the web build is what /m serves to phones and is where most students are. It
 * used to call window.confirm() there: an OS-chrome dialog prefixed "trystacked.app says:",
 * looking nothing like the app, at the most-tapped exit point in the whole player. It also
 * silently discarded `confirmLabel` — the buttons read OK/Cancel, so the one word telling
 * the student what they were agreeing to ("Leave", "Sign out", "Delete") never appeared.
 *
 * The platform dialogs remain as a fallback for the window between app start and ConfirmHost
 * mounting, and for any tree that doesn't render it. Note what each fallback costs, which is
 * exactly why neither is the primary path any more: react-native-web's Alert.alert is a
 * literal empty function (this is the "reset progress button does nothing in a browser" bug),
 * hence window.confirm rather than Alert on web.
 */
export function confirmDestructive(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (presenter) {
    presenter({ title, message, confirmLabel, onConfirm });
    return;
  }
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
