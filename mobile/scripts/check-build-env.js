#!/usr/bin/env node
/**
 * Checks that the three EXPO_PUBLIC_* keys will actually reach a BUILD — not just a laptop.
 *
 * There are two completely separate places these can live, and having them in one says
 * nothing about the other:
 *
 *   1. `mobile/.env` — read by Metro on THIS machine, for `npm run ios` / `expo start`.
 *      It is gitignored, on purpose: it is not committed.
 *   2. EAS environment variables — read by EAS Build in the cloud, per environment
 *      (development / preview / production).
 *
 * Because .env is gitignored, EAS Build does not receive it: the project upload honours
 * .gitignore. So a build made with the keys sitting right there in .env can still ship with
 * none of them, and `authEnabled` (lib/env.ts) comes out false in the installed app. What
 * that looks like from the outside is an app where sign-in silently doesn't work — which is
 * indistinguishable, from a TestFlight tester's side, from a broken Clerk configuration. It
 * sends you to the Clerk dashboard for a problem that isn't there.
 *
 * The app now refuses to hide this (lib/AuthUnavailable.tsx names the missing variables on
 * screen in a release build instead of showing the dev sign-in stub). This script is the
 * check you can run BEFORE spending twenty minutes on a build.
 *
 *     npm run check:build-env                # what's in .env, and what EAS has
 *     npm run check:build-env -- --push      # copy .env's values up to EAS (all envs)
 *
 * The values are publishable by design — a Clerk `pk_live_…`, a Supabase project URL and its
 * anon key. All three are compiled into the JS bundle of every build and are readable by
 * anyone who installs the app; they are protected by Clerk's allowed-origins and Supabase's
 * row-level security, not by being secret. That is why they can be pushed as `plaintext`
 * rather than `sensitive` — a sensitive variable can't be read back, which makes exactly this
 * check impossible. Anything genuinely secret (a Clerk SECRET key, a service-role key) must
 * never be an EXPO_PUBLIC_ variable in the first place.
 *
 * Zero dependencies; the EAS parts shell out to eas-cli only if you ask for them.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const KEYS = [
  'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
];

/** Every environment a build can be made against. `development` is included because a
 * development build installed on a phone is still a build, and still gets nothing from .env. */
const ENVIRONMENTS = ['development', 'preview', 'production'];

/** Minimal .env reader — dotenv isn't a dependency here, and this file's format is ours. */
function readDotEnv() {
  const file = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

/** Enough of a value to recognise it, never enough to use it. */
function mask(value) {
  if (!value) return '(empty)';
  return value.length <= 12 ? `${value.slice(0, 4)}…` : `${value.slice(0, 10)}…${value.slice(-4)}`;
}

function eas(args) {
  return execFileSync('npx', ['--yes', 'eas-cli@latest', ...args], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/** Which of KEYS the given EAS environment already has. Returns null when eas-cli can't be
 * reached at all (offline, not logged in) — which is not the same answer as "none of them",
 * and reporting it as such would send you to set variables that are already there. */
function easKeys(environment) {
  try {
    const out = eas(['env:list', '--environment', environment, '--non-interactive']);
    return KEYS.filter((k) => out.includes(k));
  } catch {
    return null;
  }
}

function main() {
  const push = process.argv.includes('--push');
  const local = readDotEnv();

  console.log('check:build-env\n');
  console.log('  mobile/.env  (this machine only)');
  let missingLocally = 0;
  for (const key of KEYS) {
    const value = local[key] || process.env[key] || '';
    if (!value) missingLocally++;
    console.log(`    ${value ? '✓' : '✗'} ${key.padEnd(36)} ${mask(value)}`);
  }

  if (missingLocally) {
    console.log(
      `\n✗ ${missingLocally} of ${KEYS.length} missing from mobile/.env — copy .env.example and fill it in.`
      + '\n  Without them the app runs local-only: no accounts, no sync, no social sign-in.',
    );
    process.exit(1);
  }

  if (push) {
    console.log('\n  Pushing to EAS');
    for (const environment of ENVIRONMENTS) {
      for (const key of KEYS) {
        try {
          // `--force` overwrites an existing variable rather than failing on it, which is what
          // makes this safe to re-run after a key rotation.
          eas([
            'env:create', '--environment', environment, '--name', key,
            '--value', local[key], '--visibility', 'plaintext',
            '--scope', 'project', '--force', '--non-interactive',
          ]);
          console.log(`    ✓ ${environment.padEnd(12)} ${key}`);
        } catch (e) {
          console.log(`    ✗ ${environment.padEnd(12)} ${key}\n        ${String(e.stderr || e.message).trim().split('\n')[0]}`);
        }
      }
    }
  }

  console.log('\n  EAS environment variables (what a cloud build actually gets)');
  let anyMissing = false;
  let reachable = false;
  for (const environment of ENVIRONMENTS) {
    const present = easKeys(environment);
    if (present === null) {
      console.log(`    ? ${environment.padEnd(12)} couldn't ask EAS (offline, or not logged in — try \`npx eas-cli login\`)`);
      continue;
    }
    reachable = true;
    const missing = KEYS.filter((k) => !present.includes(k));
    if (missing.length) anyMissing = true;
    console.log(
      missing.length
        ? `    ✗ ${environment.padEnd(12)} missing ${missing.join(', ')}`
        : `    ✓ ${environment.padEnd(12)} all ${KEYS.length} present`,
    );
  }

  if (!reachable) {
    console.log(
      '\n? Inconclusive — the local .env is fine, but EAS could not be reached, so this'
      + '\n  says nothing about what a cloud build would receive. Log in and re-run.',
    );
    process.exit(2);
  }

  if (anyMissing) {
    console.log(
      '\n✗ A build made against those environments ships with sign-in disabled — the app will'
      + '\n  show "Sign-in isn\'t available" instead of the sign-in screen (lib/AuthUnavailable.tsx).'
      + '\n  Fix it with:  npm run check:build-env -- --push',
    );
    process.exit(1);
  }

  console.log('\n✓ .env and EAS agree — a build from any environment will have working sign-in.');
}

main();
