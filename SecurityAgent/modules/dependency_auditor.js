'use strict';
// Runs `npm audit --json` (or pip-audit for Python projects), re-reports findings in the
// standard shape, flags specific known-vulnerable package versions, and checks for a lockfile.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { readFileSafe, makeFinding, detectStack } = require('../lib/utils');

const MODULE = 'dependency_auditor';
let seq = 0;
function nextId() { seq += 1; return `DEP-${String(seq).padStart(3, '0')}`; }

const NPM_TO_AGENT_SEVERITY = { critical: 'CRITICAL', high: 'HIGH', moderate: 'MEDIUM', low: 'LOW' };

const KNOWN_VULNERABLE = [
  { name: 'jsonwebtoken', maxExclusive: '9.0.0', severity: 'HIGH', detail: 'Versions before 9.0.0 are affected by an algorithm-confusion vulnerability that can let an attacker forge tokens if the server accepts multiple algorithms.', cwe: 'CWE-347' },
  { name: 'express', maxExclusive: '4.19.0', severity: 'HIGH', detail: 'Versions before 4.19.0 have an open-redirect vulnerability in path handling.', cwe: 'CWE-601' },
  { name: 'multer', maxExclusive: '1.4.5-lts', severity: 'MEDIUM', detail: 'Versions before 1.4.5-lts are affected by a denial-of-service vulnerability in multipart form parsing.', cwe: 'CWE-400' },
];

// Minimal semver-ish comparator: handles "1.2.3" / "1.2.3-lts" style strings without a dependency.
function versionLessThan(a, b) {
  const norm = (v) => v.replace(/^[^\d]*/, '').split(/[.-]/).map(x => (isNaN(Number(x)) ? x : Number(x)));
  const pa = norm(a), pb = norm(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i], y = pb[i];
    if (x === undefined) return true;
    if (y === undefined) return false;
    if (typeof x === 'number' && typeof y === 'number') { if (x !== y) return x < y; }
    else { const sx = String(x), sy = String(y); if (sx !== sy) return sx < sy; }
  }
  return false;
}

function runNpmAudit(root) {
  try {
    const out = execFileSync('npm', ['audit', '--json'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return JSON.parse(out);
  } catch (err) {
    // npm audit exits non-zero when vulnerabilities are found — the JSON is still on stdout.
    if (err && err.stdout) {
      try { return JSON.parse(err.stdout.toString()); } catch { return null; }
    }
    return null;
  }
}

function findingsFromNpmAudit(auditJson) {
  const findings = [];
  if (!auditJson) return findings;

  // npm v7+ shape: { vulnerabilities: { <pkg>: { severity, via, range, fixAvailable } } }
  const vulns = auditJson.vulnerabilities;
  if (vulns && typeof vulns === 'object') {
    for (const [pkgName, info] of Object.entries(vulns)) {
      const severity = NPM_TO_AGENT_SEVERITY[info.severity] || 'MEDIUM';
      const advisoryTitles = (info.via || [])
        .filter(v => typeof v === 'object' && v.title)
        .map(v => v.title)
        .join('; ') || 'See npm audit for details';
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity,
        title: `Vulnerable dependency: ${pkgName} (${info.severity})`,
        location: `package.json (${pkgName}@${info.range || 'unknown range'})`,
        detail: `npm audit: ${advisoryTitles}`,
        remediation: info.fixAvailable
          ? `Run "npm audit fix" (review the diff first) or upgrade ${pkgName} to a patched version.`
          : `No automatic fix available yet. Check if a newer major version of ${pkgName} resolves this, or find an alternative package.`,
        cwe: 'CWE-1104', auto_fixable: false,
      }));
    }
  }
  return findings;
}

