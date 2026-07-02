'use strict';
// Stack traces leaking to clients, unhandled rejection handling, async route error handling,
// and raw DB error messages reaching API responses.
const { walkFiles, readFileSafe, relPath, makeFinding, detectStack } = require('../lib/utils');

const MODULE = 'error_handler_checker';
let seq = 0;
function nextId() { seq += 1; return `ERR-${String(seq).padStart(3, '0')}`; }
function lineOf(content, index) { return content.slice(0, index).split(/\r?\n/).length; }

function checkStackTraceLeak(root, file, content, findings) {
  const re = /res\.(?:json|send)\(\s*\{[^}]*(?:err\.stack|error\.stack|err\.message|error\.message)[^}]*\}/g;
  let m;
  while ((m = re.exec(content))) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'HIGH',
      title: 'Error stack trace or raw message sent in API response',
      location: `${relPath(root, file)}:${lineOf(content, m.index)}`,
      detail: 'Sending err.stack/err.message directly to the client leaks internal file paths, library versions, and implementation details useful for further attacks.',
      remediation: 'In production, return a generic message (e.g. { error: "Something went wrong" }) and log the full error server-side only. Gate verbose errors behind NODE_ENV !== "production".',
      cwe: 'CWE-209', auto_fixable: false,
    }));
  }
}

function checkUnhandledRejection(files) {
  return files.some(f => /process\.on\(\s*['"]unhandledRejection['"]/.test(readFileSafe(f) || ''));
}

function checkAsyncRouteHandlers(root, file, content, findings) {
  const re = /\b(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"][^'"]+['"]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g;
  let m;
  while ((m = re.exec(content))) {
    const isAsync = content.slice(m.index, m.index + 200).includes('async');
    if (!isAsync) continue;
    // Grab a rough handler body window and check for try/catch or a known async-wrapper.
    const bodyWindow = content.slice(m.index, m.index + 600);
    const hasTryCatch = /try\s*\{/.test(bodyWindow);
    const hasWrapper = /asyncHandler|catchAsync|express-async-errors/.test(content);
    if (!hasTryCatch && !hasWrapper) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'MEDIUM',
        title: `Async route handler without try/catch or async wrapper (${m[1].toUpperCase()})`,
        location: `${relPath(root, file)}:${lineOf(content, m.index)}`,
        detail: 'Express does not forward rejected promises from async handlers to error middleware by default. An unhandled rejection here can crash the process or leave the request hanging.',
        remediation: 'Wrap the handler body in try/catch and call next(err), or use an async wrapper (express-async-errors, or a small catchAsync helper) applied consistently.',
        cwe: 'CWE-248', auto_fixable: false,
      }));
    }
  }
}

function checkDbErrorLeak(root, file, content, findings) {
  const re = /\.catch\(\s*\(?err\)?\s*=>\s*\{[^}]*res\.(?:json|send)\(\s*err/g;
  let m;
  while ((m = re.exec(content))) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'MEDIUM',
      title: 'Raw database error object sent in response',
      location: `${relPath(root, file)}:${lineOf(content, m.index)}`,
      detail: 'Sending the raw Prisma/Sequelize/pg error object to the client can reveal table/column names and query structure.',
      remediation: 'Catch the error, log it server-side, and respond with a generic message. Map known error codes (e.g. unique constraint) to safe, specific user-facing messages if needed.',
      cwe: 'CWE-209', auto_fixable: false,
    }));
  }
}

async function runCheck(codebaseRoot, envConfig) {
  seq = 0;
  const stack = detectStack(codebaseRoot);
  const findings = [];

  if (stack.isStaticSiteOnly) {
    return [makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO',
      title: 'Not applicable — no server process or API error handling exists',
      location: 'n/a',
      detail: 'There is no Node server process, so there is no NODE_ENV-gated error middleware, no unhandledRejection surface tied to a long-running process, and no API responses to leak stack traces through.',
      remediation: 'No action needed. Re-run once a backend is introduced.', cwe: null, auto_fixable: false, passed: true,
    })];
  }

  const files = walkFiles(codebaseRoot, { extensions: ['.js', '.ts'] });
  for (const file of files) {
    const content = readFileSafe(file);
    if (!content) continue;
    checkStackTraceLeak(codebaseRoot, file, content, findings);
    checkAsyncRouteHandlers(codebaseRoot, file, content, findings);
    checkDbErrorLeak(codebaseRoot, file, content, findings);
  }

  if (!checkUnhandledRejection(files)) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'MEDIUM',
      title: 'No process.on("unhandledRejection") handler found',
      location: `${files.length} files scanned`,
      detail: 'An unhandled promise rejection crashes the Node process by default, which is a trivial denial-of-service vector if any code path can trigger one.',
      remediation: "Add process.on('unhandledRejection', (reason) => { logger.error(reason); }) near your app entrypoint, and consider a graceful shutdown/restart via your process manager.",
      cwe: 'CWE-248', auto_fixable: false,
    }));
  } else {
    findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'INFO', title: 'unhandledRejection handler present', location: 'n/a', detail: 'process.on("unhandledRejection", ...) was found.', remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true }));
  }

  if (findings.filter(f => !f.passed).length === 0) {
    findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'INFO', title: 'No error-handling issues detected', location: `${files.length} files scanned`, detail: 'No stack-trace leaks, unwrapped async handlers, or raw DB errors reaching responses were found.', remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true }));
  }
  return findings;
}

module.exports = { runCheck };
