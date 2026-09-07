#!/usr/bin/env node
/**
 * Asks the live Clerk instance whether native social sign-in can actually complete — for
 * EVERY provider the app ships a button for, not a hardcoded subset.
 *
 * There are two independent ways for a button on the sign-in screen to be dead, they fail
 * at the same call with different errors, and they need completely different fixes:
 *
 *  1. The provider is not enabled on the Clerk instance at all. Clerk rejects the strategy
 *     outright — `form_param_value_invalid`, "oauth_x does not match one of the allowed
 *     values for parameter strategy". Fix: Clerk Dashboard → SSO Connections → add it.
 *     This is what shipping Apple looked like before Apple was configured: the button was
 *     in the app, App Review's guideline 4.8 was satisfied on paper, and every tap errored.
 *
 *  2. The provider is enabled, but the redirect URL the app comes back to is not on the
 *     instance's allowed list — `resource_missmatch`, "Redirect url mismatch". Fix: Clerk
 *     Dashboard → Configure → Native Applications → allowed redirect URLs.
 *
 * Native SSO (lib/socialAuth.tsx) opens the provider in a browser and comes back to a
 * `stackd://` (build) or `exp://` (Expo Go) URL. Clerk validates that URL BEFORE it will
 * hand out the provider link, so both failures happen on Clerk's side and no amount of app
 * code fixes either one.
 *
 * The provider list is read out of lib/socialAuth.tsx rather than written here, so adding a
 * fourth provider to the app cannot silently escape this check — which is exactly how Apple
 * escaped it: the list said Google and Microsoft, Apple was added to the app, and the check
 * kept passing while the Apple button was broken.
 *
 * Deliberately NOT part of `npm run check`: it needs the network and talks to production.
 *
 *     npm run check:sso                 # checks the defaults below
 *     npm run check:sso -- exp://1.2.3.4:8081/--/sso-callback
 *
 * Zero dependencies — plain Node, publishable key only (no secrets involved).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const CLERK_JS_VERSION = '5.125.5';

/** Reads EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY out of .env (dotenv isn't a dependency here). */
function publishableKey() {
  if (process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY) return process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return '';
  const line = fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY='));
  return line ? line.slice(line.indexOf('=') + 1).trim() : '';
}

/** The Frontend API host is base64'd into the publishable key: pk_live_<base64 host + '$'>. */
function frontendApi(key) {
  const encoded = key.replace(/^pk_(live|test)_/, '');
  return Buffer.from(encoded, 'base64').toString('utf8').replace(/\$$/, '');
}

/** The app's scheme, so this script can't drift from app.json. */
function scheme() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8')).expo.scheme;
}

/**
 * The strategies the app actually renders buttons for, read out of the PROVIDERS array in
 * lib/socialAuth.tsx so this script cannot drift from the sign-in screen.
 *
 * A regex over the source rather than an import: this is plain Node with no TypeScript
 * loader, and PROVIDERS is a literal array of literal strings — the one shape a regex reads
 * as reliably as a parser would. If the match ever comes back empty the script says so and
 * fails, rather than quietly checking nothing.
 */
function shippedStrategies() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'socialAuth.tsx'), 'utf8');
  const block = src.slice(src.indexOf('const PROVIDERS'), src.indexOf('export function SocialAuth'));
  const found = [...block.matchAll(/strategy:\s*'(oauth_[a-z0-9_]+)'/g)].map((m) => m[1]);
  return [...new Set(found)];
}

/**
 * Which providers the instance has an SSO connection for. Clerk publishes this on the same
 * unauthenticated environment endpoint the app itself reads at startup, so asking is free
 * and needs no secret.
 *
 * `enabled: false` is the answer that matters: the connection exists in Clerk's schema for
 * every provider it supports, and only `enabled` says whether this instance configured one.
 */