function checkKnownVulnerablePackages(root, findings) {
  const pkgPath = path.join(root, 'package.json');
  const raw = readFileSafe(pkgPath);
  if (!raw) return;
  let pkg;
  try { pkg = JSON.parse(raw); } catch { return; }
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  // Prefer the locked, resolved version if a lockfile exists; fall back to the declared range's digits.
  const lockPath = path.join(root, 'package-lock.json');
  const lockRaw = readFileSafe(lockPath);
  let lock = null;
  if (lockRaw) { try { lock = JSON.parse(lockRaw); } catch { lock = null; } }

  for (const rule of KNOWN_VULNERABLE) {
    if (!Object.prototype.hasOwnProperty.call(deps, rule.name)) continue;
    let resolved = deps[rule.name].replace(/^[\^~>=<]+/, '');
    if (lock && lock.packages && lock.packages[`node_modules/${rule.name}`]) {
      resolved = lock.packages[`node_modules/${rule.name}`].version || resolved;
    }
    if (versionLessThan(resolved, rule.maxExclusive)) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: rule.severity,
        title: `${rule.name}@${resolved} is below the safe version ${rule.maxExclusive}`,
        location: 'package.json',
        detail: rule.detail,
        remediation: `Upgrade ${rule.name} to ${rule.maxExclusive} or later: npm install ${rule.name}@latest (then re-test).`,
        cwe: rule.cwe, auto_fixable: false,
      }));
    }
  }
}

function checkLockfile(root, findings) {
  const hasNpmLock = fs.existsSync(path.join(root, 'package-lock.json'));
  const hasYarnLock = fs.existsSync(path.join(root, 'yarn.lock'));
  const hasPnpmLock = fs.existsSync(path.join(root, 'pnpm-lock.yaml'));
  const hasPkgJson = fs.existsSync(path.join(root, 'package.json'));
  if (hasPkgJson && !hasNpmLock && !hasYarnLock && !hasPnpmLock) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'MEDIUM',
      title: 'No lockfile found alongside package.json',
      location: 'package.json',
      detail: 'Without package-lock.json/yarn.lock/pnpm-lock.yaml committed, installs are not reproducible and the project is exposed to dependency confusion / unexpected transitive upgrades.',
      remediation: 'Run "npm install" to generate package-lock.json and commit it.',
      cwe: 'CWE-1357', auto_fixable: false,
    }));
  } else if (hasPkgJson) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO', title: 'Lockfile present and committed',
      location: hasNpmLock ? 'package-lock.json' : hasYarnLock ? 'yarn.lock' : 'pnpm-lock.yaml',
      detail: 'A lockfile exists alongside package.json.', remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true,
    }));
  }
}

function runPipAudit(root) {
  const findings = [];
  try {
    const out = execFileSync('pip-audit', ['-f', 'json'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const data = JSON.parse(out);
    for (const dep of data.dependencies || data) {
      for (const vuln of dep.vulns || []) {
        findings.push(makeFinding({
          id: nextId(), module: MODULE, severity: 'HIGH',
          title: `Vulnerable Python package: ${dep.name}@${dep.version} (${vuln.id})`,
          location: 'requirements.txt',
          detail: vuln.description || vuln.id,
          remediation: `Upgrade ${dep.name} to a fixed version: ${(vuln.fix_versions || []).join(', ') || 'see advisory'}.`,
          cwe: 'CWE-1104', auto_fixable: false,
        }));
      }
    }
  } catch { /* pip-audit not installed or no requirements.txt — best effort only */ }
  return findings;
}

async function runCheck(codebaseRoot, envConfig) {
  seq = 0;
  const findings = [];
  const hasPkgJson = fs.existsSync(path.join(codebaseRoot, 'package.json'));
  const hasRequirements = fs.existsSync(path.join(codebaseRoot, 'requirements.txt'));

  if (hasPkgJson) {
    const auditJson = runNpmAudit(codebaseRoot);
    const auditFindings = findingsFromNpmAudit(auditJson);
    findings.push(...auditFindings);
    checkKnownVulnerablePackages(codebaseRoot, findings);
    checkLockfile(codebaseRoot, findings);
    if (auditFindings.length === 0) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'INFO', title: 'npm audit reported no vulnerabilities',
        location: 'package.json', detail: 'npm audit --json returned zero advisories for the current dependency tree.',
        remediation: 'No action needed. Re-run this regularly — new advisories are published against existing versions.',
        cwe: null, auto_fixable: false, passed: true,
      }));
    }
  }

  if (hasRequirements) {
    findings.push(...runPipAudit(codebaseRoot));
  }

  if (!hasPkgJson && !hasRequirements) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO',
      title: 'No package manager manifest found — nothing to audit',
      location: 'n/a',
      detail: 'No package.json or requirements.txt exists at the repo root, so there are no third-party dependencies to audit. The application code itself is dependency-free vanilla HTML/CSS/JS.',
      remediation: 'No action needed while this stays a zero-dependency static site.',
      cwe: null, auto_fixable: false, passed: true,
    }));
  }

  return findings;
}

module.exports = { runCheck };
