/**
 * PhantomDep Gate engine — existence + allowlist, block only.
 * Allowlist = override for registry miss (not a deny-all mode).
 * Week-1: no package age warn.
 */
import { collectNpmDeps } from './parse-deps.mjs';
import { loadAllowlist } from './allowlist.mjs';
import { probeNpm } from './probe-npm.mjs';
import { renderFindingsComment } from './findings.mjs';
import { assertClaimSafe, NON_CLAIM_SHORT } from './claims.mjs';

/**
 * @typedef {{ name: string, evidence: string, severity: 'block', nextStep: string }} Finding
 * @typedef {{
 *   ok: boolean,
 *   findings: Finding[],
 *   comment: string,
 *   checked: string[],
 *   sources: string[],
 *   allowlistEnabled: boolean,
 *   allowlistOverrides: string[],
 * }} GateResult
 * @typedef {{
 *   ok: boolean,
 *   findings: Finding[],
 *   comment: string,
 *   allowlistEnabled: boolean,
 *   allowlistOverrides: string[],
 * }} EvalResult
 */

/**
 * Same spine as the Action: registry hit allows; registry miss allows only
 * when the name is on `.phantomdep-allowlist`. Otherwise block.
 * Week-1 returns block or allow — never a warn verdict.
 *
 * @param {{ name: string, exists: boolean, status: number, onAllowlist: boolean }} input
 * @returns {{ verdict: 'allow', reason: 'registry' | 'allowlist' } | { verdict: 'block', finding: Finding }}
 */
export function judgeNpmPackage({ name, exists, status, onAllowlist }) {
  if (exists) return { verdict: 'allow', reason: 'registry' };
  if (onAllowlist) return { verdict: 'allow', reason: 'allowlist' };

  const evidence =
    status === 404
      ? 'not on the npm registry (HTTP 404 at probe time)'
      : `not on the npm registry (HTTP ${status} at probe time)`;

  return {
    verdict: 'block',
    finding: {
      name,
      evidence,
      severity: 'block',
      nextStep:
        'Remove from package.json / lockfile, or add to .phantomdep-allowlist after human verify',
    },
  };
}

/**
 * @param {Finding[]} findings
 * @param {string[]} [allowlistOverrides]
 * @returns {string}
 */
export function renderGateComment(findings, allowlistOverrides = []) {
  let comment = renderFindingsComment(findings);
  if (allowlistOverrides.length > 0) {
    const note = [
      '',
      'Allowlist overrides (registry miss, explicitly listed):',
      ...allowlistOverrides.map((n) => `- \`${n}\``),
      '',
    ].join('\n');
    comment = comment.replace(`_${NON_CLAIM_SHORT}_`, `${note}_${NON_CLAIM_SHORT}_`);
    comment = assertClaimSafe(comment, 'Action PR comment');
  }
  return comment;
}

/**
 * @param {string} rootDir
 * @param {string[]} names
 * @param {{
 *   fetch?: typeof fetch,
 *   probe?: (name: string) => Promise<{ exists: boolean, status: number }>,
 * }} [opts]
 * @returns {Promise<EvalResult>}
 */
export async function evaluateNpmNames(rootDir, names, opts = {}) {
  const allowlist = loadAllowlist(rootDir);
  const probe = opts.probe ?? ((n) => probeNpm(n, { fetch: opts.fetch }));

  /** @type {Finding[]} */
  const findings = [];
  /** @type {string[]} */
  const allowlistOverrides = [];

  for (const name of names) {
    const onAllowlist = allowlist.enabled && allowlist.names.has(name);
    const result = await probe(name);
    const judged = judgeNpmPackage({
      name,
      exists: result.exists,
      status: result.status,
      onAllowlist,
    });
    if (judged.verdict === 'allow' && judged.reason === 'allowlist') {
      allowlistOverrides.push(name);
    }
    if (judged.verdict === 'block') findings.push(judged.finding);
  }

  return {
    ok: findings.length === 0,
    findings,
    comment: renderGateComment(findings, allowlistOverrides),
    allowlistEnabled: allowlist.enabled,
    allowlistOverrides,
  };
}

/**
 * @param {string} rootDir
 * @param {{
 *   fetch?: typeof fetch,
 *   probe?: (name: string) => Promise<{ exists: boolean, status: number }>,
 * }} [opts]
 * @returns {Promise<GateResult>}
 */
export async function runGate(rootDir, opts = {}) {
  const { names, sources } = collectNpmDeps(rootDir);
  const evaluated = await evaluateNpmNames(rootDir, names, opts);
  return {
    ...evaluated,
    checked: names,
    sources,
  };
}
