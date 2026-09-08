'use strict';
// Checks JWT implementation, password handling, authorization/IDOR, and session management.
const { walkFiles, readFileSafe, relPath, makeFinding, detectStack } = require('../lib/utils');

const MODULE = 'auth_checker';
let seq = 0;
function nextId() { seq += 1; return `AUTH-${String(seq).padStart(3, '0')}`; }

function lineOf(content, index) { return content.slice(0, index).split(/\r?\n/).length; }

function checkFile(root, file, content, findings) {
  const rel = relPath(root, file);

  // 3.1 JWT
  let m;
  const algNoneRe = /alg(?:orithm)?s?\s*:\s*\[?\s*['"]none['"]/gi;
  while ((m = algNoneRe.exec(content))) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'CRITICAL',
      title: 'JWT verification accepts alg: none',
      location: `${rel}:${lineOf(content, m.index)}`,
      detail: 'Allowing the "none" algorithm lets an attacker submit an unsigned token with any claims and have it accepted as valid.',
      remediation: 'Explicitly whitelist algorithms, e.g. jwt.verify(token, secret, { algorithms: ["HS256"] }), and never include "none".',
      cwe: 'CWE-347', auto_fixable: false,
    }));
  }
  const jwtSecretRe = /jwt\.sign\([^,]+,\s*["'][^"']{4,}["']/g;
  while ((m = jwtSecretRe.exec(content))) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'CRITICAL',
      title: 'JWT signing secret hardcoded in source',
      location: `${rel}:${lineOf(content, m.index)}`,
      detail: 'jwt.sign() is called with a string literal secret instead of an environment variable. Anyone with repo access can forge valid tokens.',
      remediation: 'Move the secret to process.env.JWT_SECRET, generate it with at least 256 bits of entropy, and never commit it.',
      cwe: 'CWE-798', auto_fixable: false,
    }));
  }
  const expiresMatch = content.match(/expiresIn\s*:\s*['"]?(\d+)([a-z]*)['"]?/i);
  if (/jwt\.sign\(/.test(content) && !expiresMatch) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'HIGH',
      title: 'JWT issued with no expiry',
      location: rel,
      detail: 'jwt.sign() is used without an expiresIn option. Tokens without expiry remain valid forever if leaked.',
      remediation: 'Add expiresIn to the sign options, e.g. { expiresIn: "15m" } for access tokens.',
      cwe: 'CWE-613', auto_fixable: false,
    }));
  }
  if (/localStorage\.setItem\(\s*["'](?:.*token.*|.*jwt.*|.*auth.*)["']/i.test(content)) {
    const idx = content.search(/localStorage\.setItem\(\s*["'](?:.*token.*|.*jwt.*|.*auth.*)["']/i);
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'MEDIUM',
      title: 'Auth token stored in localStorage',
      location: `${rel}:${lineOf(content, idx)}`,
      detail: 'Tokens in localStorage are readable by any script on the page, so a single XSS bug becomes full account takeover.',
      remediation: 'Store session/auth tokens in an httpOnly, Secure, SameSite cookie instead so client-side JS cannot read them.',
      cwe: 'CWE-522', auto_fixable: false,
    }));
  }

  // 3.2 Password handling
  const weakHashRe = /crypto\.createHash\(\s*['"](md5|sha1|sha256)['"]\s*\)[\s\S]{0,80}(password|passwd)/gi;
  while ((m = weakHashRe.exec(content))) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'CRITICAL',
      title: `Password hashed with weak algorithm (${m[1]})`,
      location: `${rel}:${lineOf(content, m.index)}`,
      detail: `${m[1].toUpperCase()} is fast and unsalted-by-default, making offline brute force/rainbow-table attacks practical against any leaked hash.`,
      remediation: 'Use bcrypt (cost ≥12), argon2 (memory ≥64MB), or scrypt instead. Never use general-purpose hash functions for passwords.',
      cwe: 'CWE-916', auto_fixable: false,
    }));
  }
  const bcryptRe = /bcrypt\.(?:hash|hashSync)\([^,]+,\s*(\d+)/g;
  while ((m = bcryptRe.exec(content))) {
    const cost = Number(m[1]);
    if (cost < 12) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'HIGH',
        title: `bcrypt cost factor too low (${cost})`,
        location: `${rel}:${lineOf(content, m.index)}`,
        detail: `bcrypt cost factor ${cost} is below the recommended minimum of 12, making brute force cheaper.`,
        remediation: 'Raise the bcrypt cost factor to at least 12 (13-14 if your server budget allows the extra latency).',
        cwe: 'CWE-916', auto_fixable: false,
      }));
    }
  }
  const minLenRe = /(?:password|passwd).{0,40}?\.length\s*[<>]=?\s*(\d+)/gi;
  while ((m = minLenRe.exec(content))) {
    const n = Number(m[1]);
    if (n < 8) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'HIGH',
        title: `Minimum password length below 8 (found ${n})`,
        location: `${rel}:${lineOf(content, m.index)}`,
        detail: 'Short minimum length policies make passwords much easier to brute force.',
        remediation: 'Require a minimum of 8 characters (12+ recommended), and consider checking against a breached-password list instead of complexity rules.',
        cwe: 'CWE-521', auto_fixable: false,
      }));
    }
  }
  const bodyLogRe = /console\.log\([^)]*req\.body[^)]*\)|logger\.\w+\([^)]*req\.body[^)]*\)/g;
  while ((m = bodyLogRe.exec(content))) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'CRITICAL',
      title: 'req.body logged wholesale (may include passwords)',
      location: `${rel}:${lineOf(content, m.index)}`,
      detail: 'Logging the entire request body will capture plaintext passwords, tokens, and PII submitted on auth/profile routes.',
      remediation: 'Log only the specific non-sensitive fields you need, e.g. logger.info({ userId }) — never the raw body object.',
      cwe: 'CWE-532', auto_fixable: false,
    }));
  }

  // 3.3 Authorization / IDOR
  const roleFromClientRe = /role\s*:\s*req\.(body|query|params)\.role|req\.(body|query|params)\.role\s*[=!]==?/g;
  while ((m = roleFromClientRe.exec(content))) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'CRITICAL',
      title: 'User role read from client-controlled input',
      location: `${rel}:${lineOf(content, m.index)}`,
      detail: 'Reading role from req.body/query/params lets any authenticated (or unauthenticated) client set their own privilege level.',
      remediation: 'Never trust a client-supplied role. Look up the role server-side from the authenticated user record (req.user.role from a verified session/JWT).',
      cwe: 'CWE-639', auto_fixable: false,
    }));
  }

  // 3.4 Session management
  if (/req\.session\s*=\s*null|res\.clearCookie\(/.test(content) && !/session\.destroy\(/.test(content)) {
    const idx = content.search(/res\.clearCookie\(/);
    if (idx >= 0) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'HIGH',
        title: 'Logout clears cookie but does not destroy server-side session',
        location: `${rel}:${lineOf(content, idx)}`,
        detail: 'Clearing the cookie without calling session.destroy() leaves the session valid server-side — a captured session ID keeps working after "logout".',
        remediation: 'Call req.session.destroy() (or your session store\'s equivalent invalidation) in addition to clearing the cookie.',
        cwe: 'CWE-613', auto_fixable: false,
      }));
    }
  }
}

