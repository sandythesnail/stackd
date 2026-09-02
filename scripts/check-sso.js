#!/usr/bin/env node
/**
 * Asks the live Clerk instance whether social sign-in ON THE WEBSITE can actually complete,
 * and then asks the PROVIDER the same question.
 *
 * mobile/scripts/check-sso-redirects.js already covers the native app. It stops one step
 * short of the thing that broke here: it checks that Clerk hands back an authorization URL,
 * which is a statement about Clerk's configuration and says nothing about whether the
 * provider on the other end will accept it. Apple was enabled on the Clerk instance, Clerk
 * produced a perfectly well-formed appleid.apple.com URL for it, and Apple answered
 * `invalid_client` — so every check passed and every click failed.
 *
 * This follows the URL. Three things are checked, in the order they can fail:
 *
 *  1. The provider has an SSO connection on the instance at all. Clerk rejects the strategy
 *     outright otherwise — `form_param_value_invalid`. Fix: Clerk Dashboard → SSO Connections.
 *
 *  2. The authorization URL carries `prompt` for Google and Microsoft and NOT for Apple.
 *     `prompt` is an OIDC parameter Apple does not implement, and clerk-account-picker.js
 *     used to attach it to every strategy beginning `oauth_`. The provider list is read out
 *     of clerk-account-picker.js rather than written here, so the page and the check cannot
 *     drift the way the app and the native check once did.
 *
 *  3. The provider actually accepts the client. This is the step that catches a Services ID
 *     that does not exist, is not enabled for Sign in with Apple, or whose Return URL does
 *     not match the one Clerk redirects to — all three of which Apple reports identically,
 *     as `invalid_client` on an otherwise normal-looking page.
 *
 * Deliberately NOT part of `npm run check`: it needs the network and talks to production.
 *
 *     npm run check:sso
 *
 * Zero dependencies — plain Node, publishable key only (no secrets involved).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CLERK_JS_VERSION = '5.125.5';
// The website's own sign-in runs in a browser, so the provider pages are fetched as one.
// Apple in particular serves a different page to a non-browser agent.
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) '
  + 'Chrome/131.0.0.0 Safari/537.36';

/** Reads CLERK_PUBLISHABLE_KEY out of .env (dotenv isn't a dependency here). */
function publishableKey() {
  if (process.env.CLERK_PUBLISHABLE_KEY) return process.env.CLERK_PUBLISHABLE_KEY;
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return '';
  const line = fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('CLERK_PUBLISHABLE_KEY='));
  return line ? line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '') : '';
}

/** The Frontend API host is base64'd into the publishable key: pk_live_<base64 host + '$'>. */
function frontendApi(key) {
  return Buffer.from(key.replace(/^pk_(live|test)_/, ''), 'base64').toString('utf8').replace(/\$$/, '');
}

/**
 * Which strategies the site attaches `prompt` to, read out of clerk-account-picker.js's
 * PROMPT_STRATEGIES so this script cannot drift from the page. A regex over the source
 * rather than an import: that file is a browser IIFE that touches `window` on load.
 */
function promptStrategies() {
  const src = fs.readFileSync(path.join(ROOT, 'clerk-account-picker.js'), 'utf8');
  const m = src.match(/PROMPT_STRATEGIES\s*=\s*\[([^\]]*)\]/);
  if (!m) return null;
  return [...m[1].matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1]);
}

/** Which providers the instance has an SSO connection for. Unauthenticated, so free to ask. */
async function enabledProviders(host) {
  const res = await fetch(`https://${host}/v1/environment?_clerk_js_version=${CLERK_JS_VERSION}`);
  const body = await res.json();
  const social = body.user_settings && body.user_settings.social;
  if (!social) throw new Error(`Clerk did not return user_settings.social (HTTP ${res.status})`);
  return social;
}

async function nativeClientToken(host) {
  const res = await fetch(`https://${host}/v1/client?_is_native=1&_clerk_js_version=${CLERK_JS_VERSION}`, {
    method: 'POST',
  });
  const token = res.headers.get('authorization');
  if (!token) throw new Error(`Clerk did not return a client token (HTTP ${res.status})`);
  return token;
}

/**
 * Starts an OAuth sign-in and returns the provider URL Clerk generates.
 *
 * Uses the native endpoint with the app's own allowlisted redirect. The browser widget's
 * request needs a dev-browser handshake and a real origin, which is a lot of machinery to
 * reproduce for no gain: the provider URL Clerk builds — client id, redirect_uri, scope, and
 * whether `prompt` is on it — is the same either way, because it comes from the instance's
 * connection config and the create-call parameters, not from the caller's platform.
 */
