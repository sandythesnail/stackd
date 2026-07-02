'use strict';
// Missing security-event logging, sensitive data logged, and log injection via unsanitized input.
const { walkFiles, readFileSafe, relPath, makeFinding, detectStack } = require('../lib/utils');

const MODULE = 'logging_checker';
let seq = 0;
function nextId() { seq += 1; return `LOG-${String(seq).padStart(3, '0')}`; }
function lineOf(content, index) { return content.slice(0, index).split(/\r?\n/).length; }

const SECURITY_EVENTS = [
  { name: 'failed login attempts', re: /failed.{0,15}login|login.{0,15}fail/i },
  { name: 'successful logins', re: /login.{0,15}success|successful.{0,15}login/i },
  { name: 'password reset requests', re: /password.{0,15}reset/i },
  { name: 'account lockouts', re: /account.{0,15}lock/i },
  { name: '403 errors', re: /403|forbidden/i },
  { name: 'rate limit hits', re: /rate.?limit.{0,20}(hit|exceeded|block)/i },
  { name: 'admin actions', re: /admin.{0,15}action|audit.?log/i },
];

function scanLogCalls(root, files, findings) {
  const logCallRe = /(?:console\.(?:log|warn|error|info)|logger\.\w+)\s*\(([^;]*)\)/g;
  let sensitiveNameHits = 0;

  for (const file of files) {
    const content = readFileSafe(file);
    if (!content) continue;
    const rel = relPath(root, file);
    let m;
    logCallRe.lastIndex = 0;
    while ((m = logCallRe.exec(content))) {
      const args = m[1];
      const loc = `${rel}:${lineOf(content, m.index)}`;

      if (/\breq\.body\b(?!\.\w)/.test(args)) {
        findings.push(makeFinding({
          id: nextId(), module: MODULE, severity: 'CRITICAL', title: 'req.body logged wholesale',
          location: loc, detail: `Log call includes the entire request body: ${args.trim().slice(0, 100)}`,
          remediation: 'Log only specific, non-sensitive fields (e.g. { userId, action }), never the raw body object.',
          cwe: 'CWE-532', auto_fixable: false,
        }));
      }
      if (/\breq\.headers\b(?!\.\w)/.test(args)) {
        findings.push(makeFinding({
          id: nextId(), module: MODULE, severity: 'HIGH', title: 'req.headers logged wholesale',
          location: loc, detail: `Log call includes all request headers, which includes Authorization/Cookie: ${args.trim().slice(0, 100)}`,
          remediation: 'Log only specific headers you need (e.g. user-agent), never the full headers object.',
          cwe: 'CWE-532', auto_fixable: false,
        }));
      }
      const sensitiveVarRe = /\b(password|token|secret|ssn|dob)\b/i;
      if (sensitiveVarRe.test(args) && !/redact|mask|\*{3,}/.test(args)) {
        sensitiveNameHits += 1;
        findings.push(makeFinding({
          id: nextId(), module: MODULE, severity: 'CRITICAL', title: `Log statement references a sensitive-looking variable (${(args.match(sensitiveVarRe) || [''])[0]})`,
          location: loc, detail: `Log call: ${args.trim().slice(0, 100)}`,
          remediation: 'Remove this value from the log line entirely, or redact it (e.g. "***" ) before logging.',
          cwe: 'CWE-532', auto_fixable: false,
        }));
      }

      // 11.3 log injection — raw request-derived input concatenated straight into a log message.
      if (/req\.(body|params|query)\.\w+/.test(args) && !/replace\(|sanitize|encodeURIComponent/.test(args)) {
        findings.push(makeFinding({
          id: nextId(), module: MODULE, severity: 'MEDIUM', title: 'Unsanitized user input in log message',
          location: loc, detail: `User-controlled value logged without stripping newlines/control characters, allowing log injection (forged log lines): ${args.trim().slice(0, 100)}`,
          remediation: "Strip newlines before logging: String(value).replace(/[\\r\\n]/g, ' ').",
          cwe: 'CWE-117', auto_fixable: false,
        }));
      }
    }
  }
  return sensitiveNameHits;
}

function checkSecurityEventCoverage(files, findings) {
  const combined = files.map(f => readFileSafe(f) || '').join('\n');
  for (const event of SECURITY_EVENTS) {
    if (!event.re.test(combined)) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'MEDIUM', title: `Security event not logged: ${event.name}`,
        location: 'n/a', detail: `No log statement referencing "${event.name}" was found anywhere in the codebase.`,
        remediation: `Add a log entry when ${event.name} occur (include IP + timestamp for auth events; never include the password itself).`,
        cwe: 'CWE-778', auto_fixable: false,
      }));
    }
  }
}

async function runCheck(codebaseRoot, envConfig) {
  seq = 0;
  const stack = detectStack(codebaseRoot);
  const findings = [];
  const files = walkFiles(codebaseRoot, { extensions: ['.js', '.ts', '.py'] });

  scanLogCalls(codebaseRoot, files, findings);

  if (stack.isStaticSiteOnly) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO',
      title: 'Security-event logging checklist not applicable — no server exists to log these events',
      location: 'n/a',
      detail: 'Failed logins, account lockouts, rate-limit hits, and admin actions are all server-side concepts. This app has no server, so there is no log stream for them to appear in.',
      remediation: 'No action needed while this stays a static frontend.', cwe: null, auto_fixable: false, passed: true,
    }));
  } else {
    checkSecurityEventCoverage(files, findings);
  }

  if (findings.filter(f => !f.passed).length === 0) {
    findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'INFO', title: 'No sensitive-data logging or log-injection issues found', location: `${files.length} files scanned`, detail: 'No console.log/logger calls included req.body, req.headers wholesale, or unredacted password/token/secret/ssn/dob variables.', remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true }));
  }
  return findings;
}

module.exports = { runCheck };
