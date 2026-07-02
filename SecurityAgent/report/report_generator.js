'use strict';
const fs = require('fs');
const path = require('path');
const { cweLink } = require('../lib/utils');

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const SEVERITY_COLOR = {
  CRITICAL: '\x1b[41m\x1b[97m', HIGH: '\x1b[31m', MEDIUM: '\x1b[33m', LOW: '\x1b[36m', INFO: '\x1b[90m',
};
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function bar(count, max, width = 30) {
  if (max === 0) return ''.padEnd(width, '░');
  const filled = Math.round((count / max) * width);
  return '█'.repeat(filled).padEnd(width, '░');
}

function useColor() {
  return process.stdout.isTTY && !process.env.NO_COLOR;
}

function colorize(text, code) {
  return useColor() ? `${code}${text}${RESET}` : text;
}

function buildSummary(findings) {
  const summary = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  const problems = findings.filter(f => !f.passed);
  for (const f of problems) summary[f.severity] = (summary[f.severity] || 0) + 1;
  return { summary, problems, passedChecks: findings.filter(f => f.passed) };
}

function renderTerminalReport(findings, meta) {
  const { summary, problems, passedChecks } = buildSummary(findings);
  const maxCount = Math.max(1, ...SEVERITIES.map(s => summary[s]));
  const lines = [];
  const divider = '═'.repeat(44);

  lines.push(divider);
  lines.push(`  SECURITY REPORT — ${meta.timestamp}`);
  lines.push(divider);
  lines.push('');
  for (const sev of SEVERITIES) {
    const label = sev.padEnd(9, ' ');
    const count = summary[sev];
    lines.push(`${colorize(label, SEVERITY_COLOR[sev])} ${bar(count, maxCount)}  ${count} finding${count === 1 ? '' : 's'}`);
  }
  lines.push('');
  const totalChecks = problems.length + passedChecks.length;
  lines.push(`PASSED CHECKS: ${passedChecks.length} / ${totalChecks}`);
  lines.push('');

  for (const sev of SEVERITIES) {
    const inSev = problems.filter(f => f.severity === sev);
    if (inSev.length === 0) continue;
    lines.push(`--- ${sev} ---`);
    for (const f of inSev) {
      lines.push(`[${f.id}] ${f.title}`);
      lines.push(`  Location: ${f.location}`);
      lines.push(`  Detail: ${f.detail}`);
      lines.push(`  Fix: ${f.remediation}`);
      if (f.cwe) lines.push(`  CWE: ${f.cwe} (${cweLink(f.cwe)})`);
      lines.push('');
    }
  }

  lines.push('--- PASSED ---');
  if (passedChecks.length === 0) {
    lines.push('(none)');
  } else {
    for (const f of passedChecks) lines.push(`✓ [${f.module}] ${f.title}`);
  }
  lines.push('');

  if (meta.moduleErrors && meta.moduleErrors.length) {
    lines.push('--- MODULE ERRORS (did not block other modules) ---');
    for (const e of meta.moduleErrors) lines.push(`✗ ${e.module}: ${e.error}`);
    lines.push('');
  }

  lines.push(divider);
  lines.push(`Report saved: ${meta.reportPath}`);

  return lines.join('\n');
}

function buildJsonReport(findings, meta) {
  const { summary, problems, passedChecks } = buildSummary(findings);
  const withLinks = problems.map(f => ({ ...f, cwe_link: cweLink(f.cwe) }));
  const passedWithLinks = passedChecks.map(f => ({ ...f, cwe_link: cweLink(f.cwe) }));

  return {
    run: {
      timestamp: meta.timestamp,
      git_commit: meta.gitCommit,
      node_version: process.version,
      duration_ms: meta.durationMs,
      module_errors: meta.moduleErrors || [],
    },
    summary: {
      total_findings: problems.length,
      total_passed_checks: passedChecks.length,
      by_severity: summary,
      build_should_fail: summary.CRITICAL > 0,
    },
    findings: withLinks,
    passed_checks: passedWithLinks,
  };
}

function writeJsonReport(jsonReport, reportsDir, timestampSlug) {
  fs.mkdirSync(reportsDir, { recursive: true });
  const filePath = path.join(reportsDir, `security_${timestampSlug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(jsonReport, null, 2), 'utf8');
  return filePath;
}

module.exports = { renderTerminalReport, buildJsonReport, writeJsonReport, SEVERITIES };