async function enabledProviders(host) {
  const res = await fetch(`https://${host}/v1/environment?_clerk_js_version=${CLERK_JS_VERSION}`);
  const body = await res.json();
  const social = body.user_settings?.social;
  if (!social) throw new Error(`Clerk did not return user_settings.social (HTTP ${res.status})`);
  return social;
}

/** A native FAPI request needs a client; its token comes back in the Authorization header. */
async function nativeClientToken(host) {
  const res = await fetch(`https://${host}/v1/client?_is_native=1&_clerk_js_version=${CLERK_JS_VERSION}`, {
    method: 'POST',
  });
  const token = res.headers.get('authorization');
  if (!token) throw new Error(`Clerk did not return a client token (HTTP ${res.status})`);
  return token;
}

/** Starts an OAuth sign-in exactly as the app does, and reports whether Clerk allowed it. */
async function probe(host, token, strategy, redirectUrl) {
  const res = await fetch(`https://${host}/v1/client/sign_ins?_is_native=1&_clerk_js_version=${CLERK_JS_VERSION}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ strategy, redirect_url: redirectUrl }),
  });
  // Clerk rate-limits these attempts. That is NOT the redirect being refused, and reporting
  // it as one would send you back to the dashboard to fix something that isn't broken.
  if (res.status === 429) return { unknown: true, reason: 'rate limited by Clerk — wait a minute and re-run' };
  const body = await res.json();
  if (body.errors) {
    const err = body.errors[0];
    const reason = err.long_message || err.message;
    if (err.code === 'rate_limit_exceeded' || /too many requests/i.test(reason)) {
      return { unknown: true, reason: `${reason} (not a redirect problem)` };
    }
    // The provider isn't enabled on this instance at all, so Clerk refuses the strategy
    // before it ever looks at the redirect. Reported separately because sending someone to
    // the allowed-redirect-URLs page for this would waste their time: the redirect is fine,
    // there is simply no connection to redirect to.
    if (err.code === 'form_param_value_invalid' && err.meta?.param_name === 'strategy') {
      return { ok: false, disabled: true, reason: 'not enabled on this Clerk instance' };
    }
    return { ok: false, reason };
  }
  const url = body.response?.first_factor_verification?.external_verification_redirect_url;
  return url ? { ok: true, url } : { ok: false, reason: 'no provider redirect returned' };
}

/**
 * Third failure mode, and the one this script was blind to: Clerk is happy, and the PROVIDER
 * isn't.
 *
 * Everything above only proves that Clerk will hand out an authorization URL. It cannot tell
 * you whether Apple, Google or Microsoft will honour it — that depends on credentials living
 * in the Apple Developer portal, Google Cloud and Azure, none of which Clerk validates when
 * you paste them in. So a provider whose client was never finished, or whose return URL was
 * never registered, passes every check above and fails on the phone, behind an error page in
 * a browser sheet the user has no way to report usefully.
 *
 * Not hypothetical: `app.trystacked.signin` answered Apple's `invalid_client` — the same
 * answer Apple gives for a Services ID that does not exist — while this script reported
 * Apple green. That is the second time Apple has shipped broken past this check.
 *
 * Fetching the authorize URL is safe and anonymous: it is exactly the GET a browser makes
 * before anyone types anything. No credentials are involved and nobody is signed in. We
 * follow no redirects and read only the provider's own error reporting.
 */
async function providerAccepts(authorizeUrl) {
  let res;
  let body = '';
  try {
    res = await fetch(authorizeUrl, {
      redirect: 'manual',
      // Providers serve a different (or no) page to something that doesn't look like a
      // browser, and a bot-shaped refusal would read here as a broken client.
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    });
    body = await res.text();
  } catch (e) {
    return { unknown: true, reason: `couldn't reach the provider (${e.message})` };
  }
  const location = res.headers.get('location') ?? '';

  // Every provider reports a refused client its own way, and none of them use a status code
  // for it — Apple and Microsoft both answer 200 and put the error inside the page.
  const error =
    // Apple: a JSON blob in a <script> tag. `invalid_client` is an unknown or unconfigured
    // Services ID; `invalid_request` here is usually an unregistered return URL.
    /"errorCode":"([a-z_]+)"/.exec(body)?.[1]
    // Google's own error pages ("Error 400: redirect_uri_mismatch", "Error 401: deleted_client").
    || /Error 4[0-9][0-9]: ([a-z_]+)/.exec(body)?.[1]
    // Microsoft Entra puts a numbered code in the page and in the bounce-back.
    || /(AADSTS[0-9]+)/.exec(body)?.[1]
    // Anything that redirected straight back carrying ?error=…
    || /[?&]error=([a-zA-Z_]+)/.exec(location)?.[1]
    || null;

  if (error) {
    const message = /"errorMessage":"([^"]*)"/.exec(body)?.[1];
    return { ok: false, reason: message ? `${error} — ${message}` : error };
  }
  // A sign-in page (200) or a redirect deeper into the provider's own flow (302/303) both
  // mean the client was accepted. Anything else is reported rather than passed silently.
  if (![200, 302, 303].includes(res.status)) {
    return { unknown: true, reason: `unexpected HTTP ${res.status} from the provider` };
  }
  return { ok: true };
}

