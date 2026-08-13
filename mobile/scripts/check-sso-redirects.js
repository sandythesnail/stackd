#!/usr/bin/env node
/**
 * Asks the live Clerk instance whether it will accept the redirect URLs the NATIVE app uses
 * for Google/Microsoft sign-in.
 *
 * Native SSO (lib/socialAuth.tsx) opens the provider in a browser and comes back to a
 * `stackd://` (build) or `exp://` (Expo Go) URL. Clerk validates that URL against the
 * instance's allowed redirect URLs BEFORE it will even hand out the provider link, and the
 * default for a production instance is to allow none of them: every attempt fails with
 *
 *     resource_missmatch — "Redirect url mismatch ... Review authorized redirect urls"
 *
 * That failure happens on Clerk's side, so no amount of app code fixes it, and it looks
 * identical for both providers. Add the URLs in the Clerk Dashboard (Configure → Native
 * Applications / allowed redirect URLs), then run this to confirm.
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

  console.log(`check:sso — ${host}\n`);
  let failed = 0;

  let unknown = 0;

  for (const redirect of redirects) {
    for (const strategy of ['oauth_google', 'oauth_microsoft']) {
      // One client per attempt: a sign-in already sitting on the client is reused otherwise.
      const result = await probe(host, await nativeClientToken(host), strategy, redirect);
      if (result.ok) {
        console.log(`  ✓ ${strategy.padEnd(17)} ${redirect}`);
      } else if (result.unknown) {
        unknown++;
        console.log(`  ? ${strategy.padEnd(17)} ${redirect}\n      ${result.reason}`);
      } else {
        failed++;
        console.log(`  ✗ ${strategy.padEnd(17)} ${redirect}\n      ${result.reason}`);
      }
      // Space the attempts out; a tight loop is what trips Clerk's rate limit.
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  if (unknown && !failed) {
    console.log('\n? Inconclusive — Clerk rate-limited the check. Wait a minute and re-run.');
    process.exit(2);
  }

  if (failed) {
    console.log(
      '\n✗ Clerk is refusing these redirects, so native Google/Microsoft sign-in cannot complete.'
      + '\n  Add them to the instance\'s allowed redirect URLs in the Clerk Dashboard'
      + '\n  (Configure → Native Applications), then re-run. Expo Go needs the exp:// URL that'
      + '\n  `npx expo start` prints, which changes with your machine\'s LAN address.',
    );
    process.exit(1);
  }
  console.log('\n✓ every redirect above is authorized — native SSO can complete.');
}

main().catch((e) => {
  console.error(`✗ check:sso failed: ${e.message}`);
  process.exit(1);
});
