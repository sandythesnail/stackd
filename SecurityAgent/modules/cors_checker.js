'use strict';
// Checks CORS configuration: wildcard+credentials, origin reflection, unanchored regex allowlists,
// localhost in prod config, and overly broad allowed methods.
const path = require('path');
const { walkFiles, readFileSafe, relPath, makeFinding, detectStack } = require('../lib/utils');

const MODULE = 'cors_checker';
let seq = 0;
function nextId() { seq += 1; return `CORS-${String(seq).padStart(3, '0')}`; }
function lineOf(content, index) { return content.slice(0, index).split(/\r?\n/).length; }

function checkFile(root, file, content, findings) {
  const rel = relPath(root, file);
  let m;

  const wildcardRe = /Access-Control-Allow-Origin['"]?\s*[,:]\s*['"]\*['"]/g;
  while ((m = wildcardRe.exec(content))) {
    const windowText = content.slice(Math.max(0, m.index - 300), m.index + 300);
    const withCreds = /Access-Control-Allow-Credentials['"]?\s*[,:]\s*['"]?true/i.test(windowText);
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: withCreds ? 'CRITICAL' : 'MEDIUM',
      title: withCreds ? 'Wildcard CORS origin combined with credentials' : 'Wildcard CORS origin (*)',
      location: `${rel}:${lineOf(content, m.index)}`,
      detail: withCreds
        ? 'Access-Control-Allow-Origin: * together with Access-Control-Allow-Credentials: true lets any website read authenticated responses on behalf of a logged-in user — this combination is directly exploitable.'
        : 'Access-Control-Allow-Origin: * allows any site to read responses from this endpoint (safe only if the endpoint truly returns no sensitive/user-specific data and uses no cookies).',
      remediation: withCreds
        ? 'Never combine * with credentials. Reflect a specific validated origin from an allowlist instead, and only set Allow-Credentials:true for that exact origin.'
        : 'If the endpoint is not meant to be public, replace * with an explicit allowlist of origins.',
      cwe: 'CWE-942', auto_fixable: false,
    }));
  }

  const reflectRe = /Access-Control-Allow-Origin['"]?\s*[,:]\s*req\.headers(?:\.origin|\[['"]origin['"]\])/gi;
  while ((m = reflectRe.exec(content))) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'CRITICAL',
      title: 'Origin header blindly reflected back as Access-Control-Allow-Origin',
      location: `${rel}:${lineOf(content, m.index)}`,
      detail: 'Setting Access-Control-Allow-Origin to req.headers.origin unconditionally allows every origin, functionally equivalent to a wildcard but easy to miss in review, and often paired with credentials:true.',
      remediation: 'Validate the incoming Origin against an explicit allowlist before reflecting it: if (allowlist.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin).',
      cwe: 'CWE-942', auto_fixable: false,
    }));
  }

  // cors({ origin: <regex> }) without ^...$ anchors
  const corsOriginRegexRe = /origin\s*:\s*\/([^/]+)\//g;
  while ((m = corsOriginRegexRe.exec(content))) {
    const pattern = m[1];
    if (!pattern.startsWith('^') || !pattern.endsWith('$')) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'HIGH',
        title: 'CORS origin allowlist regex missing anchors',
        location: `${rel}:${lineOf(content, m.index)}`,
        detail: `Regex /${pattern}/ has no ^ and $ anchors, so it will also match substrings — e.g. a check meant for "stackd.com" will also match "evil-stackd.com" or "stackd.com.evil.net".`,
        remediation: `Anchor the pattern: /^https:\\/\\/(www\\.)?stackd\\.com$/ (adjust to your real domain) so only exact origins match.`,
        cwe: 'CWE-20', auto_fixable: false,
      }));
    }
  }

  const localhostProdRe = /(?:origin|allowlist|allowedOrigins)[\s\S]{0,120}localhost|127\.0\.0\.1/gi;
  if (/NODE_ENV\s*===?\s*['"]production['"]/.test(content) && localhostProdRe.test(content)) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'MEDIUM',
      title: 'localhost/127.0.0.1 present in an origin allowlist alongside production config',
      location: rel,
      detail: 'A localhost/127.0.0.1 entry in the same allowlist used for production weakens CORS protection if the allowlist is not properly branched by NODE_ENV.',
      remediation: 'Only include localhost in a dev-only allowlist branch, never in the list used when NODE_ENV=production.',
      cwe: 'CWE-1188', auto_fixable: false,
    }));
  }

  const methodsRe = /Access-Control-Allow-Methods['"]?\s*[,:]\s*['"]([^'"]+)['"]/g;
  while ((m = methodsRe.exec(content))) {
    const methods = m[1].split(',').map(s => s.trim().toUpperCase());
    if (methods.includes('DELETE') || methods.includes('PUT')) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'LOW',
        title: 'Broad CORS methods allowed',
        location: `${rel}:${lineOf(content, m.index)}`,
        detail: `Access-Control-Allow-Methods includes ${methods.filter(x => x === 'DELETE' || x === 'PUT').join(', ')}. Confirm cross-origin callers actually need these.`,
        remediation: 'Restrict Access-Control-Allow-Methods to only the verbs this API genuinely serves cross-origin.',
        cwe: 'CWE-16', auto_fixable: false,
      }));
    }
  }
}

async function runCheck(codebaseRoot, envConfig) {
  seq = 0;
  const stack = detectStack(codebaseRoot);
  const findings = [];

  const hasStaticHeaderConfig = ['_headers', 'vercel.json', 'netlify.toml'].some(f => require('fs').existsSync(path.join(codebaseRoot, f)));

  if (stack.isStaticSiteOnly && !hasStaticHeaderConfig) {
    return [makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO',
      title: 'Not applicable — no server or hosting CORS config found',
      location: 'n/a',
      detail: 'No backend framework, no _headers file, no vercel.json, and no netlify.toml were found, so there is no CORS configuration (server-side or host-level) to evaluate.',
      remediation: 'No action needed. If this app ever exposes an API to other origins, add explicit origin validation at that point and re-run this check.',
      cwe: null, auto_fixable: false, passed: true,
    })];
  }

  const files = walkFiles(codebaseRoot, { extensions: ['.js', '.ts', '.json', '.toml'] });
  for (const file of files) {
    const content = readFileSafe(file);
    if (content) checkFile(codebaseRoot, file, content, findings);
  }

  if (findings.length === 0) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO', title: 'No unsafe CORS configuration detected',
      location: `${files.length} files scanned`, detail: 'No wildcard+credentials, origin reflection, unanchored regex, or overly broad method allowlists were found.',
      remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true,
    }));
  }
  return findings;
}

module.exports = { runCheck };
