import { useStore } from '@/store';

/**
 * Has this device already been through the onboarding survey and the animated intro?
 *
 * One question asked from four places — the splash's routing and the three points where a
 * finished sign-in decides where to land — so it is answered once, here, rather than
 * re-derived slightly differently at each of them. Getting it wrong in either direction is
 * visible: too strict and a new student never gets a track recorded, too loose and someone
 * who has been using the app for weeks is handed the piggy-bank animation again.
 *
 * Two fields, because the flag is newer than the app. `hasCompletedOnboarding` is set
 * explicitly at both ends of onboarding (survey.tsx's finish and hammy-intro's), and
 * `onboardingTrackId` is the older evidence: it can only have been set by finishing the
 * survey, so an account that has one has certainly seen this. Accepting it is what stops the
 * release that introduced the flag from replaying onboarding at every existing user once.
 *
 * Callers on the auth screens must still let the cloud read settle before trusting a FALSE
 * answer — a returning user's progress lives in Supabase and for a moment after launch they
 * look exactly like a new account. index.tsx is the one that waits (see `knowsProgress`);
 * the sign-in screens hand off to it rather than deciding early themselves.
 */
export function useOnboardedAlready() {
  const { state } = useStore();
  return state.hasCompletedOnboarding || !!state.onboardingTrackId;
}
