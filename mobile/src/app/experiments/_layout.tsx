import { Stack } from 'expo-router';
import { colors } from '@/theme';
import { RequireAuth } from '@/lib/RequireAuth';

/** Experiments live under their own Stack so nothing here has to be registered in the root
 * layout (src/app/_layout.tsx) — that file stays untouched. Anything added under
 * src/app/experiments/ becomes a route automatically and inherits these options.
 *
 * The folder name matters: the web build's baseUrl is "/m" and Expo Router strips it as a
 * raw string prefix, so a top-level segment starting with "m" gets its "m" eaten in the
 * production export (see scripts/check-modal-routes.js). "experiments" is safe. */
export default function ExperimentsLayout() {
  // Prototypes render real app content (progress, Hammy, the lesson path), so they sit
  // behind the same session gate as the shipped screens — see lib/RequireAuth.tsx.
  return (
    <RequireAuth>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.screen },
          animation: 'slide_from_right',
        }}
      />
    </RequireAuth>
  );
}
