/**
 * Guards the per-module "Sources & References" against each other: app.html's
 * `.sources-module` accordions on the Settings page, and mobile/src/references.ts.
 *
 * mobile/src/references.ts says at the top that it was transcribed verbatim from the
 * website's Settings page, and asks the next person to "keep this in sync with app.html if
 * the website's citations ever change" — which is a promise someone has to remember every
 * time either side is edited, and the same promise scripts/check-content.js exists because
 * nobody can keep. The website has no JS data structure for these (they are hand-authored
 * HTML), so this reads the markup directly rather than the two sides sharing a source.
 *
 * These are the citations behind claims a student is being taught as fact: the FICA rate,
 * what a .gov domain means, how long you can stay on a parent's health plan. The two apps
 * disagreeing means one of them is showing a source that no longer supports what the other
 * says — and unlike a colour or a label, nobody scrolling the app would ever notice.
 *
 * The order is compared as well as the text, since both apps number these lists.
 *
 *   node scripts/check-references.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

/* Only the entities actually used in these citations, spelled out rather than pulled from a
 * dependency — `&sect;` in the Student FICA exception's statute reference, and the `&amp;` in
 * two of the module headings. An unknown entity is left alone so it shows up as a difference
 * rather than being silently swallowed. */
const ENTITIES = { '&sect;': '§', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&nbsp;': ' ', '&#39;': "'" };
const decode = (s) => s.replace(/&[a-z#0-9]+;/gi, (m) => (m in ENTITIES ? ENTITIES[m] : m));

/** The citation lists as the Settings page actually renders them. */
function sourcesFromHtml(html) {
  const out = [];
  const blockRe = /<details class="sources-module">\s*<summary>([^<]+)<\/summary>\s*<ol>([\s\S]*?)<\/ol>/g;
  let m;
  while ((m = blockRe.exec(html))) {
    const items = [...m[2].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((li) => {
      const a = li[1].match(/<a href="([^"]+)"[^>]*>([^<]*)<\/a>/);
      return {
        // The citation is everything except the trailing link; whitespace collapsed, because
        // the markup wraps these across lines and the TypeScript side writes them flat.
        text: decode(li[1].replace(/<a [\s\S]*?<\/a>/g, '').replace(/\s+/g, ' ').trim()),
        domain: a ? decode(a[2]).trim() : null,
        url: a ? a[1] : null,
      };
    });
    out.push({ heading: decode(m[1].trim()), items });
  }
  return out;
}

/** MODULE_SOURCES, evaluated rather than pattern-matched.
 *
 * It is pure data, and a regex over it is what makes a checker quietly stop covering an
 * entry: several citations run long enough that they are written across more than one line,
 * and a line-oriented pattern reports those as missing from mobile when they are right
 * there. Slicing the literal and evaluating it keeps this to the data — no app code runs,
 * and the sandbox has no globals for it to reach if it tried. */
function sourcesFromMobile(ts) {
  const marker = 'MODULE_SOURCES: Record<string, SourceRef[]> = {';
  const start = ts.indexOf(marker);
  if (start < 0) throw new Error('references.ts: no MODULE_SOURCES');
  const open = start + marker.length - 1;
  let depth = 0, end = -1, str = null, esc = false;
  for (let i = open; i < ts.length; i++) {
    const ch = ts[i];
    if (str) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === str) str = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { str = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) throw new Error('references.ts: unterminated MODULE_SOURCES');
  return vm.runInNewContext('(' + ts.slice(open, end + 1) + ')', Object.create(null));
}

const problems = [];
const note = (m) => { if (problems.length < 60) problems.push(m); };

const web = sourcesFromHtml(read('app.html'));
const mob = sourcesFromMobile(read('mobile/src/references.ts'));
const mobIds = Object.keys(mob);

if (!web.length) note('sources: parsed none from app.html — the checker, not the data, is probably broken');
if (!mobIds.length) note('sources: parsed none from mobile — the checker, not the data, is probably broken');

if (web.length !== mobIds.length) {
  note(`modules: app.html has ${web.length} source lists, mobile has ${mobIds.length}`);
}

/* Paired by position. The website labels these with the module's display title ("Managing
 * Credit") and mobile keys them by id ("credit"), so there is no shared identifier to join
 * on — but both files list the same eleven modules in the same curriculum order, and a list
 * that moved is itself worth failing over. */
let citations = 0;
const pairs = Math.min(web.length, mobIds.length);
for (let i = 0; i < pairs; i++) {
  const { heading, items } = web[i];
  const id = mobIds[i];
  const mine = mob[id] || [];
  const where = `${heading} / ${id}`;
  if (items.length !== mine.length) {
    note(`${where}: ${items.length} citations in app.html, ${mine.length} in mobile`);
    continue;
  }
  items.forEach((a, j) => {
    citations++;
    const b = mine[j];
    for (const k of ['text', 'domain', 'url']) {
      if (a[k] !== b[k]) {
        note(`${where} citation ${j + 1} ${k}:\n      app.html: ${JSON.stringify(a[k])}\n      mobile:   ${JSON.stringify(b[k])}`);
      }
    }
  });
}

if (problems.length) {
  console.error('Sources & References DRIFT:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}
console.log(`Sources & References OK — ${citations} citations across ${pairs} modules match`
  + ' between app.html and mobile/src/references.ts, in the same order.');
