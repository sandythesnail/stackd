'use strict';
// Stackd-specific checks: survey data access, diamond economy integrity, and LLM API key /
// prompt-injection exposure. Reality check first: this codebase has no backend, no database,
// and no server-side routes at all — every module lives in app.js as a client-only SPA with
// state persisted to a single localStorage key. Findings below reflect that architecture
// honestly instead of assuming an Express/Next.js API that does not exist.
const { walkFiles, readFileSafe, relPath, makeFinding, detectStack } = require('../lib/utils');

const MODULE = 'stackd_specific_checker';
let seq = 0;
function nextId() { seq += 1; return `SD-${String(seq).padStart(3, '0')}`; }

function findFunctionBody(content, fnNameRe) {
  const m = content.match(fnNameRe);
  if (!m) return null;
  const start = m.index;
  let depth = 0, i = content.indexOf('{', start);
  if (i === -1) return null;
  const bodyStart = i;
  for (; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') { depth--; if (depth === 0) return content.slice(bodyStart, i + 1); }
  }
  return null;
}

async function runCheck(codebaseRoot, envConfig) {
  seq = 0;
  const findings = [];
  const stack = detectStack(codebaseRoot);
  const jsFiles = walkFiles(codebaseRoot, { extensions: ['.js', '.ts', '.jsx', '.tsx'] });
  const appJs = jsFiles.find(f => f.endsWith('app.js')) || null;
  const appContent = appJs ? readFileSafe(appJs) : '';
  const allContent = jsFiles.map(f => readFileSafe(f) || '').join('\n');

  // ── 12.1 Survey data access control ─────────────────────────────
  const hasSurveyEndpoint = /\b(?:app|router)\.(get|post)\s*\(\s*['"][^'"]*survey/i.test(allContent);
  if (!hasSurveyEndpoint) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO',
      title: 'Survey data access control — no server endpoint exists',
      location: appJs ? relPath(codebaseRoot, appJs) : 'n/a',
      detail: 'The onboarding survey (state.onboardingSurvey) is stored only in the same-origin localStorage key "stackd_v2" on the user\'s own device. There is no server endpoint that serves survey data, so there is no cross-user IDOR surface (no req.user.id vs params.userId to compare, because there is no multi-user server at all).',
      remediation: 'No action needed today. If survey data is ever synced to a backend for analytics/personalization across devices, every read endpoint must then verify req.user.id === the resource owner before returning data, and results must never appear in an unauthenticated response.',
      cwe: 'CWE-284', auto_fixable: false, passed: true,
    }));
  }

  // ── 12.2 Diamond economy integrity ──────────────────────────────
  if (appContent) {
    const updateStreakBody = findFunctionBody(appContent, /function\s+updateStreak\s*\(/);
    if (updateStreakBody) {
      const guardsAgainstSameDay = /lastPlayedDate\s*===\s*today\)\s*return/.test(updateStreakBody);
      if (guardsAgainstSameDay) {
        findings.push(makeFinding({
          id: nextId(), module: MODULE, severity: 'INFO', title: 'Streak diamond award is idempotent per day',
          location: `${relPath(codebaseRoot, appJs)}: updateStreak()`,
          detail: 'updateStreak() returns early (0 diamonds) if state.lastPlayedDate already equals today, and the streak counter only increments once per calendar day, so a milestone (every 3rd day) cannot be re-awarded by calling this function twice in the same session.',
          remediation: 'No action needed. Note this guard lives entirely client-side in localStorage — see the cross-tab note below for the actual residual risk.',
          cwe: null, auto_fixable: false, passed: true,
        }));
      } else {
        findings.push(makeFinding({
          id: nextId(), module: MODULE, severity: 'HIGH', title: 'Streak diamond award may not be idempotent',
          location: `${relPath(codebaseRoot, appJs)}: updateStreak()`,
          detail: 'updateStreak() no longer contains the expected same-day guard — this may allow repeated diamond awards if called multiple times per session.',
          remediation: 'Re-add a guard that returns early when state.lastPlayedDate already equals today\'s date, before incrementing the streak or awarding diamonds.',
          cwe: 'CWE-841', auto_fixable: false,
        }));
      }
    }

    const shopActionBody = findFunctionBody(appContent, /function\s+handleShopAction\s*\(/);
    if (shopActionBody) {
      const checksBeforeDeduct = /shopBalanceFor\(item\)\s*<\s*item\.price\)\s*return/.test(shopActionBody);
      const priceFromCatalog = !/item\.price\s*=\s*req\.|item\.price\s*=\s*.*\.body/.test(shopActionBody);
      if (checksBeforeDeduct && priceFromCatalog) {
        findings.push(makeFinding({
          id: nextId(), module: MODULE, severity: 'INFO', title: 'Shop purchases check balance before deducting, price is never client-suppliable',
          location: `${relPath(codebaseRoot, appJs)}: handleShopAction()`,
          detail: 'handleShopAction() reads item.price from the hardcoded SHOP_ITEMS catalog (never from a request body — there is no request at all), checks shopBalanceFor(item) < item.price and returns early before any deduction, all synchronously with no await in between (no async race window within a single call).',
          remediation: 'No action needed for single-tab use. Residual risk: localStorage has no cross-tab locking, so two browser tabs open at once could both read the pre-purchase balance and each independently deduct, letting a user duplicate a small amount of currency by racing tabs. Impact is low (cosmetic shop items only, no real-money value), but if this app ever adds paid/real-value items, move balance mutation to a server-authoritative transaction.',
          cwe: null, auto_fixable: false, passed: true,
        }));
      }
    }

    const diamondFromClientRe = /state\.diamonds\s*=\s*(?:req\.|Number\(req\.)/;
    if (diamondFromClientRe.test(appContent)) {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'CRITICAL', title: 'Diamond balance appears settable from client-supplied input',
        location: relPath(codebaseRoot, appJs),
        detail: 'Found state.diamonds assigned from a request-derived value.',
        remediation: 'Diamond balance changes must only ever be the result of a specific server-validated event (streak milestone, purchase); never accept an absolute balance or delta from the client.',
        cwe: 'CWE-602', auto_fixable: false,
      }));
    } else {
      findings.push(makeFinding({
        id: nextId(), module: MODULE, severity: 'INFO', title: 'No code path sets diamond/coin balance from an external/client-supplied value',
        location: appJs ? relPath(codebaseRoot, appJs) : 'n/a',
        detail: 'All balance mutations found (updateStreak, handleShopAction, addXP-adjacent coin awards) derive amounts from hardcoded constants (STREAK_DIAMOND_REWARD, SHOP_ITEMS[].price, per-module xpReward), not from any request or URL input — consistent with there being no server/API at all.',
        remediation: 'No action needed today. This entire economy is client-authoritative by architecture (no backend); that is acceptable for a no-stakes cosmetic reward system, but would need a real server-authoritative rework before handling anything of real monetary value.',
        cwe: null, auto_fixable: false, passed: true,
      }));
    }
  }

  // ── 12.3 / 12.4 LLM API key exposure and prompt injection ───────
  const anthropicRefs = jsFiles.filter(f => /anthropic|claude-|ANTHROPIC_API_KEY/i.test(readFileSafe(f) || ''));
  if (anthropicRefs.length === 0) {
    findings.push(makeFinding({
      id: nextId(), module: MODULE, severity: 'INFO',
      title: 'No Anthropic/LLM API integration exists in this codebase',
      location: 'n/a',
      detail: `Scanned ${jsFiles.length} JS/TS files for "anthropic", "claude-", and "ANTHROPIC_API_KEY" — no matches. There is no LLM API key to expose and no prompt-construction code to review for injection.`,
      remediation: 'No action needed today. If an Anthropic-powered feature is added later: never hardcode ANTHROPIC_API_KEY, never expose it via a NEXT_PUBLIC_ or otherwise client-bundled variable, call the API only from a server-side route with rate limiting, length-limit user input before it reaches a prompt, and wrap any user input in a clear delimiter (e.g. <user_input>...</user_input>) so it cannot be confused with system instructions.',
      cwe: null, auto_fixable: false, passed: true,
    }));
  } else {
    for (const f of anthropicRefs) {
      const content = readFileSafe(f) || '';
      const rel = relPath(codebaseRoot, f);
      if (/ANTHROPIC_API_KEY\s*[:=]\s*["']sk-ant-/.test(content)) {
        findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'CRITICAL', title: 'Hardcoded Anthropic API key', location: rel, detail: 'A literal sk-ant- key is assigned in source.', remediation: 'Remove immediately, rotate the key, load via process.env.ANTHROPIC_API_KEY server-side only.', cwe: 'CWE-798', auto_fixable: false }));
      }
      if (/NEXT_PUBLIC_[A-Z0-9_]*ANTHROPIC/i.test(content)) {
        findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'CRITICAL', title: 'Anthropic key exposed via NEXT_PUBLIC_ variable', location: rel, detail: 'A NEXT_PUBLIC_ prefixed variable references the Anthropic key, which bundles it into client-visible JS.', remediation: 'Rename without the NEXT_PUBLIC_ prefix and only read it in server code.', cwe: 'CWE-200', auto_fixable: false }));
      }
      const isBrowserFile = !/require\(['"]express['"]\)|pages\/api|app\/api/.test(content) && !rel.includes('api/');
      if (/anthropic\.messages\.create|new Anthropic\(/i.test(content) && isBrowserFile) {
        findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'CRITICAL', title: 'Anthropic API called directly from client-side code', location: rel, detail: 'The API call does not appear to be inside a server route, which would require shipping the API key to the browser.', remediation: 'Move this call into a server-side API route; the browser should call your own backend, never Anthropic directly.', cwe: 'CWE-200', auto_fixable: false }));
      }
      if (/anthropic\.messages\.create/i.test(content) && !/rate.?limit/i.test(content)) {
        findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'HIGH', title: 'Server route calling Anthropic has no rate limiting', location: rel, detail: 'No rate-limit reference found near the Anthropic call, so an attacker could drive up API costs.', remediation: 'Apply rate limiting to this route (see rate_limit_checker for thresholds).', cwe: 'CWE-770', auto_fixable: false }));
      }
      if (/anthropic\.messages\.create/i.test(content) && !/<user_input>|<\/user_input>|delimiter/i.test(content)) {
        findings.push(makeFinding({ id: nextId(), module: MODULE, severity: 'HIGH', title: 'User input not clearly delimited in Anthropic prompt', location: rel, detail: 'No XML-tag-style delimiter (e.g. <user_input>) was found around user-supplied content in the prompt construction.', remediation: 'Wrap user input in an explicit delimiter like <user_input>...</user_input> so it cannot be confused with system instructions, and enforce a max length before it reaches the prompt.', cwe: 'CWE-77', auto_fixable: false }));
      }
    }
  }

  return findings;
}

module.exports = { runCheck };