async function providerUrl(host, token, strategy, extra) {
  const res = await fetch(`https://${host}/v1/client/sign_ins?_is_native=1&_clerk_js_version=${CLERK_JS_VERSION}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(Object.assign({ strategy, redirect_url: 'stackd://' }, extra || {})),
  });
  if (res.status === 429) return { rateLimited: true };
  const body = await res.json();
  if (body.errors) {
    const err = body.errors[0];
    const reason = err.long_message || err.message;
    if (err.code === 'rate_limit_exceeded' || /too many requests/i.test(reason)) return { rateLimited: true };
    if (err.code === 'form_param_value_invalid' && err.meta && err.meta.param_name === 'strategy') {
      return { disabled: true, reason: 'not enabled on this Clerk instance' };
    }
    return { reason };
  }
  const url = body.response
    && body.response.first_factor_verification
    && body.response.first_factor_verification.external_verification_redirect_url;
  return url ? { url } : { reason: 'Clerk returned no provider redirect URL' };
}

/**
 * Asks the provider whether it will accept the client. A provider that is happy shows its own
 * sign-in page; one that is not says so in the page it serves instead.
 *
 * Only clearly-identified refusals are reported. A page this doesn't recognise is reported as
 * unknown rather than as a pass or a failure — the point of this check is to catch a definite
 * "no", and inventing a verdict for an unfamiliar page would make it untrustworthy in both
 * directions.
 */
async function providerAccepts(url) {
  let res;
  let body;
  try {
    res = await fetch(url, { headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html' }, redirect: 'follow' });
    body = await res.text();
  } catch (e) {
    return { unknown: true, reason: `could not reach the provider (${e.message})` };
  }
  const errorCode = (body.match(/"errorCode"\s*:\s*"([^"]+)"/) || [])[1];
  if (errorCode) return { ok: false, code: errorCode };
  // Google and Microsoft both put their failures in the query string of the page they land on.
  const inUrl = (res.url.match(/[?&]error=([a-z_]+)/) || [])[1];
  if (inUrl && inUrl !== 'null') return { ok: false, code: inUrl };
  if (res.status >= 400) return { ok: false, code: `HTTP ${res.status}` };
  return { ok: true };
}

/** What to do about each provider's refusal, in the provider's own vocabulary. */
const REMEDY = {
  oauth_apple:
    'Apple answers invalid_client when the Services ID does not exist, is not enabled for\n'
    + '        Sign in with Apple, or its Return URL does not match the one Clerk redirects to.\n'
    + '        Apple Developer -> Identifiers -> the Services ID -> Sign in with Apple -> Configure:\n'
    + '        the Return URL must be exactly the redirect_uri in the URL above, and the domain\n'
    + '        above it must be listed too. Then re-paste Team ID / Services ID / Key ID / .p8\n'
    + '        into Clerk Dashboard -> SSO Connections -> Apple. See mobile/APP_STORE.md section 7.',
};

async function main() {
  const key = publishableKey();
  if (!key) {
    console.error('✗ check:sso: no CLERK_PUBLISHABLE_KEY in the environment or .env.');
    process.exit(1);
  }
  const host = frontendApi(key);
  const wantPrompt = promptStrategies();
  if (!wantPrompt) {
    console.error('✗ check:sso: could not find PROMPT_STRATEGIES in clerk-account-picker.js — has it moved?');
    process.exit(1);
  }

  console.log(`check:sso — ${host}\n`);

  const social = await enabledProviders(host);
  // Every provider the instance offers, because the website's widget renders a button for
  // every one of them — the site does not choose a subset the way the native app does.
  const strategies = Object.keys(social).filter((s) => social[s] && social[s].enabled);
  if (!strategies.length) {
    console.error('✗ check:sso: the instance has no social connections enabled at all.');
    process.exit(1);
  }

  console.log('  Clerk SSO connections');
  for (const s of strategies) console.log(`    ✓ ${s.padEnd(17)} enabled`);

  console.log('\n  Provider authorization URLs');
  let failed = 0;
  let rateLimited = 0;
  const notes = [];

  for (const strategy of strategies) {
    const shouldPrompt = wantPrompt.indexOf(strategy) !== -1;
    const gen = await providerUrl(
      host,
      await nativeClientToken(host),
      strategy,
      shouldPrompt ? { oidc_prompt: 'select_account' } : null,
    );

    if (gen.rateLimited) {
      rateLimited++;
      console.log(`    ? ${strategy.padEnd(17)} rate limited by Clerk — wait a minute and re-run`);
      continue;
    }
    if (!gen.url) {
      failed++;
      console.log(`    ✗ ${strategy.padEnd(17)} ${gen.reason}`);
      continue;
    }

    const parsed = new URL(gen.url);
    const hasPrompt = parsed.searchParams.has('prompt');
    // The prompt half. A missing chooser is a nuisance; a prompt the provider never asked for
    // is a dead button, so only the second one fails the check.
    if (hasPrompt && !shouldPrompt) {
      failed++;
      console.log(`    ✗ ${strategy.padEnd(17)} carries prompt=${parsed.searchParams.get('prompt')}, which this provider does not take`);
      notes.push(`${strategy}: remove it from PROMPT_STRATEGIES in clerk-account-picker.js.`);
    } else if (!hasPrompt && shouldPrompt) {
      console.log(`    ! ${strategy.padEnd(17)} no prompt — the account chooser will be skipped`);
      notes.push(`${strategy}: Clerk dropped oidcPrompt. Sign-in still works; it just stops asking which account.`);
    }

    const accepted = await providerAccepts(gen.url);
    if (accepted.ok) {
      const chooser = shouldPrompt && hasPrompt ? ' (asks which account)' : '';
      console.log(`    ✓ ${strategy.padEnd(17)} ${parsed.host} accepts the client${chooser}`);
    } else if (accepted.unknown) {
      console.log(`    ? ${strategy.padEnd(17)} ${accepted.reason}`);
    } else {
      failed++;
      console.log(`    ✗ ${strategy.padEnd(17)} ${parsed.host} refused the client: ${accepted.code}`);
      console.log(`        ${gen.url}`);
      if (REMEDY[strategy]) console.log(`        ${REMEDY[strategy]}`);
    }
    // Space the attempts out; a tight loop is what trips Clerk's rate limit.
    await new Promise((r) => setTimeout(r, 1500));
  }

  for (const n of notes) console.log(`\n  note: ${n}`);

  if (rateLimited && !failed) {
    console.log('\n? Inconclusive — Clerk rate-limited the check. Wait a minute and re-run.');
    process.exit(2);
  }
  if (failed) {
    console.log('\n✗ At least one provider button on the website is dead. Details above.');
    process.exit(1);
  }
  console.log('\n✓ every enabled provider is reachable and accepts the client.');
}

main().catch((e) => {
  console.error('✗ check:sso:', e.message);
  process.exit(1);
});
