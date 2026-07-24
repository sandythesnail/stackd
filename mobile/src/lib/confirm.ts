import { Alert, Platform } from 'react-native';

/** Alert.alert's multi-button confirm dialog is a total no-op on web — react-native-web's
 * implementation (node_modules/react-native-web/dist/exports/Alert/index.js) is a literal
 * empty function, so tapping a destructive action there silently did nothing at all (no
 * dialog, no callback, nothing) instead of failing loudly. This is exactly the bug reported
 * as "the reset progress button doesn't work" while testing in a browser. Falls back to a
 * real window.confirm there so the action still actually asks before firing on web; native
 * keeps the richer Alert.alert (title + message + styled Cancel/destructive buttons). */
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
