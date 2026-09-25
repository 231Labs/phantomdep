/**
 * Claims CI harness — marketing + email + Action templates + site.
 * Mirror Foundry funnel + a11y discipline.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  claimIn,
  hasRequiredNonClaim,
  NON_CLAIM_LONG,
  NON_CLAIM_SHORT,
  BANNED,
} from '../src/lib/claims.mjs';

const ROOT = join(import.meta.dirname, '..');
const SCAN_DIRS = ['src/templates', 'src/app'].filter((d) => {
  try {
    return statSync(join(ROOT, d)).isDirectory();
  } catch {
    return false;
  }
});

const EXT = /\.(tsx?|jsx?|md|html|txt|css)$/i;
const SKIP = /node_modules|\.next|dist|lock|poison/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (SKIP.test(p)) continue;
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (EXT.test(name)) yield p;
  }
}

const files = SCAN_DIRS.flatMap((d) => [...walk(join(ROOT, d))]);

describe('no banned claims in marketing / email / Action templates', () => {
  it('has template surfaces to scan', () => {
    assert.ok(files.length >= 3, `expected templates, got ${files.length}`);
  });

  for (const file of files) {
    it(relative(ROOT, file), () => {
      const text = readFileSync(file, 'utf8');
      if (/claims\.(ts|js|mjs)$/.test(file)) return;
      const hit = claimIn(text);
      assert.equal(hit, null, `banned claim "${hit?.match}" in ${relative(ROOT, file)}`);
    });
  }

  it('landing + email fixtures include required never-claim', () => {
    const landing = readFileSync(join(ROOT, 'src/templates/landing/hero.md'), 'utf8');
    const email = readFileSync(join(ROOT, 'src/templates/email/receipt.md'), 'utf8');
    assert.ok(hasRequiredNonClaim(landing), 'landing missing never-claim');
    assert.ok(hasRequiredNonClaim(email), 'email missing never-claim');
    assert.ok(hasRequiredNonClaim(NON_CLAIM_LONG));
    assert.ok(hasRequiredNonClaim(NON_CLAIM_SHORT));
  });
});

describe('banned inject fixtures (must fail claimIn)', () => {
  const poisons = [
    'We are secure by default for your supply chain',
    'malware-free dependencies guaranteed',
    'full SCA that replaces Snyk',
    'detects all CVEs in your lockfile',
    'SOC 2 compliant certification',
    'protects you from supply-chain attacks',
    'blocks all hallucinated packages with 99% accuracy',
    'AI-proof installs',
    'Only 3 seats left',
    'guaranteed ROI',
    'ADA-compliant dependency gate',
  ];

  for (const p of poisons) {
    it(`rejects: ${p.slice(0, 48)}…`, () => {
      assert.ok(claimIn(p), `expected ban on: ${p}`);
    });
  }

  it('BANNED list is non-empty', () => {
    assert.ok(BANNED.length >= 20);
  });

  it('safe Punch List–tone finding passes', () => {
    const safe =
      'Package `left-padx` is not on the npm registry (HTTP 404 at probe time). Next: remove from PR or allowlist with a human note. Registry / allowlist gate — engineering findings only. Not SCA, not malware-free, not “secure by default.”';
    assert.equal(claimIn(safe), null);
    assert.ok(hasRequiredNonClaim(safe));
  });
});
