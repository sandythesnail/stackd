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
 * it: passing oidc_prompt to the sign-in create call produces an authorization URL with
 * `prompt=select_account` in it. But clerk-js only forwards oidcPrompt for saml and
 * enterprise_sso strategies (see authenticateWithRedirectOrPopup in clerk-js), so the
 * mounted widget's Google/Microsoft buttons drop it, and there is no dashboard setting for
 * it either — the instance's connection config exposes no prompt field.
 *
 * So it gets added where the request is made: SignIn.create and SignUp.create are patched to
 * carry oidcPrompt whenever the strategy is an oauth_* one. Nothing about the widget or the
 * page changes, and if this ever stops applying (Clerk renaming the parameter, say) sign-in
 * still works exactly as it does today — it just stops asking which account. That is the
 * reason it's done this way round rather than by replacing the widget's buttons with our own:
 * the failure mode is a missing chooser, not a broken login.
 */
(function () {
  var PROMPT = 'select_account';

  function isOAuth(params) {
    return !!params && typeof params.strategy === 'string' && params.strategy.indexOf('oauth_') === 0;
  }

  function patch(resource) {
    if (!resource || typeof resource.create !== 'function' || resource.__stackdPromptPatched) return;
    var original = resource.create.bind(resource);
    resource.create = function (params) {
      return original(isOAuth(params) ? Object.assign({}, params, { oidcPrompt: PROMPT }) : params);
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
})();
