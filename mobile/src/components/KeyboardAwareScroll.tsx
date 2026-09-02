import { ReactNode } from 'react';
import { ScrollView, StyleSheet, type ViewStyle } from 'react-native';

/**
 * The scroll container the auth forms sit in, with the keyboard actually accounted for.
 *
 * All three forms (sign-in, sign-up, reset-password) are a ScrollView inside a Screen, and
 * none of them told the ScrollView that a keyboard exists. That is not a small omission on
 * these particular screens: `contentContainerStyle` is `flexGrow: 1` with a <Spacer/> in the
 * middle, so the content is EXACTLY the height of the screen and there is nothing to scroll.
 * Raising the keyboard therefore covered the bottom third of the form without making a pixel
 * of it reachable — and on sign-up the password field, the Terms checkbox and the Continue
 * button all live down there, so a student typing their password could not see what they
 * were typing or what to press next.
 *
 * `automaticallyAdjustKeyboardInsets` is the fix, and it is the reason this can stay a plain
 * ScrollView rather than a KeyboardAvoidingView: iOS grows the scroll view's bottom content
 * inset by the keyboard's height, which both makes the covered content reachable and lets
 * UIKit scroll the focused field up above the keyboard. A KeyboardAvoidingView with
 * `behavior="padding"` would fight the bottom safe-area padding Screen already applies (the
 * keyboard frame includes that inset, so the two stack and leave a gap the size of the home
 * indicator). Android needs neither: the window is `adjustResize` by default under Expo, so
 * the whole view shrinks and this ScrollView scrolls normally.
 *
 * The three props below are what the forms already passed and are kept identical: taps go
 * through to buttons while the keyboard is up (`handled`), dragging the form dismisses it,
 * and no scrollbar appears on what is usually a non-scrolling screen.
 */
export function KeyboardAwareScroll({
  children,
  contentContainerStyle,
}: {
  children?: ReactNode;
  contentContainerStyle?: ViewStyle;
}) {
  return (
    <ScrollView
      contentContainerStyle={[styles.content, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // flexGrow, not flex: the content still fills the screen (so <Spacer/> keeps pinning the
  // footer to the bottom) but is allowed to grow past it once the keyboard inset is added.
  content: { flexGrow: 1 },
});
