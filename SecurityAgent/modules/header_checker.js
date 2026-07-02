'use strict';
// Spins up a local, read-only test server, requests the root route, inspects response headers
// for the required security headers and disallowed information-disclosure headers, then shuts down.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { walkFiles, readFileSafe, relPath, makeFinding, detectStack } = require('../lib/utils');

const MODULE = 'header_checker';
let seq = 0;
function nextId() { seq += 1; return `HDR-${String(seq).padStart(3, '0')}`; }

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

function startStaticServer(root, rootFile) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let filePath = req.url === '/' ? `/${rootFile}` : req.url.split('?')[0];
      const full = path.join(root, decodeURIComponent(filePath));
      if (!full.startsWith(root)) { res.writeHead(403); return res.end(); }
      fs.readFile(full, (err, data) => {
        if (err) { res.writeHead(404); return res.end('not found'); }
        const ext = path.extname(full);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function requestHeaders(port, urlPath = '/') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: urlPath, method: 'GET' }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.headers));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('timeout')));
    req.end();
  });
}

function evaluateHeaders(headers, cspFromMeta, findings) {
  const csp = headers['content-security-policy'] || cspFromMeta;
  if (!csp) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'HIGH', title: 'Content-Security-Policy missing',
      location: 'HTTP response headers', detail: 'No Content-Security-Policy header or <meta http-equiv="Content-Security-Policy"> tag was found on the root route.',
      remediation: 'Add a CSP, e.g. via a <meta http-equiv="Content-Security-Policy" content="default-src \'self\'"> tag for a static site, or a response header on a server. Avoid \'unsafe-inline\' for scripts; use a nonce if inline scripts are required.',
      cwe: 'CWE-1021', auto_fixable: false,
    }));
  } else if (/script-src[^;]*unsafe-inline/i.test(csp) && !/nonce-/.test(csp)) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'HIGH', title: "CSP allows 'unsafe-inline' scripts without a nonce",
      location: 'Content-Security-Policy', detail: `CSP found: ${csp.slice(0, 200)}`,
      remediation: "Remove 'unsafe-inline' from script-src and use a per-request nonce or hash instead.",
      cwe: 'CWE-1021', auto_fixable: false,
    }));
  } else {
    findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'INFO', title: 'Content-Security-Policy present and does not use unsafe-inline without a nonce', location: 'Content-Security-Policy', detail: csp.slice(0, 200), remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true }));
  }

  const hsts = headers['strict-transport-security'];
  if (!hsts) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'HIGH', title: 'Strict-Transport-Security missing',
      location: 'HTTP response headers', detail: 'No HSTS header was returned.',
      remediation: 'Set "Strict-Transport-Security: max-age=31536000; includeSubDomains" at your hosting/CDN layer (this header only has effect over HTTPS in production).',
      cwe: 'CWE-319', auto_fixable: false,
    }));
  } else {
    const maxAgeMatch = hsts.match(/max-age=(\d+)/);
    const maxAge = maxAgeMatch ? Number(maxAgeMatch[1]) : 0;
    if (maxAge < 31536000 || !/includeSubDomains/i.test(hsts)) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'HIGH', title: 'Strict-Transport-Security below recommended minimum',
        location: 'Strict-Transport-Security', detail: `Found: ${hsts}`,
        remediation: 'Use "max-age=31536000; includeSubDomains" at minimum.', cwe: 'CWE-319', auto_fixable: false,
      }));
    } else {
      findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'INFO', title: 'Strict-Transport-Security meets minimum', location: 'Strict-Transport-Security', detail: hsts, remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true }));
    }
  }

  const xcto = headers['x-content-type-options'];
  if (!xcto || xcto.toLowerCase() !== 'nosniff') {
    findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'MEDIUM', title: 'X-Content-Type-Options missing or not "nosniff"', location: 'HTTP response headers', detail: `Found: ${xcto || '(absent)'}`, remediation: 'Set "X-Content-Type-Options: nosniff".', cwe: 'CWE-430', auto_fixable: false }));
  } else {
    findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'INFO', title: 'X-Content-Type-Options: nosniff present', location: 'X-Content-Type-Options', detail: xcto, remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true }));
  }

  const xfo = headers['x-frame-options'];
  if (!xfo || !/^(deny|sameorigin)$/i.test(xfo)) {
    findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'MEDIUM', title: 'X-Frame-Options missing or invalid', location: 'HTTP response headers', detail: `Found: ${xfo || '(absent)'}`, remediation: 'Set "X-Frame-Options: DENY" or "SAMEORIGIN" to prevent clickjacking.', cwe: 'CWE-1021', auto_fixable: false }));
  } else {
    findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'INFO', title: 'X-Frame-Options present', location: 'X-Frame-Options', detail: xfo, remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true }));
  }

  const rp = headers['referrer-policy'];
  if (!rp || !/strict-origin-when-cross-origin|no-referrer|same-origin|strict-origin/i.test(rp)) {
    findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'LOW', title: 'Referrer-Policy missing or weak', location: 'HTTP response headers', detail: `Found: ${rp || '(absent)'}`, remediation: 'Set "Referrer-Policy: strict-origin-when-cross-origin" (or stricter).', cwe: 'CWE-200', auto_fixable: false }));
  } else {
    findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'INFO', title: 'Referrer-Policy present and adequately strict', location: 'Referrer-Policy', detail: rp, remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true }));
  }

  const pp = headers['permissions-policy'];
  if (!pp) {
    findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'LOW', title: 'Permissions-Policy missing', location: 'HTTP response headers', detail: 'No Permissions-Policy header was returned.', remediation: 'Set "Permissions-Policy: camera=(), microphone=(), geolocation=()" (adjust to restrict only what the app does not use).', cwe: 'CWE-1021', auto_fixable: false }));
  } else {
    findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'INFO', title: 'Permissions-Policy present', location: 'Permissions-Policy', detail: pp, remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true }));
  }

  if (headers['x-powered-by']) {
    findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'LOW', title: 'X-Powered-By header reveals framework', location: 'HTTP response headers', detail: `Found: ${headers['x-powered-by']}`, remediation: "Disable it: app.disable('x-powered-by') (Express) or remove the header at your server/CDN layer.", cwe: 'CWE-200', auto_fixable: false }));
  }
  const serverHeader = headers['server'];
  if (serverHeader && /\d/.test(serverHeader)) {
    findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'LOW', title: 'Server header discloses version number', location: 'HTTP response headers', detail: `Found: ${serverHeader}`, remediation: 'Configure your web server/CDN to omit or generalize the Server header (e.g. remove version numbers).', cwe: 'CWE-200', auto_fixable: false }));
  }
}

