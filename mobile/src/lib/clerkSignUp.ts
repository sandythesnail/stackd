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
 *
 * `password` is required on this instance too (user_settings.attributes.password.required is
 * true), and that one only bites the OAuth paths. The email form supplies a password by
 * definition; a transfer sign-up from Apple/Google/Microsoft supplies none, so Clerk can hold
 * it in `missing_requirements` with no session created — which reached the user as
 * "Couldn't finish signing in with Google. Please try again." on a round trip where nothing
 * had actually gone wrong. Filling it is the only way to complete a sign-up on an instance
 * configured this way without putting a "now invent a password" step in front of a student
 * who just tapped a one-tap sign-in button. See generatedPassword below for what that means
 * for the account afterwards.
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
 * A password for an account whose owner authenticates with a provider and will never type
 * one. Long and random precisely because nobody memorises it: the account is reached through
 * Apple/Google/Microsoft, and anyone who later wants a password of their own sets one with
 * "Forgot password?" on the sign-in screen, which mails them a code and lets them choose it.
 *
 * Math.random rather than a crypto RNG on purpose — this is not protecting the account (the
 * provider is), it only has to satisfy a required field with something no one will guess by
 * hand and that Clerk's strength rules accept: 30+ characters over a 62-symbol alphabet,
 * mixed case and digits guaranteed by the alphabet's spread rather than by post-hoc checks.
 */
function generatedPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 32; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  // Guarantees a digit and both cases regardless of how the draw landed, so a strength rule
  // that counts character classes can't reject an otherwise fine 32-character string.
  return `Aa1${out}`;
}

/**
 * Fills in every sign-up requirement this instance imposes that the caller's form didn't
 * collect, in the order Clerk asks for them, and returns the resource.
 *
 * Reacts to `missingFields` rather than to an assumption about the dashboard, so it is a
 * no-op pass-through on an instance that requires neither — and so a fourth requirement
 * appearing in the dashboard surfaces as a named field in the caller's error message instead
 * of a silent stall. Callers must re-read `status`/`createdSessionId` from the RETURNED
 * resource.
 */
export async function fillMissingSignUpFields(
  signUp: ClerkSignUpResource,
  emailHint?: string,
): Promise<ClerkSignUpResource> {
  let res = signUp;
  if (res.missingFields.includes('username')) res = await fillMissingUsername(res, emailHint);
  // Only ever true on the OAuth paths — see the note in this file's header.
  if (res.missingFields.includes('password')) res = await res.update({ password: generatedPassword() });
  return res;
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
