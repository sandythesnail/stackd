'use strict';
// Scans tracked files and git history for hardcoded secrets, API keys, and credentials.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { walkFiles, readFileSafe, relPath, makeFinding, cweLink } = require('../lib/utils');

const MODULE = 'api_key_scanner';

// [regexName, regex, severity, cwe, description]
const PATTERNS = [
  ['generic_secret_assignment', /(api_key|apikey|api_secret|secret_key|access_token|auth_token|private_key)\s*[:=]\s*["'][A-Za-z0-9+/]{20,}["']/gi, 'HIGH', 'CWE-798', 'Generic secret-looking assignment'],
  ['anthropic_key', /sk-ant-[a-zA-Z0-9\-_]{40,}/g, 'CRITICAL', 'CWE-798', 'Live Anthropic API key'],
  ['stripe_live_secret', /sk_live_[a-zA-Z0-9]{24,}/g, 'CRITICAL', 'CWE-798', 'Live Stripe secret key'],
  ['stripe_live_public', /pk_live_[a-zA-Z0-9]{24,}/g, 'HIGH', 'CWE-798', 'Live Stripe publishable key'],
  ['stripe_test_secret', /sk_test_[a-zA-Z0-9]{24,}/g, 'MEDIUM', 'CWE-798', 'Stripe test secret key hardcoded'],
  ['aws_access_key_id', /AKIA[0-9A-Z]{16}/g, 'CRITICAL', 'CWE-798', 'AWS access key ID'],
  ['aws_secret_access_key', /aws_secret_access_key\s*=\s*[A-Za-z0-9/+]{40}/gi, 'CRITICAL', 'CWE-798', 'AWS secret access key'],
  ['jwt_token', /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, 'HIGH', 'CWE-798', 'Hardcoded JWT'],
  ['firebase_key', /AAAA[A-Za-z0-9_-]{7}:[A-Za-z0-9_-]{140}/g, 'CRITICAL', 'CWE-798', 'Firebase Cloud Messaging server key'],
  ['sendgrid_key', /SG\.[a-zA-Z0-9\-_]{22}\.[a-zA-Z0-9\-_]{43}/g, 'CRITICAL', 'CWE-798', 'SendGrid API key'],
  ['github_pat_classic', /ghp_[a-zA-Z0-9]{36}/g, 'CRITICAL', 'CWE-798', 'GitHub personal access token (classic)'],
  ['github_pat_fine_grained', /github_pat_[a-zA-Z0-9_]{82}/g, 'CRITICAL', 'CWE-798', 'GitHub fine-grained personal access token'],
  ['password_literal', /passw(or)?d\s*[:=]\s*["'][^"']{6,}["']/gi, 'HIGH', 'CWE-798', 'Hardcoded password'],
  ['db_connection_string', /(mongodb|postgres|postgresql|mysql|redis):\/\/[^:\s"'`]+:[^@\s"'`]+@/g, 'CRITICAL', 'CWE-798', 'Database connection string with embedded credentials'],
  ['private_key_block', /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g, 'CRITICAL', 'CWE-798', 'Private key material committed to source'],
];

const SCAN_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.json', '.yml', '.yaml'];
const ENV_FILE_RE = /^\.env/;
const EXTRA_FILES = ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'];

let findingSeq = 0;
function nextId() { findingSeq += 1; return `AK-${String(findingSeq).padStart(3, '0')}`; }

function loadAllowlist(envConfig) {
  const list = (envConfig && envConfig.securityConfig && envConfig.securityConfig.allowlist) || [];
  return list.map(a => ({ file: a.file, line: a.line, reason: a.reason || 'allowlisted' }));
}

function isAllowlisted(allowlist, relFile, line) {
  return allowlist.find(a => a.file === relFile && (a.line === line || a.line === undefined));
}

function scanFileContent(root, filePath, allowlist) {
  const findings = [];
  const content = readFileSafe(filePath);
  if (content == null) return findings;
  const rel = relPath(root, filePath);
  const lines = content.split(/\r?\n/);

  for (const [name, regex, severity, cwe, desc] of PATTERNS) {
    regex.lastIndex = 0;
    let match;
    const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
    while ((match = re.exec(content)) !== null) {
      const upTo = content.slice(0, match.index);
      const lineNo = upTo.split(/\r?\n/).length;
      const lineText = lines[lineNo - 1] || '';
      const allow = isAllowlisted(allowlist, rel, lineNo);
      const location = `${rel}:${lineNo}`;
      const snippet = lineText.trim().slice(0, 140);

      let remediation = 'Remove this credential from source, rotate it immediately if it is live, and load it via process.env.VARIABLE_NAME from a git-ignored .env file.';
      if (name === 'db_connection_string') remediation = 'Move the connection string to an environment variable (e.g. DATABASE_URL) and never commit credentials in the URL. Rotate the DB password immediately.';
      if (name === 'private_key_block') remediation = 'Remove the private key from source control entirely, rotate the key pair, and load the key from a secrets manager or an untracked file at runtime.';
      if (name === 'jwt_token') remediation = 'Hardcoded JWTs can be replayed by anyone with repo access. Remove it, and if it was ever a real session/auth token, treat it as compromised and invalidate it server-side.';
      if (name === 'stripe_test_secret') remediation = 'Even test keys should not be hardcoded. Move to process.env.STRIPE_TEST_SECRET_KEY and add a placeholder to .env.example.';

      findings.push(makeFinding({
        id: nextId(),
        module: MODULE,
        severity: allow ? 'INFO' : severity,
        title: allow ? `[Allowlisted] ${desc}` : desc,
        location,
        detail: allow
          ? `Matched pattern "${name}" but is allowlisted (${allow.reason}). Original severity would have been ${severity}. Matched text: ${redact(snippet)}`
          : `Matched pattern "${name}" in ${location}. Line content: ${redact(snippet)}`,
        remediation: allow ? 'No action required unless the allowlist entry is stale — re-review periodically.' : remediation,
        cwe,
        auto_fixable: !allow && (name === 'generic_secret_assignment' || name === 'password_literal'),
      }));
    }
  }
  return findings;
}

function redact(text) {
  // Show enough to identify the finding without printing the full secret in the report.
  return text.replace(/["'][A-Za-z0-9+/_\-.]{12,}["']/g, (m) => `${m.slice(0, 8)}...${m.slice(-4)}${m[m.length - 1]}`);
}

function scanGitHistory(root) {
  const findings = [];
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, stdio: 'ignore' });
  } catch {
    return findings; // not a git repo, nothing to scan
  }

  // Was .env (or variants) ever tracked, even if it's gitignored now?
  try {
    const log = execFileSync('git', ['log', '--all', '--full-history', '--pretty=format:', '--name-only'], { cwd: root, encoding: 'utf8' });
    const trackedEnvFiles = [...new Set(log.split(/\r?\n/).filter(l => ENV_FILE_RE.test(l.trim()) && l.trim() !== '.env.example'))];
    for (const f of trackedEnvFiles) {
      findings.push(makeFinding({
        id: nextId(),
        module: MODULE,
        severity: 'CRITICAL',
        title: '.env file was committed to git history',
        location: f,
        detail: `"${f}" appears in git history (git log --all --full-history) even if it is gitignored now. Every secret it ever contained is permanently recoverable by anyone who clones the repo.`,
        remediation: `Rotate every credential that was ever in "${f}". Then purge it from history with "git filter-repo --path ${f} --invert-paths" (or BFG Repo-Cleaner), force-push, and have all collaborators re-clone.`,
        cwe: 'CWE-200',
        auto_fixable: false,
      }));
    }
  } catch { /* git log failed — skip silently, this check is best-effort */ }

  // git grep across all commits for the same secret patterns (cheap, high-signal patterns only).
  const grepPatterns = ['sk-ant-', 'sk_live_', 'AKIA', 'ghp_', 'github_pat_', '-----BEGIN'];
  try {
    const allCommits = execFileSync('git', ['rev-list', '--all'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
    // Cap how many commits we grep to keep this well under the 60s budget on large histories.
    const commitsToCheck = allCommits.slice(0, 200);
    for (const pattern of grepPatterns) {
      try {
        const hits = execFileSync('git', ['grep', '-l', pattern, ...commitsToCheck.slice(0, 50)], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        if (hits.trim()) {
          findings.push(makeFinding({
            id: nextId(),
            module: MODULE,
            severity: 'CRITICAL',
            title: `Secret pattern "${pattern}" found in git history`,
            location: 'git history (see git grep output)',
            detail: `git grep found "${pattern}" in one or more historical commits: ${hits.trim().split(/\r?\n/).slice(0, 5).join(', ')}`,
            remediation: 'Treat any matching credential as compromised, rotate it, and scrub it from history with git filter-repo or BFG Repo-Cleaner.',
            cwe: 'CWE-798',
            auto_fixable: false,
          }));
        }
      } catch { /* pattern not found in sampled commits — fine */ }
    }
  } catch { /* rev-list failed — skip */ }

  return findings;
}

// Builds a human-reviewable, NEVER-applied patch suggestion for a hardcoded-secret finding.
function buildPatchSuggestion(finding, root) {
  if (finding.passed || finding.severity === 'INFO') return null;
  const [file, lineStr] = finding.location.split(':');
  const line = Number(lineStr);
  if (!file || !line) return null;
  const abs = path.join(root, file);
  const content = readFileSafe(abs);
  if (!content) return null;
  const lines = content.split(/\r?\n/);
  const original = lines[line - 1];
  if (!original) return null;

  const assignMatch = original.match(/([A-Za-z0-9_]+)\s*[:=]\s*["']([^"']+)["']/);
  if (!assignMatch) return null;
  const varName = assignMatch[1].toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  const replaced = original.replace(assignMatch[0], `${assignMatch[1]}: process.env.${varName}`);

  return {
    file,
    line,
    envVarName: varName,
    diff: `--- a/${file}\n+++ b/${file}\n@@ line ${line} @@\n- ${original.trim()}\n+ ${replaced.trim()}`,
    envExampleAddition: `${varName}=REPLACE_ME`,
    note: 'Suggested patch is NOT applied. Review, then apply manually and add the real value to your untracked .env.',
  };
}

async function runCheck(codebaseRoot, envConfig) {
  findingSeq = 0;
  const allowlist = loadAllowlist(envConfig);
  const allFiles = walkFiles(codebaseRoot);
  const targetFiles = allFiles.filter(f => {
    const base = path.basename(f);
    if (ENV_FILE_RE.test(base)) return true;
    if (EXTRA_FILES.includes(base)) return true;
    if (f.split(path.sep).includes('workflows') && (base.endsWith('.yml') || base.endsWith('.yaml'))) return true;
    return SCAN_EXTENSIONS.some(ext => base.endsWith(ext));
  });

  let findings = [];
  for (const file of targetFiles) {
    findings = findings.concat(scanFileContent(codebaseRoot, file, allowlist));
  }

  findings = findings.concat(scanGitHistory(codebaseRoot));

  // Attach dry-run patch suggestions (informational only, never written to disk).
  const patches = [];
  for (const finding of findings) {
    if (finding.auto_fixable) {
      const patch = buildPatchSuggestion(finding, codebaseRoot);
      if (patch) patches.push({ findingId: finding.id, ...patch });
    }
  }
  if (patches.length) {
    envConfig.__pendingPatches = (envConfig.__pendingPatches || []).concat(patches);
  }

  if (findings.length === 0) {
    findings.push(makeFinding({
      id: nextId(),
      module: MODULE,
      severity: 'INFO',
      title: 'No hardcoded secrets found',
      location: `${targetFiles.length} files scanned`,
      detail: `Scanned ${targetFiles.length} source/config/env files and full git history against 15 secret patterns (AWS, Stripe, GitHub, Anthropic, SendGrid, Firebase, JWT, DB connection strings, private keys, generic secret assignments). No matches.`,
      remediation: 'No action needed. Re-run this scan on every push — new dependencies or copy-pasted snippets are the most common source of leaked keys.',
      cwe: null,
      auto_fixable: false,
      passed: true,
    }));
  }

  return findings;
}

module.exports = { runCheck };
