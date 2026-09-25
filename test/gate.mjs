/**
 * Gate engine: missing → fail; lodash → pass; allowlist override → pass.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { runGate } from '../src/lib/gate.mjs';
import { claimIn, hasRequiredNonClaim } from '../src/lib/claims.mjs';

const FIX = join(import.meta.dirname, '..', 'fixtures');

/** @param {Map<string, { exists: boolean, status: number }>} map */
function stubProbe(map) {
  return async (name) => map.get(name) ?? { exists: false, status: 404 };
}

describe('runGate', () => {
  it('missing package → fail + block finding', async () => {
    const missing = 'this-package-definitely-does-not-exist-phantomdep-9f3a2';
    const result = await runGate(join(FIX, 'missing-dep'), {
      probe: stubProbe(new Map([[missing, { exists: false, status: 404 }]])),
    });
    assert.equal(result.ok, false);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].name, missing);
    assert.equal(result.findings[0].severity, 'block');
    assert.equal(claimIn(result.comment), null);
    assert.ok(hasRequiredNonClaim(result.comment));
    assert.match(result.comment, /\*\*block\*\*/);
    assert.doesNotMatch(result.comment, /\*\*warn\*\*/);
  });

  it('lodash → pass', async () => {
    const result = await runGate(join(FIX, 'lodash-ok'), {
      probe: stubProbe(new Map([['lodash', { exists: true, status: 200 }]])),
    });
    assert.equal(result.ok, true);
    assert.equal(result.findings.length, 0);
    assert.equal(claimIn(result.comment), null);
    assert.ok(hasRequiredNonClaim(result.comment));
  });

  it('allowlist override → pass with note', async () => {
    const missing = 'this-package-definitely-does-not-exist-phantomdep-9f3a2';
    const result = await runGate(join(FIX, 'allowlist-override'), {
      probe: stubProbe(new Map([[missing, { exists: false, status: 404 }]])),
    });
    assert.equal(result.ok, true);
    assert.equal(result.findings.length, 0);
    assert.deepEqual(result.allowlistOverrides, [missing]);
    assert.match(result.comment, /Allowlist overrides/);
    assert.match(result.comment, new RegExp(missing));
    assert.equal(claimIn(result.comment), null);
    assert.ok(hasRequiredNonClaim(result.comment));
  });
});
