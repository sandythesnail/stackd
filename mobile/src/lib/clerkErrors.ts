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