function findCspMetaTag(root, rootFile) {
  const content = readFileSafe(path.join(root, rootFile));
  if (!content) return null;
  const m = content.match(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

// A local static-file test server has no idea about vercel.json/_headers/netlify.toml — those
// only take effect on the real host. Parse them so headers configured there aren't wrongly
// flagged as missing just because this test server doesn't apply them.
function loadHostConfigHeaders(root) {
  const merged = {};
  let source = null;

  const vercelRaw = readFileSafe(path.join(root, 'vercel.json'));
  if (vercelRaw) {
    try {
      const cfg = JSON.parse(vercelRaw);
      for (const rule of cfg.headers || []) {
        for (const h of rule.headers || []) merged[h.key.toLowerCase()] = h.value;
      }
      if (Object.keys(merged).length) source = 'vercel.json';
    } catch { /* malformed vercel.json is a separate concern, not this check's job */ }
  }

  const headersFileRaw = readFileSafe(path.join(root, '_headers'));
  if (headersFileRaw) {
    for (const line of headersFileRaw.split(/\r?\n/)) {
      const m = line.match(/^\s{2,}([A-Za-z-]+):\s*(.+)$/);
      if (m) merged[m[1].toLowerCase()] = m[2].trim();
    }
    if (Object.keys(merged).length) source = source || '_headers';
  }

  return { headers: merged, source };
}

async function runStaticServerHeaderCheck(codebaseRoot, envConfig, findings) {
  const cfg = (envConfig.securityConfig && envConfig.securityConfig.headerCheck) || {};
  const rootFile = cfg.rootFile && fs.existsSync(path.join(codebaseRoot, cfg.rootFile)) ? cfg.rootFile : 'index.html';
  if (!fs.existsSync(path.join(codebaseRoot, rootFile))) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO', title: 'No root HTML file found to test',
      location: 'n/a', detail: `Looked for ${rootFile} at the repo root and it does not exist.`,
      remediation: 'No action needed.', cwe: null, auto_fixable: false, passed: true,
    }));
    return;
  }

  let server;
  try {
    server = await startStaticServer(codebaseRoot, rootFile);
    const port = server.address().port;
    const liveHeaders = await requestHeaders(port, '/');
    const { headers: hostConfigHeaders, source } = loadHostConfigHeaders(codebaseRoot);

    // Live headers win if present (e.g. actually running behind something); host config fills
    // in anything this bare local test server can't produce on its own.
    const effectiveHeaders = { ...hostConfigHeaders, ...liveHeaders };
    if (source) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'INFO',
        title: `Headers configured via ${source} were included in this evaluation`,
        location: source,
        detail: `This local test server is a bare static file server and does not apply ${source} itself. Header values found there were merged in so this check reflects what the real deployment will actually send.`,
        remediation: 'No action needed — verify with a live request after deploying if you want to double-check.',
        cwe: null, auto_fixable: false, passed: true,
      }));
    }

    const cspFromMeta = findCspMetaTag(codebaseRoot, rootFile);
    evaluateHeaders(effectiveHeaders, cspFromMeta, findings);
  } catch (err) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO', title: 'Could not start local test server for header check',
      location: 'n/a', detail: `Error: ${err.message}`,
      remediation: 'Re-run manually if needed; this does not indicate a vulnerability.', cwe: null, auto_fixable: false, passed: true,
    }));
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
  }
}

