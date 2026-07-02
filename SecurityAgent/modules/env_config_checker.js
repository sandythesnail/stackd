'use strict';
// .gitignore env coverage, .env.example completeness, startup env validation,
// dev/prod config separation, and NEXT_PUBLIC_ secret exposure.
const fs = require('fs');
const path = require('path');
const { walkFiles, readFileSafe, relPath, makeFinding, detectStack } = require('../lib/utils');

const MODULE = 'env_config_checker';
let seq = 0;
function nextId() { seq += 1; return `ENV-${String(seq).padStart(3, '0')}`; }

const REQUIRED_GITIGNORE_ENTRIES = ['.env', '.env.local', '.env.production', '.env.*.local'];

function checkGitignoreCoverage(root, findings) {
  const gitignorePath = path.join(root, '.gitignore');
  const content = readFileSafe(gitignorePath);
  if (!content) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'CRITICAL', title: 'No .gitignore file exists',
      location: '.gitignore', detail: 'There is no .gitignore at all, so any .env file created in the future would be committed by default on the first "git add ."',
      remediation: 'Create a .gitignore that includes at minimum: .env, .env.local, .env.production, .env.*.local, node_modules, and any reports/ or build output directories.',
      cwe: 'CWE-538', auto_fixable: false,
    }));
    return;
  }
  const lines = content.split(/\r?\n/).map(l => l.trim());
  for (const entry of REQUIRED_GITIGNORE_ENTRIES) {
    const covered = lines.some(l => l === entry || l === entry.replace(/\*/g, '') || (entry.includes('*') && new RegExp('^' + entry.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$').test(entry)));
    // Also treat a bare ".env" or ".env*" line as covering all variants.
    const coveredByWildcard = lines.some(l => l === '.env*' || l === '.env' && entry.startsWith('.env'));
    if (!covered && !coveredByWildcard) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'CRITICAL', title: `.gitignore missing entry: ${entry}`,
        location: '.gitignore', detail: `"${entry}" (or an equivalent wildcard like ".env*") is not present in .gitignore.`,
        remediation: `Add "${entry}" to .gitignore (or a single ".env*" line to cover all env file variants, plus "!.env.example" to still allow the example file).`,
        cwe: 'CWE-538', auto_fixable: true,
      }));
    }
  }
  if (findings.length === 0 || findings.every(f => f.passed)) {
    findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'INFO', title: '.gitignore covers all required env file patterns', location: '.gitignore', detail: 'All required entries are present.', remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true }));
  }
}

function collectProcessEnvVars(root) {
  const files = walkFiles(root, { extensions: ['.js', '.ts', '.jsx', '.tsx'] });
  const vars = new Set();
  const re = /process\.env\.([A-Z0-9_]+)/g;
  for (const file of files) {
    const content = readFileSafe(file);
    if (!content) continue;
    let m;
    while ((m = re.exec(content))) vars.add(m[1]);
  }
  return vars;
}

function checkEnvExample(root, findings) {
  const usedVars = collectProcessEnvVars(root);
  const examplePath = path.join(root, '.env.example');
  const exampleContent = readFileSafe(examplePath);

  if (usedVars.size === 0) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO', title: 'No process.env.* usage found — .env.example not required',
      location: 'n/a', detail: 'No code in this repo reads process.env, so there is nothing an .env.example needs to document.',
      remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true,
    }));
    return;
  }

  if (!exampleContent) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'MEDIUM', title: '.env.example is missing',
      location: '.env.example', detail: `Code references ${usedVars.size} environment variable(s) (${[...usedVars].slice(0, 8).join(', ')}${usedVars.size > 8 ? ', ...' : ''}) but there is no .env.example documenting them for new contributors.`,
      remediation: `Create .env.example listing every variable with a placeholder value, e.g.\n${[...usedVars].map(v => `${v}=REPLACE_ME`).join('\n')}`,
      cwe: 'CWE-1188', auto_fixable: true,
    }));
    return;
  }

  const documentedVars = new Set([...exampleContent.matchAll(/^([A-Z0-9_]+)\s*=/gm)].map(m => m[1]));
  const missing = [...usedVars].filter(v => !documentedVars.has(v));
  if (missing.length) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'MEDIUM', title: `.env.example is missing ${missing.length} variable(s)`,
      location: '.env.example', detail: `Used in code but not documented: ${missing.join(', ')}`,
      remediation: `Add these lines to .env.example:\n${missing.map(v => `${v}=REPLACE_ME`).join('\n')}`,
      cwe: 'CWE-1188', auto_fixable: true,
    }));
  } else {
    findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'INFO', title: '.env.example documents every process.env variable used in code', location: '.env.example', detail: `${usedVars.size} variable(s) all documented.`, remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true }));
  }
}

