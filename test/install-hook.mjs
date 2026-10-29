/**
 * Install Allowlist Hook: registry miss, allowlist miss, allowlisted/existing, footer, no warn.
 */
import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { main } from '../src/hook/install.mjs';
import { npmRegistryName, planInstall, splitInstallArgv } from '../src/lib/install-plan.mjs';
import { judgeNpmPackage } from '../src/lib/gate.mjs';
import { claimIn, hasRequiredNonClaim, NON_CLAIM_SHORT } from '../src/lib/claims.mjs';

const ROOT = join(import.meta.dirname, '..');

/** @param {Map<string, { exists: boolean, status: number }>} map */
function stubProbe(map) {
  return async (name) => map.get(name) ?? { exists: false, status: 404 };
}

/** @param {Record<string, string>} files */
async function tempRoot(files) {
  const dir = await mkdtemp(join(tmpdir(), 'phantomdep-hook-'));
  for (const [name, body] of Object.entries(files)) {
    await writeFile(join(dir, name), body);
  }
  return dir;
}

describe('npmRegistryName', () => {
  it('keeps registry names and strips versions', () => {
    assert.equal(npmRegistryName('lodash'), 'lodash');
    assert.equal(npmRegistryName('lodash@4.17.21'), 'lodash');
    assert.equal(npmRegistryName('@scope/pkg@1.2.3'), '@scope/pkg');
  });

  it('rejects non-registry specs', () => {
    assert.equal(npmRegistryName('file:../pkg'), null);
    assert.equal(npmRegistryName('git+https://example.com/pkg.git'), null);
    assert.equal(npmRegistryName('./local'), null);
  });
});

describe('splitInstallArgv', () => {
  it('strips hook flags and keeps npm flags', () => {
    const parsed = splitInstallArgv([
      '--dir',
      '/tmp/consumer',
      '--save-dev',
      'lodash',
      '--phantomdep-dry-run',
    ]);
    assert.equal(parsed.rootDir, '/tmp/consumer');
    assert.equal(parsed.dryRun, true);
    assert.deepEqual(parsed.packageSpecs, ['lodash']);
    assert.deepEqual(parsed.npmArgs, ['--save-dev', 'lodash']);
  });
});