async function main() {
  const key = publishableKey();
  if (!key) {
    console.error('✗ check:sso: no EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in the environment or mobile/.env.');
    process.exit(1);
  }
  const host = frontendApi(key);
  const targets = process.argv.slice(2);
  // The bare scheme is what a real build sends (see ssoRedirectUrl in lib/socialAuth.tsx);
  // Clerk matches it exactly, so `stackd://` does NOT authorize `stackd://anything`. An
  // Expo Go run sends an exp:// URL carrying your LAN address instead — pass it as an
  // argument, since this script can't know which network you're on.
  const redirects = targets.length ? targets : [`${scheme()}://`];

  const strategies = shippedStrategies();
  if (!strategies.length) {
    console.error('✗ check:sso: found no providers in src/lib/socialAuth.tsx — has PROVIDERS moved?');
    process.exit(1);
  }

  console.log(`check:sso — ${host}\n`);
  let failed = 0;

  let unknown = 0;

  // Enablement first: it explains every subsequent failure for that provider, and it is one
  // unauthenticated request covering all of them rather than one rate-limited probe each.
  const social = await enabledProviders(host);
  const disabled = strategies.filter((s) => !social[s]?.enabled);
  console.log('  Clerk SSO connections');
  for (const strategy of strategies) {
    const on = Boolean(social[strategy]?.enabled);
    console.log(`    ${on ? '✓' : '✗'} ${strategy.padEnd(17)} ${on ? 'enabled' : 'NOT enabled on this instance'}`);
  }
  console.log('\n  Redirect URLs');

  // Authorize URLs harvested as we go, so the provider-acceptance stage below doesn't have to
  // ask Clerk for them a second time (and trip its rate limit doing it).
  const authorizeUrls = new Map();

  for (const redirect of redirects) {
    for (const strategy of strategies) {
      // One client per attempt: a sign-in already sitting on the client is reused otherwise.
      const result = await probe(host, await nativeClientToken(host), strategy, redirect);
      if (result.ok) {
        if (!authorizeUrls.has(strategy)) authorizeUrls.set(strategy, result.url);
        console.log(`    ✓ ${strategy.padEnd(17)} ${redirect}`);
      } else if (result.unknown) {
        unknown++;
        console.log(`    ? ${strategy.padEnd(17)} ${redirect}\n        ${result.reason}`);
      } else {
        // A disabled provider was already reported above; counting it here too would print
        // the wrong fix twice and send you to the redirect page for a connection problem.
        if (!result.disabled) failed++;
        console.log(`    ✗ ${strategy.padEnd(17)} ${redirect}\n        ${result.reason}`);
      }
      // Space the attempts out; a tight loop is what trips Clerk's rate limit.
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  // Stage three: does the PROVIDER accept the client Clerk is using? See providerAccepts.
  // Only for providers that got as far as an authorize URL — there is nothing to test for one
  // Clerk already refused, and a second failure line for it would just be noise.
  const rejected = [];
  if (authorizeUrls.size) {
    console.log('\n  Provider acceptance');
    for (const [strategy, url] of authorizeUrls) {
      const seen = await providerAccepts(url);
      if (seen.ok) {
        console.log(`    ✓ ${strategy.padEnd(17)} ${new URL(url).host}`);
      } else if (seen.unknown) {
        unknown++;
        console.log(`    ? ${strategy.padEnd(17)} ${new URL(url).host}\n        ${seen.reason}`);
      } else {
        // Deliberately NOT the same counter as a refused redirect. They are different problems
        // with different fixes in different consoles, and sharing a counter printed both
        // remedies for either one — sending you to Clerk's allowed-redirect page to repair a
        // Services ID that lives in Apple's developer portal.
        rejected.push(strategy);
        console.log(`    ✗ ${strategy.padEnd(17)} ${new URL(url).host}\n        ${seen.reason}`);
      }
    }
  }

  if (rejected.length) {
    console.log(
      `\n✗ ${rejected.join(', ')} — Clerk is configured and the PROVIDER is refusing the`
      + '\n  credentials it holds. Nothing in this repo and nothing in the Clerk dashboard fixes'
      + '\n  that; the client has to be repaired where it actually lives:'
      + '\n    oauth_apple      Apple Developer → Certificates, Identifiers & Profiles →'
      + '\n                     Identifiers → Services IDs. The Services ID must EXIST, have Sign'
      + '\n                     in with Apple enabled, be tied to the primary App ID, and list'
      + `\n                     https://${host}/v1/oauth_callback as a Return URL.`
      + '\n    oauth_google     Google Cloud → APIs & Services → Credentials → the OAuth 2.0'
      + '\n                     client → Authorized redirect URIs must include'
      + `\n                     https://${host}/v1/oauth_callback`
      + '\n    oauth_microsoft  Entra ID → App registrations → Authentication → Redirect URIs'
      + '\n  The exact code each provider returned is printed above.',
    );
  }

  if (unknown && !failed && !rejected.length) {
    console.log('\n? Inconclusive — Clerk rate-limited the check. Wait a minute and re-run.');
    process.exit(2);
  }

  if (disabled.length) {
    console.log(
      `\n✗ ${disabled.join(', ')} — the app shows a button for each of these and Clerk has`
      + '\n  no connection behind it, so every tap errors out. Add them in the Clerk Dashboard'
      + '\n  under SSO Connections. Apple additionally needs a Services ID and a Sign in with'
      + '\n  Apple key from the Apple Developer account before Clerk has anything to paste —'
      + '\n  see APP_STORE.md section 7. Shipping the Apple button with no connection behind it'
      + '\n  is worse than not shipping it: App Review taps it, and guideline 4.8 is why it is'
      + '\n  there in the first place.',
    );
  }

  if (failed) {
    console.log(
      '\n✗ Clerk is refusing these redirects, so native sign-in cannot complete for them.'
      + '\n  Add them to the instance\'s allowed redirect URLs in the Clerk Dashboard'
      + '\n  (Configure → Native Applications), then re-run. Expo Go needs the exp:// URL that'
      + '\n  `npx expo start` prints, which changes with your machine\'s LAN address.',
    );
    process.exit(1);
  }
  if (disabled.length || rejected.length) process.exit(1);
  console.log('\n✓ every provider the app ships is enabled and its redirect authorized.');
}

main().catch((e) => {
  console.error(`✗ check:sso failed: ${e.message}`);
  process.exit(1);
});
