import { useStore } from '@/store';

/**
 * Has this device already been through the onboarding survey and the animated intro?
 *
 * Asked by Home, to decide whether the first-login spotlight tour has a finished onboarding
 * to explain, and answered the same way by the splash's routing (index.tsx computes it
 * inline from the same two fields). Getting it wrong in either direction is visible: too
 * strict and a new student never gets a track recorded, too loose and someone who has been
 * using the app for weeks is handed the piggy-bank animation again.
 *
 * NOT asked by the sign-up paths any more, and that matters. These fields live in the
 * device-global AsyncStorage snapshot, so they say "has this PHONE onboarded" — which is the
 * wrong question to ask about an account that was created thirty seconds ago. Signing up on
 * a phone that had onboarded once skipped the survey, the intro and the tour outright. Those
 * paths now clear the flags instead (store's startOnboardingForNewAccount), so a new account
 * always starts at the survey and this hook answers about the account that owns the state.
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
