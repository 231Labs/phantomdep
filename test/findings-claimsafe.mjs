/**
 * Generated findings must pass claimIn before post.
 * Week-1: block only.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderFindingsComment } from '../src/lib/findings.mjs';
import { claimIn, hasRequiredNonClaim } from '../src/lib/claims.mjs';

describe('renderFindingsComment claim gate', () => {
  it('posts safe block finding with never-claim footer', () => {
    const body = renderFindingsComment([
      {
        name: 'react-codeshift-helper',
        evidence: 'not on the npm registry (HTTP 404 at probe time)',
        severity: 'block',
        nextStep: 'Remove from package.json or allowlist after human verify',
      },
    ]);
    assert.equal(claimIn(body), null);
    assert.ok(hasRequiredNonClaim(body));
    assert.match(body, /react-codeshift-helper/);
    assert.match(body, /\*\*block\*\*/);
    assert.doesNotMatch(body, /\*\*warn\*\*/);
  });

  it('refuses warn severity in week-1 API', () => {
    assert.throws(
      () =>
        renderFindingsComment([
          {
            name: 'lodash',
            evidence: 'registry exists; not on allowlist',
            severity: 'warn',
            nextStep: 'review',
          },
        ]),
      /block-only/,
    );
  });

  it('refuses generated body if evidence smuggles banned claim', () => {
    assert.throws(
      () =>
        renderFindingsComment([
          {
            name: 'lodash',
            evidence: 'malware-free and secure by default',
            severity: 'block',
            nextStep: 'ship it',
          },
        ]),
      /banned claim/,
    );
  });
});
