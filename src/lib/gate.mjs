/**
 * PhantomDep Gate engine — existence + allowlist, block only.
 * Allowlist = override for registry miss (not a full deny-all mode).
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
 */

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
  const allowlist = loadAllowlist(rootDir);
  const probe = opts.probe ?? ((n) => probeNpm(n, { fetch: opts.fetch }));

  /** @type {Finding[]} */
  const findings = [];
  /** @type {string[]} */
  const allowlistOverrides = [];

  for (const name of names) {
    const onAllowlist = allowlist.enabled && allowlist.names.has(name);
    const result = await probe(name);

    if (result.exists) continue;

    if (onAllowlist) {
      allowlistOverrides.push(name);
      continue;
    }

    const evidence =
      result.status === 404
        ? 'not on the npm registry (HTTP 404 at probe time)'
        : `not on the npm registry (HTTP ${result.status} at probe time)`;

    findings.push({
      name,
      evidence,
      severity: 'block',
      nextStep:
        'Remove from package.json / lockfile, or add to .phantomdep-allowlist after human verify',
    });
  }

  let comment = renderFindingsComment(findings);
  if (allowlistOverrides.length > 0) {
    const note = [
      '',
      'Allowlist overrides (registry miss, explicitly listed):',
      ...allowlistOverrides.map((n) => `- \`${n}\``),
      '',
    ].join('\n');
    // Re-append never-claim after note; re-run claim gate
    comment = comment.replace(`_${NON_CLAIM_SHORT}_`, `${note}_${NON_CLAIM_SHORT}_`);
    comment = assertClaimSafe(comment, 'Action PR comment');
  }

  return {
    ok: findings.length === 0,
    findings,
    comment,
    checked: names,
    sources,
    allowlistEnabled: allowlist.enabled,
    allowlistOverrides,
  };
}
