#!/usr/bin/env node
// Copies the static site into dist/, substituting the __TOKEN__ placeholders in
// app.html/index.html/login.html/signup.html/app-auth.js with the Clerk publishable
// key and Supabase URL/anon key. These are public/publishable keys (safe to ship to
// the browser) — pulling them from env vars just keeps a single source of truth in
// Vercel's project settings instead of hardcoded literals in source, and lets
// preview/production point at different Clerk or Supabase projects if needed.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist');

function loadDotEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnv();

const REQUIRED_ENV = ['CLERK_PUBLISHABLE_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missing = REQUIRED_ENV.filter(name => !process.env[name]);
if (missing.length) {
  console.error(`Missing required env var(s): ${missing.join(', ')}`);
  console.error('Set them in Vercel project settings, or in a local .env file for a local build.');
  process.exit(1);
}

const REPLACEMENTS = {
  __CLERK_PUBLISHABLE_KEY__: process.env.CLERK_PUBLISHABLE_KEY,
  __SUPABASE_URL__: process.env.SUPABASE_URL,
  __SUPABASE_ANON_KEY__: process.env.SUPABASE_ANON_KEY,
};

// Only these root-level files reference the placeholders above — everything else
// is copied byte-for-byte.
const FILES_WITH_PLACEHOLDERS = new Set([
  'app.html', 'index.html', 'login.html', 'signup.html', 'app-auth.js',
]);

// Directories/files that aren't part of the deployed static site (tooling, the
// separate mobile app, repo metadata) and shouldn't be copied into dist/.
const EXCLUDE_AT_ROOT = new Set([
  '.git', 'node_modules', 'dist', '.claude', '.agents', '.github',
  'mobile', 'SecurityAgent', 'supabase', 'scripts',
  'package.json', 'package-lock.json', 'skills-lock.json', '.gitignore', 'vercel.json', '.env',
]);

// Render-blocking script injected at the top of every page's <head>. It bounces
// phones / narrow viewports to the Expo app under /m/ (see m-redirect.js), while
// desktop widths stay on this vanilla site. The mobile app export under dist/m is
// added after this build runs, so its pages are never injected (no redirect loop).
const REDIRECT_TAG = '<script src="/m-redirect.js"></script>';

function injectRedirect(html) {
  if (html.includes(REDIRECT_TAG)) return html;
  // Insert immediately after the opening <head ...> so it runs before first paint.
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}${REDIRECT_TAG}`);
  }
  return html; // no <head> (not an app page) — leave untouched
}

function copyDir(srcDir, destDir, isRoot) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (isRoot && EXCLUDE_AT_ROOT.has(entry.name)) continue;
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest, false);
    } else if (isRoot && FILES_WITH_PLACEHOLDERS.has(entry.name)) {
      let content = fs.readFileSync(src, 'utf-8');
      for (const [token, value] of Object.entries(REPLACEMENTS)) {
        content = content.split(token).join(value);
      }
      fs.writeFileSync(dest, injectRedirect(content));
    } else if (entry.name.endsWith('.html')) {
      // Every other HTML page still needs the viewport redirect.
      fs.writeFileSync(dest, injectRedirect(fs.readFileSync(src, 'utf-8')));
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
copyDir(ROOT, OUT, true);
console.log(`Build complete: static site written to ${path.relative(ROOT, OUT)}/`);