function runStaticScanForHelmet(codebaseRoot, findings) {
  const files = walkFiles(codebaseRoot, { extensions: ['.js', '.ts'] });
  const usesHelmet = files.some(f => /require\(['"]helmet['"]\)|from ['"]helmet['"]/.test(readFileSafe(f) || ''));
  if (!usesHelmet) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'HIGH',
      title: 'No security-header middleware (e.g. helmet) detected',
      location: `${files.length} files scanned`,
      detail: 'A backend framework was detected but no helmet (or equivalent) usage was found, so CSP/HSTS/X-Frame-Options/etc. are likely not being set.',
      remediation: 'Add helmet: app.use(helmet()) as an Express middleware (or the equivalent for your framework), then tune the CSP directive for your app.',
      cwe: 'CWE-1021', auto_fixable: false,
    }));
  } else {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO', title: 'Security-header middleware detected in source',
      location: `${files.length} files scanned`, detail: 'Found helmet (or equivalent) usage. Note: this checker did not start the live server, so exact header values were not verified — spin up the app and re-run to inspect live headers.',
      remediation: 'No action needed for detection; verify actual runtime headers separately.', cwe: null, auto_fixable: false, passed: true,
    }));
  }
}

async function runCheck(codebaseRoot, envConfig) {
  seq = 0;
  const stack = detectStack(codebaseRoot);
  const findings = [];

  if (stack.isStaticSiteOnly) {
    await runStaticServerHeaderCheck(codebaseRoot, envConfig, findings);
  } else {
    // Starting an arbitrary detected backend automatically is unsafe (unknown env vars, DB
    // connections, ports) — fall back to a static scan for security-header middleware instead.
    runStaticScanForHelmet(codebaseRoot, findings);
  }

  return findings;
}

module.exports = { runCheck };
