import { Stack } from 'expo-router';
import { colors } from '@/theme';
import { RequireAuth } from '@/lib/RequireAuth';

export default function LearnLayout() {
  // The lesson flow is signed-in-only, same as the tabs — see lib/RequireAuth.tsx.
  return (
    <RequireAuth>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.screen },
          // NOTHING in the lesson flow is left by swiping.
          //
          // iOS gives every native-stack screen an edge-swipe back gesture for free, and the
          // quest player is full of horizontal gestures of its own — the myth-card stack is
          // swipe-left/swipe-right BY DESIGN, and a swipe that starts near the left edge (or
          // a drag the card's PanResponder doesn't claim, since it only takes over past 6px
          // of travel) was being read as "go back" instead. The result was a student getting
          // thrown out of a lesson mid-chapter by a gesture the chapter had just told them to
          // make, with no confirmation and no idea what they'd done.
          //
          // The X button is the only way out, and it goes through "Leave this lesson?" (see
          // LeaveLessonDialog in quest.tsx). The other screens in this group lose the gesture
          // too, which is fine: the module screen has its own chevron and results has its
          // Continue, and swiping back INTO a lesson you've just finished isn't wanted either.
          //
          // This covers the inner stack; the root layout has to disable it on the `learn`
          // screen as well, because when the player is the first screen of this stack there
          // is nothing here to pop and the gesture falls through to the parent — which pops
          // the whole group and lands on the tabs. See app/_layout.tsx.
          gestureEnabled: false,
        }}
      />
    </RequireAuth>
  );
}