/** Whether authentication is delegated to a hosted identity provider rather than absent.
 *
 * "No backend" and "no authentication" are not the same claim, and this module used to
 * conflate them: any static site got a hardcoded finding asserting that login.js "redirects
 * to app.html with no network call, no credential verification, and no token issuance". That
 * was true of this repo once. It has been a real Clerk `mountSignIn` since, with Supabase RLS
 * behind it — so the scanner reported a critical-sounding falsehood on every run, which is
 * how a report teaches the person reading it to skim. Detected rather than assumed, so it
 * goes back to saying there is no auth the moment the provider is actually removed. */
function hostedAuthProvider(root) {
  const files = walkFiles(root, { extensions: ['.js', '.ts', '.tsx', '.html'] });
  const PROVIDERS = [
    { name: 'Clerk', re: /\bClerk\.load\(|@clerk\/|mountSignIn\(|clerk\.[a-z0-9-]+\.(?:com|dev)/i },
    { name: 'Auth0', re: /@auth0\/|createAuth0Client\(/i },
    { name: 'Firebase Authentication', re: /firebase\/auth|signInWithPopup\(/i },
    { name: 'Supabase Auth', re: /supabase\.auth\.signIn/i },
  ];
  for (const file of files) {
    const content = readFileSafe(file);
    if (!content) continue;
    for (const p of PROVIDERS) {
      if (p.re.test(content)) return { name: p.name, where: relPath(root, file) };
    }
  }
  return null;
}

async function runCheck(codebaseRoot, envConfig) {
  seq = 0;
  const stack = detectStack(codebaseRoot);
  const findings = [];

  if (stack.isStaticSiteOnly) {
    const provider = hostedAuthProvider(codebaseRoot);
    if (provider) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'INFO',
        title: `Authentication is delegated to a hosted provider (${provider.name})`,
        location: provider.where,
        detail: `This app has no backend of its own, but it does not hand out its own sessions either: sign-in is ${provider.name}'s hosted widget, and credential verification, password storage and token issuance all happen on the provider's side. What is worth reviewing here is therefore not "is there a login" but what the issued token is trusted to do — this repo's data access runs through Supabase, so its Row Level Security policies are the real authorization boundary and are not checked by this module.`,
        remediation: 'No action needed for the sign-in flow itself. Review the Supabase RLS policies (supabase/) separately: a correct login in front of a table that any authenticated user can read is still a broken authorization boundary.',
        cwe: null, auto_fixable: false, passed: true,
      }));
    } else {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'INFO',
        title: 'No authentication system exists',
        location: 'login.js, login.html',
        detail: 'This app has no backend, database, or session store, and no hosted identity provider was detected either — so there is no credential verification and no token issuance anywhere. All app state lives in localStorage and is trivially editable via browser devtools.',
        remediation: 'This is fine for a static demo/prototype, but before this app ever stores real user data, PII, or anything beyond a local high-score-style save file, put a real identity provider (or a real backend with verified credentials, hashed passwords via bcrypt/argon2, and signed session cookies) in front of it.',
        cwe: 'CWE-306', auto_fixable: false,
      }));
    }
    // Deliberately NOT an early return any more. The per-file checks below are about what
    // the client-side code does with tokens and secrets — a hardcoded JWT signing secret, an
    // auth token parked in localStorage — none of which needs a backend to be present, and
    // all of which went unscanned on this repo for as long as the early return stood here.
  }

  const files = walkFiles(codebaseRoot, { extensions: ['.js', '.ts', '.py'] });
  for (const file of files) {
    const content = readFileSafe(file);
    if (content) checkFile(codebaseRoot, file, content, findings);
  }

  if (findings.length === 0) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO', title: 'No auth/JWT/password-handling issues detected',
      location: `${files.length} files scanned`, detail: 'No unsafe JWT config, weak password hashing, client-controlled roles, or broken logout flows were found.',
      remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true,
    }));
  }
  return findings;
}

module.exports = { runCheck };
