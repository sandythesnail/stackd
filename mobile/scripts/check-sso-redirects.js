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
  return url ? { ok: true } : { ok: false, reason: 'no provider redirect returned' };
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

  for (const redirect of redirects) {
    for (const strategy of strategies) {
      // One client per attempt: a sign-in already sitting on the client is reused otherwise.
      const result = await probe(host, await nativeClientToken(host), strategy, redirect);
      if (result.ok) {
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

  if (unknown && !failed) {
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
  if (disabled.length) process.exit(1);
  console.log('\n✓ every provider the app ships is enabled and its redirect authorized.');
}

main().catch((e) => {
  console.error(`✗ check:sso failed: ${e.message}`);
  process.exit(1);
});
