/**
 * Make Google and Microsoft always show their "which account?" screen.
 *
 * Without this, neither provider asks. Clerk's authorization URLs carry no `prompt`
 * parameter at all — verified by reading what the instance actually generates:
 *
 *   https://accounts.google.com/o/oauth2/auth?access_type=offline&client_id=…&scope=…
 *   https://login.microsoftonline.com/common/oauth2/v2.0/authorize?access_type=offline&…
 *
 * With no prompt, both providers reuse whatever session the browser already has. Google
 * silently reauthenticates the one signed-in account, so the chooser never appears and the
 * round-trip looks like it did nothing; Microsoft hands back the UConn account a student is
 * already signed into on that device, with no way to pick a personal one. Anyone with two
 * accounts — which is every student here, since UConn is Microsoft — cannot choose.
 *
 * `prompt=select_account` is what asks for the chooser, and Clerk's Frontend API does honour
 * it: passing oidcPrompt to the sign-in create call produces an authorization URL with
 * `prompt=select_account` in it. But clerk-js only forwards oidcPrompt for saml and
 * enterprise_sso strategies (see authenticateWithRedirectOrPopup in clerk-js), so the
 * mounted widget's Google/Microsoft buttons drop it, and there is no dashboard setting for
 * it either — the instance's connection config exposes no prompt field.
 *
 * So it gets added where the request is made: SignIn.create and SignUp.create are patched to
 * carry oidcPrompt for the strategies below. Nothing about the widget or the page changes,
 * and if this ever stops applying (Clerk renaming the parameter, say) sign-in still works
 * exactly as it does today — it just stops asking which account. That is the reason it's
 * done this way round rather than by replacing the widget's buttons with our own: the
 * failure mode is a missing chooser, not a broken login.
 *
 * APPLE IS NOT ON THE LIST, and that is the point of the list existing.
 *
 * This used to send oidcPrompt to every strategy whose name began `oauth_`, Apple included.
 * `prompt` is an OIDC parameter that Google and Microsoft both implement and Apple does not:
 * Apple's /auth/authorize documents `response_mode`, `scope` and `state`, and an
 * unrecognised parameter there risks an `invalid_request` bounce before the user is ever
 * shown a sign-in sheet. Apple also has nothing to fix — it always presents its own account
 * sheet, so the chooser this file exists to force is already there.
 *
 * The mobile app has always got this right (`PROMPT` is set per-provider in
 * src/lib/socialAuth.tsx and omitted for Apple, with the same reasoning); the website was
 * the copy that applied it to everything. `npm run check:sso` now asks the live instance
 * what each provider's authorization URL actually contains, and fails if `prompt` reaches
 * Apple's.
 */
(function () {
  var PROMPT = 'select_account';

  /** The strategies that take `prompt` — NOT "anything oauth_". See the note above. */
  var PROMPT_STRATEGIES = ['oauth_google', 'oauth_microsoft'];

  function wantsPrompt(params) {
    return !!params && PROMPT_STRATEGIES.indexOf(params.strategy) !== -1;
  }

  function patch(resource) {
    if (!resource || typeof resource.create !== 'function' || resource.__stackdPromptPatched) return;
    var original = resource.create.bind(resource);
    resource.create = function (params) {
      return original(wantsPrompt(params) ? Object.assign({}, params, { oidcPrompt: PROMPT }) : params);
    };
    resource.__stackdPromptPatched = true;
  }

  /** Call once after Clerk.load(). Re-applies on every client change, because `create` is an
   * instance field on the SignIn/SignUp resource and Clerk swaps those objects out when it
   * reloads the client — patching once at load would quietly stop applying after that. */
  window.forceAccountPicker = function (clerk) {
    var apply = function () {
      if (!clerk || !clerk.client) return;
      patch(clerk.client.signIn);
      patch(clerk.client.signUp);
    };
    apply();
    try { clerk.addListener(apply); } catch (e) { /* listener is a nicety, not the mechanism */ }
  };

  // Read by scripts/check-sso.js so the check and the page cannot disagree about which
  // providers are meant to be sent a prompt.
  window.__stackdPromptStrategies = PROMPT_STRATEGIES;
})();