describe('Install Allowlist Hook', () => {
  it('registry miss → block and does not spawn npm', async () => {
    const dir = await tempRoot({});
    const spawned = [];
    const logs = [];
    try {
      const code = await main(['missing-pkg'], {
        cwd: dir,
        probe: stubProbe(new Map([['missing-pkg', { exists: false, status: 404 }]])),
        spawnNpm: async (args) => {
          spawned.push(args);
          return 0;
        },
        log: (line) => logs.push(line),
        error: () => {},
      });
      assert.equal(code, 1);
      assert.equal(spawned.length, 0);
      const comment = logs.join('\n');
      assert.match(comment, /missing-pkg/);
      assert.match(comment, /\*\*block\*\*/);
      assert.doesNotMatch(comment, /\*\*warn\*\*/);
      assert.equal(claimIn(comment), null);
      assert.ok(comment.includes(NON_CLAIM_SHORT));
      assert.ok(hasRequiredNonClaim(comment));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('allowlist miss → block', async () => {
    const dir = await tempRoot({
      '.phantomdep-allowlist': '@myorg/other\n',
    });
    try {
      const plan = await planInstall({
        rootDir: dir,
        packageSpecs: ['not-listed'],
        probe: stubProbe(new Map([['not-listed', { exists: false, status: 404 }]])),
      });
      assert.equal(plan.ok, false);
      assert.equal(plan.allowlistEnabled, true);
      assert.deepEqual(plan.allowlistOverrides, []);
      assert.equal(plan.findings[0].name, 'not-listed');
      assert.equal(plan.findings[0].severity, 'block');
      assert.doesNotMatch(plan.comment, /\*\*warn\*\*/);
      assert.ok(plan.comment.includes(NON_CLAIM_SHORT));
      assert.equal(claimIn(plan.comment), null);
      assert.ok(hasRequiredNonClaim(plan.comment));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('allowlisted registry miss → allow and dry-run does not spawn npm', async () => {
    const dir = await tempRoot({
      '.phantomdep-allowlist': '@myorg/private-pkg\n',
    });
    const spawned = [];
    const logs = [];
    try {
      const code = await main(['--phantomdep-dry-run', '@myorg/private-pkg@1.0.0'], {
        cwd: dir,
        probe: stubProbe(new Map([['@myorg/private-pkg', { exists: false, status: 404 }]])),
        spawnNpm: async () => {
          spawned.push(1);
          return 0;
        },
        log: (line) => logs.push(line),
      });
      assert.equal(code, 0);
      assert.equal(spawned.length, 0);
      const comment = logs.join('\n');
      assert.match(comment, /Allowlist overrides/);
      assert.match(comment, /@myorg\/private-pkg/);
      assert.ok(comment.includes(NON_CLAIM_SHORT));
      assert.equal(claimIn(comment), null);
      assert.ok(hasRequiredNonClaim(comment));
      assert.match(logs.at(-1) ?? '', /dry-run ok/);
      assert.doesNotMatch(comment, /\*\*warn\*\*/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('existing registry package → allow and spawns npm install', async () => {
    const dir = await tempRoot({
      '.phantomdep-allowlist': '@myorg/other\n',
    });
    const spawned = [];
    const logs = [];
    try {
      const code = await main(['lodash@4.17.21', '--save-exact'], {
        cwd: dir,
        probe: stubProbe(new Map([['lodash', { exists: true, status: 200 }]])),
        spawnNpm: async (args, cwd) => {
          spawned.push({ args, cwd });
          return 0;
        },
        log: (line) => logs.push(line),
      });
      assert.equal(code, 0);
      assert.deepEqual(spawned, [{ args: ['lodash@4.17.21', '--save-exact'], cwd: dir }]);
      const comment = logs.join('\n');
      assert.ok(comment.includes(NON_CLAIM_SHORT));
      assert.doesNotMatch(comment, /\*\*warn\*\*/);
      assert.equal(claimIn(comment), null);
      assert.ok(hasRequiredNonClaim(comment));
      assert.match(logs.at(-1) ?? '', /Install Allowlist Hook: ok/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('non-registry spec fails closed and does not spawn npm', async () => {
    const dir = await tempRoot({});
    const spawned = [];
    const logs = [];
    try {
      const code = await main(['file:../pkg'], {
        cwd: dir,
        probe: stubProbe(new Map()),
        spawnNpm: async () => {
          spawned.push(1);
          return 0;
        },
        log: (line) => logs.push(line),
        error: () => {},
      });
      assert.equal(code, 1);
      assert.equal(spawned.length, 0);
      const comment = logs.join('\n');
      assert.match(comment, /file:\.\.\/pkg/);
      assert.match(comment, /\*\*block\*\*/);
      assert.ok(comment.includes(NON_CLAIM_SHORT));
      assert.equal(claimIn(comment), null);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('bare install checks package.json and blocks a registry miss', async () => {
    const dir = await tempRoot({
      'package.json': JSON.stringify({
        dependencies: { 'ghost-pkg': '1.0.0' },
      }),
    });
    try {
      const plan = await planInstall({
        rootDir: dir,
        packageSpecs: [],
        probe: stubProbe(new Map([['ghost-pkg', { exists: false, status: 404 }]])),
      });
      assert.equal(plan.ok, false);
      assert.equal(plan.findings[0].name, 'ghost-pkg');
      assert.equal(plan.findings[0].severity, 'block');
      assert.doesNotMatch(plan.comment, /\*\*warn\*\*/);
      assert.ok(plan.comment.includes(NON_CLAIM_SHORT));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('judge is block or allow only (no package age warn)', () => {
    const blocked = judgeNpmPackage({
      name: 'x',
      exists: false,
      status: 404,
      onAllowlist: false,
    });
    assert.equal(blocked.verdict, 'block');
    assert.equal(blocked.finding.severity, 'block');

    const unavailable = judgeNpmPackage({
      name: 'x',
      exists: false,
      status: 503,
      onAllowlist: false,
    });
    assert.equal(unavailable.verdict, 'block');
    assert.match(unavailable.finding.evidence, /503/);
    assert.equal(unavailable.finding.severity, 'block');

    const onRegistry = judgeNpmPackage({
      name: 'lodash',
      exists: true,
      status: 200,
      onAllowlist: false,
    });
    assert.equal(onRegistry.verdict, 'allow');
    assert.equal(onRegistry.reason, 'registry');

    const listed = judgeNpmPackage({
      name: '@myorg/private-pkg',
      exists: false,
      status: 404,
      onAllowlist: true,
    });
    assert.equal(listed.verdict, 'allow');
    assert.equal(listed.reason, 'allowlist');

    for (const file of ['src/lib/install-plan.mjs', 'src/hook/install.mjs']) {
      const text = readFileSync(join(ROOT, file), 'utf8');
      assert.doesNotMatch(text, /severity:\s*'warn'|package age warn path|publishTime/);
    }
  });
});