function checkStartupValidation(root, findings) {
  const files = walkFiles(root, { extensions: ['.js', '.ts'] });
  const hasValidateEnv = files.some(f => /function\s+validateEnv|validateEnv\s*\(|envalid|dotenv-safe/.test(readFileSafe(f) || ''));
  const usesEnv = collectProcessEnvVars(root).size > 0;
  if (usesEnv && !hasValidateEnv) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'MEDIUM', title: 'No startup environment validation found',
      location: `${files.length} files scanned`, detail: 'process.env is used but no validateEnv()-style check (or envalid/dotenv-safe) runs before the server starts, so a missing variable fails silently or crashes deep in a request handler instead of at boot.',
      remediation: 'Add a validateEnv() function that checks all required variables are present and calls process.exit(1) with a clear message if not, run it before the server starts listening.',
      cwe: 'CWE-1188', auto_fixable: false,
    }));
  } else if (usesEnv) {
    findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'INFO', title: 'Startup environment validation present', location: 'n/a', detail: 'Found a validateEnv-style check.', remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true }));
  }
}

function checkDevProdSeparation(root, findings) {
  const files = walkFiles(root, { extensions: ['.js', '.ts'] });
  for (const file of files) {
    const content = readFileSafe(file);
    if (!content) continue;
    const rel = relPath(root, file);
    const permissiveCorsUnguarded = /origin\s*:\s*['"]\*['"]/.test(content) && !/NODE_ENV/.test(content);
    if (permissiveCorsUnguarded) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'HIGH', title: 'Permissive CORS origin not gated by NODE_ENV',
        location: rel, detail: 'A wildcard CORS origin is set with no NODE_ENV check, so it applies in production too.',
        remediation: 'Gate permissive dev-only CORS behind NODE_ENV !== "production", and use a strict allowlist in production.',
        cwe: 'CWE-1188', auto_fixable: false,
      }));
    }
  }
}

function checkNextPublicSecrets(root, findings) {
  const files = walkFiles(root, { extensions: ['.js', '.ts', '.jsx', '.tsx', '.env', '.env.local', '.env.example'] });
  const secretNameRe = /NEXT_PUBLIC_[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|DB_URL|DATABASE_URL|CREDENTIAL)/i;
  for (const file of files) {
    const content = readFileSafe(file);
    if (!content) continue;
    let m;
    const re = new RegExp(secretNameRe, 'g');
    while ((m = re.exec(content))) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'CRITICAL', title: `Secret-looking variable exposed via NEXT_PUBLIC_: ${m[0]}`,
        location: relPath(root, file), detail: 'Any NEXT_PUBLIC_ prefixed variable is inlined into the client JavaScript bundle at build time and is visible to every visitor.',
        remediation: `Rename to a non-prefixed variable (e.g. ${m[0].replace('NEXT_PUBLIC_', '')}) and only read it in server components/API routes, never in client components.`,
        cwe: 'CWE-200', auto_fixable: false,
      }));
    }
  }
}

async function runCheck(codebaseRoot, envConfig) {
  seq = 0;
  const findings = [];
  checkGitignoreCoverage(codebaseRoot, findings);
  checkEnvExample(codebaseRoot, findings);
  checkStartupValidation(codebaseRoot, findings);
  checkDevProdSeparation(codebaseRoot, findings);
  const stack = detectStack(codebaseRoot);
  if (stack.isNext) checkNextPublicSecrets(codebaseRoot, findings);

  return findings;
}

module.exports = { runCheck };
