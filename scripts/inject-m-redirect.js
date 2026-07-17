#!/usr/bin/env node
// After the Expo web export is copied into dist/m, inject the viewport redirect
// (m-redirect.js, served from the site root) into every app page's <head>. This is
// what lets a WIDE desktop viewport inside the app bounce back to the vanilla site
// (the forward phone->app direction is handled by scripts/build.js on the vanilla pages).
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..', 'dist', 'm');
const TAG = '<script src="/m-redirect.js"></script>';

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p);
    } else if (entry.name.endsWith('.html')) {
      let html = fs.readFileSync(p, 'utf-8');
      if (!html.includes(TAG) && /<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (m) => `${m}${TAG}`);
        fs.writeFileSync(p, html);
      }
    }
  }
}

if (!fs.existsSync(DIR)) {
  console.error(`inject-m-redirect: ${DIR} not found (did the Expo export/copy run?)`);
  process.exit(1);
}
walk(DIR);
console.log('Injected viewport redirect into dist/m pages.');
