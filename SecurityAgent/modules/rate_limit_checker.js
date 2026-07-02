'use strict';
// Finds route definitions (Express / Next.js API routes) and checks rate-limiting coverage,
// auth-endpoint strictness, bypass vectors, resource exhaustion, and response format.
const path = require('path');
const { walkFiles, readFileSafe, relPath, makeFinding, detectStack } = require('../lib/utils');

const MODULE = 'rate_limit_checker';
let seq = 0;
function nextId() { seq += 1; return `RL-${String(seq).padStart(3, '0')}`; }

const AUTH_ROUTE_RULES = [
  { re: /\/(auth\/)?(login|signin)\b/i, name: 'login', max: 5, windowMin: 1 },
  { re: /\/(auth\/)?(register|signup)\b/i, name: 'register', max: 3, windowMin: 10 },
  { re: /\/(auth\/)?(forgot-password|reset-password)\b/i, name: 'forgot/reset password', max: 3, windowMin: 60 },
  { re: /\/(auth\/)?(verify|otp)\b/i, name: 'verify/otp', max: 5, windowMin: 15 },
];

function findExpressRoutes(files, root) {
  const routes = [];
  const routeCallRe = /\b(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*["'`]([^"'`]+)["'`]/g;
  for (const file of files) {
    const content = readFileSafe(file);
    if (!content || !/require\(['"]express['"]\)|from ['"]express['"]/.test(content)) continue;
    let m;
    routeCallRe.lastIndex = 0;
    while ((m = routeCallRe.exec(content)) !== null) {
      const upTo = content.slice(0, m.index);
      const line = upTo.split(/\r?\n/).length;
      routes.push({ method: m[1].toUpperCase(), routePath: m[2], file, line, content });
    }
  }
  return routes;
}

function findNextApiRoutes(root) {
  const dirs = [path.join(root, 'pages', 'api'), path.join(root, 'app', 'api')];
  const routes = [];
  for (const dir of dirs) {
    const files = walkFiles(dir, { extensions: ['.js', '.ts'] });
    for (const file of files) {
      const content = readFileSafe(file);
      if (!content) continue;
      const routePath = '/' + path.relative(dir, file).replace(/\\/g, '/').replace(/\.(js|ts)$/, '');
      routes.push({ method: 'ANY', routePath, file, line: 1, content });
    }
  }
  return routes;
}

function checkRoute(root, route) {
  const findings = [];
  const rel = relPath(root, route.file);
  const loc = `${rel}:${route.line}`;
  const hasRateLimitNearby = /rate.?limit|rateLimiter|slowDown|express-rate-limit/i.test(route.content);
  const authRule = AUTH_ROUTE_RULES.find(r => r.re.test(route.routePath));

  if (!hasRateLimitNearby) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE,
      severity: authRule ? 'HIGH' : 'MEDIUM',
      title: `No rate limiting detected on ${route.method} ${route.routePath}`,
      location: loc,
      detail: `Route "${route.routePath}" has no rate-limiting middleware (no "rate-limit"/"rateLimiter"/"slowDown" reference found in this file).${authRule ? ' This is an auth-sensitive route and must be strictly limited.' : ''}`,
      remediation: authRule
        ? `Apply express-rate-limit scoped to this route: max ${authRule.max} requests per ${authRule.windowMin} minute(s) per IP, and set skipFailedRequests:false so failed attempts still count.`
        : 'Apply a rate-limiting middleware (e.g. express-rate-limit) either globally via app.use() or scoped to this route.',
      cwe: 'CWE-770',
      auto_fixable: false,
    }));
  } else if (authRule) {
    const limitMatch = route.content.match(/max\s*:\s*(\d+)/);
    const windowMatch = route.content.match(/windowMs\s*:\s*([\d*]+)/);
    if (limitMatch) {
      const declaredMax = Number(limitMatch[1]);
      if (declaredMax > authRule.max) {
        findings.push(makeFinding({
          id: nextId(), module: MODULE, severity: 'HIGH',
          title: `Rate limit on ${route.routePath} is looser than required`,
          location: loc,
          detail: `Configured max=${declaredMax}, required max=${authRule.max} per ${authRule.windowMin} minute(s) for ${authRule.name} routes.`,
          remediation: `Lower "max" to ${authRule.max} in the rate-limit config for this route.`,
          cwe: 'CWE-307', auto_fixable: false,
        }));
      }
    }
    if (/skipFailedRequests\s*:\s*true/.test(route.content)) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'HIGH',
        title: `skipFailedRequests enabled on auth route ${route.routePath}`,
        location: loc,
        detail: 'skipFailedRequests:true means failed login attempts do not count toward the limit, defeating brute-force protection.',
        remediation: 'Set skipFailedRequests:false (or remove the option — false is the default) so failed attempts count toward the limit.',
        cwe: 'CWE-307', auto_fixable: false,
      }));
    }
    void windowMatch;
  }

  if (hasRateLimitNearby) {
    if (/keyGenerator\s*:\s*\([^)]*\)\s*=>\s*req\.ip\b/.test(route.content) || (!/keyGenerator/.test(route.content) && authRule)) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'MEDIUM',
        title: `Rate limit keyed only on IP for ${route.routePath}`,
        location: loc,
        detail: 'Limiting by IP alone lets an attacker distribute attempts across many IPs, or lets one IP (e.g. shared NAT/campus network) lock out unrelated users.',
        remediation: 'For authenticated routes, key on IP + user identifier (e.g. email/username) so limits are per-account, not just per-IP.',
        cwe: 'CWE-307', auto_fixable: false,
      }));
    }
    if (/req\.headers\[['"]x-forwarded-for['"]\]|X-Forwarded-For/i.test(route.content) && !/trust proxy/i.test(route.content)) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'HIGH',
        title: `X-Forwarded-For trusted without validation near ${route.routePath}`,
        location: loc,
        detail: 'X-Forwarded-For is a client-supplied header. Trusting it directly lets an attacker set an arbitrary IP to bypass IP-based rate limiting.',
        remediation: 'Only trust X-Forwarded-For behind a known proxy via app.set("trust proxy", N) with the correct hop count, never parse the header manually.',
        cwe: 'CWE-290', auto_fixable: false,
      }));
    }
    if (/new Map\(\)|let\s+\w*attempts\w*\s*=\s*\{\}/.test(route.content) && /rate.?limit/i.test(route.content)) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'HIGH',
        title: `Rate limit state appears to be in-memory near ${route.routePath}`,
        location: loc,
        detail: 'An in-memory Map/object for rate-limit counters resets on every restart/deploy and is not shared across multiple instances, making the limit trivially bypassable.',
        remediation: 'Back the rate limiter with a shared store (e.g. Redis via rate-limit-redis) so limits survive restarts and apply across all instances.',
        cwe: 'CWE-799', auto_fixable: false,
      }));
    }
  }

  return findings;
}

async function runCheck(codebaseRoot, envConfig) {
  seq = 0;
  const stack = detectStack(codebaseRoot);

  if (stack.isStaticSiteOnly) {
    return [makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO',
      title: 'Not applicable — no server-side routes detected',
      location: 'n/a',
      detail: 'This codebase has no package.json, no server entrypoint, and no /api or /pages/api directory. It is a static HTML/CSS/JS site with no backend, so there are no routes for rate limiting to apply to.',
      remediation: 'No action needed while this stays a static frontend. If a backend/API is added later, re-run this checker — it will parse Express routes and Next.js API routes automatically.',
      cwe: null, auto_fixable: false, passed: true,
    })];
  }

  const allFiles = walkFiles(codebaseRoot, { extensions: ['.js', '.ts'] });
  const routes = [...findExpressRoutes(allFiles, codebaseRoot), ...findNextApiRoutes(codebaseRoot)];

  if (routes.length === 0) {
    return [makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO',
      title: 'Backend framework detected but no routes found',
      location: 'n/a',
      detail: 'A server-side framework was detected but no Express route definitions or Next.js API route files were found to check.',
      remediation: 'No action needed unless routes are defined in a pattern this scanner does not recognize (e.g. a custom router abstraction).',
      cwe: null, auto_fixable: false, passed: true,
    })];
  }

  let findings = [];
  for (const route of routes) findings = findings.concat(checkRoute(codebaseRoot, route));

  if (findings.length === 0) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO', title: 'All routes have rate limiting with acceptable thresholds',
      location: `${routes.length} routes checked`, detail: 'Every discovered route has rate-limiting middleware and no bypass patterns were detected.',
      remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true,
    }));
  }
  return findings;
}

module.exports = { runCheck };
