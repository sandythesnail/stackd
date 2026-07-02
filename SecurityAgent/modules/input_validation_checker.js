'use strict';
// SQL/NoSQL injection, XSS (innerHTML / dangerouslySetInnerHTML), schema validation coverage,
// path traversal, and mass assignment.
const { walkFiles, readFileSafe, relPath, makeFinding, detectStack } = require('../lib/utils');

const MODULE = 'input_validation_checker';
let seq = 0;
function nextId() { seq += 1; return `IV-${String(seq).padStart(3, '0')}`; }
function lineOf(content, index) { return content.slice(0, index).split(/\r?\n/).length; }

const RISKY_SOURCE_RE = /\breq\.(body|params|query|headers)\b|location\.(search|hash|href)|URLSearchParams|document\.cookie|\.value\b/;

function checkSqlInjection(root, file, content, findings) {
  const re = /\.query\(\s*[`"']?[^)]*?\$\{[^}]*\}|\.query\(\s*["'][^"']*["']\s*\+\s*\w/g;
  let m;
  while ((m = re.exec(content))) {
    const snippet = content.slice(m.index, m.index + 120).replace(/\s+/g, ' ');
    if (!RISKY_SOURCE_RE.test(snippet) && !/\+\s*\w/.test(snippet)) continue;
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'CRITICAL',
      title: 'SQL query built with string interpolation/concatenation',
      location: `${relPath(root, file)}:${lineOf(content, m.index)}`,
      detail: `Query built from a template literal or concatenation instead of parameters: ${snippet}...`,
      remediation: 'Use parameterized queries: db.query("SELECT * FROM users WHERE id = $1", [id]), or an ORM/query builder that parameterizes automatically. Never interpolate request data into SQL text.',
      cwe: 'CWE-89', auto_fixable: false,
    }));
  }
}

function checkNoSqlInjection(root, file, content, findings) {
  const re = /\.find(?:One)?\(\s*(?:req\.body|\{\s*[\w.]+\s*:\s*req\.body)/g;
  let m;
  while ((m = re.exec(content))) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'CRITICAL',
      title: 'MongoDB query built directly from req.body',
      location: `${relPath(root, file)}:${lineOf(content, m.index)}`,
      detail: 'Passing req.body fields straight into a Mongo query lets an attacker send an object like { "$ne": null } as a field value, which can bypass the intended filter and return all records (or bypass auth checks).',
      remediation: 'Validate and coerce every field to its expected primitive type with a schema library (Zod/Joi) before it reaches a database query. Never pass req.body directly as a query object.',
      cwe: 'CWE-943', auto_fixable: false,
    }));
  }
}

function checkXss(root, file, content, findings) {
  const isJsxLike = file.endsWith('.jsx') || file.endsWith('.tsx');
  const patterns = [];
  if (isJsxLike) patterns.push(/dangerouslySetInnerHTML\s*=\s*\{\{[^}]*\}\}/g);
  patterns.push(/\.innerHTML\s*(?:\+?=)\s*[`][^`]*\$\{[^`]*[`]/g);

  let sawInnerHtmlWithTemplate = 0;
  let flaggedAny = false;
  for (const re of patterns) {
    let m;
    while ((m = re.exec(content))) {
      const snippet = content.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).replace(/\s+/g, ' ');
      sawInnerHtmlWithTemplate += 1;
      if (RISKY_SOURCE_RE.test(m[0]) || /dangerouslySetInnerHTML/.test(m[0])) {
        flaggedAny = true;
        findings.push(makeFinding({
          id: nextId(), module: MODULE, severity: 'CRITICAL',
          title: isJsxLike && /dangerouslySetInnerHTML/.test(m[0]) ? 'dangerouslySetInnerHTML used with unsanitized data' : 'innerHTML assignment includes a likely user-input source',
          location: `${relPath(root, file)}:${lineOf(content, m.index)}`,
          detail: `Found: ...${snippet}...`,
          remediation: 'Sanitize with DOMPurify (DOMPurify.sanitize(value)) before rendering, or use textContent/React text nodes instead of raw HTML injection.',
          cwe: 'CWE-79', auto_fixable: false,
        }));
      }
    }
  }
  return { sawInnerHtmlWithTemplate, flaggedAny };
}

function checkPathTraversal(root, file, content, findings) {
  const re = /(?:fs\.(?:readFile|createReadStream|readFileSync)|res\.sendFile|path\.join\([^)]*req\.(?:params|query|body)[^)]*\))/g;
  let m;
  while ((m = re.exec(content))) {
    const windowText = content.slice(m.index, m.index + 160);
    if (!/req\.(params|query|body)/.test(windowText)) continue;
    if (/path\.normalize|sanitize|resolve\([^)]*\)\.startsWith/i.test(windowText)) continue;
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'HIGH',
      title: 'File path built from user input without sanitization',
      location: `${relPath(root, file)}:${lineOf(content, m.index)}`,
      detail: `File access appears to use unsanitized request input as part of the path: ${windowText.replace(/\s+/g, ' ').slice(0, 120)}...`,
      remediation: 'Reject path separators and ".." in the input, then resolve the final path and verify it stays inside the intended base directory: const p = path.resolve(base, userInput); if (!p.startsWith(base)) reject().',
      cwe: 'CWE-22', auto_fixable: false,
    }));
  }
}

function checkMassAssignment(root, file, content, findings) {
  const re = /\.create\(\s*req\.body\s*\)|\.create\(\s*\{\s*\.\.\.req\.body/g;
  let m;
  while ((m = re.exec(content))) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'HIGH',
      title: 'Model created directly from req.body (mass assignment)',
      location: `${relPath(root, file)}:${lineOf(content, m.index)}`,
      detail: 'Spreading or passing req.body straight into a model create call lets a client set any field, including ones like role, isAdmin, or verified that should never be client-controlled.',
      remediation: 'Explicitly allowlist fields: const { name, email } = req.body; Model.create({ name, email }). Never spread req.body directly into a create/update call.',
      cwe: 'CWE-915', auto_fixable: false,
    }));
  }
}

function checkValidationCoverage(root, files, findings) {
  const hasValidationLib = files.some(f => {
    const c = readFileSafe(f);
    return c && /require\(['"]zod['"]\)|from ['"]zod['"]|require\(['"]joi['"]\)|from ['"]joi['"]|require\(['"]yup['"]\)|from ['"]yup['"]|express-validator|pydantic/i.test(c);
  });
  const routeFiles = files.filter(f => {
    const c = readFileSafe(f);
    return c && /\b(?:app|router)\.(get|post|put|delete|patch)\s*\(/.test(c);
  });
  if (routeFiles.length && !hasValidationLib) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'MEDIUM',
      title: 'No schema validation library detected across route handlers',
      location: `${routeFiles.length} route file(s)`,
      detail: 'No Zod/Joi/Yup/express-validator/Pydantic usage was found, so route inputs are likely unvalidated before use.',
      remediation: 'Add a schema validation library and validate req.body/query/params on every route, especially auth and payment/financial routes (validate those as HIGH priority).',
      cwe: 'CWE-20', auto_fixable: false,
    }));
  }
}

async function runCheck(codebaseRoot, envConfig) {
  seq = 0;
  const stack = detectStack(codebaseRoot);
  const findings = [];
  const files = walkFiles(codebaseRoot, { extensions: ['.js', '.ts', '.jsx', '.tsx', '.py'] });

  let totalInnerHtmlTemplates = 0;
  let anyXssFlagged = false;
  for (const file of files) {
    const content = readFileSafe(file);
    if (!content) continue;
    const { sawInnerHtmlWithTemplate, flaggedAny } = checkXss(codebaseRoot, file, content, findings);
    totalInnerHtmlTemplates += sawInnerHtmlWithTemplate;
    anyXssFlagged = anyXssFlagged || flaggedAny;

    if (!stack.isStaticSiteOnly) {
      checkSqlInjection(codebaseRoot, file, content, findings);
      checkNoSqlInjection(codebaseRoot, file, content, findings);
      checkPathTraversal(codebaseRoot, file, content, findings);
      checkMassAssignment(codebaseRoot, file, content, findings);
    }
  }

  if (!anyXssFlagged && totalInnerHtmlTemplates > 0) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO',
      title: `Reviewed ${totalInnerHtmlTemplates} innerHTML template-literal assignment(s) — none reference an obvious user-input source`,
      location: `${files.length} files scanned`,
      detail: `Static analysis found ${totalInnerHtmlTemplates} places where innerHTML is set from a template literal, but none interpolate req.*, location.*, URLSearchParams, document.cookie, or a .value read. Content appears to come from hardcoded app data (e.g. the MODULES lesson content array).`,
      remediation: 'This is a heuristic, not a data-flow proof. If any future feature adds user-generated text (comments, custom module content, profile bios) that gets rendered via innerHTML, sanitize it with DOMPurify before insertion.',
      cwe: 'CWE-79', auto_fixable: false, passed: true,
    }));
  }

  if (!stack.isStaticSiteOnly) {
    checkValidationCoverage(codebaseRoot, files, findings);
  } else {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO',
      title: 'SQL/NoSQL injection, path traversal, and mass assignment checks not applicable',
      location: 'n/a',
      detail: 'This codebase has no server, no database, and no route handlers, so there is no query-building or model-creation code for these checks to inspect.',
      remediation: 'No action needed. Re-run once a backend is introduced.',
      cwe: null, auto_fixable: false, passed: true,
    }));
  }

  if (findings.length === 0) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO', title: 'No input validation issues detected',
      location: `${files.length} files scanned`, detail: 'No injection, XSS, path traversal, or mass assignment patterns matched.',
      remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true,
    }));
  }
  return findings;
}

module.exports = { runCheck };
