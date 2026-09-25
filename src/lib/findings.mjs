/**
 * Render PR findings comment — Punch List rhyme.
 * Week-1: severity = block only (Virginia unlock required for warn).
 * ALWAYS run claimIn on the full body before post.
 */
import { assertClaimSafe, NON_CLAIM_SHORT } from './claims.mjs';

/**
 * @typedef {{ name: string, evidence: string, severity: 'block', nextStep: string }} Finding
 */

/**
 * @param {Finding[]} findings
 * @returns {string} markdown body safe to post
 */
export function renderFindingsComment(findings) {
  const rows = (findings ?? [])
    .map((f) => {
      if (f.severity && f.severity !== 'block') {
        throw new Error(
          `week-1 findings are block-only; refused severity="${f.severity}" (Virginia unlock required for warn)`,
        );
      }
      return `| \`${f.name}\` | **block** | ${f.evidence} | ${f.nextStep} |`;
    })
    .join('\n');

  const body = [
    '### PhantomDep Gate findings',
    '',
    '| Package | Verdict | Evidence | Next step |',
    '| --- | --- | --- | --- |',
    rows || '| — | — | No issues | — |',
    '',
    `_${NON_CLAIM_SHORT}_`,
    '',
  ].join('\n');

  return assertClaimSafe(body, 'Action PR comment');
}
