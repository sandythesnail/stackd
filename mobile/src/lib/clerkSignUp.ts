/**
 * Sign-up requirements this Clerk instance imposes that the mobile forms don't ask for.
 *
 * The production instance (clerk.trystacked.app) has `username` enabled AND required —
 * its user_settings list username under attributes with `required: true`, and
 * auth_config.identification_requirements includes ["username"]. Clerk's own hosted widget
 * (which is what the website and the /m web build use) handles that by rendering a username
 * field, so the requirement never surfaced there. The native forms never asked for one, so
 * `signUp.create({ emailAddress, password })` came back `missing_requirements` and the flow
 * simply stopped: the code went straight on to prepareEmailAddressVerification, which fails
 * on a sign-up that isn't ready for verification. That is one half of why native sign-up
 * couldn't complete. OAuth is affected identically — a transfer sign-up from Google or
 * Microsoft lands in the same `missing_requirements` state with no session created.
 *
 * Rather than add a username field to a design that doesn't have one (and ask a student to
 * invent a handle for an app that never displays it), we derive one from the email address
 * Clerk already has and retry on collision. Anyone who wants a different handle can change
 * it in their Clerk account page — see Settings.
 */
import type { useSignUp } from '@clerk/clerk-expo';
import { isIdentifierTaken } from './clerkErrors';

/** The live SignUpResource, taken from the hook so this file needs no @clerk/types import
 * (that package is only present transitively, via clerk-expo). */
export type ClerkSignUpResource = NonNullable<ReturnType<typeof useSignUp>['signUp']>;

/** Clerk's default username rules: 4–64 chars, letters/digits/underscore/dash. */
const MIN = 4;
const MAX = 64;

function digits(n: number): string {
  return String(Math.floor(Math.random() * 10 ** n)).padStart(n, '0');
}

/** "maya.rodriguez@uconn.edu" → "mayarodriguez". Trimmed well short of Clerk's 64 so the
 * collision suffix always fits, and padded when the local part is too short to be legal. */
export function usernameFromEmail(email: string | null | undefined): string {
  const local = (email ?? '').split('@')[0] ?? '';
  const cleaned = local
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/^[-_]+/, '')
    .slice(0, 24);
  return cleaned.length >= MIN ? cleaned : `stackd${digits(4)}`;
}

/**
 * If (and only if) Clerk is holding this sign-up back for a username, fill one in.
 *
 * Returns the sign-up resource either way, so callers can treat it as a no-op pass-through
 * on an instance that doesn't require usernames — nothing here assumes the current
 * dashboard config, it reacts to whatever `missingFields` actually says.
 */
export async function fillMissingUsername(signUp: ClerkSignUpResource, emailHint?: string): Promise<ClerkSignUpResource> {
  if (!signUp.missingFields.includes('username')) return signUp;

  const base = usernameFromEmail(emailHint || signUp.emailAddress);
  let lastError: unknown;

  // First try the plain derived handle, then the same handle with a random 4-digit suffix.
  // Only a "taken" failure is retried — anything else (invalid characters, rate limit) is a
  // real error and must reach the user rather than being retried four more times.
  for (let attempt = 0; attempt < 5; attempt++) {
    const username = attempt === 0 ? base : `${base.slice(0, MAX - 4)}${digits(4)}`;
    try {
      return await signUp.update({ username });
    } catch (e) {
      if (!isIdentifierTaken(e)) throw e;
      lastError = e;
    }
  }
  throw lastError;
}
