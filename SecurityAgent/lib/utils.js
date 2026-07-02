'use strict';
const fs = require('fs');
const path = require('path');

// SecurityAgent itself is excluded by default: its own source necessarily contains the exact
// pattern strings/regex literals ("process.on('unhandledRejection'", "req.body", "password", ...)
// that the checkers search for, so scanning it would self-contaminate every module's findings.
const DEFAULT_EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'reports', '.next', 'coverage', '.vercel', 'SecurityAgent']);

// Recursively lists files under root, skipping excluded directories. Returns absolute paths.
function walkFiles(root, { excludeDirs = DEFAULT_EXCLUDE_DIRS, extensions = null } = {}) {
  const out = [];
  (function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (excludeDirs.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        if (!extensions || extensions.some(ext => entry.name.endsWith(ext))) out.push(full);
      }
    }
  })(root);
  return out;
}

function readFileSafe(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return null; }
}

function relPath(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

// Fills defaults so every finding matches the required shape even if a module omits optional fields.
function makeFinding(f) {
  return {
    id: f.id,
    module: f.module,
    severity: f.severity,
    title: f.title,
    location: f.location || 'n/a',
    detail: f.detail || '',
    remediation: f.remediation || '',
    cwe: f.cwe || null,
    auto_fixable: !!f.auto_fixable,
    passed: !!f.passed, // true = this entry documents a check that PASSED, not a problem
  };
}

function cweLink(cwe) {
  if (!cwe) return null;
  const num = String(cwe).replace(/[^0-9]/g, '');
  return num ? `https://cwe.mitre.org/data/definitions/${num}.html` : null;
}

// Detects what kind of application lives at `root` so modules can decide whether
// framework-specific checks (rate limiting, JWT, CORS middleware, etc.) even apply.
function detectStack(root) {
  const pkgPath = path.join(root, 'package.json');
  const pkgRaw = readFileSafe(pkgPath);
  let pkg = null;
  if (pkgRaw) { try { pkg = JSON.parse(pkgRaw); } catch { pkg = null; } }

  const deps = pkg ? { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } : {};
  const hasDep = (name) => Object.prototype.hasOwnProperty.call(deps, name);

  const hasRequirementsTxt = fs.existsSync(path.join(root, 'requirements.txt'));

  // A root-level server.js/app.js/index.js is only real signal if it actually contains Node
  // server code (http.createServer, app.listen, express()) — otherwise "app.js" is just as
  // likely to be a static site's client-side bundle (as it is in this repo), and a naive
  // filename match would wrongly flag the whole codebase as having a backend.
  const SERVER_SIGNATURE_RE = /\.listen\(\s*\d|require\(['"]http['"]\)|createServer\(|require\(['"]express['"]\)|from ['"]express['"]/;
  const hasServerFile = ['server.js', 'app.js', 'index.js'].some(f => {
    const content = readFileSafe(path.join(root, f));
    return content && SERVER_SIGNATURE_RE.test(content);
  });
  const hasApiDir = fs.existsSync(path.join(root, 'pages', 'api')) || fs.existsSync(path.join(root, 'app', 'api')) || fs.existsSync(path.join(root, 'api'));

  const isExpress = hasDep('express');
  const isNext = hasDep('next');
  const isFastify = hasDep('fastify');
  const isKoa = hasDep('koa');
  const isFlaskOrDjango = hasRequirementsTxt && /flask|django/i.test(readFileSafe(path.join(root, 'requirements.txt')) || '');

  const hasAnyBackendFramework = isExpress || isNext || isFastify || isKoa || isFlaskOrDjango;

  return {
    hasPackageJson: !!pkg,
    pkg,
    dependencies: deps,
    hasDep,
    isExpress,
    isNext,
    isFastify,
    isKoa,
    isFlaskOrDjango,
    hasApiDir,
    hasServerFile,
    hasAnyBackendFramework,
    // Whether package.json exists is NOT part of this check — a static site can have one
    // purely for tooling (as this repo now does, for the security-check script itself)
    // without having any backend at all. Modules use this flag to avoid fabricating
    // findings against framework/route/database code that does not exist.
    isStaticSiteOnly: !hasAnyBackendFramework && !hasRequirementsTxt && !hasServerFile && !hasApiDir,
  };
}

module.exports = { walkFiles, readFileSafe, relPath, makeFinding, cweLink, detectStack, DEFAULT_EXCLUDE_DIRS };
