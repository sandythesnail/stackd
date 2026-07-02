#!/usr/bin/env node
'use strict';
// Orchestrates all security-check modules as an independent pipeline: each module runs in
// parallel, a failure in one never blocks the others, and results are merged into one report.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { readFileSafe } = require('./lib/utils');
const { renderTerminalReport, buildJsonReport, writeJsonReport } = require('./report/report_generator');

const AGENT_ROOT = __dirname;
const CODEBASE_ROOT = path.resolve(AGENT_ROOT, '..');
const MODULES_DIR = path.join(AGENT_ROOT, 'modules');
const REPORTS_DIR = path.join(AGENT_ROOT, 'report', 'reports');
const MODULE_TIMEOUT_MS = 20000;

function loadSecurityConfig() {
  const raw = readFileSafe(path.join(AGENT_ROOT, 'config', 'security_config.json'));
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function getGitCommit() {
  try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: CODEBASE_ROOT, encoding: 'utf8' }).trim(); }
  catch { return 'unknown'; }
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms).unref()),
  ]).catch(err => { throw new Error(`${label}: ${err.message}`); });
}

function discoverModules() {
  return fs.readdirSync(MODULES_DIR)
    .filter(f => f.endsWith('.js'))
    .map(f => ({ name: f.replace(/\.js$/, ''), file: path.join(MODULES_DIR, f) }));
}

async function main() {
  const startedAt = Date.now();
  const timestamp = new Date().toISOString();
  const timestampSlug = timestamp.replace(/[:.]/g, '-');

  const securityConfig = loadSecurityConfig();
  const envConfig = { securityConfig, env: process.env };

  const moduleDefs = discoverModules();
  const results = await Promise.allSettled(
    moduleDefs.map(async (def) => {
      const mod = require(def.file);
      if (typeof mod.runCheck !== 'function') throw new Error(`${def.name} does not export runCheck()`);
      const findings = await withTimeout(mod.runCheck(CODEBASE_ROOT, envConfig), MODULE_TIMEOUT_MS, def.name);
      return { name: def.name, findings: Array.isArray(findings) ? findings : [] };
    })
  );

  let allFindings = [];
  const moduleErrors = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      allFindings = allFindings.concat(result.value.findings);
    } else {
      moduleErrors.push({ module: moduleDefs[i].name, error: result.reason.message });
    }
  });

  const durationMs = Date.now() - startedAt;
  const reportPath = path.join(REPORTS_DIR, `security_${timestampSlug}.json`);
  const meta = { timestamp, gitCommit: getGitCommit(), durationMs, moduleErrors, reportPath: path.relative(CODEBASE_ROOT, reportPath).split(path.sep).join('/') };

  const jsonReport = buildJsonReport(allFindings, meta);
  const writtenPath = writeJsonReport(jsonReport, REPORTS_DIR, timestampSlug);
  meta.reportPath = path.relative(CODEBASE_ROOT, writtenPath).split(path.sep).join('/');
  jsonReport.run.report_path = meta.reportPath;
  fs.writeFileSync(writtenPath, JSON.stringify(jsonReport, null, 2), 'utf8');

  console.log(renderTerminalReport(allFindings, meta));
  console.log(`Scan completed in ${durationMs}ms across ${moduleDefs.length} modules${moduleErrors.length ? ` (${moduleErrors.length} module error(s), see above)` : ''}.`);

  const hasCritical = jsonReport.summary.by_severity.CRITICAL > 0;
  const bypass = process.env.SECURITY_BYPASS === 'true' || process.argv.includes('--bypass');
  if (hasCritical && bypass) {
    console.log('\n⚠ CRITICAL findings present but SECURITY_BYPASS is set — not failing the build. This should only be used with an approved security-bypass label.');
  }
  if (hasCritical && !bypass) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('Security agent crashed:', err);
  process.exitCode = 1;
});
