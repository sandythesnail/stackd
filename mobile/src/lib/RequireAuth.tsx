import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { colors } from '@/theme';
import { authEnabled } from './env';

/**
 * Gate for every signed-in surface of the app (tabs, learn, sheets, experiments).
 *
 * Before this existed, auth was consulted in exactly ONE place — the splash route
 * (src/app/index.tsx), which routes a signed-out user to onboarding. That is not a gate,
 * it's a default landing choice, and it only runs when the app happens to start at "/".
 * Anything that entered the app another way skipped it entirely:
 *   - Opening/refreshing a deep link (on the web build, any /m/... URL — /m/home,
 *     /m/learn/lesson, a bookmark, the browser's restored tabs) mounts that route
 *     directly. The splash never renders, so nothing ever asks whether you're signed in.
 *   - Signing out from Settings left the whole signed-in stack mounted underneath the
 *     sign-in screen, so one back gesture / browser Back put you straight back into the
 *     app with no session.
 *
 * Wrapping a layout in this makes the answer structural instead of incidental: the
 * protected tree is never rendered without a session, no matter how the route was
 * reached, and losing the session mid-session redirects out on the spot.
 *
 * When `authEnabled` is false (no Clerk key configured — see lib/env.ts) there is no
 * ClerkProvider mounted and no notion of being signed in at all: the app is deliberately
 * local-only, so this passes straight through. `authEnabled` is a module constant, so
 * which branch is taken is fixed for the life of the process and the hook order below
 * never changes between renders.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!authEnabled) return <>{children}</>;
  return <ClerkGate>{children}</ClerkGate>;
}

function ClerkGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  // Clerk restores the session from the token cache asynchronously. `isSignedIn` is false
  // during that window even for a perfectly valid session, so redirecting here would bounce
  // every returning user out to sign-in on cold start. Hold a plain background instead —
  // it matches the screen colour, so it reads as the app still coming up.
  if (!isLoaded) return <View style={{ flex: 1, backgroundColor: colors.screen }} />;

  // Sends the user to sign-in and REPLACES the current route, so the signed-in screen
  // being guarded doesn't stay in history behind it. On the web build, that sign-in route
  // hands off to the site's real Clerk login (see lib/webAuth.tsx).
  if (!isSignedIn) return <Redirect href="/(onboarding)/signin" />;

  return <>{children}</>;
}
