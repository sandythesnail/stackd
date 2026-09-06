/**
 * Clerk API errors, unwrapped for display.
 *
 * Lives in lib/ rather than on the sign-in screen (where it used to) because three call
 * sites now need it — sign-in, sign-up and the social buttons — and the social buttons are
 * imported BY the sign-in screen, so keeping it there made the import cycle.
 */

type ClerkApiError = { code?: string; message?: string; longMessage?: string };

function clerkErrors(e: unknown): ClerkApiError[] {
  return (e as { errors?: ClerkApiError[] })?.errors ?? [];
}

/** The most specific human-readable string Clerk gave us, or a generic fallback. */
export function clerkError(e: unknown): string {
  const first = clerkErrors(e)[0];
  return first?.longMessage || first?.message || 'Something went wrong. Please try again.';
}

/** True when the failure is "that identifier is already in use" — the one error worth
 * retrying automatically, since the fix is simply to pick a different value. */
export function isIdentifierTaken(e: unknown): boolean {
  return clerkErrors(e).some((err) => err.code === 'form_identifier_exists');
}

/**
 * clerkError(), plus Clerk's own error CODE in parentheses.
 *
 * For failures that reach a user we cannot talk to. A social sign-in that dies on a
 * TestFlight build gets reported as "Google doesn't work", and every distinct cause —
 * a redirect the instance won't accept (`resource_missmatch`), a provider with no
 * connection behind it (`form_param_value_invalid`), an email already claimed by another
 * account (`form_identifier_exists`), a rate limit — reads identically once the code is
 * thrown away. The code is the one token that tells those apart, it is short enough to
 * read off a screen and repeat, and it identifies nothing about the person: it is a
 * category name from Clerk's API, not an id, a token or an email.
 *
 * Only for the paths that genuinely have no better story to tell. Where the app knows what
 * a failure means (a wrong password, an unverified email), say THAT — a code helps nobody
 * who already has an explanation.
 */
export function clerkErrorWithCode(e: unknown): string {
  const first = clerkErrors(e)[0];
  const message = first?.longMessage || first?.message || 'Something went wrong. Please try again.';
  return first?.code ? `${message} (${first.code})` : message;
}
