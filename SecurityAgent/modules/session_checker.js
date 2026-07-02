'use strict';
// Cookie flag checks, CSRF protection, and session fixation (new session ID issued on login).
const { walkFiles, readFileSafe, relPath, makeFinding, detectStack } = require('../lib/utils');

const MODULE = 'session_checker';
let seq = 0;
function nextId() { seq += 1; return `SESS-${String(seq).padStart(3, '0')}`; }
function lineOf(content, index) { return content.slice(0, index).split(/\r?\n/).length; }

function checkCookieFlags(root, file, content, findings) {
  const re = /res\.cookie\(\s*['"]([^'"]+)['"]\s*,[^,]+,\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(content))) {
    const [, name, opts] = m;
    const rel = relPath(root, file);
    const loc = `${rel}:${lineOf(content, m.index)}`;
    const isAuthy = /session|auth|token|sid/i.test(name);
    if (!isAuthy) continue;

    if (!/httpOnly\s*:\s*true/.test(opts)) {
      findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'HIGH', title: `Cookie "${name}" missing HttpOnly`, location: loc, detail: `res.cookie("${name}", ...) does not set httpOnly:true — a script running via XSS can read this cookie.`, remediation: 'Add httpOnly: true to the cookie options.', cwe: 'CWE-1004', auto_fixable: false }));
    }
    if (!/secure\s*:\s*true/.test(opts)) {
      findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'HIGH', title: `Cookie "${name}" missing Secure`, location: loc, detail: `res.cookie("${name}", ...) does not set secure:true — the cookie can be sent over plain HTTP and intercepted.`, remediation: 'Add secure: true (guard behind NODE_ENV==="production" only if you also test over HTTPS locally).', cwe: 'CWE-614', auto_fixable: false }));
    }
    const sameSiteMatch = opts.match(/sameSite\s*:\s*['"]?(\w+)['"]?/i);
    if (!sameSiteMatch || /none/i.test(sameSiteMatch[1])) {
      findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'MEDIUM', title: `Cookie "${name}" missing SameSite or set to None`, location: loc, detail: `SameSite=${sameSiteMatch ? sameSiteMatch[1] : '(unset)'} leaves this cookie exposed to cross-site request forgery.`, remediation: 'Set sameSite: "strict" or "lax" unless a specific, justified cross-site use case requires "none" (which then also requires secure:true).', cwe: 'CWE-352', auto_fixable: false }));
    }
    if (!/maxAge\s*:|expires\s*:/.test(opts)) {
      findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'MEDIUM', title: `Cookie "${name}" has no expiry`, location: loc, detail: 'No maxAge/expires set — this becomes a session cookie with browser-dependent lifetime, and some browsers keep it far longer than intended.', remediation: 'Set an explicit maxAge (or expires) matching your intended session lifetime.', cwe: 'CWE-613', auto_fixable: false }));
    }
  }
}

function checkCsrf(root, files, findings) {
  let usesCookies = false, hasCsrfMiddleware = false, hasStateChangingRoutes = false, allSameSiteStrict = true;
  for (const file of files) {
    const c = readFileSafe(file);
    if (!c) continue;
    if (/res\.cookie\(/.test(c)) usesCookies = true;
    if (/csurf|csrf/i.test(c)) hasCsrfMiddleware = true;
    if (/\b(?:app|router)\.(post|put|delete|patch)\s*\(/.test(c)) hasStateChangingRoutes = true;
    const sameSiteMatches = [...c.matchAll(/sameSite\s*:\s*['"]?(\w+)['"]?/gi)];
    for (const sm of sameSiteMatches) if (!/strict/i.test(sm[1])) allSameSiteStrict = false;
  }
  if (usesCookies && hasStateChangingRoutes && !hasCsrfMiddleware && !allSameSiteStrict) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'HIGH',
      title: 'No CSRF protection for cookie-authenticated state-changing routes',
      location: `${files.length} files scanned`,
      detail: 'Cookies are used for auth and POST/PUT/DELETE/PATCH routes exist, but no CSRF middleware was found and cookies are not all SameSite=Strict.',
      remediation: 'Add CSRF token middleware (e.g. csrf-csrf or double-submit cookie pattern) or set SameSite=Strict on all auth cookies.',
      cwe: 'CWE-352', auto_fixable: false,
    }));
  }
}

function checkSessionFixation(root, files, findings) {
  for (const file of files) {
    const c = readFileSafe(file);
    if (!c) continue;
    const loginBlockMatch = c.match(/(?:passport\.authenticate|\/login['"][\s\S]{0,20}(?:post|get)\([\s\S]{0,600})/i);
    if (loginBlockMatch && /req\.session/.test(loginBlockMatch[0]) && !/session\.regenerate\(/.test(loginBlockMatch[0])) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'HIGH',
        title: 'Session ID not regenerated after login',
        location: relPath(root, file),
        detail: 'The login handler uses req.session but does not call session.regenerate(). An attacker who fixes a victim\'s pre-login session ID (session fixation) can hijack the authenticated session.',
        remediation: 'Call req.session.regenerate((err) => { /* set session data, then respond */ }) immediately after successful authentication, before setting any session data.',
        cwe: 'CWE-384', auto_fixable: false,
      }));
    }
  }
}

async function runCheck(codebaseRoot, envConfig) {
  seq = 0;
  const stack = detectStack(codebaseRoot);
  const findings = [];

  if (stack.isStaticSiteOnly) {
    return [makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO',
      title: 'Not applicable — no cookies or server-side sessions in use',
      location: 'n/a',
      detail: 'This codebase never sets document.cookie, never calls res.cookie(), and has no session store. All state is client-side localStorage, which has no session-fixation or CSRF surface in the traditional sense (there is no server to forge a request against).',
      remediation: 'No action needed. If real authentication with server-side sessions/cookies is added later, re-run this checker.',
      cwe: null, auto_fixable: false, passed: true,
    })];
  }

  const files = walkFiles(codebaseRoot, { extensions: ['.js', '.ts'] });
  for (const file of files) {
    const content = readFileSafe(file);
    if (content) checkCookieFlags(codebaseRoot, file, content, findings);
  }
  checkCsrf(codebaseRoot, files, findings);
  checkSessionFixation(codebaseRoot, files, findings);

  if (findings.length === 0) {
    findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'INFO', title: 'No session/cookie issues detected', location: `${files.length} files scanned`, detail: 'Cookie flags, CSRF protection, and session regeneration all look correct.', remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true }));
  }
  return findings;
}

module.exports = { runCheck };
